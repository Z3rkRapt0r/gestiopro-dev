
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, Building, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLoginSettings } from '@/hooks/useLoginSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const NewAuthPage = () => {
  const { signIn, loading } = useAuth();
  const { settings: loginSettings, loading: settingsLoading } = useLoginSettings();
  const { toast } = useToast();
  
  const [authMode, setAuthMode] = useState<'login' | 'forgot-password'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Forgot Password State
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Errore",
        description: "Inserisci email e password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Errore di accesso",
        description: "Credenziali non valide. Verifica email e password.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast({
        title: "Errore",
        description: "Inserisci la tua email",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email inviata",
        description: "Controlla la tua email per le istruzioni di recupero password",
      });
      setAuthMode('login');
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'invio dell'email di recupero",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-20 bg-gray-200 rounded mb-4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ 
        background: `linear-gradient(135deg, ${loginSettings.login_background_color}ee, ${loginSettings.login_background_color})` 
      }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-6">
            {loginSettings.login_logo_url ? (
              <img
                src={loginSettings.login_logo_url}
                alt="Logo"
                className="h-20 w-auto object-contain drop-shadow-lg"
              />
            ) : (
              <div 
                className="p-4 rounded-full shadow-lg"
                style={{ backgroundColor: loginSettings.login_primary_color }}
              >
                <Building className="h-10 w-10 text-white" />
              </div>
            )}
          </div>
          <h1 
            className="text-4xl font-bold mb-3 drop-shadow-sm"
            style={{ color: loginSettings.login_primary_color }}
          >
            {loginSettings.login_company_name}
          </h1>
          <p 
            className="text-lg"
            style={{ color: loginSettings.login_secondary_color }}
          >
            Sistema di Gestione Aziendale
          </p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">
              {authMode === 'login' ? 'Accesso' : 'Recupera Password'}
            </CardTitle>
            {authMode === 'forgot-password' && (
              <p className="text-sm text-gray-600 mt-2">
                Inserisci la tua email per ricevere le istruzioni di recupero
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={`tua.email@${loginSettings.login_company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAuthMode('forgot-password')}
                    className="text-sm hover:underline"
                    style={{ color: loginSettings.login_primary_color }}
                  >
                    Password dimenticata?
                  </button>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: loginSettings.login_primary_color }}
                  disabled={isLoading || loading}
                >
                  {isLoading ? "Accesso in corso..." : "Accedi"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder={`tua.email@${loginSettings.login_company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: loginSettings.login_primary_color }}
                  disabled={isLoading}
                >
                  {isLoading ? "Invio in corso..." : "Invia Email di Recupero"}
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAuthMode('login')}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Torna al Login
                </Button>
              </form>
            )}
            
            <div className="text-center text-sm" style={{ color: loginSettings.login_secondary_color }}>
              <p>Contatta l'amministratore per ottenere le credenziali di accesso</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewAuthPage;
