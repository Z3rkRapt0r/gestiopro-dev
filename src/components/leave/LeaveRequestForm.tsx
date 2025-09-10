import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, AlertCircle, Info, Clock } from 'lucide-react';
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
import { useWorkingHoursValidation } from '@/hooks/useWorkingHoursValidation';
import { usePermissionValidation } from '@/hooks/usePermissionValidation';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useEmployeeWorkSchedule } from '@/hooks/useEmployeeWorkSchedule';
import { useQueryClient } from '@tanstack/react-query';
import WorkingDaysPreview from './WorkingDaysPreview';
import { LeaveRequestFormValidation } from './LeaveRequestFormValidation';
import { useCompanyHolidays } from '@/hooks/useCompanyHolidays';
const leaveRequestSchema = z.object({
  type: z.enum(['ferie', 'permesso']),
  date_from: z.date().optional(),
  date_to: z.date().optional(),
  day: z.date().optional(),
  time_from: z.string().optional(),
  time_to: z.string().optional(),
  note: z.string().optional()
}).refine(data => {
  if (data.type === 'permesso') {
    return data.day && data.time_from && data.time_to;
  }
  if (data.type === 'ferie') {
    return data.date_from && data.date_to;
  }
  return true;
}, {
  message: "Compila tutti i campi obbligatori per il tipo di richiesta selezionato"
}).refine(data => {
  if (data.type === 'permesso') {
    if (!data.day) return false;
    return true;
  }
  return true;
}, {
  message: "La Data del Permesso è obbligatoria",
  path: ["day"]
}).refine(data => {
  if (data.type === 'permesso') {
    if (!data.time_from) return false;
    return true;
  }
  return true;
}, {
  message: "L'Ora Inizio è obbligatoria",
  path: ["time_from"]
}).refine(data => {
  if (data.type === 'permesso') {
    if (!data.time_to) return false;
    return true;
  }
  return true;
}, {
  message: "L'Ora Fine è obbligatoria", 
  path: ["time_to"]
}).refine(data => {
  if (data.type === 'ferie') {
    return data.date_from && data.date_to;
  }
  return true;
}, {
  message: "Per le ferie sono obbligatori: Data Inizio e Data Fine",
  path: ["date_from", "date_to"]
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
  const queryClient = useQueryClient();
  const {
    insertMutation
  } = useLeaveRequests();
  const {
    isWorkingDay,
    countWorkingDays,
    getWorkingDaysLabels,
    scheduleInfo
  } = useWorkingDaysValidation(profile?.id);
  const {
    validateLeaveRequest,
    balanceValidation,
    formatDecimalHours
  } = useLeaveBalanceValidation();
  const {
    leaveBalance,
    isLoading: isLoadingBalance
  } = useEmployeeLeaveBalanceStats();
  const {
    notifyAdmin
  } = useLeaveRequestNotifications();
  const {
    validatePermissionTime
  } = useWorkingHoursValidation();
  const {
    validatePermissionHours,
    getMaxPermissionHoursForDisplay
  } = usePermissionValidation();
  const { workSchedule: companyWorkSchedule } = useWorkSchedules();
  const { workSchedule: employeeWorkSchedule } = useEmployeeWorkSchedule(profile?.id);
  const [permissionType, setPermissionType] = useState<'start_of_day' | 'mid_day'>('mid_day');
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [balanceValidationErrors, setBalanceValidationErrors] = useState<string[]>([]);
  const [workingHoursErrors, setWorkingHoursErrors] = useState<string[]>([]);
  const [permissionHoursErrors, setPermissionHoursErrors] = useState<string[]>([]);
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

  // Calcola l'orario di inizio turno dell'utente
  const getWorkStartTime = () => {
    const effectiveSchedule = employeeWorkSchedule || companyWorkSchedule;
    return effectiveSchedule?.start_time || '08:00:00';
  };

  // Calcola l'orario minimo per permesso in mezzo alla giornata (30 min dopo inizio turno)
  const getMinTimeForMidDay = () => {
    const startTime = getWorkStartTime();
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + 30; // +30 minuti
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  };

  // Controlla se è troppo tardi per richiedere un permesso inizio turno
  const isTooLateForStartOfDay = () => {
    if (!watchedDay) return false;
    
    const today = new Date();
    const selectedDate = new Date(watchedDay);
    
    // Solo per richieste dello stesso giorno
    if (selectedDate.toDateString() !== today.toDateString()) {
      return false;
    }
    
    const currentTime = new Date();
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    const workStartTime = getWorkStartTime();
    const [workHours, workMinutes] = workStartTime.split(':').map(Number);
    const workStartMinutes = workHours * 60 + workMinutes;
    
    // È troppo tardi se sono passati almeno 30 minuti dall'inizio del turno
    return currentMinutes >= (workStartMinutes + 30);
  };

  // Calcola quanto tempo è passato dall'inizio del turno
  const getTimeSinceWorkStart = () => {
    const currentTime = new Date();
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    const workStartTime = getWorkStartTime();
    const [workHours, workMinutes] = workStartTime.split(':').map(Number);
    const workStartMinutes = workHours * 60 + workMinutes;
    
    const diffMinutes = currentMinutes - workStartMinutes;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    } else {
      return `${minutes}min`;
    }
  };

  // Validazione personalizzata per i vincoli del permesso
  const validatePermissionConstraints = (timeFrom: string, timeTo: string): string[] => {
    const errors: string[] = [];
    
    if (!timeFrom || !timeTo) return errors;
    
    const workStartTime = getWorkStartTime();
    const minTimeForMidDay = getMinTimeForMidDay();
    
    if (permissionType === 'start_of_day') {
      // Permesso inizio turno: l'orario di inizio deve essere quello del turno
      if (timeFrom !== workStartTime.substring(0, 5)) {
        errors.push('Per Permessi Inizio Turno, l\'orario di inizio deve corrispondere all\'inizio del turno');
      }
    } else if (permissionType === 'mid_day') {
      // Permesso all'interno del turno: l'orario di inizio deve essere almeno 30 min dopo il turno
      const workStartTime = getWorkStartTime().substring(0, 5); // Rimuove secondi
      
      // Controllo 1: Non deve essere uguale all'orario di inizio turno
      if (timeFrom === workStartTime) {
        errors.push(`Per Permessi all'interno del Turno, l'orario di inizio non può essere uguale all'orario di inizio turno (${workStartTime})`);
      }
      
      // Controllo 2: Non deve essere inferiore all'orario di inizio turno
      if (timeFrom < workStartTime) {
        errors.push(`Per Permessi all'interno del Turno, l'orario di inizio non può essere precedente all'orario di inizio turno (${workStartTime})`);
      }
      
      // Controllo 3: Deve essere almeno 30 minuti dopo l'inizio turno
      if (timeFrom < minTimeForMidDay) {
        errors.push(`Per Permessi all'interno del Turno, l'orario di inizio deve essere almeno alle ${minTimeForMidDay} (30 minuti dopo l'inizio turno)`);
      }
    }
    
    return errors;
  };

  // Effetto per gestire automaticamente il tipo di permesso e l'orario
  useEffect(() => {
    if (watchedType === 'permesso') {
      const workStartTime = getWorkStartTime();
      
      if (permissionType === 'start_of_day') {
        // Permesso inizio giornata: blocca orario inizio al turno
        form.setValue('time_from', workStartTime.substring(0, 5)); // Rimuove i secondi
      } else if (permissionType === 'mid_day') {
        // Permesso mezzo giornata: resetta se l'orario è troppo presto
        const currentTimeFrom = form.getValues('time_from');
        const minTime = getMinTimeForMidDay();
        
        if (currentTimeFrom && currentTimeFrom < minTime) {
          form.setValue('time_from', minTime);
        }
      }
    }
  }, [watchedType, permissionType, employeeWorkSchedule, companyWorkSchedule]);

  // Effetto per controllare se è troppo tardi per permesso inizio turno
  useEffect(() => {
    if (watchedType === 'permesso' && watchedDay) {
      if (isTooLateForStartOfDay() && permissionType === 'start_of_day') {
        // Forza il cambio a permesso interno turno
        setPermissionType('mid_day');
      }
    }
  }, [watchedDay, watchedType, employeeWorkSchedule, companyWorkSchedule]);

  // Effetto per validare i vincoli del permesso in tempo reale
  useEffect(() => {
    if (watchedType === 'permesso') {
      // Prima pulisci solo gli errori di vincoli (mantieni errori ore massime)
      setPermissionHoursErrors(prev => 
        prev.filter(error => 
          !error.includes('orario di inizio deve essere') && 
          !error.includes('orario di inizio deve corrispondere') &&
          !error.includes('orario di inizio non può essere uguale') &&
          !error.includes('orario di inizio non può essere precedente')
        )
      );

      // Solo se TUTTI i campi obbligatori sono compilati, valida i vincoli
      if (watchedDay && watchedTimeFrom && watchedTimeTo) {
        const constraintErrors = validatePermissionConstraints(watchedTimeFrom, watchedTimeTo);
        
        if (constraintErrors.length > 0) {
          setPermissionHoursErrors(prev => [...prev, ...constraintErrors]);
        }
      }
    } else {
      // Se non è un permesso, pulisci tutti gli errori di permesso
      setPermissionHoursErrors([]);
    }
  }, [watchedDay, watchedTimeFrom, watchedTimeTo, permissionType, watchedType, employeeWorkSchedule, companyWorkSchedule]);

  // Effetto per pulire errori quando si cambia tipo di permesso
  useEffect(() => {
    // Pulisci solo gli errori di vincoli quando si cambia tipo di permesso (mantieni errori ore massime)
    setPermissionHoursErrors(prev => 
      prev.filter(error => 
        !error.includes('orario di inizio deve essere') && 
        !error.includes('orario di inizio deve corrispondere') &&
        !error.includes('orario di inizio non può essere uguale') &&
        !error.includes('orario di inizio non può essere precedente')
      )
    );
  }, [permissionType]);

  // Hook per gestire i conflitti con calcolo preventivo
  const {
    isLoading: isCalculatingConflicts,
    isDateDisabled,
    conflictDates,
    conflictDetails,
    conflictSummary
  } = useLeaveConflicts(profile?.id, watchedType);

  // Calcolo conflitti (senza log di debug)
  useEffect(() => {
    // I conflitti vengono calcolati automaticamente dall'hook useLeaveConflicts
  }, [conflictDates, conflictSummary, conflictDetails, isCalculatingConflicts]);

  // Hook per gestire le festività
  const { isHoliday, holidays, isLoading: isLoadingHolidays } = useCompanyHolidays();

  // Caricamento festività (senza log di debug)
  useEffect(() => {
    // Le festività vengono caricate automaticamente dall'hook useCompanyHolidays
  }, [holidays, isLoadingHolidays, isHoliday]);

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

  // VALIDAZIONE ORARI DI LAVORO - Real-time
  useEffect(() => {
    if (watchedType === 'permesso' && watchedDay && watchedTimeFrom && watchedTimeTo) {
      const timeoutId = setTimeout(() => {
        const hoursValidation = validatePermissionTime(watchedDay, watchedTimeFrom, watchedTimeTo);
        console.log('Validazione orari di lavoro:', hoursValidation);
        if (!hoursValidation.isValid) {
          setWorkingHoursErrors(hoursValidation.errors);
        } else {
          setWorkingHoursErrors([]);
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setWorkingHoursErrors([]);
    }
  }, [watchedType, watchedDay, watchedTimeFrom, watchedTimeTo, validatePermissionTime]);

  // VALIDAZIONE ORE MASSIME PERMESSI - Real-time con controllo loop
  useEffect(() => {
    if (watchedType === 'permesso' && watchedTimeFrom && watchedTimeTo) {
      // Calcola le ore richieste
      const fromTime = new Date(`2000-01-01T${watchedTimeFrom}:00`);
      const toTime = new Date(`2000-01-01T${watchedTimeTo}:00`);
      const diffMs = toTime.getTime() - fromTime.getTime();
      const requestedHours = diffMs / (1000 * 60 * 60);

      const validation = validatePermissionHours(requestedHours);
      const maxHoursError = validation.errorMessage || 'Ore richieste superiori al limite';
      
      setPermissionHoursErrors(prev => {
        // Filtra errori di ore massime esistenti
        const filteredErrors = prev.filter(error => 
          !error.includes('Ore richieste superiori al limite') &&
          !error.includes('superano il limite massimo') &&
          !error.includes('❌ Ore richieste') &&
          !error.includes('Il numero massimo di ore')
        );
        
        // Aggiungi errore solo se validation non è valida E l'errore non è già presente
        if (!validation.isValid && !prev.includes(maxHoursError)) {
          console.log('❌ [Permission Hours] Real-time validation failed:', validation);
          return [...filteredErrors, maxHoursError];
        } else if (validation.isValid) {
          console.log('✅ [Permission Hours] Real-time validation passed');
          return filteredErrors;
        }
        
        // Nessun cambiamento necessario
        return prev;
      });
    } else if (watchedType !== 'permesso') {
      // Se non è un permesso, pulisci tutti gli errori di permesso
      setPermissionHoursErrors([]);
    } else {
      // Se è un permesso ma mancano orari, rimuovi solo errori ore massime
      setPermissionHoursErrors(prev => 
        prev.filter(error => 
          !error.includes('Ore richieste superiori al limite') &&
          !error.includes('superano il limite massimo') &&
          !error.includes('❌ Ore richieste') &&
          !error.includes('Il numero massimo di ore')
        )
      );
    }
  }, [watchedType, watchedTimeFrom, watchedTimeTo]);
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

  // FUNZIONE MIGLIORATA PER BLOCCARE DATE PASSATE E FESTIVITÀ
  const isDateDisabledWithPastCheck = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // BLOCCA DATE PASSATE (permette solo oggi e futuro)
    if (checkDate < today) {
      return true;
    }

    // CONTROLLO DIRETTO FESTIVITÀ (backup per sicurezza)
    if (isHoliday && isHoliday(date)) {
      return true;
    }

    // TEST SPECIFICO PER FESTIVITÀ IMPORTANTI
    const dateStr = format(date, 'yyyy-MM-dd');
    const monthDay = format(date, 'MM-dd');
    
    // Test diretto per festività note
    const isKnownHoliday = holidays?.some(holiday => {
      if (holiday.is_recurring) {
        const holidayMonthDay = holiday.date.substr(5, 5);
        return holidayMonthDay === monthDay;
      } else {
        return holiday.date === dateStr;
      }
    });
    
    if (isKnownHoliday) {
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

    // CONTROLLO FINALE ORARI DI LAVORO
    if (workingHoursErrors.length > 0) {
      console.log('Invio bloccato per orari di lavoro non validi:', workingHoursErrors);
      setShowValidationErrors(true);
      return;
    }

    // CONTROLLO VINCOLI TIPO PERMESSO
    if (data.type === 'permesso' && data.time_from && data.time_to) {
      const constraintErrors = validatePermissionConstraints(data.time_from, data.time_to);
      if (constraintErrors.length > 0) {
        console.log('🚫 INVIO BLOCCATO: Vincoli tipo permesso non rispettati', constraintErrors);
        setPermissionHoursErrors(prev => [...prev, ...constraintErrors]);
        setShowValidationErrors(true);
        return;
      }
    }

    // CONTROLLO FINALE ORE MASSIME PERMESSI
    if (permissionHoursErrors.length > 0) {
      console.log('Invio bloccato per ore massime permessi superate:', permissionHoursErrors);
      setShowValidationErrors(true);
      return;
    }

    // Il controllo ore massime è già gestito in tempo reale nell'useEffect sopra
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
        
        // Salva la sezione attiva nel localStorage prima del reload
        localStorage.setItem('employee-active-section', 'leaves');
        
        // Ricarica la pagina - la sezione sarà ripristinata dal localStorage
        window.location.reload();
        
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

  // CONTROLLO FINALE PER DISABILITARE PULSANTE - Include controllo bilancio mancante, orari e ore massime
  const isFormBlocked = hasNoBalance || !formValidationState.isValid || balanceValidationErrors.length > 0 || workingHoursErrors.length > 0 || permissionHoursErrors.length > 0 || employeeStatus && employeeStatus.hasHardBlock;
  const isPendingRequest = !formValidationState.isValid && formValidationState.message.includes('richiesta in attesa');

  // Controllo di sicurezza: se il profilo non è caricato, mostra un messaggio chiaro
  if (!profile) {
    return <div className="p-8 text-center text-red-600">Impossibile caricare il profilo utente. Riprova o contatta l'amministratore.</div>;
  }
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
                <div className="font-medium mb-2">🚫 Conteggio Ferie e Permessi Non Configurato</div>
                <div className="text-sm space-y-1">
                  <p className="font-normal text-xs">Contatta l'amministratore per caricare il tuo bilancio prima di poter fare richieste.</p>
                </div>
              </AlertDescription>
            </Alert>}

          {/* Bilanci Disponibili - SEMPLIFICATO */}
          {leaveBalance && leaveBalance.hasBalance && (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-center">
              <div className="text-sm text-green-700">
                <span className="font-medium">Ferie:</span> {leaveBalance.vacation_days_remaining} | 
                <span className="font-medium"> Permessi:</span> {formatDecimalHours(leaveBalance.permission_hours_remaining)}
              </div>
            </div>
          )}

          {workingDaysLabels.length > 0}

          {isCalculatingConflicts && <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <AlertDescription className="text-blue-700">
                🔍 Verifica disponibilità date in corso...
              </AlertDescription>
            </Alert>}

          {showValidationErrors && (balanceValidationErrors.length > 0 || workingHoursErrors.length > 0 || (!formValidationState.isValid && formValidationState.message) || (employeeStatus && employeeStatus.hasHardBlock)) && <Alert variant="destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <AlertDescription>
                <div className="space-y-2">
                  {balanceValidationErrors.map((error, index) => <p key={index} className="text-sm font-medium">{error}</p>)}
                  {workingHoursErrors.map((error, index) => <p key={index} className="text-sm font-medium">{error}</p>)}
                  {!formValidationState.isValid && formValidationState.message && <p className="text-sm">{formValidationState.message}</p>}
                  {employeeStatus && employeeStatus.hasHardBlock && <p className="text-sm">Non puoi fare richieste per questo periodo: {employeeStatus.blockingReasons.join(', ')}</p>}
                </div>
              </AlertDescription>
            </Alert>}

          {/* ALERT PER SALDO INSUFFICIENTE */}
          {balanceValidationErrors.length > 0}

          {/* ALERT PER ORE MASSIME PERMESSI */}
          {permissionHoursErrors.length > 0 && (
            <Alert variant="destructive">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <AlertDescription>
                <div className="space-y-2">
                  {permissionHoursErrors.map((error, index) => (
                    <p key={index} className="text-sm font-medium">{error}</p>
                  ))}
                  <p className="text-xs text-gray-600">
                    Limite massimo impostato dall'amministratore: {getMaxPermissionHoursForDisplay()} ore
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

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
                    <FormLabel className="text-sm sm:text-base">Tipo di Richiesta *</FormLabel>
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
                          <FormLabel className="text-sm sm:text-base">Data Inizio *</FormLabel>
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
                          <FormLabel className="text-sm sm:text-base">Data Fine *</FormLabel>
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
                              <Calendar 
                                mode="single" 
                                selected={field.value} 
                                onSelect={field.onChange} 
                                month={watchedDateFrom || undefined}
                                disabled={date => {
                                  if (watchedDateFrom && date < watchedDateFrom) return true;
                                  return isDateDisabledWithPastCheck(date);
                                }} 
                                className="pointer-events-auto" 
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>} />
                  </div>

                  <WorkingDaysPreview startDate={watchedDateFrom} endDate={watchedDateTo} leaveType="ferie" employeeId={profile?.id} />
                </>}

              {watchedType === 'permesso' && <>
                  <FormField control={form.control} name="day" render={({
                field
              }) => <FormItem className="flex flex-col">
                        <FormLabel className="text-sm sm:text-base">Data del Permesso *</FormLabel>
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

                  {/* Selezione tipo di permesso - Design migliorato */}
                  <Card className="border-2 border-blue-100 bg-blue-50/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Che tipo di permesso vuoi chiedere?
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Permesso inizio giornata */}
                        <div 
                          className={cn(
                            "p-4 rounded-lg border-2 transition-all duration-200",
                            isTooLateForStartOfDay() 
                              ? "border-red-200 bg-red-50 cursor-not-allowed opacity-60" 
                              : permissionType === 'start_of_day' 
                                ? "border-blue-500 bg-blue-100 shadow-md cursor-pointer" 
                                : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
                          )}
                          onClick={() => {
                            if (!isTooLateForStartOfDay()) {
                              setPermissionType('start_of_day');
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center",
                              permissionType === 'start_of_day' ? "border-blue-500 bg-blue-500" : "border-gray-300"
                            )}>
                              {permissionType === 'start_of_day' && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className={cn(
                                "font-medium text-sm",
                                isTooLateForStartOfDay() ? "text-red-600" : ""
                              )}>
                                Permesso Inizio Turno
                                {isTooLateForStartOfDay() && (
                                  <span className="text-xs font-normal text-red-500 ml-2">(Non disponibile)</span>
                                )}
                              </h4>
                              {isTooLateForStartOfDay() ? (
                                <>
                                  <p className="text-xs text-red-600 mt-1">
                                    ⚠️ Troppo tardi! Sono passati {getTimeSinceWorkStart()}
                                  </p>
                                  <p className="text-xs text-red-500 mt-1">
                                    Puoi richiedere solo permessi interni
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-xs text-gray-600 mt-1">
                                    Orario inizio: <strong>{getWorkStartTime().substring(0, 5)}</strong> (bloccato)
                                  </p>
                                  <p className="text-xs text-blue-600 mt-1">
                                    Scegli solo l'orario di fine
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Permesso mezzo giornata */}
                        <div 
                          className={cn(
                            "p-4 rounded-lg border-2 cursor-pointer transition-all duration-200",
                            permissionType === 'mid_day' 
                              ? "border-green-500 bg-green-100 shadow-md" 
                              : "border-gray-200 bg-white hover:border-green-300 hover:bg-green-50"
                          )}
                          onClick={() => setPermissionType('mid_day')}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center",
                              permissionType === 'mid_day' ? "border-green-500 bg-green-500" : "border-gray-300"
                            )}>
                              {permissionType === 'mid_day' && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">Permesso all'interno del Turno</h4>
                              <p className="text-xs text-gray-600 mt-1">
                                Deve essere <strong>maggiore</strong> di {getWorkStartTime().substring(0, 5)}
                              </p>
                              <p className="text-xs text-green-600 mt-1">
                                Minimo: <strong>{getMinTimeForMidDay()}</strong> (+30 min)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Alert per permesso troppo tardi - Nascosto su mobile */}
                      {isTooLateForStartOfDay() && (
                        <Alert variant="destructive" className="border-red-300 bg-red-50 hidden sm:block">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-red-700">
                            <strong>⏰ Permesso Inizio Turno non disponibile</strong><br />
                            Sono già passati {getTimeSinceWorkStart()} dall'inizio del tuo turno ({getWorkStartTime().substring(0, 5)}). 
                            Per richieste dello stesso giorno dopo 30 minuti dall'inizio turno, puoi richiedere solo <strong>Permessi all'interno del Turno</strong>.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Info dinamica */}
                      {!isTooLateForStartOfDay() && (
                        <Alert className={permissionType === 'start_of_day' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}>
                          <Info className="h-4 w-4" />
                          <AlertDescription className={permissionType === 'start_of_day' ? 'text-blue-700' : 'text-green-700'}>
                            {permissionType === 'start_of_day' ? (
                              <>
                                <strong>Permesso Inizio Turno:</strong> L'orario di inizio è automaticamente impostato alle {getWorkStartTime().substring(0, 5)} (inizio del tuo turno)
                              </>
                            ) : (
                              <>
                                <strong>Permesso all'interno del Turno:</strong> L'orario di inizio deve essere maggiore di {getWorkStartTime().substring(0, 5)} e almeno alle {getMinTimeForMidDay()} (30 minuti dopo l'inizio del turno)
                              </>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Alert per permesso interno quando è troppo tardi - Nascosto su mobile */}
                      {isTooLateForStartOfDay() && permissionType === 'mid_day' && (
                        <Alert className="border-green-200 bg-green-50 hidden sm:block">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-green-700">
                            <strong>✅ Permesso all'interno del Turno disponibile</strong><br />
                            Puoi richiedere un permesso con orario di inizio dalle {getMinTimeForMidDay()} in poi.
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <FormField control={form.control} name="time_from" render={({
                  field
                }) => <FormItem>
                          <FormLabel className="text-sm sm:text-base">
                            Ora Inizio *
                            {permissionType === 'start_of_day' && (
                              <span className="text-xs text-blue-600 ml-2">(Bloccato all'inizio turno)</span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              value={field.value || ''} 
                              onChange={field.onChange} 
                              onBlur={field.onBlur} 
                              className="h-12 sm:h-10 text-base sm:text-sm" 
                              placeholder="HH:MM" 
                              step="300"
                              disabled={permissionType === 'start_of_day'}
                              min={permissionType === 'mid_day' ? getMinTimeForMidDay() : undefined}
                            />
                          </FormControl>
                          {permissionType === 'mid_day' && (
                            <div className="text-xs text-gray-500">
                              Minimo: {getMinTimeForMidDay()} (per permessi all'interno del turno)
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>} />

                    <FormField control={form.control} name="time_to" render={({
                  field
                }) => <FormItem>
                          <FormLabel className="text-sm sm:text-base">Ora Fine *</FormLabel>
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
                          <div className="mt-1 text-xs">
                            Giorni lavorativi ({scheduleInfo.type}): {getWorkingDaysLabels().join(', ')}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>}

                  {/* Informazione limite ore massime */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-700">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Limite massimo: {getMaxPermissionHoursForDisplay()} ore per permesso
                      </span>
                    </div>
                  </div>
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
                {insertMutation.isPending ? 'Invio in corso...' : 
                 isPendingRequest ? 'Richiesta in attesa di approvazione' : 
                 hasNoBalance ? 'Bilancio non configurato' : 
                 isFormBlocked ? 
                   (balanceValidationErrors.length > 0 ? 'Saldo insufficiente' : 
                    workingHoursErrors.length > 0 ? 'Orari non validi' :
                    permissionHoursErrors.length > 0 ? 'Ore superiori al limite' :
                    'Impossibile inviare') : 
                 'Invia Richiesta'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </LeaveRequestFormValidation>;
}