
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

      // Utilizza l'edge function per la creazione sicura
      const { data: result, error } = await supabase.functions.invoke('create-employee', {
        body: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          role: data.role,
          employeeCode: data.employeeCode
        }
      });

      if (error) {
        console.error('Errore nella funzione create-employee:', error);
        throw new Error(error.message || 'Errore durante la creazione del dipendente');
      }

      if (!result.success) {
        throw new Error(result.error || 'Errore durante la creazione del dipendente');
      }

      console.log('Dipendente creato con successo:', result);

      toast({
        title: "Dipendente creato",
        description: result.message,
      });

      return { success: true, userId: result.userId };

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
