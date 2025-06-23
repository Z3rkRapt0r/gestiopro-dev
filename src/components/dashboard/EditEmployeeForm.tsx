
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
  first_name: z.string().min(1, 'Il nome è obbligatorio').nullable(),
  last_name: z.string().min(1, 'Il cognome è obbligatorio').nullable(),
  email: z.string().email('Email non valida').nullable(),
  role: z.enum(['admin', 'employee']),
  employee_code: z.string().nullable(),
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
      email: employee.email || '',
      role: employee.role || 'employee',
      employee_code: employee.employee_code || '',
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
      is_active: employee.is_active ?? true,
    });
  }, [employee, reset]);

  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          role: data.role,
          employee_code: data.employee_code,
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Dipendente</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEmployeeForm;
