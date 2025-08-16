
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

  // Debug logs
  console.log('[NewAuthPage] loginSettings:', loginSettings);
  console.log('[NewAuthPage] settingsLoading:', settingsLoading);

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

  // Show loading spinner while settings are loading
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
      style={{ 
        background: `linear-gradient(135deg, ${loginSettings.background_color}ee, ${loginSettings.background_color})` 
      }}
    >
      <div className="w-full max-w-md">
        {/* Header con logo e nome azienda */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-6">
            {loginSettings.logo_url ? (
              <div>
                <img
                  src={loginSettings.logo_url}
                  alt={`${loginSettings.company_name} Logo`}
                  className="h-20 w-auto object-contain drop-shadow-lg max-w-full"
                  onError={(e) => {
                    console.error('[NewAuthPage] Errore caricamento logo:', loginSettings.logo_url);
                    // Fallback in caso di errore nel caricamento dell'immagine
                    (e.target as HTMLImageElement).style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'p-4 rounded-full shadow-lg flex items-center justify-center';
                    fallback.style.backgroundColor = loginSettings.primary_color;
                    fallback.innerHTML = `<svg class="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7L12 12L22 7L12 2Z"/><path d="M2 17L12 22L22 17"/><path d="M2 12L12 17L22 12"/></svg>`;
                    (e.target as HTMLImageElement).parentNode?.appendChild(fallback);
                  }}
                  onLoad={() => {
                    console.log('[NewAuthPage] Logo caricato con successo:', loginSettings.logo_url);
                  }}
                />
              </div>
            ) : (
              <div 
                className="p-4 rounded-full shadow-lg flex items-center justify-center"
                style={{ backgroundColor: loginSettings.primary_color }}
              >
                <Building className="h-10 w-10 text-white" />
              </div>
            )}
          </div>
          <h1 
            className="text-4xl font-bold mb-3 drop-shadow-sm"
            style={{ color: loginSettings.primary_color }}
          >
            {loginSettings.company_name}
          </h1>
          <p 
            className="text-lg font-medium"
            style={{ color: loginSettings.secondary_color }}
          >
            Sistema di Gestione Aziendale
          </p>
        </div>

        {/* Card principale di autenticazione */}
        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95">
          <CardHeader className="text-center pb-4">
            <CardTitle 
              className="text-2xl font-semibold"
              style={{ color: loginSettings.primary_color }}
            >
              {authMode === 'login' ? 'Accesso' : 'Recupera Password'}
            </CardTitle>
            {authMode === 'forgot-password' && (
              <p 
                className="text-sm mt-2"
                style={{ color: loginSettings.secondary_color }}
              >
                Inserisci la tua email per ricevere le istruzioni di recupero
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" style={{ color: loginSettings.secondary_color }}>
                    Email
                  </Label>
                  <div className="relative">
                    <Mail 
                      className="absolute left-3 top-3 h-4 w-4" 
                      style={{ color: loginSettings.secondary_color }}
                    />
                    <Input
                      id="email"
                      type="email"
                      placeholder={`tua.email@${loginSettings.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 border-2 focus:ring-2"
                      style={{ 
                        borderColor: `${loginSettings.primary_color}30`,
                        '--tw-ring-color': `${loginSettings.primary_color}50`
                      } as React.CSSProperties}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" style={{ color: loginSettings.secondary_color }}>
                    Password
                  </Label>
                  <div className="relative">
                    <Lock 
                      className="absolute left-3 top-3 h-4 w-4" 
                      style={{ color: loginSettings.secondary_color }}
                    />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 border-2 focus:ring-2"
                      style={{ 
                        borderColor: `${loginSettings.primary_color}30`,
                        '--tw-ring-color': `${loginSettings.primary_color}50`
                      } as React.CSSProperties}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 hover:opacity-70 transition-opacity"
                      style={{ color: loginSettings.secondary_color }}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAuthMode('forgot-password')}
                    className="text-sm hover:underline font-medium transition-all"
                    style={{ color: loginSettings.primary_color }}
                  >
                    Password dimenticata?
                  </button>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full text-white font-semibold py-3 hover:opacity-90 transition-all shadow-lg"
                  style={{ backgroundColor: loginSettings.primary_color }}
                  disabled={isLoading || loading}
                >
                  {isLoading ? "Accesso in corso..." : "Accedi"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" style={{ color: loginSettings.secondary_color }}>
                    Email
                  </Label>
                  <div className="relative">
                    <Mail 
                      className="absolute left-3 top-3 h-4 w-4" 
                      style={{ color: loginSettings.secondary_color }}
                    />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder={`tua.email@${loginSettings.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-10 border-2 focus:ring-2"
                      style={{ 
                        borderColor: `${loginSettings.primary_color}30`,
                        '--tw-ring-color': `${loginSettings.primary_color}50`
                      } as React.CSSProperties}
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full text-white font-semibold py-3 hover:opacity-90 transition-all shadow-lg"
                  style={{ backgroundColor: loginSettings.primary_color }}
                  disabled={isLoading}
                >
                  {isLoading ? "Invio in corso..." : "Invia Email di Recupero"}
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAuthMode('login')}
                  className="w-full font-medium"
                  style={{ color: loginSettings.primary_color }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Torna al Login
                </Button>
              </form>
            )}
            

          </CardContent>
        </Card>

        {/* Footer con branding */}
        <div className="text-center mt-6">
          <p 
            className="text-xs opacity-75"
            style={{ color: loginSettings.secondary_color }}
          >
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

export default NewAuthPage;
