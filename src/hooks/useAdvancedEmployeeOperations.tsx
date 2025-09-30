
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StorageUsage {
  total_size_bytes: number;
  total_size_mb: number;
  documents: {
    count: number;
    size_bytes: number;
    size_mb: number;
  };
}

interface UserStorageStats {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  storage_usage: StorageUsage;
}

export const useAdvancedEmployeeOperations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getUserStorageUsage = async (userId: string): Promise<StorageUsage | null> => {
    try {
      const { data, error } = await supabase.rpc('get_user_storage_usage', {
        user_uuid: userId
      });

      if (error) throw error;
      
      // Assicuriamoci che i dati siano nel formato corretto
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data as unknown as StorageUsage;
      }
      
      return null;
    } catch (error: any) {
      console.error('Error getting user storage usage:', error);
      toast({
        title: "Errore",
        description: "Impossibile calcolare lo spazio occupato",
        variant: "destructive",
      });
      return null;
    }
  };

  const getAllUsersStorageStats = async (): Promise<UserStorageStats[]> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_users_storage_stats');

      if (error) throw error;
      
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      return data.map(item => ({
        user_id: item.user_id,
        first_name: item.first_name,
        last_name: item.last_name,
        email: item.email,
        storage_usage: item.storage_usage as unknown as StorageUsage
      }));
    } catch (error: any) {
      console.error('Error getting all users storage stats:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le statistiche di utilizzo",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const clearUserData = async (userId: string, userName: string) => {
    setIsLoading(true);
    try {
      console.log('Azzerando dati utente:', userId);

      const { data, error } = await supabase.rpc('clear_user_data', {
        user_uuid: userId
      });

      if (error) throw error;

      toast({
        title: "Dati azzerati",
        description: `Tutti i dati di ${userName} sono stati eliminati`,
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('Error clearing user data:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'azzeramento dei dati",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getUserStorageUsage,
    getAllUsersStorageStats,
    clearUserData,
    isLoading
  };
};
