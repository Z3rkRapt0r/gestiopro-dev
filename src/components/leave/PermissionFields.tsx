
import React from 'react';
import { Control } from 'react-hook-form';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, Info } from 'lucide-react';
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
}

export function PermissionFields({ control, selectedDay }: PermissionFieldsProps) {
  const isDateDisabled = (date: Date): boolean => {
    // Disabilita sabato (6) e domenica (0)
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

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
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          <strong>Opzioni per i permessi:</strong>
          <br />
          • Lascia vuoti gli orari per un permesso giornaliero (8 ore)
          <br />
          • Compila gli orari per un permesso orario specifico
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="time_from"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="time_from">Ora Inizio (opzionale)</FormLabel>
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
              <FormLabel htmlFor="time_to">Ora Fine (opzionale)</FormLabel>
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

      {selectedDay && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-800">
            <span className="font-medium">Permesso richiesto per:</span> {format(selectedDay, "dd/MM/yyyy", { locale: it })}
          </p>
        </div>
      )}
    </>
  );
}
