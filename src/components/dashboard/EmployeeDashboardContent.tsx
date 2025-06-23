
import { useAuth } from '@/hooks/useAuth';
import { useEmployeeStats } from '@/hooks/useEmployeeStats';
import EmployeeStatsCards from './EmployeeStatsCards';
import EmployeeCharts from './EmployeeCharts';
import EmployeeActivityFeed from './EmployeeActivityFeed';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Calendar, Clock, FileText, MessageSquare } from 'lucide-react';

interface EmployeeDashboardContentProps {
  activeSection: string;
}

export default function EmployeeDashboardContent({ activeSection }: EmployeeDashboardContentProps) {
  const { profile } = useAuth();
  const { stats, loading } = useEmployeeStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: "Richiedi Permesso",
      description: "Fai una nuova richiesta di ferie o permesso",
      icon: Calendar,
      color: "bg-green-500",
    },
    {
      title: "Timbratura",
      description: "Registra entrata o uscita",
      icon: Clock,
      color: "bg-blue-500",
    },
    {
      title: "Documenti",
      description: "Visualizza i tuoi documenti",
      icon: FileText,
      color: "bg-purple-500",
    },
    {
      title: "Messaggi",
      description: "Leggi le comunicazioni aziendali",
      icon: MessageSquare,
      color: "bg-orange-500",
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header con benvenuto personalizzato */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <User className="h-8 w-8 text-green-600" />
          Benvenuto, {profile?.first_name}!
        </h1>
        <p className="text-gray-600">
          Ecco una panoramica delle tue attività e statistiche personali
        </p>
      </div>

      {/* Statistiche dipendente */}
      <EmployeeStatsCards stats={stats} />

      {/* Azioni rapide */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Azioni Rapide</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-transparent hover:border-l-green-500">
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-sm font-semibold">{action.title}</CardTitle>
                <CardDescription className="text-xs">{action.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Grafici e attività */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EmployeeCharts />
        <EmployeeActivityFeed />
      </div>

      {/* Messaggio informativo */}
      <Card className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-green-900">
            La Tua Area Personale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-700 leading-relaxed">
            Benvenuto nella tua area personale! Qui puoi gestire le tue richieste di permesso, 
            visualizzare le presenze, accedere ai documenti aziendali e comunicare con i colleghi. 
            Utilizza il menu laterale per navigare tra le diverse sezioni.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
