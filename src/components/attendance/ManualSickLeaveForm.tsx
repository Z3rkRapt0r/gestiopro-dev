import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useSickLeaveForm } from "./sick-leave/useSickLeaveForm";
import { SickLeaveEmployeeSelector } from "./sick-leave/SickLeaveEmployeeSelector";
import { SickLeaveConflictIndicators } from "./sick-leave/SickLeaveConflictIndicators";
import { SickLeaveValidationAlert } from "./sick-leave/SickLeaveValidationAlert";
import { SickLeaveDatePickers } from "./sick-leave/SickLeaveDatePickers";
import { SickLeavePreview } from "./sick-leave/SickLeavePreview";
import { SickLeaveNotes } from "./sick-leave/SickLeaveNotes";
import { SickLeaveFormProps } from "./sick-leave/types";

export function ManualSickLeaveForm({ onSuccess }: SickLeaveFormProps) {
  const {
    formData,
    conflictDates,
    isCalculatingConflicts,
    isDateDisabled,
    setNotes,
    handleEmployeeChange,
    handleStartDateChange,
    handleEndDateChange,
    handleSubmit
  } = useSickLeaveForm(onSuccess);

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
          <SickLeaveEmployeeSelector
            selectedUserId={formData.selectedUserId}
            onEmployeeChange={handleEmployeeChange}
          />

          {/* Indicatori conflitti */}
          <SickLeaveConflictIndicators
            selectedUserId={formData.selectedUserId}
            isCalculatingConflicts={isCalculatingConflicts}
            conflictDates={conflictDates}
          />

          {/* Alert validazione */}
          <SickLeaveValidationAlert validationError={formData.validationError} />

          {/* Selezione date */}
          <SickLeaveDatePickers
            startDate={formData.startDate}
            endDate={formData.endDate}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            isDateDisabled={isDateDisabled}
          />

          {/* Preview giorni */}
          <SickLeavePreview
            startDate={formData.startDate}
            endDate={formData.endDate}
          />

          {/* Note */}
          <SickLeaveNotes
            notes={formData.notes}
            onNotesChange={setNotes}
          />

          <Button 
            type="submit" 
            className="w-full"
            disabled={!formData.selectedUserId || !formData.startDate || !!formData.validationError || isCalculatingConflicts}
          >
            {isCalculatingConflicts ? "Validando..." : "Registra Malattia"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
