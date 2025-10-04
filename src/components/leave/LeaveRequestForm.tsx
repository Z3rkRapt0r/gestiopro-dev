import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useAuth } from "@/hooks/useAuth";
import { useWorkingHoursValidation } from "@/hooks/useWorkingHoursValidation";
import { useEmployeeLeaveBalanceValidation } from "@/hooks/useEmployeeLeaveBalanceValidation";
import { useWorkSchedules } from "@/hooks/useWorkSchedules";
import { useEmployeeWorkSchedule } from "@/hooks/useEmployeeWorkSchedule";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/hooks/use-toast";
import { LeaveRequestFormValidation } from "./LeaveRequestFormValidation";

interface LeaveRequestFormProps {
  onSuccess?: () => void;
}

export default function LeaveRequestForm({ onSuccess }: LeaveRequestFormProps) {
  const { user } = useAuth();
  const [leaveType, setLeaveType] = useState<"ferie" | "permesso">("permesso");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [singleDay, setSingleDay] = useState<Date>();
  const [timeFrom, setTimeFrom] = useState<string>("");
  const [timeTo, setTimeTo] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [permissionType, setPermissionType] = useState<'start_of_day' | 'mid_day'>('mid_day');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [workingHoursErrors, setWorkingHoursErrors] = useState<string[]>([]);
  const [balanceValidationError, setBalanceValidationError] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(true);
  const [formValidationMessage, setFormValidationMessage] = useState('');

  const { insertMutation } = useLeaveRequests();
  const { validatePermissionTime, validateEmployeePermissionTime, workSchedule } = useWorkingHoursValidation(user?.id);
  const {
    leaveBalance,
    validateLeaveRequest,
    formatDecimalHours
  } = useEmployeeLeaveBalanceValidation(user?.id);
  const { workSchedule: companyWorkSchedule } = useWorkSchedules();
  const { workSchedule: employeeWorkSchedule } = useEmployeeWorkSchedule(user?.id);

  // Funzioni helper per calcolare orari
  const getWorkStartTime = () => {
    return workSchedule?.start_time || '08:00';
  };

  const getWorkEndTime = () => {
    return workSchedule?.end_time || '17:00';
  };

  // Gestione validazione form generale
  const handleValidationChange = (isValid: boolean, message?: string) => {
    setIsFormValid(isValid);
    setFormValidationMessage(message || '');
  };

  // Validazione orari di lavoro per permessi - usa la nuova funzione specifica
  const validateWorkingHours = (date: Date, timeFrom: string, timeTo: string) => {
    if (!date || !timeFrom || !timeTo) {
      setWorkingHoursErrors([]);
      return;
    }

    const validation = validateEmployeePermissionTime(date, timeFrom, timeTo, user?.id);
    setWorkingHoursErrors(validation.errors);
  };

  // Validazione bilancio ferie/permessi
  const validateBalance = () => {
    if (!user?.id) return;

    if (leaveType === 'ferie' && startDate && endDate) {
      const validation = validateLeaveRequest('ferie', startDate, endDate);
      setBalanceValidationError(validation.errorMessage || null);
    } else if (leaveType === 'permesso' && singleDay && timeFrom && timeTo) {
      const validation = validateLeaveRequest('permesso', null, null, singleDay, timeFrom, timeTo);
      setBalanceValidationError(validation.errorMessage || null);
    } else {
      setBalanceValidationError(null);
    }
  };

  // Effect per validazione orari quando cambiano i valori
  useEffect(() => {
    if (leaveType === 'permesso' && singleDay && timeFrom && timeTo) {
      validateWorkingHours(singleDay, timeFrom, timeTo);
    } else {
      setWorkingHoursErrors([]);
    }
  }, [singleDay, timeFrom, timeTo, leaveType, validateEmployeePermissionTime, user?.id]);

  // Effect per validazione bilancio
  useEffect(() => {
    validateBalance();
  }, [leaveType, startDate, endDate, singleDay, timeFrom, timeTo, validateLeaveRequest]);

  // Reset campi quando cambia il tipo
  const handleLeaveTypeChange = (type: "ferie" | "permesso") => {
    setLeaveType(type);
    setStartDate(undefined);
    setEndDate(undefined);
    setSingleDay(undefined);
    setTimeFrom("");
    setTimeTo("");
    setValidationError(null);
    setWorkingHoursErrors([]);
    setBalanceValidationError(null);
  };

  // Calcolo automatico orari per permessi
  const handlePermissionTypeChange = (type: 'start_of_day' | 'mid_day') => {
    setPermissionType(type);
    const workStart = getWorkStartTime();
    
    if (type === 'start_of_day') {
      setTimeFrom(workStart);
      const startTime = new Date(`1970-01-01T${workStart}:00`);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // +30 minuti
      setTimeTo(endTime.toTimeString().slice(0, 5));
    } else {
      // mid_day - lascia libera scelta
      setTimeFrom("");
      setTimeTo("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast({
        title: "Errore",
        description: "Utente non identificato",
        variant: "destructive",
      });
      return;
    }

    // Controlli di validazione
    if (!isFormValid) {
      toast({
        title: "Errore di validazione",
        description: formValidationMessage,
        variant: "destructive",
      });
      return;
    }

    if (workingHoursErrors.length > 0) {
      toast({
        title: "Errore negli orari",
        description: workingHoursErrors.join('; '),
        variant: "destructive",
      });
      return;
    }

    if (balanceValidationError) {
      toast({
        title: "Errore nel bilancio",
        description: balanceValidationError,
        variant: "destructive",
      });
      return;
    }

    // Controlli specifici per i permessi
    if (leaveType === 'permesso') {
      if (!singleDay || !timeFrom || !timeTo) {
        toast({
          title: "Campi mancanti",
          description: "Seleziona data e orari per il permesso",
          variant: "destructive",
        });
        return;
      }

      // CONTROLLO PRINCIPALE: orario fine > orario inizio
      if (timeFrom >= timeTo) {
        toast({
          title: "Errore negli orari",
          description: "L'orario di fine deve essere successivo all'orario di inizio",
          variant: "destructive",
        });
        return;
      }

      // CONTROLLO: orari entro limiti lavorativi
      const workStart = getWorkStartTime();
      const workEnd = getWorkEndTime();
      
      if (timeFrom < workStart) {
        toast({
          title: "Errore orario inizio",
          description: `L'orario di inizio (${timeFrom}) deve essere dopo l'inizio dell'orario di lavoro (${workStart})`,
          variant: "destructive",
        });
        return;
      }

      if (timeTo > workEnd) {
        toast({
          title: "Errore orario fine",
          description: `L'orario di fine (${timeTo}) deve essere prima della fine dell'orario di lavoro (${workEnd})`,
          variant: "destructive",
        });
        return;
      }
    }

    // Controlli per le ferie
    if (leaveType === 'ferie') {
      if (!startDate || !endDate) {
        toast({
          title: "Campi mancanti",
          description: "Seleziona le date per le ferie",
          variant: "destructive",
        });
        return;
      }

      if (startDate > endDate) {
        toast({
          title: "Errore nelle date",
          description: "La data di fine deve essere successiva alla data di inizio",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const payload: any = {
        user_id: user.id,
        type: leaveType,
        note: note || null,
        status: 'pending'
      };

      if (leaveType === 'permesso') {
        payload.day = format(singleDay!, 'yyyy-MM-dd');
        payload.time_from = timeFrom;
        payload.time_to = timeTo;
      } else {
        payload.date_from = format(startDate!, 'yyyy-MM-dd');
        payload.date_to = format(endDate!, 'yyyy-MM-dd');
      }

      await insertMutation.mutateAsync(payload);
      
      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setSingleDay(undefined);
      setTimeFrom("");
      setTimeTo("");
      setNote("");
      setValidationError(null);
      setWorkingHoursErrors([]);
      setBalanceValidationError(null);

      onSuccess?.();
    } catch (error) {
      console.error('Error submitting leave request:', error);
    }
  };

  const isSubmitDisabled = 
    !isFormValid || 
    workingHoursErrors.length > 0 || 
    !!balanceValidationError ||
    (leaveType === 'permesso' && (!singleDay || !timeFrom || !timeTo)) ||
    (leaveType === 'ferie' && (!startDate || !endDate));

  return (
    <LeaveRequestFormValidation
      leaveType={leaveType}
      startDate={startDate ? format(startDate, 'yyyy-MM-dd') : undefined}
      endDate={endDate ? format(endDate, 'yyyy-MM-dd') : undefined}
      singleDay={singleDay ? format(singleDay, 'yyyy-MM-dd') : undefined}
      onValidationChange={handleValidationChange}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Nuova Richiesta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo di richiesta */}
            <div className="space-y-2">
              <Label htmlFor="leaveType">Tipo di Richiesta *</Label>
              <Select value={leaveType} onValueChange={handleLeaveTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permesso">Permesso</SelectItem>
                  <SelectItem value="ferie">Ferie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bilancio disponibile */}
            {leaveBalance && (
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-green-800">
                  <strong>Bilancio disponibile:</strong>
                  <div className="mt-1">
                    Ferie: {leaveBalance.vacation_days_total - leaveBalance.vacation_days_used} giorni rimanenti
                  </div>
                  <div>
                    Permessi: {formatDecimalHours(leaveBalance.permission_hours_total - leaveBalance.permission_hours_used)} ore rimanenti
                  </div>
                </div>
              </div>
            )}

            {/* Campi per permesso */}
            {leaveType === 'permesso' && (
              <>
                <div className="space-y-2">
                  <Label>Data del Permesso *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {singleDay ? format(singleDay, 'dd/MM/yyyy', { locale: it }) : "Seleziona data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={singleDay}
                        onSelect={setSingleDay}
                        disabled={(date) => date < new Date() || date < new Date(Date.now() - 86400000)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Tipo di permesso */}
                <div className="space-y-2">
                  <Label>Tipo di Permesso</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="mid_day"
                        name="permissionType"
                        value="mid_day"
                        checked={permissionType === 'mid_day'}
                        onChange={(e) => handlePermissionTypeChange(e.target.value as 'start_of_day' | 'mid_day')}
                        className="w-4 h-4"
                      />
                      <label htmlFor="mid_day" className="text-sm">
                        Permesso all'interno del Turno
                        <div className="text-xs text-gray-500">
                          Deve essere maggiore di {getWorkStartTime()} e minore di {getWorkEndTime()}
                        </div>
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="start_of_day"
                        name="permissionType"
                        value="start_of_day"
                        checked={permissionType === 'start_of_day'}
                        onChange={(e) => handlePermissionTypeChange(e.target.value as 'start_of_day' | 'mid_day')}
                        className="w-4 h-4"
                      />
                      <label htmlFor="start_of_day" className="text-sm">
                        Permesso Inizio Turno
                        <div className="text-xs text-gray-500">
                          Permesso dall'inizio del turno alle {getWorkStartTime()}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Orari */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeFrom">Ora Inizio *</Label>
                    <Input
                      id="timeFrom"
                      type="time"
                      value={timeFrom}
                      onChange={(e) => setTimeFrom(e.target.value)}
                      min={getWorkStartTime()}
                      max={getWorkEndTime()}
                    />
                    <div className="text-xs text-gray-500">
                      Minimo: {getWorkStartTime()} (per permessi all'interno del turno)
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeTo">Ora Fine *</Label>
                    <Input
                      id="timeTo"
                      type="time"
                      value={timeTo}
                      onChange={(e) => setTimeTo(e.target.value)}
                      min={timeFrom || getWorkStartTime()}
                      max={getWorkEndTime()}
                    />
                    <div className="text-xs text-gray-500">
                      Massimo: {getWorkEndTime()}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Campi per ferie */}
            {leaveType === 'ferie' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Inizio *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'dd/MM/yyyy', { locale: it }) : "Seleziona data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        disabled={(date) => date < new Date() || date < new Date(Date.now() - 86400000)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Data Fine *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'dd/MM/yyyy', { locale: it }) : "Seleziona data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => date < new Date() || date < new Date(Date.now() - 86400000) || (startDate && date < startDate)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Note opzionali</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Aggiungi dettagli sulla tua richiesta..."
                rows={3}
              />
            </div>

            {/* Alert errori validazione */}
            {!isFormValid && formValidationMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formValidationMessage}</AlertDescription>
              </Alert>
            )}

            {workingHoursErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {workingHoursErrors.join('; ')}
                </AlertDescription>
              </Alert>
            )}

            {balanceValidationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{balanceValidationError}</AlertDescription>
              </Alert>
            )}

            {/* Info limite permessi */}
            {leaveType === 'permesso' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Limite massimo:</strong> 4 ore per permesso
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitDisabled || insertMutation.isPending}
            >
              {insertMutation.isPending ? "Invio in corso..." : "Invia Richiesta"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </LeaveRequestFormValidation>
  );
}