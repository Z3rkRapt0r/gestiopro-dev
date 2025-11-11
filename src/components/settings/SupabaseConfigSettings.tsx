import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSupabaseConfig } from '@/hooks/useSupabaseConfig';
import { Loader2, Server, Key, AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export function SupabaseConfigSettings() {
  const {
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    setSupabaseUrl,
    setAnonKey,
    setServiceRoleKey,
    isSaving,
    error,
    successMessage,
    handleSave,
  } = useSupabaseConfig();

  const [showAnonKey, setShowAnonKey] = React.useState(false);
  const [showServiceKey, setShowServiceKey] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Configurazione Supabase
        </CardTitle>
        <CardDescription>
          Configura l'URL del progetto e la Service Role Key per il monitoraggio presenze.
          Questi dati sono necessari per inviare le notifiche automatiche.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alert informativo */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Queste impostazioni sono necessarie per il funzionamento
            del sistema di monitoraggio presenze. Configura questi valori una volta quando cloni
            il progetto, senza dover modificare file SQL.
          </AlertDescription>
        </Alert>

        {/* Supabase Project URL */}
        <div className="space-y-2">
          <Label htmlFor="supabase-url" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Project URL <span className="text-red-500">*</span>
          </Label>
          <Input
            id="supabase-url"
            type="url"
            placeholder="https://xxx.supabase.co"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            disabled={isSaving}
          />
          <p className="text-sm text-muted-foreground">
            Trova questo valore in: <strong>Supabase Dashboard → Project Settings → API → Project URL</strong>
          </p>
        </div>

        {/* Anon Key */}
        <div className="space-y-2">
          <Label htmlFor="anon-key" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Anon Key (Public) <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="anon-key"
              type={showAnonKey ? 'text' : 'password'}
              placeholder="eyJ..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              disabled={isSaving}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowAnonKey(!showAnonKey)}
              disabled={isSaving}
            >
              {showAnonKey ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Trova questa chiave in: <strong>Supabase Dashboard → Project Settings → API → anon public</strong>
          </p>
          <Alert className="mt-2 border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-900">
              <strong>INFO:</strong> La Anon Key è sicura da esporre pubblicamente. Viene usata
              dal client per connettersi al database nel rispetto delle regole RLS.
            </AlertDescription>
          </Alert>
        </div>

        {/* Service Role Key (Obbligatoria per Monitoraggio Presenze) */}
        <div className="space-y-2">
          <Label htmlFor="service-role-key" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Service Role Key <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="service-role-key"
              type={showServiceKey ? 'text' : 'password'}
              placeholder="eyJ..."
              value={serviceRoleKey}
              onChange={(e) => setServiceRoleKey(e.target.value)}
              disabled={isSaving}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowServiceKey(!showServiceKey)}
              disabled={isSaving}
            >
              {showServiceKey ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Trova questa chiave in: <strong>Supabase Dashboard → Project Settings → API → service_role secret</strong>
          </p>
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>IMPORTANTE:</strong> Questa chiave è necessaria per il funzionamento del
              monitoraggio presenze automatico (pg_cron). Il cron job deve autenticarsi per chiamare
              le Edge Functions. Mantieni questa chiave sicura - non esporla mai al client.
            </AlertDescription>
          </Alert>
        </div>

        {/* Messaggi di errore/successo */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="border-green-500 bg-green-50 text-green-900">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Pulsante Salva */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || !supabaseUrl || !anonKey || !serviceRoleKey}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              'Salva Configurazione'
            )}
          </Button>
        </div>

        {/* Istruzioni */}
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="font-semibold text-sm">📋 Come trovare questi valori:</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
            <li>Vai su <strong>Supabase Dashboard</strong></li>
            <li>Seleziona il tuo progetto</li>
            <li>Vai in <strong>Project Settings → API</strong></li>
            <li>Copia il <strong>Project URL</strong> (es: https://xxx.supabase.co)</li>
            <li>Copia la <strong>anon public key</strong> (chiave pubblica)</li>
            <li>Copia la <strong>service_role secret key</strong> (necessaria per monitoraggio presenze)</li>
            <li>Incolla tutti e 3 i valori qui sopra e clicca "Salva Configurazione"</li>
          </ol>
        </div>

        {/* Info aggiuntiva */}
        <div className="text-xs text-muted-foreground border-t pt-4">
          <p>
            💡 <strong>Quando cloni il progetto:</strong> Basta configurare questi valori una volta
            dall'interfaccia admin, senza dover modificare file SQL o eseguire script manualmente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}


