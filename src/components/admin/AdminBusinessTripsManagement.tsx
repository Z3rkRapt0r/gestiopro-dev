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
import { useBusinessTrips } from '@/hooks/useBusinessTrips';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useBusinessTripConflicts } from '@/hooks/useBusinessTripConflicts';
import { useCompanyHolidays } from '@/hooks/useCompanyHolidays';
import { Plane, Calendar as CalendarIcon, Users, Trash2, AlertCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function AdminBusinessTripsManagement() {
  const { businessTrips, createTrip, isCreating, deleteTrip, isDeleting } = useBusinessTrips();
  const { employees } = useActiveEmployees();
  const { holidays } = useCompanyHolidays();
  const { toast } = useToast();
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Usa il nuovo hook per i conflitti, passando le festività
  const { 
    conflictDates, 
    conflictDetails, 
    conflictSummary, 
    isLoading: isCalculatingConflicts, 
    isDateDisabled,
    getConflictDetailsForDate,
    validateBusinessTripRange
  } = useBusinessTripConflicts(selectedEmployees, holidays);

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
    setValidationError(null); // Reset error when employees change
  };

  const handleCreateTrip = async () => {
    if (selectedEmployees.length === 0 || !startDate || !endDate || !destination) return;

    // Validazione anticonflitto avanzata
    const validation = await validateBusinessTripRange(
      selectedEmployees,
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd')
    );

    if (!validation.isValid) {
      setValidationError(validation.conflicts.join('; '));
      toast({
        title: "Conflitti rilevati",
        description: validation.conflicts.join('; '),
        variant: "destructive",
      });
      return;
    }

    setValidationError(null);

    createTrip({
      user_ids: selectedEmployees,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      destination,
      reason,
    });

    // Reset form
    setSelectedEmployees([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setDestination('');
    setReason('');
    setValidationError(null);
  };

  const handleDeleteTrip = (tripId: string, employeeName: string) => {
    console.log('🔴 Richiesta eliminazione trasferta:', {
      tripId,
      employeeName,
      timestamp: new Date().toISOString()
    });
    deleteTrip(tripId);
  };

  // Funzione per ottenere i dettagli dei conflitti per una data specifica
  const getConflictDetailsForSelectedDate = (date: Date) => {
    return getConflictDetailsForDate(date);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form per creare trasferta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5" />
              Crea Trasferta per Dipendenti
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
                      modifiers={{
                        conflict: conflictDates
                      }}
                      modifiersStyles={{
                        conflict: {
                          backgroundColor: '#f3f4f6',
                          color: '#6b7280',
                          fontWeight: 'normal'
                        }
                      }}
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
                      defaultMonth={startDate || undefined}
                      disabled={(date) => {
                        // Disabilita date precedenti alla data di inizio
                        if (startDate && date < startDate) {
                          return true;
                        }
                        // Disabilita date con conflitti
                        return isDateDisabled(date);
                      }}
                      modifiers={{
                        conflict: conflictDates
                      }}
                      modifiersStyles={{
                        conflict: {
                          backgroundColor: '#f3f4f6',
                          color: '#6b7280',
                          fontWeight: 'normal'
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Riepilogo conflitti avanzato */}
            {conflictSummary.totalConflicts > 0 && (
              <div className="text-sm bg-orange-50 p-3 rounded border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-orange-800">
                    {conflictSummary.totalConflicts} date disabilitate per conflitti
                  </span>
                </div>
                <div className="text-xs text-orange-700 space-y-1">
                  {conflictSummary.holidays > 0 && (
                    <div>• {conflictSummary.holidays} festività</div>
                  )}
                  {conflictSummary.businessTrips > 0 && (
                    <div>• {conflictSummary.businessTrips} giorni in trasferta</div>
                  )}
                  {conflictSummary.vacations > 0 && (
                    <div>• {conflictSummary.vacations} giorni di ferie</div>
                  )}
                  {conflictSummary.permissions > 0 && (
                    <div>• {conflictSummary.permissions} permessi</div>
                  )}
                  {conflictSummary.sickLeaves > 0 && (
                    <div>• {conflictSummary.sickLeaves} giorni di malattia</div>
                  )}
                  {conflictSummary.attendances > 0 && (
                    <div>• {conflictSummary.attendances} presenze registrate</div>
                  )}
                </div>
              </div>
            )}

            {/* Errore di validazione */}
            {validationError && (
              <div className="text-sm bg-red-50 p-3 rounded border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-red-800">Conflitti rilevati</span>
                </div>
                <div className="text-xs text-red-700">
                  {validationError}
                </div>
              </div>
            )}

            <div>
              <Label>Destinazione</Label>
              <Input
                placeholder="Città, Paese"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>

            <div>
              <Label>Motivo</Label>
              <Textarea
                placeholder="Descrivi il motivo della trasferta..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleCreateTrip}
              disabled={selectedEmployees.length === 0 || !startDate || !endDate || !destination || isCreating}
              className="w-full"
            >
              {isCreating ? 'Creando...' : `Crea Trasferta per ${selectedEmployees.length} dipendente/i`}
            </Button>
          </CardContent>
        </Card>

        {/* Statistiche trasferte */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Statistiche Trasferte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{businessTrips?.length || 0}</div>
                <div className="text-sm text-blue-600">Trasferte Totali</div>
              </div>

              {/* Dettagli conflitti per data selezionata */}
              {(startDate || endDate) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Info className="w-4 h-4" />
                    Dettagli conflitti
                  </div>
                  {startDate && (
                    <div className="text-xs bg-gray-50 p-2 rounded">
                      <div className="font-medium">Data inizio ({format(startDate, 'dd/MM/yyyy')}):</div>
                      {getConflictDetailsForSelectedDate(startDate).length > 0 ? (
                        <ul className="mt-1 space-y-1">
                          {getConflictDetailsForSelectedDate(startDate).map((detail, index) => (
                            <li key={index} className="text-red-600">
                              • {detail.description}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-green-600">Nessun conflitto</span>
                      )}
                    </div>
                  )}
                  {endDate && (
                    <div className="text-xs bg-gray-50 p-2 rounded">
                      <div className="font-medium">Data fine ({format(endDate, 'dd/MM/yyyy')}):</div>
                      {getConflictDetailsForSelectedDate(endDate).length > 0 ? (
                        <ul className="mt-1 space-y-1">
                          {getConflictDetailsForSelectedDate(endDate).map((detail, index) => (
                            <li key={index} className="text-red-600">
                              • {detail.description}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-green-600">Nessun conflitto</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista trasferte esistenti */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5" />
            Trasferte Esistenti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {businessTrips?.map((trip) => {
              const employee = employees?.find(emp => emp.id === trip.user_id);
              return (
                <div key={trip.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {trip.status === 'approved' ? 'Approvata' : 'In attesa'}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {employee ? `${employee.first_name} ${employee.last_name}` : 'Dipendente'}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div><strong>Destinazione:</strong> {trip.destination}</div>
                      <div><strong>Periodo:</strong> {format(new Date(trip.start_date), 'dd/MM/yyyy')} - {format(new Date(trip.end_date), 'dd/MM/yyyy')}</div>
                      {trip.reason && <div><strong>Motivo:</strong> {trip.reason}</div>}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={isDeleting}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Elimina Trasferta</AlertDialogTitle>
                        <AlertDialogDescription>
                          Sei sicuro di voler eliminare la trasferta di {employee ? `${employee.first_name} ${employee.last_name}` : 'questo dipendente'} a {trip.destination}?
                          Questa azione non può essere annullata.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteTrip(trip.id, employee ? `${employee.first_name} ${employee.last_name}` : 'Dipendente')}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Elimina
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
            {(!businessTrips || businessTrips.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                Nessuna trasferta registrata
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
