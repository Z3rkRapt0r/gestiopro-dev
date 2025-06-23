
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useEmployeeDelete = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const deleteEmployee = async (id: string) => {
    try {
      setLoading(true);
      
      // Prima disattiva il profilo
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', id)
        .eq('role', 'employee');

      if (profileError) throw profileError;

      // Poi elimina l'utente dall'auth (questo eliminerà anche il profilo tramite cascade)
      const { error: authError } = await supabase.auth.admin.deleteUser(id);

      if (authError) {
        console.error('Auth deletion error:', authError);
        // Se fallisce l'eliminazione auth, prova solo a disattivare
        toast({
          title: "Dipendente disattivato",
          description: "Il dipendente è stato disattivato dal sistema",
        });
      } else {
        toast({
          title: "Dipendente eliminato",
          description: "Il dipendente è stato rimosso dal sistema",
        });
      }

      return { error: null };
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione del dipendente",
        variant: "destructive",
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteEmployee,
    loading,
    isLoading: loading
  };
};
