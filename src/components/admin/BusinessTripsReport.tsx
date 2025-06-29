
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useBusinessTrips } from '@/hooks/useBusinessTrips';
import { Plane, Calendar as CalendarIcon, Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function BusinessTripsReport() {
  const { businessTrips, deleteTrip, isDeleting } = useBusinessTrips();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleDeleteTrip = (tripId: string, employeeName: string) => {
    console.log('🔴 Richiesta eliminazione trasferta:', {
      tripId,
      employeeName,
      timestamp: new Date().toISOString()
    });
    deleteTrip(tripId);
  };

  // Filtra le trasferte per la data selezionata
  const filterTripsByDate = (trips: any[], date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const activeTrips = trips?.filter(trip => {
      const startDate = trip.start_date;
      const endDate = trip.end_date;
      return startDate <= dateStr && endDate >= dateStr;
    }) || [];

    const dayTrips = trips?.filter(trip => {
      const startDate = trip.start_date;
      const endDate = trip.end_date;
      return startDate === dateStr || endDate === dateStr;
    }) || [];

    // Rimuovi duplicati (trasferte che sono sia attive che iniziano/finiscono oggi)
    const uniqueDayTrips = dayTrips.filter(dayTrip => 
      !activeTrips.some(activeTrip => activeTrip.id === dayTrip.id)
    );

    return { activeTrips, dayTrips: uniqueDayTrips };
  };

  const { activeTrips, dayTrips } = filterTripsByDate(businessTrips, selectedDate);

  const renderTripCard = (trip: any, isActive: boolean = false) => (
    <div key={trip.id} className={`border rounded-lg p-4 space-y-3 ${isActive ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex items-center justify-between">
        <div className="font-medium text-lg">
          {trip.profiles?.first_name} {trip.profiles?.last_name}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={isActive ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
            {isActive ? 'In Corso' : 'Programmata'}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="font-medium text-gray-600">Destinazione:</span>
          <div className="font-medium">{trip.destination}</div>
        </div>
        <div>
          <span className="font-medium text-gray-600">Date:</span>
          <div>
            {format(new Date(trip.start_date), 'dd/MM/yyyy', { locale: it })} - {format(new Date(trip.end_date), 'dd/MM/yyyy', { locale: it })}
          </div>
        </div>
      </div>

      {trip.reason && (
        <div className="text-sm">
          <span className="font-medium text-gray-600">Motivo:</span>
          <div className="mt-1">{trip.reason}</div>
        </div>
      )}

      {trip.admin_notes && (
        <div className="p-3 bg-white rounded border-l-4 border-blue-300">
          <span className="font-medium text-gray-600">Note Admin:</span>
          <div className="mt-1 text-sm">{trip.admin_notes}</div>
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="w-5 h-5" />
          Resoconto Trasferte
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtro Data */}
        <div className="flex items-center gap-4">
          <span className="font-medium">Visualizza trasferte per il giorno:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'dd/MM/yyyy', { locale: it })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={it}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Trasferte Attive */}
        {activeTrips.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-green-700">
                Trasferte in Corso ({activeTrips.length})
              </h3>
            </div>
            <div className="space-y-3">
              {activeTrips.map(trip => renderTripCard(trip, true))}
            </div>
          </div>
        )}

        {/* Trasferte del Giorno */}
        {dayTrips.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-blue-700">
                Trasferte del Giorno ({dayTrips.length})
              </h3>
            </div>
            <div className="space-y-3">
              {dayTrips.map(trip => renderTripCard(trip, false))}
            </div>
          </div>
        )}

        {/* Nessuna trasferta */}
        {activeTrips.length === 0 && dayTrips.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Plane className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">Nessuna trasferta per il {format(selectedDate, 'dd/MM/yyyy', { locale: it })}</p>
            <p className="text-sm">Seleziona una data diversa per visualizzare altre trasferte</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
