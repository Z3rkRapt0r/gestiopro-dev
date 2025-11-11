import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Verifica se l'app è già installata
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;

    if (isStandalone) {
      return; // Non mostrare il prompt se l'app è già installata
    }

    // Verifica se l'utente ha già dimesso il prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

      // Mostra di nuovo il prompt dopo 7 giorni
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Previeni il prompt automatico del browser
      e.preventDefault();

      // Salva l'evento per usarlo dopo
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Mostra il nostro prompt personalizzato dopo un breve ritardo
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Mostra il prompt di installazione
    await deferredPrompt.prompt();

    // Aspetta la scelta dell'utente
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('✅ Utente ha accettato l\'installazione');
    } else {
      console.log('❌ Utente ha rifiutato l\'installazione');
    }

    // Reset
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    // Salva il timestamp della dismissione
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 w-full max-w-md animate-in slide-in-from-bottom-5">
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Installa Gestiopro
              </CardTitle>
              <CardDescription>
                Accedi rapidamente con un'icona sulla schermata home
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Funziona anche offline</li>
            <li>• Notifiche push per avvisi importanti</li>
            <li>• Esperienza più veloce e fluida</li>
            <li>• Nessun download da store richiesto</li>
          </ul>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="flex-1"
          >
            Installa
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
          >
            Non Ora
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
