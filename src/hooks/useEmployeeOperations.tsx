
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

      // Prima verifica se l'email esiste già nei profili
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', data.email)
        .maybeSingle();

      if (existingProfile) {
        throw new Error('Esiste già un dipendente con questa email nei profili');
      }

      // Crea l'utente in Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            role: data.role,
          }
        }
      });

      console.log('Risultato signUp:', { signUpData, signUpError });

      if (signUpError) {
        if (signUpError.message === "User already registered") {
          throw new Error("Esiste già un utente con questa email in Auth");
        }
        throw new Error(signUpError.message || "Errore durante la creazione dell'account");
      }

      const userId = signUpData?.user?.id;
      if (!userId) {
        throw new Error("Impossibile recuperare l'id del nuovo utente.");
      }

      console.log('Utente creato con ID:', userId);

      // Attendi un momento per permettere al trigger di creare il profilo
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verifica se il profilo è stato creato dal trigger
      const { data: profileCheck } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!profileCheck) {
        // Se il trigger non ha funzionato, crea manualmente il profilo
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
          throw new Error(`Errore nella creazione del profilo: ${insertError.message}`);
        }
      } else {
        // Aggiorna il profilo con i dati aggiuntivi
        console.log('Aggiornando profilo esistente...');
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
      }

      console.log('Profilo aggiornato con successo');

      toast({
        title: "Dipendente creato",
        description: `${data.firstName} ${data.lastName} è stato aggiunto con successo`,
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
      console.log('Eliminando dipendente:', employeeId);

      // Prima disattiva il profilo
      const { error: deactivateError } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', employeeId);

      if (deactivateError) {
        throw new Error(`Errore nella disattivazione: ${deactivateError.message}`);
      }

      // Poi elimina completamente il profilo
      const { error: deleteProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', employeeId);

      if (deleteProfileError) {
        throw new Error(`Errore nell'eliminazione del profilo: ${deleteProfileError.message}`);
      }

      // Nota: L'utente in auth.users rimarrà, ma senza profilo non potrà accedere
      // Per eliminare completamente anche da auth.users servirebbero privilegi admin

      toast({
        title: "Dipendente eliminato",
        description: `${employeeName} è stato rimosso dal sistema`,
      });

      return { success: true };

    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione del dipendente",
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
