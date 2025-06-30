
import React from 'react';
import { Control } from 'react-hook-form';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LeaveRequestFormData } from './types';

interface PermissionFieldsProps {
  control: Control<LeaveRequestFormData>;
  selectedDay: Date | undefined;
  isDateDisabled: (date: Date) => boolean;
  isWorkingDay: (date: Date) => boolean;
  workingDaysLabels: string[];
}

export function PermissionFields({ 
  control, 
  selectedDay, 
  isDateDisabled, 
  isWorkingDay, 
  workingDaysLabels 
}: PermissionFieldsProps) {
  return (
    <>
      <FormField
        control={control}
        name="day"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data del Permesso</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(field.value, "PPP", { locale: it })
                    ) : (
                      <span>Seleziona data</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={isDateDisabled}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="time_from"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="time_from">Ora Inizio</FormLabel>
              <FormControl>
                <Input 
                  id="time_from"
                  name="time_from"
                  type="time" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="time_to"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="time_to">Ora Fine</FormLabel>
              <FormControl>
                <Input 
                  id="time_to"
                  name="time_to"
                  type="time" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {selectedDay && !isWorkingDay(selectedDay) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Non puoi richiedere un permesso per un giorno non lavorativo.
            Seleziona un giorno lavorativo: {workingDaysLabels.join(', ')}.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
