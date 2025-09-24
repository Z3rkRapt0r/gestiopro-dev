export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  async function safeGetString(key: string): Promise<string | undefined> {
    try {
      const { get } = await import('@vercel/edge-config');
      const value = await get<string | undefined>(key);
      return typeof value === 'string' ? value : undefined;
    } catch {
      return undefined;
    }
  }

  async function safeGetBoolean(key: string): Promise<boolean | undefined> {
    try {
      const { get } = await import('@vercel/edge-config');
      const value = await get<boolean | undefined>(key);
      return typeof value === 'boolean' ? value : undefined;
    } catch {
      return undefined;
    }
  }

  // Controlla lo stato di manutenzione
  let maintenance = await safeGetBoolean('maintenance');
  if (typeof maintenance === 'undefined') {
    maintenance = await safeGetBoolean('maintenance-config');
  }

  // Controlla lo stato dell'abbonamento
  let subscriptionExpired = await safeGetBoolean('subscription-expired');
  if (typeof subscriptionExpired === 'undefined') {
    subscriptionExpired = await safeGetBoolean('subscription_expired');
  }

  // Controlla il tipo di messaggio da mostrare
  let messageType = await safeGetString('maintenance-message-type');
  if (typeof messageType === 'undefined') {
    messageType = await safeGetString('message_type');
  }

  // Env var override per casi dove Edge Config non è disponibile
  if (typeof maintenance === 'undefined') {
    const envOverride = (process as any)?.env?.MAINTENANCE_MODE;
    if (typeof envOverride === 'string') {
      const normalized = envOverride.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        maintenance = true;
      } else if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        maintenance = false;
      }
    }
  }

  if (typeof subscriptionExpired === 'undefined') {
    const envOverride = (process as any)?.env?.SUBSCRIPTION_EXPIRED;
    if (typeof envOverride === 'string') {
      const normalized = envOverride.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        subscriptionExpired = true;
      }
    }
  }

  // Header override per debugging/test
  if (typeof maintenance === 'undefined') {
    const headerOverride = request.headers.get('x-force-maintenance');
    if (headerOverride === '1' || headerOverride === 'true') {
      maintenance = true;
    }
  }

  if (typeof subscriptionExpired === 'undefined') {
    const headerOverride = request.headers.get('x-force-subscription-expired');
    if (headerOverride === '1' || headerOverride === 'true') {
      subscriptionExpired = true;
    }
  }

  // Debug log per verificare i valori nei log di Vercel
  try { 
    console.log('[maintenance-guard] maintenance =', maintenance); 
    console.log('[maintenance-guard] subscriptionExpired =', subscriptionExpired);
    console.log('[maintenance-guard] messageType =', messageType);
  } catch {}

  // Priorità: abbonamento scaduto > manutenzione > normale
  if (subscriptionExpired === true) {
    return fetch(new URL('/subscription-expired.html', request.url));
  }

  if (maintenance === true) {
    // Determina quale pagina mostrare in base al tipo di messaggio
    switch (messageType) {
      case 'subscription':
        return fetch(new URL('/subscription-expired.html', request.url));
      case 'custom':
        // Puoi aggiungere altre pagine personalizzate qui
        return fetch(new URL('/maintenance.html', request.url));
      default:
        return fetch(new URL('/maintenance.html', request.url));
    }
  }

  // Nessun blocco: forward al path originale con header per bypassare il guard routing
  const currentUrl = new URL(request.url);
  const originalPath = currentUrl.searchParams.get('__path') || currentUrl.pathname + currentUrl.search;
  const forwardUrl = new URL(originalPath, currentUrl.origin).toString();

  const headers = new Headers(request.headers);
  headers.set('x-bypass-guard', '1');

  const forwardRequest = new Request(forwardUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual'
  });

  return fetch(forwardRequest);
}
