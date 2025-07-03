import { useState } from "react";
import { format } from "date-fns";
import { useUnifiedAttendances } from "@/hooks/useUnifiedAttendances";
import { useSickLeaveValidation } from "./useSickLeaveValidation";
import { SickLeaveFormData } from "./types";

export function useSickLeaveForm(onSuccess?: () => void) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [notes, setNotes] = useState<string>("");

  const { createManualAttendance } = useUnifiedAttendances();
  
  const {
    validationError,
    setValidationError,
    conflictDates,
    isCalculatingConflicts,
    isDateDisabled,
    validateDatesAgainstHireDate,
    validateConflicts
  } = useSickLeaveValidation(selectedUserId);

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

    // Generatore di date basato su stringhe pure (senza oggetti Date intermedi)
    const generateDateStrings = (startDateStr: string, endDateStr: string) => {
      const dates = [];
      let currentDateStr = startDateStr;
      
      while (currentDateStr <= endDateStr) {
        dates.push(currentDateStr);
        
        // Incrementa la data come stringa (senza timezone issues)
        const [year, month, day] = currentDateStr.split('-').map(Number);
        const nextDay = day + 1;
        const nextDate = new Date(year, month - 1, nextDay);
        currentDateStr = format(nextDate, 'yyyy-MM-dd');
      }
      
      return dates;
    };

    // Genera tutte le date da registrare usando solo stringhe
    const startDateString = format(startDate, 'yyyy-MM-dd');
    const endDateString = format(endDate || startDate, 'yyyy-MM-dd');
    const datesToProcess = generateDateStrings(startDateString, endDateString);

    // Crea un record di presenza per ogni giorno di malattia
    for (const dateStr of datesToProcess) {
      await createManualAttendance({
        user_id: selectedUserId,
        date: dateStr,
        check_in_time: null,
        check_out_time: null,
        is_sick_leave: true,
        notes: notes || `Malattia registrata manualmente${datesToProcess.length > 1 ? ` (dal ${format(startDate, 'dd/MM/yyyy')} al ${format(endDate || startDate, 'dd/MM/yyyy')})` : ''}`,
      });
    }

    // Reset form
    setSelectedUserId("");
    setStartDate(undefined);
    setEndDate(undefined);
    setNotes("");
    setValidationError(null);
    onSuccess?.();
    
    alert("Malattia registrata con successo");
  };

  const formData: SickLeaveFormData = {
    selectedUserId,
    startDate,
    endDate,
    notes,
    validationError
  };

  return {
    formData,
    conflictDates,
    isCalculatingConflicts,
    isDateDisabled,
    setNotes,
    handleEmployeeChange,
    handleStartDateChange,
    handleEndDateChange,
    handleSubmit
  };
}