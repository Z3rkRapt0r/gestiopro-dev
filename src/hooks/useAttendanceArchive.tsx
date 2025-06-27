
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

  // Filtra solo le presenze manuali normali (non malattie)
  const manualAttendances = attendances?.filter(
    att => att.is_manual && !att.is_sick_leave
  ) || [];

  // Raggruppa le presenze per dipendente
  const attendancesByEmployee = manualAttendances.reduce((acc, attendance) => {
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

  // Elimina singola presenza
  const deleteAttendance = useMutation({
    mutationFn: async (attendanceId: string) => {
      console.log('🗑️ Eliminando presenza dall\'archivio:', attendanceId);
      
      const { error } = await supabase
        .from('unified_attendances')
        .delete()
        .eq('id', attendanceId);

      if (error) throw error;
      
      return attendanceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      toast({
        title: "Presenza eliminata",
        description: "La presenza è stata rimossa dall'archivio",
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
  const handleBulkDelete = async (attendances: UnifiedAttendance[], period: string) => {
    setBulkDeleteLoading(true);
    try {
      console.log('🗑️ Eliminazione massiva presenze:', attendances.length, 'per periodo:', period);
      
      const ids = attendances.map(att => att.id);
      const { error } = await supabase
        .from('unified_attendances')
        .delete()
        .in('id', ids);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      toast({
        title: "Presenze eliminate",
        description: `${attendances.length} presenze del ${period} sono state eliminate dall'archivio`,
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
