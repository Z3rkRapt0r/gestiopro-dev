
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useManualAttendances } from '@/hooks/useManualAttendances';

export default function ManualAttendancesList() {
  const { manualAttendances, isLoading, deleteManualAttendance } = useManualAttendances();

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Presenze Manuali Recenti</CardTitle>
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

  if (!manualAttendances || manualAttendances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Presenze Manuali Recenti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            Nessuna presenza manuale inserita
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Presenze Manuali Recenti ({manualAttendances.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {manualAttendances.map((attendance) => (
            <div key={attendance.id} className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      {attendance.profiles?.first_name} {attendance.profiles?.last_name}
                    </span>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      Manuale
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
      </CardContent>
    </Card>
  );
}
