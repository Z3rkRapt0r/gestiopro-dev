
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { useLeaveRequestForm } from '@/hooks/useLeaveRequestForm';
import { LeaveRequestFormFields } from './LeaveRequestFormFields';
import { LeaveRequestFormProps } from './types';

export default function LeaveRequestForm({ type: defaultType, onSuccess }: LeaveRequestFormProps) {
  const {
    form,
    watchedValues,
    balanceValidation,
    isLoadingBalance,
    balanceValidationError,
    canSubmit,
    onSubmit,
  } = useLeaveRequestForm(defaultType, onSuccess);

  const isFormReady = !isLoadingBalance && (!balanceValidation || !balanceValidationError);

  console.log('Form state:', {
    canSubmit,
    balanceValidationError,
    isLoadingBalance,
    balanceValidation: !!balanceValidation,
    isFormReady
  });

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Richiesta Ferie/Permessi</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Informazioni sul bilancio */}
        {balanceValidation && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Il tuo bilancio attuale:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Ferie rimanenti:</span>
                <span className="font-semibold ml-2">{balanceValidation.remainingVacationDays} giorni</span>
              </div>
              <div>
                <span className="text-blue-700">Ore permesso rimanenti:</span>
                <span className="font-semibold ml-2">{balanceValidation.remainingPermissionHours} ore</span>
              </div>
            </div>
          </div>
        )}

        {/* Errore di validazione del bilancio */}
        {balanceValidationError && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-700 text-sm">{balanceValidationError}</p>
          </div>
        )}

        {/* Form principale */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <LeaveRequestFormFields
              control={form.control}
              watchedType={watchedValues.type}
              watchedDateFrom={watchedValues.dateFrom}
              watchedDateTo={watchedValues.dateTo}
              watchedDay={watchedValues.day}
            />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={!canSubmit || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Invio in corso...' : 'Invia Richiesta'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
