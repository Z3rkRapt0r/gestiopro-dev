
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBusinessTrips } from '@/hooks/useBusinessTrips';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { Plane, Calendar as CalendarIcon, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function AdminBusinessTripsManagement() {
  const { businessTrips, updateTripStatus, isUpdating } = useBusinessTrips();
  const { employees } = useActiveEmployees();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const handleApproveTrip = (tripId: string, notes?: string) => {
    updateTripStatus({ tripId, status: 'approved', adminNotes: notes });
  };

  const handleRejectTrip = (tripId: string, notes?: string) => {
    updateTripStatus({ tripId, status: 'rejected', adminNotes: notes });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approvata';
      case 'rejected':
        return 'Rifiutata';
      default:
        return 'In attesa';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form per creare trasferta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5" />
              Crea Trasferta per Dipendente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Dipendente</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona dipendente" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              className="w-full"
              disabled={!selectedEmployee || !startDate || !endDate || !destination}
            >
              Crea Trasferta
            </Button>
          </CardContent>
        </Card>

        {/* Lista trasferte in attesa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Trasferte in Attesa di Approvazione
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {businessTrips?.filter(trip => trip.status === 'pending').map((trip) => (
                <div key={trip.id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {trip.profiles?.first_name} {trip.profiles?.last_name}
                    </div>
                    <Badge className={getStatusColor(trip.status)}>
                      {getStatusText(trip.status)}
                    </Badge>
                  </div>

                  <div className="text-sm space-y-1">
                    <div><strong>Destinazione:</strong> {trip.destination}</div>
                    <div><strong>Date:</strong> {format(new Date(trip.start_date), 'dd/MM/yyyy', { locale: it })} - {format(new Date(trip.end_date), 'dd/MM/yyyy', { locale: it })}</div>
                    {trip.reason && <div><strong>Motivo:</strong> {trip.reason}</div>}
                  </div>

                  <div>
                    <Label htmlFor={`notes-${trip.id}`}>Note admin (opzionale)</Label>
                    <Textarea
                      id={`notes-${trip.id}`}
                      placeholder="Aggiungi note..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApproveTrip(trip.id, adminNotes)}
                      disabled={isUpdating}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approva
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectTrip(trip.id, adminNotes)}
                      disabled={isUpdating}
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rifiuta
                    </Button>
                  </div>
                </div>
              )) || (
                <div className="text-center py-4 text-gray-500">
                  Nessuna trasferta in attesa
                </div>
              )}
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
                  <Badge className={getStatusColor(trip.status)}>
                    {getStatusText(trip.status)}
                  </Badge>
                </div>

                <div className="text-sm space-y-1">
                  <div><strong>Destinazione:</strong> {trip.destination}</div>
                  <div><strong>Date:</strong> {format(new Date(trip.start_date), 'dd/MM/yyyy', { locale: it })} - {format(new Date(trip.end_date), 'dd/MM/yyyy', { locale: it })}</div>
                  {trip.reason && <div><strong>Motivo:</strong> {trip.reason}</div>}
                  {trip.admin_notes && (
                    <div className="p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                      <strong>Note admin:</strong> {trip.admin_notes}
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
