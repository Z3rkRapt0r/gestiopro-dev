import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useSupabaseConfig() {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [serviceRoleKey, setServiceRoleKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch configurazione esistente
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch configurazione dalla tabella app_config
      const { data, error: fetchError } = await supabase
        .from('app_config')
        .select('project_ref, anon_key, service_role_key')
        .eq('id', 1)
        .single();

      if (fetchError) {
        // Se il record non esiste ancora, è normale (prima configurazione)
        if (fetchError.code === 'PGRST116') {
          console.log('Nessuna configurazione Supabase trovata, prima configurazione');
          return;
        }
        throw fetchError;
      }

      if (data) {
        setSupabaseUrl(data.project_ref || '');
        setAnonKey(data.anon_key || '');
        setServiceRoleKey(data.service_role_key || '');
      }

    } catch (err) {
      console.error('Error fetching Supabase config:', err);
      setError(err instanceof Error ? err.message : 'Errore nel caricamento della configurazione');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Validazione base
      if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        throw new Error('Tutti i campi sono obbligatori');
      }

      // Validazione formato URL
      try {
        new URL(supabaseUrl);
      } catch {
        throw new Error('URL non valido. Deve essere nel formato: https://xxx.supabase.co');
      }

      // Validazione Anon Key (deve iniziare con eyJ)
      if (!anonKey.startsWith('eyJ')) {
        throw new Error('Anon Key non valida. Deve iniziare con "eyJ"');
      }

      // Validazione Service Role Key (obbligatoria)
      if (!serviceRoleKey.startsWith('eyJ')) {
        throw new Error('Service Role Key non valida. Deve iniziare con "eyJ"');
      }

      // Verifica se esiste già un record in app_config
      const { data: existingRecord, error: checkError } = await supabase
        .from('app_config')
        .select('id')
        .eq('id', 1)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingRecord) {
        // UPDATE del record esistente
        const { error: updateError } = await supabase
          .from('app_config')
          .update({
            project_ref: supabaseUrl.trim(),
            anon_key: anonKey.trim(),
            service_role_key: serviceRoleKey.trim(),
          })
          .eq('id', 1);

        if (updateError) throw updateError;
      } else {
        // INSERT di un nuovo record
        const { error: insertError } = await supabase
          .from('app_config')
          .insert({
            id: 1,
            project_ref: supabaseUrl.trim(),
            anon_key: anonKey.trim(),
            service_role_key: serviceRoleKey.trim(),
          });

        if (insertError) throw insertError;
      }

      setSuccessMessage('✅ Configurazione Supabase salvata con successo!');

      toast({
        title: 'Configurazione salvata',
        description: 'La configurazione Supabase è stata aggiornata correttamente.',
      });

      // Nascondi il messaggio di successo dopo 5 secondi
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

    } catch (err) {
      console.error('Error saving Supabase config:', err);
      const errorMessage = err instanceof Error ? err.message : 'Errore nel salvataggio della configurazione';
      setError(errorMessage);

      toast({
        title: 'Errore',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    setSupabaseUrl,
    setAnonKey,
    setServiceRoleKey,
    isSaving,
    isLoading,
    error,
    successMessage,
    handleSave,
    refreshConfig: fetchConfig,
  };
}


