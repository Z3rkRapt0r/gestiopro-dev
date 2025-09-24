export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  async function safeGetBoolean(key: string): Promise<boolean | undefined> {
    try {
      const { get } = await import('@vercel/edge-config');
      const value = await get<boolean | undefined>(key);
      return typeof value === 'boolean' ? value : undefined;
    } catch {
      return undefined;
    }
  }

  // Check maintenance mode
  let maintenance = await safeGetBoolean('maintenance');
  if (typeof maintenance === 'undefined') {
    maintenance = await safeGetBoolean('maintenance-config');
  }

  // Check subscription expired mode
  let subscriptionExpired = await safeGetBoolean('subscription-expired');
  if (typeof subscriptionExpired === 'undefined') {
    subscriptionExpired = await safeGetBoolean('subscription_expired');
  }

  // Env var overrides for cases where Edge Config is unavailable
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
      } else if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        subscriptionExpired = false;
      }
    }
  }

  // Header overrides for debugging/tests
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

  // Debug log to verify values on Vercel logs
  try { 
    console.log('[maintenance-guard] maintenance =', maintenance); 
    console.log('[maintenance-guard] subscriptionExpired =', subscriptionExpired); 
  } catch {}

  // Priority: subscription expired > maintenance
  if (subscriptionExpired === true) {
    return fetch(new URL('/subscription-expired.html', request.url));
  }

  if (maintenance === true) {
    return fetch(new URL('/maintenance.html', request.url));
  }

  // Maintenance off: forward to the original path with a header to bypass the guard routing
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
