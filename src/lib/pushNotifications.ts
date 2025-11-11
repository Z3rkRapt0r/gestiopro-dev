/**
 * Sistema di notifiche push per PWA
 * Gestisce la registrazione, la sottoscrizione e l'invio di notifiche push
 */

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Verifica se le notifiche push sono supportate
 */
export const isPushNotificationSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

/**
 * Richiede il permesso per le notifiche
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isPushNotificationSupported()) {
    throw new Error('Le notifiche push non sono supportate in questo browser');
  }

  const permission = await Notification.requestPermission();
  console.log('📱 Permesso notifiche:', permission);

  return permission;
};

/**
 * Ottiene la sottoscrizione push corrente
 */
export const getCurrentPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushNotificationSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('❌ Errore nel recupero della sottoscrizione push:', error);
    return null;
  }
};

/**
 * Crea una nuova sottoscrizione push
 */
export const subscribeToPushNotifications = async (
  vapidPublicKey: string
): Promise<PushSubscriptionData | null> => {
  if (!isPushNotificationSupported()) {
    throw new Error('Le notifiche push non sono supportate in questo browser');
  }

  try {
    // Richiedi permesso se non già concesso
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('⚠️ Permesso notifiche negato');
      return null;
    }

    // Ottieni il service worker registrato
    const registration = await navigator.serviceWorker.ready;

    // Converti la chiave VAPID in formato Uint8Array
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // Crea la sottoscrizione
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    console.log('✅ Sottoscrizione push creata con successo');

    // Converti la sottoscrizione in un formato JSON serializzabile
    const subscriptionData = subscription.toJSON();

    return {
      endpoint: subscriptionData.endpoint!,
      keys: {
        p256dh: subscriptionData.keys!.p256dh!,
        auth: subscriptionData.keys!.auth!
      }
    };
  } catch (error) {
    console.error('❌ Errore nella sottoscrizione push:', error);
    throw error;
  }
};

/**
 * Cancella la sottoscrizione push
 */
export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  try {
    const subscription = await getCurrentPushSubscription();
    if (!subscription) {
      console.warn('⚠️ Nessuna sottoscrizione push da cancellare');
      return false;
    }

    const result = await subscription.unsubscribe();
    console.log('✅ Sottoscrizione push cancellata:', result);

    return result;
  } catch (error) {
    console.error('❌ Errore nella cancellazione della sottoscrizione push:', error);
    return false;
  }
};

/**
 * Mostra una notifica locale (non push)
 */
export const showLocalNotification = async (
  title: string,
  options?: NotificationOptions
): Promise<void> => {
  if (!isPushNotificationSupported()) {
    console.warn('⚠️ Notifiche non supportate');
    return;
  }

  // Verifica il permesso
  if (Notification.permission !== 'granted') {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('⚠️ Permesso notifiche negato');
      return;
    }
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      ...options
    });

    console.log('✅ Notifica locale mostrata');
  } catch (error) {
    console.error('❌ Errore nella visualizzazione della notifica:', error);
  }
};

/**
 * Utility: Converte una stringa base64 URL-safe in Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Verifica lo stato delle notifiche
 */
export const getNotificationStatus = (): {
  supported: boolean;
  permission: NotificationPermission | null;
  subscribed: boolean;
} => {
  const supported = isPushNotificationSupported();

  return {
    supported,
    permission: supported ? Notification.permission : null,
    subscribed: false // Verrà aggiornato dinamicamente
  };
};
