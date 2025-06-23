
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export const useDatabaseReset = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateAllQueries = async () => {
    try {
      // Invalida tutte le query per forzare il refresh completo
      await queryClient.invalidateQueries();
      
      // Forza il refresh immediato di tutte le query attive
      await queryClient.refetchQueries();
      
      // Cancella completamente la cache per essere sicuri
      queryClient.clear();
      
      toast({
        title: "Database azzerato",
        description: "Tutti i dati sono stati eliminati e la dashboard è stata aggiornata",
      });
      
      console.log('Database reset: tutte le cache sono state invalidate');
    } catch (error) {
      console.error('Errore durante l\'invalidazione delle cache:', error);
    }
  };

  return { invalidateAllQueries };
};
