import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, User, AlertCircle, Info, Mail, Settings } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useLeaveConflicts } from "@/hooks/useLeaveConflicts";
import { useLeaveRequestNotifications } from "@/hooks/useLeaveRequestNotifications";
import { useWorkingHoursValidation } from "@/hooks/useWorkingHoursValidation";
import { useEmployeeLeaveBalanceValidation } from "@/hooks/useEmployeeLeaveBalanceValidation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/hooks/use-toast";
interface ManualLeaveEntryFormProps {
  onSuccess?: () => void;
}
export function ManualLeaveEntryForm({
  onSuccess
}: ManualLeaveEntryFormProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [leaveType, setLeaveType] = useState<"ferie" | "permesso">("ferie");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [timeFrom, setTimeFrom] = useState<string>("");
  const [timeTo, setTimeTo] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [notifyEmployee, setNotifyEmployee] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [workingHoursErrors, setWorkingHoursErrors] = useState<string[]>([]);
  const [balanceValidationError, setBalanceValidationError] = useState<string | null>(null);
  const {
    employees
  } = useActiveEmployees();
  const {
    insertMutation
  } = useLeaveRequests();
  const {
    sendLeaveRequestNotification
  } = useLeaveRequestNotifications();
  const {
    validatePermissionTime,
    getWorkingHoursInfo
  } = useWorkingHoursValidation();
  const {
    leaveBalance,
    validateLeaveRequest,
    formatDecimalHours
  } = useEmployeeLeaveBalanceValidation(selectedUserId);
  const {
    isLoading: isCalculatingConflicts,
    isDateDisabled,
    validateVacationDates,
    validatePermissionDate
  } = useLeaveConflicts(selectedUserId, leaveType);
  const workingHoursInfo = getWorkingHoursInfo();

  // Valida bilanci quando cambia dipendente, tipo o date
  useEffect(() => {
    if (selectedUserId) {
      const validation = validateLeaveRequest(leaveType, startDate, endDate, startDate,
      // day for permissions
      timeFrom, timeTo);
      // Non mostrare l'errore di orario mancante in tempo reale, solo al submit
      if (!validation.hasBalance || validation.exceedsVacationLimit || (validation.exceedsPermissionLimit && validation.errorMessage !== "Inserisci almeno un orario di inizio o fine per il permesso")) {
        setBalanceValidationError(validation.errorMessage || "Errore validazione bilanci");
      } else {
        setBalanceValidationError(null);
      }
    } else {
      setBalanceValidationError(null);
    }
  }, [selectedUserId, leaveType, startDate, endDate, timeFrom, timeTo, validateLeaveRequest]);
  const validateDatesAgainstHireDate = (startDate?: Date, endDate?: Date, employeeId?: string) => {
    if (!startDate || !employeeId) return true;
    const employee = employees?.find(emp => emp.id === employeeId);
    if (!employee || !employee.hire_date) return true;
    const hireDateObj = new Date(employee.hire_date);
    if (startDate < hireDateObj) {
      setValidationError(`⚠️ Impossibile salvare l'evento: la data di inizio (${format(startDate, 'dd/MM/yyyy')}) è antecedente alla data di assunzione del dipendente (${format(hireDateObj, 'dd/MM/yyyy')}).`);
      return false;
    }
    if (endDate && endDate < hireDateObj) {
      setValidationError(`⚠️ Impossibile salvare l'evento: la data di fine (${format(endDate, 'dd/MM/yyyy')}) è antecedente alla data di assunzione del dipendente (${format(hireDateObj, 'dd/MM/yyyy')}).`);
      return false;
    }
    setValidationError(null);
    return true;
  };
  const validateConflicts = async (startDate?: Date, endDate?: Date, employeeId?: string) => {
    if (!startDate || !employeeId) return true;
    try {
      if (leaveType === 'ferie' && endDate) {
        const validation = await validateVacationDates(employeeId, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));
        if (!validation.isValid) {
          setValidationError(validation.conflicts.join('; '));
          return false;
        }
      } else if (leaveType === 'permesso') {
        const validation = await validatePermissionDate(employeeId, format(startDate, 'yyyy-MM-dd'), timeFrom, timeTo);
        if (!validation.isValid) {
          setValidationError(validation.conflicts.join('; '));
          return false;
        }
      }
      setValidationError(null);
      return true;
    } catch (error) {
      console.error('❌ Errore validazione conflitti:', error);
      setValidationError('Errore durante la validazione dei conflitti');
      return false;
    }
  };
  const validateWorkingHours = (day?: Date, timeFrom?: string, timeTo?: string) => {
    if (leaveType === 'permesso' && day && timeFrom && timeTo) {
      const hoursValidation = validatePermissionTime(day, timeFrom, timeTo);
      if (!hoursValidation.isValid) {
        setWorkingHoursErrors(hoursValidation.errors);
        return false;
      } else {
        setWorkingHoursErrors([]);
        return true;
      }
    }
    setWorkingHoursErrors([]);
    return true;
  };
  const handleEmployeeChange = (userId: string) => {
    setSelectedUserId(userId);
    setValidationError(null);
    setWorkingHoursErrors([]);
    setBalanceValidationError(null);
    // Valida immediatamente se ci sono date selezionate
    validateDatesAgainstHireDate(startDate, endDate, userId);
    if (startDate) {
      validateConflicts(startDate, endDate, userId);
      if (leaveType === 'permesso') {
        validateWorkingHours(startDate, timeFrom, timeTo);
      }
    }
  };
  const handleStartDateChange = async (date: Date | undefined) => {
    setStartDate(date);

    // Prima controlla la data di assunzione
    const isHireDateValid = validateDatesAgainstHireDate(date, endDate, selectedUserId);
    if (!isHireDateValid) return;

    // Poi controlla i conflitti
    if (selectedUserId && date) {
      await validateConflicts(date, endDate, selectedUserId);
      // Valida orari di lavoro per permessi
      if (leaveType === 'permesso') {
        validateWorkingHours(date, timeFrom, timeTo);
      }
    }
  };
  const handleEndDateChange = async (date: Date | undefined) => {
    setEndDate(date);

    // Prima controlla la data di assunzione
    const isHireDateValid = validateDatesAgainstHireDate(startDate, date, selectedUserId);
    if (!isHireDateValid) return;

    // Poi controlla i conflitti
    if (selectedUserId && startDate) {
      await validateConflicts(startDate, date, selectedUserId);
    }
  };
  const handleLeaveTypeChange = (newLeaveType: "ferie" | "permesso") => {
    setLeaveType(newLeaveType);
    setValidationError(null);
    setBalanceValidationError(null);
    // Ricontrolla i conflitti con il nuovo tipo
    if (selectedUserId && startDate) {
      validateConflicts(startDate, endDate, selectedUserId);
    }
  };
  const handleTimeFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTimeFrom(value);

    // Validazione differita per evitare interferenze con l'input
    if (value && timeTo && selectedUserId && startDate) {
      setTimeout(() => {
        validateConflicts(startDate, endDate, selectedUserId);
        validateWorkingHours(startDate, value, timeTo);
      }, 500);
    }
  };
  const handleTimeToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTimeTo(value);

    // Validazione differita per evitare interferenze con l'input
    if (timeFrom && value && selectedUserId && startDate) {
      setTimeout(() => {
        validateConflicts(startDate, endDate, selectedUserId);
        validateWorkingHours(startDate, timeFrom, value);
      }, 500);
    }
  };
  const sendNotificationToEmployee = async (leaveRequest: any, employeeProfile: any) => {
    if (!notifyEmployee) return;
    try {
      console.log('📧 Invio notifica di approvazione manuale al dipendente...');
      const result = await sendLeaveRequestNotification(leaveRequest, employeeProfile, note || undefined,
      // Admin note
      true,
      // isApproval
      false // isRejection
      );
      if (result.success) {
        toast({
          title: "✅ Notifica inviata",
          description: `Email di approvazione inviata a ${employeeProfile.first_name} ${employeeProfile.last_name}`
        });
        console.log('✅ Notifica di approvazione inviata con successo');
      } else {
        toast({
          title: "⚠️ Errore invio email",
          description: "La richiesta è stata salvata ma la notifica non è stata inviata",
          variant: "destructive"
        });
        console.error('❌ Errore invio notifica:', result.error);
      }
    } catch (error) {
      console.error('❌ Errore durante l\'invio della notifica:', error);
      toast({
        title: "⚠️ Errore invio email",
        description: "La richiesta è stata salvata ma si è verificato un errore nell'invio della notifica",
        variant: "destructive"
      });
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      alert("Seleziona un dipendente");
      return;
    }

    // Controllo bilanci prima di tutte le altre validazioni
    if (balanceValidationError) {
      alert(`Errore bilanci: ${balanceValidationError}`);
      return;
    }
    if (!validateDatesAgainstHireDate(startDate, endDate, selectedUserId)) {
      return;
    }
    const isConflictValid = await validateConflicts(startDate, endDate, selectedUserId);
    if (!isConflictValid) {
      return;
    }

    // Validazione orari di lavoro per permessi
    if (leaveType === 'permesso' && !validateWorkingHours(startDate, timeFrom, timeTo)) {
      return;
    }
    const employeeProfile = employees?.find(emp => emp.id === selectedUserId);
    if (leaveType === "ferie") {
      if (!startDate || !endDate) {
        alert("Seleziona le date di inizio e fine per le ferie");
        return;
      }
      if (endDate < startDate) {
        alert("La data di fine non può essere precedente alla data di inizio");
        return;
      }
      const leaveRequestData = {
        user_id: selectedUserId,
        type: "ferie" as const,
        date_from: format(startDate, 'yyyy-MM-dd'),
        date_to: format(endDate, 'yyyy-MM-dd'),
        note: note || null,
        status: "approved" as const
      };
      insertMutation.mutate(leaveRequestData, {
        onSuccess: async result => {
          if (employeeProfile && result) {
            await sendNotificationToEmployee({
              ...leaveRequestData,
              id: result.id || 'manual-entry'
            }, employeeProfile);
          }
          setSelectedUserId("");
          setStartDate(undefined);
          setEndDate(undefined);
          setNote("");
          setNotifyEmployee(true);
          setValidationError(null);
          setWorkingHoursErrors([]);
          setBalanceValidationError(null);
          onSuccess?.();
        }
      });
    } else {
      if (!startDate) {
        alert("Seleziona la data per il permesso");
        return;
      }
      if (!timeFrom && !timeTo) {
        setBalanceValidationError("Inserisci almeno un orario di inizio o fine per il permesso");
        return;
      }
      const leaveRequestData = {
        user_id: selectedUserId,
        type: "permesso" as const,
        day: format(startDate, 'yyyy-MM-dd'),
        time_from: timeFrom,
        time_to: timeTo,
        note: note || null,
        status: "approved" as const
      };
      insertMutation.mutate(leaveRequestData, {
        onSuccess: async result => {
          if (employeeProfile && result) {
            await sendNotificationToEmployee({
              ...leaveRequestData,
              id: result.id || 'manual-entry'
            }, employeeProfile);
          }
          setSelectedUserId("");
          setStartDate(undefined);
          setTimeFrom("");
          setTimeTo("");
          setNote("");
          setNotifyEmployee(true);
          setValidationError(null);
          setWorkingHoursErrors([]);
          setBalanceValidationError(null);
          onSuccess?.();
        }
      });
    }
  };
  return <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Caricamento Manuale Ferie/Permessi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="employee">Dipendente *</Label>
            <Select value={selectedUserId} onValueChange={handleEmployeeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un dipendente" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map(employee => <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name} ({employee.email})
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Mostra informazioni bilanci dipendente */}
          {selectedUserId && leaveBalance && <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                <div className="font-medium mb-2">Bilancio dipendente:</div>
                 <div className="text-sm space-y-1">
                   <div>• Ferie: <strong>{leaveBalance.vacation_days_remaining}</strong> giorni disponibili</div>
                   <div>• Permessi: <strong>{formatDecimalHours(leaveBalance.permission_hours_remaining)}</strong> disponibili</div>
                 </div>
              </AlertDescription>
            </Alert>}

          {/* Alert bilanci non configurati */}
          {balanceValidationError && <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>{balanceValidationError}</span>
                  
                </div>
              </AlertDescription>
            </Alert>}

          <div className="space-y-2">
            <Label>Tipo di richiesta *</Label>
            <Select value={leaveType} onValueChange={handleLeaveTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ferie">Ferie</SelectItem>
                <SelectItem value="permesso">Permesso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {validationError && <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>}

          {workingHoursErrors.length > 0 && <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {workingHoursErrors.map((error, index) => <div key={index} className="text-sm">{error}</div>)}
                </div>
              </AlertDescription>
            </Alert>}

          {/* Disabilita campi se non ci sono bilanci configurati */}
          {leaveType === "ferie" ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data inizio ferie *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground", balanceValidationError && "opacity-50 cursor-not-allowed")} disabled={!!balanceValidationError}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy", {
                    locale: it
                  }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={handleStartDateChange} disabled={date => {
                  const employee = employees?.find(emp => emp.id === selectedUserId);
                  const hireDate = employee?.hire_date ? new Date(employee.hire_date) : null;
                  if (hireDate && date < hireDate) return true;
                  return isDateDisabled(date);
                }} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data fine ferie *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground", balanceValidationError && "opacity-50 cursor-not-allowed")} disabled={!!balanceValidationError}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy", {
                    locale: it
                  }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={handleEndDateChange} disabled={date => {
                  const employee = employees?.find(emp => emp.id === selectedUserId);
                  const hireDate = employee?.hire_date ? new Date(employee.hire_date) : null;
                  const minDate = startDate || hireDate;
                  if (minDate && date < minDate) return true;
                  return isDateDisabled(date);
                }} />
                  </PopoverContent>
                </Popover>
              </div>
            </div> : <>
              <div className="space-y-2">
                <Label>Data permesso *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground", balanceValidationError && "opacity-50 cursor-not-allowed")} disabled={!!balanceValidationError}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy", {
                    locale: it
                  }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={handleStartDateChange} disabled={date => {
                  const employee = employees?.find(emp => emp.id === selectedUserId);
                  const hireDate = employee?.hire_date ? new Date(employee.hire_date) : null;
                  if (hireDate && date < hireDate) return true;
                  return isDateDisabled(date);
                }} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeFrom">Ora inizio</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input id="timeFrom" type="time" value={timeFrom} onChange={handleTimeFromChange} className="pl-10" placeholder="HH:MM" step="300" disabled={!!balanceValidationError} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeTo">Ora fine</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input id="timeTo" type="time" value={timeTo} onChange={handleTimeToChange} className="pl-10" placeholder="HH:MM" step="300" disabled={!!balanceValidationError} />
                  </div>
                </div>
              </div>

              {/* Messaggio esplicativo se il tasto è disabilitato */}
              {leaveType === "permesso" && workingHoursErrors.length > 0 && (
                <div className="text-xs text-orange-600 mt-2">
                  {"Correggi gli orari: devono essere coerenti con l'orario lavorativo."}
                </div>
              )}
            </>}

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" placeholder="Note aggiuntive (opzionale)" value={note} onChange={e => setNote(e.target.value)} rows={3} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Checkbox id="notifyEmployee" checked={notifyEmployee} onCheckedChange={checked => setNotifyEmployee(checked as boolean)} />
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <Label htmlFor="notifyEmployee" className="text-blue-700 font-medium cursor-pointer">
                  Notifica dipendente via email dell'approvazione
                </Label>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" 
            disabled={
              insertMutation.isPending ||
              !!validationError ||
              !!balanceValidationError ||
              workingHoursErrors.length > 0 ||
              isCalculatingConflicts ||
              (leaveType === 'permesso' && (!startDate || !timeFrom || !timeTo))
            }
          >
            {insertMutation.isPending ? "Salvando..." : "Salva Richiesta"}
          </Button>
        </form>
      </CardContent>
    </Card>;
}