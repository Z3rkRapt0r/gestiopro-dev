import { useState, useEffect } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  isPushNotificationSupported,
  requestNotificationPermission,
  getCurrentPushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications
} from '@/lib/pushNotifications';
import { supabase } from '@/integrations/supabase/client';

export const NotificationSettings = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Verifica lo stato iniziale
  useEffect(() => {
    const checkStatus = async () => {
      const supported = isPushNotificationSupported();
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);

        const subscription = await getCurrentPushSubscription();
        setIsSubscribed(!!subscription);
      }
    };

    checkStatus();
  }, []);

  const handleToggleNotifications = async () => {
    if (!isSupported) {
      toast({
        title: "Non supportato",
        description: "Le notifiche push non sono supportate dal tuo browser.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isSubscribed) {
        // Disabilita le notifiche
        const success = await unsubscribeFromPushNotifications();

        if (success) {
          // Rimuovi la sottoscrizione dal database
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('user_id', user.id);
          }

          setIsSubscribed(false);
          toast({
            title: "Notifiche disabilitate",
            description: "Non riceverai più notifiche push.",
          });
        }
      } else {
        // Abilita le notifiche
        const perm = await requestNotificationPermission();
        setPermission(perm);

        if (perm !== 'granted') {
          toast({
            title: "Permesso negato",
            description: "Devi concedere il permesso per ricevere notifiche.",
            variant: "destructive"
          });
          return;
        }

        // VAPID Public Key generata per Gestiopro
        const VAPID_PUBLIC_KEY = 'BEeDR0PKDbiDT6hgkM_aVleyv2eneYjuC1OQD01zdaUjXQ27MNywDrHfMobPS1J-FVR47KvAkRSLmew2Y2o0MDc';

        const subscription = await subscribeToPushNotifications(VAPID_PUBLIC_KEY);

        if (subscription) {
          // Salva la sottoscrizione nel database
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('push_subscriptions')
              .upsert({
                user_id: user.id,
                subscription_endpoint: subscription.endpoint,
                subscription_keys: subscription.keys,
                updated_at: new Date().toISOString()
              });
          }

          setIsSubscribed(true);
          toast({
            title: "Notifiche abilitate",
            description: "Riceverai notifiche per avvisi importanti.",
          });
        }
      }
    } catch (error) {
      console.error('Errore nella gestione delle notifiche:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore. Riprova più tardi.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifiche Push Non Disponibili
          </CardTitle>
          <CardDescription>
            Il tuo browser non supporta le notifiche push
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifiche Push
        </CardTitle>
        <CardDescription>
          Ricevi notifiche per presenze, straordinari e avvisi importanti
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications">Abilita Notifiche Push</Label>
            <p className="text-sm text-muted-foreground">
              {permission === 'granted' && isSubscribed
                ? 'Le notifiche sono attive'
                : permission === 'denied'
                ? 'Le notifiche sono bloccate nelle impostazioni del browser'
                : 'Attiva per ricevere avvisi in tempo reale'}
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggleNotifications}
            disabled={isLoading || permission === 'denied'}
          />
        </div>

        {isSubscribed && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg text-sm text-green-800 dark:text-green-200">
            <Check className="h-4 w-4" />
            <span>Notifiche attive e funzionanti</span>
          </div>
        )}

        {permission === 'denied' && (
          <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
            Per abilitare le notifiche, devi modificare le impostazioni del browser e ricaricare la pagina.
          </div>
        )}

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Riceverai notifiche per:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Avvisi di presenza mancante</li>
            <li>• Richieste di ferie e permessi approvate/rifiutate</li>
            <li>• Messaggi importanti dall'amministratore</li>
            <li>• Promemoria per timbrature</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
