// This file configures the Supabase client for the application
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Configurazione di fallback per inizializzazione iniziale
// Questi valori vengono usati solo per il primo caricamento,
// poi vengono sovrascritti con i valori dalla tabella app_config
const FALLBACK_URL = "https://nohufgceuqhkycsdffqj.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTEyNzYsImV4cCI6MjA2NTQ2NzI3Nn0.oigK8ck7f_sBeXfJ8P1ySdqMHiVpXdjkoBSR4uMZgRQ";

// Client temporaneo per fetch iniziale della configurazione
const tempClient = createClient<Database>(FALLBACK_URL, FALLBACK_KEY);

// Client principale (verrà inizializzato con la configurazione dal database)
let supabaseClient: SupabaseClient<Database>;
let configLoaded = false;

// Funzione per inizializzare il client con la configurazione dal database
async function initializeSupabaseClient(): Promise<SupabaseClient<Database>> {
  try {
    // Fetch configurazione dalla tabella app_config
    const { data, error } = await tempClient
      .from('app_config')
      .select('project_ref, anon_key')
      .eq('id', 1)
      .single();

    if (error) {
      console.warn('⚠️ Impossibile caricare configurazione da app_config, uso valori di fallback:', error.message);
      supabaseClient = tempClient;
      configLoaded = true;
      return supabaseClient;
    }

    if (data && data.project_ref && data.anon_key) {
      // Costruisci URL completo da project_ref
      const supabaseUrl = data.project_ref.startsWith('http')
        ? data.project_ref
        : `https://${data.project_ref}.supabase.co`;

      console.log('✅ Configurazione Supabase caricata da app_config');

      // Crea nuovo client con configurazione dal database
      supabaseClient = createClient<Database>(supabaseUrl, data.anon_key);
      configLoaded = true;
      return supabaseClient;
    } else {
      console.warn('⚠️ Configurazione incompleta in app_config, uso valori di fallback');
      supabaseClient = tempClient;
      configLoaded = true;
      return supabaseClient;
    }
  } catch (err) {
    console.error('❌ Errore durante il caricamento della configurazione:', err);
    supabaseClient = tempClient;
    configLoaded = true;
    return supabaseClient;
  }
}

// Promise per l'inizializzazione (singleton)
let initPromise: Promise<SupabaseClient<Database>> | null = null;

// Export funzione per ottenere il client (attende l'inizializzazione se necessario)
export async function getSupabase(): Promise<SupabaseClient<Database>> {
  if (configLoaded) {
    return supabaseClient;
  }

  if (!initPromise) {
    initPromise = initializeSupabaseClient();
  }

  return initPromise;
}

// Export sincrono per retrocompatibilità (usa il client temporaneo fino al caricamento)
// DEPRECATO: Usa getSupabase() invece
export const supabase = tempClient;

// Inizializza automaticamente all'import
initializeSupabaseClient();