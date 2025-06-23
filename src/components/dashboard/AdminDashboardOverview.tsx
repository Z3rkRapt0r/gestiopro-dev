
import { useAdminStats } from "@/hooks/useAdminStats";
import AdminStatsCards from "./AdminStatsCards";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RotateCcw, Shield, Users, FileText, Clock, Settings, Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AdminDashboardOverview = () => {
  const { stats, loading, refreshStats } = useAdminStats();

  const DashboardSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard Amministratore</h2>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  const quickActions = [
    {
      title: "Gestione Dipendenti",
      description: "Aggiungi, modifica o rimuovi dipendenti",
      icon: Users,
      color: "bg-blue-500",
      href: "#employees"
    },
    {
      title: "Documenti",
      description: "Gestisci documenti e approvazioni",
      icon: FileText,
      color: "bg-green-500",
      href: "#documents"
    },
    {
      title: "Presenze",
      description: "Monitora orari e presenze",
      icon: Clock,
      color: "bg-purple-500",
      href: "#attendance"
    },
    {
      title: "Notifiche",
      description: "Invia comunicazioni ai dipendenti",
      icon: Bell,
      color: "bg-orange-500",
      href: "#notifications"
    },
    {
      title: "Impostazioni",
      description: "Configura la piattaforma",
      icon: Settings,
      color: "bg-gray-500",
      href: "#settings"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header con benvenuto */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Amministratore</h2>
          <p className="text-gray-600">Panoramica generale del sistema aziendale</p>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={refreshStats} 
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Aggiorna
        </Button>
      </div>

      {/* Carte statistiche */}
      <AdminStatsCards stats={stats} />

      {/* Azioni rapide */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Azioni Rapide
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {quickActions.map((action, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500">
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

      {/* Messaggio di benvenuto migliorato */}
      <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Sistema di Gestione Aziendale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700 leading-relaxed">
            Benvenuto nel pannello di controllo amministratore. Da qui puoi gestire tutti gli aspetti 
            del sistema aziendale: dipendenti, documenti, presenze e impostazioni. 
            Utilizza le sezioni nel menu per accedere alle diverse funzionalità.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardOverview;
