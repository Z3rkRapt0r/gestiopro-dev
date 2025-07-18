
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePunctualityStats } from '@/hooks/usePunctualityStats';
import { Clock, TrendingUp, TrendingDown, Calendar, AlertTriangle, Users, CheckCircle } from 'lucide-react';
import GeneralPunctualityChart from './GeneralPunctualityChart';
import EmployeePunctualityChart from './EmployeePunctualityChart';

const SimplePunctualityChart = () => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const { stats, isLoading } = usePunctualityStats(period);

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border border-slate-200">
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
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="bg-white shadow-sm border border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-600" />
            Analisi Puntualità
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">Nessun dato disponibile</h3>
            <p className="text-slate-500">Non ci sono presenze registrate per il periodo selezionato</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const calculateCriticalScore = (emp: any) => {
    const lateWeight = 0.4;
    const delayWeight = 0.35;
    const punctualityWeight = 0.25;
    
    return (emp.lateDays * lateWeight) + 
           (emp.averageDelay * delayWeight) + 
           ((100 - emp.punctualityPercentage) * punctualityWeight);
  };

  const getCriticalityLevel = (score: number) => {
    if (score > 15) return { level: 'critico', color: 'bg-red-100 text-red-800 border-red-200', emoji: '🔴' };
    if (score >= 8) return { level: 'attenzione', color: 'bg-orange-100 text-orange-800 border-orange-200', emoji: '🟠' };
    return { level: 'monitoraggio', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', emoji: '🟡' };
  };

  const worstPerformers = stats.byEmployee
    .filter(emp => {
      return emp.totalDays >= 5 && 
             emp.lateDays > 0 && 
             (emp.punctualityPercentage < 90 || emp.averageDelay > 10);
    })
    .map(emp => ({
      ...emp,
      criticalScore: calculateCriticalScore(emp),
      criticality: getCriticalityLevel(calculateCriticalScore(emp))
    }))
    .sort((a, b) => b.criticalScore - a.criticalScore)
    .slice(0, 5);

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader className="pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Analisi Puntualità
              </span>
              <p className="text-sm text-slate-500 font-normal mt-1">
                Monitora la puntualità dei dipendenti in tempo reale
              </p>
            </div>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={period === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('week')}
              className="text-sm px-4"
            >
              Settimana
            </Button>
            <Button
              variant={period === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('month')}
              className="text-sm px-4"
            >
              Mese
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Statistiche principali ridisegnate */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-emerald-700">Puntualità</span>
            </div>
            <div className="text-3xl font-bold text-emerald-800 mb-1">
              {stats.overallStats.punctualityPercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-emerald-600">
              {stats.overallStats.punctualDays}/{stats.overallStats.totalWorkDays} giorni
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-blue-700">Dipendenti</span>
            </div>
            <div className="text-3xl font-bold text-blue-800 mb-1">{stats.totalEmployees}</div>
            <div className="text-xs text-blue-600">attivi nel periodo</div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-2xl border border-red-200 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-500 rounded-lg">
                <TrendingDown className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-red-700">Ritardi</span>
            </div>
            <div className="text-3xl font-bold text-red-800 mb-1">{stats.overallStats.lateDays}</div>
            <div className="text-xs text-red-600">episodi totali</div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-orange-700">Ritardo medio</span>
            </div>
            <div className="text-3xl font-bold text-orange-800 mb-1">
              {stats.overallStats.averageDelay.toFixed(0)}min
            </div>
            <div className="text-xs text-orange-600">per episodio</div>
          </div>
        </div>

        {/* Tab ridisegnate con scroll */}
        <Tabs defaultValue="generale" className="w-full">
          <div className="border-b border-slate-200 mb-6">
            <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="inline-flex h-12 items-center justify-start rounded-none bg-transparent p-0 gap-1">
                <TabsTrigger 
                  value="generale"
                  className="relative h-10 rounded-lg px-6 py-2 text-sm font-medium transition-all hover:bg-slate-100 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Panoramica Generale
                </TabsTrigger>
                {stats.employeeDailyStats?.map((employee) => {
                  const employeeStats = stats.byEmployee.find(emp => emp.employeeId === employee.employeeId);
                  const punctualityStatus = employeeStats ? 
                    (employeeStats.punctualityPercentage >= 95 ? 'excellent' :
                     employeeStats.punctualityPercentage >= 85 ? 'good' :
                     employeeStats.punctualityPercentage >= 70 ? 'warning' : 'critical') : 'unknown';
                  
                  const statusColors = {
                    excellent: 'text-emerald-600',
                    good: 'text-blue-600', 
                    warning: 'text-orange-600',
                    critical: 'text-red-600',
                    unknown: 'text-slate-600'
                  };

                  return (
                    <TabsTrigger 
                      key={employee.employeeId} 
                      value={employee.employeeId}
                      className="relative h-10 rounded-lg px-4 py-2 text-sm font-medium transition-all hover:bg-slate-100 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          punctualityStatus === 'excellent' ? 'bg-emerald-500' :
                          punctualityStatus === 'good' ? 'bg-blue-500' :
                          punctualityStatus === 'warning' ? 'bg-orange-500' :
                          punctualityStatus === 'critical' ? 'bg-red-500' : 'bg-slate-400'
                        }`} />
                        <span className="truncate max-w-24">
                          {employee.firstName} {employee.lastName.charAt(0)}.
                        </span>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </ScrollArea>
          </div>

          <TabsContent value="generale" className="mt-0">
            <GeneralPunctualityChart 
              dailyData={stats.dailyData}
              period={period}
            />
          </TabsContent>

          {stats.employeeDailyStats?.map((employee) => (
            <TabsContent key={employee.employeeId} value={employee.employeeId} className="mt-0">
              <EmployeePunctualityChart 
                employeeData={employee}
                period={period}
              />
            </TabsContent>
          ))}
        </Tabs>

        {/* Sezione dipendenti critici migliorata */}
        {worstPerformers.length > 0 && (
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-500 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-red-800">Dipendenti che necessitano attenzione</h4>
                <p className="text-sm text-red-600">Monitoraggio prioritario per migliorare la puntualità</p>
              </div>
            </div>
            <div className="space-y-3">
              {worstPerformers.map((emp) => (
                <div key={emp.employeeId} className="flex items-center justify-between bg-white p-4 rounded-xl border border-red-100 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                      <span className="font-bold text-slate-700 text-sm">
                        {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className="text-sm text-slate-500">
                        {emp.lateDays} ritardi su {emp.totalDays} giorni lavorativi
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      className={`${emp.criticality.color} border`}
                      variant="outline"
                    >
                      {emp.criticality.emoji} {emp.criticality.level}
                    </Badge>
                    <div className="text-right">
                      <div className="font-bold text-red-700 text-lg">
                        {emp.punctualityPercentage.toFixed(1)}%
                      </div>
                      {emp.averageDelay > 0 && (
                        <div className="text-xs text-orange-600 font-medium">
                          +{emp.averageDelay.toFixed(0)}min media
                        </div>
                      )}
                    </div>
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
