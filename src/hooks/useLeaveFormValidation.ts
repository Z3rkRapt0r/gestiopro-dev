
import { useState, useEffect } from 'react';
import { useWorkingDaysValidation } from './useWorkingDaysValidation';
import { useLeaveBalanceValidation } from './useLeaveBalanceValidation';

export function useLeaveFormValidation() {
  const { isWorkingDay, countWorkingDays, getWorkingDaysLabels } = useWorkingDaysValidation();
  const { balanceValidation, validateLeaveRequest, isLoading: isLoadingBalance } = useLeaveBalanceValidation();
  const [balanceValidationError, setBalanceValidationError] = useState<string | null>(null);

  const validateBalanceForRequest = (
    type: 'ferie' | 'permesso' | 'malattia',
    dateFrom?: Date,
    dateTo?: Date,
    day?: Date,
    timeFrom?: string,
    timeTo?: string
  ) => {
    if (!balanceValidation || type === 'malattia') {
      setBalanceValidationError(null);
      return;
    }

    if (type === 'ferie' && dateFrom && dateTo) {
      const validation = validateLeaveRequest('ferie', dateFrom, dateTo);
      setBalanceValidationError(validation.errorMessage || null);
    } else if (type === 'permesso' && day) {
      const validation = validateLeaveRequest('permesso', null, null, day, timeFrom, timeTo);
      setBalanceValidationError(validation.errorMessage || null);
    } else {
      setBalanceValidationError(null);
    }
  };

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

  const isDateDisabled = (date: Date, type: string): boolean => {
    if (type === 'malattia') return false;
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
