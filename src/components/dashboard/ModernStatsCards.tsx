
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Calendar, Bell, UserCheck, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernStatsCardsProps {
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    totalDocuments: number;
    pendingLeaveRequests: number;
    unreadNotifications: number;
  };
}

const statsConfig = [
  {
    title: 'Dipendenti Totali',
    key: 'totalEmployees' as const,
    icon: Users,
    gradient: 'from-blue-500 via-blue-600 to-cyan-600',
    bgGradient: 'from-blue-50 to-cyan-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-500',
    change: '+2.5%',
    changeType: 'positive' as const
  },
  // RIMOSSO: scheda "Dipendenti Attivi" su richiesta
  {
    title: 'Documenti',
    key: 'totalDocuments' as const,
    icon: FileText,
    gradient: 'from-purple-500 via-purple-600 to-indigo-600',
    bgGradient: 'from-purple-50 to-indigo-50',
    borderColor: 'border-purple-200',
    iconBg: 'bg-purple-500',
    change: '+12.3%',
    changeType: 'positive' as const
  },
  {
    title: 'Richieste Ferie',
    key: 'pendingLeaveRequests' as const,
    icon: Calendar,
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    bgGradient: 'from-amber-50 to-orange-50',
    borderColor: 'border-amber-200',
    iconBg: 'bg-amber-500',
    change: '-8.1%',
    changeType: 'negative' as const
  },

  {
    title: 'Notifiche',
    key: 'unreadNotifications' as const,
    icon: Bell,
    gradient: 'from-pink-500 via-rose-500 to-red-500',
    bgGradient: 'from-pink-50 to-rose-50',
    borderColor: 'border-pink-200',
    iconBg: 'bg-pink-500',
    change: '+15.2%',
    changeType: 'positive' as const
  }
];

export default function ModernStatsCards({ stats }: ModernStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6 mb-8">
      {statsConfig.map((config, index) => {
        const Icon = config.icon;
        const value = stats[config.key];
        const ChangeIcon = config.changeType === 'positive' ? TrendingUp : TrendingDown;
        
        return (
          <Card 
            key={config.key}
            className={cn(
              "group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl border-0",
              `bg-gradient-to-br ${config.bgGradient}`,
              "backdrop-blur-sm"
            )}
          >
            {/* Gradient Border */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-r p-[1px] rounded-lg opacity-60",
              config.gradient
            )}>
              <div className="h-full w-full bg-white rounded-lg" />
            </div>
            
            {/* Content */}
            <div className="relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                  {config.title}
                </CardTitle>
                <div className={cn(
                  "p-2 rounded-lg shadow-lg transition-all duration-300 group-hover:scale-110",
                  `bg-gradient-to-r ${config.gradient}`
                )}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              
              <CardContent className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-slate-900 mb-1">
                      {value.toLocaleString()}
                    </div>
                    <div className="flex items-center space-x-1">
                      <ChangeIcon className={cn(
                        "h-3 w-3",
                        config.changeType === 'positive' ? "text-emerald-600" : "text-red-600"
                      )} />
                      <span className={cn(
                        "text-xs font-medium",
                        config.changeType === 'positive' ? "text-emerald-600" : "text-red-600"
                      )}>
                        {config.change}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/20 to-transparent rounded-full -translate-y-10 translate-x-10" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-white/10 to-transparent rounded-full translate-y-8 -translate-x-8" />
          </Card>
        );
      })}
    </div>
  );
}
