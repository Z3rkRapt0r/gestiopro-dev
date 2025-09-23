import { NextResponse } from 'next/server'
import { get } from '@vercel/edge-config'

export const config = {
  matcher: ['/((?!_next|favicon.ico|api/health).*)'],
}

export default async function middleware() {
  const maintenance = await get<boolean>('maintenance')
  if (maintenance) {
    return new NextResponse('Manutenzione in corso', {
      status: 503,
      headers: { 'Retry-After': '3600', 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
  return NextResponse.next()
}
