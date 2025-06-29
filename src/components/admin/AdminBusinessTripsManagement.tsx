
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBusinessTrips } from '@/hooks/useBusinessTrips';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { Plane, Calendar as CalendarIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import BusinessTripsReport from './BusinessTripsReport';

export default function AdminBusinessTripsManagement() {
  const { businessTrips, createTrip, isCreating } = useBusinessTrips();
  const { employees } = useActiveEmployees();
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');

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
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

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

      {/* Resoconto Trasferte - sostituisce "Tutte le trasferte" */}
      <BusinessTripsReport />
    </div>
  );
}
