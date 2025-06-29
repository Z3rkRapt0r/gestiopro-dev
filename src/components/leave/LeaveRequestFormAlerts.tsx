
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LeaveRequestFormAlertsProps {
  showValidationErrors: boolean;
  balanceValidationError: string | null;
}

export function LeaveRequestFormAlerts({
  showValidationErrors,
  balanceValidationError,
}: LeaveRequestFormAlertsProps) {
  if (!showValidationErrors && !balanceValidationError) {
    return null;
  }

  return (
    <>
      {showValidationErrors && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Correggi gli errori di validazione dei giorni lavorativi prima di procedere.
          </AlertDescription>
        </Alert>
      )}

      {balanceValidationError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{balanceValidationError}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
