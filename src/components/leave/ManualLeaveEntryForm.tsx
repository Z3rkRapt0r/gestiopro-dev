
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, User, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useLeaveConflicts } from "@/hooks/useLeaveConflicts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";

interface ManualLeaveEntryFormProps {
  onSuccess?: () => void;
}

export function ManualLeaveEntryForm({ onSuccess }: ManualLeaveEntryFormProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [leaveType, setLeaveType] = useState<"ferie" | "permesso">("ferie");
  
  // Date range for ferie or single date for permesso
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  // Time fields for hourly permissions
  const [timeFrom, setTimeFrom] = useState<string>("");
  const [timeTo, setTimeTo] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { employees } = useActiveEmployees();
  const { insertMutation } = useLeaveRequests();
  
  // Usa il hook per i conflitti con calcolo preventivo
  const { 
    isLoading: isCalculatingConflicts, 
    isDateDisabled,
    validateVacationDates,
    validatePermissionDate
  } = useLeaveConflicts(selectedUserId, leaveType);

  // Funzione per validare le date rispetto alla data di assunzione
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

  // Validazione anti-conflitto completa
  const validateConflicts = async (startDate?: Date, endDate?: Date, employeeId?: string) => {
    if (!startDate || !employeeId) return true;

    try {
      if (leaveType === 'ferie' && endDate) {
        const validation = await validateVacationDates(
          employeeId, 
          format(startDate, 'yyyy-MM-dd'),
          format(endDate, 'yyyy-MM-dd')
        );
        
        if (!validation.isValid) {
          setValidationError(validation.conflicts.join('; '));
          return false;
        }
      } else if (leaveType === 'permesso') {
        const validation = await validatePermissionDate(
          employeeId,
          format(startDate, 'yyyy-MM-dd'),
          timeFrom,
          timeTo
        );
        
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

  const handleEmployeeChange = (userId: string) => {
    setSelectedUserId(userId);
    setValidationError(null);
    // Valida immediatamente se ci sono date selezionate
    validateDatesAgainstHireDate(startDate, endDate, userId);
    if (startDate) {
      validateConflicts(startDate, endDate, userId);
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
    // Ricontrolla i conflitti con il nuovo tipo
    if (selectedUserId && startDate) {
      validateConflicts(startDate, endDate, selectedUserId);
    }
  };

  // Gestori personalizzati per input time (senza debounce)
  const handleTimeFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTimeFrom(value);
    
    // Validazione differita per evitare interferenze con l'input
    if (value && timeTo && selectedUserId && startDate) {
      setTimeout(() => {
        validateConflicts(startDate, endDate, selectedUserId);
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
      }, 500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      alert("Seleziona un dipendente");
      return;
    }

    // Verifica finale della validazione data di assunzione
    if (!validateDatesAgainstHireDate(startDate, endDate, selectedUserId)) {
      return;
    }

    // Verifica finale della validazione conflitti
    const isConflictValid = await validateConflicts(startDate, endDate, selectedUserId);
    if (!isConflictValid) {
      return;
    }

    if (leaveType === "ferie") {
      if (!startDate || !endDate) {
        alert("Seleziona le date di inizio e fine per le ferie");
        return;
      }
      
      if (endDate < startDate) {
        alert("La data di fine non può essere precedente alla data di inizio");
        return;
      }

      insertMutation.mutate({
        user_id: selectedUserId,
        type: "ferie",
        date_from: format(startDate, 'yyyy-MM-dd'),
        date_to: format(endDate, 'yyyy-MM-dd'),
        note: note || null,
        status: "approved"
      }, {
        onSuccess: () => {
          // Reset form
          setSelectedUserId("");
          setStartDate(undefined);
          setEndDate(undefined);
          setNote("");
          setValidationError(null);
          onSuccess?.();
        }
      });
    } else {
      // Permesso
      if (!startDate) {
        alert("Seleziona la data per il permesso");
        return;
      }

      if (!timeFrom || !timeTo) {
        alert("Inserisci orario di inizio e fine per il permesso");
        return;
      }

      insertMutation.mutate({
        user_id: selectedUserId,
        type: "permesso",
        day: format(startDate, 'yyyy-MM-dd'),
        time_from: timeFrom,
        time_to: timeTo,
        note: note || null,
        status: "approved"
      }, {
        onSuccess: () => {
          // Reset form
          setSelectedUserId("");
          setStartDate(undefined);
          setTimeFrom("");
          setTimeTo("");
          setNote("");
          setValidationError(null);
          onSuccess?.();
        }
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Caricamento Manuale Ferie/Permessi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selezione dipendente */}
          <div className="space-y-2">
            <Label htmlFor="employee">Dipendente *</Label>
            <Select value={selectedUserId} onValueChange={handleEmployeeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un dipendente" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name} ({employee.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo di richiesta */}
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

          {/* Indicatore di calcolo conflitti */}
          {selectedUserId && isCalculatingConflicts && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                🔍 Verifica disponibilità date in corso...
              </AlertDescription>
            </Alert>
          )}

          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Date selection */}
          {leaveType === "ferie" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data inizio ferie *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy", { locale: it }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateChange}
                      disabled={(date) => {
                        const employee = employees?.find(emp => emp.id === selectedUserId);
                        const hireDate = employee?.hire_date ? new Date(employee.hire_date) : null;
                        if (hireDate && date < hireDate) return true;
                        return isDateDisabled(date);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data fine ferie *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy", { locale: it }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateChange}
                      disabled={(date) => {
                        const employee = employees?.find(emp => emp.id === selectedUserId);
                        const hireDate = employee?.hire_date ? new Date(employee.hire_date) : null;
                        const minDate = startDate || hireDate;
                        if (minDate && date < minDate) return true;
                        return isDateDisabled(date);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : (
            <>
              {/* Data permesso */}
              <div className="space-y-2">
                <Label>Data permesso *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy", { locale: it }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateChange}
                      disabled={(date) => {
                        const employee = employees?.find(emp => emp.id === selectedUserId);
                        const hireDate = employee?.hire_date ? new Date(employee.hire_date) : null;
                        if (hireDate && date < hireDate) return true;
                        return isDateDisabled(date);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Orari ottimizzati per permesso */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeFrom">Ora inizio *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="timeFrom"
                      type="time"
                      value={timeFrom}
                      onChange={handleTimeFromChange}
                      className="pl-10"
                      placeholder="HH:MM"
                      step="300"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeTo">Ora fine *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="timeTo"
                      type="time"
                      value={timeTo}
                      onChange={handleTimeToChange}
                      className="pl-10"
                      placeholder="HH:MM"
                      step="300"
                      required
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              placeholder="Note aggiuntive (opzionale)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={insertMutation.isPending || !!validationError || isCalculatingConflicts}
          >
            {insertMutation.isPending ? "Salvando..." : "Salva Richiesta"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
