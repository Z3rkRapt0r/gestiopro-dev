
import React, { useState, useEffect } from 'react';
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
import { SickLeaveFields } from './SickLeaveFields';
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
    getWorkingDaysLabels,
  } = useLeaveFormValidation();
  
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isFormValid, setIsFormValid] = useState(true);
  const [formValidationMessage, setFormValidationMessage] = useState<string>('');
  
  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      type: (defaultType as 'ferie' | 'permesso' | 'malattia') || 'ferie',
    },
  });

  const watchedType = form.watch('type');
  const watchedDateFrom = form.watch('date_from');
  const watchedDateTo = form.watch('date_to');
  const watchedDay = form.watch('day');
  const watchedTimeFrom = form.watch('time_from');
  const watchedTimeTo = form.watch('time_to');

  // Validazione bilancio in tempo reale
  useEffect(() => {
    validateBalanceForRequest(
      watchedType,
      watchedDateFrom,
      watchedDateTo,
      watchedDay,
      watchedTimeFrom,
      watchedTimeTo
    );
  }, [watchedType, watchedDateFrom, watchedDateTo, watchedDay, watchedTimeFrom, watchedTimeTo]);

  const onSubmit = (data: LeaveRequestFormData) => {
    if (!profile?.id) return;
    
    setShowValidationErrors(false);
    
    let validationErrors: string[] = [];
    
    // Only validate working days for 'ferie' and 'permesso', not 'malattia'
    if (data.type === 'ferie' && data.date_from && data.date_to) {
      validationErrors = validateWorkingDays(data.date_from, data.date_to, data.type);
    } else if (data.type === 'permesso' && data.day) {
      validationErrors = validateWorkingDays(data.day, data.day, data.type);
    }
    
    if (validationErrors.length > 0) {
      setShowValidationErrors(true);
      return;
    }

    if (balanceValidationError && data.type !== 'malattia') {
      return;
    }

    const payload = {
      ...data,
      user_id: profile.id,
      date_from: data.date_from ? format(data.date_from, 'yyyy-MM-dd') : undefined,
      date_to: data.date_to ? format(data.date_to, 'yyyy-MM-dd') : undefined,
      day: data.day ? format(data.day, 'yyyy-MM-dd') : undefined,
    };

    insertMutation.mutate(payload, {
      onSuccess: () => {
        form.reset();
        if (onSuccess) onSuccess();
      }
    });
  };

  const workingDaysLabels = getWorkingDaysLabels();
  const canSubmit = isFormValid && 
    !balanceValidationError && 
    !insertMutation.isPending && 
    (watchedType === 'malattia' || (balanceValidation?.hasBalance ?? false));

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

          {balanceValidation && watchedType !== 'malattia' && (
            <div className="mb-6">
              <LeaveBalanceDisplay 
                balance={balanceValidation} 
                isLoading={isLoadingBalance}
              />
            </div>
          )}

          {showValidationErrors && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Correggi gli errori di validazione dei giorni lavorativi prima di procedere.
              </AlertDescription>
            </Alert>
          )}

          {balanceValidationError && watchedType !== 'malattia' && (
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

              {watchedType === 'malattia' && (
                <SickLeaveFields
                  control={form.control}
                  isDateDisabled={(date) => isDateDisabled(date, watchedType)}
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
                {insertMutation.isPending ? 'Invio in corso...' : 'Invia Richiesta'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </LeaveRequestFormValidation>
  );
}
