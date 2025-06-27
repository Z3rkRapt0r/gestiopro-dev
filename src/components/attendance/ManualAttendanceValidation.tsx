
import React from 'react';
import { useEmployeeStatus } from '@/hooks/useEmployeeStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, XCircle, Info } from 'lucide-react';

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

      // Categorizza i conflitti in base alla priorità
      if (employeeStatus.conflictPriority >= 4) {
        // Conflitti critici: Malattia, Ferie - SEMPRE BLOCCANO
        conflicts.push(...employeeStatus.blockingReasons);
      } else if (employeeStatus.conflictPriority >= 2) {
        // Conflitti medi: Permesso, Trasferta - BLOCCANO per non-admin
        if (isAdmin) {
          warnings.push(...employeeStatus.blockingReasons);
          warnings.push('Come amministratore puoi procedere, ma verifica la correttezza dell\'operazione');
        } else {
          conflicts.push(...employeeStatus.blockingReasons);
        }
      } else if (employeeStatus.conflictPriority === 1) {
        // Conflitti minori: Già presente - BLOCCANO sempre
        conflicts.push(...employeeStatus.blockingReasons);
      } else if (employeeStatus.currentStatus === 'pending_request') {
        // Solo avvisi per richieste pending
        warnings.push(...employeeStatus.blockingReasons);
      }

      // Determina se si può procedere
      const canProceed = conflicts.length === 0;
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

  const hasBlockingConflicts = employeeStatus.conflictPriority >= 4 || 
                               (employeeStatus.conflictPriority >= 1 && employeeStatus.conflictPriority !== 1) ||
                               (employeeStatus.conflictPriority >= 2 && !isAdmin) ||
                               employeeStatus.conflictPriority === 1;
                               
  const hasWarnings = (employeeStatus.conflictPriority >= 2 && employeeStatus.conflictPriority < 4 && isAdmin) ||
                      employeeStatus.currentStatus === 'pending_request';

  return (
    <div className="space-y-4">
      {/* Conflitti critici che bloccano sempre */}
      {employeeStatus.conflictPriority >= 4 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-bold text-red-800">OPERAZIONE VIETATA</p>
              <p className="font-medium">Il dipendente ha uno stato che impedisce categoricamente la presenza:</p>
              {employeeStatus.blockingReasons.map((reason, index) => (
                <p key={index} className="text-sm">• {reason}</p>
              ))}
              {employeeStatus.statusDetails && (
                <div className="mt-3 p-3 bg-red-100 rounded text-xs text-red-800">
                  <div className="font-semibold mb-1">Dettagli conflitto:</div>
                  <div><strong>Tipo:</strong> {employeeStatus.statusDetails.type}</div>
                  {employeeStatus.statusDetails.startDate && (
                    <div><strong>Periodo:</strong> {employeeStatus.statusDetails.startDate}
                      {employeeStatus.statusDetails.endDate && employeeStatus.statusDetails.endDate !== employeeStatus.statusDetails.startDate && 
                        ` - ${employeeStatus.statusDetails.endDate}`}
                    </div>
                  )}
                  {employeeStatus.statusDetails.notes && (
                    <div><strong>Note:</strong> {employeeStatus.statusDetails.notes}</div>
                  )}
                </div>
              )}
              <p className="text-sm font-medium text-red-700 mt-2">
                Non è possibile registrare presenze in caso di {employeeStatus.statusDetails?.type?.toLowerCase() || 'questo stato'}.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Conflitti medi che bloccano i non-admin */}
      {employeeStatus.conflictPriority >= 2 && employeeStatus.conflictPriority < 4 && !isAdmin && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-bold text-red-800">CONFLITTO RILEVATO</p>
              <p className="font-medium">Il dipendente ha uno stato che impedisce la presenza normale:</p>
              {employeeStatus.blockingReasons.map((reason, index) => (
                <p key={index} className="text-sm">• {reason}</p>
              ))}
              {employeeStatus.statusDetails && (
                <div className="mt-3 p-3 bg-red-100 rounded text-xs text-red-800">
                  <div className="font-semibold mb-1">Dettagli:</div>
                  <div><strong>Tipo:</strong> {employeeStatus.statusDetails.type}</div>
                  {employeeStatus.statusDetails.startDate && (
                    <div><strong>Data:</strong> {employeeStatus.statusDetails.startDate}</div>
                  )}
                  {employeeStatus.statusDetails.timeFrom && employeeStatus.statusDetails.timeTo && (
                    <div><strong>Orario:</strong> {employeeStatus.statusDetails.timeFrom} - {employeeStatus.statusDetails.timeTo}</div>
                  )}
                </div>
              )}
              <p className="text-sm font-medium text-red-700 mt-2">
                Contatta un amministratore per gestire questa situazione.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Conflitti minori che bloccano sempre */}
      {employeeStatus.conflictPriority === 1 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Conflitto rilevato:</p>
              {employeeStatus.blockingReasons.map((reason, index) => (
                <p key={index} className="text-sm">• {reason}</p>
              ))}
              <p className="text-sm text-red-600 mt-2">
                Non è possibile duplicare le presenze per la stessa data.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Avvisi per admin su conflitti medi */}
      {employeeStatus.conflictPriority >= 2 && employeeStatus.conflictPriority < 4 && isAdmin && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-bold text-yellow-800">ATTENZIONE AMMINISTRATORE</p>
              <p className="font-medium">Conflitto rilevato ma override possibile:</p>
              {employeeStatus.blockingReasons.map((reason, index) => (
                <p key={index} className="text-sm">• {reason}</p>
              ))}
              {employeeStatus.statusDetails && (
                <div className="mt-3 p-3 bg-yellow-100 rounded text-xs text-yellow-800">
                  <div className="font-semibold mb-1">Dettagli:</div>
                  <div><strong>Tipo:</strong> {employeeStatus.statusDetails.type}</div>
                  {employeeStatus.statusDetails.startDate && (
                    <div><strong>Data:</strong> {employeeStatus.statusDetails.startDate}</div>
                  )}
                  {employeeStatus.statusDetails.notes && (
                    <div><strong>Note:</strong> {employeeStatus.statusDetails.notes}</div>
                  )}
                </div>
              )}
              <p className="text-sm text-yellow-700 font-medium mt-2">
                Come amministratore puoi procedere, ma verifica che sia corretto sovrascrivere questo stato.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Avvisi per richieste pending */}
      {hasWarnings && employeeStatus.currentStatus === 'pending_request' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Informazione:</p>
              {employeeStatus.blockingReasons.map((reason, index) => (
                <p key={index} className="text-sm">• {reason}</p>
              ))}
              <p className="text-sm text-blue-600 mt-2">
                Puoi procedere, ma considera che c'è una richiesta in attesa.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Form con stato disabilitato se necessario */}
      <div className={hasBlockingConflicts ? "opacity-50 pointer-events-none" : ""}>
        {children}
      </div>
    </div>
  );
}
