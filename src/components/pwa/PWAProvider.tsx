import { useEffect, useState } from 'react';
import { registerServiceWorker } from '@/lib/pwa';
import { PWAUpdateNotification } from './PWAUpdateNotification';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { OfflineIndicator } from './OfflineIndicator';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

interface PWAProviderProps {
  children: React.ReactNode;
}

export const PWAProvider = ({ children }: PWAProviderProps) => {
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | undefined>();
  const { processQueue } = useOfflineQueue();

  useEffect(() => {
    // Registra il service worker
    const sw = registerServiceWorker();
    setUpdateSW(() => sw);

    // Listener per processare la coda offline quando torna la connessione
    const handleProcessQueue = () => {
      processQueue();
    };

    window.addEventListener('process-offline-queue', handleProcessQueue);

    // Log quando l'app è pronta offline
    const handleOfflineReady = () => {
      console.log('✅ PWA: App pronta per uso offline');
    };

    window.addEventListener('pwa-offline-ready', handleOfflineReady);

    return () => {
      window.removeEventListener('process-offline-queue', handleProcessQueue);
      window.removeEventListener('pwa-offline-ready', handleOfflineReady);
    };
  }, [processQueue]);

  return (
    <>
      {children}
      <OfflineIndicator />
      <PWAUpdateNotification updateSW={updateSW} />
      <PWAInstallPrompt />
    </>
  );
};
