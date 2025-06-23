
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Shield, User, Database, RefreshCw } from 'lucide-react';

const AuthDebugInfo = () => {
  const { user, profile, session } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkAuthState = async () => {
    setIsLoading(true);
    try {
      // Verifica sessione corrente
      const { data: sessionData } = await supabase.auth.getSession();
      
      // Verifica utenti nel database
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      // Conta utenti admin
      const adminUsers = profiles?.filter(p => p.role === 'admin') || [];

      setDebugInfo({
        currentSession: sessionData.session,
        currentUser: user,
        currentProfile: profile,
        allProfiles: profiles,
        profilesError,
        adminCount: adminUsers.length,
        adminUsers: adminUsers.map(u => ({ 
          id: u.id, 
          email: u.email, 
          first_name: u.first_name, 
          last_name: u.last_name,
          role: u.role,
          is_active: u.is_active
        }))
      });

    } catch (error) {
      console.error('Errore durante il debug auth:', error);
      setDebugInfo({ error: error });
    } finally {
      setIsLoading(false);
    }
  };

  const createTestAdmin = async () => {
    try {
      const testEmail = 'admin@test.com';
      const testPassword = 'admin123';
      
      console.log('Creando utente admin di test...');
      
      // Verifica se esiste già
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', testEmail)
        .single();

      if (existingProfile) {
        alert('Utente admin di test già esistente con email: ' + testEmail);
        return;
      }

      // Crea nuovo utente admin
      const { data, error } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        user_metadata: {
          first_name: 'Admin',
          last_name: 'Test',
          role: 'admin'
        }
      });

      if (error) throw error;

      // Crea il profilo
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: testEmail,
            first_name: 'Admin',
            last_name: 'Test',
            role: 'admin',
            is_active: true
          });

        if (profileError) throw profileError;
      }

      alert(`Utente admin creato!\nEmail: ${testEmail}\nPassword: ${testPassword}`);
      checkAuthState();
      
    } catch (error: any) {
      console.error('Errore creazione admin:', error);
      alert('Errore: ' + error.message);
    }
  };

  useEffect(() => {
    checkAuthState();
  }, [user, profile]);

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Shield className="w-5 h-5" />
          Debug Autenticazione
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={checkAuthState} 
            disabled={isLoading} 
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Aggiorna Info
          </Button>
          
          <Button 
            onClick={createTestAdmin} 
            variant="outline"
            size="sm"
            className="bg-green-50 border-green-300"
          >
            <User className="w-4 h-4 mr-2" />
            Crea Admin Test
          </Button>
        </div>

        {debugInfo && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-blue-700">Stato Corrente:</h4>
                <p>User: {user ? '✅ Connesso' : '❌ Non connesso'}</p>
                <p>Profile: {profile ? `✅ ${profile.role}` : '❌ Nessun profilo'}</p>
                <p>Session: {session ? '✅ Attiva' : '❌ Nessuna sessione'}</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-blue-700">Database:</h4>
                <p>Profili totali: {debugInfo.allProfiles?.length || 0}</p>
                <p>Admin trovati: {debugInfo.adminCount}</p>
                {debugInfo.profilesError && (
                  <p className="text-red-600">Errore: {debugInfo.profilesError.message}</p>
                )}
              </div>
            </div>

            {debugInfo.adminUsers && debugInfo.adminUsers.length > 0 && (
              <div>
                <h4 className="font-semibold text-blue-700">Utenti Admin:</h4>
                <div className="bg-white p-2 rounded border max-h-32 overflow-auto">
                  {debugInfo.adminUsers.map((admin: any) => (
                    <div key={admin.id} className="text-xs border-b pb-1 mb-1">
                      <strong>{admin.email}</strong> - {admin.first_name} {admin.last_name}
                      <br />
                      Status: {admin.is_active ? 'Attivo' : 'Inattivo'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {debugInfo.currentProfile && (
              <details className="bg-white p-2 rounded border">
                <summary className="cursor-pointer font-medium">Dettagli Profilo Corrente</summary>
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(debugInfo.currentProfile, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthDebugInfo;
