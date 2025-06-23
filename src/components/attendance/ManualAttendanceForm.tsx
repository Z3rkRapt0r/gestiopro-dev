
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useManualAttendances } from '@/hooks/useManualAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

export default function ManualAttendanceForm() {
  const { createManualAttendance, isCreating } = useManualAttendances();
  const { employees } = useActiveEmployees();
  const { leaveRequests } = useLeaveRequests();
  const { attendances } = useUnifiedAttendances();
  const [formData, setFormData] = useState({
    user_id: '',
    date: '',
    check_in_time: '',
    check_out_time: '',
    notes: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Funzione per validare la data rispetto alla data di assunzione
  const validateDateAgainstHireDate = (selectedDate: string, employeeId: string) => {
    if (!selectedDate || !employeeId) return true;

    const employee = employees?.find(emp => emp.id === employeeId);
    if (!employee || !employee.hire_date) return true;

    const selectedDateObj = new Date(selectedDate);
    const hireDateObj = new Date(employee.hire_date);

    if (selectedDateObj < hireDateObj) {
      setValidationError(`⚠️ Impossibile salvare l'evento: la data selezionata (${format(selectedDateObj, 'dd/MM/yyyy')}) è antecedente alla data di assunzione del dipendente (${format(hireDateObj, 'dd/MM/yyyy')}).`);
      return false;
    }

    setValidationError(null);
    return true;
  };

  // Filtra i dipendenti disponibili escludendo quelli in ferie o malattia nella data selezionata
  const availableEmployees = useMemo(() => {
    if (!formData.date || !employees || !leaveRequests || !attendances) {
      return employees || [];
    }

    return employees.filter(employee => {
      // Controlla se il dipendente ha ferie approvate nella data selezionata
      const hasApprovedLeave = leaveRequests.some(leave => {
        if (leave.status !== 'approved' || leave.user_id !== employee.id) return false;
        
        if (leave.type === 'ferie' && leave.date_from && leave.date_to) {
          const leaveStart = new Date(leave.date_from);
          const leaveEnd = new Date(leave.date_to);
          const selectedDate = new Date(formData.date);
          return selectedDate >= leaveStart && selectedDate <= leaveEnd;
        }
        
        if (leave.type === 'permesso' && leave.day) {
          return leave.day === formData.date;
        }
        
        return false;
      });

      // Controlla se il dipendente è già in malattia nella data selezionata
      const hasSickLeave = attendances.some(att => 
        att.user_id === employee.id && 
        att.date === formData.date && 
        att.is_sick_leave
      );

      return !hasApprovedLeave && !hasSickLeave;
    });
  }, [formData.date, employees, leaveRequests, attendances]);

  const handleDateChange = (date: string) => {
    setFormData(prev => ({ ...prev, date }));
    
    // Valida immediatamente se c'è un dipendente selezionato
    if (formData.user_id) {
      validateDateAgainstHireDate(date, formData.user_id);
    }
  };

  const handleEmployeeChange = (userId: string) => {
    setFormData(prev => ({ ...prev, user_id: userId }));
    
    // Valida immediatamente se c'è una data selezionata
    if (formData.date) {
      validateDateAgainstHireDate(formData.date, userId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verifica finale della validazione
    if (!validateDateAgainstHireDate(formData.date, formData.user_id)) {
      return;
    }
    
    // Costruiamo gli orari mantenendo la data e l'orario esatti senza conversioni di fuso orario
    const attendanceData = {
      user_id: formData.user_id,
      date: formData.date,
      check_in_time: formData.check_in_time ? `${formData.date}T${formData.check_in_time}:00` : null,
      check_out_time: formData.check_out_time ? `${formData.date}T${formData.check_out_time}:00` : null,
      notes: formData.notes,
    };

    console.log('Dati presenza manuale (timestamp locali):', attendanceData);
    createManualAttendance(attendanceData);
    setFormData({
      user_id: '',
      date: '',
      check_in_time: '',
      check_out_time: '',
      notes: '',
    });
    setValidationError(null);
  };

  // Calcola dipendenti esclusi per mostrare l'avviso
  const excludedEmployees = useMemo(() => {
    if (!formData.date || !employees || !leaveRequests || !attendances) {
      return [];
    }

    return employees.filter(employee => {
      const hasApprovedLeave = leaveRequests.some(leave => {
        if (leave.status !== 'approved' || leave.user_id !== employee.id) return false;
        
        if (leave.type === 'ferie' && leave.date_from && leave.date_to) {
          const leaveStart = new Date(leave.date_from);
          const leaveEnd = new Date(leave.date_to);
          const selectedDate = new Date(formData.date);
          return selectedDate >= leaveStart && selectedDate <= leaveEnd;
        }
        
        if (leave.type === 'permesso' && leave.day) {
          return leave.day === formData.date;
        }
        
        return false;
      });

      const hasSickLeave = attendances.some(att => 
        att.user_id === employee.id && 
        att.date === formData.date && 
        att.is_sick_leave
      );

      return hasApprovedLeave || hasSickLeave;
    });
  }, [formData.date, employees, leaveRequests, attendances]);

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Aggiungi Presenza Manuale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleDateChange(e.target.value)}
                required
              />
            </div>

            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            {excludedEmployees.length > 0 && formData.date && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {excludedEmployees.length} dipendente/i escluso/i per la data {format(new Date(formData.date), 'dd/MM/yyyy')} 
                  (in ferie o malattia): {excludedEmployees.map(emp => `${emp.first_name} ${emp.last_name}`).join(', ')}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="employee">Dipendente</Label>
              <Select value={formData.user_id} onValueChange={handleEmployeeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona dipendente" />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name} ({employee.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="check_in">Orario Entrata</Label>
                <Input
                  id="check_in"
                  type="time"
                  value={formData.check_in_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, check_in_time: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="check_out">Orario Uscita</Label>
                <Input
                  id="check_out"
                  type="time"
                  value={formData.check_out_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, check_out_time: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Note</Label>
              <Textarea
                id="notes"
                placeholder="Note aggiuntive..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <Button 
              type="submit" 
              disabled={isCreating || !formData.user_id || !formData.date || !!validationError} 
              className="w-full"
            >
              {isCreating ? 'Salvando...' : 'Salva Presenza'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
