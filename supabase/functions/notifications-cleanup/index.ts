// ============================================================================
// EDGE FUNCTION: NOTIFICATIONS CLEANUP
// ============================================================================
// Edge function per il cleanup automatico delle notifiche
// Chiamabile via cron job o manualmente
// Data: 2025-01-17

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================================
// INTERFACES
// ============================================================================

interface CleanupConfig {
  table_name: string
  retention_days: number
  is_enabled: boolean
}

interface CleanupResult {
  table_name: string
  deleted_count: number
  execution_time_ms: number
  success: boolean
  error?: string
}

interface CleanupStats {
  table_name: string
  retention_days: number
  is_enabled: boolean
  last_cleanup_at: string | null
  last_cleaned_count: number
  total_records: number
  old_records_count: number
}

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

async function cleanupTable(
  supabase: any,
  tableName: string,
  retentionDays: number
): Promise<CleanupResult> {
  const startTime = Date.now()
  
  try {
    console.log(`🧹 Starting cleanup for ${tableName} (retention: ${retentionDays} days)`)
    
    // Esegui cleanup
    const { data, error } = await supabase.rpc('cleanup_old_records', {
      target_table: tableName,
      date_column: 'created_at'
    })
    
    if (error) {
      throw error
    }
    
    const deletedCount = data?.[0]?.deleted_count || 0
    const executionTime = Date.now() - startTime
    
    console.log(`✅ Cleanup completed for ${tableName}: ${deletedCount} records deleted in ${executionTime}ms`)
    
    return {
      table_name: tableName,
      deleted_count: deletedCount,
      execution_time_ms: executionTime,
      success: true
    }
    
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error(`❌ Cleanup failed for ${tableName}:`, error)
    
    return {
      table_name: tableName,
      deleted_count: 0,
      execution_time_ms: executionTime,
      success: false,
      error: error.message
    }
  }
}

