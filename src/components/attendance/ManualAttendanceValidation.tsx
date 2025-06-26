
import React from 'react';
import { useEmployeeStatus } from '@/hooks/useEmployeeStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';

interface ManualAttendanceValidationProps {
  userId: string;
  date: string;
  isAdmin?: boolean;
  children: React.ReactNode;
  onValidationResult?: (canProceed: boolean, warnings: string[], conflicts: string[]) => void;
}

export function ManualAttendanceValidation({
  userId,
  date,
  isAdmin = false,
  children,
  onValidationResult
}: ManualAttendanceValidationProps) {
  const { employeeStatus, isLoading } = useEmployeeStatus(userId, date);

  React.useEffect(() => {
    if (employeeStatus && onValidationResult) {
      const conflicts: string[] = [];
      const warnings: string[] = [];

      // Se il dipendente ha già uno stato per quel giorno
      if (employeeStatus.currentStatus !== 'available') {
        switch (employeeStatus.currentStatus) {
          case 'sick':
            conflicts.push('Il dipendente è già registrato come in malattia per questa data');
            break;
          case 'vacation':
            conflicts.push('Il dipendente è già registrato come in ferie per questa data');
            break;
          case 'permission':
            conflicts.push('Il dipendente è già registrato come in permesso per questa data');
            break;
          case 'business_trip':
            conflicts.push('Il dipendente è già registrato come in trasferta per questa data');
            break;
          case 'pending_request':
            warnings.push('Il dipendente ha una richiesta di ferie/permesso in attesa per questo periodo');
            break;
        }
      }

      const canProceed = isAdmin && conflicts.length === 0;
      onValidationResult(canProceed, warnings, conflicts);
    }
  }, [employeeStatus, isAdmin, onValidationResult]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-16 rounded"></div>
        {children}
      </div>
    );
  }

  if (!employeeStatus) {
    return <>{children}</>;
  }

  const hasConflicts = employeeStatus.currentStatus !== 'available' && 
                      employeeStatus.currentStatus !== 'pending_request';
  const hasWarnings = employeeStatus.currentStatus === 'pending_request';

  return (
    <div className="space-y-4">
      {/* Conflitti che bloccano l'operazione */}
      {hasConflicts && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Attenzione: Conflitto rilevato</p>
              {employeeStatus.blockingReasons.map((reason, index) => (
                <p key={index}>• {reason}</p>
              ))}
              {employeeStatus.statusDetails && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                  <strong>Stato esistente:</strong> {employeeStatus.statusDetails.type}
                  {employeeStatus.statusDetails.notes && (
                    <div>Note: {employeeStatus.statusDetails.notes}</div>
                  )}
                </div>
              )}
              <p className="text-sm">
                Non è possibile procedere con l'inserimento manuale a causa di questo conflitto.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Avvisi che non bloccano ma informano */}
      {hasWarnings && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Informazione</p>
              {employeeStatus.blockingReasons.map((reason, index) => (
                <p key={index}>• {reason}</p>
              ))}
              <p className="text-sm text-muted-foreground">
                Puoi comunque procedere, ma verifica che sia corretto.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Form con opacità ridotta se bloccato */}
      <div className={hasConflicts ? "opacity-50 pointer-events-none" : ""}>
        {children}
      </div>
    </div>
  );
}
