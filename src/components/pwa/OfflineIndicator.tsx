import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { offlineQueue } from '@/lib/offlineQueue';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // Aggiorna lo stato della connessione
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);

      if (online && !isOnline) {
        // Mostra il badge "Riconnesso" per 3 secondi
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      }
    };

    // Aggiorna il contatore della coda
    const updateQueueCount = () => {
      setQueueCount(offlineQueue.getCount());
    };

    // Listener per eventi di rete
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Listener per eventi della coda
    window.addEventListener('offline-queue-added', updateQueueCount);
    window.addEventListener('offline-queue-processed', updateQueueCount);

    // Inizializza il contatore
    updateQueueCount();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('offline-queue-added', updateQueueCount);
      window.removeEventListener('offline-queue-processed', updateQueueCount);
    };
  }, [isOnline]);

  // Non mostrare nulla se siamo online e non ci sono operazioni in coda
  if (isOnline && queueCount === 0 && !showReconnected) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5">
      {!isOnline ? (
        <Badge variant="destructive" className="shadow-lg px-3 py-2">
          <WifiOff className="h-4 w-4 mr-2" />
          Offline
          {queueCount > 0 && (
            <span className="ml-2 bg-white text-destructive rounded-full px-2 py-0.5 text-xs font-bold">
              {queueCount}
            </span>
          )}
        </Badge>
      ) : showReconnected ? (
        <Badge variant="default" className="shadow-lg px-3 py-2 bg-green-600">
          <Wifi className="h-4 w-4 mr-2" />
          Riconnesso
        </Badge>
      ) : queueCount > 0 ? (
        <Badge variant="secondary" className="shadow-lg px-3 py-2">
          <Wifi className="h-4 w-4 mr-2" />
          Sincronizzazione in corso...
          <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-bold">
            {queueCount}
          </span>
        </Badge>
      ) : null}
    </div>
  );
};
