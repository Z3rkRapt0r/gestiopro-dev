
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useWorkingDaysTracking } from '@/hooks/useWorkingDaysTracking';
import { useLeaveConflicts } from '@/hooks/useLeaveConflicts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

export default function ManualAttendanceForm() {
  const { createManualAttendance, isCreating, attendances } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const { leaveRequests } = useLeaveRequests();
  const { isValidDateForEmployee } = useWorkingDaysTracking();
  
  const [formData, setFormData] = useState({
    user_id: '',
    date: '',
    check_in_time: '',
    check_out_time: '',
    notes: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Usa il sistema anti-conflitto per presenze
  const { 
    conflictDates, 
    isLoading: isCalculatingConflicts, 
    isDateDisabled,
    validateAttendanceEntry
  } = useLeaveConflicts(formData.user_id, 'attendance');

  // Funzione per validare la data rispetto alla logica di tracking
  const validateDate = (selectedDate: string, employeeId: string) => {
    if (!selectedDate || !employeeId || !employees) return true;

    const validation = isValidDateForEmployee(employeeId, selectedDate, employees);
    if (!validation.isValid) {
      setValidationError(validation.message || 'Data non valida');
      return false;
    }

    setValidationError(null);
    return true;
  };

  // Validazione anti-conflitto completa
  const validateConflicts = async (date: string, employeeId: string) => {
    if (!date || !employeeId) return true;

    try {
      console.log('🔍 Controllo conflitti per presenza...');
      const validation = await validateAttendanceEntry(employeeId, date);
      
      if (!validation.isValid) {
        setValidationError(validation.conflicts.join('; '));
        return false;
      }
      
      setValidationError(null);
      return true;
    } catch (error) {
      console.error('❌ Errore validazione conflitti presenza:', error);
      setValidationError('Errore durante la validazione dei conflitti');
      return false;
    }
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

  const handleDateChange = async (date: string) => {
    setFormData(prev => ({ ...prev, date }));
    
    // Prima valida la data di assunzione
    if (formData.user_id) {
      const isDateValid = validateDate(date, formData.user_id);
      if (!isDateValid) return;
      
      // Poi controlla i conflitti
      await validateConflicts(date, formData.user_id);
    }
  };

  const handleEmployeeChange = async (userId: string) => {
    setFormData(prev => ({ ...prev, user_id: userId }));
    
    // Prima valida la data di assunzione
    if (formData.date) {
      const isDateValid = validateDate(formData.date, userId);
      if (!isDateValid) return;
      
      // Poi controlla i conflitti
      await validateConflicts(formData.date, userId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verifica finale della validazione data di assunzione
    if (!validateDate(formData.date, formData.user_id)) {
      return;
    }

    // Verifica finale della validazione conflitti
    const isConflictValid = await validateConflicts(formData.date, formData.user_id);
    if (!isConflictValid) {
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

            {/* Indicatore di calcolo conflitti */}
            {formData.user_id && isCalculatingConflicts && (
              <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                🔍 Calcolo conflitti in corso...
              </div>
            )}

            {/* Indicatore conflitti trovati */}
            {formData.user_id && conflictDates.length > 0 && (
              <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                ⚠️ {conflictDates.length} date disabilitate per conflitti esistenti
              </div>
            )}

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
              disabled={isCreating || !formData.user_id || !formData.date || !!validationError || isCalculatingConflicts} 
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
