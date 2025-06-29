
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LeaveBalanceDisplay } from './LeaveBalanceDisplay';

interface LeaveRequestFormHeaderProps {
  workingDaysLabels: string[];
  balanceValidation: any;
  isLoadingBalance: boolean;
}

export function LeaveRequestFormHeader({
  workingDaysLabels,
  balanceValidation,
  isLoadingBalance,
}: LeaveRequestFormHeaderProps) {
  return (
    <>
      {workingDaysLabels.length > 0 && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <strong>Giorni lavorativi configurati:</strong> {workingDaysLabels.join(', ')}
            <br />
            <span className="text-sm">
              Solo i giorni lavorativi verranno conteggiati per ferie e permessi.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {balanceValidation && (
        <div className="mb-6">
          <LeaveBalanceDisplay 
            balance={balanceValidation} 
            isLoading={isLoadingBalance}
          />
        </div>
      )}

      {!balanceValidation && !isLoadingBalance && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Errore:</strong> Il bilancio ferie/permessi non è configurato per il tuo account.
            <br />
            <span className="text-sm">
              Contatta l'amministratore per configurare il bilancio prima di poter inviare richieste.
            </span>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
