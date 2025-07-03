import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { usePunctualityStats } from '@/hooks/usePunctualityStats';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, TrendingUp, TrendingDown, Calendar, Users } from 'lucide-react';

const PunctualityChart = () => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const { stats, isLoading } = usePunctualityStats(period);

  const chartData = stats?.byEmployee?.map(emp => ({
    name: `${emp.firstName} ${emp.lastName}`,
    puntuale: emp.punctualDays,
    ritardo: emp.lateDays,
    percentuale: emp.punctualityPercentage,
    ritardoMedio: emp.averageDelay,
  })) || [];

  const pieData = [
    {
      name: 'Puntuale',
      value: stats?.overallStats?.punctualDays || 0,
      color: '#10b981',
    },
    {
      name: 'In ritardo',
      value: stats?.overallStats?.lateDays || 0,
      color: '#ef4444',
    },
  ];

  const COLORS = ['#10b981', '#ef4444'];

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Analisi Puntualità
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Nessun dato disponibile</h3>
            <p className="text-gray-500">Non ci sono presenze registrate per il periodo selezionato</p>
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
            <Clock className="h-5 w-5" />
            Analisi Puntualità
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={period === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('week')}
            >
              Settimana
            </Button>
            <Button
              variant={period === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('month')}
            >
              Mese
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiche generali */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Puntualità</span>
            </div>
            <div className="text-xl font-bold text-emerald-800">
              {stats.overallStats.punctualityPercentage.toFixed(1)}%
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Giorni totali</span>
            </div>
            <div className="text-xl font-bold text-blue-800">{stats.overallStats.totalWorkDays}</div>
          </div>

          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Ritardi</span>
            </div>
            <div className="text-xl font-bold text-red-800">{stats.overallStats.lateDays}</div>
          </div>

          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Ritardo medio</span>
            </div>
            <div className="text-xl font-bold text-orange-800">
              {stats.overallStats.averageDelay.toFixed(0)}min
            </div>
          </div>
        </div>

        {/* Grafici */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grafico a barre per dipendente */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Puntualità per dipendente</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium">{label}</p>
                            <p className="text-emerald-600">Puntuale: {data.puntuale} giorni</p>
                            <p className="text-red-600">Ritardo: {data.ritardo} giorni</p>
                            <p className="text-blue-600">Puntualità: {data.percentuale}%</p>
                            <p className="text-orange-600">Ritardo medio: {data.ritardoMedio}min</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="puntuale" stackId="a" fill="#10b981" name="Puntuale" />
                  <Bar dataKey="ritardo" stackId="a" fill="#ef4444" name="In ritardo" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grafico a torta generale */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Panoramica generale</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Lista dipendenti con dettagli */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Dettaglio per dipendente</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {stats.byEmployee.map((emp, index) => (
              <div key={emp.employeeId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <Users className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                    <div className="text-xs text-gray-500">
                      {emp.totalDays} giorni totali
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={emp.punctualityPercentage >= 90 ? "default" : emp.punctualityPercentage >= 75 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {emp.punctualityPercentage}%
                  </Badge>
                  {emp.averageDelay > 0 && (
                    <span className="text-xs text-orange-600">
                      {emp.averageDelay.toFixed(0)}min
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PunctualityChart;