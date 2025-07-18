
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { usePunctualityStats } from '@/hooks/usePunctualityStats';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Clock, TrendingUp, TrendingDown, Calendar, AlertTriangle } from 'lucide-react';

const SimplePunctualityChart = () => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const { stats, isLoading } = usePunctualityStats(period);

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200/60">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <Skeleton className="h-6 w-40" />
            </CardTitle>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200/60">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Analisi Puntualità
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Nessun dato disponibile</h3>
            <p className="text-gray-500">Non ci sono presenze registrate per il periodo selezionato</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepara i dati per il grafico a linee con colori basati sulla puntualità
  const chartData = stats.byEmployee.map((emp, index) => ({
    index: index + 1,
    name: `${emp.firstName} ${emp.lastName}`.length > 15 
      ? `${emp.firstName} ${emp.lastName.charAt(0)}.`
      : `${emp.firstName} ${emp.lastName}`,
    fullName: `${emp.firstName} ${emp.lastName}`,
    punctuality: emp.punctualityPercentage,
    color: emp.punctualityPercentage >= 90 ? '#10b981' : 
           emp.punctualityPercentage >= 70 ? '#f59e0b' : '#ef4444'
  }));

  // Logica sofisticata per dipendenti che necessitano attenzione
  const calculateCriticalScore = (emp: any) => {
    const lateWeight = 0.4;
    const delayWeight = 0.35;
    const punctualityWeight = 0.25;
    
    return (emp.lateDays * lateWeight) + 
           (emp.averageDelay * delayWeight) + 
           ((100 - emp.punctualityPercentage) * punctualityWeight);
  };

  const getCriticalityLevel = (score: number) => {
    if (score > 15) return { level: 'critico', color: 'bg-red-100 text-red-800', emoji: '🔴' };
    if (score >= 8) return { level: 'attenzione', color: 'bg-orange-100 text-orange-800', emoji: '🟠' };
    return { level: 'monitoraggio', color: 'bg-yellow-100 text-yellow-800', emoji: '🟡' };
  };

  const worstPerformers = stats.byEmployee
    .filter(emp => {
      // Criteri sofisticati per identificare dipendenti problematici
      return emp.totalDays >= 5 && // Minimo giorni lavorativi
             emp.lateDays > 0 && // Deve avere ritardi effettivi
             (emp.punctualityPercentage < 90 || emp.averageDelay > 10); // Soglie multiple
    })
    .map(emp => ({
      ...emp,
      criticalScore: calculateCriticalScore(emp),
      criticality: getCriticalityLevel(calculateCriticalScore(emp))
    }))
    .sort((a, b) => b.criticalScore - a.criticalScore) // Ordina per criticità
    .slice(0, 5);

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200/60">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Analisi Puntualità
            </span>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={period === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('week')}
              className="text-xs"
            >
              Settimana
            </Button>
            <Button
              variant={period === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('month')}
              className="text-xs"
            >
              Mese
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Statistiche principali */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Puntualità</span>
            </div>
            <div className="text-2xl font-bold text-emerald-800">
              {stats.overallStats.punctualityPercentage.toFixed(1)}%
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Giorni totali</span>
            </div>
            <div className="text-2xl font-bold text-blue-800">{stats.overallStats.totalWorkDays}</div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Ritardi</span>
            </div>
            <div className="text-2xl font-bold text-red-800">{stats.overallStats.lateDays}</div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Ritardo medio</span>
            </div>
            <div className="text-2xl font-bold text-orange-800">
              {stats.overallStats.averageDelay.toFixed(0)}min
            </div>
          </div>
        </div>

        {/* Grafico linee colorate */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 text-center">
            Puntualità per Dipendente
          </h4>
          <div className="mb-4 flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-green-500 rounded"></div>
              <span>Ottima (≥90%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-yellow-500 rounded"></div>
              <span>Buona (70-89%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-red-500 rounded"></div>
              <span>Critica (&lt;70%)</span>
            </div>
          </div>
          <div className="h-80 lg:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Puntualità (%)', angle: -90, position: 'insideLeft' }}
                />
                {chartData.map((entry, index) => (
                  <Line
                    key={`line-${index}`}
                    type="monotone"
                    dataKey="punctuality"
                    stroke={entry.color}
                    strokeWidth={3}
                    dot={{ fill: entry.color, strokeWidth: 2, r: 6 }}
                    activeDot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dipendenti con maggiori ritardi */}
        {worstPerformers.length > 0 && (
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <h4 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Dipendenti che necessitano attenzione
            </h4>
            <div className="space-y-2">
              {worstPerformers.map((emp) => (
                <div key={emp.employeeId} className="flex items-center justify-between bg-white p-2 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {emp.lateDays} ritardi su {emp.totalDays} giorni
                    </div>
                  </div>
                   <div className="flex items-center gap-2">
                    <Badge 
                      className={`text-xs ${emp.criticality.color}`}
                      variant="outline"
                    >
                      {emp.criticality.emoji} {emp.criticality.level}
                    </Badge>
                    <Badge 
                      variant="destructive"
                      className="text-xs"
                    >
                      {emp.punctualityPercentage.toFixed(1)}%
                    </Badge>
                    {emp.averageDelay > 0 && (
                      <span className="text-xs text-orange-600 font-medium">
                        {emp.averageDelay.toFixed(0)}min
                      </span>
                    )}
                    <span className="text-xs text-gray-400 font-mono">
                      Score: {emp.criticalScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SimplePunctualityChart;
