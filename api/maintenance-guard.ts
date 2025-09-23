export const config = { runtime: 'edge' };

import { get } from '@vercel/edge-config';

export default async function handler(request: Request) {
  let maintenance = await get<boolean>('maintenance');
  if (typeof maintenance === 'undefined') {
    maintenance = await get<boolean>('maintenance-config');
  }

  if (maintenance) {
    return new Response('Manutenzione in corso', {
      status: 503,
      headers: { 'Retry-After': '3600', 'Content-Type': 'text/plain; charset=utf-8' }
    });

    // Variante B: pagina statica (se crei public/maintenance.html)
    // return fetch(new URL('/maintenance.html', request.url));
  }

  return fetch(request);
}
