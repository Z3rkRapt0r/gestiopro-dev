
import React from 'react';
import { Control } from 'react-hook-form';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LeaveRequestFormData } from './types';

interface SickLeaveFieldsProps {
  control: Control<LeaveRequestFormData>;
  isDateDisabled: (date: Date) => boolean;
}

export function SickLeaveFields({ control, isDateDisabled }: SickLeaveFieldsProps) {
  return (
    <>
      <FormField
        control={control}
        name="day"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data della Malattia</FormLabel>
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

      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-700">
          <strong>Nota:</strong> La malattia può essere registrata per qualsiasi giorno, 
          indipendentemente dalla configurazione dei giorni lavorativi e dal bilancio ferie/permessi.
        </AlertDescription>
      </Alert>
    </>
  );
}
