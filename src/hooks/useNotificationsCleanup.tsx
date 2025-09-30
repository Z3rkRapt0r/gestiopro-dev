import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CleanupStats {
  table_name: string;
  retention_days: number;
  is_enabled: boolean;
  last_cleanup_at: string | null;
  last_cleaned_count: number;
  total_records: number;
  old_records_count: number;
}

interface CleanupResult {
  success: boolean;
  action: string;
  data?: {
    total_records_deleted: number;
    total_execution_time_ms: number;
    results: Array<{
      table_name: string;
      deleted_count: number;
      execution_time_ms: number;
      success: boolean;
    }>;
  };
  error?: string;
  timestamp: string;
}

export const useNotificationsCleanup = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<CleanupStats[]>([]);
  const { toast } = useToast();

  // Chiama l'edge function per ottenere le statistiche
  const getStats = async (): Promise<CleanupStats[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('notifications-cleanup', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) throw error;

      if (data.success) {
        setStats(data.data);
        return data.data;
      } else {
        throw new Error(data.error || 'Errore nel recupero delle statistiche');
      }
    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      toast({
        title: "Errore",
        description: "Impossibile recuperare le statistiche di cleanup",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Chiama l'edge function per il dry run
  const dryRun = async (): Promise<CleanupResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('notifications-cleanup', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) throw error;

      if (data.success) {
        const totalRecords = data.data?.total_records_to_delete || 0;
        toast({
          title: "Dry Run Completato",
          description: `Trovati ${totalRecords} record da eliminare`,
        });
        return data;
      } else {
        throw new Error(data.error || 'Errore nel dry run');
      }
    } catch (error) {
      console.error('Error in dry run:', error);
      toast({
        title: "Errore Dry Run",
        description: "Impossibile eseguire il dry run",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Chiama l'edge function per il cleanup reale
  const executeCleanup = async (): Promise<CleanupResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('notifications-cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: { action: 'cleanup' }
      });

      if (error) throw error;

      if (data.success) {
        const totalDeleted = data.data?.total_records_deleted || 0;
        const executionTime = data.data?.total_execution_time_ms || 0;
        
        toast({
          title: "Cleanup Completato",
          description: `Eliminati ${totalDeleted} record in ${executionTime}ms`,
        });

        // Aggiorna le statistiche dopo il cleanup
        await getStats();
        
        return data;
      } else {
        throw new Error(data.error || 'Errore nel cleanup');
      }
    } catch (error) {
      console.error('Error in cleanup:', error);
      toast({
        title: "Errore Cleanup",
        description: "Impossibile eseguire il cleanup",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    stats,
    getStats,
    dryRun,
    executeCleanup,
  };
};
