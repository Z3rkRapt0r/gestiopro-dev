
import { useState, useEffect, useCallback } from 'react';
import { useWorkingDaysValidation } from './useWorkingDaysValidation';
import { useLeaveBalanceValidation } from './useLeaveBalanceValidation';

export function useLeaveFormValidation() {
  const { isWorkingDay, countWorkingDays, getWorkingDaysLabels } = useWorkingDaysValidation();
  const { balanceValidation, validateLeaveRequest, isLoading: isLoadingBalance } = useLeaveBalanceValidation();
  const [balanceValidationError, setBalanceValidationError] = useState<string | null>(null);

  // Debounced validation to prevent continuous re-renders
  const validateBalanceForRequest = useCallback((
    type: 'ferie' | 'permesso',
    dateFrom?: Date,
    dateTo?: Date,
    day?: Date,
    timeFrom?: string,
    timeTo?: string
  ) => {
    // Clear previous errors first
    setBalanceValidationError(null);

    // If balance is not configured, set a blocking error
    if (!balanceValidation) {
      setBalanceValidationError('Il bilancio ferie/permessi deve essere configurato prima di poter inviare richieste.');
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
  }, [balanceValidation, validateLeaveRequest]);

  const validateWorkingDays = (startDate: Date, endDate: Date, type: string): string[] => {
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
  };

  const isDateDisabled = (date: Date): boolean => {
    return !isWorkingDay(date);
  };

  return {
    balanceValidation,
    isLoadingBalance,
    balanceValidationError,
    validateBalanceForRequest,
    validateWorkingDays,
    isDateDisabled,
    isWorkingDay,
    getWorkingDaysLabels,
  };
}
