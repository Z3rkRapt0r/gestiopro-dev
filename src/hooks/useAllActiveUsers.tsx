
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: 'admin' | 'employee';
  department: string | null;
  hire_date: string | null;
  employee_code: string | null;
  is_active: boolean;
  tracking_start_type?: 'from_hire_date' | 'from_year_start';
}

export const useAllActiveUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Recupera tutti gli utenti attivi (sia admin che employee)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('first_name');

      if (error) {
        console.error('Error fetching all active users:', error);
        toast({
          title: "Errore",
          description: "Impossibile caricare gli utenti",
          variant: "destructive",
        });
        return;
      }

      // Type assertion to ensure compatibility
      const typedData = (data || []).map(user => ({
        ...user,
        role: user.role as 'admin' | 'employee',
        tracking_start_type: user.tracking_start_type as 'from_hire_date' | 'from_year_start' | undefined
      }));

      setUsers(typedData);
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il caricamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const refreshUsers = () => {
    fetchUsers();
  };

  return {
    users,
    loading,
    refreshUsers,
  };
};
