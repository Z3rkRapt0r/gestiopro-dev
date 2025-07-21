
import { useState } from "react";
import { format } from "date-fns";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useLeaveConflicts } from "@/hooks/useLeaveConflicts";
import { useCompanyHolidays } from "@/hooks/useCompanyHolidays";

export function useSickLeaveValidation(selectedUserId: string) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const { employees } = useActiveEmployees();
  const { isHoliday, getHolidayName, isLoading: holidaysLoading } = useCompanyHolidays();
  
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

  // Validazione anti-conflitto completa con controllo festività migliorato
  const validateConflicts = async (startDate?: Date, endDate?: Date, employeeId?: string) => {
    if (!startDate || !employeeId) return true;

    // Aspetta che le festività siano caricate
    if (holidaysLoading) {
      console.log('⏳ [SICK-LEAVE-VALIDATION] Attendo caricamento festività...');
      return true; // Non bloccare se le festività stanno ancora caricando
    }

    try {
      console.log('🔍 [SICK-LEAVE-VALIDATION] Controllo conflitti per malattia (incluse festività)...');
      
      // Controllo festività nelle date selezionate con logging migliorato
      const datesToCheck = [startDate];
      if (endDate && endDate !== startDate) {
        datesToCheck.push(endDate);
      }
      
      for (const dateToCheck of datesToCheck) {
        if (isHoliday(dateToCheck)) {
          const holidayName = getHolidayName(dateToCheck);
          const warning = `⚠️ La data ${format(dateToCheck, 'dd/MM/yyyy')} coincide con una festività aziendale${holidayName ? `: ${holidayName}` : ''}. Si consiglia di verificare la necessità della malattia in questa data.`;
          console.log(`🎉 [SICK-LEAVE-VALIDATION] Festività trovata: ${warning}`);
          setValidationError(warning);
          // Non bloccare completamente ma avvisare
        }
      }
      
      const validation = await validateSickLeaveRange(
        employeeId, 
        format(startDate, 'yyyy-MM-dd'),
        endDate ? format(endDate, 'yyyy-MM-dd') : undefined
      );
      
      if (!validation.isValid) {
        console.log(`❌ [SICK-LEAVE-VALIDATION] Conflitti trovati: ${validation.conflicts.join('; ')}`);
        setValidationError(validation.conflicts.join('; '));
        return false;
      }
      
      console.log('✅ [SICK-LEAVE-VALIDATION] Nessun conflitto critico trovato');
      return true;
    } catch (error) {
      console.error('❌ [SICK-LEAVE-VALIDATION] Errore validazione conflitti malattia:', error);
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
