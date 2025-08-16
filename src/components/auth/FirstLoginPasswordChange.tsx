import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Eye, EyeOff, Shield, Building, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useLoginSettings } from '@/hooks/useLoginSettings';
import { useAuth } from '@/hooks/useAuth';

const FirstLoginPasswordChange = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { settings: loginSettings, loading: settingsLoading } = useLoginSettings();
  const { profile, user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [keepCurrentPassword, setKeepCurrentPassword] = useState(false);

  // Reindirizza se l'utente non è autenticato o non è al primo accesso
  useEffect(() => {
    if (!user || !profile) {
      navigate('/');
      return;
    }

    if (profile.role === 'admin') {
      // Gli admin non hanno bisogno di cambiare password al primo accesso
      navigate('/');
      return;
    }

    // Verifica se l'utente è effettivamente al primo accesso
    checkFirstLoginStatus();
  }, [user, profile, navigate]);

  const checkFirstLoginStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_login')
        .eq('id', profile?.id)
        .single();

      if (error) {
        console.error('Error checking first login status:', error);
        return;
      }

      if (!data.first_login) {
        // L'utente ha già effettuato il primo accesso
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking first login status:', error);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (keepCurrentPassword) {
      // L'utente vuole mantenere la password attuale
      await markFirstLoginComplete();
      return;
    }

    // Validazioni
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi richiesti",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Errore",
        description: "Le nuove password non coincidono",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Errore",
        description: "La nuova password deve essere di almeno 6 caratteri",
        variant: "destructive",
      });
      return;
    }

    if (newPassword === currentPassword) {
      toast({
        title: "Errore",
        description: "La nuova password deve essere diversa da quella attuale",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Prima verifica la password attuale
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        toast({
          title: "Password attuale errata",
          description: "La password attuale non è corretta",
          variant: "destructive",
        });
        return;
      }

      // Aggiorna la password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // Marca il primo accesso come completato
      await markFirstLoginComplete();

      toast({
        title: "Password aggiornata",
        description: "La tua password è stata aggiornata con successo. Reindirizzamento alla dashboard...",
      });

    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento della password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markFirstLoginComplete = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ first_login: false })
        .eq('id', profile?.id);

      if (error) {
        console.error('Error marking first login complete:', error);
      }

      // Forza un refresh della pagina per aggiornare il contesto dell'applicazione
      // Questo assicura che il profilo aggiornato venga caricato
      window.location.href = profile?.role === 'admin' ? '/admin' : '/';
      
    } catch (error) {
      console.error('Error marking first login complete:', error);
      // Reindirizza comunque in base al ruolo
      window.location.href = profile?.role === 'admin' ? '/admin' : '/';
    }
  };

  if (settingsLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: loginSettings.background_color }}
      >
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-0">
            <CardContent className="p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: loginSettings.primary_color }}></div>
              <p className="text-center mt-4 text-sm" style={{ color: loginSettings.secondary_color }}>
                Caricamento...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: loginSettings.background_color }}
    >
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold" style={{ color: loginSettings.primary_color }}>
              Benvenuto {profile?.first_name || 'utente'}!
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Questa è la tua prima volta nel sistema. Per motivi di sicurezza, ti consigliamo di cambiare la password assegnata dall'amministratore.
              </p>
              <p className="text-xs text-gray-500">
                Puoi anche scegliere di mantenere la password attuale se preferisci.
              </p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Opzione per mantenere la password attuale */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="keep-current"
                  checked={keepCurrentPassword}
                  onChange={(e) => setKeepCurrentPassword(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="keep-current" className="text-sm text-gray-600">
                  Mantieni la password attuale
                </Label>
              </div>

              {!keepCurrentPassword && (
                <>
                  {/* Password attuale */}
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Password Attuale</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Inserisci la password attuale"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Nuova password */}
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nuova Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Inserisci la nuova password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Minimo 6 caratteri
                    </p>
                  </div>

                  {/* Conferma nuova password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Conferma Nuova Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Conferma la nuova password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                style={{ backgroundColor: loginSettings.primary_color }}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {keepCurrentPassword ? 'Completando...' : 'Aggiornando...'}
                  </>
                ) : (
                  keepCurrentPassword ? 'Continua con Password Attuale' : 'Aggiorna Password'
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                <Building className="inline w-3 h-3 mr-1" />
                {loginSettings.company_name}
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Footer con branding */}
        <div className="text-center mt-6">
          <p className="text-xs opacity-75 text-gray-600">
            Powered by{' '}
            <a 
              href="https://licenseglobal.it" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline font-medium"
              style={{ color: '#f97316' }}
            >
              License Global
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FirstLoginPasswordChange;
