
import React from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { DailyPunctualityData } from '@/hooks/usePunctualityStats';

interface GeneralPunctualityChartProps {
  dailyData: DailyPunctualityData[];
  period: 'week' | 'month';
}

const GeneralPunctualityChart = ({ dailyData, period }: GeneralPunctualityChartProps) => {
  const chartData = dailyData.map(day => ({
    ...day,
    formattedDate: format(new Date(day.date), period === 'week' ? 'EEE dd/MM' : 'dd/MM', { locale: it }),
  }));

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="text-lg font-semibold text-gray-800 mb-4 text-center">
        Andamento Puntualità Aziendale
      </h4>
      <div className="mb-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-blue-500 rounded"></div>
          <span>Puntualità %</span>
        </div>
      </div>
      <div className="h-80 lg:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              label={{ value: 'Puntualità (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium">{label}</p>
                      <div className="space-y-1 text-sm">
                        <p className="text-blue-600">
                          Puntualità: {data.punctualityPercentage.toFixed(1)}%
                        </p>
                        <p className="text-green-600">
                          Puntuali: {data.punctualEmployees}/{data.totalEmployees}
                        </p>
                        <p className="text-orange-600">
                          In ritardo: {data.lateEmployees}
                        </p>
                        <p className="text-gray-600">
                          Assenti: {data.absentEmployees}
                        </p>
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
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Statistiche riassuntive */}
      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {(dailyData.reduce((sum, day) => sum + day.punctualityPercentage, 0) / dailyData.length).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Media Periodo</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl font-bold text-green-600">
            {Math.max(...dailyData.map(day => day.punctualityPercentage)).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Migliore</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl font-bold text-red-600">
            {Math.min(...dailyData.map(day => day.punctualityPercentage)).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Peggiore</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl font-bold text-gray-600">
            {dailyData.length}
          </div>
          <div className="text-sm text-gray-600">Giorni Analizzati</div>
        </div>
      </div>
    </div>
  );
};

export default GeneralPunctualityChart;
