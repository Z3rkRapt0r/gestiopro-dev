
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { EmployeeDailyStats } from '@/hooks/usePunctualityStats';
import { Badge } from '@/components/ui/badge';

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

    return {
      ...day,
      formattedDate: format(new Date(day.date), period === 'week' ? 'EEE dd/MM' : 'dd/MM', { locale: it }),
      statusValue,
      color: 
        day.status === 'present' ? '#10b981' :
        day.status === 'late' ? '#f59e0b' :
        '#6b7280', // absent
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

  return (
    <div className="space-y-6">
      {/* Statistiche personali */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
          <div className="text-sm font-medium text-emerald-700 mb-1">Puntualità</div>
          <div className="text-2xl font-bold text-emerald-800">
            {punctualityPercentage.toFixed(1)}%
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
          <div className="text-sm font-medium text-blue-700 mb-1">Giorni Presenti</div>
          <div className="text-2xl font-bold text-blue-800">{presentDays}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
          <div className="text-sm font-medium text-orange-700 mb-1">Ritardi</div>
          <div className="text-2xl font-bold text-orange-800">{lateDays}</div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-1">Assenze</div>
          <div className="text-2xl font-bold text-gray-800">{absentDays}</div>
        </div>
      </div>

      {/* Grafico presenza giornaliera */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 text-center">
          Presenza Giornaliera - {employeeData.firstName} {employeeData.lastName}
        </h4>
        
        <div className="mb-4 flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-green-500 rounded"></div>
            <span>Presente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-yellow-500 rounded"></div>
            <span>In Ritardo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-gray-400 rounded"></div>
            <span>Assente</span>
          </div>
        </div>

        <div className="h-80 lg:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => 
                  value === 100 ? 'Presente' :
                  value === 50 ? 'Ritardo' :
                  'Assente'
                }
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                        <p className="font-medium">{label}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Badge 
                              className={
                                data.status === 'present' ? 'bg-green-100 text-green-800' :
                                data.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }
                              variant="outline"
                            >
                              {data.status === 'present' ? 'Presente' :
                               data.status === 'late' ? 'In Ritardo' :
                               'Assente'}
                            </Badge>
                          </div>
                          {data.status === 'late' && (
                            <p className="text-orange-600">
                              Ritardo: {data.lateMinutes} minuti
                            </p>
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
                fill={(entry: any) => entry.color}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Dettagli aggiuntivi */}
        {averageDelay > 0 && (
          <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-sm font-medium text-orange-800">
              Ritardo medio: {averageDelay.toFixed(0)} minuti
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeePunctualityChart;
