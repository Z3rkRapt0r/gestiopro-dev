
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertCircle } from 'lucide-react';
import { AdminLeaveBalanceValidation } from '@/hooks/useAdminLeaveBalanceValidation';
import { LeaveBalanceValidation } from '@/hooks/useLeaveBalanceValidation';

interface LeaveBalanceDisplayProps {
  balance: AdminLeaveBalanceValidation | LeaveBalanceValidation;
  isLoading?: boolean;
}

export function LeaveBalanceDisplay({ balance, isLoading }: LeaveBalanceDisplayProps) {
  if (isLoading) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Caricamento bilancio...
        </AlertDescription>
      </Alert>
    );
  }

  if (!balance?.hasBalance) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1">
            <p className="font-medium">Bilancio non configurato</p>
            <p className="text-sm">
              Non è possibile richiedere ferie o permessi senza un bilancio configurato per l'anno corrente.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-medium">Bilancio disponibile:</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Ferie:</span>
              <div className={`${balance.remainingVacationDays <= 5 ? 'text-orange-600' : 'text-green-600'}`}>
                {balance.remainingVacationDays} giorni rimanenti
              </div>
              <div className="text-gray-500 text-xs">
                (su {('totalVacationDays' in balance) ? balance.totalVacationDays : balance.remainingVacationDays} totali)
              </div>
            </div>
            <div>
              <span className="font-medium">Permessi:</span>
              <div className={`${balance.remainingPermissionHours <= 8 ? 'text-orange-600' : 'text-green-600'}`}>
                {balance.remainingPermissionHours} ore rimanenti
              </div>
              <div className="text-gray-500 text-xs">
                (su {('totalPermissionHours' in balance) ? balance.totalPermissionHours : balance.remainingPermissionHours} totali)
              </div>
            </div>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
