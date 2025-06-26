
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Calendar, Clock, User, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useManualAttendances } from '@/hooks/useManualAttendances';

export default function ManualAttendancesList() {
  const { manualAttendances, isLoading, deleteManualAttendance } = useManualAttendances();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleDelete = (attendance: any) => {
    if (confirm('Sei sicuro di voler eliminare questa presenza manuale?')) {
      deleteManualAttendance(attendance.id);
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    
    if (timeString.match(/^\d{2}:\d{2}$/)) {
      return timeString;
    }
    
    try {
      if (timeString.includes('T')) {
        const [, timePart] = timeString.split('T');
        const [hours, minutes] = timePart.split(':');
        return `${hours}:${minutes}`;
      }
      
      return timeString;
    } catch (error) {
      console.error('Errore nel parsing del timestamp:', timeString, error);
      return '--:--';
    }
  };

  // Filter attendances by selected date
  const filteredAttendances = manualAttendances?.filter(attendance => 
    attendance.date === selectedDate
  ) || [];

  // Separate normal attendances from sick leaves using is_sick_leave field
  const normalAttendances = filteredAttendances.filter(att => !att.is_sick_leave);
  const sickLeaves = filteredAttendances.filter(att => att.is_sick_leave);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resoconto Presenza e Malattia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Resoconto Presenza e Malattia
        </CardTitle>
        <div className="space-y-2">
          <Label htmlFor="date-filter">Seleziona Data</Label>
          <Input
            id="date-filter"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredAttendances.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Nessuna presenza o malattia inserita manualmente per il {format(new Date(selectedDate), 'dd/MM/yyyy', { locale: it })}
          </p>
        ) : (
          <div className="space-y-6">
            {/* Presenze Normali */}
            {normalAttendances.length > 0 && (
              <div>
                <h3 className="font-semibold text-green-700 text-lg mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Presenze Inserite Manualmente ({normalAttendances.length})
                </h3>
                <div className="space-y-3">
                  {normalAttendances.map((attendance) => (
                    <div key={attendance.id} className="p-4 border rounded-lg bg-green-50 border-green-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-900">
                              {attendance.profiles?.first_name} {attendance.profiles?.last_name}
                            </span>
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              Presenza Manuale
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="flex items-center gap-1 text-gray-600">
                                <Calendar className="w-3 h-3" />
                                <span>Data: {format(new Date(attendance.date), 'dd/MM/yyyy', { locale: it })}</span>
                              </div>
                              {attendance.notes && (
                                <div className="text-gray-600 mt-1">
                                  <span className="font-medium">Note:</span> {attendance.notes}
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-1 text-gray-600">
                                <Clock className="w-3 h-3" />
                                <span>
                                  Entrata: {formatTime(attendance.check_in_time)} | 
                                  Uscita: {formatTime(attendance.check_out_time)}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Inserita il: {format(new Date(attendance.created_at), 'dd/MM/yyyy HH:mm', { locale: it })}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(attendance)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Malattie */}
            {sickLeaves.length > 0 && (
              <div>
                <h3 className="font-semibold text-orange-700 text-lg mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  Malattie Inserite Manualmente ({sickLeaves.length})
                </h3>
                <div className="space-y-3">
                  {sickLeaves.map((attendance) => (
                    <div key={attendance.id} className="p-4 border rounded-lg bg-orange-50 border-orange-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-orange-600" />
                            <span className="font-medium text-orange-900">
                              {attendance.profiles?.first_name} {attendance.profiles?.last_name}
                            </span>
                            <Badge variant="outline" className="bg-orange-100 text-orange-800">
                              Malattia
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Calendar className="w-3 h-3" />
                              <span>Data: {format(new Date(attendance.date), 'dd/MM/yyyy', { locale: it })}</span>
                            </div>
                            {attendance.notes && (
                              <div className="text-gray-600">
                                <span className="font-medium">Note:</span> {attendance.notes}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              Inserita il: {format(new Date(attendance.created_at), 'dd/MM/yyyy HH:mm', { locale: it })}
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(attendance)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
