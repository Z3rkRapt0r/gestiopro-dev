
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';
import { LeaveOverlapValidation } from './LeaveOverlapValidation';

interface LeaveRequestValidationProps {
  children: React.ReactNode;
  leaveType?: 'ferie' | 'permesso';
  startDate?: string;
  endDate?: string;
  singleDay?: string;
  onValidationChange?: (isValid: boolean, message?: string) => void;
}

export function LeaveRequestFormValidation({ 
  children, 
  leaveType,
  startDate,
  endDate,
  singleDay,
  onValidationChange 
}: LeaveRequestValidationProps) {
  const { user } = useAuth();

  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ['pending-leave-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const hasPendingRequest = pendingRequests && pendingRequests.length > 0;
  const pendingRequest = hasPendingRequest ? pendingRequests[0] : null;

  // Gestisce i risultati delle validazioni
  const [pendingValidation, setPendingValidation] = React.useState({ isValid: true, message: '' });
  const [overlapValidation, setOverlapValidation] = React.useState({ isValid: true, message: '' });

  // Combina i risultati delle validazioni
  const overallValidation = React.useMemo(() => {
    const isValid = pendingValidation.isValid && overlapValidation.isValid;
    const messages = [pendingValidation.message, overlapValidation.message].filter(Boolean);
    return { isValid, message: messages.join(' ') };
  }, [pendingValidation, overlapValidation]);

  // Notifica il componente padre dello stato di validazione combinato
  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange(overallValidation.isValid, overallValidation.message);
    }
  }, [overallValidation, onValidationChange]);

  // Gestisce la validazione delle richieste pending - ORA BLOCCA
  React.useEffect(() => {
    if (hasPendingRequest) {
      setPendingValidation({
        isValid: false, // CAMBIATO: ora blocca effettivamente
        message: 'Hai già una richiesta in attesa di approvazione'
      });
    } else {
      setPendingValidation({ isValid: true, message: '' });
    }
  }, [hasPendingRequest]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-20 rounded"></div>
        {children}
      </div>
    );
  }

  // Mostra avviso per richieste pending e BLOCCA il form
  const PendingBlockAlert = () => {
    if (!hasPendingRequest) return null;
    
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">
              Non puoi inviare nuove richieste
            </p>
            <p>
              Hai già una richiesta di <strong>{pendingRequest?.type}</strong> in attesa di approvazione
              {pendingRequest?.date_from && pendingRequest?.date_to && (
                <span> dal {pendingRequest.date_from} al {pendingRequest.date_to}</span>
              )}
              {pendingRequest?.day && (
                <span> per il giorno {pendingRequest.day}</span>
              )}
            </p>
            <p className="text-sm">
              Attendi che l'amministratore gestisca la tua richiesta prima di inviarne una nuova.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  // Se abbiamo le informazioni necessarie per la validazione sovrapposizioni, applichiamola
  if (leaveType && (startDate || singleDay)) {
    return (
      <div className="space-y-4">
        <PendingBlockAlert />
        <LeaveOverlapValidation
          leaveType={leaveType}
          startDate={startDate}
          endDate={endDate}
          singleDay={singleDay}
          onValidationChange={(isValid, message) => {
            setOverlapValidation({ isValid, message: message || '' });
          }}
        >
          {children}
        </LeaveOverlapValidation>
      </div>
    );
  }

  // Altrimenti, solo avviso pending
  return (
    <div className="space-y-4">
      <PendingBlockAlert />
      {children}
    </div>
  );
}
