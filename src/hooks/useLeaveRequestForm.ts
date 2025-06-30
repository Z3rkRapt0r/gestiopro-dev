
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useLeaveBalanceValidation } from '@/hooks/useLeaveBalanceValidation';
import { leaveRequestSchema, LeaveRequestFormData } from '@/components/leave/types';
import { notifyLeaveRequest } from '@/utils/notificationHelpers';

export function useLeaveRequestForm(defaultType?: string, onSuccess?: () => void) {
  const { profile } = useAuth();
  const { insertMutation } = useLeaveRequests();
  const { balanceValidation, isLoading: isLoadingBalance, validateLeaveRequest } = useLeaveBalanceValidation();
  
  const [balanceValidationError, setBalanceValidationError] = useState<string | null>(null);
  
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

  // Validazione del bilancio semplificata
  useEffect(() => {
    if (!balanceValidation) {
      setBalanceValidationError('Il bilancio ferie/permessi deve essere configurato prima di poter inviare richieste.');
      return;
    }

    const timeoutId = setTimeout(() => {
      if (watchedValues.type === 'ferie' && watchedValues.dateFrom && watchedValues.dateTo) {
        const validation = validateLeaveRequest('ferie', watchedValues.dateFrom, watchedValues.dateTo);
        setBalanceValidationError(validation.errorMessage || null);
      } else if (watchedValues.type === 'permesso' && watchedValues.day) {
        const validation = validateLeaveRequest('permesso', null, null, watchedValues.day, watchedValues.timeFrom, watchedValues.timeTo);
        setBalanceValidationError(validation.errorMessage || null);
      } else {
        setBalanceValidationError(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [
    watchedValues.type,
    watchedValues.dateFrom,
    watchedValues.dateTo,
    watchedValues.day,
    watchedValues.timeFrom,
    watchedValues.timeTo,
    balanceValidation,
    validateLeaveRequest
  ]);

  const canSubmit = useMemo(() => {
    return !balanceValidationError && !insertMutation.isPending && !!balanceValidation;
  }, [balanceValidationError, insertMutation.isPending, balanceValidation]);

  const onSubmit = (data: LeaveRequestFormData) => {
    if (!profile?.id) return;
    
    console.log('Form submission:', { data, balanceValidationError });
    
    if (balanceValidationError) {
      console.log('Blocking submission due to balance validation error');
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
        // Notifica
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
    canSubmit,
    onSubmit,
  };
}
