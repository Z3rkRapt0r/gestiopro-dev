
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
}

export const useLeaveConflicts = (selectedUserId?: string, leaveType?: 'ferie' | 'permesso' | 'sick_leave' | 'attendance') => {
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
  const { isHoliday, getHolidayName, isLoading: holidaysLoading } = useCompanyHolidays();

  const calculateConflicts = useCallback(async (userId?: string, type?: string) => {
    if (!userId) {
      console.log('⚠️ [CONFLICTS] Nessun utente selezionato, reset conflitti');
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

    // Aspetta che le festività siano caricate
    if (holidaysLoading) {
      console.log('⏳ [CONFLICTS] Attendo caricamento festività...');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    console.log('🔍 [CONFLICTS] Calcolo conflitti proattivo per:', { userId, type });
    
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
      // 1. CONTROLLO FESTIVITÀ (PRIORITÀ MASSIMA)
      console.log('🎄 [CONFLICTS] Controllo festività per l\'anno corrente...');
      const today = new Date();
      const currentYear = today.getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31);
      const allDaysInYear = eachDayOfInterval({ start: startOfYear, end: endOfYear });
      
      let holidaysFound = 0;
      allDaysInYear.forEach(date => {
        if (isHoliday(date)) {
          const dateStr = format(date, 'yyyy-MM-dd');
          conflictDates.add(dateStr);
          const holidayName = getHolidayName(date);
          details.push({
            date: dateStr,
            type: 'holiday',
            description: `Festività${holidayName ? `: ${holidayName}` : ''}`,
            severity: 'critical'
          });
          holidaysFound++;
        }
      });
      
      summary.holidays = holidaysFound;
      console.log(`🎉 [CONFLICTS] Trovate ${holidaysFound} festività nell'anno ${currentYear}`);

      // 2. CONTROLLO TRASFERTE APPROVATE (sempre conflitti critici)
      console.log('✈️ [CONFLICTS] Controllo trasferte approvate...');
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
        console.log(`✈️ [CONFLICTS] Trovate ${existingTrips.length} trasferte`);
      }

      // 3. CONTROLLO FERIE APPROVATE (conflitti critici per tutti i tipi)
      console.log('🏖️ [CONFLICTS] Controllo ferie approvate...');
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
        console.log(`🏖️ [CONFLICTS] Trovate ${approvedVacations.length} ferie approvate`);
      }

      // 4. CONTROLLO PERMESSI APPROVATI (conflitti per permessi, malattie e presenze)
      if (type === 'permesso' || type === 'sick_leave' || type === 'attendance') {
        console.log('📋 [CONFLICTS] Controllo permessi approvati...');
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
          console.log(`📋 [CONFLICTS] Trovati ${approvedPermissions.length} permessi approvati`);
        }
      }

      // 5. CONTROLLO MALATTIE (da tabella sick_leaves - conflitti critici per tutti i tipi)
      console.log('🏥 [CONFLICTS] Controllo malattie registrate...');
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
        console.log(`🏥 [CONFLICTS] Trovate ${sickLeaves.length} malattie`);
      }

      // 6. CONTROLLO PRESENZE ESISTENTI (per nuove presenze e malattie)
      if (type === 'attendance' || type === 'sick_leave') {
        console.log('👥 [CONFLICTS] Controllo presenze esistenti...');
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
        console.log(`👥 [CONFLICTS] Trovate ${summary.attendances} presenze totali`);
      }

      // Calcola totale unico (alcune date potrebbero avere conflitti multipli)
      summary.totalConflicts = conflictDates.size;

      // Converti le date string in oggetti Date
      const conflictDateObjects = Array.from(conflictDates).map(dateStr => new Date(dateStr));
      
      console.log('📊 [CONFLICTS] Riepilogo conflitti calcolati:', summary);
      console.log('📋 [CONFLICTS] Dettagli conflitti:', details.length);
      console.log('🚫 [CONFLICTS] Date bloccate totali:', conflictDateObjects.length);
      
      // Test specifico per la data 23/07/2025
      const testDate = new Date('2025-07-23');
      const isTestDateBlocked = conflictDateObjects.some(date => 
        format(date, 'yyyy-MM-dd') === '2025-07-23'
      );
      console.log(`🧪 [CONFLICTS] Test data 23/07/2025: ${isTestDateBlocked ? 'BLOCCATA ✅' : 'NON BLOCCATA ❌'}`);
      
      setConflictDates(conflictDateObjects);
      setConflictDetails(details);
      setConflictSummary(summary);
      
    } catch (error) {
      console.error('❌ [CONFLICTS] Errore nel calcolo conflitti:', error);
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
      console.log('✅ [CONFLICTS] Calcolo conflitti completato');
    }
  }, [isHoliday, getHolidayName, holidaysLoading]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateConflicts(selectedUserId, leaveType);
    }, 300); // Debounce di 300ms

    return () => clearTimeout(timeoutId);
  }, [selectedUserId, leaveType, calculateConflicts]);

  const isDateDisabled = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isDisabled = conflictDates.some(conflictDate => 
      format(conflictDate, 'yyyy-MM-dd') === dateStr
    );
    
    if (isDisabled) {
      console.log(`🚫 [CONFLICTS] Data ${dateStr} è DISABILITATA per conflitti`);
    }
    
    return isDisabled;
  }, [conflictDates]);

  const getConflictDetailsForDate = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const details = conflictDetails.filter(detail => detail.date === dateStr);
    
    if (details.length > 0) {
      console.log(`📋 [CONFLICTS] Dettagli conflitti per ${dateStr}:`, details);
    }
    
    return details;
  }, [conflictDetails]);

  // Funzione di validazione specifica per ferie
  const validateVacationDates = async (userId: string, startDate: string, endDate: string): Promise<LeaveValidationResult> => {
    console.log('🔍 Validazione anti-conflitto per ferie:', { userId, startDate, endDate });
    
    const conflicts: string[] = [];
    
    try {
      // 1. CONTROLLO TRASFERTE SOVRAPPOSTE
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

      // 2. CONTROLLO ALTRE FERIE APPROVATE
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

      // 3. CONTROLLO MALATTIE (da tabella sick_leaves)
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

      // 1. CONTROLLO TRASFERTE
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

      // 2. CONTROLLO FERIE
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

      // 3. CONTROLLO ALTRI PERMESSI NELLA STESSA DATA
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
      // 1. CONTROLLO TRASFERTE SOVRAPPOSTE
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

      // 2. CONTROLLO FERIE APPROVATE
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

      // 3. CONTROLLO PRESENZE ESISTENTI (da unified_attendances)
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

      // 4. CONTROLLO PRESENZE MANUALI (da manual_attendances)
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

      // 1. CONTROLLO TRASFERTE
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

      // 2. CONTROLLO FERIE
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

      // 3. CONTROLLO MALATTIE (da tabella sick_leaves)
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

      // 4. CONTROLLO PERMESSI GIORNALIERI
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
