
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

  // Funzione per eliminare sia da unified_attendances che da attendances
  const deleteAttendanceFromBothTables = async (unifiedAttendance: UnifiedAttendance) => {
    console.log('🗑️ Eliminando presenza da entrambe le tabelle:', unifiedAttendance.id);
    
    // Inizia la transazione eliminando da unified_attendances
    const { error: unifiedError } = await supabase
      .from('unified_attendances')
      .delete()
      .eq('id', unifiedAttendance.id);

    if (unifiedError) {
      console.error('❌ Errore eliminazione da unified_attendances:', unifiedError);
      throw unifiedError;
    }

    // Se la presenza non è manuale, potrebbe esistere anche in attendances
    if (!unifiedAttendance.is_manual) {
      console.log('🔍 Cercando presenza corrispondente in attendances...');
      
      // Cerca la presenza corrispondente in attendances
      const { data: correspondingAttendances, error: searchError } = await supabase
        .from('attendances')
        .select('id')
        .eq('user_id', unifiedAttendance.user_id)
        .eq('date', unifiedAttendance.date)
        .eq('check_in_time', unifiedAttendance.check_in_time)
        .eq('check_out_time', unifiedAttendance.check_out_time);

      if (searchError) {
        console.error('❌ Errore ricerca presenza in attendances:', searchError);
        // Non bloccare l'operazione se la ricerca fallisce
      } else if (correspondingAttendances && correspondingAttendances.length > 0) {
        console.log('✅ Trovata presenza corrispondente in attendances, eliminando...');
        
        // Elimina la presenza corrispondente da attendances
        const { error: attendanceError } = await supabase
          .from('attendances')
          .delete()
          .eq('id', correspondingAttendances[0].id);

        if (attendanceError) {
          console.error('❌ Errore eliminazione da attendances:', attendanceError);
          // Non bloccare l'operazione, ma logga l'errore
        } else {
          console.log('✅ Presenza eliminata anche da attendances');
        }
      } else {
        console.log('ℹ️ Nessuna presenza corrispondente trovata in attendances');
      }
    }
  };

  // Elimina singola presenza con sincronizzazione
  const deleteAttendance = useMutation({
    mutationFn: async (attendanceId: string) => {
      console.log('🗑️ Eliminando presenza dall\'archivio:', attendanceId);
      
      // Trova la presenza da eliminare per avere tutti i dati necessari
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
      toast({
        title: "Presenza eliminata",
        description: "La presenza è stata rimossa dall'archivio e dallo storico",
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

  // Eliminazione massiva con sincronizzazione
  const handleBulkDelete = async (attendances: UnifiedAttendance[], period: string) => {
    setBulkDeleteLoading(true);
    try {
      console.log('🗑️ Eliminazione massiva presenze:', attendances.length, 'per periodo:', period);
      
      // Elimina ogni presenza singolarmente per garantire la sincronizzazione
      for (const attendance of attendances) {
        await deleteAttendanceFromBothTables(attendance);
      }

      // Invalida entrambe le query
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      
      toast({
        title: "Presenze eliminate",
        description: `${attendances.length} presenze del ${period} sono state eliminate dall'archivio e dallo storico`,
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
