import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useLeaveConflicts } from '@/hooks/useLeaveConflicts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

export default function NewManualAttendanceForm() {
  const { createManualAttendance, isCreating } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const [formData, setFormData] = useState({
    user_id: '',
    date: '',
    date_to: '',
    check_in_time: '',
    check_out_time: '',
    notes: '',
    is_sick_leave: false,
    is_permission: false,
    permission_time_from: '',
    permission_time_to: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Determina il tipo per il sistema anti-conflitto
  const conflictType = formData.is_sick_leave ? 'sick_leave' : 
                      formData.is_permission ? 'permesso' : 'attendance';

  // Usa il sistema anti-conflitto
  const { 
    conflictDates, 
    isLoading: isCalculatingConflicts, 
    isDateDisabled,
    validateSickLeaveRange,
    validatePermissionDate,
    validateAttendanceEntry
  } = useLeaveConflicts(formData.user_id, conflictType);

  // Funzione per validare le date rispetto alla data di assunzione
  const validateDatesAgainstHireDate = (startDate: string, endDate: string, employeeId: string) => {
    if (!startDate || !employeeId) return true;

    const employee = employees?.find(emp => emp.id === employeeId);
    if (!employee || !employee.hire_date) return true;

    const hireDateObj = new Date(employee.hire_date);
    const startDateObj = new Date(startDate);
    
    if (startDateObj < hireDateObj) {
      setValidationError(`⚠️ Impossibile salvare l'evento: la data di inizio (${format(startDateObj, 'dd/MM/yyyy')}) è antecedente alla data di assunzione del dipendente (${format(hireDateObj, 'dd/MM/yyyy')}).`);
      return false;
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      if (endDateObj < hireDateObj) {
        setValidationError(`⚠️ Impossibile salvare l'evento: la data di fine (${format(endDateObj, 'dd/MM/yyyy')}) è antecedente alla data di assunzione del dipendente (${format(hireDateObj, 'dd/MM/yyyy')}).`);
        return false;
      }
    }

    setValidationError(null);
    return true;
  };

  // Validazione anti-conflitto completa
  const validateConflicts = async (startDate: string, endDate: string, employeeId: string) => {
    if (!startDate || !employeeId) return true;

    try {
      if (formData.is_sick_leave && endDate) {
        console.log('🔍 Controllo conflitti per malattia...');
        const validation = await validateSickLeaveRange(employeeId, startDate, endDate);
        
        if (!validation.isValid) {
          setValidationError(validation.conflicts.join('; '));
          return false;
        }
      } else if (formData.is_permission) {
        console.log('🔍 Controllo conflitti per permesso...');
        const validation = await validatePermissionDate(
          employeeId,
          startDate,
          formData.permission_time_from || undefined,
          formData.permission_time_to || undefined
        );
        
        if (!validation.isValid) {
          setValidationError(validation.conflicts.join('; '));
          return false;
        }
      } else {
        console.log('🔍 Controllo conflitti per presenza...');
        const validation = await validateAttendanceEntry(employeeId, startDate);
        
        if (!validation.isValid) {
          setValidationError(validation.conflicts.join('; '));
          return false;
        }
      }
      
      setValidationError(null);
      return true;
    } catch (error) {
      console.error('❌ Errore validazione conflitti:', error);
      setValidationError('Errore durante la validazione dei conflitti');
      return false;
    }
  };

  const handleEmployeeChange = async (userId: string) => {
    setFormData(prev => ({ ...prev, user_id: userId }));
    
    // Valida immediatamente se ci sono date selezionate
    if (formData.date) {
      const isHireDateValid = validateDatesAgainstHireDate(formData.date, formData.date_to, userId);
      if (isHireDateValid) {
        await validateConflicts(formData.date, formData.date_to, userId);
      }
    }
  };

  const handleDateChange = async (field: 'date' | 'date_to', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Prima controlla la data di assunzione
    if (formData.user_id) {
      const startDate = field === 'date' ? value : formData.date;
      const endDate = field === 'date_to' ? value : formData.date_to;
      
      const isHireDateValid = validateDatesAgainstHireDate(startDate, endDate, formData.user_id);
      if (isHireDateValid) {
        await validateConflicts(startDate, endDate, formData.user_id);
      }
    }
  };

  const handleTypeChange = async (field: 'is_sick_leave' | 'is_permission', value: boolean) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: value,
      // Reset altri tipi e campi correlati
      is_sick_leave: field === 'is_sick_leave' ? value : false,
      is_permission: field === 'is_permission' ? value : false,
      check_in_time: value ? '' : prev.check_in_time,
      check_out_time: value ? '' : prev.check_out_time,
      permission_time_from: field === 'is_permission' ? prev.permission_time_from : '',
      permission_time_to: field === 'is_permission' ? prev.permission_time_to : '',
    }));

    // Ricontrolla i conflitti con il nuovo tipo
    if (formData.user_id && formData.date) {
      await validateConflicts(formData.date, formData.date_to, formData.user_id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verifica finale della validazione data di assunzione
    if (!validateDatesAgainstHireDate(formData.date, formData.date_to, formData.user_id)) {
      return;
    }

    // Verifica finale della validazione conflitti
    const isConflictValid = await validateConflicts(formData.date, formData.date_to, formData.user_id);
    if (!isConflictValid) {
      return;
    }
    
    if (formData.is_sick_leave && formData.date && formData.date_to) {
      // Gestione range di date per malattia
      const startDate = new Date(formData.date);
      const endDate = new Date(formData.date_to);
      
      const dates = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate).toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Crea una presenza per ogni giorno nel range
      for (const date of dates) {
        const attendanceData = {
          user_id: formData.user_id,
          date: date,
          check_in_time: null,
          check_out_time: null,
          notes: formData.notes || null,
          is_sick_leave: true,
        };
        
        console.log('Salvando giorno di malattia per data:', date);
        createManualAttendance(attendanceData);
      }
    } else if (formData.is_permission) {
      // Gestione permesso
      let notesText = 'Permesso';
      if (formData.permission_time_from && formData.permission_time_to) {
        notesText = `Permesso (${formData.permission_time_from}-${formData.permission_time_to})`;
      } else {
        notesText = 'Permesso'; // Permesso giornaliero
      }
      
      if (formData.notes) {
        notesText += ` - ${formData.notes}`;
      }

      const attendanceData = {
        user_id: formData.user_id,
        date: formData.date,
        check_in_time: formData.permission_time_from || null,
        check_out_time: formData.permission_time_to || null,
        notes: notesText,
        is_sick_leave: false,
      };

      console.log('Salvando permesso:', attendanceData);
      createManualAttendance(attendanceData);
    } else {
      // Gestione presenza singola
      const attendanceData = {
        user_id: formData.user_id,
        date: formData.date,
        check_in_time: formData.is_sick_leave ? null : (formData.check_in_time || null),
        check_out_time: formData.is_sick_leave ? null : (formData.check_out_time || null),
        notes: formData.notes || null,
        is_sick_leave: formData.is_sick_leave,
      };

      console.log('Dati presenza da salvare:', attendanceData);
      createManualAttendance(attendanceData);
    }
    
    // Reset form
    setFormData({
      user_id: '',
      date: '',
      date_to: '',
      check_in_time: '',
      check_out_time: '',
      notes: '',
      is_sick_leave: false,
      is_permission: false,
      permission_time_from: '',
      permission_time_to: '',
    });
    setValidationError(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Inserimento Presenza Manuale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="employee">Dipendente</Label>
              <Select value={formData.user_id} onValueChange={handleEmployeeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona dipendente" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name} ({employee.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo di inserimento */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sick_leave"
                  checked={formData.is_sick_leave}
                  onCheckedChange={(checked) => handleTypeChange('is_sick_leave', checked as boolean)}
                />
                <Label htmlFor="sick_leave" className="text-orange-700 font-medium">
                  Giorno/i di malattia
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="permission"
                  checked={formData.is_permission}
                  onCheckedChange={(checked) => handleTypeChange('is_permission', checked as boolean)}
                />
                <Label htmlFor="permission" className="text-blue-700 font-medium">
                  Permesso
                </Label>
              </div>
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

            {formData.is_sick_leave ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Data Inizio</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => {
                      console.log('Data inizio malattia selezionata:', e.target.value);
                      handleDateChange('date', e.target.value);
                    }}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date_to">Data Fine</Label>
                  <Input
                    id="date_to"
                    type="date"
                    value={formData.date_to}
                    min={formData.date}
                    onChange={(e) => {
                      console.log('Data fine malattia selezionata:', e.target.value);
                      handleDateChange('date_to', e.target.value);
                    }}
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    console.log('Data selezionata dal picker:', e.target.value);
                    handleDateChange('date', e.target.value);
                  }}
                  required
                />
              </div>
            )}

            {formData.is_permission && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-700 mb-2">Tipo di Permesso:</div>
                  <div className="text-xs text-blue-600">
                    • Lascia vuoti gli orari per un permesso giornaliero<br/>
                    • Inserisci orari specifici per un permesso orario
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="permission_from">Dalle ore (opzionale)</Label>
                    <Input
                      id="permission_from"
                      type="time"
                      value={formData.permission_time_from}
                      onChange={(e) => setFormData(prev => ({ ...prev, permission_time_from: e.target.value }))}
                      placeholder="Lascia vuoto per permesso giornaliero"
                    />
                  </div>
                  <div>
                    <Label htmlFor="permission_to">Alle ore (opzionale)</Label>
                    <Input
                      id="permission_to"
                      type="time"
                      value={formData.permission_time_to}
                      onChange={(e) => setFormData(prev => ({ ...prev, permission_time_to: e.target.value }))}
                      placeholder="Lascia vuoto per permesso giornaliero"
                    />
                  </div>
                </div>
              </div>
            )}

            {!formData.is_sick_leave && !formData.is_permission && (
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
            )}

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
              disabled={isCreating || !formData.user_id || !formData.date || (formData.is_sick_leave && !formData.date_to) || !!validationError || isCalculatingConflicts} 
              className="w-full"
            >
              {isCreating ? 'Salvando...' : 
                formData.is_sick_leave ? 'Registra Malattia' : 
                formData.is_permission ? 'Registra Permesso' : 
                'Salva Presenza'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
