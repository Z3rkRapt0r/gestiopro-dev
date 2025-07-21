import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export const usePermissionWarnings = (selectedEmployees: string[], selectedDate?: Date) => {
  const [permissionWarnings, setPermissionWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const checkPermissions = useCallback(async (userIds: string[], date?: Date) => {
    if (!userIds || userIds.length === 0 || !date) {
      setPermissionWarnings([]);
      return;
    }

    setIsLoading(true);
    const warnings: string[] = [];
    
    try {
      for (const userId of userIds) {
        // Ottieni prima i dettagli del permesso
        const { data: permissions } = await supabase
          .from('leave_requests')
          .select('type, day, time_from, time_to')
          .eq('user_id', userId)
          .eq('type', 'permesso')
          .eq('status', 'approved')
          .eq('day', format(date, 'yyyy-MM-dd'));

        // Poi ottieni i dettagli del dipendente
        const { data: employee } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();

        if (permissions && permissions.length > 0 && employee) {
          const permission = permissions[0];
          const employeeName = `${employee.first_name} ${employee.last_name}`;
          
          if (permission.time_from && permission.time_to) {
            warnings.push(`${employeeName} ha un permesso dalle ${permission.time_from} alle ${permission.time_to}`);
          } else {
            warnings.push(`${employeeName} ha un permesso per l'intera giornata`);
          }
        }
      }
      
      setPermissionWarnings(warnings);
    } catch (error) {
      console.error('❌ Errore nel controllo permessi:', error);
      setPermissionWarnings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const timeoutId = setTimeout(() => {
        checkPermissions(selectedEmployees, selectedDate);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setPermissionWarnings([]);
    }
  }, [selectedEmployees, selectedDate, checkPermissions]);

  return {
    permissionWarnings,
    isLoading,
    hasPermissionWarnings: permissionWarnings.length > 0
  };
};