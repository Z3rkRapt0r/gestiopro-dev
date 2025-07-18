
import React from 'react';
import { DailyPunctualityData } from '@/hooks/usePunctualityStats';
import DynamicPunctualityChart from './DynamicPunctualityChart';

interface GeneralPunctualityChartProps {
  dailyData: DailyPunctualityData[];
  period: 'week' | 'month';
}

const GeneralPunctualityChart = ({ dailyData, period }: GeneralPunctualityChartProps) => {
  return <DynamicPunctualityChart dailyData={dailyData} period={period} />;
};

export default GeneralPunctualityChart;
