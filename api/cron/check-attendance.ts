/**
 * Vercel Cron Job per controllo presenze mancanti
 * 
 * Questo endpoint viene chiamato automaticamente da Vercel Cron
 * ogni 15 minuti durante l'orario lavorativo.
 * 
 * Chiama l'Edge Function di Supabase che:
 * 1. Legge i trigger pending
 * 2. Controlla le presenze mancanti
 * 3. Invia email di avviso
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Verifica che sia una chiamata da Vercel Cron
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('[Cron] Starting attendance check...');

    // Chiama l'Edge Function di Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/check-missing-attendance`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({}),
      }
    );

    const data = await response.json();

    console.log('[Cron] Attendance check completed:', data);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        result: data,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Cron] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}


