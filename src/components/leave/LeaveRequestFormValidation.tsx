
import { useState } from "react";

interface TimeValidation {
  isValid: boolean;
  error?: string;
}

interface DateValidation {
  isValid: boolean;
  error?: string;
}

export const useLeaveRequestValidation = () => {
  const validateTimeRange = (timeFrom: string, timeTo: string): TimeValidation => {
    if (!timeFrom || !timeTo) {
      return { isValid: false, error: "Entrambi gli orari sono obbligatori" };
    }

    const fromTime = new Date(`2000-01-01T${timeFrom}`);
    const toTime = new Date(`2000-01-01T${timeTo}`);

    if (fromTime >= toTime) {
      return { isValid: false, error: "L'orario di inizio deve essere precedente a quello di fine" };
    }

    const minDuration = 30; // minuti minimi
    const diffMinutes = (toTime.getTime() - fromTime.getTime()) / (1000 * 60);
    
    if (diffMinutes < minDuration) {
      return { isValid: false, error: `La durata minima del permesso è di ${minDuration} minuti` };
    }

    const maxDuration = 8 * 60; // 8 ore massime
    if (diffMinutes > maxDuration) {
      return { isValid: false, error: "La durata massima del permesso è di 8 ore" };
    }

    return { isValid: true };
  };

  const validateDateRange = (dateFrom: Date | null, dateTo: Date | null): DateValidation => {
    if (!dateFrom || !dateTo) {
      return { isValid: false, error: "Entrambe le date sono obbligatorie" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFrom < today) {
      return { isValid: false, error: "Non puoi richiedere ferie per date passate" };
    }

    if (dateFrom > dateTo) {
      return { isValid: false, error: "La data di inizio deve essere precedente o uguale a quella di fine" };
    }

    const maxDays = 30; // massimo 30 giorni consecutivi
    const diffTime = dateTo.getTime() - dateFrom.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > maxDays) {
      return { isValid: false, error: `Non puoi richiedere più di ${maxDays} giorni consecutivi di ferie` };
    }

    return { isValid: true };
  };

  const validatePermessoDay = (day: Date | null): DateValidation => {
    if (!day) {
      return { isValid: false, error: "Seleziona il giorno del permesso" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (day < today) {
      return { isValid: false, error: "Non puoi richiedere permessi per date passate" };
    }

    // Verifica che non sia un weekend (opzionale)
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { isValid: false, error: "Non puoi richiedere permessi durante il weekend" };
    }

    return { isValid: true };
  };

  return {
    validateTimeRange,
    validateDateRange,
    validatePermessoDay,
  };
};
