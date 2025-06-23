import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, X, Calendar, Clock } from 'lucide-react';
import { useEmployeeOperations } from '@/hooks/useEmployeeOperations';
import { useWorkingDaysTracking } from '@/hooks/useWorkingDaysTracking';

interface CreateEmployeeFormProps {
  onClose: () => void;
  onEmployeeCreated: () => void;
}

const CreateEmployeeForm = ({ onClose, onEmployeeCreated }: CreateEmployeeFormProps) => {
  const { createEmployee, loading } = useEmployeeOperations();
  const { populateWorkingDaysForUser } = useWorkingDaysTracking();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'employee' as 'admin' | 'employee',
    employeeCode: '',
    trackingStartType: 'from_hire_date' as 'from_hire_date' | 'from_year_start'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      return;
    }

    try {
      const result = await createEmployee({
        first_name: formData.firstName || null,
        last_name: formData.lastName || null,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        employee_code: formData.employeeCode || null,
        department: null,
        tracking_start_type: formData.trackingStartType
      });

      if (!result.error && result.data?.id) {
        // Popola automaticamente i giorni lavorativi per il nuovo dipendente
        console.log('Popolamento giorni lavorativi per nuovo dipendente:', result.data.id);
        populateWorkingDaysForUser({ userId: result.data.id });
        
        onEmployeeCreated();
        onClose();
      }
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Ruolo</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'admin' | 'employee') => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona ruolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Dipendente</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
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

            <div className="space-y-2">
              <Label htmlFor="trackingStartType">Inizio Conteggio Giorni Lavorativi</Label>
              <Select
                value={formData.trackingStartType}
                onValueChange={(value: 'from_hire_date' | 'from_year_start') => 
                  setFormData({ ...formData, trackingStartType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="from_hire_date">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Dal giorno di creazione</div>
                        <div className="text-xs text-muted-foreground">Per nuovi assunti</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="from_year_start">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Dall'inizio dell'anno</div>
                        <div className="text-xs text-muted-foreground">Per dipendenti esistenti</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.trackingStartType === 'from_hire_date' 
                  ? 'Il monitoraggio inizierà dalla data di inserimento nel sistema.'
                  : 'Permette di registrare manualmente assenze passate dal 1° gennaio.'
                }
              </p>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Annulla
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creazione..." : "Crea Dipendente"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateEmployeeForm;
