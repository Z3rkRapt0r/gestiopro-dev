
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, X } from 'lucide-react';

interface CreateEmployeeFormProps {
  onClose: () => void;
  onEmployeeCreated: () => void;
}

const CreateEmployeeForm = ({ onClose, onEmployeeCreated }: CreateEmployeeFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'employee' as 'admin' | 'employee',
    employeeCode: ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    console.log('Tentativo di creazione dipendente con dati:', {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
      employeeCode: formData.employeeCode
    });

    try {
      // Controlla prima se l'utente esiste già nel database profiles
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', formData.email)
        .single();

      if (existingUser) {
        throw new Error('Esiste già un dipendente con questa email');
      }

      // Crea l'utente in Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: formData.role,
          }
        }
      });

      console.log('Risultato signUp:', { signUpData, signUpError });

      if (signUpError) {
        console.error('Errore signUp:', signUpError);
        let description = "Errore durante la creazione dell'account";
        
        if (signUpError.message?.includes('User already registered')) {
          description = "Esiste già un utente con questa email";
        } else if (signUpError.message?.includes('Invalid email')) {
          description = "Email non valida";
        } else if (signUpError.message?.includes('Password')) {
          description = "La password deve essere di almeno 6 caratteri";
        } else if (signUpError.message) {
          description = signUpError.message;
        }
        
        throw new Error(description);
      }

      const userId = signUpData?.user?.id;
      if (!userId) {
        throw new Error("Impossibile recuperare l'id del nuovo utente.");
      }

      console.log('Utente creato con ID:', userId);

      // Aggiorna il profilo nella tabella profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          role: formData.role,
          employee_code: formData.employeeCode || null,
          is_active: true
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Errore update profilo:', profileError);
        throw new Error(`Errore nell'aggiornamento del profilo: ${profileError.message}`);
      }

      console.log('Profilo aggiornato con successo');

      toast({
        title: "Dipendente creato",
        description: `${formData.firstName} ${formData.lastName} è stato aggiunto con successo come ${formData.role === 'admin' ? 'amministratore' : 'dipendente'}`,
        className: "bg-green-50 border-green-200 text-green-800",
      });

      onEmployeeCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione del dipendente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <UserPlus className="mr-2 h-5 w-5" />
            Nuovo Dipendente
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Cognome</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password Temporanea</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                placeholder="Minimo 6 caratteri"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Ruolo</Label>
              <Select onValueChange={(value: 'admin' | 'employee') => setFormData({ ...formData, role: value })} defaultValue="employee">
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona ruolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Dipendente</SelectItem>
                  <SelectItem value="admin">Amministratore</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeCode">Codice Dipendente</Label>
              <Input
                id="employeeCode"
                value={formData.employeeCode}
                onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                placeholder="Es: EMP001"
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Annulla
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Creazione..." : "Crea Dipendente"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateEmployeeForm;
