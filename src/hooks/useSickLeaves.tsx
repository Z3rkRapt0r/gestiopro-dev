import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export interface SickLeave {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  reference_code?: string;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export interface SickLeaveInput {
  user_id: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

export interface DateVerificationResult {
  user_id: string;
  start_date: string;
  end_date: string;
  expected_days: number;
  actual_days: number;
  date_list: string[];
  is_valid: boolean;
  verified_at: string;
}

export const useSickLeaves = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: sickLeaves, isLoading } = useQuery({
    queryKey: ['sick-leaves'],
    queryFn: async () => {
      console.log('Caricamento malattie dalla nuova tabella dedicata...');
      
      let query = supabase
        .from('sick_leaves')
        .select('*')
        .order('start_date', { ascending: false });

      if (profile?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data: sickLeavesData, error } = await query;

      if (error) {
        console.error('Errore caricamento sick_leaves:', error);
        throw error;
      }

      let allSickLeaves = sickLeavesData || [];

      if (profile?.role === 'admin' && allSickLeaves.length > 0) {
        const userIds = [...new Set(allSickLeaves.map(sl => sl.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Errore caricamento profili:', profilesError);
        }

        allSickLeaves = allSickLeaves.map(sickLeave => ({
          ...sickLeave,
          profiles: profilesData?.find(profile => profile.id === sickLeave.user_id) || null
        }));
      }

      console.log('Malattie caricate dalla tabella dedicata:', allSickLeaves.length);
      return allSickLeaves as SickLeave[];
    },
    enabled: !!user && !!profile,
  });

  // Funzione per verificare l'integrità delle date
  const verifyDates = async (userId: string, startDate: string, endDate: string): Promise<DateVerificationResult> => {
    const { data, error } = await supabase.rpc('verify_sick_leave_dates', {
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Errore verifica date:', error);
      throw error;
    }

    return data as unknown as DateVerificationResult;
  };

  // Funzione per controllare sovrapposizioni
  const checkOverlaps = async (userId: string, startDate: string, endDate: string, excludeId?: string) => {
    const { data, error } = await supabase.rpc('check_sick_leave_overlaps', {
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_exclude_id: excludeId || null
    });

    if (error) {
      console.error('Errore controllo sovrapposizioni:', error);
      throw error;
    }

    return data as unknown as { has_overlaps: boolean; overlapping_periods: any[] };
  };

  const createSickLeave = useMutation({
    mutationFn: async (sickLeaveData: SickLeaveInput) => {
      console.log('🏥 CREAZIONE MALATTIA con controlli di integrità:', sickLeaveData);
      
      // 1. Verifica sovrapposizioni PRIMA dell'inserimento
      const overlapCheck = await checkOverlaps(
        sickLeaveData.user_id,
        sickLeaveData.start_date,
        sickLeaveData.end_date
      );

      if (overlapCheck.has_overlaps) {
        throw new Error(`Sovrapposizione con periodi esistenti: ${JSON.stringify(overlapCheck.overlapping_periods)}`);
      }

      // 2. Inserisci nella tabella dedicata
      const { data, error } = await supabase
        .from('sick_leaves')
        .insert({
          user_id: sickLeaveData.user_id,
          start_date: sickLeaveData.start_date,
          end_date: sickLeaveData.end_date,
          notes: sickLeaveData.notes,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ ERRORE SUPABASE durante salvataggio malattia:', error);
        throw error;
      }

      // 3. Verifica l'integrità delle date inserite
      const verification = await verifyDates(
        sickLeaveData.user_id,
        sickLeaveData.start_date,
        sickLeaveData.end_date
      );

      console.log('✅ VERIFICA INTEGRITÀ DATE:', verification);

      if (!verification.is_valid) {
        console.warn('⚠️ ATTENZIONE: Verifica date fallita:', verification);
        toast({
          title: "Attenzione - Verifica Date",
          description: `Giorni attesi: ${verification.expected_days}, giorni effettivi: ${verification.actual_days}`,
          variant: "destructive",
        });
      }

      console.log('✅ SUCCESSO - Malattia salvata con verifica integrità:', data);
      return { sickLeave: data, verification };
    },
    onSuccess: ({ verification }) => {
      queryClient.invalidateQueries({ queryKey: ['sick-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      
      console.log('✅ SUCCESS CALLBACK - Malattia salvata nella tabella dedicata');
      toast({
        title: "Malattia registrata",
        description: verification.is_valid 
          ? `Periodo registrato correttamente: ${verification.expected_days} giorni`
          : `Registrata con anomalie: ${verification.expected_days} giorni attesi, ${verification.actual_days} effettivi`,
      });
    },
    onError: (error: any) => {
      console.error('❌ Errore creazione malattia:', error);
      toast({
        title: "Errore registrazione malattia",
        description: error.message || "Errore nella registrazione della malattia",
        variant: "destructive",
      });
    },
  });

  const deleteSickLeave = useMutation({
    mutationFn: async (sickLeave: SickLeave) => {
      console.log('🗑️ Eliminando malattia dalla tabella dedicata:', sickLeave);
      
      const { error } = await supabase
        .from('sick_leaves')
        .delete()
        .eq('id', sickLeave.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sick-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      toast({
        title: "Malattia eliminata",
        description: "Il periodo di malattia è stato eliminato dalla tabella dedicata",
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

  return {
    sickLeaves,
    isLoading,
    createSickLeave: createSickLeave.mutate,
    isCreating: createSickLeave.isPending,
    deleteSickLeave: deleteSickLeave.mutate,
    isDeleting: deleteSickLeave.isPending,
    verifyDates,
    checkOverlaps,
  };
};