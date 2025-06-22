
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const AdminRoleDebug: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);
  const { toast } = useToast();

  const checkAdminRole = async () => {
    setIsChecking(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'admin@serramenticorp.com');

      if (error) {
        console.error('Errore nel controllo admin:', error);
        throw error;
      }

      console.log('Dati admin trovati:', profiles);
      setAdminData(profiles);

      toast({
        title: 'Controllo completato',
        description: `Trovati ${profiles?.length || 0} profili per admin@serramenticorp.com`,
      });
    } catch (error: any) {
      console.error('Errore:', error);
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const fixAdminRole = async () => {
    setIsFixing(true);
    try {
      // Prima verifichiamo se esiste un profilo
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'admin@serramenticorp.com')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingProfile) {
        // Aggiorna il ruolo esistente
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            role: 'admin',
            first_name: 'Admin',
            last_name: 'SerramentiCorp',
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProfile.id);

        if (updateError) throw updateError;

        toast({
          title: 'Ruolo aggiornato',
          description: 'Il ruolo è stato impostato su admin',
        });
      } else {
        // Cerca l'utente nell'auth per ottenere l'ID
        const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
        
        if (userError) throw userError;

        const adminUser = users.find(user => user.email === 'admin@serramenticorp.com');
        
        if (adminUser) {
          // Crea un nuovo profilo
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: adminUser.id,
              email: 'admin@serramenticorp.com',
              role: 'admin',
              first_name: 'Admin',
              last_name: 'SerramentiCorp',
              is_active: true
            });

          if (insertError) throw insertError;

          toast({
            title: 'Profilo creato',
            description: 'Nuovo profilo admin creato con successo',
          });
        } else {
          throw new Error('Utente admin non trovato nell\'autenticazione');
        }
      }

      // Ricontrolla dopo la correzione
      await checkAdminRole();
    } catch (error: any) {
      console.error('Errore nella correzione:', error);
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Debug Ruolo Admin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={checkAdminRole} 
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? 'Controllo...' : 'Controlla Ruolo Admin'}
        </Button>

        {adminData && (
          <div className="bg-gray-100 p-3 rounded text-sm">
            <pre>{JSON.stringify(adminData, null, 2)}</pre>
          </div>
        )}

        <Button 
          onClick={fixAdminRole} 
          disabled={isFixing}
          variant="destructive"
          className="w-full"
        >
          {isFixing ? 'Correzione...' : 'Correggi Ruolo Admin'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminRoleDebug;
