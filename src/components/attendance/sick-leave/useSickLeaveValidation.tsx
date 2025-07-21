
import { useState } from "react";
import { format } from "date-fns";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useLeaveConflicts } from "@/hooks/useLeaveConflicts";
import { useCompanyHolidays } from "@/hooks/useCompanyHolidays";
import { useTimeBasedPermissionValidation } from "@/hooks/useTimeBasedPermissionValidation";
import { supabase } from "@/integrations/supabase/client";

export function useSickLeaveValidation(selectedUserId: string) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const { employees } = useActiveEmployees();
  const { isHoliday, getHolidayName } = useCompanyHolidays();
  const { getPermissionStatus } = useTimeBasedPermissionValidation();
  
  const { 
    conflictDates, 
    isLoading: isCalculatingConflicts, 
    isDateDisabled,
    validateSickLeaveRange
  } = useLeaveConflicts(selectedUserId, 'sick_leave');

  // Funzione per validare le date rispetto alla data di assunzione
  const validateDatesAgainstHireDate = (startDate?: Date, endDate?: Date, employeeId?: string) => {
    if (!startDate || !employeeId) return true;

    const employee = employees?.find(emp => emp.id === employeeId);
    if (!employee || !employee.hire_date) return true;

    const hireDateObj = new Date(employee.hire_date);
    
    if (startDate < hireDateObj) {
      setValidationError(`⚠️ Impossibile salvare l'evento: la data di inizio (${format(startDate, 'dd/MM/yyyy')}) è antecedente alla data di assunzione del dipendente (${format(hireDateObj, 'dd/MM/yyyy')}).`);
      return false;
    }

    if (endDate && endDate < hireDateObj) {
      setValidationError(`⚠️ Impossibile salvare l'evento: la data di fine (${format(endDate, 'dd/MM/yyyy')}) è antecedente alla data di assunzione del dipendente (${format(hireDateObj, 'dd/MM/yyyy')}).`);
      return false;
    }

    setValidationError(null);
    return true;
  };

  // Validazione anti-conflitto completa con controllo festività e permessi scaduti
  const validateConflicts = async (startDate?: Date, endDate?: Date, employeeId?: string) => {
    if (!startDate || !employeeId) return true;

    try {
      console.log('🔍 Controllo conflitti per malattia (incluse festività e permessi scaduti)...');
      
      // Controllo festività nelle date selezionate
      const dateToCheck = startDate;
      if (isHoliday(dateToCheck)) {
        const holidayName = getHolidayName(dateToCheck);
        setValidationError(`⚠️ La data di inizio ${format(dateToCheck, 'dd/MM/yyyy')} coincide con una festività aziendale${holidayName ? `: ${holidayName}` : ''}. Si consiglia di verificare la necessità della malattia in questa data.`);
        // Non bloccare completamente ma avvisare
      }
      
      if (endDate && isHoliday(endDate)) {
        const holidayName = getHolidayName(endDate);
        setValidationError(`⚠️ La data di fine ${format(endDate, 'dd/MM/yyyy')} coincide con una festività aziendale${holidayName ? `: ${holidayName}` : ''}. Si consiglia di verificare la necessità della malattia in questa data.`);
      }
      
      // Controllo permessi con logica temporale migliorata
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const { data: permissions } = await supabase
        .from('leave_requests')
        .select('type, day, time_from, time_to')
        .eq('user_id', employeeId)
        .eq('status', 'approved')
        .eq('type', 'permesso')
        .eq('day', startDateStr);

      if (permissions && permissions.length > 0) {
        const permission = permissions[0];
        const status = getPermissionStatus(permission, new Date(), startDate);
        
        if (status.status === 'expired') {
          // Permesso scaduto: non bloccare ma informare
          console.log('ℹ️ Permesso scaduto trovato, ma non bloccante:', status.message);
        } else if (status.status === 'active' || status.status === 'upcoming') {
          setValidationError(`⚠️ Conflitto con permesso: ${status.message}`);
          return false;
        }
      }
      
      const validation = await validateSickLeaveRange(
        employeeId, 
        format(startDate, 'yyyy-MM-dd'),
        endDate ? format(endDate, 'yyyy-MM-dd') : undefined
      );
      
      if (!validation.isValid) {
        setValidationError(validation.conflicts.join('; '));
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Errore validazione conflitti malattia:', error);
      setValidationError('Errore durante la validazione dei conflitti');
      return false;
    }
  };

  return {
    validationError,
    setValidationError,
    conflictDates,
    isCalculatingConflicts,
    isDateDisabled,
    validateDatesAgainstHireDate,
    validateConflicts
  };
}
