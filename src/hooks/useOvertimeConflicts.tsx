
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';
import { useCompanyHolidays } from './useCompanyHolidays';

export const useOvertimeConflicts = (selectedEmployeeId: string) => {
  const [conflictDates, setConflictDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isHoliday } = useCompanyHolidays();

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
      // 1. CONTROLLO FESTIVITÀ
      const today = new Date();
      const currentYear = today.getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31);
      const allDaysInYear = eachDayOfInterval({ start: startOfYear, end: endOfYear });
      
      allDaysInYear.forEach(date => {
        if (isHoliday(date)) {
          conflictDates.add(format(date, 'yyyy-MM-dd'));
        }
      });

      // 2. CONTROLLO TRASFERTE APPROVATE
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

      // 3. CONTROLLO FERIE APPROVATE (permessi rimossi)
      const { data: leaveRequests } = await supabase
        .from('leave_requests')
        .select('type, date_from, date_to')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .eq('type', 'ferie');

      if (leaveRequests) {
        for (const leave of leaveRequests) {
          if (leave.date_from && leave.date_to) {
            const startDate = new Date(leave.date_from);
            const endDate = new Date(leave.date_to);
            const allDays = eachDayOfInterval({ start: startDate, end: endDate });
            
            allDays.forEach(day => {
              conflictDates.add(format(day, 'yyyy-MM-dd'));
            });
          }
        }
      }

      // 4. CONTROLLO MALATTIE (dalla nuova tabella dedicata)
      const { data: sickLeaves } = await supabase
        .from('sick_leaves')
        .select('start_date, end_date')
        .eq('user_id', userId);

      if (sickLeaves) {
        for (const sickLeave of sickLeaves) {
          const startDate = new Date(sickLeave.start_date);
          const endDate = new Date(sickLeave.end_date);
          const allDays = eachDayOfInterval({ start: startDate, end: endDate });
          
          allDays.forEach(day => {
            conflictDates.add(format(day, 'yyyy-MM-dd'));
          });
        }
      }

      // 5. CONTROLLO STRAORDINARI AUTOMATICI
      // Blocca le date che hanno già uno straordinario automatico
      const { data: automaticOvertimes } = await supabase
        .from('overtime_records')
        .select('date')
        .eq('user_id', userId)
        .eq('is_automatic', true);

      if (automaticOvertimes) {
        automaticOvertimes.forEach(overtime => {
          conflictDates.add(format(new Date(overtime.date), 'yyyy-MM-dd'));
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
    return conflictDates.some(conflictDate => 
      format(date, 'yyyy-MM-dd') === format(conflictDate, 'yyyy-MM-dd')
    );
  }, [conflictDates]);

  return {
    conflictDates,
    isLoading,
    error,
    isDateDisabled
  };
};
