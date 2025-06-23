
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

      // Crea l'utente in Supabase Auth con retry logic
      let signUpData, signUpError;
      let retryCount = 0;
      const maxRetries = 3;

      do {
        const result = await supabase.auth.signUp({
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
        
        signUpData = result.data;
        signUpError = result.error;
        
        if (signUpError && retryCount < maxRetries - 1) {
          console.log(`Tentativo ${retryCount + 1} fallito, ritento...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retryCount++;
        } else {
          break;
        }
      } while (retryCount < maxRetries);

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

      // Attendi e verifica la creazione del profilo
      let profileExists = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!profileExists && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: profileCheck } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profileCheck) {
          profileExists = true;
          console.log('Profilo trovato:', profileCheck);
          
          // Aggiorna il profilo con tutti i dati
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
          
          break;
        }
        
        attempts++;
      }

      if (!profileExists) {
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
      }

      // Crea bilancio ferie iniziale per dipendenti
      if (data.role === 'employee') {
        const currentYear = new Date().getFullYear();
        const { error: balanceError } = await supabase
          .from('employee_leave_balance')
          .insert({
            user_id: userId,
            year: currentYear,
            vacation_days_total: 26, // Giorni di ferie standard
            permission_hours_total: 32, // Ore di permesso standard
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
