import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useManualAttendanceConflicts } from '@/hooks/useManualAttendanceConflicts';
import { useAttendanceSettings } from '@/hooks/useAttendanceSettings';
import { UserPlus, Calendar as CalendarIcon, Users, Trash2, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function AdminManualAttendanceManagement() {
  const { attendances, createManualAttendance, isCreating, deleteAttendance, isDeleting } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const { settings } = useAttendanceSettings();
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSickLeave, setIsSickLeave] = useState(false);

  // Usa il nuovo hook per i conflitti
  const { conflictDates, isLoading: isCalculatingConflicts, isDateDisabled } = useManualAttendanceConflicts(selectedEmployees);

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Funzione per validare le date rispetto alla data di assunzione
  const validateDatesAgainstHireDate = (startDate?: Date, endDate?: Date, employeeIds?: string[]) => {
    if (!startDate || !employeeIds || employeeIds.length === 0) return { isValid: true, error: null };

    for (const employeeId of employeeIds) {
      const employee = employees?.find(emp => emp.id === employeeId);
      if (!employee || !employee.hire_date) continue;

      const hireDateObj = new Date(employee.hire_date);
      
      if (startDate < hireDateObj) {
        return {
          isValid: false,
          error: `⚠️ Impossibile salvare l'evento per ${employee.first_name} ${employee.last_name}: la data di inizio (${format(startDate, 'dd/MM/yyyy')}) è antecedente alla data di assunzione (${format(hireDateObj, 'dd/MM/yyyy')}).`
        };
      }

      if (endDate && endDate < hireDateObj) {
        return {
          isValid: false,
          error: `⚠️ Impossibile salvare l'evento per ${employee.first_name} ${employee.last_name}: la data di fine (${format(endDate, 'dd/MM/yyyy')}) è antecedente alla data di assunzione (${format(hireDateObj, 'dd/MM/yyyy')}).`
        };
      }
    }

    return { isValid: true, error: null };
  };

  const handleCreateAttendance = () => {
    if (selectedEmployees.length === 0 || !startDate) return;

    // Valida date contro data di assunzione
    const validation = validateDatesAgainstHireDate(startDate, endDate, selectedEmployees);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    // Processa ogni dipendente selezionato
    for (const userId of selectedEmployees) {
      if (isSickLeave && startDate && endDate) {
        // Gestione range di date per malattia
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const dates = [];
        const currentDate = new Date(start);
        
        while (currentDate <= end) {
          dates.push(new Date(currentDate).toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Crea una presenza per ogni giorno nel range
        for (const date of dates) {
          createManualAttendance({
            user_id: userId,
            date: date,
            check_in_time: null,
            check_out_time: null,
            notes: notes || null,
            is_sick_leave: true,
          });
        }
      } else {
        // Gestione presenza singola
        createManualAttendance({
          user_id: userId,
          date: format(startDate, 'yyyy-MM-dd'),
          check_in_time: isSickLeave ? null : (checkInTime || null),
          check_out_time: isSickLeave ? null : (settings?.checkout_enabled ? (checkOutTime || null) : null),
          notes: notes || null,
          is_sick_leave: isSickLeave,
        });
      }
    }

    // Reset form
    setSelectedEmployees([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setCheckInTime('');
    setCheckOutTime('');
    setNotes('');
    setIsSickLeave(false);
  };

  const handleDeleteAttendance = (attendance: any, employeeName: string, date: string) => {
    console.log('🔴 Richiesta eliminazione presenza:', {
      attendanceId: attendance.id,
      employeeName,
      date,
      timestamp: new Date().toISOString()
    });
    deleteAttendance(attendance);
  };

  // Filtra le presenze manuali e malattie
  const manualAttendances = attendances?.filter(att => att.is_manual || att.is_sick_leave) || [];
  const sickLeaveCount = manualAttendances.filter(att => att.is_sick_leave).length;
  const regularAttendanceCount = manualAttendances.filter(att => !att.is_sick_leave).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form per creare presenza/malattia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Inserimento Presenza/Malattia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Dipendenti (seleziona uno o più)</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {employees?.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={employee.id}
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={() => handleEmployeeToggle(employee.id)}
                    />
                    <Label htmlFor={employee.id} className="text-sm font-normal cursor-pointer">
                      {employee.first_name} {employee.last_name}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedEmployees.length > 0 && (
                <div className="text-sm text-blue-600 mt-1">
                  {selectedEmployees.length} dipendente/i selezionato/i
                  {isCalculatingConflicts && <span className="ml-2 text-orange-600">(Calcolo conflitti...)</span>}
                </div>
              )}
            </div>

            {/* Tipo di inserimento */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <Checkbox
                  id="sick_leave"
                  checked={isSickLeave}
                  onCheckedChange={(checked) => {
                    setIsSickLeave(checked as boolean);
                    if (checked) {
                      setCheckInTime('');
                      setCheckOutTime('');
                    }
                  }}
                />
                <Label htmlFor="sick_leave" className="text-orange-700 font-medium cursor-pointer">
                  Giorno/i di malattia
                </Label>
              </div>
            </div>

            {isSickLeave ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Inizio</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'dd/MM/yyyy', { locale: it }) : 'Seleziona data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        locale={it}
                        disabled={isDateDisabled}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Data Fine</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'dd/MM/yyyy', { locale: it }) : 'Seleziona data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        locale={it}
                        disabled={isDateDisabled}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ) : (
              <div>
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'dd/MM/yyyy', { locale: it }) : 'Seleziona data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      locale={it}
                      disabled={isDateDisabled}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {conflictDates.length > 0 && selectedEmployees.length > 0 && (
              <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                ⚠️ {conflictDates.length} date disabilitate per conflitti con presenze, malattie, trasferte o ferie esistenti
              </div>
            )}

            {/* Orari presenza normale */}
            {!isSickLeave && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="check_in">Orario Entrata</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="check_in"
                      type="time"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {settings?.checkout_enabled && (
                  <div>
                    <Label htmlFor="check_out">Orario Uscita</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="check_out"
                        type="time"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>Note</Label>
              <Textarea
                placeholder="Note aggiuntive..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleCreateAttendance}
              disabled={selectedEmployees.length === 0 || !startDate || (isSickLeave && !endDate) || isCreating}
              className="w-full"
            >
              {isCreating ? 'Salvando...' : 
                isSickLeave ? `Registra Malattia per ${selectedEmployees.length} dipendente/i` : 
                `Salva Presenza per ${selectedEmployees.length} dipendente/i`}
            </Button>
          </CardContent>
        </Card>

        {/* Statistiche presenze manuali */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Statistiche Presenze Manuali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{manualAttendances.length}</div>
                <div className="text-sm text-blue-600">Presenze Manuali Totali</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">{regularAttendanceCount}</div>
                <div className="text-sm text-green-600">Presenze Normali</div>
              </div>

              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-700">{sickLeaveCount}</div>
                <div className="text-sm text-red-600">Giorni di Malattia</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tutte le presenze manuali */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Tutte le Presenze Manuali
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {manualAttendances.map((attendance) => (
              <div key={attendance.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {attendance.profiles?.first_name} {attendance.profiles?.last_name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={attendance.is_sick_leave ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                      {attendance.is_sick_leave ? 'Malattia' : 'Presenza'}
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {isDeleting ? (
                            <AlertCircle className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Elimina {attendance.is_sick_leave ? 'Malattia' : 'Presenza'}</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sei sicuro di voler eliminare questa {attendance.is_sick_leave ? 'malattia' : 'presenza'} per {attendance.profiles?.first_name} {attendance.profiles?.last_name}? 
                            <br /><br />
                            <strong>Questa azione:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>Eliminerà la {attendance.is_sick_leave ? 'malattia' : 'presenza'} in modo permanente</li>
                              <li>Non può essere annullata</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteAttendance(attendance, `${attendance.profiles?.first_name} ${attendance.profiles?.last_name}`, attendance.date)}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 animate-spin" />
                                Eliminando...
                              </div>
                            ) : (
                              'Elimina Definitivamente'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="text-sm space-y-1">
                  <div><strong>Data:</strong> {format(new Date(attendance.date), 'dd/MM/yyyy', { locale: it })}</div>
                  {!attendance.is_sick_leave && attendance.check_in_time && (
                    <div><strong>Orario Entrata:</strong> {attendance.check_in_time}</div>
                  )}
                  {!attendance.is_sick_leave && attendance.check_out_time && (
                    <div><strong>Orario Uscita:</strong> {attendance.check_out_time}</div>
                  )}
                  {attendance.notes && (
                    <div className="p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                      <strong>Note:</strong> {attendance.notes}
                    </div>
                  )}
                </div>
              </div>
            )) || (
              <div className="text-center py-4 text-gray-500">
                Nessuna presenza manuale registrata
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}