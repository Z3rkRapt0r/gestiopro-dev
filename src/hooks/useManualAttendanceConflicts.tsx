
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';
import { useCompanyHolidays } from './useCompanyHolidays';

export const useManualAttendanceConflicts = (selectedEmployees: string[]) => {
  const [conflictDates, setConflictDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isHoliday, isLoading: holidaysLoading } = useCompanyHolidays();

  const calculateConflicts = useCallback(async (userIds: string[]) => {
    if (!userIds || userIds.length === 0) {
      console.log('⚠️ [ATTENDANCE-CONFLICTS] Nessun dipendente selezionato');
      setConflictDates([]);
      setIsLoading(false);
      return;
    }

    // Aspetta che le festività siano caricate
    if (holidaysLoading) {
      console.log('⏳ [ATTENDANCE-CONFLICTS] Attendo caricamento festività...');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    console.log('🔍 [ATTENDANCE-CONFLICTS] Calcolo conflitti per presenze/malattie per dipendenti:', userIds);
    
    const conflictDates = new Set<string>();
    
    try {
      // 1. CONTROLLO FESTIVITÀ GLOBALI (NUOVO CON DEBUG)
      console.log('🎄 [ATTENDANCE-CONFLICTS] Controllo festività per l\'anno corrente...');
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
          holidaysFound++;
        }
      });
      
      console.log(`🎉 [ATTENDANCE-CONFLICTS] Trovate ${holidaysFound} festività da bloccare`);

      // Per ogni dipendente, verifica TUTTI i conflitti critici
      for (const userId of userIds) {
        console.log(`👤 [ATTENDANCE-CONFLICTS] Controllo conflitti per dipendente: ${userId}`);
        
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
          console.log(`✈️ [ATTENDANCE-CONFLICTS] Trovate ${existingTrips.length} trasferte per dipendente ${userId}`);
        }

        // 3. CONTROLLO SOLO FERIE APPROVATE (PERMESSI NON BLOCCANO PIÙ LE PRESENZE)
        const { data: approvedLeaveRequests } = await supabase
          .from('leave_requests')
          .select('type, date_from, date_to, day')
          .eq('user_id', userId)
          .eq('status', 'approved');

        if (approvedLeaveRequests) {
          for (const leave of approvedLeaveRequests) {
            // Solo le ferie bloccano le presenze manuali
            if (leave.type === 'ferie' && leave.date_from && leave.date_to) {
              const startDate = new Date(leave.date_from);
              const endDate = new Date(leave.date_to);
              const allDays = eachDayOfInterval({ start: startDate, end: endDate });
              
              allDays.forEach(day => {
                conflictDates.add(format(day, 'yyyy-MM-dd'));
              });
            }
            // PERMESSI RIMOSSI: non bloccano più le presenze manuali
          }
          console.log(`🏖️ [ATTENDANCE-CONFLICTS] Controllate richieste di ferie per dipendente ${userId}`);
        }

        // 4. CONTROLLO MALATTIE E PRESENZE ESISTENTI (da unified_attendances)
        const { data: existingAttendances } = await supabase
          .from('unified_attendances')
          .select('date, is_sick_leave')
          .eq('user_id', userId);

        if (existingAttendances) {
          existingAttendances.forEach(attendance => {
            conflictDates.add(format(new Date(attendance.date), 'yyyy-MM-dd'));
          });
          console.log(`👥 [ATTENDANCE-CONFLICTS] Trovate ${existingAttendances.length} presenze unificate per dipendente ${userId}`);
        }

        // 5. CONTROLLO PRESENZE MANUALI ESISTENTI
        const { data: manualAttendances } = await supabase
          .from('manual_attendances')
          .select('date')
          .eq('user_id', userId);

        if (manualAttendances) {
          manualAttendances.forEach(attendance => {
            conflictDates.add(format(new Date(attendance.date), 'yyyy-MM-dd'));
          });
          console.log(`📝 [ATTENDANCE-CONFLICTS] Trovate ${manualAttendances.length} presenze manuali per dipendente ${userId}`);
        }
      }

      // Converti le date string in oggetti Date
      const conflictDateObjects = Array.from(conflictDates).map(dateStr => new Date(dateStr));
      
      console.log('📅 [ATTENDANCE-CONFLICTS] Date con conflitti trovate per presenze/malattie (incluse festività):', conflictDateObjects.length);
      
      // Test specifico per la data 23/07/2025
      const testDate = new Date('2025-07-23');
      const isTestDateBlocked = conflictDateObjects.some(date => 
        format(date, 'yyyy-MM-dd') === '2025-07-23'
      );
      console.log(`🧪 [ATTENDANCE-CONFLICTS] Test data 23/07/2025: ${isTestDateBlocked ? 'BLOCCATA ✅' : 'NON BLOCCATA ❌'}`);
      
      setConflictDates(conflictDateObjects);
      
    } catch (error) {
      console.error('❌ [ATTENDANCE-CONFLICTS] Errore nel calcolo conflitti per presenze/malattie:', error);
      setError('Errore nel calcolo dei conflitti');
      setConflictDates([]);
    } finally {
      setIsLoading(false);
      console.log('✅ [ATTENDANCE-CONFLICTS] Calcolo conflitti per presenze completato');
    }
  }, [isHoliday, holidaysLoading]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateConflicts(selectedEmployees);
    }, 300); // Debounce di 300ms

    return () => clearTimeout(timeoutId);
  }, [selectedEmployees, calculateConflicts]);

  const isDateDisabled = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isDisabled = conflictDates.some(conflictDate => 
      format(conflictDate, 'yyyy-MM-dd') === dateStr
    );
    
    if (isDisabled) {
      console.log(`🚫 [ATTENDANCE-CONFLICTS] Data ${dateStr} è DISABILITATA per conflitti presenze`);
    }
    
    return isDisabled;
  }, [conflictDates]);

  return {
    conflictDates,
    isLoading,
    error,
    isDateDisabled
  };
};
