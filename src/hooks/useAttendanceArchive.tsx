
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

  // Funzione per sincronizzare l'eliminazione con la tabella attendances
  const syncAttendanceDeletion = async (deletedAttendances: UnifiedAttendance[], operation: 'single' | 'bulk') => {
    try {
      console.log('🔄 Sincronizzando eliminazione con attendances...', deletedAttendances.length);
      
      const { data, error } = await supabase.functions.invoke('sync-attendance-deletion', {
        body: {
          attendances: deletedAttendances.map(att => ({
            id: att.id,
            user_id: att.user_id,
            date: att.date,
            check_in_time: att.check_in_time,
            check_out_time: att.check_out_time
          })),
          operation
        }
      });

      if (error) {
        console.error('❌ Errore nella sincronizzazione:', error);
        throw error;
      }

      console.log('✅ Sincronizzazione completata:', data);
      return data;
    } catch (error) {
      console.error('❌ Errore nella chiamata alla Edge Function:', error);
      throw error;
    }
  };

  // Elimina singola presenza
  const deleteAttendance = useMutation({
    mutationFn: async (attendanceId: string) => {
      console.log('🗑️ Eliminando presenza dall\'archivio:', attendanceId);
      
      // Prima ottieni i dati della presenza da eliminare
      const attendanceToDelete = attendances?.find(att => att.id === attendanceId);
      if (!attendanceToDelete) {
        throw new Error('Presenza non trovata');
      }

      // Elimina dalla tabella unified_attendances
      const { error } = await supabase
        .from('unified_attendances')
        .delete()
        .eq('id', attendanceId);

      if (error) throw error;

      // Sincronizza con la tabella attendances solo se non è manuale
      if (!attendanceToDelete.is_manual) {
        await syncAttendanceDeletion([attendanceToDelete], 'single');
      }
      
      return attendanceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      toast({
        title: "Presenza eliminata",
        description: "La presenza è stata rimossa dall'archivio e dallo storico del dipendente",
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

  // Eliminazione massiva
  const handleBulkDelete = async (attendancesToDelete: UnifiedAttendance[], period: string) => {
    setBulkDeleteLoading(true);
    try {
      console.log('🗑️ Eliminazione massiva presenze:', attendancesToDelete.length, 'per periodo:', period);
      
      const ids = attendancesToDelete.map(att => att.id);
      
      // Elimina dalla tabella unified_attendances
      const { error } = await supabase
        .from('unified_attendances')
        .delete()
        .in('id', ids);

      if (error) throw error;

      // Sincronizza con la tabella attendances solo per le presenze non manuali
      const nonManualAttendances = attendancesToDelete.filter(att => !att.is_manual);
      if (nonManualAttendances.length > 0) {
        await syncAttendanceDeletion(nonManualAttendances, 'bulk');
      }

      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      
      toast({
        title: "Presenze eliminate",
        description: `${attendancesToDelete.length} presenze del ${period} sono state eliminate dall'archivio e dallo storico`,
      });
    } catch (error: any) {
      console.error('❌ Errore eliminazione massiva presenze:', error);
      toast({
        title: "Errore eliminazione",
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
