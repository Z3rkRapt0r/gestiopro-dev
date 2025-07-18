
import React from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { DailyPunctualityData } from '@/hooks/usePunctualityStats';
import { TrendingUp, TrendingDown, Award, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { 
  getPunctualityColor, 
  getPunctualityLevel, 
  getPunctualityStatus,
  PUNCTUALITY_THRESHOLDS,
  PUNCTUALITY_COLORS
} from '@/utils/punctualityColors';

interface DynamicPunctualityChartProps {
  dailyData: DailyPunctualityData[];
  period: 'week' | 'month';
}

const DynamicPunctualityChart = ({ dailyData, period }: DynamicPunctualityChartProps) => {
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
    color: getPunctualityColor(day.punctualityPercentage),
    level: getPunctualityLevel(day.punctualityPercentage),
    status: getPunctualityStatus(day.punctualityPercentage),
  }));

  // Calcola statistiche avanzate con colori dinamici
  const avgPunctuality = dailyData.reduce((sum, day) => sum + day.punctualityPercentage, 0) / dailyData.length;
  const maxPunctuality = Math.max(...dailyData.map(day => day.punctualityPercentage));
  const minPunctuality = Math.min(...dailyData.map(day => day.punctualityPercentage));
  const totalAnalyzedDays = dailyData.length;
  const trend = dailyData.length > 1 ? 
    (dailyData[dailyData.length - 1].punctualityPercentage - dailyData[0].punctualityPercentage) : 0;

  // Determina il colore generale basato sulla media
  const overallLevel = getPunctualityLevel(avgPunctuality);
  const overallColor = PUNCTUALITY_COLORS[overallLevel];

  // Custom dot component per punti colorati dinamicamente
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;
    
    const color = getPunctualityColor(payload.punctualityPercentage);
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={color}
        stroke="#ffffff"
        strokeWidth={2}
        style={{ filter: `drop-shadow(0 2px 4px ${color}40)` }}
      />
    );
  };

  // Custom active dot
  const CustomActiveDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;
    
    const color = getPunctualityColor(payload.punctualityPercentage);
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={7}
        fill="#ffffff"
        stroke={color}
        strokeWidth={3}
        style={{ filter: `drop-shadow(0 4px 8px ${color}60)` }}
      />
    );
  };

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
          Monitoraggio della percentuale di puntualità giornaliera con indicatori di performance
        </p>
      </div>

      {/* Leggenda migliorata con soglie colore */}
      <div className="mb-6 flex flex-wrap justify-center gap-4">
        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-full border border-emerald-200">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">≥90% Eccellente</span>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-full border border-amber-200">
          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
          <span className="text-sm font-medium text-amber-700">70-89% Buono</span>
        </div>
        <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-full border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-sm font-medium text-red-700">&lt;70% Critico</span>
        </div>
      </div>

      {/* Grafico migliorato con colori dinamici */}
      <div className="h-80 lg:h-96 mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <defs>
              {/* Gradienti dinamici per ogni livello */}
              <linearGradient id="punctualityGradient-excellent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="punctualityGradient-good" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="punctualityGradient-critical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={1} />
            
            {/* Linee di riferimento per le soglie */}
            <ReferenceLine 
              y={PUNCTUALITY_THRESHOLDS.excellent} 
              stroke="#10b981" 
              strokeDasharray="5 5" 
              strokeWidth={1}
              label={{ value: "90%", position: "top", fontSize: 10, fill: "#10b981" }}
            />
            <ReferenceLine 
              y={PUNCTUALITY_THRESHOLDS.good} 
              stroke="#f59e0b" 
              strokeDasharray="5 5" 
              strokeWidth={1}
              label={{ value: "70%", position: "top", fontSize: 10, fill: "#f59e0b" }}
            />
            
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
                  const color = getPunctualityColor(data.punctualityPercentage);
                  const status = getPunctualityStatus(data.punctualityPercentage);
                  
                  return (
                    <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-lg">
                      <p className="font-semibold text-slate-800 mb-3">{label}</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium" style={{ color }}>Puntualità:</span>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: color }}
                            ></div>
                            <span className="font-bold" style={{ color }}>
                              {data.punctualityPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="text-center py-1">
                          <span 
                            className="text-sm font-medium px-2 py-1 rounded-full"
                            style={{ 
                              backgroundColor: `${color}20`, 
                              color: color 
                            }}
                          >
                            {status}
                          </span>
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
              stroke={overallColor.primary}
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={<CustomActiveDot />}
              fill={`url(#punctualityGradient-${overallLevel})`}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Statistiche riassuntive con colori dinamici */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          className="p-4 rounded-xl border text-center"
          style={{ 
            backgroundColor: `${overallColor.primary}10`,
            borderColor: `${overallColor.primary}30`
          }}
        >
          <div className="flex items-center justify-center mb-2">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: overallColor.primary }}
            >
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </div>
          <div 
            className="text-2xl font-bold mb-1"
            style={{ color: overallColor.primary }}
          >
            {avgPunctuality.toFixed(1)}%
          </div>
          <div 
            className="text-sm font-medium"
            style={{ color: overallColor.primary }}
          >
            Media Periodo
          </div>
          <div className="text-xs mt-1" style={{ color: `${overallColor.primary}80` }}>
            {getPunctualityStatus(avgPunctuality)}
          </div>
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

export default DynamicPunctualityChart;
