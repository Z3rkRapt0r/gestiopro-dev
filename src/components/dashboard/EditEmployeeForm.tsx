
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: 'admin' | 'employee';
  department: string | null;
  employee_code: string | null;
  is_active: boolean;
}

interface EditEmployeeFormProps {
  employee: Employee;
  onClose: () => void;
  onEmployeeUpdated: () => void;
}

const employeeFormSchema = z.object({
  first_name: z.string().min(1, 'Il nome è obbligatorio'),
  last_name: z.string().min(1, 'Il cognome è obbligatorio'),
  role: z.enum(['admin', 'employee']),
  department: z.string().optional(),
  employee_code: z.string().optional(),
  is_active: z.boolean(),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

const EditEmployeeForm: React.FC<EditEmployeeFormProps> = ({ employee, onClose, onEmployeeUpdated }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      role: employee.role || 'employee',
      department: employee.department || '',
      employee_code: employee.employee_code || '',
      is_active: employee.is_active ?? true,
    },
  });

  useEffect(() => {
    reset({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      role: employee.role || 'employee',
      department: employee.department || '',
      employee_code: employee.employee_code || '',
      is_active: employee.is_active ?? true,
    });
  }, [employee, reset]);

  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      console.log('Tentativo di aggiornamento dipendente:', {
        employeeId: employee.id,
        currentData: employee,
        newData: data
      });
      
      // Prima verifichiamo se il record esiste
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', employee.id)
        .single();

      if (fetchError) {
        console.error('Errore nel recuperare il profilo esistente:', fetchError);
        throw new Error('Impossibile trovare il profilo da aggiornare');
      }

      console.log('Profilo esistente trovato:', existingProfile);

      // Ora aggiorniamo i dati
      const updateData = {
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        department: data.department || null,
        employee_code: data.employee_code || null,
        is_active: data.is_active,
        updated_at: new Date().toISOString(),
      };

      console.log('Dati da aggiornare:', updateData);

      const { data: updatedData, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', employee.id)
        .select()
        .single();

      if (error) {
        console.error('Errore nell\'aggiornamento del dipendente:', error);
        throw error;
      }

      console.log('Dipendente aggiornato con successo:', updatedData);
      
      toast({
        title: 'Dipendente aggiornato',
        description: `I dati di ${data.first_name} ${data.last_name} sono stati aggiornati con successo.`,
      });
      
      onEmployeeUpdated();
      onClose();
    } catch (error: any) {
      console.error('Errore completo nell\'aggiornamento:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile aggiornare il dipendente. Verificare i permessi.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            Modifica {employee.role === 'admin' ? 'Amministratore' : 'Dipendente'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            ID: {employee.id}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Nome</Label>
              <Controller
                name="first_name"
                control={control}
                render={({ field }) => <Input id="first_name" {...field} />}
              />
              {errors.first_name && <p className="text-red-500 text-sm">{errors.first_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="last_name">Cognome</Label>
              <Controller
                name="last_name"
                control={control}
                render={({ field }) => <Input id="last_name" {...field} />}
              />
              {errors.last_name && <p className="text-red-500 text-sm">{errors.last_name.message}</p>}
            </div>
          </div>
          
          <div>
            <Label>Email (Solo lettura)</Label>
            <Input value={employee.email || 'Nessuna email'} disabled className="bg-gray-100" />
            <p className="text-xs text-gray-500 mt-1">L'email non può essere modificata da qui</p>
          </div>
          
          <div>
            <Label htmlFor="role">Ruolo</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Dipendente</SelectItem>
                    <SelectItem value="admin">Amministratore</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && <p className="text-red-500 text-sm">{errors.role.message}</p>}
          </div>
          
          <div>
            <Label htmlFor="department">Dipartimento</Label>
            <Controller
              name="department"
              control={control}
              render={({ field }) => <Input id="department" {...field} />}
            />
          </div>
          
          <div>
            <Label htmlFor="employee_code">Codice Dipendente</Label>
            <Controller
              name="employee_code"
              control={control}
              render={({ field }) => <Input id="employee_code" {...field} />}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Switch
                  id="is_active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="is_active">Attivo</Label>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>
                Annulla
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEmployeeForm;
