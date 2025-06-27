
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';

interface LeaveOverlapValidationProps {
  children: React.ReactNode;
  userId?: string;
  leaveType: 'ferie' | 'permesso';
  startDate?: string;
  endDate?: string;
  singleDay?: string;
  onValidationChange?: (isValid: boolean, message?: string) => void;
}

export function LeaveOverlapValidation({ 
  children, 
  userId,
  leaveType,
  startDate,
  endDate,
  singleDay,
  onValidationChange 
}: LeaveOverlapValidationProps) {
  const { user, profile } = useAuth();
  const targetUserId = userId || user?.id;
  const isAdmin = profile?.role === 'admin';

  const { data: conflictingRequests, isLoading } = useQuery({
    queryKey: ['leave-overlap-validation', targetUserId, leaveType, startDate, endDate, singleDay],
    queryFn: async () => {
      if (!targetUserId || (!startDate && !singleDay)) return [];
      
      console.log('🔍 Controllo sovrapposizioni ferie/permessi per:', {
        userId: targetUserId,
        leaveType,
        startDate,
        endDate,
        singleDay
      });

      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('status', 'approved')
        .neq('type', leaveType); // Cerca conflitti con l'altro tipo

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Filtra solo le richieste che si sovrappongono con le date specificate
      const overlappingRequests = data.filter(request => {
        // Data singola (permesso o ferie di un giorno)
        if (singleDay) {
          const checkDate = parseISO(singleDay);
          
          // Se la richiesta esistente è per ferie multi-giorno
          if (request.type === 'ferie' && request.date_from && request.date_to) {
            const existingStart = parseISO(request.date_from);
            const existingEnd = parseISO(request.date_to);
            return isWithinInterval(checkDate, { start: existingStart, end: existingEnd });
          }
          
          // Se la richiesta esistente è per un giorno singolo
          if (request.day) {
            return request.day === singleDay;
          }
        }
        
        // Range di date (ferie multi-giorno)
        if (startDate && endDate) {
          const newStart = parseISO(startDate);
          const newEnd = parseISO(endDate);
          
          // Se la richiesta esistente è per ferie multi-giorno
          if (request.date_from && request.date_to) {
            const existingStart = parseISO(request.date_from);
            const existingEnd = parseISO(request.date_to);
            
            // Controlla sovrapposizione tra intervalli
            return (newStart <= existingEnd && newEnd >= existingStart);
          }
          
          // Se la richiesta esistente è per un giorno singolo
          if (request.day) {
            const existingDate = parseISO(request.day);
            return isWithinInterval(existingDate, { start: newStart, end: newEnd });
          }
        }
        
        return false;
      });

      console.log('🚨 Richieste in conflitto trovate:', overlappingRequests.length);
      return overlappingRequests;
    },
    enabled: !!targetUserId && (!!startDate || !!singleDay),
  });

  const hasConflict = conflictingRequests && conflictingRequests.length > 0;
  const conflictRequest = hasConflict ? conflictingRequests[0] : null;

  // Notifica il componente padre dello stato di validazione
  React.useEffect(() => {
    if (onValidationChange) {
      if (hasConflict && conflictRequest) {
        const conflictMessage = `Sovrapposizione rilevata: esiste già una richiesta di ${conflictRequest.type} approvata per questo periodo`;
        onValidationChange(false, conflictMessage);
      } else {
        onValidationChange(true);
      }
    }
  }, [hasConflict, conflictRequest, onValidationChange]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-16 rounded"></div>
        {children}
      </div>
    );
  }

  if (hasConflict && conflictRequest) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">
                Sovrapposizione non consentita
              </p>
              <p>
                Non è possibile assegnare <strong>{leaveType}</strong> e <strong>{conflictRequest.type}</strong> 
                allo stesso dipendente nello stesso periodo.
              </p>
              <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                <p><strong>Richiesta esistente:</strong></p>
                <p><strong>Tipo:</strong> {conflictRequest.type}</p>
                {conflictRequest.date_from && conflictRequest.date_to && (
                  <p><strong>Periodo:</strong> {conflictRequest.date_from} - {conflictRequest.date_to}</p>
                )}
                {conflictRequest.day && (
                  <p><strong>Giorno:</strong> {conflictRequest.day}</p>
                )}
                {conflictRequest.time_from && conflictRequest.time_to && (
                  <p><strong>Orario:</strong> {conflictRequest.time_from} - {conflictRequest.time_to}</p>
                )}
                {conflictRequest.note && (
                  <p><strong>Note:</strong> {conflictRequest.note}</p>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {isAdmin 
                  ? 'Come amministratore, modifica o elimina prima la richiesta esistente.'
                  : 'Contatta un amministratore per risolvere questo conflitto.'
                }
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
