
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AttendanceHistory from '@/components/attendance/AttendanceHistory';
import ManualAttendanceForm from '@/components/attendance/ManualAttendanceForm';
import BusinessTripForm from '@/components/attendance/BusinessTripForm';
import { useBusinessTrips } from '@/hooks/useBusinessTrips';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plane, MapPin, Users } from 'lucide-react';

export default function AdminAttendanceSection() {
  const { businessTrips, updateTripStatus, isUpdating } = useBusinessTrips();
  const [reviewingTrip, setReviewingTrip] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const pendingTrips = businessTrips?.filter(trip => trip.status === 'pending') || [];

  const handleTripStatusUpdate = (tripId: string, status: 'approved' | 'rejected') => {
    updateTripStatus({ tripId, status, adminNotes });
    setReviewingTrip(null);
    setAdminNotes('');
  };

  const getEmployeeName = (trip: any) => {
    if (trip.profiles?.first_name && trip.profiles?.last_name) {
      return `${trip.profiles.first_name} ${trip.profiles.last_name}`;
    }
    return trip.profiles?.email || 'Dipendente sconosciuto';
  };

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gestione Presenze</h1>
        <p className="text-muted-foreground">
          Visualizza e gestisci le presenze di tutti i dipendenti
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="manual">Presenze Manuali</TabsTrigger>
          <TabsTrigger value="business-trips">
            Trasferte
            {pendingTrips.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingTrips.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AttendanceHistory />
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <ManualAttendanceForm />
        </TabsContent>

        <TabsContent value="business-trips" className="space-y-6">
          {pendingTrips.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="w-5 h-5" />
                  Richieste di Trasferta in Attesa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingTrips.map((trip) => (
                  <div key={trip.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{getEmployeeName(trip)}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {trip.destination}
                          </div>
                          <span>{new Date(trip.start_date).toLocaleDateString('it-IT')} - {new Date(trip.end_date).toLocaleDateString('it-IT')}</span>
                        </div>
                      </div>
                      <Badge variant="outline">{trip.status}</Badge>
                    </div>
                    
                    {trip.reason && (
                      <p className="text-sm bg-gray-50 p-2 rounded">{trip.reason}</p>
                    )}

                    {reviewingTrip === trip.id ? (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Note amministrative (opzionale)"
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleTripStatusUpdate(trip.id, 'approved')}
                            disabled={isUpdating}
                          >
                            Approva
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleTripStatusUpdate(trip.id, 'rejected')}
                            disabled={isUpdating}
                          >
                            Rifiuta
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReviewingTrip(null);
                              setAdminNotes('');
                            }}
                          >
                            Annulla
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReviewingTrip(trip.id)}
                      >
                        Revisiona
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tutte le Trasferte</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {businessTrips?.slice(0, 10).map((trip) => (
                    <div key={trip.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium text-sm">{getEmployeeName(trip)}</div>
                        <div className="text-xs text-muted-foreground">{trip.destination}</div>
                      </div>
                      <Badge 
                        variant={trip.status === 'approved' ? 'default' : trip.status === 'rejected' ? 'destructive' : 'outline'}
                      >
                        {trip.status}
                      </Badge>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Calendario Presenze
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Funzionalità calendario in sviluppo...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
