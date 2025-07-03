import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Heart, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useLeaveConflicts } from "@/hooks/useLeaveConflicts";
import { useUnifiedAttendances } from "@/hooks/useUnifiedAttendances";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ManualSickLeaveFormProps {
  onSuccess?: () => void;
}

export function ManualSickLeaveForm({ onSuccess }: ManualSickLeaveFormProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [notes, setNotes] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { employees } = useActiveEmployees();
  const { createManualAttendance } = useUnifiedAttendances();
  
  // Usa il nuovo hook per i conflitti
  const { 
    conflictDates, 
    isLoading: isCalculatingConflicts, 
    isDateDisabled,
    validateSickLeaveRange
  } = useLeaveConflicts(selectedUserId, 'sick_leave');

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
      console.log('🔍 Controllo conflitti per malattia...');
      const validation = await validateSickLeaveRange(
        employeeId, 
        format(startDate, 'yyyy-MM-dd'),
        endDate ? format(endDate, 'yyyy-MM-dd') : undefined
      );
      
      if (!validation.isValid) {
        setValidationError(validation.conflicts.join('; '));
        return false;
      }
      
      setValidationError(null);
      return true;
    } catch (error) {
      console.error('❌ Errore validazione conflitti malattia:', error);
      setValidationError('Errore durante la validazione dei conflitti');
      return false;
    }
  };

  const handleEmployeeChange = (userId: string) => {
    setSelectedUserId(userId);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      alert("Seleziona un dipendente");
      return;
    }

    if (!startDate) {
      alert("Seleziona almeno la data di inizio malattia");
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

    if (endDate && endDate < startDate) {
      alert("La data di fine non può essere precedente alla data di inizio");
      return;
    }

    // Genera tutte le date da registrare come malattia
    const startDateString = format(startDate, 'yyyy-MM-dd');
    const endDateString = format(endDate || startDate, 'yyyy-MM-dd');
    const dates = [];
    
    // Genera date usando solo stringhe, come nel sistema ferie
    const start = new Date(startDateString);
    const end = new Date(endDateString);
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      dates.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    try {
      // Crea un record di presenza per ogni giorno di malattia
      for (const dateStr of dates) {
        await createManualAttendance({
          user_id: selectedUserId,
          date: dateStr,
          check_in_time: null,
          check_out_time: null,
          is_sick_leave: true,
          notes: notes || `Malattia registrata manualmente${dates.length > 1 ? ` (dal ${format(startDate, 'dd/MM/yyyy')} al ${format(endDate || startDate, 'dd/MM/yyyy')})` : ''}`,
        });
      }

      // Reset form
      setSelectedUserId("");
      setStartDate(undefined);
      setEndDate(undefined);
      setNotes("");
      setValidationError(null);
      onSuccess?.();
      
      alert(`Malattia registrata con successo per ${dates.length} giorno/i`);
    } catch (error) {
      console.error('Errore nella registrazione malattia:', error);
      alert('Errore nella registrazione della malattia');
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5" />
          Registrazione Manuale Malattia
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

          {/* Indicatore di calcolo conflitti */}
          {selectedUserId && isCalculatingConflicts && (
            <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
              🔍 Calcolo conflitti in corso...
            </div>
          )}

          {/* Indicatore conflitti trovati */}
          {selectedUserId && conflictDates.length > 0 && (
            <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
              ⚠️ {conflictDates.length} date disabilitate per conflitti esistenti
            </div>
          )}

          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Date selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data inizio malattia *</Label>
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
                    disabled={(date) => isDateDisabled(date)}
                    locale={it}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data fine malattia (opzionale)</Label>
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
                    {endDate ? format(endDate, "dd/MM/yyyy", { locale: it }) : "Solo un giorno"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={handleEndDateChange}
                    disabled={(date) => date < (startDate || new Date()) || isDateDisabled(date)}
                    locale={it}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Preview giorni */}
          {startDate && (
            <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
              📅 Registrerà malattia per: {startDate && endDate 
                ? `dal ${format(startDate, 'dd/MM/yyyy')} al ${format(endDate, 'dd/MM/yyyy')}`
                : format(startDate, 'dd/MM/yyyy')
              }
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              placeholder="Note aggiuntive sulla malattia (opzionale)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={!selectedUserId || !startDate || !!validationError || isCalculatingConflicts}
          >
            {isCalculatingConflicts ? "Validando..." : "Registra Malattia"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
