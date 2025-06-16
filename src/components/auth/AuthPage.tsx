
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, Building } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLoginSettings } from '@/hooks/useLoginSettings';

const AuthPage = () => {
  const { signIn, loading } = useAuth();
  const { settings: loginSettings, loading: settingsLoading } = useLoginSettings();
  const [isLoading, setIsLoading] = useState(false);

  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail || !signInPassword) return;

    setIsLoading(true);
    await signIn(signInEmail, signInPassword);
    setIsLoading(false);
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow p-6">
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
        background: `linear-gradient(to br, ${loginSettings.login_background_color}, ${loginSettings.login_background_color}dd)` 
      }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            {loginSettings.login_logo_url ? (
              <img
                src={loginSettings.login_logo_url}
                alt="Logo"
                className="h-16 w-auto object-contain"
              />
            ) : (
              <div 
                className="p-3 rounded-full"
                style={{ backgroundColor: loginSettings.login_primary_color }}
              >
                <Building className="h-8 w-8 text-white" />
              </div>
            )}
          </div>
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: loginSettings.login_primary_color }}
          >
            {loginSettings.login_company_name}
          </h1>
          <p style={{ color: loginSettings.login_secondary_color }}>
            Sistema di Gestione Aziendale
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Accesso Dipendenti</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder={`tua.email@${loginSettings.login_company_name.toLowerCase().replace(/\s+/g, '')}.com`}
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full text-white hover:opacity-90"
                style={{ backgroundColor: loginSettings.login_primary_color }}
                disabled={isLoading || loading}
              >
                {isLoading ? "Accesso in corso..." : "Accedi"}
              </Button>
            </form>
            
            <div className="mt-4 text-center text-sm" style={{ color: loginSettings.login_secondary_color }}>
              <p>Contatta l'amministratore per ottenere le credenziali di accesso</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
