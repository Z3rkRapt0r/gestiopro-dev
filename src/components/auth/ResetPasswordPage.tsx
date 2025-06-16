
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Eye, EyeOff, CheckCircle, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useLoginSettings } from '@/hooks/useLoginSettings';

const ResetPasswordPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { settings: loginSettings, loading: settingsLoading } = useLoginSettings();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // Verifica se c'è un token di reset nella URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      toast({
        title: "Link non valido",
        description: "Il link di reset password non è valido o è scaduto",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [navigate, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: "Errore",
        description: "Inserisci e conferma la nuova password",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Errore",
        description: "Le password non coincidono",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Errore",
        description: "La password deve essere di almeno 6 caratteri",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast({
        title: "Password aggiornata",
        description: "La tua password è stata aggiornata con successo",
      });

      // Reindirizza alla home dopo 3 secondi
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento della password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (settingsLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: loginSettings.background_color }}
      >
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: loginSettings.primary_color }}></div>
            <p className="text-center mt-4 text-sm" style={{ color: loginSettings.secondary_color }}>
              Caricamento...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
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
                <img
                  src={loginSettings.logo_url}
                  alt={`${loginSettings.company_name} Logo`}
                  className="h-16 w-auto object-contain drop-shadow-lg"
                />
              ) : (
                <div 
                  className="p-3 rounded-full shadow-lg"
                  style={{ backgroundColor: loginSettings.primary_color }}
                >
                  <Building className="h-8 w-8 text-white" />
                </div>
              )}
            </div>
          </div>

          <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95">
            <CardContent className="text-center p-8">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${loginSettings.primary_color}20` }}
              >
                <CheckCircle className="h-8 w-8" style={{ color: loginSettings.primary_color }} />
              </div>
              <h1 
                className="text-2xl font-bold mb-2"
                style={{ color: loginSettings.primary_color }}
              >
                Password Aggiornata!
              </h1>
              <p className="mb-4" style={{ color: loginSettings.secondary_color }}>
                La tua password è stata aggiornata con successo.
              </p>
              <p 
                className="text-sm"
                style={{ color: loginSettings.secondary_color }}
              >
                Verrai reindirizzato automaticamente alla pagina di login...
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
              <img
                src={loginSettings.logo_url}
                alt={`${loginSettings.company_name} Logo`}
                className="h-16 w-auto object-contain drop-shadow-lg"
              />
            ) : (
              <div 
                className="p-3 rounded-full shadow-lg"
                style={{ backgroundColor: loginSettings.primary_color }}
              >
                <Building className="h-8 w-8 text-white" />
              </div>
            )}
          </div>
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: loginSettings.primary_color }}
          >
            {loginSettings.company_name}
          </h1>
        </div>

        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95">
          <CardHeader className="text-center">
            <CardTitle 
              className="text-2xl"
              style={{ color: loginSettings.primary_color }}
            >
              Nuova Password
            </CardTitle>
            <p 
              className="text-sm mt-2"
              style={{ color: loginSettings.secondary_color }}
            >
              Inserisci la tua nuova password
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" style={{ color: loginSettings.secondary_color }}>
                  Nuova Password
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
                    minLength={6}
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
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password" style={{ color: loginSettings.secondary_color }}>
                  Conferma Password
                </Label>
                <div className="relative">
                  <Lock 
                    className="absolute left-3 top-3 h-4 w-4" 
                    style={{ color: loginSettings.secondary_color }}
                  />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 border-2 focus:ring-2"
                    style={{ 
                      borderColor: `${loginSettings.primary_color}30`,
                      '--tw-ring-color': `${loginSettings.primary_color}50`
                    } as React.CSSProperties}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 hover:opacity-70 transition-opacity"
                    style={{ color: loginSettings.secondary_color }}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full text-white font-semibold py-3 hover:opacity-90 transition-all shadow-lg"
                style={{ backgroundColor: loginSettings.primary_color }}
                disabled={isLoading}
              >
                {isLoading ? "Aggiornamento..." : "Aggiorna Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p 
            className="text-xs opacity-75"
            style={{ color: loginSettings.secondary_color }}
          >
            Powered by {loginSettings.company_name}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
