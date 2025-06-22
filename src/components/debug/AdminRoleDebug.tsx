
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Database, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const AdminRoleDebug = () => {
  const { profile } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      // Verifica profili
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      // Verifica utenti auth (solo count, non possiamo accedere ai dati)
      const { count: authUsersCount, error: authError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Verifica profili orfani (senza corrispondenza in auth)
      const profileIds = profiles?.map(p => p.id) || [];
      
      setDebugInfo({
        profiles: profiles || [],
        profilesError,
        authUsersCount,
        authError,
        orphanedProfiles: [], // Non possiamo verificare facilmente
        duplicateEmails: findDuplicateEmails(profiles || [])
      });

    } catch (error) {
      console.error('Errore diagnostica:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const findDuplicateEmails = (profiles: any[]) => {
    const emailCounts: { [key: string]: number } = {};
    profiles.forEach(profile => {
      if (profile.email) {
        emailCounts[profile.email] = (emailCounts[profile.email] || 0) + 1;
      }
    });
    return Object.entries(emailCounts)
      .filter(([email, count]) => count > 1)
      .map(([email, count]) => ({ email, count }));
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      runDiagnostics();
    }
  }, [profile]);

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Database className="w-5 h-5" />
          Diagnostica Database (Solo Admin)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={isLoading} variant="outline">
          {isLoading ? 'Analizzando...' : 'Aggiorna Diagnostica'}
        </Button>

        {debugInfo && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Profili totali: {debugInfo.profiles.length}</span>
            </div>

            {debugInfo.duplicateEmails.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div>
                  <span className="font-medium">Email duplicate trovate:</span>
                  <ul className="ml-4 mt-1">
                    {debugInfo.duplicateEmails.map((dup: any) => (
                      <li key={dup.email} className="text-yellow-700">
                        {dup.email} (trovata {dup.count} volte)
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {debugInfo.profilesError && (
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                <span className="text-red-700">
                  Errore profili: {debugInfo.profilesError.message}
                </span>
              </div>
            )}

            <details className="bg-white p-3 rounded border">
              <summary className="cursor-pointer font-medium">Dettagli profili</summary>
              <pre className="mt-2 text-xs overflow-auto max-h-40">
                {JSON.stringify(debugInfo.profiles, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminRoleDebug;
