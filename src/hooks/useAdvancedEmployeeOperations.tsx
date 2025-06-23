
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

interface UserDataVerification {
  user_id: string;
  profile_exists: boolean;
  remaining_data: {
    documents: number;
    attendances: number;
    unified_attendances: number;
    manual_attendances: number;
    leave_requests: number;
    leave_balance: number;
    notifications: number;
    business_trips: number;
    sent_notifications: number;
    messages: number;
  };
  has_remaining_data: boolean;
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
      return data as unknown as StorageUsage;
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
      return (data as any[]).map(item => ({
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

  const verifyUserDataExists = async (userId: string): Promise<UserDataVerification | null> => {
    try {
      const { data, error } = await supabase.rpc('verify_user_data_exists', {
        user_uuid: userId
      });

      if (error) throw error;
      return data as unknown as UserDataVerification;
    } catch (error: any) {
      console.error('Error verifying user data:', error);
      toast({
        title: "Errore",
        description: "Impossibile verificare i dati utente",
        variant: "destructive",
      });
      return null;
    }
  };

  const clearUserData = async (userId: string, userName: string) => {
    setIsLoading(true);
    try {
      console.log('Azzerando dati utente (preservando accesso):', userId);

      // Prima verifica i dati esistenti
      const beforeVerification = await verifyUserDataExists(userId);
      console.log('Dati prima della pulizia:', beforeVerification);

      // Usa la funzione clear_user_data che ora preserva il profilo
      const { data, error } = await supabase.rpc('clear_user_data', {
        user_uuid: userId
      });

      if (error) throw error;

      // Verifica dopo la pulizia
      const afterVerification = await verifyUserDataExists(userId);
      console.log('Dati dopo la pulizia:', afterVerification);

      toast({
        title: "Dati azzerati",
        description: `Tutti i dati di ${userName} sono stati eliminati. L'accesso è stato preservato.`,
      });

      return { success: true, data, verification: { before: beforeVerification, after: afterVerification } };
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

  const deleteUserCompletely = async (userId: string, userName: string) => {
    setIsLoading(true);
    try {
      console.log('Eliminando completamente utente:', userId);

      // Verifica iniziale dei dati
      const initialVerification = await verifyUserDataExists(userId);
      console.log('Dati iniziali:', initialVerification);

      // Utilizza l'edge function per l'eliminazione completa
      const { data, error } = await supabase.functions.invoke('delete-user-completely', {
        body: { userId }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Errore durante l\'eliminazione');
      }

      console.log('Risultato eliminazione completa:', data);

      toast({
        title: "Utente eliminato",
        description: `${userName} è stato rimosso completamente dal sistema`,
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('Error deleting user completely:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione completa",
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
    verifyUserDataExists,
    clearUserData,
    deleteUserCompletely,
    isLoading
  };
};
