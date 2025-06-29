
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
  isDateDisabled: (date: Date) => boolean;
  isWorkingDay: (date: Date) => boolean;
  workingDaysLabels: string[];
}

export function LeaveRequestFormFields({
  control,
  watchedType,
  watchedDateFrom,
  watchedDateTo,
  watchedDay,
  isDateDisabled,
  isWorkingDay,
  workingDaysLabels,
}: LeaveRequestFormFieldsProps) {
  return (
    <>
      <LeaveTypeSelector control={control} />

      {watchedType === 'ferie' && (
        <VacationFields
          control={control}
          startDate={watchedDateFrom}
          endDate={watchedDateTo}
          isDateDisabled={(date) => isDateDisabled(date)}
        />
      )}

      {watchedType === 'permesso' && (
        <PermissionFields
          control={control}
          selectedDay={watchedDay}
          isDateDisabled={(date) => isDateDisabled(date)}
          isWorkingDay={isWorkingDay}
          workingDaysLabels={workingDaysLabels}
        />
      )}

      <FormField
        control={control}
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
    </>
  );
}
