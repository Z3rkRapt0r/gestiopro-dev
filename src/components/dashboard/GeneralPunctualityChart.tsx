
import React from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { DailyPunctualityData } from '@/hooks/usePunctualityStats';
import { TrendingUp, TrendingDown, Award, Calendar } from 'lucide-react';

interface GeneralPunctualityChartProps {
  dailyData: DailyPunctualityData[];
  period: 'week' | 'month';
}

const GeneralPunctualityChart = ({ dailyData, period }: GeneralPunctualityChartProps) => {
  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-slate-500 text-lg">Nessun dato disponibile per il periodo selezionato</p>
      </div>
    );
  }

  const chartData = dailyData.map(day => ({
    ...day,
    formattedDate: format(new Date(day.date), period === 'week' ? 'EEE dd/MM' : 'dd/MM', { locale: it }),
  }));

  // Calcola statistiche avanzate
  const avgPunctuality = dailyData.reduce((sum, day) => sum + day.punctualityPercentage, 0) / dailyData.length;
  const maxPunctuality = Math.max(...dailyData.map(day => day.punctualityPercentage));
  const minPunctuality = Math.min(...dailyData.map(day => day.punctualityPercentage));
  const totalAnalyzedDays = dailyData.length;
  const trend = dailyData.length > 1 ? 
    (dailyData[dailyData.length - 1].punctualityPercentage - dailyData[0].punctualityPercentage) : 0;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xl font-bold text-slate-800">
            Andamento Puntualità Aziendale
          </h4>
          <div className="flex items-center gap-2">
            {trend > 0 ? (
              <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">+{trend.toFixed(1)}%</span>
              </div>
            ) : trend < 0 ? (
              <div className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1 rounded-full">
                <TrendingDown className="h-4 w-4" />
                <span className="text-sm font-medium">{trend.toFixed(1)}%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-slate-600 bg-slate-50 px-3 py-1 rounded-full">
                <span className="text-sm font-medium">Stabile</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-slate-500">
          Monitoraggio della percentuale di puntualità giornaliera dell'intera azienda
        </p>
      </div>

      {/* Leggenda migliorata */}
      <div className="mb-6 flex justify-center">
        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-200">
          <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
          <span className="text-sm font-medium text-blue-700">Percentuale Puntualità</span>
        </div>
      </div>

      {/* Grafico migliorato */}
      <div className="h-80 lg:h-96 mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <defs>
              <linearGradient id="punctualityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={1} />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fontSize: 12, fill: '#64748b' }}
              angle={-45}
              textAnchor="end"
              height={80}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
              label={{ 
                value: 'Puntualità (%)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: 12 }
              }}
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
                          <span className="text-blue-600 font-medium">Puntualità:</span>
                          <span className="font-bold text-blue-700">{data.punctualityPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                          <div className="text-center">
                            <div className="text-lg font-bold text-emerald-600">{data.punctualEmployees}</div>
                            <div className="text-xs text-slate-500">Puntuali</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-orange-600">{data.lateEmployees}</div>
                            <div className="text-xs text-slate-500">In ritardo</div>
                          </div>
                        </div>
                        <div className="text-center pt-2 border-t border-slate-100">
                          <div className="text-sm text-slate-600">
                            Totale: {data.totalEmployees} dipendenti
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="punctualityPercentage"
              stroke="url(#punctualityGradient)"
              strokeWidth={3}
              dot={{ 
                fill: '#3b82f6', 
                strokeWidth: 0, 
                r: 5,
                style: { filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))' }
              }}
              activeDot={{ 
                r: 7, 
                stroke: '#3b82f6', 
                strokeWidth: 3,
                fill: '#ffffff',
                style: { filter: 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.4))' }
              }}
              fill="url(#punctualityGradient)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Statistiche riassuntive ridisegnate */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-700 mb-1">
            {avgPunctuality.toFixed(1)}%
          </div>
          <div className="text-sm text-blue-600 font-medium">Media Periodo</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200 text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <Award className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mb-1">
            {maxPunctuality.toFixed(1)}%
          </div>
          <div className="text-sm text-emerald-600 font-medium">Miglior Giorno</div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-xl border border-red-200 text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-red-500 rounded-lg">
              <TrendingDown className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-700 mb-1">
            {minPunctuality.toFixed(1)}%
          </div>
          <div className="text-sm text-red-600 font-medium">Giorno Critico</div>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-4 rounded-xl border border-slate-200 text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-slate-500 rounded-lg">
              <Calendar className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-700 mb-1">
            {totalAnalyzedDays}
          </div>
          <div className="text-sm text-slate-600 font-medium">Giorni Analizzati</div>
        </div>
      </div>
    </div>
  );
};

export default GeneralPunctualityChart;
