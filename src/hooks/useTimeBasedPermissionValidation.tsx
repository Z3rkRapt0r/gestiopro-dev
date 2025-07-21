
import { useCallback } from 'react';
import { format } from 'date-fns';

export const useTimeBasedPermissionValidation = () => {
  const isPermissionActive = useCallback((permission: any, currentTime?: Date) => {
    if (!permission) return false;
    
    const now = currentTime || new Date();
    const currentDateStr = format(now, 'yyyy-MM-dd');
    
    // Se il permesso non è per oggi, non è attivo
    if (permission.day !== currentDateStr) return false;
    
    // Permesso giornaliero - sempre attivo per tutto il giorno
    if (!permission.time_from || !permission.time_to) {
      return true;
    }
    
    // Permesso orario - verifica se l'ora corrente è nell'intervallo
    const currentTimeStr = format(now, 'HH:mm:ss');
    const permissionStart = permission.time_from;
    const permissionEnd = permission.time_to;
    
    return currentTimeStr >= permissionStart && currentTimeStr <= permissionEnd;
  }, []);

  const getPermissionStatus = useCallback((permission: any, currentTime?: Date) => {
    if (!permission) return { status: 'none', message: '' };
    
    const now = currentTime || new Date();
    const currentDateStr = format(now, 'yyyy-MM-dd');
    
    if (permission.day !== currentDateStr) {
      return { status: 'none', message: '' };
    }
    
    // Permesso giornaliero
    if (!permission.time_from || !permission.time_to) {
      return { 
        status: 'blocked', 
        message: 'Dipendente in permesso giornaliero per tutto il giorno' 
      };
    }
    
    // Permesso orario
    const currentTimeStr = format(now, 'HH:mm:ss');
    const permissionStart = permission.time_from;
    const permissionEnd = permission.time_to;
    
    if (currentTimeStr < permissionStart) {
      return { 
        status: 'upcoming', 
        message: `Permesso orario dalle ${permissionStart} alle ${permissionEnd}. Puoi inserire la presenza per adesso.` 
      };
    } else if (currentTimeStr >= permissionStart && currentTimeStr <= permissionEnd) {
      return { 
        status: 'active', 
        message: `Permesso orario attivo fino alle ${permissionEnd}. Non puoi inserire presenze durante questo orario.` 
      };
    } else {
      return { 
        status: 'expired', 
        message: `Permesso orario terminato alle ${permissionEnd}. Puoi inserire la presenza per il resto della giornata.` 
      };
    }
  }, []);

  return {
    isPermissionActive,
    getPermissionStatus
  };
};
