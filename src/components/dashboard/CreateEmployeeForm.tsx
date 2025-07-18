
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    hireDate: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      return;
    }

    try {
      // La logica di tracking_start_type è ora automatica:
      // - Se c'è hire_date -> 'from_hire_date' 
      // - Se non c'è hire_date -> 'from_year_start'
      const trackingStartType = formData.hireDate ? 'from_hire_date' : 'from_year_start';

      const result = await createEmployee({
        first_name: formData.firstName || null,
        last_name: formData.lastName || null,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        employee_code: formData.employeeCode || null,
        department: null,
        hire_date: formData.hireDate || null,
        tracking_start_type: trackingStartType
      });

      if (!result.error && result.data?.id) {
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
        <Label htmlFor="hireDate">Data di Assunzione</Label>
        <Input
          id="hireDate"
          type="date"
          value={formData.hireDate}
          onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
          max={new Date().toISOString().split('T')[0]}
        />
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
  );
};

export default CreateEmployeeForm;
