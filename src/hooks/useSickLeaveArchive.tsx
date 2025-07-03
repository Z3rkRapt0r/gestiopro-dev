
import { useSickLeaves, SickLeave } from './useSickLeaves';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { format, eachDayOfInterval } from 'date-fns';

export const useSickLeaveArchive = () => {
  const { sickLeaves, isLoading } = useSickLeaves();
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const isAdmin = profile?.role === 'admin';

  // Espandi le malattie da periodi a giorni singoli per la visualizzazione archivio
  const expandSickLeavesToDays = (sickLeaves: SickLeave[]) => {
    const expandedDays: Array<{ 
      id: string; 
      user_id: string; 
      date: string; 
      notes: string | null; 
      sick_leave_id: string;
      profiles?: any;
    }> = [];

    sickLeaves.forEach(sickLeave => {
      const startDate = new Date(sickLeave.start_date);
      const endDate = new Date(sickLeave.end_date);
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });
      
      allDays.forEach(day => {
        expandedDays.push({
          id: `${sickLeave.id}-${format(day, 'yyyy-MM-dd')}`, // ID univoco per ogni giorno
          user_id: sickLeave.user_id,
          date: format(day, 'yyyy-MM-dd'),
          notes: sickLeave.notes,
          sick_leave_id: sickLeave.id,
          profiles: sickLeave.profiles,
        });
      });
    });

    return expandedDays;
  };

  const sickLeaveDays = expandSickLeavesToDays(sickLeaves || []);

  // Raggruppa le malattie per dipendente
  const sickLeavesByEmployee = sickLeaveDays.reduce((acc, day) => {
    const employeeKey = day.user_id;
    if (!acc[employeeKey]) {
      acc[employeeKey] = {
        employee: {
          id: day.user_id,
          first_name: day.profiles?.first_name || null,
          last_name: day.profiles?.last_name || null,
          email: day.profiles?.email || null,
        },
        sickLeaves: []
      };
    }
    acc[employeeKey].sickLeaves.push(day);
    return acc;
  }, {} as Record<string, { employee: any; sickLeaves: any[] }>);

  // Elimina singola malattia (periodo completo)
  const deleteSickLeave = useMutation({
    mutationFn: async (sickLeaveId: string) => {
      console.log('🗑️ Eliminando periodo di malattia dall\'archivio:', sickLeaveId);
      
      const { error } = await supabase
        .from('sick_leaves')
        .delete()
        .eq('id', sickLeaveId);

      if (error) throw error;
      
      return sickLeaveId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sick-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['sick-leaves-for-calendars'] });
      toast({
        title: "Periodo di malattia eliminato",
        description: "Il periodo di malattia è stato rimosso dall'archivio",
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

  // Eliminazione massiva (raggruppa per periodo e elimina i periodi completi)
  const handleBulkDelete = async (sickLeaveDays: any[], period: string) => {
    setBulkDeleteLoading(true);
    try {
      console.log('🗑️ Eliminazione massiva periodi malattia per:', period);
      
      // Raggruppa i giorni per sick_leave_id per eliminare i periodi completi
      const sickLeaveIds = [...new Set(sickLeaveDays.map(day => day.sick_leave_id))];
      
      const { error } = await supabase
        .from('sick_leaves')
        .delete()
        .in('id', sickLeaveIds);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['sick-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['sick-leaves-for-calendars'] });
      toast({
        title: "Periodi di malattia eliminati",
        description: `${sickLeaveIds.length} periodo/i di malattia del ${period} sono stati eliminati dall'archivio`,
      });
    } catch (error: any) => {
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
