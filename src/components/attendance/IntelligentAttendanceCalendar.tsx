
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useCompanyHolidays } from '@/hooks/useCompanyHolidays';
import { useLeaveConflicts } from '@/hooks/useLeaveConflicts';
import { format, isToday, isFuture } from 'date-fns';
import { it } from 'date-fns/locale';

export default function IntelligentAttendanceCalendar() {
  const { employees } = useActiveEmployees();
  const { createManualAttendance, isCreating } = useUnifiedAttendances();
  const { isHoliday, getHoliday } = useCompanyHolidays();
  
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { 
    conflictDates,
    isLoading: isCalculatingConflicts,
    isDateDisabled: hasConflicts,
    validateAttendanceEntry
  } = useLeaveConflicts(selectedEmployee, 'attendance');

  // Funzione per verificare se una data è disabilitata
  const isDateDisabled = (date: Date) => {
    // Non permettere date future (tranne oggi)
    if (isFuture(date) && !isToday(date)) return true;
    
    // Non permettere giorni festivi
    if (isHoliday(date)) return true;
    
    // Non permettere date con conflitti (malattie, ferie, trasferte)
    if (hasConflicts(date)) return true;
    
    return false;
  };

  // Modifica della selezione dipendente
  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    setSelectedDate(undefined);
    setValidationError(null);
  };

  // Modifica della selezione data
  const handleDateSelect = async (date: Date | undefined) => {
    setSelectedDate(date);
    setValidationError(null);
    
    if (date && selectedEmployee) {
      // Controlla conflitti per la data selezionata
      const validation = await validateAttendanceEntry(selectedEmployee, format(date, 'yyyy-MM-dd'));
      
      if (!validation.isValid) {
        setValidationError(validation.conflicts.join('; '));
      }
    }
  };

  // Messaggio per data selezionata
  const getDateMessage = () => {
    if (!selectedDate) return null;
    
    if (isHoliday(selectedDate)) {
      const holiday = getHoliday(selectedDate);
      return {
        type: 'warning' as const,
        message: `Giorno festivo: ${holiday?.name}`
      };
    }
    
    if (hasConflicts(selectedDate)) {
      return {
        type: 'error' as const,
        message: 'Data con conflitti (malattie, ferie o trasferte)'
      };
    }
    
    if (validationError) {
      return {
        type: 'error' as const,
        message: validationError
      };
    }
    
    return {
      type: 'success' as const,
      message: 'Data disponibile per registrazione presenza'
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee || !selectedDate) {
      alert('Seleziona dipendente e data');
      return;
    }
    
    if (validationError) {
      alert('Impossibile salvare: ' + validationError);
      return;
    }

    const attendanceData = {
      user_id: selectedEmployee,
      date: format(selectedDate, 'yyyy-MM-dd'),
      check_in_time: checkInTime || null,
      check_out_time: checkOutTime || null,
      notes: notes || null,
    };

    console.log('Salvando presenza normale:', attendanceData);
    await createManualAttendance(attendanceData);
    
    // Reset form
    setSelectedEmployee('');
    setSelectedDate(undefined);
    setCheckInTime('');
    setCheckOutTime('');
    setNotes('');
    setValidationError(null);
  };

  const selectedEmployeeName = employees?.find(emp => emp.id === selectedEmployee);
  const dateMessage = getDateMessage();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Calendario Intelligente Presenze
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Seleziona dipendente e data per registrare una presenza. Le date con conflitti sono automaticamente disabilitate.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selezione dipendente */}
          <div>
            <Label htmlFor="employee">Dipendente</Label>
            <Select value={selectedEmployee} onValueChange={handleEmployeeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un dipendente" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEmployee && (
              <div className="text-sm text-blue-600 mt-1">
                Dipendente selezionato: {selectedEmployeeName?.first_name} {selectedEmployeeName?.last_name}
                {isCalculatingConflicts && <span className="ml-2 text-orange-600">(Calcolo conflitti...)</span>}
              </div>
            )}
          </div>

          {/* Calendario e selezione data */}
          {selectedEmployee && (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Seleziona Data</Label>
                <div className="border rounded-lg p-3">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={isDateDisabled}
                    locale={it}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {/* Messaggio stato data */}
                {dateMessage && (
                  <Alert variant={dateMessage.type === 'error' ? 'destructive' : 'default'}>
                    {dateMessage.type === 'success' && <CheckCircle className="h-4 w-4" />}
                    {dateMessage.type === 'warning' && <AlertCircle className="h-4 w-4" />}
                    {dateMessage.type === 'error' && <AlertCircle className="h-4 w-4" />}
                    <AlertDescription>{dateMessage.message}</AlertDescription>
                  </Alert>
                )}

                {/* Data selezionata */}
                {selectedDate && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-700 mb-1">Data Selezionata</div>
                    <div className="text-lg font-semibold text-blue-900">
                      {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: it })}
                    </div>
                  </div>
                )}

                {/* Form orari */}
                {selectedDate && !validationError && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="check_in">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Entrata
                        </Label>
                        <Input
                          id="check_in"
                          type="time"
                          value={checkInTime}
                          onChange={(e) => setCheckInTime(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="check_out">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Uscita
                        </Label>
                        <Input
                          id="check_out"
                          type="time"
                          value={checkOutTime}
                          onChange={(e) => setCheckOutTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">Note</Label>
                      <Textarea
                        id="notes"
                        placeholder="Note aggiuntive..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isCreating || !selectedDate || !!validationError} 
                      className="w-full"
                    >
                      {isCreating ? 'Salvando...' : 'Registra Presenza'}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legenda Calendario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span>Date disabilitate (giorni festivi, conflitti, date future)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span>Data di oggi</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 bg-black text-white rounded flex items-center justify-center text-xs">✓</div>
            <span>Data selezionata</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
