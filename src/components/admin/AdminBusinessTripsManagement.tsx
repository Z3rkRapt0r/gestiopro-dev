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
import { Plane, Calendar as CalendarIcon, Users, Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function AdminBusinessTripsManagement() {
  const { businessTrips, createTrip, isCreating, deleteTrip, isDeleting } = useBusinessTrips();
  const { employees } = useActiveEmployees();
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');

  // Usa il nuovo hook per i conflitti
  const { conflictDates, isLoading: isCalculatingConflicts, isDateDisabled } = useBusinessTripConflicts(selectedEmployees);
  
  // Debug: verifica se le date disabilitate sono ricevute correttamente
  console.log('🔍 AdminBusinessTripsManagement - Date di conflitto ricevute:', conflictDates.length);
  console.log('🔍 AdminBusinessTripsManagement - isDateDisabled function:', typeof isDateDisabled);
  if (conflictDates.length > 0) {
    console.log('🔍 AdminBusinessTripsManagement - Prime 5 date di conflitto:', conflictDates.slice(0, 5).map(d => format(d, 'yyyy-MM-dd')));
  }

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleCreateTrip = () => {
    if (selectedEmployees.length === 0 || !startDate || !endDate || !destination) return;

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
  };

  const handleDeleteTrip = (tripId: string, employeeName: string) => {
    console.log('🔴 Richiesta eliminazione trasferta:', {
      tripId,
      employeeName,
      timestamp: new Date().toISOString()
    });
    deleteTrip(tripId);
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
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {conflictDates.length > 0 && (
              <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                ⚠️ {conflictDates.length} date disabilitate per conflitti con trasferte, ferie, permessi, malattie o festività
                {selectedEmployees.length === 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    Le festività sono sempre bloccate, indipendentemente dai dipendenti selezionati
                  </div>
                )}
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
              
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">
                  {businessTrips?.filter(trip => {
                    const startDate = new Date(trip.start_date);
                    const endDate = new Date(trip.end_date);
                    const today = new Date();
                    return startDate <= today && endDate >= today;
                  }).length || 0}
                </div>
                <div className="text-sm text-green-600">Trasferte Attive</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tutte le trasferte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Tutte le Trasferte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {businessTrips?.map((trip) => (
              <div key={trip.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {trip.profiles?.first_name} {trip.profiles?.last_name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700">
                      Approvata
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
                          <AlertDialogTitle>Elimina Trasferta</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sei sicuro di voler eliminare questa trasferta per {trip.profiles?.first_name} {trip.profiles?.last_name}? 
                            <br /><br />
                            <strong>Questa azione:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>Eliminerà la trasferta in modo permanente</li>
                              <li>Rimuoverà tutte le presenze associate alla trasferta</li>
                              <li>Non può essere annullata</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteTrip(trip.id, `${trip.profiles?.first_name} ${trip.profiles?.last_name}`)}
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
                  <div><strong>Destinazione:</strong> {trip.destination}</div>
                  <div><strong>Date:</strong> {format(new Date(trip.start_date), 'dd/MM/yyyy', { locale: it })} - {format(new Date(trip.end_date), 'dd/MM/yyyy', { locale: it })}</div>
                  {trip.reason && <div><strong>Motivo:</strong> {trip.reason}</div>}
                  {trip.admin_notes && (
                    <div className="p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                      <strong>Note:</strong> {trip.admin_notes}
                    </div>
                  )}
                </div>
              </div>
            )) || (
              <div className="text-center py-4 text-gray-500">
                Nessuna trasferta registrata
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
