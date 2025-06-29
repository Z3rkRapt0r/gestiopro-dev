
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useAuth } from '@/hooks/useAuth';
import { useLeaveFormValidation } from '@/hooks/useLeaveFormValidation';
import { LeaveRequestFormValidation } from './LeaveRequestFormValidation';
import { LeaveBalanceDisplay } from './LeaveBalanceDisplay';
import { LeaveTypeSelector } from './LeaveTypeSelector';
import { VacationFields } from './VacationFields';
import { PermissionFields } from './PermissionFields';
import { leaveRequestSchema, LeaveRequestFormData, LeaveRequestFormProps } from './types';

export default function LeaveRequestForm({ type: defaultType, onSuccess }: LeaveRequestFormProps) {
  const { profile } = useAuth();
  const { insertMutation } = useLeaveRequests();
  const {
    balanceValidation,
    isLoadingBalance,
    balanceValidationError,
    validateBalanceForRequest,
    validateWorkingDays,
    isDateDisabled,
    isWorkingDay,
    workingDaysLabels,
    canSubmit: canSubmitFromValidation,
    isValidating,
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

  const watchedType = form.watch('type');
  const watchedDateFrom = form.watch('date_from');
  const watchedDateTo = form.watch('date_to');
  const watchedDay = form.watch('day');
  const watchedTimeFrom = form.watch('time_from');
  const watchedTimeTo = form.watch('time_to');

  // Memoizza i valori per evitare re-render inutili
  const formValues = useMemo(() => ({
    type: watchedType,
    dateFrom: watchedDateFrom,
    dateTo: watchedDateTo,
    day: watchedDay,
    timeFrom: watchedTimeFrom,
    timeTo: watchedTimeTo,
  }), [watchedType, watchedDateFrom, watchedDateTo, watchedDay, watchedTimeFrom, watchedTimeTo]);

  // Debounced balance validation con timeout più lungo
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isValidating) {
        console.log('Validating balance for:', formValues);
        validateBalanceForRequest(
          formValues.type,
          formValues.dateFrom,
          formValues.dateTo,
          formValues.day,
          formValues.timeFrom,
          formValues.timeTo
        );
      }
    }, 500); // Aumentato a 500ms per ridurre le chiamate

    return () => clearTimeout(timeoutId);
  }, [formValues, validateBalanceForRequest, isValidating]);

  // Callback per il submit stabilizzato
  const onSubmit = useCallback((data: LeaveRequestFormData) => {
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

    // Se il bilancio non è configurato, permettiamo comunque il submit
    const hasBlockingBalanceError = balanceValidationError && 
      !balanceValidationError.includes('Attenzione:') &&
      !balanceValidationError.includes('non è configurato');

    if (hasBlockingBalanceError) {
      console.log('Blocking balance validation error:', balanceValidationError);
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
      onSuccess: () => {
        form.reset();
        if (onSuccess) onSuccess();
      }
    });
  }, [profile?.id, balanceValidationError, isFormValid, validateWorkingDays, form, insertMutation, onSuccess]);
  
  // Calcola lo stato del submit
  const canSubmit = useMemo(() => {
    return canSubmitFromValidation && 
           isFormValid && 
           !insertMutation.isPending && 
           !isValidating;
  }, [canSubmitFromValidation, isFormValid, insertMutation.isPending, isValidating]);

  // Determina se il bilancio è un warning (non bloccante) o un errore (bloccante)
  const isBalanceWarning = useMemo(() => {
    return balanceValidationError && (
      balanceValidationError.includes('Attenzione:') ||
      balanceValidationError.includes('non è configurato')
    );
  }, [balanceValidationError]);

  const isBalanceError = useMemo(() => {
    return balanceValidationError && !isBalanceWarning;
  }, [balanceValidationError, isBalanceWarning]);

  console.log('Form state:', {
    isFormValid,
    balanceValidationError,
    isBalanceWarning,
    isBalanceError,
    canSubmit,
    isLoadingBalance,
    isValidating,
    balanceValidation: !!balanceValidation
  });

  return (
    <LeaveRequestFormValidation
      leaveType={watchedType}
      startDate={watchedDateFrom ? format(watchedDateFrom, 'yyyy-MM-dd') : undefined}
      endDate={watchedDateTo ? format(watchedDateTo, 'yyyy-MM-dd') : undefined}
      singleDay={watchedDay ? format(watchedDay, 'yyyy-MM-dd') : undefined}
      onValidationChange={(isValid, message) => {
        setIsFormValid(isValid);
        setFormValidationMessage(message || '');
      }}
    >
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Nuova Richiesta</CardTitle>
        </CardHeader>
        <CardContent>
          {workingDaysLabels.length > 0 && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                <strong>Giorni lavorativi configurati:</strong> {workingDaysLabels.join(', ')}
                <br />
                <span className="text-sm">
                  Solo i giorni lavorativi verranno conteggiati per ferie e permessi.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {balanceValidation && (
            <div className="mb-6">
              <LeaveBalanceDisplay 
                balance={balanceValidation} 
                isLoading={isLoadingBalance}
              />
            </div>
          )}

          {!balanceValidation && !isLoadingBalance && (
            <Alert className="mb-6 border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                <strong>Attenzione:</strong> Il bilancio ferie/permessi non è configurato per il tuo account.
                <br />
                <span className="text-sm">
                  Puoi comunque inviare la richiesta, ma contatta l'amministratore per configurare il bilancio.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {showValidationErrors && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Correggi gli errori di validazione dei giorni lavorativi prima di procedere.
              </AlertDescription>
            </Alert>
          )}

          {isBalanceWarning && (
            <Alert className="mb-6 border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">{balanceValidationError}</AlertDescription>
            </Alert>
          )}

          {isBalanceError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{balanceValidationError}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <LeaveTypeSelector control={form.control} />

              {watchedType === 'ferie' && (
                <VacationFields
                  control={form.control}
                  startDate={watchedDateFrom}
                  endDate={watchedDateTo}
                  isDateDisabled={(date) => isDateDisabled(date, watchedType)}
                />
              )}

              {watchedType === 'permesso' && (
                <PermissionFields
                  control={form.control}
                  selectedDay={watchedDay}
                  isDateDisabled={(date) => isDateDisabled(date, watchedType)}
                  isWorkingDay={isWorkingDay}
                  workingDaysLabels={workingDaysLabels}
                />
              )}

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (opzionale)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Aggiungi dettagli sulla tua richiesta..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={!canSubmit}
              >
                {insertMutation.isPending ? 'Invio in corso...' : 
                 isValidating ? 'Validazione in corso...' : 
                 'Invia Richiesta'}
              </Button>
              
              {/* Debug info - remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                  <div>canSubmit: {canSubmit.toString()}</div>
                  <div>isValidating: {isValidating.toString()}</div>
                  <div>balanceError: {!!balanceValidationError}</div>
                  <div>formValid: {isFormValid.toString()}</div>
                  <div>hasBalance: {!!balanceValidation}</div>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </LeaveRequestFormValidation>
  );
}
