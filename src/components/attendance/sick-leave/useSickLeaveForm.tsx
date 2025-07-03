import { useState } from "react";
import { format } from "date-fns";
import { useSickLeaves } from "@/hooks/useSickLeaves";
import { useSickLeaveValidation } from "./useSickLeaveValidation";
import { SickLeaveFormData } from "./types";

export function useSickLeaveForm(onSuccess?: () => void) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [notes, setNotes] = useState<string>("");

  const { createSickLeave, verifyDates } = useSickLeaves();
  
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

    // Usa la nuova tabella dedicata con approccio periodo-based
    const startDateString = format(startDate, 'yyyy-MM-dd');
    const endDateString = format(endDate || startDate, 'yyyy-MM-dd');
    
    console.log('🏥 Registrando malattia nella tabella dedicata:', {
      selectedUserId,
      startDateString,
      endDateString,
      notes
    });

    // Crea un singolo record nella tabella sick_leaves (gestione periodo-based)
    await createSickLeave({
      user_id: selectedUserId,
      start_date: startDateString,
      end_date: endDateString,
      notes: notes || `Malattia registrata manualmente${endDate ? ` (dal ${format(startDate, 'dd/MM/yyyy')} al ${format(endDate, 'dd/MM/yyyy')})` : ''}`,
    });

    // Verifica immediatamente l'integrità delle date inserite
    try {
      const verification = await verifyDates(selectedUserId, startDateString, endDateString);
      console.log('✅ VERIFICA POST-INSERIMENTO:', verification);
      
      if (!verification.is_valid) {
        alert(`⚠️ ATTENZIONE: Verifica date - Giorni attesi: ${verification.expected_days}, giorni effettivi: ${verification.actual_days}`);
      }
    } catch (error) {
      console.error('Errore verifica post-inserimento:', error);
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