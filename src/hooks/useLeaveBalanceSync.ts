
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useLeaveBalanceSync = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const recalculateAllBalances = async () => {
    try {
      console.log('Avvio ricalcolo di tutti i bilanci ferie e permessi...');
      
      const { data, error } = await supabase.rpc('recalculate_all_leave_balances');
      
      if (error) {
        console.error('Errore nel ricalcolo dei bilanci:', error);
        throw error;
      }
      
      console.log('Ricalcolo completato:', data);
      
      // Invalida tutte le query relative ai bilanci
      await queryClient.invalidateQueries({ queryKey: ['employee-leave-balance'] });
      await queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
      
      toast({
        title: "Ricalcolo completato",
        description: "Tutti i bilanci sono stati sincronizzati correttamente",
      });
      
      return data;
    } catch (error: any) {
      console.error('Errore durante il ricalcolo:', error);
      toast({
        title: "Errore nel ricalcolo",
        description: "Si è verificato un errore durante la sincronizzazione dei bilanci",
        variant: "destructive",
      });
      throw error;
    }
  };

  const invalidateBalanceQueries = () => {
    console.log('Invalidando query dei bilanci per aggiornamento real-time...');
    queryClient.invalidateQueries({ queryKey: ['employee-leave-balance'] });
    queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
    queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
  };

  return {
    recalculateAllBalances,
    invalidateBalanceQueries,
  };
};
