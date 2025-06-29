
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
import { useAttendanceConflictValidation } from '@/hooks/useAttendanceConflictValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

export default function NewManualAttendanceForm() {
  const { createManualAttendance, isCreating } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const { checkAttendanceConflicts } = useAttendanceConflictValidation();
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
  const [conflictError, setConflictError] = useState<string | null>(null);

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

  // Check for attendance conflicts
  const checkConflicts = async (userId: string, date: string) => {
    if (!userId || !date) {
      setConflictError(null);
      return;
    }

    try {
      const result = await checkAttendanceConflicts(userId, date);
      if (result.hasConflict) {
        const employee = employees?.find(emp => emp.id === userId);
        const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Il dipendente';
        
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
            conflictMessage = `⚠️ ${result.message}`;
        }
        
        setConflictError(conflictMessage);
      } else {
        setConflictError(null);
      }
    } catch (error) {
      console.error('Errore controllo conflitti:', error);
      setConflictError('Errore durante il controllo dei conflitti');
    }
  };

  const handleEmployeeChange = (userId: string) => {
    setFormData(prev => ({ ...prev, user_id: userId }));
    
    // Valida immediatamente se ci sono date selezionate
    if (formData.date) {
      validateDatesAgainstHireDate(formData.date, formData.date_to, userId);
      checkConflicts(userId, formData.date);
    }
  };

  const handleDateChange = (field: 'date' | 'date_to', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Valida immediatamente se c'è un dipendente selezionato
    if (formData.user_id) {
      const startDate = field === 'date' ? value : formData.date;
      const endDate = field === 'date_to' ? value : formData.date_to;
      validateDatesAgainstHireDate(startDate, endDate, formData.user_id);
      
      // Controlla conflitti solo per la data principale
      if (field === 'date' && value) {
        checkConflicts(formData.user_id, value);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Controllo finale dei conflitti
    if (formData.user_id && formData.date) {
      const conflictResult = await checkAttendanceConflicts(formData.user_id, formData.date);
      if (conflictResult.hasConflict) {
        setConflictError(conflictResult.message || 'Conflitto rilevato - inserimento non consentito');
        return;
      }
    }
    
    // Verifica finale della validazione
    if (!validateDatesAgainstHireDate(formData.date, formData.date_to, formData.user_id)) {
      return;
    }
    
    if (formData.is_sick_leave) {
      // CORREZIONE BUG: Gestione corretta malattia singola vs multipla
      const startDate = new Date(formData.date);
      let endDate;
      
      // Se date_to è vuoto o uguale a date, è una malattia di un solo giorno
      if (!formData.date_to || formData.date_to === formData.date) {
        endDate = new Date(formData.date); // Stesso giorno
        console.log('Malattia singola - data:', formData.date);
      } else {
        endDate = new Date(formData.date_to);
        console.log('Malattia multipla - dal:', formData.date, 'al:', formData.date_to);
      }
      
      const dates = [];
      const currentDate = new Date(startDate);
      
      // Genera le date del range (o singola data)
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate).toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log('Date da creare per malattia:', dates);
      
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
    setConflictError(null);
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

            {/* Error alerts */}
            {conflictError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{conflictError}</AlertDescription>
              </Alert>
            )}

            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            {formData.is_sick_leave ? (
              <div className="space-y-4">
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-sm font-medium text-orange-700 mb-2">Malattia:</div>
                  <div className="text-xs text-orange-600">
                    • Per un solo giorno: inserisci solo la data di inizio<br/>
                    • Per più giorni: inserisci data di inizio e fine
                  </div>
                </div>
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
                    <Label htmlFor="date_to">Data Fine (opzionale)</Label>
                    <Input
                      id="date_to"
                      type="date"
                      value={formData.date_to}
                      min={formData.date}
                      onChange={(e) => {
                        console.log('Data fine malattia selezionata:', e.target.value);
                        handleDateChange('date_to', e.target.value);
                      }}
                      placeholder="Lascia vuoto per un solo giorno"
                    />
                  </div>
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
              disabled={isCreating || !formData.user_id || !formData.date || !!validationError || !!conflictError} 
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
