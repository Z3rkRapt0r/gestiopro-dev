
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AttendanceCheckInOut from '@/components/attendance/AttendanceCheckInOut';
import AttendanceHistory from '@/components/attendance/AttendanceHistory';
import BusinessTripForm from '@/components/attendance/BusinessTripForm';
import { useBusinessTrips } from '@/hooks/useBusinessTrips';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane } from 'lucide-react';

export default function EmployeeAttendanceSection() {
  const { businessTrips } = useBusinessTrips();

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Le Mie Presenze</h1>
        <p className="text-muted-foreground">
          Registra la tua presenza e visualizza lo storico
        </p>
      </div>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="attendance">Presenza</TabsTrigger>
          <TabsTrigger value="business-trips">Trasferte</TabsTrigger>
          <TabsTrigger value="history">Storico</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-6">
          <AttendanceCheckInOut />
        </TabsContent>

        <TabsContent value="business-trips" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BusinessTripForm />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="w-5 h-5" />
                  Le Mie Trasferte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {businessTrips?.slice(0, 5).map((trip) => (
                    <div key={trip.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{trip.destination}</span>
                        <Badge 
                          variant={trip.status === 'approved' ? 'default' : trip.status === 'rejected' ? 'destructive' : 'outline'}
                        >
                          {trip.status === 'pending' ? 'In attesa' : trip.status === 'approved' ? 'Approvata' : 'Rifiutata'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(trip.start_date).toLocaleDateString('it-IT')} - {new Date(trip.end_date).toLocaleDateString('it-IT')}
                      </div>
                      {trip.reason && (
                        <p className="text-sm bg-gray-50 p-2 rounded">{trip.reason}</p>
                      )}
                      {trip.admin_notes && (
                        <p className="text-sm bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                          <span className="font-medium">Note admin:</span> {trip.admin_notes}
                        </p>
                      )}
                    </div>
                  )) || (
                    <div className="text-center py-4 text-muted-foreground">
                      Nessuna trasferta richiesta
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <AttendanceHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
