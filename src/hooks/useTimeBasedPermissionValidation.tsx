
import { useCallback } from 'react';
import { format } from 'date-fns';

export const useTimeBasedPermissionValidation = () => {
  const isPermissionActive = useCallback((permission: any, currentTime?: Date, targetDate?: Date) => {
    if (!permission) return false;
    
    const now = currentTime || new Date();
    const checkDate = targetDate || now;
    const currentDateStr = format(now, 'yyyy-MM-dd');
    const targetDateStr = format(checkDate, 'yyyy-MM-dd');
    
    // Se il permesso non è per la data target, non è attivo
    if (permission.day !== targetDateStr) return false;
    
    // Permesso giornaliero - sempre attivo per tutto il giorno
    if (!permission.time_from || !permission.time_to) {
      return true;
    }
    
    // Permesso orario - logica diversa per date passate/future vs oggi
    const permissionStart = permission.time_from;
    const permissionEnd = permission.time_to;
    
    // Per date passate: il permesso è considerato "non attivo" se è già scaduto
    if (targetDateStr < currentDateStr) {
      return false; // I permessi del passato sono sempre considerati non attivi per inserimenti manuali
    }
    
    // Per date future: considera il permesso sempre attivo (approccio conservativo)
    if (targetDateStr > currentDateStr) {
      return true;
    }
    
    // Per oggi: verifica se l'ora corrente è nell'intervallo del permesso
    const currentTimeStr = format(now, 'HH:mm:ss');
    return currentTimeStr >= permissionStart && currentTimeStr <= permissionEnd;
  }, []);

  const getPermissionStatus = useCallback((permission: any, currentTime?: Date, targetDate?: Date) => {
    if (!permission) return { status: 'none', message: '' };
    
    const now = currentTime || new Date();
    const checkDate = targetDate || now;
    const currentDateStr = format(now, 'yyyy-MM-dd');
    const targetDateStr = format(checkDate, 'yyyy-MM-dd');
    
    if (permission.day !== targetDateStr) {
      return { status: 'none', message: '' };
    }
    
    // Permesso giornaliero
    if (!permission.time_from || !permission.time_to) {
      return { 
        status: 'blocked', 
        message: 'Dipendente in permesso giornaliero per tutto il giorno' 
      };
    }
    
    // Permesso orario - logica diversa per date passate/future vs oggi
    const permissionStart = permission.time_from;
    const permissionEnd = permission.time_to;
    
    // Per date passate
    if (targetDateStr < currentDateStr) {
      return { 
        status: 'expired', 
        message: `Permesso orario ${permissionStart}-${permissionEnd} scaduto. Puoi inserire la presenza.` 
      };
    }
    
    // Per date future
    if (targetDateStr > currentDateStr) {
      return { 
        status: 'upcoming', 
        message: `Permesso orario programmato ${permissionStart}-${permissionEnd}. Inserimento bloccato.` 
      };
    }
    
    // Per oggi
    const currentTimeStr = format(now, 'HH:mm:ss');
    
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
