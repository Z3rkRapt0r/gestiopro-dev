
import { useUnifiedAttendances, UnifiedAttendance } from './useUnifiedAttendances';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export const useSickLeaveArchive = () => {
  const { attendances, isLoading } = useUnifiedAttendances();
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const isAdmin = profile?.role === 'admin';

  // Filtra solo le malattie
  const sickLeaveAttendances = attendances?.filter(
    att => att.is_sick_leave
  ) || [];

  // Raggruppa le malattie per dipendente
  const sickLeavesByEmployee = sickLeaveAttendances.reduce((acc, attendance) => {
    const employeeKey = attendance.user_id;
    if (!acc[employeeKey]) {
      acc[employeeKey] = {
        employee: {
          id: attendance.user_id,
          first_name: attendance.profiles?.first_name || null,
          last_name: attendance.profiles?.last_name || null,
          email: attendance.profiles?.email || null,
        },
        sickLeaves: []
      };
    }
    acc[employeeKey].sickLeaves.push(attendance);
    return acc;
  }, {} as Record<string, { employee: any; sickLeaves: UnifiedAttendance[] }>);

  // Elimina singola malattia
  const deleteSickLeave = useMutation({
    mutationFn: async (sickLeaveId: string) => {
      console.log('🗑️ Eliminando malattia dall\'archivio:', sickLeaveId);
      
      const { error } = await supabase
        .from('unified_attendances')
        .delete()
        .eq('id', sickLeaveId);

      if (error) throw error;
      
      return sickLeaveId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      toast({
        title: "Malattia eliminata",
        description: "Il giorno di malattia è stato rimosso dall'archivio",
      });
    },
    onError: (error: any) => {
      console.error('❌ Errore eliminazione malattia:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nell'eliminazione della malattia",
        variant: "destructive",
      });
    },
  });

  // Eliminazione massiva
  const handleBulkDelete = async (sickLeaves: UnifiedAttendance[], period: string) => {
    setBulkDeleteLoading(true);
    try {
      console.log('🗑️ Eliminazione massiva malattie:', sickLeaves.length, 'per periodo:', period);
      
      const ids = sickLeaves.map(sl => sl.id);
      const { error } = await supabase
        .from('unified_attendances')
        .delete()
        .in('id', ids);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      toast({
        title: "Malattie eliminate",
        description: `${sickLeaves.length} giorni di malattia del ${period} sono stati eliminati dall'archivio`,
      });
    } catch (error: any) {
      console.error('❌ Errore eliminazione massiva malattie:', error);
      toast({
        title: "Errore eliminazione",
        description: error.message || "Errore nell'eliminazione delle malattie",
        variant: "destructive",
      });
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  return {
    sickLeavesByEmployee: Object.values(sickLeavesByEmployee),
    isLoading,
    isAdmin,
    deleteSickLeave: deleteSickLeave.mutate,
    isDeletingSickLeave: deleteSickLeave.isPending,
    handleBulkDelete,
    bulkDeleteLoading,
  };
};
