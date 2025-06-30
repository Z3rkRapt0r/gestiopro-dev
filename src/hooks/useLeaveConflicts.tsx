
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';

export interface LeaveValidationResult {
  isValid: boolean;
  conflicts: string[];
}

export const useLeaveConflicts = (selectedUserId?: string, leaveType?: 'ferie' | 'permesso' | 'sick_leave') => {
  const [conflictDates, setConflictDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateConflicts = useCallback(async (userId?: string, type?: string) => {
    if (!userId) {
      setConflictDates([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    console.log('🔍 Calcolo conflitti per caricamento manuale:', { userId, type });
    
    const conflictDates = new Set<string>();
    
    try {
      // 1. CONTROLLO TRASFERTE APPROVATE (sempre conflitti critici)
      const { data: existingTrips } = await supabase
        .from('business_trips')
        .select('start_date, end_date')
        .eq('user_id', userId)
        .eq('status', 'approved');

      if (existingTrips) {
        for (const trip of existingTrips) {
          const startDate = new Date(trip.start_date);
          const endDate = new Date(trip.end_date);
          const allDays = eachDayOfInterval({ start: startDate, end: endDate });
          
          allDays.forEach(day => {
            conflictDates.add(format(day, 'yyyy-MM-dd'));
          });
        }
      }

      // 2. CONTROLLO FERIE APPROVATE (conflitti critici per tutti i tipi)
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
            conflictDates.add(format(day, 'yyyy-MM-dd'));
          });
        }
      }

      // 3. CONTROLLO PERMESSI APPROVATI (conflitti per permessi e malattie)
      if (type === 'permesso' || type === 'sick_leave') {
        const { data: approvedPermissions } = await supabase
          .from('leave_requests')
          .select('day')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .eq('type', 'permesso')
          .not('day', 'is', null);

        if (approvedPermissions) {
          approvedPermissions.forEach(permission => {
            conflictDates.add(format(new Date(permission.day), 'yyyy-MM-dd'));
          });
        }
      }

      // 4. CONTROLLO MALATTIE (conflitti critici per tutti i tipi)
      const { data: sickLeaveAttendances } = await supabase
        .from('unified_attendances')
        .select('date')
        .eq('user_id', userId)
        .eq('is_sick_leave', true);

      if (sickLeaveAttendances) {
        sickLeaveAttendances.forEach(attendance => {
          conflictDates.add(format(new Date(attendance.date), 'yyyy-MM-dd'));
        });
      }

      // Converti le date string in oggetti Date
      const conflictDateObjects = Array.from(conflictDates).map(dateStr => new Date(dateStr));
      
      console.log('📅 Date con conflitti trovate per caricamento manuale:', conflictDateObjects.length);
      setConflictDates(conflictDateObjects);
      
    } catch (error) {
      console.error('❌ Errore nel calcolo conflitti per caricamento manuale:', error);
      setError('Errore nel calcolo dei conflitti');
      setConflictDates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateConflicts(selectedUserId, leaveType);
    }, 300); // Debounce di 300ms

    return () => clearTimeout(timeoutId);
  }, [selectedUserId, leaveType, calculateConflicts]);

  const isDateDisabled = useCallback((date: Date) => {
    return conflictDates.some(conflictDate => 
      format(date, 'yyyy-MM-dd') === format(conflictDate, 'yyyy-MM-dd')
    );
  }, [conflictDates]);

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

      // 3. CONTROLLO MALATTIE
      const { data: sickLeaveAttendances } = await supabase
        .from('unified_attendances')
        .select('*')
        .eq('user_id', userId)
        .eq('is_sick_leave', true)
        .gte('date', startDate)
        .lte('date', endDate);

      if (sickLeaveAttendances && sickLeaveAttendances.length > 0) {
        const sickDays = sickLeaveAttendances.map(att => format(new Date(att.date), 'dd/MM/yyyy')).join(', ');
        conflicts.push(`Conflitto critico: esistono giorni di malattia nelle seguenti date: ${sickDays}`);
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

      // 4. CONTROLLO MALATTIE
      const { data: sickLeaveAttendances } = await supabase
        .from('unified_attendances')
        .select('*')
        .eq('user_id', userId)
        .eq('is_sick_leave', true)
        .eq('date', date);

      if (sickLeaveAttendances && sickLeaveAttendances.length > 0) {
        conflicts.push(`Conflitto critico: esiste un giorno di malattia registrato il ${format(targetDate, 'dd/MM/yyyy')}`);
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

  return {
    conflictDates,
    isLoading,
    error,
    isDateDisabled,
    validateVacationDates,
    validatePermissionDate,
    validateSickLeaveRange
  };
};
