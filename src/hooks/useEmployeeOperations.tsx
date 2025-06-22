
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

      // Elimina i dati associati in ordine (per evitare vincoli di foreign key)
      
      // 1. Elimina documenti
      await supabase.from('documents').delete().eq('user_id', employeeId);
      
      // 2. Elimina notifiche
      await supabase.from('notifications').delete().eq('user_id', employeeId);
      
      // 3. Elimina presenze
      await supabase.from('attendances').delete().eq('user_id', employeeId);
      await supabase.from('manual_attendances').delete().eq('user_id', employeeId);
      await supabase.from('unified_attendances').delete().eq('user_id', employeeId);
      
      // 4. Elimina richieste di permesso
      await supabase.from('leave_requests').delete().eq('user_id', employeeId);
      
      // 5. Elimina bilancio ferie
      await supabase.from('employee_leave_balance').delete().eq('user_id', employeeId);
      
      // 6. Elimina viaggi di lavoro
      await supabase.from('business_trips').delete().eq('user_id', employeeId);
      
      // 7. Elimina messaggi
      await supabase.from('messages').delete().or(`recipient_id.eq.${employeeId},sender_id.eq.${employeeId}`);
      
      // 8. Infine elimina il profilo
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', employeeId);

      if (deleteError) {
        console.error('Errore eliminazione profilo:', deleteError);
        throw deleteError;
      }

      // Elimina anche l'utente dall'autenticazione (solo se l'admin ha i permessi)
      try {
        await supabase.auth.admin.deleteUser(employeeId);
      } catch (authError) {
        console.warn('Non è stato possibile eliminare l\'utente dall\'autenticazione:', authError);
        // Non bloccare l'operazione se l'eliminazione auth fallisce
      }

      console.log('Dipendente eliminato con successo:', employeeId);
      
      toast({
        title: 'Dipendente eliminato',
        description: `${employeeName} è stato rimosso con successo dal sistema.`,
        className: "bg-green-50 border-green-200 text-green-800",
      });

      return true;
    } catch (error: any) {
      console.error('Errore nell\'eliminazione del dipendente:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile eliminare il dipendente. Riprovare.',
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
