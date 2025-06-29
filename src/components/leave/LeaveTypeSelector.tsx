
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Control } from 'react-hook-form';
import { LeaveRequestFormData } from './types';

interface LeaveTypeSelectorProps {
  control: Control<LeaveRequestFormData>;
}

export function LeaveTypeSelector({ control }: LeaveTypeSelectorProps) {
  return (
    <FormField
      control={control}
      name="type"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Tipo di Richiesta</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona il tipo di richiesta" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="ferie">Ferie</SelectItem>
              <SelectItem value="permesso">Permesso</SelectItem>
              <SelectItem value="malattia">Malattia</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
