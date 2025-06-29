
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
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

  // Usa staleTime più alto per ridurre le query ridondanti
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
    staleTime: 5 * 60 * 1000, // 5 minuti per ridurre le query
    refetchOnWindowFocus: false, // Evita refetch automatici
  });

  // Memoizza i calcoli per evitare re-render
  const validationState = useMemo(() => {
    const hasPendingRequest = pendingRequests && pendingRequests.length > 0;
    const pendingRequest = hasPendingRequest ? pendingRequests[0] : null;
    
    return {
      hasPendingRequest,
      pendingRequest,
      isValid: !hasPendingRequest,
      message: hasPendingRequest ? 'Hai già una richiesta in attesa di approvazione' : ''
    };
  }, [pendingRequests]);

  // Gestisce i risultati delle validazioni
  const [overlapValidation, setOverlapValidation] = React.useState({ isValid: true, message: '' });

  // Combina i risultati delle validazioni
  const overallValidation = useMemo(() => {
    const isValid = validationState.isValid && overlapValidation.isValid;
    const messages = [validationState.message, overlapValidation.message].filter(Boolean);
    return { isValid, message: messages.join(' ') };
  }, [validationState, overlapValidation]);

  // Notifica il componente padre solo quando necessario
  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange(overallValidation.isValid, overallValidation.message);
    }
  }, [overallValidation, onValidationChange]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-20 rounded"></div>
        {children}
      </div>
    );
  }

  // Wrapper con validazione richieste pending
  const PendingValidationWrapper = ({ children }: { children: React.ReactNode }) => {
    if (validationState.hasPendingRequest) {
      return (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  Non puoi inviare una nuova richiesta
                </p>
                <p>
                  Hai già una richiesta di <strong>{validationState.pendingRequest?.type}</strong> in attesa di approvazione
                  {validationState.pendingRequest?.date_from && validationState.pendingRequest?.date_to && (
                    <span> dal {validationState.pendingRequest.date_from} al {validationState.pendingRequest.date_to}</span>
                  )}
                  {validationState.pendingRequest?.day && (
                    <span> per il giorno {validationState.pendingRequest.day}</span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Attendi che l'amministratore approvi o rifiuti la tua richiesta prima di inviarne una nuova.
                </p>
              </div>
            </AlertDescription>
          </Alert>
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
        </div>
      );
    }
    return <>{children}</>;
  };

  // Se abbiamo le informazioni necessarie per la validazione sovrapposizioni, applichiamola
  if (leaveType && (startDate || singleDay)) {
    return (
      <PendingValidationWrapper>
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
      </PendingValidationWrapper>
    );
  }

  // Altrimenti, solo validazione pending
  return (
    <PendingValidationWrapper>
      {children}
    </PendingValidationWrapper>
  );
}
