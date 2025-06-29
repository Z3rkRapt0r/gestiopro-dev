
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useManualAttendances } from '@/hooks/useManualAttendances';
import { useAttendanceConflictValidation } from '@/hooks/useAttendanceConflictValidation';

const formSchema = z.object({
  user_id: z.string().min(1, 'Seleziona un dipendente'),
  date: z.string().min(1, 'Seleziona una data'),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ManualAttendanceForm() {
  const { employees, loading: loadingEmployees } = useActiveEmployees();
  const { createManualAttendance, isCreating } = useManualAttendances();
  const { checkAttendanceConflicts } = useAttendanceConflictValidation();
  const [conflictError, setConflictError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      user_id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      check_in_time: '',
      check_out_time: '',
      notes: '',
    },
  });

  const watchedUserId = form.watch('user_id');
  const watchedDate = form.watch('date');

  // Controlla conflitti quando cambiano utente o data
  React.useEffect(() => {
    if (watchedUserId && watchedDate) {
      checkAttendanceConflicts(watchedUserId, watchedDate).then(result => {
        if (result.hasConflict) {
          setConflictError(result.message || 'Conflitto rilevato');
        } else {
          setConflictError(null);
        }
      });
    } else {
      setConflictError(null);
    }
  }, [watchedUserId, watchedDate, checkAttendanceConflicts]);

  const onSubmit = async (data: FormData) => {
    // Controllo finale dei conflitti prima dell'invio
    const conflictResult = await checkAttendanceConflicts(data.user_id, data.date);
    if (conflictResult.hasConflict) {
      setConflictError(conflictResult.message || 'Conflitto rilevato');
      return;
    }

    createManualAttendance(data);
    form.reset();
    setConflictError(null);
  };

  if (loadingEmployees) {
    return <div>Caricamento dipendenti...</div>;
  }

  // Filtra dipendenti disponibili (attivi)
  const availableEmployees = employees?.filter(emp => emp.is_active) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inserimento Presenza Manuale</CardTitle>
      </CardHeader>
      <CardContent>
        {conflictError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {conflictError}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dipendente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona dipendente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableEmployees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.first_name} {employee.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="check_in_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orario Entrata</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="check_out_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orario Uscita</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Note aggiuntive..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={isCreating || !!conflictError}
              className="w-full"
            >
              {isCreating ? 'Creazione...' : 'Crea Presenza'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
