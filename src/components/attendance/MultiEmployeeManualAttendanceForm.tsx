
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
    is_permission: false,
    permission_time_from: '',
    permission_time_to: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

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

  const handleEmployeeToggle = (userId: string, checked: boolean) => {
    const newSelectedIds = checked 
      ? [...formData.selected_user_ids, userId]
      : formData.selected_user_ids.filter(id => id !== userId);
    
    setFormData(prev => ({ ...prev, selected_user_ids: newSelectedIds }));
    
    // Valida immediatamente se ci sono date selezionate
    if (formData.date) {
      validateDatesAgainstHireDate(formData.date, formData.date_to, newSelectedIds);
    }
  };

  const handleDateChange = (field: 'date' | 'date_to', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Valida immediatamente se ci sono dipendenti selezionati
    if (formData.selected_user_ids.length > 0) {
      const startDate = field === 'date' ? value : formData.date;
      const endDate = field === 'date_to' ? value : formData.date_to;
      validateDatesAgainstHireDate(startDate, endDate, formData.selected_user_ids);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
          user_id: userId,
          date: formData.date,
          check_in_time: formData.permission_time_from || null,
          check_out_time: formData.permission_time_to || null,
          notes: notesText,
          is_sick_leave: false,
        };

        console.log('Salvando permesso per dipendente:', userId);
        createManualAttendance(attendanceData);
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
      is_permission: false,
      permission_time_from: '',
      permission_time_to: '',
    });
    setValidationError(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Inserimento Manuale Presenza/Malattia
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
                      is_permission: false,
                      check_in_time: checked ? '' : prev.check_in_time,
                      check_out_time: checked ? '' : prev.check_out_time,
                      permission_time_from: '',
                      permission_time_to: ''
                    }));
                  }}
                />
                <Label htmlFor="sick_leave" className="text-orange-700 font-medium">
                  Giorno/i di malattia
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="permission"
                  checked={formData.is_permission}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      is_permission: checked as boolean,
                      is_sick_leave: false,
                      check_in_time: '',
                      check_out_time: ''
                    }));
                  }}
                />
                <Label htmlFor="permission" className="text-blue-700 font-medium">
                  Permesso
                </Label>
              </div>
            </div>

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

            {/* Permesso fields */}
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
                    />
                  </div>
                  <div>
                    <Label htmlFor="permission_to">Alle ore (opzionale)</Label>
                    <Input
                      id="permission_to"
                      type="time"
                      value={formData.permission_time_to}
                      onChange={(e) => setFormData(prev => ({ ...prev, permission_time_to: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Orari presenza normale */}
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
              disabled={isCreating || formData.selected_user_ids.length === 0 || !formData.date || (formData.is_sick_leave && !formData.date_to) || !!validationError} 
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
