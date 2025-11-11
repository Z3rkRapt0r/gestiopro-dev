import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Compress JPEG image using canvas-based approach
async function compressJPEG(fileData: Blob): Promise<Blob> {
  try {
    console.log('[Compress] Compressing JPEG image...');

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();

    // Since we're in a Deno environment without canvas,
    // we'll use a quality-based compression approach with browsers' built-in capabilities
    // For production, you might want to integrate with an image processing service

    // Create a reduced quality version by re-encoding
    // This is a simplified approach - for better compression, use sharp or similar
    const originalSize = fileData.size;

    // If file is already small (< 500KB), don't compress
    if (originalSize < 500 * 1024) {
      console.log('[Compress] File already small, skipping compression');
      return fileData;
    }

    // For now, we'll use a simple approach:
    // Read the image, and create a new blob with reduced quality
    // This requires proper image library integration

    // Placeholder: Return original (compression would require sharp or imagescript)
    console.log('[Compress] JPEG compression requires additional libraries');
    console.log('[Compress] Consider using sharp for production: https://github.com/lovell/sharp');
    return fileData;

  } catch (error) {
    console.error('[Compress] Error compressing JPEG:', error);
    return fileData;
  }
}

// Compress PDF - simplified version
async function compressPDF(fileData: Blob): Promise<Blob> {
  try {
    console.log('[Compress] PDF compression requested');

    // PDF compression is complex and requires specialized libraries
    // For production, consider using:
    // - pdf-lib: https://pdf-lib.js.org/
    // - ghostscript-based solutions
    // - External compression API services

    const originalSize = fileData.size;

    // If PDF is already small (< 1MB), don't compress
    if (originalSize < 1024 * 1024) {
      console.log('[Compress] PDF already small, skipping compression');
      return fileData;
    }

    console.log('[Compress] PDF compression requires additional libraries');
    console.log('[Compress] Consider using pdf-lib or external service for production');
    return fileData;

  } catch (error) {
    console.error('[Compress] Error compressing PDF:', error);
    return fileData;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[Compress Document] Starting compression function')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { documentId, filePath, fileType } = await req.json()

    if (!documentId || !filePath) {
      console.error('[Compress Document] Document ID and file path are required')
      return new Response(
        JSON.stringify({ error: 'Document ID and file path are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('[Compress Document] Processing document:', documentId, 'Type:', fileType)

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath)

    if (downloadError || !fileData) {
      console.error('[Compress Document] Error downloading file:', downloadError)
      return new Response(
        JSON.stringify({ error: 'Failed to download file' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const originalSize = fileData.size;
    console.log('[Compress Document] Original file size:', originalSize, 'bytes')

    // Compress based on file type
    let compressedBlob: Blob;

    if (fileType?.includes('jpeg') || fileType?.includes('jpg')) {
      compressedBlob = await compressJPEG(fileData);
    } else if (fileType?.includes('pdf')) {
      compressedBlob = await compressPDF(fileData);
    } else {
      console.log('[Compress Document] Unsupported file type for compression:', fileType)
      compressedBlob = fileData;
    }

    const compressedSize = compressedBlob.size;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

    console.log('[Compress Document] Compressed size:', compressedSize, 'bytes')
    console.log('[Compress Document] Compression ratio:', compressionRatio, '%')

    // Only upload if we achieved compression
    if (compressedSize < originalSize) {
      console.log('[Compress Document] Uploading compressed file...')

      // Upload compressed file (overwrite original)
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, compressedBlob, {
          upsert: true,
          contentType: fileType
        })

      if (uploadError) {
        console.error('[Compress Document] Error uploading compressed file:', uploadError)
        return new Response(
          JSON.stringify({ error: 'Failed to upload compressed file' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        )
      }

      // Update database with new file size
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          file_size: compressedSize,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      if (updateError) {
        console.error('[Compress Document] Error updating document size:', updateError)
      }

      console.log('[Compress Document] Document compressed successfully')

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Document compressed successfully',
          originalSize,
          compressedSize,
          compressionRatio: parseFloat(compressionRatio),
          saved: originalSize - compressedSize
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else {
      console.log('[Compress Document] No compression achieved, keeping original')

      return new Response(
        JSON.stringify({
          success: true,
          message: 'No compression achieved, kept original',
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

  } catch (error) {
    console.error('[Compress Document] Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
