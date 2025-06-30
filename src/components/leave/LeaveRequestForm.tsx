
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useWorkingDaysValidation } from '@/hooks/useWorkingDaysValidation';
import { useAuth } from '@/hooks/useAuth';
import WorkingDaysPreview from './WorkingDaysPreview';

const leaveRequestSchema = z.object({
  type: z.enum(['ferie', 'permesso']),
  date_from: z.date().optional(),
  date_to: z.date().optional(),
  day: z.date().optional(),
  time_from: z.string().optional(),
  time_to: z.string().optional(),
  note: z.string().optional(),
}).refine((data) => {
  if (data.type === 'permesso' && data.day) {
    return data.time_from && data.time_to;
  }
  if (data.type === 'ferie') {
    return data.date_from && data.date_to;
  }
  return true;
}, {
  message: "Compila tutti i campi obbligatori per il tipo di richiesta selezionato",
});

type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

interface LeaveRequestFormProps {
  onSuccess?: () => void;
}

export default function LeaveRequestForm({ onSuccess }: LeaveRequestFormProps) {
  const { profile } = useAuth();
  const { insertMutation } = useLeaveRequests();
  const { isWorkingDay, countWorkingDays, getWorkingDaysLabels } = useWorkingDaysValidation();
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  
  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      type: 'ferie',
    },
  });

  const watchedType = form.watch('type');
  const watchedDateFrom = form.watch('date_from');
  const watchedDateTo = form.watch('date_to');
  const watchedDay = form.watch('day');

  // Validazione personalizzata per giorni lavorativi
  const validateWorkingDays = (startDate: Date, endDate: Date, type: string): string[] => {
    const errors: string[] = [];
    
    if (type === 'ferie') {
      const workingDaysCount = countWorkingDays(startDate, endDate);
      if (workingDaysCount === 0) {
        errors.push('Il periodo selezionato non include giorni lavorativi validi per le ferie.');
      }
    }
    
    if (type === 'permesso' && !isWorkingDay(startDate)) {
      errors.push('I permessi possono essere richiesti solo per giorni lavorativi.');
    }
    
    return errors;
  };

  // Funzione per disabilitare giorni nel calendario
  const isDateDisabled = (date: Date, type: string): boolean => {
    return !isWorkingDay(date);
  };

  const onSubmit = (data: LeaveRequestFormData) => {
    if (!profile?.id) return;
    
    setShowValidationErrors(false);
    
    // Validazione aggiuntiva per giorni lavorativi
    let validationErrors: string[] = [];
    
    if (data.type === 'ferie' && data.date_from && data.date_to) {
      validationErrors = validateWorkingDays(data.date_from, data.date_to, data.type);
    }
    
    if (data.type === 'permesso' && data.day) {
      validationErrors = validateWorkingDays(data.day, data.day, data.type);
    }
    
    if (validationErrors.length > 0) {
      setShowValidationErrors(true);
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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Nuova Richiesta</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Informazioni sui giorni lavorativi */}
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

        {/* Errori di validazione */}
        {showValidationErrors && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Correggi gli errori di validazione dei giorni lavorativi prima di procedere.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
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
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedType === 'ferie' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date_from"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data Inizio</FormLabel>
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
                              disabled={(date) => isDateDisabled(date, watchedType)}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date_to"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data Fine</FormLabel>
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
                              disabled={(date) => {
                                // Disabilita giorni non lavorativi E giorni precedenti alla data di inizio
                                if (isDateDisabled(date, watchedType)) return true;
                                if (watchedDateFrom && date < watchedDateFrom) return true;
                                return false;
                              }}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Preview conteggio giorni lavorativi per ferie */}
                <WorkingDaysPreview 
                  startDate={watchedDateFrom}
                  endDate={watchedDateTo}
                  leaveType="ferie"
                />
              </>
            )}

            {watchedType === 'permesso' && (
              <>
                <FormField
                  control={form.control}
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
                            disabled={(date) => isDateDisabled(date, watchedType)}
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
                    control={form.control}
                    name="time_from"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ora Inizio</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="time_to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ora Fine</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Validazione per permessi in giorni non lavorativi */}
                {watchedDay && !isWorkingDay(watchedDay) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Non puoi richiedere un permesso per un giorno non lavorativo.
                      Seleziona un giorno lavorativo: {workingDaysLabels.join(', ')}.
                    </AlertDescription>
                  </Alert>
                )}
              </>
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
              disabled={insertMutation.isPending}
            >
              {insertMutation.isPending ? 'Invio in corso...' : 'Invia Richiesta'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
