
import { useAuth } from '@/hooks/useAuth';
import { useEmployeeStats } from '@/hooks/useEmployeeStats';
import EmployeeStatsCards from './EmployeeStatsCards';
import EmployeeCharts from './EmployeeCharts';
import EmployeeActivityFeed from './EmployeeActivityFeed';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Calendar, Clock, FileText, MessageSquare, ArrowRight } from 'lucide-react';

interface EmployeeDashboardContentProps {
  activeSection: string;
}

export default function EmployeeDashboardContent({ activeSection }: EmployeeDashboardContentProps) {
  const { profile } = useAuth();
  const { stats, loading } = useEmployeeStats();

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 sm:h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Skeleton className="h-60 sm:h-64" />
          <Skeleton className="h-60 sm:h-64" />
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: "Richiedi Permesso",
      description: "Nuova richiesta ferie",
      icon: Calendar,
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600",
      textColor: "text-green-50",
    },
    {
      title: "Timbratura",
      description: "Registra presenza",
      icon: Clock,
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
      textColor: "text-blue-50",
    },
    {
      title: "Documenti",
      description: "I tuoi file",
      icon: FileText,
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600",
      textColor: "text-purple-50",
    },
    {
      title: "Messaggi",
      description: "Comunicazioni",
      icon: MessageSquare,
      color: "bg-orange-500",
      hoverColor: "hover:bg-orange-600",
      textColor: "text-orange-50",
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header con benvenuto personalizzato */}
      <div className="space-y-2 sm:space-y-3">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
          <User className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
          <span className="truncate">Benvenuto, {profile?.first_name}!</span>
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-gray-600">
          Ecco una panoramica delle tue attività e statistiche personali
        </p>
      </div>

      {/* Statistiche dipendente */}
      <EmployeeStatsCards stats={stats} />

      {/* Azioni rapide */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">Azioni Rapide</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {quickActions.map((action, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-transparent hover:border-l-green-500 hover:scale-105 active:scale-95 group">
              <CardHeader className="pb-2 sm:pb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${action.color} ${action.hoverColor} rounded-lg flex items-center justify-center mb-2 sm:mb-3 transition-all duration-300 group-hover:scale-110`}>
                  <action.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${action.textColor}`} />
                </div>
                <CardTitle className="text-sm sm:text-base font-semibold truncate">{action.title}</CardTitle>
                <CardDescription className="text-xs sm:text-sm truncate">{action.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-3 sm:pb-4">
                <div className="flex items-center text-xs sm:text-sm text-gray-500 group-hover:text-green-600 transition-colors">
                  <span className="truncate">Vai alla sezione</span>
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Grafici e attività */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <EmployeeCharts stats={stats} />
        </div>
        <div className="lg:col-span-2">
          <EmployeeActivityFeed 
            recentDocuments={stats.recentDocuments}
            recentNotifications={stats.recentNotifications}
          />
        </div>
      </div>

      {/* Messaggio informativo */}
      <Card className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-green-200 hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg lg:text-xl font-semibold text-green-900 flex items-center gap-2">
            <User className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
            <span className="truncate">La Tua Area Personale</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm sm:text-base text-green-700 leading-relaxed">
            Benvenuto nella tua area personale! Qui puoi gestire le tue richieste di permesso, 
            visualizzare le presenze, accedere ai documenti aziendali e comunicare con i colleghi. 
            Utilizza il menu laterale per navigare tra le diverse sezioni.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
