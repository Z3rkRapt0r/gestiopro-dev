
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useLeaveFormValidation } from '@/hooks/useLeaveFormValidation';
import { leaveRequestSchema, LeaveRequestFormData } from '@/components/leave/types';
import { notifyLeaveRequest } from '@/utils/notificationHelpers';

export function useLeaveRequestForm(defaultType?: string, onSuccess?: () => void) {
  const { profile } = useAuth();
  const { insertMutation } = useLeaveRequests();
  const {
    balanceValidation,
    isLoadingBalance,
    balanceValidationError,
    validateBalanceForRequest,
    validateWorkingDays,
  } = useLeaveFormValidation();
  
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isFormValid, setIsFormValid] = useState(true);
  const [formValidationMessage, setFormValidationMessage] = useState<string>('');
  
  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      type: (defaultType as 'ferie' | 'permesso') || 'ferie',
    },
  });

  const watchedValues = {
    type: form.watch('type'),
    dateFrom: form.watch('date_from'),
    dateTo: form.watch('date_to'),
    day: form.watch('day'),
    timeFrom: form.watch('time_from'),
    timeTo: form.watch('time_to'),
  };

  // Debounced balance validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateBalanceForRequest(
        watchedValues.type,
        watchedValues.dateFrom,
        watchedValues.dateTo,
        watchedValues.day,
        watchedValues.timeFrom,
        watchedValues.timeTo
      );
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    watchedValues.type,
    watchedValues.dateFrom,
    watchedValues.dateTo,
    watchedValues.day,
    watchedValues.timeFrom,
    watchedValues.timeTo,
    validateBalanceForRequest
  ]);

  const canSubmit = useMemo(() => {
    return isFormValid && !balanceValidationError && !insertMutation.isPending;
  }, [isFormValid, balanceValidationError, insertMutation.isPending]);

  const onSubmit = (data: LeaveRequestFormData) => {
    if (!profile?.id) return;
    
    console.log('Form submission attempt:', { data, balanceValidationError, isFormValid });
    
    setShowValidationErrors(false);
    
    let validationErrors: string[] = [];
    
    // Validate working days for both types
    if (data.type === 'ferie' && data.date_from && data.date_to) {
      validationErrors = validateWorkingDays(data.date_from, data.date_to, data.type);
    } else if (data.type === 'permesso' && data.day) {
      validationErrors = validateWorkingDays(data.day, data.day, data.type);
    }
    
    if (validationErrors.length > 0) {
      console.log('Working days validation errors:', validationErrors);
      setShowValidationErrors(true);
      return;
    }

    // Check for balance validation errors
    if (balanceValidationError) {
      console.log('Balance validation error:', balanceValidationError);
      return;
    }

    const payload = {
      ...data,
      user_id: profile.id,
      date_from: data.date_from ? format(data.date_from, 'yyyy-MM-dd') : undefined,
      date_to: data.date_to ? format(data.date_to, 'yyyy-MM-dd') : undefined,
      day: data.day ? format(data.day, 'yyyy-MM-dd') : undefined,
    };

    console.log('Submitting leave request:', payload);

    insertMutation.mutate(payload, {
      onSuccess: async () => {
        // Create notification
        if (data.type === 'ferie' && data.date_from && data.date_to) {
          const dateRange = `${format(data.date_from, 'dd/MM/yyyy')} - ${format(data.date_to, 'dd/MM/yyyy')}`;
          await notifyLeaveRequest(profile.id, data.type, dateRange);
        } else if (data.type === 'permesso' && data.day) {
          const dateStr = format(data.day, 'dd/MM/yyyy');
          const timeStr = data.time_from && data.time_to ? ` (${data.time_from}-${data.time_to})` : '';
          await notifyLeaveRequest(profile.id, data.type, `${dateStr}${timeStr}`);
        }
        
        form.reset();
        if (onSuccess) onSuccess();
      }
    });
  };

  return {
    form,
    watchedValues,
    balanceValidation,
    isLoadingBalance,
    balanceValidationError,
    showValidationErrors,
    isFormValid,
    formValidationMessage,
    canSubmit,
    onSubmit,
    setIsFormValid,
    setFormValidationMessage,
  };
}
