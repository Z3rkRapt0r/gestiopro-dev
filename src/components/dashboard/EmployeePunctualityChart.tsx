
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Cell } from 'recharts';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { EmployeeDailyStats } from '@/hooks/usePunctualityStats';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, CheckCircle, XCircle, AlertCircle, User } from 'lucide-react';

interface EmployeePunctualityChartProps {
  employeeData: EmployeeDailyStats;
  period: 'week' | 'month';
}

const EmployeePunctualityChart = ({ employeeData, period }: EmployeePunctualityChartProps) => {
  const chartData = employeeData.dailyData.map(day => {
    const statusValue = 
      day.status === 'present' ? 100 :
      day.status === 'late' ? 50 :
      0; // absent

    const color = 
      day.status === 'present' ? '#10b981' :
      day.status === 'late' ? '#f59e0b' :
      '#6b7280'; // absent

    return {
      ...day,
      formattedDate: format(new Date(day.date), period === 'week' ? 'EEE dd/MM' : 'dd/MM', { locale: it }),
      statusValue,
      color,
    };
  });

  // Calcola statistiche del dipendente
  const totalDays = employeeData.dailyData.length;
  const presentDays = employeeData.dailyData.filter(day => day.isPresent).length;
  const lateDays = employeeData.dailyData.filter(day => day.isLate).length;
  const punctualDays = presentDays - lateDays;
  const absentDays = totalDays - presentDays;
  const punctualityPercentage = totalDays > 0 ? (punctualDays / totalDays) * 100 : 0;
  const averageDelay = lateDays > 0 ? 
    employeeData.dailyData
      .filter(day => day.isLate)
      .reduce((sum, day) => sum + day.lateMinutes, 0) / lateDays : 0;

  // Determina il livello di performance
  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 95) return { level: 'Eccellente', color: 'bg-emerald-500', textColor: 'text-emerald-700' };
    if (percentage >= 85) return { level: 'Buono', color: 'bg-blue-500', textColor: 'text-blue-700' };
    if (percentage >= 70) return { level: 'Sufficiente', color: 'bg-orange-500', textColor: 'text-orange-700' };
    return { level: 'Critico', color: 'bg-red-500', textColor: 'text-red-700' };
  };

  const performance = getPerformanceLevel(punctualityPercentage);

  return (
    <div className="space-y-6">
      {/* Header del dipendente */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800">
                {employeeData.firstName} {employeeData.lastName}
              </h3>
              <p className="text-slate-600">Analisi puntualità individuale</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${performance.color} bg-opacity-10 border border-current border-opacity-20`}>
              <div className={`w-3 h-3 rounded-full ${performance.color}`}></div>
              <span className={`font-semibold ${performance.textColor}`}>{performance.level}</span>
            </div>
            <div className="text-3xl font-bold text-slate-800 mt-2">
              {punctualityPercentage.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Layout a due colonne per desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonna statistiche (1/3 su desktop) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-emerald-700">Giorni Puntuali</span>
            </div>
            <div className="text-3xl font-bold text-emerald-800 mb-1">{punctualDays}</div>
            <div className="text-sm text-emerald-600">su {totalDays} giorni totali</div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-xl border border-orange-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-orange-700">Ritardi</span>
            </div>
            <div className="text-3xl font-bold text-orange-800 mb-1">{lateDays}</div>
            <div className="text-sm text-orange-600">
              {averageDelay > 0 && `${averageDelay.toFixed(0)} min media`}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-slate-500 rounded-lg">
                <XCircle className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-slate-700">Assenze</span>
            </div>
            <div className="text-3xl font-bold text-slate-800 mb-1">{absentDays}</div>
            <div className="text-sm text-slate-600">giorni non lavorati</div>
          </div>

          {/* Alert per performance critica */}
          {punctualityPercentage < 70 && (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-xl border border-red-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-800 text-sm">Attenzione Richiesta</div>
                  <div className="text-red-600 text-xs mt-1">
                    Performance al di sotto della soglia aziendale
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Colonna grafico (2/3 su desktop) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="mb-6">
              <h4 className="text-xl font-bold text-slate-800 mb-2">
                Presenza Giornaliera
              </h4>
              
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-emerald-500 rounded"></div>
                  <span className="text-slate-600">Presente ({punctualDays})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-orange-500 rounded"></div>
                  <span className="text-slate-600">In Ritardo ({lateDays})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-slate-400 rounded"></div>
                  <span className="text-slate-600">Assente ({absentDays})</span>
                </div>
              </div>
            </div>

            <div className="h-80 lg:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={1} />
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => 
                      value === 100 ? 'Presente' :
                      value === 50 ? 'Ritardo' :
                      'Assente'
                    }
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-lg">
                            <p className="font-semibold text-slate-800 mb-3">{label}</p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-4">
                                <Badge 
                                  className={
                                    data.status === 'present' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                    data.status === 'late' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                    'bg-slate-100 text-slate-800 border-slate-200'
                                  }
                                  variant="outline"
                                >
                                  {data.status === 'present' ? 'Presente' :
                                   data.status === 'late' ? 'In Ritardo' :
                                   'Assente'}
                                </Badge>
                              </div>
                              {data.status === 'late' && (
                                <div className="pt-2 border-t border-slate-100">
                                  <div className="text-orange-600 font-medium">
                                    Ritardo: {data.lateMinutes} minuti
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="statusValue" 
                    radius={[4, 4, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Footer con dettagli aggiuntivi */}
      {averageDelay > 10 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-xl border border-orange-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="font-semibold text-orange-800">
                Ritardo medio elevato: {averageDelay.toFixed(0)} minuti
              </div>
              <div className="text-orange-600 text-sm">
                Si consiglia un colloquio per comprendere le cause dei ritardi frequenti
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePunctualityChart;
