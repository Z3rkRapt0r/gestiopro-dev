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
import { useLeaveConflicts } from '@/hooks/useLeaveConflicts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

export default function MultiEmployeeManualAttendanceForm() {
  const { createManualAttendance, isCreating } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const { settings } = useAttendanceSettings();
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
  const [bulkValidationResults, setBulkValidationResults] = useState<{[userId: string]: any}>({});

  // Usa il sistema anti-conflitto per operazioni bulk
  const { 
    validateBulkAttendance
  } = useLeaveConflicts();

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

  // Validazione bulk anti-conflitto
  const validateBulkConflicts = async (startDate: string, endDate: string, employeeIds: string[]) => {
    if (!startDate || employeeIds.length === 0) return true;

    try {
      console.log('🔍 Controllo conflitti bulk...');
      const results = await validateBulkAttendance(employeeIds, startDate, endDate);
      setBulkValidationResults(results);
      
      // Trova dipendenti con conflitti
      const employeesWithConflicts = Object.entries(results)
        .filter(([_, result]) => !result.isValid)
        .map(([userId, result]) => {
          const employee = employees?.find(emp => emp.id === userId);
          return `${employee?.first_name} ${employee?.last_name}: ${result.conflicts.join(', ')}`;
        });

      if (employeesWithConflicts.length > 0) {
        setValidationError(`Conflitti trovati per: ${employeesWithConflicts.join('; ')}`);
        return false;
      }
      
      setValidationError(null);
      return true;
    } catch (error) {
      console.error('❌ Errore validazione conflitti bulk:', error);
      setValidationError('Errore durante la validazione dei conflitti');
      return false;
    }
  };

  const handleEmployeeToggle = async (userId: string, checked: boolean) => {
    const newSelectedIds = checked 
      ? [...formData.selected_user_ids, userId]
      : formData.selected_user_ids.filter(id => id !== userId);
    
    setFormData(prev => ({ ...prev, selected_user_ids: newSelectedIds }));
    
    // Valida immediatamente se ci sono date selezionate
    if (formData.date && newSelectedIds.length > 0) {
      const isHireDateValid = validateDatesAgainstHireDate(formData.date, formData.date_to, newSelectedIds);
      if (isHireDateValid) {
        await validateBulkConflicts(formData.date, formData.date_to, newSelectedIds);
      }
    }
  };

  const handleDateChange = async (field: 'date' | 'date_to', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Valida immediatamente se ci sono dipendenti selezionati
    if (formData.selected_user_ids.length > 0) {
      const startDate = field === 'date' ? value : formData.date;
      const endDate = field === 'date_to' ? value : formData.date_to;
      
      const isHireDateValid = validateDatesAgainstHireDate(startDate, endDate, formData.selected_user_ids);
      if (isHireDateValid) {
        await validateBulkConflicts(startDate, endDate, formData.selected_user_ids);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verifica finale della validazione data di assunzione
    if (!validateDatesAgainstHireDate(formData.date, formData.date_to, formData.selected_user_ids)) {
      return;
    }

    // Verifica finale della validazione conflitti
    const isConflictValid = await validateBulkConflicts(formData.date, formData.date_to, formData.selected_user_ids);
    if (!isConflictValid) {
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
          dates.push(format(new Date(currentDate), 'yyyy-MM-dd'));
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
  };

  // Conta dipendenti con conflitti
  const employeesWithConflicts = Object.entries(bulkValidationResults)
    .filter(([_, result]) => !result.isValid)
    .map(([userId, _]) => {
      const employee = employees?.find(emp => emp.id === userId);
      return employee ? `${employee.first_name} ${employee.last_name}` : 'Sconosciuto';
    });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <UserPlus className="w-5 h-5" />
            Inserimento Presenza/Malattia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Selezione dipendenti - Mobile optimized */}
            <div>
              <Label className="text-base font-medium mb-3 block">Seleziona Dipendenti</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 sm:max-h-64 overflow-y-auto border rounded-md p-4 bg-slate-50">
                {employees?.map((employee) => {
                  const hasConflict = bulkValidationResults[employee.id] && !bulkValidationResults[employee.id].isValid;
                  return (
                    <div key={employee.id} className={`flex items-center space-x-3 py-2 ${hasConflict ? 'text-red-600' : ''}`}>
                      <Checkbox
                        id={employee.id}
                        checked={formData.selected_user_ids.includes(employee.id)}
                        onCheckedChange={(checked) => handleEmployeeToggle(employee.id, checked as boolean)}
                        disabled={hasConflict}
                        className="h-5 w-5"
                      />
                      <Label htmlFor={employee.id} className="text-sm sm:text-base leading-tight cursor-pointer flex-1">
                        <div className="font-medium">{employee.first_name} {employee.last_name}</div>
                        {hasConflict && <div className="text-xs text-red-500">conflitto</div>}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mostra dipendenti con conflitti */}
            {employeesWithConflicts.length > 0 && (
              <Alert variant="destructive" className="text-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="break-words">
                  {employeesWithConflicts.length} dipendente/i con conflitti (disabilitati): {employeesWithConflicts.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            {/* Tipo di inserimento */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
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
                  className="h-5 w-5"
                />
                <Label htmlFor="sick_leave" className="text-orange-700 font-medium text-sm sm:text-base cursor-pointer">
                  Giorno/i di malattia
                </Label>
              </div>
            </div>

            {validationError && (
              <Alert variant="destructive" className="text-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="break-words">{validationError}</AlertDescription>
              </Alert>
            )}

            {/* Date - Mobile responsive layout */}
            {formData.is_sick_leave ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date" className="text-sm sm:text-base">Data Inizio</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleDateChange('date', e.target.value)}
                    required
                    className="mt-1 h-11 sm:h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="date_to" className="text-sm sm:text-base">Data Fine</Label>
                  <Input
                    id="date_to"
                    type="date"
                    value={formData.date_to}
                    min={formData.date}
                    onChange={(e) => handleDateChange('date_to', e.target.value)}
                    required
                    className="mt-1 h-11 sm:h-10"
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="date" className="text-sm sm:text-base">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleDateChange('date', e.target.value)}
                  required
                  className="mt-1 h-11 sm:h-10"
                />
              </div>
            )}

            {/* Orari presenza normale - Mobile responsive */}
            {!formData.is_sick_leave && (
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
                {settings?.checkout_enabled && (
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
                )}
              </div>
            )}

            {/* Note */}
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
              disabled={isCreating || formData.selected_user_ids.length === 0 || !formData.date || (formData.is_sick_leave && !formData.date_to) || !!validationError} 
              className="w-full h-11 sm:h-10 text-base sm:text-sm"
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
