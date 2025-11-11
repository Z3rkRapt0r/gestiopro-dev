import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as OvertimeCalendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Zap, Calendar as CalendarIcon, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface AutomaticOvertimeRecord {
  id: string;
  user_id: string;
  date: string;
  hours: number;
  calculated_minutes: number;
  reason: string;
  created_at: string;
  overtime_type?: 'automatic_checkin' | 'manual' | 'automatic_checkout' | null;
  is_automatic?: boolean | null;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

export default function AutomaticOvertimeSummary() {
  const [overtimes, setOvertimes] = useState<AutomaticOvertimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  useEffect(() => {
    fetchAutomaticOvertimes();
  }, []);

  const fetchAutomaticOvertimes = async () => {
    try {
      setLoading(true);

      // Get last 10 automatic overtimes
      const { data, error } = await supabase
        .from('overtime_records')
        .select(`
          id,
          user_id,
          date,
          hours,
          calculated_minutes,
          reason,
          created_at,
          overtime_type,
          is_automatic,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .in('overtime_type', ['automatic_checkin', 'manual'])
        .order('date', { ascending: false })
        .limit(60);

      if (error) throw error;

      setOvertimes(data || []);
    } catch (error) {
      console.error('Error fetching automatic overtimes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDate && overtimes.length > 0) {
      setSelectedDate(parseISO(overtimes[0].date));
    }
  }, [overtimes, selectedDate]);

  const overtimesByDate = useMemo(() => {
    return overtimes.reduce<Record<string, AutomaticOvertimeRecord[]>>((acc, overtime) => {
      const dateKey = format(parseISO(overtime.date), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(overtime);
      return acc;
    }, {});
  }, [overtimes]);

  const overtimeDates = useMemo(() => {
    const automaticMap = new Map<string, Date>();
    const manualMap = new Map<string, Date>();

    overtimes.forEach((overtime) => {
      const dateValue = parseISO(overtime.date);
      const dateKey = format(dateValue, 'yyyy-MM-dd');

      if (overtime.overtime_type === 'manual') {
        manualMap.set(dateKey, dateValue);
      } else {
        automaticMap.set(dateKey, dateValue);
      }
    });

    const automaticOnly: Date[] = [];
    const manualOnly: Date[] = [];
    const mixed: Date[] = [];

    automaticMap.forEach((value, key) => {
      if (manualMap.has(key)) {
        mixed.push(value);
      } else {
        automaticOnly.push(value);
      }
    });

    manualMap.forEach((value, key) => {
      if (!automaticMap.has(key)) {
        manualOnly.push(value);
      }
    });

    return { automatic: automaticOnly, manual: manualOnly, mixed };
  }, [overtimes]);

  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  const selectedDateRecords = selectedDateKey ? overtimesByDate[selectedDateKey] ?? [] : [];

  const selectedDateSummary = useMemo(() => {
    if (!selectedDateRecords.length) {
      return {
        totalHours: 0,
        totalMinutes: 0,
        employees: 0,
      };
    }

    const totals = selectedDateRecords.reduce(
      (acc, record) => {
        acc.totalHours += record.hours ?? 0;
        acc.totalMinutes += record.calculated_minutes ?? 0;
        acc.employees.add(record.user_id);
        return acc;
      },
      { totalHours: 0, totalMinutes: 0, employees: new Set<string>() },
    );

    return {
      totalHours: totals.totalHours,
      totalMinutes: totals.totalMinutes,
      employees: totals.employees.size,
    };
  }, [selectedDateRecords]);

  const getInitials = (first?: string, last?: string) => {
    const firstInitial = first?.[0] ?? '';
    const lastInitial = last?.[0] ?? '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || 'NA';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Zap className="w-5 h-5" />
            Resoconto Straordinari
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            Caricamento...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (overtimes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Zap className="w-5 h-5" />
            Resoconto Straordinari
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Zap className="w-12 h-12 mx-auto mb-3 text-blue-200" />
            <p>Nessuno straordinario automatico rilevato</p>
            <p className="text-sm mt-1">
              Gli straordinari vengono rilevati automaticamente quando un dipendente
              effettua il check-in prima dell'orario previsto
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <Zap className="w-5 h-5" />
          Resoconto Straordinari
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)]">
            <div className="rounded-lg border border-blue-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="inline-flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {selectedDate
                        ? format(selectedDate, "dd/MM/yyyy", { locale: it })
                        : 'Scegli data'}
                    </Button>
                  </PopoverTrigger>
                <PopoverContent align="start" className="w-fit max-w-[320px] space-y-3 p-3">
                  <div className="origin-top-left scale-95">
                      <OvertimeCalendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={it}
                        weekStartsOn={1}
                        modifiers={{
                          manual: overtimeDates.manual,
                          automatic: overtimeDates.automatic,
                          mixed: overtimeDates.mixed,
                        }}
                        modifiersStyles={{
                          automatic: {
                            backgroundColor: '#dbeafe',
                            color: '#1d4ed8',
                            fontWeight: 600,
                            border: '1px solid #93c5fd',
                          },
                          manual: {
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            fontWeight: 600,
                            border: '1px solid #fcd34d',
                          },
                          mixed: {
                            background: 'linear-gradient(135deg, #dbeafe 0%, #fef3c7 100%)',
                            color: '#1f2937',
                            fontWeight: 600,
                            border: '1px solid #c4ddfd',
                          },
                        }}
                        className="rounded-md border border-blue-100 bg-white text-sm"
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date > today;
                        }}
                      />
                    </div>
                    <div className="space-y-1 text-xs text-blue-700">
                      <p>I giorni evidenziati indicano la presenza di straordinari.</p>
                      <div className="flex flex-wrap gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full border border-blue-200 bg-blue-200"></span>
                          Rilevamento automatico
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full border border-amber-200 bg-amber-200"></span>
                          Inserimento manuale
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full border border-sky-200 bg-gradient-to-br from-blue-200 to-amber-200"></span>
                          Entrambi presenti
                        </span>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="space-y-1 text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Data selezionata
                  </p>
                  <h3 className="text-sm font-semibold text-blue-900">
                    {selectedDate
                      ? format(selectedDate, "EEEE d MMMM yyyy", { locale: it })
                      : 'Nessuna data selezionata'}
                  </h3>
                </div>
              </div>
              {selectedDate && selectedDateRecords.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Nessuno straordinario registrato in questa data.
                </p>
              )}
              {selectedDate && selectedDateRecords.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-blue-800">
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1">
                    <Users className="h-4 w-4" />
                    {selectedDateSummary.employees} dipendente{selectedDateSummary.employees !== 1 ? 'i' : ''}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1">
                    <Clock className="h-4 w-4" />
                    {selectedDateSummary.totalHours.toLocaleString('it-IT', { maximumFractionDigits: 2 })} ore totali
                  </span>
                </div>
              )}
            </div>
          </div>

        <div className="space-y-3">
            {selectedDateRecords.map((overtime) => (
            <div
              key={overtime.id}
                className="flex items-center gap-3 rounded-lg border border-blue-100 bg-white p-3"
              >
                <Avatar className="h-10 w-10 border border-blue-100 bg-blue-100 text-blue-900">
                  <AvatarFallback className="text-sm font-semibold uppercase">
                    {getInitials(overtime.profiles?.first_name, overtime.profiles?.last_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-blue-900">
                      {overtime.profiles?.first_name} {overtime.profiles?.last_name}
                    </span>
                    <Badge variant="outline" className="border-blue-100 text-xs text-blue-700">
                      {format(parseISO(overtime.date), 'dd/MM/yyyy', { locale: it })}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={overtime.overtime_type === 'manual' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-100 text-blue-800 border-blue-200'}
                    >
                      {overtime.overtime_type === 'manual' ? 'Manuale' : 'Automatico'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-blue-700">
                  <Badge className="bg-blue-600 hover:bg-blue-700">
                    {overtime.hours} {overtime.hours === 1 ? 'ora' : 'ore'}
                  </Badge>
                  {overtime.calculated_minutes && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5">
                        <Clock className="h-3 w-3" />
                      {overtime.calculated_minutes} minuti effettivi
                      </span>
                  )}
                </div>
                {overtime.reason && (
                    <p className="text-xs text-blue-700">
                    {overtime.reason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
          </div>
      </CardContent>
    </Card>
  );
}

