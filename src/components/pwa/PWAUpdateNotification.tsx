import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X } from 'lucide-react';

interface PWAUpdateNotificationProps {
  updateSW?: () => Promise<void>;
}

export const PWAUpdateNotification = ({ updateSW }: PWAUpdateNotificationProps) => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = () => {
      setShowUpdate(true);
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = async () => {
    if (!updateSW) return;

    setIsUpdating(true);
    try {
      await updateSW();
      window.location.reload();
    } catch (error) {
      console.error('Errore durante l\'aggiornamento:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md animate-in slide-in-from-bottom-5">
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="h-5 w-5" />
                Aggiornamento Disponibile
              </CardTitle>
              <CardDescription>
                Una nuova versione di Gestiopro è pronta per l'installazione
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDismiss}
              disabled={isUpdating}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground">
            Clicca su "Aggiorna" per installare le ultime funzionalità e correzioni di sicurezza.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex-1"
          >
            {isUpdating ? 'Aggiornamento...' : 'Aggiorna Ora'}
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isUpdating}
          >
            Più Tardi
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
