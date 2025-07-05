import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTodayAttendanceSummary } from '@/hooks/useTodayAttendanceSummary';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Shield, 
  Clock, 
  Filter,
  Plane,
  Umbrella,
  Heart
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const TodayAttendanceSummary = () => {
  const { summary, stats, isLoading, isWorkingDay } = useTodayAttendanceSummary();
  const [filter, setFilter] = useState<'all' | 'absent' | 'present' | 'justified'>('all');

  const getStatusIcon = (status: string, justification?: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'justified':
        switch (justification) {
          case 'business_trip':
            return <Plane className="h-4 w-4 text-blue-600" />;
          case 'vacation':
            return <Umbrella className="h-4 w-4 text-purple-600" />;
          case 'sick_leave':
            return <Heart className="h-4 w-4 text-orange-600" />;
          default:
            return <Shield className="h-4 w-4 text-gray-600" />;
        }
      default:
        return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string, justification?: string, isLate?: boolean) => {
    if (status === 'present') {
      return (
        <Badge variant={isLate ? "destructive" : "default"} className="bg-emerald-50 text-emerald-700 border-emerald-200">
          {isLate ? 'Presente (in ritardo)' : 'Presente'}
        </Badge>
      );
    }
    if (status === 'absent') {
      return <Badge variant="destructive">Assente</Badge>;
    }
    if (status === 'justified') {
      switch (justification) {
        case 'business_trip':
          return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Trasferta</Badge>;
        case 'vacation':
          return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Ferie</Badge>;
        case 'sick_leave':
          return <Badge className="bg-orange-50 text-orange-700 border-orange-200">Malattia</Badge>;
        default:
          return <Badge className="bg-gray-50 text-gray-700 border-gray-200">Giustificato</Badge>;
      }
    }
    return <Badge variant="outline">Sconosciuto</Badge>;
  };

  const filteredSummary = summary.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const formatTime = (timeString?: string) => {
    if (!timeString) return '--:--';
    try {
      // Se è già in formato HH:mm, restituisci direttamente
      if (timeString.match(/^\d{2}:\d{2}$/)) {
        return timeString;
      }
      // Altrimenti prova a parsare come Date
      return new Date(timeString).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '--:--';
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isWorkingDay) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Riepilogo Presenze - {format(new Date(), 'EEEE dd MMMM', { locale: it })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Giorno non lavorativo</h3>
            <p className="text-gray-500">Oggi non è configurato come giorno lavorativo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Riepilogo Presenze - {format(new Date(), 'EEEE dd MMMM', { locale: it })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <div className="flex gap-1">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Tutti
              </Button>
              <Button
                variant={filter === 'present' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('present')}
              >
                Presenti
              </Button>
              <Button
                variant={filter === 'absent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('absent')}
              >
                Assenti
              </Button>
              <Button
                variant={filter === 'justified' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('justified')}
              >
                Giustificati
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistiche rapide */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Presenti</span>
            </div>
            <div className="text-xl font-bold text-emerald-800">{stats.present}</div>
          </div>
          
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Assenti</span>
            </div>
            <div className="text-xl font-bold text-red-800">{stats.absent}</div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Giustificati</span>
            </div>
            <div className="text-xl font-bold text-blue-800">{stats.justified}</div>
          </div>

          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">In ritardo</span>
            </div>
            <div className="text-xl font-bold text-orange-800">{stats.late}</div>
          </div>
        </div>

        {/* Lista dipendenti */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filteredSummary.map((item) => (
            <div 
              key={item.employee.id} 
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(item.status, item.justification)}
                <div>
                  <div className="font-medium text-gray-900">
                    {item.employee.first_name} {item.employee.last_name}
                  </div>
                  {item.employee.department && (
                    <div className="text-sm text-gray-500">{item.employee.department}</div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {item.attendanceTime && (
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(item.attendanceTime)}
                    {item.isLate && item.lateMinutes && (
                      <span className="text-red-600 text-xs">
                        (+{item.lateMinutes}min)
                      </span>
                    )}
                  </div>
                )}
                
                {item.details && (
                  <div className="text-sm text-gray-600 max-w-48 truncate" title={item.details}>
                    {item.details}
                  </div>
                )}
                
                {getStatusBadge(item.status, item.justification, item.isLate)}
              </div>
            </div>
          ))}
        </div>

        {filteredSummary.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nessun dipendente trovato per il filtro selezionato</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayAttendanceSummary;