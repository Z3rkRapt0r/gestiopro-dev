import { registerSW } from 'virtual:pwa-register';

// Registrazione del service worker con gestione aggiornamenti
export const registerServiceWorker = () => {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Evento chiamato quando è disponibile un aggiornamento
      const event = new CustomEvent('pwa-update-available');
      window.dispatchEvent(event);
    },
    onOfflineReady() {
      // Evento chiamato quando l'app è pronta per uso offline
      console.log('✅ App pronta per uso offline');
      const event = new CustomEvent('pwa-offline-ready');
      window.dispatchEvent(event);
    },
  });

  return updateSW;
};

// Verifica se l'app è in esecuzione in modalità standalone (installata come PWA)
export const isStandalone = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

// Verifica se l'app è offline
export const isOffline = (): boolean => {
  return !navigator.onLine;
};
