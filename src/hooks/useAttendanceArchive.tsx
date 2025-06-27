
import { useUnifiedAttendances, UnifiedAttendance } from './useUnifiedAttendances';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export const useAttendanceArchive = () => {
  const { attendances, isLoading } = useUnifiedAttendances();
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const isAdmin = profile?.role === 'admin';

  // Filtra tutte le presenze normali (manuali e automatiche), escludendo malattie e trasferte
  const normalAttendances = attendances?.filter(
    att => !att.is_sick_leave && !att.is_business_trip
  ) || [];

  // Raggruppa le presenze per dipendente
  const attendancesByEmployee = normalAttendances.reduce((acc, attendance) => {
    const employeeKey = attendance.user_id;
    if (!acc[employeeKey]) {
      acc[employeeKey] = {
        employee: {
          id: attendance.user_id,
          first_name: attendance.profiles?.first_name || null,
          last_name: attendance.profiles?.last_name || null,
          email: attendance.profiles?.email || null,
        },
        attendances: []
      };
    }
    acc[employeeKey].attendances.push(attendance);
    return acc;
  }, {} as Record<string, { employee: any; attendances: UnifiedAttendance[] }>);

  // Funzione helper per convertire text timestamp in Date per confronto
  const parseTimeString = (timeStr: string | null): Date | null => {
    if (!timeStr) return null;
    try {
      // Se è già un timestamp ISO, usalo direttamente
      if (timeStr.includes('T') || timeStr.includes('Z')) {
        return new Date(timeStr);
      }
      // Se è solo un orario (HH:MM), aggiungi la data odierna
      if (timeStr.match(/^\d{2}:\d{2}$/)) {
        const today = new Date().toISOString().split('T')[0];
        return new Date(`${today}T${timeStr}:00`);
      }
      // Prova altri formati
      return new Date(timeStr);
    } catch (error) {
      console.warn('⚠️ Errore parsing time string:', timeStr, error);
      return null;
    }
  };

  // Funzione helper per confrontare timestamp con tolleranza
  const areTimesEqual = (time1: string | null, time2: Date | null, toleranceMinutes = 2): boolean => {
    if (!time1 || !time2) return time1 === null && time2 === null;
    
    const parsedTime1 = parseTimeString(time1);
    if (!parsedTime1) return false;
    
    const diffMs = Math.abs(parsedTime1.getTime() - time2.getTime());
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes <= toleranceMinutes;
  };

  // Funzione migliorata per eliminare sia da unified_attendances che da attendances
  const deleteAttendanceFromBothTables = async (unifiedAttendance: UnifiedAttendance) => {
    console.log('🗑️ Eliminando presenza da entrambe le tabelle:', {
      id: unifiedAttendance.id,
      user_id: unifiedAttendance.user_id,
      date: unifiedAttendance.date,
      is_manual: unifiedAttendance.is_manual,
      check_in_time: unifiedAttendance.check_in_time,
      check_out_time: unifiedAttendance.check_out_time
    });
    
    // 1. Elimina da unified_attendances
    const { error: unifiedError } = await supabase
      .from('unified_attendances')
      .delete()
      .eq('id', unifiedAttendance.id);

    if (unifiedError) {
      console.error('❌ Errore eliminazione da unified_attendances:', unifiedError);
      throw unifiedError;
    }
    console.log('✅ Eliminato da unified_attendances');

    // 2. Se è una presenza manuale, non cercarla in attendances
    if (unifiedAttendance.is_manual) {
      console.log('ℹ️ Presenza manuale - non cerco in attendances');
      return;
    }

    // 3. Cerca la presenza corrispondente in attendances con strategia multipla
    console.log('🔍 Cercando presenza corrispondente in attendances...');
    
    // Strategia 1: Match per data e user_id (più flessibile)
    const { data: potentialMatches, error: searchError } = await supabase
      .from('attendances')
      .select('*')
      .eq('user_id', unifiedAttendance.user_id)
      .eq('date', unifiedAttendance.date);

    if (searchError) {
      console.error('❌ Errore ricerca presenze in attendances:', searchError);
      return; // Non blocca l'operazione
    }

    if (!potentialMatches || potentialMatches.length === 0) {
      console.log('ℹ️ Nessuna presenza trovata in attendances per questa data');
      return;
    }

    console.log(`🔍 Trovate ${potentialMatches.length} presenze potenziali in attendances`);

    // Strategia 2: Match preciso con tolleranza temporale
    let bestMatch = null;
    let bestScore = Infinity;

    for (const attendance of potentialMatches) {
      let score = 0;
      
      // Controlla check_in_time
      if (areTimesEqual(unifiedAttendance.check_in_time, attendance.check_in_time)) {
        score += 1; // Bonus per check_in match
      } else {
        score += 10; // Penalità per mismatch
      }
      
      // Controlla check_out_time
      if (areTimesEqual(unifiedAttendance.check_out_time, attendance.check_out_time)) {
        score += 1; // Bonus per check_out match
      } else {
        score += 10; // Penalità per mismatch
      }

      if (score < bestScore) {
        bestScore = score;
        bestMatch = attendance;
      }
    }

    // Se non troviamo un match abbastanza buono, prendi la prima presenza del giorno
    if (bestScore > 15) {
      console.log('⚠️ Nessun match preciso trovato, uso la prima presenza del giorno');
      bestMatch = potentialMatches[0];
    }

    if (bestMatch) {
      console.log('✅ Match trovato in attendances:', {
        id: bestMatch.id,
        check_in: bestMatch.check_in_time,
        check_out: bestMatch.check_out_time,
        score: bestScore
      });
      
      // Elimina la presenza corrispondente da attendances
      const { error: attendanceError } = await supabase
        .from('attendances')
        .delete()
        .eq('id', bestMatch.id);

      if (attendanceError) {
        console.error('❌ Errore eliminazione da attendances:', attendanceError);
        // Non bloccare l'operazione, ma logga l'errore
      } else {
        console.log('✅ Presenza eliminata anche da attendances');
      }
    }
  };

  // Elimina singola presenza con sincronizzazione migliorata
  const deleteAttendance = useMutation({
    mutationFn: async (attendanceId: string) => {
      console.log('🗑️ Eliminando presenza dall\'archivio:', attendanceId);
      
      // Trova la presenza da eliminare
      const attendanceToDelete = normalAttendances.find(att => att.id === attendanceId);
      if (!attendanceToDelete) {
        throw new Error('Presenza non trovata');
      }

      await deleteAttendanceFromBothTables(attendanceToDelete);
      return attendanceId;
    },
    onSuccess: () => {
      // Invalida entrambe le query per aggiornare sia l'archivio che lo storico
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      queryClient.invalidateQueries({ queryKey: ['employee-status'] });
      toast({
        title: "Presenza eliminata",
        description: "La presenza è stata rimossa dall'archivio e dallo storico con sincronizzazione migliorata",
      });
    },
    onError: (error: any) => {
      console.error('❌ Errore eliminazione presenza:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nell'eliminazione della presenza",
        variant: "destructive",
      });
    },
  });

  // Eliminazione massiva con sincronizzazione migliorata
  const handleBulkDelete = async (attendances: UnifiedAttendance[], period: string) => {
    setBulkDeleteLoading(true);
    let successCount = 0;
    let errorCount = 0;
    
    try {
      console.log('🗑️ Eliminazione massiva presenze:', attendances.length, 'per periodo:', period);
      
      // Elimina ogni presenza singolarmente con la logica migliorata
      for (const attendance of attendances) {
        try {
          await deleteAttendanceFromBothTables(attendance);
          successCount++;
        } catch (error) {
          console.error('❌ Errore eliminazione singola presenza:', attendance.id, error);
          errorCount++;
        }
      }

      // Invalida entrambe le query
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      queryClient.invalidateQueries({ queryKey: ['employee-status'] });
      
      if (errorCount === 0) {
        toast({
          title: "Presenze eliminate",
          description: `Tutte le ${successCount} presenze del ${period} sono state eliminate con sincronizzazione migliorata`,
        });
      } else {
        toast({
          title: "Eliminazione parzialmente completata",
          description: `${successCount} presenze eliminate, ${errorCount} errori. Periodo: ${period}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('❌ Errore eliminazione massiva presenze:', error);
      toast({
        title: "Errore eliminazione massiva",
        description: error.message || "Errore nell'eliminazione delle presenze",
        variant: "destructive",
      });
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  return {
    attendancesByEmployee: Object.values(attendancesByEmployee),
    isLoading,
    isAdmin,
    deleteAttendance: deleteAttendance.mutate,
    isDeletingAttendance: deleteAttendance.isPending,
    handleBulkDelete,
    bulkDeleteLoading,
  };
};
