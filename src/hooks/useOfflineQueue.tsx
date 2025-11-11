import { useState, useEffect, useCallback } from 'react';
import { offlineQueue, QueuedOperation } from '@/lib/offlineQueue';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useOfflineQueue = () => {
  const [queueCount, setQueueCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Aggiorna il conteggio della coda
  const updateCount = useCallback(() => {
    setQueueCount(offlineQueue.getCount());
  }, []);

  // Processa un'operazione dalla coda
  const processOperation = useCallback(async (operation: QueuedOperation) => {
    switch (operation.type) {
      case 'attendance-checkin':
        await supabase
          .from('attendances')
          .insert({
            user_id: operation.data.user_id,
            date: operation.data.date,
            check_in_time: operation.data.check_in_time,
            check_in_latitude: operation.data.check_in_latitude,
            check_in_longitude: operation.data.check_in_longitude
          });
        break;

      case 'attendance-checkout':
        await supabase
          .from('attendances')
          .update({
            check_out_time: operation.data.check_out_time,
            check_out_latitude: operation.data.check_out_latitude,
            check_out_longitude: operation.data.check_out_longitude
          })
          .eq('id', operation.data.attendance_id);
        break;

      case 'overtime':
        await supabase
          .from('overtime_records')
          .insert(operation.data);
        break;

      case 'leave-request':
        await supabase
          .from('leave_requests')
          .insert(operation.data);
        break;

      default:
        throw new Error(`Tipo di operazione non supportato: ${operation.type}`);
    }
  }, []);

  // Processa tutta la coda
  const processQueue = useCallback(async () => {
    if (isProcessing || queueCount === 0) return;

    setIsProcessing(true);

    try {
      await offlineQueue.processQueue(processOperation);

      if (offlineQueue.getCount() === 0) {
        toast({
          title: "Sincronizzazione completata",
          description: "Tutte le operazioni offline sono state sincronizzate.",
        });
      }
    } catch (error) {
      console.error('Errore nel processamento della coda:', error);
      toast({
        title: "Errore di sincronizzazione",
        description: "Alcune operazioni non sono state sincronizzate. Riproveremo automaticamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      updateCount();
    }
  }, [isProcessing, queueCount, processOperation, toast, updateCount]);

  // Setup event listeners
  useEffect(() => {
    updateCount();

    // Listener per aggiornamenti della coda
    const handleQueueUpdate = () => updateCount();

    // Listener per processare la coda quando torna online
    const handleProcessQueue = () => processQueue();

    window.addEventListener('offline-queue-added', handleQueueUpdate);
    window.addEventListener('offline-queue-processed', handleQueueUpdate);
    window.addEventListener('process-offline-queue', handleProcessQueue);

    // Listener per eventi di successo/fallimento
    const handleSuccess = (event: CustomEvent) => {
      const { operation } = event.detail;
      toast({
        title: "Operazione sincronizzata",
        description: `${operation.type} eseguita con successo.`,
      });
    };

    const handleFailure = (event: CustomEvent) => {
      const { operation } = event.detail;
      toast({
        title: "Operazione fallita",
        description: `Impossibile sincronizzare ${operation.type}. Riproveremo più tardi.`,
        variant: "destructive"
      });
    };

    window.addEventListener('offline-queue-processed', handleSuccess as EventListener);
    window.addEventListener('offline-queue-failed', handleFailure as EventListener);

    return () => {
      window.removeEventListener('offline-queue-added', handleQueueUpdate);
      window.removeEventListener('offline-queue-processed', handleQueueUpdate);
      window.removeEventListener('process-offline-queue', handleProcessQueue);
      window.removeEventListener('offline-queue-processed', handleSuccess as EventListener);
      window.removeEventListener('offline-queue-failed', handleFailure as EventListener);
    };
  }, [processQueue, toast, updateCount]);

  // Aggiunge un'operazione alla coda
  const addToQueue = useCallback((
    type: QueuedOperation['type'],
    data: any
  ): string => {
    const id = offlineQueue.add(type, data);
    updateCount();

    toast({
      title: "Operazione salvata",
      description: "L'operazione verrà sincronizzata quando tornerai online.",
    });

    return id;
  }, [toast, updateCount]);

  return {
    queueCount,
    isProcessing,
    addToQueue,
    processQueue,
    clearQueue: () => {
      offlineQueue.clear();
      updateCount();
    }
  };
};
