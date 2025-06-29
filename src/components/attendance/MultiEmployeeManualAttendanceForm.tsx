import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useAttendanceSettings } from '@/hooks/useAttendanceSettings';
import { useAttendanceConflictValidation } from '@/hooks/useAttendanceConflictValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

export default function MultiEmployeeManualAttendanceForm() {
  const { createManualAttendance, isCreating } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const { settings } = useAttendanceSettings();
  const { checkAttendanceConflicts } = useAttendanceConflictValidation();
  const [formData, setFormData] = useState({
    selected_user_ids: [] as string[],
    date: '',
    date_to: '',
    check_in_time: '',
    check_out_time: '',
    notes: '',
    is_sick_leave: false,
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [conflictErrors, setConflictErrors] = useState<string[]>([]);

  // Funzione per validare le date rispetto alla data di assunzione
  const validateDatesAgainstHireDate = (startDate: string, endDate: string, employeeIds: string[]) => {
    if (!startDate || employeeIds.length === 0) return true;

    for (const employeeId of employeeIds) {
      const employee = employees?.find(emp => emp.id === employeeId);
      if (!employee || !employee.hire_date) continue;

      const hireDateObj = new Date(employee.hire_date);
      const startDateObj = new Date(startDate);
      
      if (startDateObj < hireDateObj) {
        setValidationError(`⚠️ Impossibile salvare l'evento per ${employee.first_name} ${employee.last_name}: la data di inizio (${format(startDateObj, 'dd/MM/yyyy')}) è antecedente alla data di assunzione (${format(hireDateObj, 'dd/MM/yyyy')}).`);
        return false;
      }

      if (endDate) {
        const endDateObj = new Date(endDate);
        if (endDateObj < hireDateObj) {
          setValidationError(`⚠️ Impossibile salvare l'evento per ${employee.first_name} ${employee.last_name}: la data di fine (${format(endDateObj, 'dd/MM/yyyy')}) è antecedente alla data di assunzione (${format(hireDateObj, 'dd/MM/yyyy')}).`);
          return false;
        }
      }
    }

    setValidationError(null);
    return true;
  };

  // Check conflicts for selected employees
  const checkEmployeesConflicts = async (employeeIds: string[], date: string) => {
    if (!date || employeeIds.length === 0) {
      setConflictErrors([]);
      return;
    }

    const conflicts: string[] = [];
    
    for (const employeeId of employeeIds) {
      try {
        const result = await checkAttendanceConflicts(employeeId, date);
        if (result.hasConflict) {
          const employee = employees?.find(emp => emp.id === employeeId);
          const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Dipendente';
          
          let conflictMessage = '';
          switch (result.conflictType) {
            case 'business_trip':
              conflictMessage = `🚫 ${employeeName} è in trasferta: ${result.conflictDetails}`;
              break;
            case 'ferie':
              conflictMessage = `🏖️ ${employeeName} è in ferie: ${result.conflictDetails}`;
              break;
            case 'permesso':
              conflictMessage = `📅 ${employeeName} ha un permesso: ${result.conflictDetails}`;
              break;
            case 'malattia':
              conflictMessage = `🏥 ${employeeName} è in malattia: ${result.conflictDetails}`;
              break;
            default:
              conflictMessage = `⚠️ ${employeeName}: ${result.message}`;
          }
          
          conflicts.push(conflictMessage);
        }
      } catch (error) {
        console.error(`Errore controllo conflitti per ${employeeId}:`, error);
        const employee = employees?.find(emp => emp.id === employeeId);
        const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Dipendente';
        conflicts.push(`⚠️ ${employeeName}: Errore durante il controllo`);
      }
    }
    
    setConflictErrors(conflicts);
  };

  const handleEmployeeToggle = (userId: string, checked: boolean) => {
    const newSelectedIds = checked 
      ? [...formData.selected_user_ids, userId]
      : formData.selected_user_ids.filter(id => id !== userId);
    
    setFormData(prev => ({ ...prev, selected_user_ids: newSelectedIds }));
    
    // Valida immediatamente se ci sono date selezionate
    if (formData.date) {
      validateDatesAgainstHireDate(formData.date, formData.date_to, newSelectedIds);
      checkEmployeesConflicts(newSelectedIds, formData.date);
    }
  };

  const handleDateChange = (field: 'date' | 'date_to', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Valida immediatamente se ci sono dipendenti selezionati
    if (formData.selected_user_ids.length > 0) {
      const startDate = field === 'date' ? value : formData.date;
      const endDate = field === 'date_to' ? value : formData.date_to;
      validateDatesAgainstHireDate(startDate, endDate, formData.selected_user_ids);
      
      // Controlla conflitti solo per la data principale
      if (field === 'date' && value) {
        checkEmployeesConflicts(formData.selected_user_ids, value);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Controllo finale dei conflitti
    if (formData.selected_user_ids.length > 0 && formData.date) {
      await checkEmployeesConflicts(formData.selected_user_ids, formData.date);
      if (conflictErrors.length > 0) {
        return; // Non procedere se ci sono conflitti
      }
    }
    
    // Verifica finale della validazione
    if (!validateDatesAgainstHireDate(formData.date, formData.date_to, formData.selected_user_ids)) {
      return;
    }
    
    // Processa ogni dipendente selezionato
    for (const userId of formData.selected_user_ids) {
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
            user_id: userId,
            date: date,
            check_in_time: null,
            check_out_time: null,
            notes: formData.notes || null,
            is_sick_leave: true,
          };
          
          console.log('Salvando giorno di malattia per dipendente:', userId, 'data:', date);
          createManualAttendance(attendanceData);
        }
      } else {
        // Gestione presenza singola
        const attendanceData = {
          user_id: userId,
          date: formData.date,
          check_in_time: formData.is_sick_leave ? null : (formData.check_in_time || null),
          check_out_time: formData.is_sick_leave ? null : (settings?.checkout_enabled ? (formData.check_out_time || null) : null),
          notes: formData.notes || null,
          is_sick_leave: formData.is_sick_leave,
        };

        console.log('Salvando presenza per dipendente:', userId);
        createManualAttendance(attendanceData);
      }
    }
    
    // Reset form
    setFormData({
      selected_user_ids: [],
      date: '',
      date_to: '',
      check_in_time: '',
      check_out_time: '',
      notes: '',
      is_sick_leave: false,
    });
    setValidationError(null);
    setConflictErrors([]);
  };

  const hasErrors = !!validationError || conflictErrors.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Inserimento Presenza/Malattia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selezione dipendenti */}
            <div>
              <Label className="text-base font-medium mb-3 block">Seleziona Dipendenti</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto border rounded-md p-4">
                {employees?.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={employee.id}
                      checked={formData.selected_user_ids.includes(employee.id)}
                      onCheckedChange={(checked) => handleEmployeeToggle(employee.id, checked as boolean)}
                    />
                    <Label htmlFor={employee.id} className="text-sm">
                      {employee.first_name} {employee.last_name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Tipo di inserimento */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sick_leave"
                  checked={formData.is_sick_leave}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      is_sick_leave: checked as boolean,
                      check_in_time: checked ? '' : prev.check_in_time,
                      check_out_time: checked ? '' : prev.check_out_time,
                    }));
                  }}
                />
                <Label htmlFor="sick_leave" className="text-orange-700 font-medium">
                  Giorno/i di malattia
                </Label>
              </div>
            </div>

            {/* Error alerts */}
            {conflictErrors.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Conflitti rilevati:</div>
                    {conflictErrors.map((error, index) => (
                      <div key={index} className="text-sm">• {error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            {/* Date */}
            {formData.is_sick_leave ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Data Inizio</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleDateChange('date', e.target.value)}
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
                    onChange={(e) => handleDateChange('date_to', e.target.value)}
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
                  onChange={(e) => handleDateChange('date', e.target.value)}
                  required
                />
              </div>
            )}

            {/* Orari presenza normale */}
            {!formData.is_sick_leave && (
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
                {settings?.checkout_enabled && (
                  <div>
                    <Label htmlFor="check_out">Orario Uscita</Label>
                    <Input
                      id="check_out"
                      type="time"
                      value={formData.check_out_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, check_out_time: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Note */}
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
              disabled={isCreating || formData.selected_user_ids.length === 0 || !formData.date || (formData.is_sick_leave && !formData.date_to) || hasErrors} 
              className="w-full"
            >
              {isCreating ? 'Salvando...' : 
                formData.is_sick_leave ? 'Registra Malattia' : 
                'Salva Presenza'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
