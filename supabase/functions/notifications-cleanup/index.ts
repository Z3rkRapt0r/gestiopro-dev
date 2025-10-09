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
  tableName: string
): Promise<CleanupResult> {
  const startTime = Date.now()
  
  try {
    console.log(`🧹 Starting cleanup for ${tableName} (deleting all records)`)
    
    // Check if cleanup is enabled for this table
    const { data: config, error: configError } = await supabase
      .from('cleanup_config')
      .select('is_enabled')
      .eq('table_name', tableName)
      .single()
    
    if (configError) {
      console.warn(`Config not found for ${tableName}, proceeding anyway`)
    }
    
    if (config && !config.is_enabled) {
      console.log(`Cleanup disabled for ${tableName}`)
      return {
        table_name: tableName,
        deleted_count: 0,
        execution_time_ms: Date.now() - startTime,
        success: true
      }
    }
    
    // Count records first, then delete them
    let deletedCount = 0
    if (tableName === 'notifications') {
      // Count records first
      const { count: recordCount, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
      
      if (countError) {
        console.error(`Error counting notifications:`, countError)
        throw countError
      }
      
      deletedCount = recordCount || 0
      console.log(`Found ${deletedCount} notifications to delete`)
      
      if (deletedCount > 0) {
        // Delete all records
        const { error } = await supabase
          .from('notifications')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
        
        if (error) {
          console.error(`Error deleting from notifications:`, error)
          throw error
        }
        
        console.log(`Successfully deleted ${deletedCount} notifications`)
      }
    } else if (tableName === 'sent_notifications') {
      // Count records first
      const { count: recordCount, error: countError } = await supabase
        .from('sent_notifications')
        .select('*', { count: 'exact', head: true })
      
      if (countError) {
        console.error(`Error counting sent_notifications:`, countError)
        throw countError
      }
      
      deletedCount = recordCount || 0
      console.log(`Found ${deletedCount} sent_notifications to delete`)
      
      if (deletedCount > 0) {
        // Delete all records
        const { error } = await supabase
          .from('sent_notifications')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
        
        if (error) {
          console.error(`Error deleting from sent_notifications:`, error)
          throw error
        }
        
        console.log(`Successfully deleted ${deletedCount} sent_notifications`)
      }
    }
    
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
      // Conta tutti i record presenti (che saranno eliminati)
      const { count: totalRecords } = await supabase
        .from(config.table_name)
        .select('*', { count: 'exact', head: true })
      
      return {
        table_name: config.table_name,
        retention_days: config.retention_days, // Manteniamo per compatibilità ma non lo usiamo
        is_enabled: config.is_enabled,
        last_cleanup_at: config.last_cleanup_at || null,
        last_cleaned_count: config.last_cleaned_count || 0,
        total_records: totalRecords || 0,
        old_records_count: totalRecords || 0 // Tutti i record saranno eliminati
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
    // Prefer JSON body over URL params to resolve action/dry_run
    let action = ''
    let dryRun = false

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
      // Ignore body parse errors
    }

    // If still not set, fallback to URL params
    if (!action) {
      action = url.searchParams.get('action') || ''
    }
    if (!dryRun) {
      dryRun = url.searchParams.get('dry_run') === 'true'
    }

    // Final fallback default action
    if (!action) action = 'cleanup'

    console.log(`[notifications-cleanup] Resolved action="${action}", dryRun=${dryRun}`)

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
      const recordsToDelete = stats.reduce((sum, stat) => sum + stat.total_records, 0)
      
      return new Response(
        JSON.stringify({
          success: true,
          action: 'dry_run',
          data: {
            total_records_to_delete: recordsToDelete,
            breakdown: stats.map(stat => ({
              table: stat.table_name,
              records_to_delete: stat.total_records,
              is_enabled: stat.is_enabled
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
          // For dry run, just count all records
          const { count } = await supabase
            .from(config.table_name)
            .select('*', { count: 'exact', head: true })
          
          results.push({
            table_name: config.table_name,
            deleted_count: count || 0,
            execution_time_ms: 0,
            success: true
          })
        } else {
          // Actual cleanup - elimina tutti i record
          const result = await cleanupTable(supabase, config.table_name)
          results.push(result)
          totalDeleted += result.deleted_count
        }
        
        totalExecutionTime += results[results.length - 1].execution_time_ms
      }

      const overallExecutionTime = Date.now() - startTime

      // Update cleanup_config with last cleanup info
      if (!dryRun) {
        for (const result of results) {
          if (result.success) {
            await supabase
              .from('cleanup_config')
              .update({
                last_cleanup_at: new Date().toISOString(),
                last_cleaned_count: result.deleted_count
              })
              .eq('table_name', result.table_name)
          }
        }
        
        // Log the operation (optional, if cleanup_logs table exists)
        try {
          await supabase
            .from('cleanup_logs')
            .insert({
              table_name: 'notifications_cleanup_batch',
              records_deleted: totalDeleted,
              retention_days: 0,
              execution_time_ms: overallExecutionTime
            })
        } catch (logError) {
          console.warn('Could not log cleanup operation:', logError)
        }
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
