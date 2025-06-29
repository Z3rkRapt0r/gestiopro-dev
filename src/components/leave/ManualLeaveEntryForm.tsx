
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, User, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useAdminLeaveBalanceValidation } from "@/hooks/useAdminLeaveBalanceValidation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ManualLeaveEntryFormProps {
  onSuccess?: () => void;
}

export function ManualLeaveEntryForm({ onSuccess }: ManualLeaveEntryFormProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [leaveType, setLeaveType] = useState<"ferie" | "permesso">("ferie");
  const [permissionType, setPermissionType] = useState<"giornaliero" | "orario">("giornaliero");
  
  // Date range for ferie or single date for permesso
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  // Time fields for hourly permissions
  const [timeFrom, setTimeFrom] = useState<string>("");
  const [timeTo, setTimeTo] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [balanceValidationError, setBalanceValidationError] = useState<string | null>(null);

  const { employees } = useActiveEmployees();
  const { insertMutation } = useLeaveRequests();
  const { balanceValidation, validateLeaveRequest, isLoading: isLoadingBalance } = useAdminLeaveBalanceValidation(selectedUserId);

  // Effetto per validare il bilancio quando cambiano i parametri
  useEffect(() => {
    if (!selectedUserId || !balanceValidation) {
      setBalanceValidationError(null);
      return;
    }

    if (leaveType === "ferie" && startDate && endDate) {
      const validation = validateLeaveRequest("ferie", startDate, endDate);
      setBalanceValidationError(validation.errorMessage || null);
    } else if (leaveType === "permesso" && startDate) {
      const validation = validateLeaveRequest("permesso", null, null, startDate, 
        permissionType === "orario" ? timeFrom : null, 
        permissionType === "orario" ? timeTo : null
      );
      setBalanceValidationError(validation.errorMessage || null);
    } else {
      setBalanceValidationError(null);
    }
  }, [selectedUserId, leaveType, startDate, endDate, timeFrom, timeTo, permissionType, balanceValidation, validateLeaveRequest]);

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

  const handleEmployeeChange = (userId: string) => {
    setSelectedUserId(userId);
    // Valida immediatamente se ci sono date selezionate
    validateDatesAgainstHireDate(startDate, endDate, userId);
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    validateDatesAgainstHireDate(date, endDate, selectedUserId);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    validateDatesAgainstHireDate(startDate, date, selectedUserId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      alert("Seleziona un dipendente");
      return;
    }

    // Verifica finale della validazione date di assunzione
    if (!validateDatesAgainstHireDate(startDate, endDate, selectedUserId)) {
      return;
    }

    // Verifica finale della validazione bilancio
    if (balanceValidationError) {
      alert(`Errore bilancio: ${balanceValidationError}`);
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
          setBalanceValidationError(null);
          onSuccess?.();
        }
      });
    } else {
      // Permesso
      if (!startDate) {
        alert("Seleziona la data per il permesso");
        return;
      }

      if (permissionType === "orario") {
        if (!timeFrom || !timeTo) {
          alert("Inserisci orario di inizio e fine per il permesso orario");
          return;
        }
      }

      insertMutation.mutate({
        user_id: selectedUserId,
        type: "permesso",
        day: format(startDate, 'yyyy-MM-dd'),
        time_from: permissionType === "orario" ? timeFrom : null,
        time_to: permissionType === "orario" ? timeTo : null,
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
          setBalanceValidationError(null);
          onSuccess?.();
        }
      });
    }
  };

  const canSubmit = selectedUserId && 
    !validationError && 
    !balanceValidationError && 
    !insertMutation.isPending &&
    balanceValidation?.hasBalance;

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

          {/* Informazioni bilancio */}
          {selectedUserId && balanceValidation && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-700">Bilancio Dipendente</span>
              </div>
              {balanceValidation.hasBalance ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-blue-600">Ferie</div>
                    <div className="text-blue-700">
                      Rimanenti: <strong>{balanceValidation.remainingVacationDays}</strong> giorni
                    </div>
                    <div className="text-gray-600">
                      ({balanceValidation.usedVacationDays}/{balanceValidation.totalVacationDays} usati)
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-blue-600">Permessi</div>
                    <div className="text-blue-700">
                      Rimanenti: <strong>{balanceValidation.remainingPermissionHours}</strong> ore
                    </div>
                    <div className="text-gray-600">
                      ({balanceValidation.usedPermissionHours}/{balanceValidation.totalPermissionHours} usate)
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-red-600 font-medium">
                  ⚠️ Nessun bilancio configurato per questo dipendente
                </div>
              )}
            </div>
          )}

          {/* Tipo di richiesta */}
          <div className="space-y-2">
            <Label>Tipo di richiesta *</Label>
            <Select value={leaveType} onValueChange={(value: "ferie" | "permesso") => setLeaveType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ferie">Ferie</SelectItem>
                <SelectItem value="permesso">Permesso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {balanceValidationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{balanceValidationError}</AlertDescription>
            </Alert>
          )}

          {/* Avviso se non c'è bilancio */}
          {selectedUserId && balanceValidation && !balanceValidation.hasBalance && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Impossibile inserire ferie o permessi: il dipendente non ha un bilancio configurato per l'anno corrente.
                Configura prima il bilancio nella sezione "Impostazioni Ferie/Permessi".
              </AlertDescription>
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
                      disabled={(date) => date < new Date()}
                      locale={it}
                      initialFocus
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
                      disabled={(date) => date < (startDate || new Date())}
                      locale={it}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : (
            <>
              {/* Tipo permesso */}
              <div className="space-y-2">
                <Label>Tipo permesso</Label>
                <Select value={permissionType} onValueChange={(value: "giornaliero" | "orario") => setPermissionType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="giornaliero">Giornaliero</SelectItem>
                    <SelectItem value="orario">Orario</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                      disabled={(date) => date < new Date()}
                      locale={it}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Orari per permesso orario */}
              {permissionType === "orario" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeFrom">Ora inizio *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="timeFrom"
                        type="time"
                        value={timeFrom}
                        onChange={(e) => setTimeFrom(e.target.value)}
                        className="pl-10"
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
                        onChange={(e) => setTimeTo(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
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
            disabled={!canSubmit}
          >
            {insertMutation.isPending ? "Salvando..." : "Salva Richiesta"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
