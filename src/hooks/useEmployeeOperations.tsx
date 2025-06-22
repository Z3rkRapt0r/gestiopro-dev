
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useEmployeeOperations() {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const deleteEmployee = async (employeeId: string, employeeName: string) => {
    setIsDeleting(true);
    try {
      console.log('Tentativo di eliminazione dipendente:', { employeeId, employeeName });

      // Verifica che l'utente corrente sia admin
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Utente non autenticato');
      }

      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.user.id)
        .single();

      if (adminProfile?.role !== 'admin') {
        throw new Error('Solo gli amministratori possono eliminare dipendenti');
      }

      // Verifica che il dipendente da eliminare non sia un admin
      const { data: employeeProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', employeeId)
        .single();

      if (employeeProfile?.role === 'admin') {
        throw new Error('Non è possibile eliminare un amministratore');
      }

      console.log('Disattivazione dipendente invece di eliminazione completa...');

      // Invece di eliminare, disattiviamo il dipendente
      const { error: deactivateError } = await supabase
        .from('profiles')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', employeeId);

      if (deactivateError) {
        console.error('Errore disattivazione profilo:', deactivateError);
        throw new Error(`Errore nella disattivazione del profilo: ${deactivateError.message}`);
      }

      console.log('Dipendente disattivato con successo:', employeeId);
      
      toast({
        title: 'Dipendente rimosso',
        description: `${employeeName} è stato disattivato e rimosso dal sistema.`,
        className: "bg-green-50 border-green-200 text-green-800",
      });

      return true;
    } catch (error: any) {
      console.error('Errore nella disattivazione del dipendente:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile rimuovere il dipendente. Riprovare.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteEmployee,
    isDeleting
  };
}
