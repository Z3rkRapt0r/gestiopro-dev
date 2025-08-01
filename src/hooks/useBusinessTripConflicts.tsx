
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';
import { useCompanyHolidays } from './useCompanyHolidays';
import { isEmployeeWorkingDay } from '@/utils/employeeStatusUtils';

export interface BusinessTripValidationResult {
  isValid: boolean;
  conflicts: string[];
}

export interface ConflictSummary {
  totalConflicts: number;
  businessTrips: number;
  vacations: number;
  permissions: number;
  sickLeaves: number;
  attendances: number;
  holidays: number;
}

export interface ConflictDetail {
  date: string;
  type: 'business_trip' | 'vacation' | 'permission' | 'sick_leave' | 'attendance' | 'holiday';
  description: string;
  severity: 'critical' | 'warning';
  employeeName?: string;
}

export const useBusinessTripConflicts = (selectedEmployees: string[], holidays: any[] = []) => {
  const [conflictDates, setConflictDates] = useState<Date[]>([]);
  const [conflictDetails, setConflictDetails] = useState<ConflictDetail[]>([]);
  const [conflictSummary, setConflictSummary] = useState<ConflictSummary>({
    totalConflicts: 0,
    businessTrips: 0,
    vacations: 0,
    permissions: 0,
    sickLeaves: 0,
    attendances: 0,
    holidays: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isHoliday, getHolidayName } = useCompanyHolidays();
  const prevSelectedEmployeesRef = useRef<string[]>([]);

  // Funzione locale per controllare se una data è festività
  const isHolidayLocal = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const monthDay = format(date, 'MM-dd');
    
    if (holidays.length === 0) {
      return false;
    }
    
    return holidays.some(holiday => {
      if (holiday.is_recurring) {
        const holidayMonthDay = holiday.date.substr(5, 5);
        return holidayMonthDay === monthDay;
      } else {
        return holiday.date === dateStr;
      }
    });
  };

  const calculateConflicts = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) {
      setConflictDates([]);
      setConflictDetails([]);
      setConflictSummary({
        totalConflicts: 0,
        businessTrips: 0,
        vacations: 0,
        permissions: 0,
        sickLeaves: 0,
        attendances: 0,
        holidays: 0
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    console.log('🔍 Calcolo conflitti proattivo per trasferte:', { userIds });
    
    const conflictDates = new Set<string>();
    const details: ConflictDetail[] = [];
    const summary: ConflictSummary = {
      totalConflicts: 0,
      businessTrips: 0,
      vacations: 0,
      permissions: 0,
      sickLeaves: 0,
      attendances: 0,
      holidays: 0
    };
    
    try {
      // 1. CONTROLLO FESTIVITÀ GLOBALI (sempre attivo, anche senza dipendenti selezionati)
      const today = new Date();
      const currentYear = today.getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31);
      const allDaysInYear = eachDayOfInterval({ start: startOfYear, end: endOfYear });
      
      allDaysInYear.forEach(date => {
        if (isHolidayLocal(date)) {
          const dateStr = format(date, 'yyyy-MM-dd');
          conflictDates.add(dateStr);
          const holidayName = getHolidayName ? getHolidayName(date) : '';
          details.push({
            date: dateStr,
            type: 'holiday',
            description: `Festività${holidayName ? `: ${holidayName}` : ''}`,
            severity: 'critical'
          });
          summary.holidays += 1;
        }
      });

      // Per ogni dipendente, verifica TUTTI i conflitti critici
      for (const userId of userIds) {
        // Ottieni il nome del dipendente
        const { data: employee } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();
        
        const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Dipendente';

        // 2. CONTROLLO TRASFERTE APPROVATE ESISTENTI
        const { data: existingTrips } = await supabase
          .from('business_trips')
          .select('start_date, end_date, destination')
          .eq('user_id', userId)
          .eq('status', 'approved');

        if (existingTrips) {
          for (const trip of existingTrips) {
            const startDate = new Date(trip.start_date);
            const endDate = new Date(trip.end_date);
            const allDays = eachDayOfInterval({ start: startDate, end: endDate });
            
            allDays.forEach(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              conflictDates.add(dateStr);
              details.push({
                date: dateStr,
                type: 'business_trip',
                description: `${employeeName}: Trasferta a ${trip.destination}`,
                severity: 'critical',
                employeeName
              });
            });
            
            summary.businessTrips += allDays.length;
          }
        }

        // 3. CONTROLLO TUTTI I CONGEDI APPROVATI (FERIE, PERMESSI)
        const { data: approvedLeaveRequests } = await supabase
          .from('leave_requests')
          .select('type, date_from, date_to, day, time_from, time_to')
          .eq('user_id', userId)
          .eq('status', 'approved');

        if (approvedLeaveRequests) {
          for (const leave of approvedLeaveRequests) {
            if (leave.type === 'ferie' && leave.date_from && leave.date_to) {
              const startDate = new Date(leave.date_from);
              const endDate = new Date(leave.date_to);
              const allDays = eachDayOfInterval({ start: startDate, end: endDate });
              
              allDays.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                conflictDates.add(dateStr);
                details.push({
                  date: dateStr,
                  type: 'vacation',
                  description: `${employeeName}: Ferie approvate`,
                  severity: 'critical',
                  employeeName
                });
              });
              
              summary.vacations += allDays.length;
            }
            
            if (leave.type === 'permesso' && leave.day) {
              const dateStr = format(new Date(leave.day), 'yyyy-MM-dd');
              conflictDates.add(dateStr);
              const timeInfo = leave.time_from && leave.time_to 
                ? ` (${leave.time_from}-${leave.time_to})` 
                : ' (giornaliero)';
              details.push({
                date: dateStr,
                type: 'permission',
                description: `${employeeName}: Permesso approvato${timeInfo}`,
                severity: 'critical',
                employeeName
              });
              summary.permissions += 1;
            }
          }
        }

        // 4. CONTROLLO MALATTIE (dalla tabella dedicata)
        const { data: sickLeaves } = await supabase
          .from('sick_leaves')
          .select('start_date, end_date, notes')
          .eq('user_id', userId);

        if (sickLeaves) {
          for (const sickLeave of sickLeaves) {
            const startDate = new Date(sickLeave.start_date);
            const endDate = new Date(sickLeave.end_date);
            const allDays = eachDayOfInterval({ start: startDate, end: endDate });
            
            allDays.forEach(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              conflictDates.add(dateStr);
              details.push({
                date: dateStr,
                type: 'sick_leave',
                description: `${employeeName}: Malattia registrata${sickLeave.notes ? ` - ${sickLeave.notes}` : ''}`,
                severity: 'critical',
                employeeName
              });
            });
            
            summary.sickLeaves += allDays.length;
          }
        }

        // 5. CONTROLLO PRESENZE ESISTENTI (NUOVO)
        const { data: existingAttendances } = await supabase
          .from('unified_attendances')
          .select('date')
          .eq('user_id', userId)
          .not('check_in_time', 'is', null)
          .eq('is_business_trip', false)
          .eq('is_sick_leave', false)
          .lte('date', format(today, 'yyyy-MM-dd'));

        if (existingAttendances) {
          for (const attendance of existingAttendances) {
            const dateStr = format(new Date(attendance.date), 'yyyy-MM-dd');
            conflictDates.add(dateStr);
            details.push({
              date: dateStr,
              type: 'attendance',
              description: `${employeeName}: Presenza già registrata`,
              severity: 'critical',
              employeeName
            });
          }
          
          summary.attendances += existingAttendances.length;
        }

        // 6. CONTROLLO GIORNI NON LAVORATIVI PERSONALIZZATI
        // Carica gli orari personalizzati per questo dipendente
        const { data: employeeWorkSchedule } = await supabase
          .from('employee_work_schedules')
          .select('*')
          .eq('employee_id', userId)
          .maybeSingle();
        
        // Carica gli orari aziendali
        const { data: companyWorkSchedule } = await supabase
          .from('work_schedules')
          .select('*')
          .limit(1)
          .maybeSingle();
        
        allDaysInYear.forEach(date => {
          const isWorkingDayForEmployee = isEmployeeWorkingDay(date, employeeWorkSchedule, companyWorkSchedule);
          if (!isWorkingDayForEmployee) {
            const dateStr = format(date, 'yyyy-MM-dd');
            conflictDates.add(dateStr);
            
            const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
            const dayName = dayNames[date.getDay()];
            
            details.push({
              date: dateStr,
              type: 'holiday',
              description: `${employeeName}: Giorno non lavorativo - ${dayName}`,
              severity: 'critical',
              employeeName
            });
            summary.holidays += 1;
          }
        });
      }

      // Calcola totale unico (alcune date potrebbero avere conflitti multipli)
      summary.totalConflicts = conflictDates.size;

      // Converti le date string in oggetti Date
      const conflictDateObjects = Array.from(conflictDates).map(dateStr => new Date(dateStr));
      
      console.log('📅 Riepilogo conflitti trasferte calcolati:', summary);
      console.log('📋 Dettagli conflitti trasferte:', details.length);
      
      setConflictDates(conflictDateObjects);
      setConflictDetails(details);
      setConflictSummary(summary);
      
    } catch (error) {
      console.error('❌ Errore nel calcolo conflitti trasferte:', error);
      setError('Errore nel calcolo dei conflitti');
      setConflictDates([]);
      setConflictDetails([]);
      setConflictSummary({
        totalConflicts: 0,
        businessTrips: 0,
        vacations: 0,
        permissions: 0,
        sickLeaves: 0,
        attendances: 0,
        holidays: 0
      });
    } finally {
      setIsLoading(false);
    }
  }, []); // Rimuovo le dipendenze problematiche

  useEffect(() => {
    // Controlla se i dipendenti selezionati sono realmente cambiati
    const currentEmployees = selectedEmployees.sort().join(',');
    const prevEmployees = prevSelectedEmployeesRef.current.sort().join(',');
    
    if (currentEmployees !== prevEmployees) {
      prevSelectedEmployeesRef.current = selectedEmployees;
      
      const timeoutId = setTimeout(() => {
        calculateConflicts(selectedEmployees);
      }, 300); // Debounce di 300ms

      return () => clearTimeout(timeoutId);
    }
  }, [selectedEmployees, calculateConflicts]);

  const isDateDisabled = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return conflictDates.some(conflictDate => 
      dateStr === format(conflictDate, 'yyyy-MM-dd')
    );
  }, [conflictDates]);

  const getConflictDetailsForDate = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return conflictDetails.filter(detail => detail.date === dateStr);
  }, [conflictDetails]);

  // Funzione di validazione specifica per trasferte
  const validateBusinessTripRange = async (userIds: string[], startDate: string, endDate: string): Promise<BusinessTripValidationResult> => {
    console.log('🔍 Validazione anti-conflitto per trasferta:', { userIds, startDate, endDate });
    
    const conflicts: string[] = [];
    
    try {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const allDays = eachDayOfInterval({ start: startDateObj, end: endDateObj });
      
      for (const userId of userIds) {
        // Ottieni il nome del dipendente
        const { data: employee } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();
        
        const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Dipendente';

        // 1. CONTROLLO FESTIVITÀ
        for (const day of allDays) {
          if (isHolidayLocal(day)) {
            const holidayName = getHolidayName ? getHolidayName(day) : '';
            conflicts.push(`Conflitto critico per ${employeeName}: ${format(day, 'dd/MM/yyyy')} è una festività${holidayName ? ` (${holidayName})` : ''}`);
          }
        }

        // 2. CONTROLLO TRASFERTE SOVRAPPOSTE
        const { data: existingTrips } = await supabase
          .from('business_trips')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'approved');

        if (existingTrips && existingTrips.length > 0) {
          for (const trip of existingTrips) {
            const tripStart = new Date(trip.start_date);
            const tripEnd = new Date(trip.end_date);
            
            if ((startDateObj <= tripEnd && endDateObj >= tripStart)) {
              conflicts.push(`Conflitto critico per ${employeeName}: esiste già una trasferta a ${trip.destination} dal ${format(tripStart, 'dd/MM/yyyy')} al ${format(tripEnd, 'dd/MM/yyyy')}`);
            }
          }
        }

        // 3. CONTROLLO TUTTI I CONGEDI APPROVATI
        const { data: approvedLeaveRequests } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'approved');

        if (approvedLeaveRequests && approvedLeaveRequests.length > 0) {
          for (const leave of approvedLeaveRequests) {
            if (leave.type === 'ferie' && leave.date_from && leave.date_to) {
              const leaveStart = new Date(leave.date_from);
              const leaveEnd = new Date(leave.date_to);
              
              if ((startDateObj <= leaveEnd && endDateObj >= leaveStart)) {
                conflicts.push(`Conflitto critico per ${employeeName}: esistono ferie approvate dal ${format(leaveStart, 'dd/MM/yyyy')} al ${format(leaveEnd, 'dd/MM/yyyy')}`);
              }
            }
            
            if (leave.type === 'permesso' && leave.day) {
              const permissionDate = new Date(leave.day);
              if (permissionDate >= startDateObj && permissionDate <= endDateObj) {
                const timeInfo = leave.time_from && leave.time_to 
                  ? ` (${leave.time_from}-${leave.time_to})` 
                  : ' (giornaliero)';
                conflicts.push(`Conflitto critico per ${employeeName}: esiste un permesso approvato il ${format(permissionDate, 'dd/MM/yyyy')}${timeInfo}`);
              }
            }
          }
        }

        // 4. CONTROLLO MALATTIE
        const { data: sickLeaves } = await supabase
          .from('sick_leaves')
          .select('start_date, end_date, notes')
          .eq('user_id', userId);

        if (sickLeaves && sickLeaves.length > 0) {
          for (const sickLeave of sickLeaves) {
            const sickStart = new Date(sickLeave.start_date);
            const sickEnd = new Date(sickLeave.end_date);
            
            if ((startDateObj <= sickEnd && endDateObj >= sickStart)) {
              conflicts.push(`Conflitto critico per ${employeeName}: esiste un periodo di malattia dal ${format(sickStart, 'dd/MM/yyyy')} al ${format(sickEnd, 'dd/MM/yyyy')}`);
            }
          }
        }

        // 5. CONTROLLO PRESENZE ESISTENTI
        const { data: existingAttendances } = await supabase
          .from('unified_attendances')
          .select('date')
          .eq('user_id', userId)
          .not('check_in_time', 'is', null)
          .eq('is_business_trip', false)
          .eq('is_sick_leave', false);

        if (existingAttendances && existingAttendances.length > 0) {
          for (const attendance of existingAttendances) {
            const attendanceDate = new Date(attendance.date);
            if (attendanceDate >= startDateObj && attendanceDate <= endDateObj) {
              conflicts.push(`Conflitto critico per ${employeeName}: esiste una presenza registrata il ${format(attendanceDate, 'dd/MM/yyyy')}`);
            }
          }
        }
      }

      return {
        isValid: conflicts.length === 0,
        conflicts
      };

    } catch (error) {
      console.error('❌ Errore durante la validazione trasferta:', error);
      return {
        isValid: false,
        conflicts: ['Errore durante la validazione dei conflitti']
      };
    }
  };

  return {
    conflictDates,
    conflictDetails,
    conflictSummary,
    isLoading,
    error,
    isDateDisabled,
    getConflictDetailsForDate,
    validateBusinessTripRange
  };
};
