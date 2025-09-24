export const config = { runtime: 'edge' };

import { get } from '@vercel/edge-config';

export default async function handler(request: Request) {
  async function safeGetBoolean(key: string): Promise<boolean | undefined> {
    try {
      const value = await get<boolean | undefined>(key);
      return typeof value === 'boolean' ? value : undefined;
    } catch {
      return undefined;
    }
  }

  let maintenance = await safeGetBoolean('maintenance');
  if (typeof maintenance === 'undefined') {
    maintenance = await safeGetBoolean('maintenance-config');
  }

  if (maintenance === true) {
    return new Response('Manutenzione in corso', {
      status: 503,
      headers: {
        'Retry-After': '3600',
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
    // Variante B: pagina statica (se crei public/maintenance.html)
    // return fetch(new URL('/maintenance.html', request.url));
  }

  // Maintenance off: forward to original path with bypass flag to avoid re-routing to the guard
  const url = new URL(request.url);
  if (!url.searchParams.has('__bypass_guard')) {
    url.searchParams.set('__bypass_guard', '1');
  }
  return fetch(url.toString(), request);
}
