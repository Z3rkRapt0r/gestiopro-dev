
import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { LeaveTypeSelector } from './LeaveTypeSelector';
import { VacationFields } from './VacationFields';
import { PermissionFields } from './PermissionFields';
import { LeaveRequestFormData } from './types';

interface LeaveRequestFormFieldsProps {
  control: Control<LeaveRequestFormData>;
  watchedType: 'ferie' | 'permesso';
  watchedDateFrom?: Date;
  watchedDateTo?: Date;
  watchedDay?: Date;
}

export function LeaveRequestFormFields({
  control,
  watchedType,
  watchedDateFrom,
  watchedDateTo,
  watchedDay,
}: LeaveRequestFormFieldsProps) {
  return (
    <>
      <LeaveTypeSelector control={control} />

      {watchedType === 'ferie' && (
        <VacationFields
          control={control}
          startDate={watchedDateFrom}
          endDate={watchedDateTo}
        />
      )}

      {watchedType === 'permesso' && (
        <PermissionFields
          control={control}
          selectedDay={watchedDay}
        />
      )}

      <FormField
        control={control}
        name="note"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="leave_notes">Note (opzionale)</FormLabel>
            <FormControl>
              <Textarea
                id="leave_notes"
                name="note"
                placeholder="Aggiungi dettagli sulla tua richiesta..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
