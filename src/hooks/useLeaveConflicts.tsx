import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';
import { useCompanyHolidays } from './useCompanyHolidays';

export interface LeaveValidationResult {
  isValid: boolean;
  conflicts: string[];
}

export interface ConflictSummary {
  totalConflicts: number;
  companyHolidays: number;
  businessTrips: number;
  vacations: number;
  permissions: number;
  sickLeaves: number;
  attendances: number;
}

export interface ConflictDetail {
  date: string;
  type: 'company_holiday' | 'business_trip' | 'vacation' | 'permission' | 'sick_leave' | 'attendance';
  description: string;
  severity: 'critical' | 'warning';
}

export const useLeaveConflicts = (selectedUserId?: string, leaveType?: 'ferie' | 'permesso' | 'sick_leave' | 'attendance') => {
  const [conflictDates, setConflictDates] = useState<Date[]>([]);
  const [conflictDetails, setConflictDetails] = useState<ConflictDetail[]>([]);
  const [conflictSummary, setConflictSummary] = useState<ConflictSummary>({
    totalConflicts: 0,
    companyHolidays: 0,
    businessTrips: 0,
    vacations: 0,
    permissions: 0,
    sickLeaves: 0,
    attendances: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hook per i giorni festivi
  const { holidays, isHoliday } = useCompanyHolidays();

  const calculateConflicts = useCallback(async (userId?: string, type?: string) => {
    if (!userId) {
      setConflictDates([]);
      setConflictDetails([]);
      setConflictSummary({
        totalConflicts: 0,
        companyHolidays: 0,
        businessTrips: 0,
        vacations: 0,
        permissions: 0,
        sickLeaves: 0,
        attendances: 0
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    console.log('🔍 Calcolo conflitti proattivo per:', { userId, type });
    
    const conflictDates = new Set<string>();
    const details: ConflictDetail[] = [];
    const summary: ConflictSummary = {
      totalConflicts: 0,
      companyHolidays: 0,
      businessTrips: 0,
      vacations: 0,
      permissions: 0,
      sickLeaves: 0,
      attendances: 0
    };
    
    try {
      // 1. CONTROLLO GIORNI FESTIVI (SEMPRE CRITICI - PRIORITÀ MASSIMA)
      if (holidays && holidays.length > 0) {
        holidays.forEach(holiday => {
          const dateStr = holiday.date;
          conflictDates.add(dateStr);
          details.push({
            date: dateStr,
            type: 'company_holiday',
            description: `Giorno festivo: ${holiday.name}`,
            severity: 'critical'
          });
        });
        
        summary.companyHolidays = holidays.length;
        console.log('🎄 Giorni festivi trovati:', summary.companyHolidays);
      }

      // 2. CONTROLLO TRASFERTE APPROVATE (sempre conflitti critici)
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
              description: `Trasferta a ${trip.destination}`,
              severity: 'critical'
            });
          });
          
          summary.businessTrips += allDays.length;
        }
      }

      // 3. CONTROLLO FERIE APPROVATE (conflitti critici per tutti i tipi)
      const { data: approvedVacations } = await supabase
        .from('leave_requests')
        .select('date_from, date_to')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .eq('type', 'ferie')
        .not('date_from', 'is', null)
        .not('date_to', 'is', null);

      if (approvedVacations) {
        for (const vacation of approvedVacations) {
          const startDate = new Date(vacation.date_from);
          const endDate = new Date(vacation.date_to);
          const allDays = eachDayOfInterval({ start: startDate, end: endDate });
          
          allDays.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            conflictDates.add(dateStr);
            details.push({
              date: dateStr,
              type: 'vacation',
              description: 'Ferie approvate',
              severity: 'critical'
            });
          });
          
          summary.vacations += allDays.length;
        }
      }

      // 4. CONTROLLO PERMESSI APPROVATI (conflitti per permessi, malattie e presenze)
      if (type === 'permesso' || type === 'sick_leave' || type === 'attendance') {
        const { data: approvedPermissions } = await supabase
          .from('leave_requests')
          .select('day, time_from, time_to')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .eq('type', 'permesso')
          .not('day', 'is', null);

        if (approvedPermissions) {
          approvedPermissions.forEach(permission => {
            const dateStr = format(new Date(permission.day), 'yyyy-MM-dd');
            conflictDates.add(dateStr);
            
            const timeInfo = permission.time_from && permission.time_to 
              ? ` (${permission.time_from}-${permission.time_to})` 
              : ' (giornaliero)';
            
            details.push({
              date: dateStr,
              type: 'permission',
              description: `Permesso approvato${timeInfo}`,
              severity: 'critical'
            });
          });
          
          summary.permissions += approvedPermissions.length;
        }
      }

      // 5. CONTROLLO MALATTIE (da tabella sick_leaves - conflitti critici per tutti i tipi)
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
              description: `Malattia registrata${sickLeave.notes ? ` - ${sickLeave.notes}` : ''}`,
              severity: 'critical'
            });
          });
          
          summary.sickLeaves += allDays.length;
        }
      }

      // 6. CONTROLLO PRESENZE ESISTENTI (per nuove presenze e malattie)
      if (type === 'attendance' || type === 'sick_leave') {
        const { data: existingAttendances } = await supabase
          .from('unified_attendances')
          .select('date')
          .eq('user_id', userId)
          .eq('is_sick_leave', false);

        if (existingAttendances) {
          existingAttendances.forEach(attendance => {
            const dateStr = format(new Date(attendance.date), 'yyyy-MM-dd');
            conflictDates.add(dateStr);
            details.push({
              date: dateStr,
              type: 'attendance',
              description: type === 'sick_leave' ? 'Presenza già registrata - impossibile registrare malattia' : 'Presenza già registrata',
              severity: type === 'sick_leave' ? 'critical' : 'warning'
            });
          });
          
          summary.attendances += existingAttendances.length;
        }

        // Controllo presenze manuali
        const { data: existingManualAttendances } = await supabase
          .from('manual_attendances')
          .select('date')
          .eq('user_id', userId);

        if (existingManualAttendances) {
          existingManualAttendances.forEach(attendance => {
            const dateStr = format(new Date(attendance.date), 'yyyy-MM-dd');
            conflictDates.add(dateStr);
            details.push({
              date: dateStr,
              type: 'attendance',
              description: type === 'sick_leave' ? 'Presenza manuale già registrata - impossibile registrare malattia' : 'Presenza manuale già registrata',
              severity: type === 'sick_leave' ? 'critical' : 'warning'
            });
          });
          
          summary.attendances += existingManualAttendances.length;
        }
      }

      // Calcola totale unico (alcune date potrebbero avere conflitti multipli)
      summary.totalConflicts = conflictDates.size;

      // Converti le date string in oggetti Date
      const conflictDateObjects = Array.from(conflictDates).map(dateStr => new Date(dateStr));
      
      console.log('📅 Riepilogo conflitti calcolati:', summary);
      console.log('📋 Dettagli confletti:', details.length);
      
      setConflictDates(conflictDateObjects);
      setConflictDetails(details);
      setConflictSummary(summary);
      
    } catch (error) {
      console.error('❌ Errore nel calcolo conflitti:', error);
      setError('Errore nel calcolo dei conflitti');
      setConflictDates([]);
      setConflictDetails([]);
      setConflictSummary({
        totalConflicts: 0,
        companyHolidays: 0,
        businessTrips: 0,
        vacations: 0,
        permissions: 0,
        sickLeaves: 0,
        attendances: 0
      });
    } finally {
      setIsLoading(false);
    }
  }, [holidays]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateConflicts(selectedUserId, leaveType);
    }, 300); // Debounce di 300ms

    return () => clearTimeout(timeoutId);
  }, [selectedUserId, leaveType, calculateConflicts]);

  const isDateDisabled = useCallback((date: Date) => {
    // Prima controlla se è un giorno festivo (priorità massima)
    if (isHoliday(date)) {
      return true;
    }
    
    // Poi controlla altri conflitti
    return conflictDates.some(conflictDate => 
      format(date, 'yyyy-MM-dd') === format(conflictDate, 'yyyy-MM-dd')
    );
  }, [conflictDates, isHoliday]);

  const getConflictDetailsForDate = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return conflictDetails.filter(detail => detail.date === dateStr);
  }, [conflictDetails]);

  // Funzione di validazione specifica per ferie
  const validateVacationDates = async (userId: string, startDate: string, endDate: string): Promise<LeaveValidationResult> => {
    console.log('🔍 Validazione anti-conflitto per ferie:', { userId, startDate, endDate });
    
    const conflicts: string[] = [];
    
    try {
      // 1. CONTROLLO GIORNI FESTIVI (PRIORITÀ MASSIMA)
      if (holidays && holidays.length > 0) {
        const holidaysInRange = holidays.filter(holiday => {
          const holidayDate = holiday.date;
          return holidayDate >= startDate && holidayDate <= endDate;
        });
        
        holidaysInRange.forEach(holiday => {
          conflicts.push(`Conflitto critico: ${format(new Date(holiday.date), 'dd/MM/yyyy')} è un giorno festivo (${holiday.name})`);
        });
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
          const newStart = new Date(startDate);
          const newEnd = new Date(endDate);
          
          if ((newStart <= tripEnd && newEnd >= tripStart)) {
            conflicts.push(`Conflitto critico: esiste una trasferta a ${trip.destination} dal ${format(tripStart, 'dd/MM/yyyy')} al ${format(tripEnd, 'dd/MM/yyyy')}`);
          }
        }
      }

      // 3. CONTROLLO ALTRE FERIE APPROVATE
      const { data: existingVacations } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .eq('type', 'ferie')
        .not('date_from', 'is', null)
        .not('date_to', 'is', null);

      if (existingVacations && existingVacations.length > 0) {
        for (const vacation of existingVacations) {
          const vacStart = new Date(vacation.date_from);
          const vacEnd = new Date(vacation.date_to);
          const newStart = new Date(startDate);
          const newEnd = new Date(endDate);
          
          if ((newStart <= vacEnd && newEnd >= vacStart)) {
            conflicts.push(`Conflitto critico: esistono già ferie approvate dal ${format(vacStart, 'dd/MM/yyyy')} al ${format(vacEnd, 'dd/MM/yyyy')}`);
          }
        }
      }

      // 4. CONTROLLO MALATTIE (da tabella sick_leaves)
      const { data: sickLeaves } = await supabase
        .from('sick_leaves')
        .select('start_date, end_date, notes')
        .eq('user_id', userId);

      if (sickLeaves && sickLeaves.length > 0) {
        for (const sickLeave of sickLeaves) {
          const sickStart = new Date(sickLeave.start_date);
          const sickEnd = new Date(sickLeave.end_date);
          const newStart = new Date(startDate);
          const newEnd = new Date(endDate);
          
          if ((newStart <= sickEnd && newEnd >= sickStart)) {
            conflicts.push(`Conflitto critico: esiste un periodo di malattia dal ${format(sickStart, 'dd/MM/yyyy')} al ${format(sickEnd, 'dd/MM/yyyy')}`);
          }
        }
      }

      return {
        isValid: conflicts.length === 0,
        conflicts
      };

    } catch (error) {
      console.error('❌ Errore durante la validazione ferie:', error);
      return {
        isValid: false,
        conflicts: ['Errore durante la validazione dei conflitti']
      };
    }
  };

  // Funzione di validazione specifica per permessi
  const validatePermissionDate = async (userId: string, date: string, timeFrom?: string, timeTo?: string): Promise<LeaveValidationResult> => {
    console.log('🔍 Validazione anti-conflitto per permesso:', { userId, date, timeFrom, timeTo });
    
    const conflicts: string[] = [];
    
    try {
      const targetDate = new Date(date);

      // 1. CONTROLLO GIORNI FESTIVI (PRIORITÀ MASSIMA)
      if (isHoliday(targetDate)) {
        const holiday = holidays?.find(h => h.date === date);
        conflicts.push(`Conflitto critico: ${format(targetDate, 'dd/MM/yyyy')} è un giorno festivo${holiday ? ` (${holiday.name})` : ''}`);
      }

      // 2. CONTROLLO TRASFERTE
      const { data: existingTrips } = await supabase
        .from('business_trips')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .lte('start_date', date)
        .gte('end_date', date);

      if (existingTrips && existingTrips.length > 0) {
        for (const trip of existingTrips) {
          conflicts.push(`Conflitto critico: esiste una trasferta a ${trip.destination} che include il ${format(targetDate, 'dd/MM/yyyy')}`);
        }
      }

      // 3. CONTROLLO FERIE
      const { data: existingVacations } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .eq('type', 'ferie')
        .lte('date_from', date)
        .gte('date_to', date);

      if (existingVacations && existingVacations.length > 0) {
        conflicts.push(`Conflitto critico: esistono ferie approvate che includono il ${format(targetDate, 'dd/MM/yyyy')}`);
      }

      // 4. CONTROLLO ALTRI PERMESSI NELLA STESSA DATA
      const { data: existingPermissions } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .eq('type', 'permesso')
        .eq('day', date);

      if (existingPermissions && existingPermissions.length > 0) {
        for (const permission of existingPermissions) {
          const timeInfo = permission.time_from && permission.time_to 
            ? ` dalle ${permission.time_from} alle ${permission.time_to}` 
            : ' (giornata intera)';
          conflicts.push(`Conflitto critico: esiste già un permesso approvato il ${format(targetDate, 'dd/MM/yyyy')}${timeInfo}`);
        }
      }

      // 5. CONTROLLO MALATTIE (da tabella sick_leaves)
      const { data: sickLeaves } = await supabase
        .from('sick_leaves')
        .select('start_date, end_date, notes')
        .eq('user_id', userId);

      if (sickLeaves && sickLeaves.length > 0) {
        for (const sickLeave of sickLeaves) {
          if (date >= sickLeave.start_date && date <= sickLeave.end_date) {
            conflicts.push(`Conflitto critico: esiste un periodo di malattia che include il ${format(targetDate, 'dd/MM/yyyy')}`);
            break;
          }
        }
      }

      return {
        isValid: conflicts.length === 0,
        conflicts
      };

    } catch (error) {
      console.error('❌ Errore durante la validazione permesso:', error);
      return {
        isValid: false,
        conflicts: ['Errore durante la validazione dei conflitti']
      };
    }
  };

  // Funzione di validazione specifica per malattie
  const validateSickLeaveRange = async (userId: string, startDate: string, endDate?: string): Promise<LeaveValidationResult> => {
    console.log('🔍 Validazione anti-conflitto per malattia:', { userId, startDate, endDate });
    
    const conflicts: string[] = [];
    const finalEndDate = endDate || startDate;
    
    try {
      // 1. CONTROLLO GIORNI FESTIVI (PRIORITÀ MASSIMA)
      if (holidays && holidays.length > 0) {
        const holidaysInRange = holidays.filter(holiday => {
          const holidayDate = holiday.date;
          return holidayDate >= startDate && holidayDate <= finalEndDate;
        });
        
        holidaysInRange.forEach(holiday => {
          conflicts.push(`Conflitto critico: ${format(new Date(holiday.date), 'dd/MM/yyyy')} è un giorno festivo (${holiday.name})`);
        });
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
          const newStart = new Date(startDate);
          const newEnd = new Date(finalEndDate);
          
          if ((newStart <= tripEnd && newEnd >= tripStart)) {
            conflicts.push(`Conflitto critico: esiste una trasferta a ${trip.destination} dal ${format(tripStart, 'dd/MM/yyyy')} al ${format(tripEnd, 'dd/MM/yyyy')}`);
          }
        }
      }

      // 3. CONTROLLO FERIE APPROVATE
      const { data: existingVacations } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .eq('type', 'ferie')
        .not('date_from', 'is', null)
        .not('date_to', 'is', null);

      if (existingVacations && existingVacations.length > 0) {
        for (const vacation of existingVacations) {
          const vacStart = new Date(vacation.date_from);
          const vacEnd = new Date(vacation.date_to);
          const newStart = new Date(startDate);
          const newEnd = new Date(finalEndDate);
          
          if ((newStart <= vacEnd && newEnd >= vacStart)) {
            conflicts.push(`Conflitto critico: esistono ferie approvate dal ${format(vacStart, 'dd/MM/yyyy')} al ${format(vacEnd, 'dd/MM/yyyy')}`);
          }
        }
      }

      // 4. CONTROLLO PRESENZE ESISTENTI (da unified_attendances)
      const { data: existingAttendances } = await supabase
        .from('unified_attendances')
        .select('date')
        .eq('user_id', userId)
        .eq('is_sick_leave', false);

      if (existingAttendances && existingAttendances.length > 0) {
        for (const attendance of existingAttendances) {
          const attendanceDate = format(new Date(attendance.date), 'yyyy-MM-dd');
          const newStart = new Date(startDate);
          const newEnd = new Date(finalEndDate);
          const attDate = new Date(attendanceDate);
          
          if (attDate >= newStart && attDate <= newEnd) {
            conflicts.push(`Conflitto critico: esiste una presenza registrata il ${format(attDate, 'dd/MM/yyyy')}`);
          }
        }
      }

      // 5. CONTROLLO PRESENZE MANUALI (da manual_attendances)
      const { data: existingManualAttendances } = await supabase
        .from('manual_attendances')
        .select('date')
        .eq('user_id', userId);

      if (existingManualAttendances && existingManualAttendances.length > 0) {
        for (const attendance of existingManualAttendances) {
          const attendanceDate = format(new Date(attendance.date), 'yyyy-MM-dd');
          const newStart = new Date(startDate);
          const newEnd = new Date(finalEndDate);
          const attDate = new Date(attendanceDate);
          
          if (attDate >= newStart && attDate <= newEnd) {
            conflicts.push(`Conflitto critico: esiste una presenza manuale registrata il ${format(attDate, 'dd/MM/yyyy')}`);
          }
        }
      }

      return {
        isValid: conflicts.length === 0,
        conflicts
      };

    } catch (error) {
      console.error('❌ Errore durante la validazione malattia:', error);
      return {
        isValid: false,
        conflicts: ['Errore durante la validazione dei conflitti']
      };
    }
  };

  // Funzione di validazione specifica per presenze normali
  const validateAttendanceEntry = async (userId: string, date: string): Promise<LeaveValidationResult> => {
    console.log('🔍 Validazione anti-conflitto per presenza:', { userId, date });
    
    const conflicts: string[] = [];
    
    try {
      const targetDate = new Date(date);

      // 1. CONTROLLO GIORNI FESTIVI (PRIORITÀ MASSIMA)
      if (isHoliday(targetDate)) {
        const holiday = holidays?.find(h => h.date === date);
        conflicts.push(`Conflitto critico: ${format(targetDate, 'dd/MM/yyyy')} è un giorno festivo${holiday ? ` (${holiday.name})` : ''}`);
      }

      // 2. CONTROLLO TRASFERTE
      const { data: existingTrips } = await supabase
        .from('business_trips')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .lte('start_date', date)
        .gte('end_date', date);

      if (existingTrips && existingTrips.length > 0) {
        for (const trip of existingTrips) {
          conflicts.push(`Conflitto critico: esiste una trasferta a ${trip.destination} che include il ${format(targetDate, 'dd/MM/yyyy')}`);
        }
      }

      // 3. CONTROLLO FERIE
      const { data: existingVacations } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .eq('type', 'ferie')
        .lte('date_from', date)
        .gte('date_to', date);

      if (existingVacations && existingVacations.length > 0) {
        conflicts.push(`Conflitto critico: esistono ferie approvate che includono il ${format(targetDate, 'dd/MM/yyyy')}`);
      }

      // 4. CONTROLLO MALATTIE (da tabella sick_leaves)
      const { data: sickLeaves } = await supabase
        .from('sick_leaves')
        .select('start_date, end_date, notes')
        .eq('user_id', userId);

      if (sickLeaves && sickLeaves.length > 0) {
        for (const sickLeave of sickLeaves) {
          if (date >= sickLeave.start_date && date <= sickLeave.end_date) {
            conflicts.push(`Conflitto critico: esiste un periodo di malattia che include il ${format(targetDate, 'dd/MM/yyyy')}`);
            break;
          }
        }
      }

      // 5. CONTROLLO PERMESSI GIORNALIERI
      const { data: existingPermissions } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .eq('type', 'permesso')
        .eq('day', date)
        .is('time_from', null)
        .is('time_to', null);

      if (existingPermissions && existingPermissions.length > 0) {
        conflicts.push(`Conflitto critico: esiste un permesso giornaliero approvato il ${format(targetDate, 'dd/MM/yyyy')}`);
      }

      return {
        isValid: conflicts.length === 0,
        conflicts
      };

    } catch (error) {
      console.error('❌ Errore durante la validazione presenza:', error);
      return {
        isValid: false,
        conflicts: ['Errore durante la validazione dei conflitti']
      };
    }
  };

  // Funzione di validazione per operazioni bulk
  const validateBulkAttendance = async (userIds: string[], startDate: string, endDate?: string): Promise<{ [userId: string]: LeaveValidationResult }> => {
    console.log('🔍 Validazione bulk anti-conflitto:', { userIds, startDate, endDate });
    
    const results: { [userId: string]: LeaveValidationResult } = {};
    
    for (const userId of userIds) {
      if (endDate && endDate !== startDate) {
        // Per range di date (malattie multiple giorni)
        results[userId] = await validateSickLeaveRange(userId, startDate, endDate);
      } else {
        // Per singola data
        results[userId] = await validateAttendanceEntry(userId, startDate);
      }
    }
    
    return results;
  };

  return {
    conflictDates,
    conflictDetails,
    conflictSummary,
    isLoading,
    error,
    isDateDisabled,
    getConflictDetailsForDate,
    validateVacationDates,
    validatePermissionDate,
    validateSickLeaveRange,
    validateAttendanceEntry,
    validateBulkAttendance
  };
};
