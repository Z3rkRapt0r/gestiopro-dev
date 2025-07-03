import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';

export const useOvertimeConflicts = (selectedEmployeeId: string) => {
  const [conflictDates, setConflictDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateConflicts = useCallback(async (userId: string) => {
    if (!userId) {
      setConflictDates([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    console.log('🔍 Calcolo conflitti straordinari per dipendente:', userId);
    
    const conflictDates = new Set<string>();
    
    try {
      // 1. CONTROLLO TRASFERTE APPROVATE
      const { data: businessTrips } = await supabase
        .from('business_trips')
        .select('start_date, end_date')
        .eq('user_id', userId)
        .eq('status', 'approved');

      if (businessTrips) {
        for (const trip of businessTrips) {
          const startDate = new Date(trip.start_date);
          const endDate = new Date(trip.end_date);
          const allDays = eachDayOfInterval({ start: startDate, end: endDate });
          
          allDays.forEach(day => {
            conflictDates.add(format(day, 'yyyy-MM-dd'));
          });
        }
      }

      // 2. CONTROLLO FERIE E PERMESSI APPROVATI
      const { data: leaveRequests } = await supabase
        .from('leave_requests')
        .select('type, date_from, date_to, day')
        .eq('user_id', userId)
        .eq('status', 'approved');

      if (leaveRequests) {
        for (const leave of leaveRequests) {
          if (leave.type === 'ferie' && leave.date_from && leave.date_to) {
            const startDate = new Date(leave.date_from);
            const endDate = new Date(leave.date_to);
            const allDays = eachDayOfInterval({ start: startDate, end: endDate });
            
            allDays.forEach(day => {
              conflictDates.add(format(day, 'yyyy-MM-dd'));
            });
          }
          
          if (leave.type === 'permesso' && leave.day) {
            conflictDates.add(format(new Date(leave.day), 'yyyy-MM-dd'));
          }
        }
      }

      // 3. CONTROLLO MALATTIE
      const { data: sickLeaves } = await supabase
        .from('unified_attendances')
        .select('date')
        .eq('user_id', userId)
        .eq('is_sick_leave', true);

      if (sickLeaves) {
        sickLeaves.forEach(sick => {
          conflictDates.add(format(new Date(sick.date), 'yyyy-MM-dd'));
        });
      }

      // Converti le date string in oggetti Date
      const conflictDateObjects = Array.from(conflictDates).map(dateStr => new Date(dateStr));
      
      console.log('📅 Date con conflitti trovate:', conflictDateObjects.length);
      setConflictDates(conflictDateObjects);
      
    } catch (error) {
      console.error('❌ Errore nel calcolo conflitti straordinari:', error);
      setError('Errore nel calcolo dei conflitti');
      setConflictDates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateConflicts(selectedEmployeeId);
    }, 300); // Debounce di 300ms

    return () => clearTimeout(timeoutId);
  }, [selectedEmployeeId, calculateConflicts]);

  const isDateDisabled = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isDisabled = conflictDates.some(conflictDate => {
      const conflictDateStr = format(conflictDate, 'yyyy-MM-dd');
      return dateStr === conflictDateStr;
    });
    
    console.log(`🔍 [isDateDisabled] Checking ${dateStr}:`, {
      conflictDatesCount: conflictDates.length,
      conflictDates: conflictDates.map(d => format(d, 'yyyy-MM-dd')),
      isDisabled
    });
    
    return isDisabled;
  }, [conflictDates]);

  return {
    conflictDates,
    isLoading,
    error,
    isDateDisabled
  };
};