
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateEmployeeData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'admin' | 'employee';
  employeeCode?: string;
}

export const useEmployeeOperations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createEmployee = async (data: CreateEmployeeData) => {
    setIsLoading(true);
    
    try {
      console.log('Tentativo di creazione dipendente con dati:', {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        employeeCode: data.employeeCode
      });

      // Verifica duplicati email in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', data.email)
        .maybeSingle();

      if (existingProfile) {
        throw new Error('Esiste già un dipendente con questa email nei profili');
      }

      // Verifica duplicati email in auth.users tramite admin API
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existingAuthUser = users.find(user => user.email === data.email);
      
      if (existingAuthUser) {
        throw new Error('Esiste già un utente con questa email nel sistema di autenticazione');
      }

      // Crea l'utente in Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true, // Conferma automaticamente l'email
        user_metadata: {
          first_name: data.firstName,
          last_name: data.lastName,
          role: data.role,
        }
      });

      console.log('Risultato creazione utente admin:', { signUpData, signUpError });

      if (signUpError) {
        console.error('Errore nella creazione utente admin:', signUpError);
        throw new Error(signUpError.message || "Errore durante la creazione dell'account");
      }

      const userId = signUpData?.user?.id;
      if (!userId) {
        throw new Error("Impossibile recuperare l'id del nuovo utente.");
      }

      console.log('Utente creato con ID:', userId);

      // Attendi un momento per assicurarsi che l'utente sia salvato
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verifica che l'utente esista in auth.users
      const { data: createdUser, error: getUserError } = await supabase.auth.admin.getUserById(userId);
      
      if (getUserError || !createdUser.user) {
        console.error('Utente non trovato dopo la creazione:', getUserError);
        throw new Error('Utente non trovato dopo la creazione');
      }

      console.log('Utente verificato in auth.users');

      // Ora crea o aggiorna il profilo manualmente
      const { data: existingProfileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfileData) {
        // Se il profilo esiste già (creato dal trigger), aggiornalo
        console.log('Profilo esistente trovato, aggiorno i dati');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            role: data.role,
            employee_code: data.employeeCode || null,
            is_active: true
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Errore aggiornamento profilo:', updateError);
          throw new Error(`Errore nell'aggiornamento del profilo: ${updateError.message}`);
        }
      } else {
        // Se il profilo non esiste, crealo manualmente
        console.log('Creando profilo manualmente...');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            role: data.role,
            employee_code: data.employeeCode || null,
            is_active: true
          });

        if (insertError) {
          console.error('Errore inserimento profilo:', insertError);
          
          // Se l'errore è dovuto alla chiave esterna, elimina l'utente creato
          if (insertError.message.includes('foreign key constraint')) {
            console.log('Eliminando utente creato a causa di errore profilo...');
            await supabase.auth.admin.deleteUser(userId);
          }
          
          throw new Error(`Errore nella creazione del profilo: ${insertError.message}`);
        }
      }

      // Crea bilancio ferie iniziale per dipendenti
      if (data.role === 'employee') {
        const currentYear = new Date().getFullYear();
        const { error: balanceError } = await supabase
          .from('employee_leave_balance')
          .insert({
            user_id: userId,
            year: currentYear,
            vacation_days_total: 26,
            permission_hours_total: 32,
            vacation_days_used: 0,
            permission_hours_used: 0
          });

        if (balanceError) {
          console.warn('Errore creazione bilancio ferie:', balanceError);
          // Non blocchiamo la creazione per questo errore
        }
      }

      console.log('Dipendente creato con successo');

      toast({
        title: "Dipendente creato",
        description: `${data.firstName} ${data.lastName} è stato aggiunto con successo al sistema`,
      });

      return { success: true, userId };

    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione del dipendente",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEmployee = async (employeeId: string, employeeName: string) => {
    setIsLoading(true);
    
    try {
      console.log('Disattivando dipendente:', employeeId);

      // Disattiva il profilo invece di eliminarlo
      const { error: deactivateError } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', employeeId);

      if (deactivateError) {
        throw new Error(`Errore nella disattivazione: ${deactivateError.message}`);
      }

      toast({
        title: "Dipendente disattivato",
        description: `${employeeName} è stato disattivato dal sistema`,
      });

      return { success: true };

    } catch (error: any) {
      console.error('Error deactivating employee:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la disattivazione del dipendente",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createEmployee,
    deleteEmployee,
    isLoading
  };
};
