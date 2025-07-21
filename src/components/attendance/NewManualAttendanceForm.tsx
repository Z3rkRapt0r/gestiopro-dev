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
import ConflictSummaryCard from './ConflictSummaryCard';

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

  // Usa il sistema anti-conflitto migliorato
  const { 
    conflictDates,
    conflictDetails,
    conflictSummary,
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
    setValidationError(null);
    
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

  // Trova il nome del dipendente selezionato
  const selectedEmployee = employees?.find(emp => emp.id === formData.user_id);
  const employeeName = selectedEmployee 
    ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` 
    : undefined;

  // Verifica se una data è disabilitata
  const isDateInputDisabled = (dateValue: string) => {
    if (!dateValue) return false;
    return isDateDisabled(new Date(dateValue));
  };

  // Modifica handleSubmit per validare la presenza anche in caso di permesso orario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Verifica finale della validazione data di assunzione
    if (!validateDatesAgainstHireDate(formData.date, formData.date_to, formData.user_id)) {
      return;
    }

    // Recupera permessi orari per il giorno selezionato
    let permessoOrarioFine = null;
    const permessiOrari = conflictDetails.filter(
      detail => detail.date === formData.date && detail.type === 'permission' && detail.description.includes('(')
    );
    if (permessiOrari.length > 0) {
      // Estrai l'orario di fine dal testo (es: Permesso approvato (09:00-11:00))
      const match = permessiOrari[0].description.match(/\((\d{2}:\d{2})-(\d{2}:\d{2})\)/);
      if (match) {
        permessoOrarioFine = match[2];
      }
    }

    // Se esiste un permesso orario e il check-in è prima della fine del permesso, forza il check-in dopo il permesso
    let checkInTime = formData.check_in_time;
    if (permessoOrarioFine) {
      if (!checkInTime || checkInTime < permessoOrarioFine) {
        checkInTime = permessoOrarioFine;
      }
    }

    // Verifica finale della validazione conflitti (passa checkInTime)
    const isConflictValid = await validateAttendanceEntry(formData.user_id, formData.date, checkInTime);
    if (!isConflictValid) {
      // Mostra solo avviso, non blocca
      setValidationError('Attenzione: esiste un permesso orario per questo giorno. La presenza sarà registrata a partire dalla fine del permesso.');
    } else {
      setValidationError(null);
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
      // Gestione permesso orario (obbligatorio)
      if (!formData.permission_time_from || !formData.permission_time_to) {
        alert("Inserisci orario di inizio e fine per il permesso");
        return;
      }
      
      let notesText = `Permesso (${formData.permission_time_from}-${formData.permission_time_to})`;
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
        check_in_time: formData.is_sick_leave ? null : (checkInTime || null),
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
    <div className="max-w-2xl mx-auto space-y-4">
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
              <Label>Dipendenti (seleziona uno)</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {employees?.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={employee.id}
                      checked={formData.user_id === employee.id}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleEmployeeChange(employee.id);
                        } else {
                          handleEmployeeChange('');
                        }
                      }}
                    />
                    <Label htmlFor={employee.id} className="text-sm font-normal cursor-pointer">
                      {employee.first_name} {employee.last_name}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.user_id && (
                <div className="text-sm text-blue-600 mt-1">
                  1 dipendente selezionato
                  {isCalculatingConflicts && <span className="ml-2 text-orange-600">(Calcolo conflitti...)</span>}
                </div>
              )}
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
                    className={isDateInputDisabled(formData.date) ? 'border-red-300 bg-red-50' : ''}
                    required
                  />
                  {isDateInputDisabled(formData.date) && (
                    <p className="text-xs text-red-600 mt-1">⚠️ Data con conflitti</p>
                  )}
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
                    className={isDateInputDisabled(formData.date_to) ? 'border-red-300 bg-red-50' : ''}
                    required
                  />
                  {isDateInputDisabled(formData.date_to) && (
                    <p className="text-xs text-red-600 mt-1">⚠️ Data con conflitti</p>
                  )}
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
                  className={isDateInputDisabled(formData.date) ? 'border-red-300 bg-red-50' : ''}
                  required
                />
                {isDateInputDisabled(formData.date) && (
                  <p className="text-xs text-red-600 mt-1">⚠️ Data con conflitti</p>
                )}
                {/* Avviso permesso orario presente */}
                {formData.date && conflictDetails
                  .filter(detail => detail.date === formData.date && detail.type === 'permission')
                  .map((detail, idx) => (
                    <Alert key={idx} className="border-yellow-200 bg-yellow-50 mb-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-700">
                        Attenzione: {detail.description}
                      </AlertDescription>
                    </Alert>
                  ))}
              </div>
            )}

            {formData.is_permission && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-700 mb-2">Permesso Orario</div>
                  <div className="text-xs text-blue-600">
                    Inserisci orario di inizio e fine del permesso (entrambi obbligatori)
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="permission_from">Dalle ore *</Label>
                    <Input
                      id="permission_from"
                      type="time"
                      value={formData.permission_time_from}
                      onChange={(e) => setFormData(prev => ({ ...prev, permission_time_from: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="permission_to">Alle ore *</Label>
                    <Input
                      id="permission_to"
                      type="time"
                      value={formData.permission_time_to}
                      onChange={(e) => setFormData(prev => ({ ...prev, permission_time_to: e.target.value }))}
                      required
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
