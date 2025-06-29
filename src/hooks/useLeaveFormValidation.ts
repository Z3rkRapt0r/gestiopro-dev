
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWorkingDaysValidation } from './useWorkingDaysValidation';
import { useLeaveBalanceValidation } from './useLeaveBalanceValidation';

export function useLeaveFormValidation() {
  const { isWorkingDay, countWorkingDays, getWorkingDaysLabels } = useWorkingDaysValidation();
  const { balanceValidation, validateLeaveRequest, isLoading: isLoadingBalance } = useLeaveBalanceValidation();
  const [balanceValidationError, setBalanceValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Stabilizza le labels dei giorni lavorativi
  const workingDaysLabels = useMemo(() => getWorkingDaysLabels(), [getWorkingDaysLabels]);

  // Stabilizza la funzione di validazione del bilancio con useCallback
  const validateBalanceForRequest = useCallback((
    type: 'ferie' | 'permesso',
    dateFrom?: Date,
    dateTo?: Date,
    day?: Date,
    timeFrom?: string,
    timeTo?: string
  ) => {
    // Evita validazioni ridondanti se già in corso
    if (isValidating) return;

    setIsValidating(true);
    
    // Clear previous errors first
    setBalanceValidationError(null);

    // Se il bilancio non è configurato, non bloccare il form ma mostra un warning
    if (!balanceValidation) {
      console.log('Bilancio non configurato, permettendo comunque il submit con warning');
      setBalanceValidationError('Attenzione: Il bilancio ferie/permessi non è configurato. Contatta l\'amministratore.');
      setIsValidating(false);
      return;
    }

    // Only validate if we have the necessary data
    if (type === 'ferie' && dateFrom && dateTo) {
      const validation = validateLeaveRequest('ferie', dateFrom, dateTo);
      setBalanceValidationError(validation.errorMessage || null);
    } else if (type === 'permesso' && day) {
      const validation = validateLeaveRequest('permesso', null, null, day, timeFrom, timeTo);
      setBalanceValidationError(validation.errorMessage || null);
    }

    setIsValidating(false);
  }, [balanceValidation, validateLeaveRequest, isValidating]);

  const validateWorkingDays = useCallback((startDate: Date, endDate: Date, type: string): string[] => {
    const errors: string[] = [];
    
    if (type === 'ferie') {
      const workingDaysCount = countWorkingDays(startDate, endDate);
      if (workingDaysCount === 0) {
        errors.push('Il periodo selezionato non include giorni lavorativi validi per le ferie.');
      }
    }
    
    if (type === 'permesso' && !isWorkingDay(startDate)) {
      errors.push('I permessi possono essere richiesti solo per giorni lavorativi.');
    }
    
    return errors;
  }, [countWorkingDays, isWorkingDay]);

  const isDateDisabled = useCallback((date: Date, type: string): boolean => {
    return !isWorkingDay(date);
  }, [isWorkingDay]);

  // Determina se il form può essere inviato
  const canSubmit = useMemo(() => {
    // Se il bilancio non è configurato, permettiamo il submit con warning
    if (!balanceValidation) {
      return true;
    }
    
    // Se c'è un errore di validazione che blocca (non un warning), blocca il submit
    const hasBlockingError = balanceValidationError && 
      !balanceValidationError.includes('Attenzione:') &&
      !balanceValidationError.includes('non è configurato');
    
    return !hasBlockingError && !isValidating;
  }, [balanceValidation, balanceValidationError, isValidating]);

  return {
    balanceValidation,
    isLoadingBalance,
    balanceValidationError,
    validateBalanceForRequest,
    validateWorkingDays,
    isDateDisabled,
    isWorkingDay,
    workingDaysLabels,
    canSubmit,
    isValidating,
  };
}
