
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/hooks/useAuth';

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: 'admin' | 'employee';
  department: string | null;
  employee_code: string | null;
  hire_date: string | null;
  tracking_start_type: string | null;
  is_active: boolean;
}

interface EditEmployeeFormProps {
  employee: Employee;
  onClose: () => void;
  onEmployeeUpdated: () => void;
}

const employeeFormSchema = z.object({
  first_name: z.string().min(1, 'Il nome è obbligatorio').nullable(),
  last_name: z.string().min(1, 'Il cognome è obbligatorio').nullable(),
  email: z.string().email('Email non valida').nullable(),
  role: z.enum(['admin', 'employee']),
  employee_code: z.string().nullable(),
  hire_date: z.string().nullable(),
  is_active: z.boolean(),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

const EditEmployeeForm: React.FC<EditEmployeeFormProps> = ({ employee, onClose, onEmployeeUpdated }) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdminRoleConfirmation, setShowAdminRoleConfirmation] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<'admin' | 'employee' | null>(null);

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
      email: employee.email || '',
      role: employee.role || 'employee',
      employee_code: employee.employee_code || '',
      hire_date: employee.hire_date || '',
      is_active: employee.is_active ?? true,
    },
  });

  useEffect(() => {
    reset({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      role: employee.role || 'employee',
      employee_code: employee.employee_code || '',
      hire_date: employee.hire_date || '',
      is_active: employee.is_active ?? true,
    });
  }, [employee, reset]);

  const handleRoleChange = (value: 'admin' | 'employee') => {
    // Check if this is a role escalation to admin
    if (value === 'admin' && employee.role !== 'admin' && profile?.role === 'admin') {
      setPendingRoleChange(value);
      setShowAdminRoleConfirmation(true);
    } else {
      // Direct role change (either to employee or user is already admin)
      const currentFormData = control._formState.defaultValues;
      reset({ ...currentFormData, role: value });
    }
  };

  const confirmRoleChange = () => {
    if (pendingRoleChange) {
      const currentFormData = control._formState.defaultValues;
      reset({ ...currentFormData, role: pendingRoleChange });
      setPendingRoleChange(null);
    }
    setShowAdminRoleConfirmation(false);
  };

  const onSubmit = async (data: EmployeeFormData) => {
    // Validate hire date is not in the future
    if (data.hire_date && new Date(data.hire_date) > new Date()) {
      toast({
        title: 'Errore',
        description: 'La data di assunzione non può essere nel futuro.',
        variant: 'destructive',
      });
      return;
    }

    // Security check: Only admins can assign admin roles
    if (data.role === 'admin' && employee.role !== 'admin' && profile?.role !== 'admin') {
      toast({
        title: 'Errore di autorizzazione',
        description: 'Non hai i permessi per assegnare ruoli amministrativi.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // La logica di tracking_start_type è ora automatica
      const trackingStartType = data.hire_date ? 'from_hire_date' : 'from_year_start';

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          role: data.role,
          employee_code: data.employee_code,
          hire_date: data.hire_date,
          tracking_start_type: trackingStartType,
          is_active: data.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employee.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Dipendente aggiornato',
        description: `I dati di ${data.first_name} ${data.last_name} sono stati aggiornati.`,
      });
      onEmployeeUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile aggiornare il dipendente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Modifica Dipendente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Nome</Label>
                <Controller
                  name="first_name"
                  control={control}
                  render={({ field }) => <Input id="first_name" {...field} value={field.value ?? ''} />}
                />
                {errors.first_name && <p className="text-red-500 text-sm">{errors.first_name.message}</p>}
              </div>
              <div>
                <Label htmlFor="last_name">Cognome</Label>
                <Controller
                  name="last_name"
                  control={control}
                  render={({ field }) => <Input id="last_name" {...field} value={field.value ?? ''} />}
                />
                {errors.last_name && <p className="text-red-500 text-sm">{errors.last_name.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => <Input id="email" type="email" {...field} value={field.value ?? ''} />}
              />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="role">Ruolo</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={handleRoleChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona ruolo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Dipendente</SelectItem>
                      {profile?.role === 'admin' && (
                        <SelectItem value="admin">Admin</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-red-500 text-sm">{errors.role.message}</p>}
            </div>
            <div>
              <Label htmlFor="employee_code">Codice Dipendente</Label>
              <Controller
                name="employee_code"
                control={control}
                render={({ field }) => <Input id="employee_code" {...field} value={field.value ?? ''} />}
              />
              {errors.employee_code && <p className="text-red-500 text-sm">{errors.employee_code.message}</p>}
            </div>
            <div>
              <Label htmlFor="hire_date">Data di Assunzione</Label>
              <Controller
                name="hire_date"
                control={control}
                render={({ field }) => (
                  <Input 
                    id="hire_date" 
                    type="date" 
                    {...field} 
                    value={field.value ?? ''} 
                    max={new Date().toISOString().split('T')[0]}
                  />
                )}
              />
              {errors.hire_date && <p className="text-red-500 text-sm">{errors.hire_date.message}</p>}
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

      <AlertDialog open={showAdminRoleConfirmation} onOpenChange={setShowAdminRoleConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Conferma Assegnazione Ruolo Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per assegnare i privilegi di amministratore a {employee.first_name} {employee.last_name}. 
              Gli amministratori hanno accesso completo al sistema e possono gestire tutti i dati aziendali.
              <br /><br />
              <strong>Sei sicuro di voler procedere?</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange} className="bg-red-600 hover:bg-red-700">
              Confermo - Assegna Ruolo Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditEmployeeForm;
