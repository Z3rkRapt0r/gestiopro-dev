import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface SickLeaveValidationAlertProps {
  validationError: string | null;
}

export function SickLeaveValidationAlert({ validationError }: SickLeaveValidationAlertProps) {
  if (!validationError) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{validationError}</AlertDescription>
    </Alert>
  );
}