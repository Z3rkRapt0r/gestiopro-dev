import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useWorkingDaysValidation } from '@/hooks/useWorkingDaysValidation';
import { useLeaveBalanceValidation } from '@/hooks/useLeaveBalanceValidation';
import { useEmployeeLeaveBalanceStats } from '@/hooks/useEmployeeLeaveBalanceStats';
import { useEmployeeStatus } from '@/hooks/useEmployeeStatus';
import { useAuth } from '@/hooks/useAuth';
import { useLeaveConflicts } from '@/hooks/useLeaveConflicts';
import { useLeaveRequestNotifications } from '@/hooks/useLeaveRequestNotifications';
import WorkingDaysPreview from './WorkingDaysPreview';
import { LeaveRequestFormValidation } from './LeaveRequestFormValidation';
const leaveRequestSchema = z.object({
  type: z.enum(['ferie', 'permesso']),
  date_from: z.date().optional(),
  date_to: z.date().optional(),
  day: z.date().optional(),
  time_from: z.string().optional(),
  time_to: z.string().optional(),
  note: z.string().optional()
}).refine(data => {
  if (data.type === 'permesso' && data.day) {
    return data.time_from && data.time_to;
  }
  if (data.type === 'ferie') {
    return data.date_from && data.date_to;
  }
  return true;
}, {
  message: "Compila tutti i campi obbligatori per il tipo di richiesta selezionato"
});
type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;
interface LeaveRequestFormProps {
  onSuccess?: () => void;
}
export default function LeaveRequestForm({
  onSuccess
}: LeaveRequestFormProps) {
  const {
    profile
  } = useAuth();
  const {
    insertMutation
  } = useLeaveRequests();
  const {
    isWorkingDay,
    countWorkingDays,
    getWorkingDaysLabels
  } = useWorkingDaysValidation();
  const {
    validateLeaveRequest,
    balanceValidation
  } = useLeaveBalanceValidation();
  const {
    leaveBalance,
    isLoading: isLoadingBalance
  } = useEmployeeLeaveBalanceStats();
  const {
    notifyAdmin
  } = useLeaveRequestNotifications();
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [balanceValidationErrors, setBalanceValidationErrors] = useState<string[]>([]);
  const [formValidationState, setFormValidationState] = useState({
    isValid: true,
    message: ''
  });
  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      type: 'ferie'
    }
  });
  const watchedType = form.watch('type');
  const watchedDateFrom = form.watch('date_from');
  const watchedDateTo = form.watch('date_to');
  const watchedDay = form.watch('day');
  const watchedTimeFrom = form.watch('time_from');
  const watchedTimeTo = form.watch('time_to');

  // Hook per gestire i conflitti con calcolo preventivo
  const {
    isLoading: isCalculatingConflicts,
    isDateDisabled
  } = useLeaveConflicts(profile?.id, watchedType);

  // Controllo status dipendente per la data selezionata
  const targetDate = watchedType === 'ferie' ? watchedDateFrom ? format(watchedDateFrom, 'yyyy-MM-dd') : undefined : watchedType === 'permesso' ? watchedDay ? format(watchedDay, 'yyyy-MM-dd') : undefined : undefined;
  const {
    employeeStatus
  } = useEmployeeStatus(profile?.id, targetDate);

  // CONTROLLO BILANCIO: se non c'è bilancio configurato, blocca tutto
  const hasNoBalance = !isLoadingBalance && !leaveBalance;

  // VALIDAZIONE SALDO MIGLIORATA - Real-time e rigorosa
  useEffect(() => {
    // Se non c'è bilancio, mostra errore
    if (hasNoBalance) {
      setBalanceValidationErrors(['❌ Nessun bilancio configurato per l\'anno corrente. Contatta l\'amministratore.']);
      return;
    }
    const timeoutId = setTimeout(() => {
      if (watchedType && (watchedType === 'ferie' && watchedDateFrom && watchedDateTo || watchedType === 'permesso' && watchedDay && watchedTimeFrom && watchedTimeTo)) {
        const validation = validateLeaveRequest(watchedType, watchedDateFrom, watchedDateTo, watchedDay, watchedTimeFrom, watchedTimeTo);
        console.log('Validazione saldo:', validation);

        // CONTROLLO RIGOROSO: blocca sempre se insufficiente
        if (!validation.hasBalance) {
          setBalanceValidationErrors(['❌ Nessun bilancio configurato per l\'anno corrente']);
        } else if (validation.exceedsVacationLimit) {
          setBalanceValidationErrors([validation.errorMessage || '❌ Giorni di ferie insufficienti']);
        } else if (validation.exceedsPermissionLimit) {
          setBalanceValidationErrors([validation.errorMessage || '❌ Ore di permesso insufficienti']);
        } else {
          setBalanceValidationErrors([]);
        }
      } else {
        setBalanceValidationErrors([]);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [watchedType, watchedDateFrom, watchedDateTo, watchedDay, watchedTimeFrom, watchedTimeTo, validateLeaveRequest, hasNoBalance]);
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

  // FUNZIONE MIGLIORATA PER BLOCCARE DATE PASSATE
  const isDateDisabledWithPastCheck = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // BLOCCA DATE PASSATE (permette solo oggi e futuro)
    if (checkDate < today) {
      return true;
    }

    // Applica altri controlli (conflitti, festivi, ecc.)
    return isDateDisabled(date);
  };
  const onSubmit = async (data: LeaveRequestFormData) => {
    if (!profile?.id) return;
    console.log('Inizio invio richiesta:', data);
    setShowValidationErrors(false);

    // CONTROLLO FINALE: se non c'è bilancio, blocca completamente
    if (hasNoBalance) {
      console.log('Invio bloccato: nessun bilancio configurato');
      setShowValidationErrors(true);
      return;
    }

    // CONTROLLO FINALE SALDO PRIMA DELL'INVIO
    if (balanceValidationErrors.length > 0) {
      console.log('Invio bloccato per saldo insufficiente:', balanceValidationErrors);
      setShowValidationErrors(true);
      return;
    }
    if (!formValidationState.isValid) {
      setShowValidationErrors(true);
      return;
    }
    let validationErrors: string[] = [];
    if (data.type === 'ferie' && data.date_from && data.date_to) {
      validationErrors = validateWorkingDays(data.date_from, data.date_to, data.type);
      if (data.date_to < data.date_from) {
        validationErrors.push('La data di fine non può essere precedente alla data di inizio.');
      }
    }
    if (data.type === 'permesso' && data.day) {
      validationErrors = validateWorkingDays(data.day, data.day, data.type);
    }
    if (validationErrors.length > 0) {
      setShowValidationErrors(true);
      return;
    }
    if (employeeStatus && employeeStatus.hasHardBlock) {
      setShowValidationErrors(true);
      return;
    }
    const payload = {
      ...data,
      user_id: profile.id,
      date_from: data.date_from ? format(data.date_from, 'yyyy-MM-dd') : undefined,
      date_to: data.date_to ? format(data.date_to, 'yyyy-MM-dd') : undefined,
      day: data.day ? format(data.day, 'yyyy-MM-dd') : undefined
    };
    console.log('Payload richiesta:', payload);
    insertMutation.mutate(payload, {
      onSuccess: async newRequest => {
        console.log('Richiesta creata con successo:', newRequest);

        // INVIO NOTIFICA ALL'AMMINISTRATORE
        try {
          const employeeName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Dipendente';
          let details = '';
          if (data.type === 'ferie') {
            details = `Dal: ${format(data.date_from!, 'dd/MM/yyyy')}\nAl: ${format(data.date_to!, 'dd/MM/yyyy')}`;
          } else {
            details = `Giorno: ${format(data.day!, 'dd/MM/yyyy')}\nOrario: ${data.time_from} - ${data.time_to}`;
          }
          if (data.note) {
            details += `\n\nNote del dipendente:\n${data.note}`;
          }
          console.log('Invio notifica admin con dettagli:', {
            employeeName,
            type: data.type,
            details
          });
          const notificationResult = await notifyAdmin({
            requestId: newRequest.id,
            employeeName,
            type: data.type,
            details,
            employeeId: profile.id
          });
          if (notificationResult.success) {
            console.log('Notifica admin inviata con successo');
          } else {
            console.error('Errore invio notifica admin:', notificationResult.error);
          }
        } catch (error) {
          console.error('Errore durante invio notifica:', error);
        }
        form.reset();
        if (onSuccess) onSuccess();
      },
      onError: error => {
        console.error('Errore creazione richiesta:', error);
      }
    });
  };
  const workingDaysLabels = getWorkingDaysLabels();
  const validationStartDate = watchedType === 'ferie' ? watchedDateFrom ? format(watchedDateFrom, 'yyyy-MM-dd') : undefined : watchedType === 'permesso' ? watchedDay ? format(watchedDay, 'yyyy-MM-dd') : undefined : undefined;
  const validationEndDate = watchedType === 'ferie' ? watchedDateTo ? format(watchedDateTo, 'yyyy-MM-dd') : undefined : watchedType === 'permesso' ? watchedDay ? format(watchedDay, 'yyyy-MM-dd') : undefined : undefined;

  // CONTROLLO FINALE PER DISABILITARE PULSANTE - Include controllo bilancio mancante
  const isFormBlocked = hasNoBalance || !formValidationState.isValid || balanceValidationErrors.length > 0 || employeeStatus && employeeStatus.hasHardBlock;
  const isPendingRequest = !formValidationState.isValid && formValidationState.message.includes('richiesta in attesa');
  return <LeaveRequestFormValidation leaveType={watchedType} startDate={validationStartDate} endDate={validationEndDate} singleDay={watchedType === 'permesso' ? validationStartDate : undefined} onValidationChange={(isValid, message) => {
    setFormValidationState({
      isValid,
      message: message || ''
    });
  }}>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Nuova Richiesta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {/* ALERT CRITICO: Nessun bilancio configurato */}
          {hasNoBalance && <Alert variant="destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <AlertDescription>
                <div className="font-medium mb-2">🚫 Conteggio Ferie e Permessi </div>
                <div className="text-sm space-y-1">
                  
                  <p className="font-normal text-xs">Contatta l'amministratore per caricare il tuo bilancio prima di poter fare richieste.</p>
                </div>
              </AlertDescription>
            </Alert>}

          {/* Mostra bilanci solo se esistono */}
          {leaveBalance && leaveBalance.hasBalance && <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <AlertDescription className="text-blue-700">
                <div className="font-medium mb-2">Bilanci disponibili:</div>
                <div className="space-y-1 text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <span>• Ferie: <strong>{leaveBalance.vacation_days_remaining}</strong> giorni su {leaveBalance.vacation_days_total}</span>
                    <span>• Permessi: <strong>{leaveBalance.permission_hours_remaining}</strong> ore su {leaveBalance.permission_hours_total}</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>}

          {workingDaysLabels.length > 0 && <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <AlertDescription className="text-blue-700">
                <div className="font-medium mb-2">Giorni lavorativi configurati:</div>
                <div className="text-sm">
                  <div className="font-medium">{workingDaysLabels.join(', ')}</div>
                  <div className="mt-1 text-xs">Solo i giorni lavorativi verranno conteggiati per ferie e permessi.</div>
                </div>
              </AlertDescription>
            </Alert>}

          {isCalculatingConflicts && <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <AlertDescription className="text-blue-700">
                🔍 Verifica disponibilità date in corso...
              </AlertDescription>
            </Alert>}

          {showValidationErrors && <Alert variant="destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <AlertDescription>
                <div className="space-y-2">
                  {balanceValidationErrors.map((error, index) => <p key={index} className="text-sm font-medium">{error}</p>)}
                  {!formValidationState.isValid && formValidationState.message && <p className="text-sm">{formValidationState.message}</p>}
                  {employeeStatus && employeeStatus.hasHardBlock && <p className="text-sm">Non puoi fare richieste per questo periodo: {employeeStatus.blockingReasons.join(', ')}</p>}
                </div>
              </AlertDescription>
            </Alert>}

          {/* ALERT PER SALDO INSUFFICIENTE */}
          {balanceValidationErrors.length > 0}

          {employeeStatus && employeeStatus.hasHardBlock && <Alert variant="destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <AlertDescription>
                <div className="font-medium mb-2">Attenzione:</div>
                <div className="text-sm space-y-1">
                  <p>{employeeStatus.blockingReasons.join(', ')}</p>
                  {employeeStatus.statusDetails && <div className="text-xs">
                      <strong>Dettagli:</strong> {employeeStatus.statusDetails.type}
                      {employeeStatus.statusDetails.startDate && <span> dal {employeeStatus.statusDetails.startDate}</span>}
                      {employeeStatus.statusDetails.endDate && <span> al {employeeStatus.statusDetails.endDate}</span>}
                    </div>}
                </div>
              </AlertDescription>
            </Alert>}

          {employeeStatus && employeeStatus.currentStatus === 'permission' && !employeeStatus.hasHardBlock && <Alert className="border-orange-200 bg-orange-50">
              <Info className="h-4 w-4 text-orange-600 flex-shrink-0" />
              <AlertDescription className="text-orange-700">
                <div className="font-medium mb-2">Informazione:</div>
                <div className="text-sm space-y-1">
                  <p>{employeeStatus.blockingReasons.join(', ')}</p>
                  <p className="text-xs">I permessi possono sovrapporsi. La richiesta verrà valutata dall'amministratore.</p>
                </div>
              </AlertDescription>
            </Alert>}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              <FormField control={form.control} name="type" render={({
              field
            }) => <FormItem>
                    <FormLabel className="text-sm sm:text-base">Tipo di Richiesta</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 sm:h-10 text-base sm:text-sm">
                          <SelectValue placeholder="Seleziona il tipo di richiesta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ferie">Ferie</SelectItem>
                        <SelectItem value="permesso">Permesso</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />

              {watchedType === 'ferie' && <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <FormField control={form.control} name="date_from" render={({
                  field
                }) => <FormItem className="flex flex-col">
                          <FormLabel className="text-sm sm:text-base">Data Inizio</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className={cn("h-12 sm:h-10 pl-3 text-left font-normal text-base sm:text-sm justify-start", !field.value && "text-muted-foreground")}>
                                  {field.value ? format(field.value, "dd/MM/yyyy", {
                            locale: it
                          }) : <span>Seleziona data</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50 flex-shrink-0" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={isDateDisabledWithPastCheck} className="pointer-events-auto" />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>} />

                    <FormField control={form.control} name="date_to" render={({
                  field
                }) => <FormItem className="flex flex-col">
                          <FormLabel className="text-sm sm:text-base">Data Fine</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className={cn("h-12 sm:h-10 pl-3 text-left font-normal text-base sm:text-sm justify-start", !field.value && "text-muted-foreground")}>
                                  {field.value ? format(field.value, "dd/MM/yyyy", {
                            locale: it
                          }) : <span>Seleziona data</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50 flex-shrink-0" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={date => {
                        if (watchedDateFrom && date < watchedDateFrom) return true;
                        return isDateDisabledWithPastCheck(date);
                      }} className="pointer-events-auto" />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>} />
                  </div>

                  <WorkingDaysPreview startDate={watchedDateFrom} endDate={watchedDateTo} leaveType="ferie" />
                </>}

              {watchedType === 'permesso' && <>
                  <FormField control={form.control} name="day" render={({
                field
              }) => <FormItem className="flex flex-col">
                        <FormLabel className="text-sm sm:text-base">Data del Permesso</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("h-12 sm:h-10 pl-3 text-left font-normal text-base sm:text-sm justify-start", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "dd/MM/yyyy", {
                          locale: it
                        }) : <span>Seleziona data</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50 flex-shrink-0" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={isDateDisabledWithPastCheck} className="pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <FormField control={form.control} name="time_from" render={({
                  field
                }) => <FormItem>
                          <FormLabel className="text-sm sm:text-base">Ora Inizio</FormLabel>
                          <FormControl>
                            <Input type="time" value={field.value || ''} onChange={field.onChange} onBlur={field.onBlur} className="h-12 sm:h-10 text-base sm:text-sm" placeholder="HH:MM" step="300" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />

                    <FormField control={form.control} name="time_to" render={({
                  field
                }) => <FormItem>
                          <FormLabel className="text-sm sm:text-base">Ora Fine</FormLabel>
                          <FormControl>
                            <Input type="time" value={field.value || ''} onChange={field.onChange} onBlur={field.onBlur} className="h-12 sm:h-10 text-base sm:text-sm" placeholder="HH:MM" step="300" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>

                  {watchedDay && !isWorkingDay(watchedDay) && <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <AlertDescription>
                        <div className="text-sm">
                          <div className="font-medium mb-1">Giorno non lavorativo</div>
                          <div>Non puoi richiedere un permesso per un giorno non lavorativo.</div>
                          <div className="mt-1 text-xs">Giorni lavorativi: {workingDaysLabels.join(', ')}</div>
                        </div>
                      </AlertDescription>
                    </Alert>}
                </>}

              <FormField control={form.control} name="note" render={({
              field
            }) => <FormItem>
                    <FormLabel className="text-sm sm:text-base"></FormLabel>
                    <FormControl>
                      <Textarea placeholder="Aggiungi dettagli sulla tua richiesta..." className="min-h-[100px] sm:min-h-[80px] text-base sm:text-sm resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <Button type="submit" className="w-full h-12 sm:h-10 text-base sm:text-sm font-medium" disabled={insertMutation.isPending || isFormBlocked}>
                {insertMutation.isPending ? 'Invio in corso...' : isPendingRequest ? 'Richiesta in attesa di approvazione' : hasNoBalance ? 'Bilancio non configurato' : isFormBlocked ? balanceValidationErrors.length > 0 ? 'Saldo insufficiente' : 'Impossibile inviare' : 'Invia Richiesta'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </LeaveRequestFormValidation>;
}