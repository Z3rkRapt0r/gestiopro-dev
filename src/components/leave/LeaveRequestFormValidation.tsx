
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface LeaveRequestValidationProps {
  children: React.ReactNode;
  onValidationChange?: (isValid: boolean, message?: string) => void;
}

export function LeaveRequestFormValidation({ 
  children, 
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

  // Notifica il componente padre dello stato di validazione
  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange(
        !hasPendingRequest, 
        hasPendingRequest ? 'Hai già una richiesta in attesa di approvazione' : undefined
      );
    }
  }, [hasPendingRequest, onValidationChange]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-20 rounded"></div>
        {children}
      </div>
    );
  }

  if (hasPendingRequest) {
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
                Hai già una richiesta di <strong>{pendingRequest?.type}</strong> in attesa di approvazione
                {pendingRequest?.date_from && pendingRequest?.date_to && (
                  <span> dal {pendingRequest.date_from} al {pendingRequest.date_to}</span>
                )}
                {pendingRequest?.day && (
                  <span> per il giorno {pendingRequest.day}</span>
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
}
