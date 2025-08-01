
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';

export const useBusinessTripConflicts = (selectedEmployees: string[], holidays: any[] = []) => {
  const [conflictDates, setConflictDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debug: verifica se le festività sono caricate
  console.log('🔍 Debug: Festività caricate dal database:', holidays?.length || 0);
  if (holidays && holidays.length > 0) {
    console.log('🔍 Debug: Prime 5 festività:', holidays.slice(0, 5).map(h => ({ name: h.name, date: h.date, is_recurring: h.is_recurring })));
  }

  // Funzione locale per controllare se una data è festività
  const isHoliday = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const monthDay = format(date, 'MM-dd');
    
    console.log('🔍 DEBUG: isHoliday chiamata per:', dateStr);
    console.log('🔍 DEBUG: Holidays disponibili:', holidays.length);
    
    const isHolidayResult = holidays.some(holiday => {
      if (holiday.is_recurring) {
        const holidayMonthDay = holiday.date.substr(5, 5);
        const match = holidayMonthDay === monthDay;
        console.log(`🔍 DEBUG: Festività ricorrente ${holiday.name} (${holiday.date}) - ${holidayMonthDay} vs ${monthDay} = ${match}`);
        return match;
      } else {
        const match = holiday.date === dateStr;
        console.log(`🔍 DEBUG: Festività specifica ${holiday.name} (${holiday.date}) vs ${dateStr} = ${match}`);
        return match;
      }
    });
    
    console.log('🔍 DEBUG: Risultato finale isHoliday per', dateStr, ':', isHolidayResult);
    
    return isHolidayResult;
  };

  const calculateConflicts = useCallback(async (userIds: string[]) => {
    setIsLoading(true);
    setError(null);
    
    console.log('🔍 DEBUG: Calcolo conflitti iniziato');
    console.log('🔍 DEBUG: Holidays disponibili:', holidays?.length || 0);
    console.log('🔍 DEBUG: Holidays array:', holidays);
    
    const conflictDates = new Set<string>();
    const today = new Date();
    
    try {
      // 1. CONTROLLO FESTIVITÀ GLOBALI (sempre attivo, anche senza dipendenti selezionati)
      const currentYear = today.getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31);
      const allDaysInYear = eachDayOfInterval({ start: startOfYear, end: endOfYear });
      
      console.log('🔍 DEBUG: Controllo festività per anno:', currentYear);
      console.log('🔍 DEBUG: Date da controllare:', allDaysInYear.length);
      
      let holidayCount = 0;
      allDaysInYear.forEach(date => {
        const isHolidayResult = isHoliday(date);
        if (isHolidayResult) {
          const dateStr = format(date, 'yyyy-MM-dd');
          conflictDates.add(dateStr);
          holidayCount++;
          console.log('🎉 DEBUG: Festività trovata:', dateStr);
        }
      });
      
      console.log('🔍 DEBUG: Totale festività trovate:', holidayCount);
      
      // Le festività sono SEMPRE incluse, indipendentemente dai dipendenti selezionati
      console.log('🎉 Festività sempre incluse nei conflitti');

      // Per ogni dipendente, verifica TUTTI i conflitti critici
      for (const userId of userIds) {
        // 2. CONTROLLO TRASFERTE APPROVATE ESISTENTI
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

        // 3. CONTROLLO TUTTI I CONGEDI APPROVATI (FERIE, PERMESSI)
        const { data: approvedLeaveRequests } = await supabase
          .from('leave_requests')
          .select('type, date_from, date_to, day')
          .eq('user_id', userId)
          .eq('status', 'approved');

        if (approvedLeaveRequests) {
          for (const leave of approvedLeaveRequests) {
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

        // 4. CONTROLLO MALATTIE (dalla tabella dedicata)
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
            conflictDates.add(format(new Date(attendance.date), 'yyyy-MM-dd'));
          }
        }
      }

      // Converti le date string in oggetti Date
      const conflictDateObjects = Array.from(conflictDates).map(dateStr => new Date(dateStr));
      
      console.log('📅 Date con conflitti CRITICI trovate:', conflictDateObjects.length);
      setConflictDates(conflictDateObjects);
      
    } catch (error) {
      console.error('❌ Errore nel calcolo conflitti per dipendenti:', error);
      setError('Errore nel calcolo dei conflitti');
      setConflictDates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateConflicts(selectedEmployees);
    }, 300); // Debounce di 300ms

    return () => clearTimeout(timeoutId);
  }, [selectedEmployees, calculateConflicts]);

  const isDateDisabled = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isDisabled = conflictDates.some(conflictDate => 
      dateStr === format(conflictDate, 'yyyy-MM-dd')
    );
    
    console.log('🔍 DEBUG: isDateDisabled chiamata per:', dateStr);
    console.log('🔍 DEBUG: conflictDates disponibili:', conflictDates.map(d => format(d, 'yyyy-MM-dd')));
    console.log('🔍 DEBUG: Risultato isDateDisabled:', isDisabled);
    
    return isDisabled;
  }, [conflictDates]);

  return {
    conflictDates,
    isLoading,
    error,
    isDateDisabled
  };
};
