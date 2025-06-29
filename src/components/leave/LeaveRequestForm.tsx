
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { useLeaveFormValidation } from '@/hooks/useLeaveFormValidation';
import { useLeaveRequestForm } from '@/hooks/useLeaveRequestForm';
import { LeaveRequestFormValidation } from './LeaveRequestFormValidation';
import { LeaveRequestFormHeader } from './LeaveRequestFormHeader';
import { LeaveRequestFormAlerts } from './LeaveRequestFormAlerts';
import { LeaveRequestFormFields } from './LeaveRequestFormFields';
import { LeaveRequestFormProps } from './types';

export default function LeaveRequestForm({ type: defaultType, onSuccess }: LeaveRequestFormProps) {
  const {
    isDateDisabled,
    isWorkingDay,
    getWorkingDaysLabels,
  } = useLeaveFormValidation();

  const {
    form,
    watchedValues,
    balanceValidation,
    isLoadingBalance,
    balanceValidationError,
    showValidationErrors,
    isFormValid,
    canSubmit,
    onSubmit,
    setIsFormValid,
    setFormValidationMessage,
  } = useLeaveRequestForm(defaultType, onSuccess);

  const workingDaysLabels = getWorkingDaysLabels();

  console.log('Form state:', {
    isFormValid,
    balanceValidationError,
    canSubmit,
    isLoadingBalance,
    balanceValidation: !!balanceValidation
  });

  return (
    <LeaveRequestFormValidation
      leaveType={watchedValues.type}
      startDate={watchedValues.dateFrom ? watchedValues.dateFrom.toISOString().split('T')[0] : undefined}
      endDate={watchedValues.dateTo ? watchedValues.dateTo.toISOString().split('T')[0] : undefined}
      singleDay={watchedValues.day ? watchedValues.day.toISOString().split('T')[0] : undefined}
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
          <LeaveRequestFormHeader
            workingDaysLabels={workingDaysLabels}
            balanceValidation={balanceValidation}
            isLoadingBalance={isLoadingBalance}
          />

          <LeaveRequestFormAlerts
            showValidationErrors={showValidationErrors}
            balanceValidationError={balanceValidationError}
          />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <LeaveRequestFormFields
                control={form.control}
                watchedType={watchedValues.type}
                watchedDateFrom={watchedValues.dateFrom}
                watchedDateTo={watchedValues.dateTo}
                watchedDay={watchedValues.day}
                isDateDisabled={isDateDisabled}
                isWorkingDay={isWorkingDay}
                workingDaysLabels={workingDaysLabels}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={!canSubmit}
              >
                {form.formState.isSubmitting ? 'Invio in corso...' : 'Invia Richiesta'}
              </Button>
              
              {/* Debug info - remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 mt-2">
                  Debug: canSubmit={canSubmit.toString()}, balanceError={!!balanceValidationError}, formValid={isFormValid}
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </LeaveRequestFormValidation>
  );
}
