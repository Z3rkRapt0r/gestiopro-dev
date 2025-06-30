
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <UserPlus className="w-5 h-5" />
            Aggiungi Presenza Manuale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <Label htmlFor="date" className="text-sm sm:text-base">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleDateChange(e.target.value)}
                required
                className="mt-1 h-11 sm:h-10"
              />
            </div>

            {/* Indicatori di calcolo conflitti - Mobile optimized */}
            {formData.user_id && isCalculatingConflicts && (
              <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                🔍 Calcolo conflitti in corso...
              </div>
            )}

            {formData.user_id && conflictDates.length > 0 && (
              <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
                ⚠️ {conflictDates.length} date disabilitate per conflitti esistenti
              </div>
            )}

            {validationError && (
              <Alert variant="destructive" className="text-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="break-words">{validationError}</AlertDescription>
              </Alert>
            )}

            {excludedEmployees.length > 0 && formData.date && (
              <Alert className="text-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="break-words">
                  {excludedEmployees.length} dipendente/i escluso/i per la data {format(new Date(formData.date), 'dd/MM/yyyy')} 
                  (in ferie o malattia): {excludedEmployees.map(emp => `${emp.first_name} ${emp.last_name}`).join(', ')}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="employee" className="text-sm sm:text-base">Dipendente</Label>
              <Select value={formData.user_id} onValueChange={handleEmployeeChange}>
                <SelectTrigger className="mt-1 h-11 sm:h-10">
                  <SelectValue placeholder="Seleziona dipendente" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {availableEmployees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">{employee.first_name} {employee.last_name}</span>
                        <span className="text-xs text-muted-foreground">({employee.email})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="check_in" className="text-sm sm:text-base">Orario Entrata</Label>
                <Input
                  id="check_in"
                  type="time"
                  value={formData.check_in_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, check_in_time: e.target.value }))}
                  className="mt-1 h-11 sm:h-10"
                />
              </div>
              <div>
                <Label htmlFor="check_out" className="text-sm sm:text-base">Orario Uscita</Label>
                <Input
                  id="check_out"
                  type="time"
                  value={formData.check_out_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, check_out_time: e.target.value }))}
                  className="mt-1 h-11 sm:h-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm sm:text-base">Note</Label>
              <Textarea
                id="notes"
                placeholder="Note aggiuntive..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="mt-1 min-h-[100px] sm:min-h-[80px]"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isCreating || !formData.user_id || !formData.date || !!validationError || isCalculatingConflicts} 
              className="w-full h-11 sm:h-10 text-base sm:text-sm"
            >
              {isCreating ? 'Salvando...' : 'Salva Presenza'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