async function getCleanupStats(supabase: any): Promise<CleanupStats[]> {
  try {
    const { data, error } = await supabase
      .from('cleanup_config')
      .select('*')
      .order('table_name')
    
    if (error) throw error
    // Se la tabella è vuota o mancante, usa una configurazione di default per le notifiche
    const effectiveConfigs: CleanupConfig[] = (data && data.length > 0)
      ? data
      : [
          { table_name: 'notifications', retention_days: 30, is_enabled: true },
          { table_name: 'sent_notifications', retention_days: 90, is_enabled: true }
        ]

    // Aggiungi statistiche per ogni tabella
    const stats = await Promise.all(effectiveConfigs.map(async (config: CleanupConfig) => {
      // Conta record totali
      const { count: totalRecords } = await supabase
        .from(config.table_name)
        .select('*', { count: 'exact', head: true })
      
      // Conta record vecchi
      const { count: oldRecords } = await supabase
        .from(config.table_name)
        .select('*', { count: 'exact', head: true })
        .lt('created_at', new Date(Date.now() - config.retention_days * 24 * 60 * 60 * 1000).toISOString())
      
      return {
        table_name: config.table_name,
        retention_days: config.retention_days,
        is_enabled: config.is_enabled,
        last_cleanup_at: null, // Verrà aggiornato dopo il cleanup
        last_cleaned_count: 0, // Verrà aggiornato dopo il cleanup
        total_records: totalRecords || 0,
        old_records_count: oldRecords || 0
      }
    }))
    
    return stats
    
  } catch (error) {
    console.error('Error getting cleanup stats:', error)
    throw error
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    // Support both URL query params and JSON body for action selection
    let action = url.searchParams.get('action') || ''
    let dryRun = url.searchParams.get('dry_run') === 'true'

    // If action not provided in URL, try to parse JSON body
    if (!action) {
      try {
        const contentType = req.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const body = await req.json().catch(() => null)
          if (body && typeof body.action === 'string') {
            action = body.action
          }
          if (body && typeof body.dry_run !== 'undefined') {
            dryRun = Boolean(body.dry_run)
          }
        }
      } catch (_) {
        // Ignore body parse errors; fallback to defaults
      }
    }

    // Fallback default action
    if (!action) action = 'cleanup'

    console.log(`🚀 Notifications cleanup function called with action: ${action}, dry_run: ${dryRun}`)

    // ============================================================================
    // GET STATISTICS
    // ============================================================================
    if (action === 'stats') {
      const stats = await getCleanupStats(supabase)
      
      return new Response(
        JSON.stringify({
          success: true,
          action: 'stats',
          data: stats,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // ============================================================================
    // DRY RUN (COUNT ONLY)
    // ============================================================================
    if (action === 'dry_run') {
      const stats = await getCleanupStats(supabase)
      const recordsToDelete = stats.reduce((sum, stat) => sum + stat.old_records_count, 0)
      
      return new Response(
        JSON.stringify({
          success: true,
          action: 'dry_run',
          data: {
            total_records_to_delete: recordsToDelete,
            breakdown: stats.map(stat => ({
              table: stat.table_name,
              records_to_delete: stat.old_records_count,
              retention_days: stat.retention_days
            }))
          },
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // ============================================================================
    // CLEANUP EXECUTION
    // ============================================================================
    if (action === 'cleanup') {
      // Get cleanup configuration
      const { data: configs, error: configError } = await supabase
        .from('cleanup_config')
        .select('*')
        .eq('is_enabled', true)
        .order('table_name')
      
      if (configError) throw configError

      // Fallback di default se non ci sono configurazioni: usa tabelle notifiche
      const effectiveConfigs: CleanupConfig[] = (configs && configs.length > 0)
        ? configs
        : [
            { table_name: 'notifications', retention_days: 30, is_enabled: true },
            { table_name: 'sent_notifications', retention_days: 90, is_enabled: true }
          ]

      const results: CleanupResult[] = []
      let totalDeleted = 0
      let totalExecutionTime = 0
      const startTime = Date.now()

      // Execute cleanup for each configured table
      for (const config of effectiveConfigs) {
        if (dryRun) {
          // For dry run, just count records that would be deleted
          const { count } = await supabase
            .from(config.table_name)
            .select('*', { count: 'exact', head: true })
            .lt('created_at', new Date(Date.now() - config.retention_days * 24 * 60 * 60 * 1000).toISOString())
          
          results.push({
            table_name: config.table_name,
            deleted_count: count || 0,
            execution_time_ms: 0,
            success: true
          })
        } else {
          // Actual cleanup
          const result = await cleanupTable(supabase, config.table_name, config.retention_days)
          results.push(result)
          totalDeleted += result.deleted_count
        }
        
        totalExecutionTime += results[results.length - 1].execution_time_ms
      }

      const overallExecutionTime = Date.now() - startTime

      // Log the operation
      if (!dryRun) {
        await supabase
          .from('cleanup_logs')
          .insert({
            table_name: 'notifications_cleanup_batch',
            records_deleted: totalDeleted,
            retention_days: 0, // Mixed retention days
            execution_time_ms: overallExecutionTime
          })
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: dryRun ? 'dry_run' : 'cleanup',
          data: {
            total_records_deleted: totalDeleted,
            total_execution_time_ms: overallExecutionTime,
            results: results,
            timestamp: new Date().toISOString()
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // ============================================================================
    // UNKNOWN ACTION
    // ============================================================================
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unknown action: ${action}. Available actions: cleanup, dry_run, stats`,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )

  } catch (error) {
    console.error('❌ Edge function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/notifications-cleanup' \
    --header 'Authorization: Bearer [YOUR_ANON_KEY]' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/notifications-cleanup?action=stats' \
    --header 'Authorization: Bearer [YOUR_ANON_KEY]'

  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/notifications-cleanup?action=dry_run' \
    --header 'Authorization: Bearer [YOUR_ANON_KEY]'

  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/notifications-cleanup?action=cleanup&dry_run=true' \
    --header 'Authorization: Bearer [YOUR_ANON_KEY]'
*/
