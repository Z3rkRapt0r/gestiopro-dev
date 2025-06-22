
import { useAdminStats } from "@/hooks/useAdminStats";
import AdminStatsCards from "./AdminStatsCards";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

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
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Amministratore</h2>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Amministratore</h2>
        <Button 
          size="icon" 
          variant="outline" 
          onClick={refreshStats} 
          title="Aggiorna statistiche"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Carte statistiche ottimizzate per admin */}
      <AdminStatsCards stats={stats} />

      {/* Messaggi di benvenuto */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Benvenuto nel pannello di controllo</h3>
        <p className="text-blue-700">
          Gestisci dipendenti, approvazioni, presenze e documenti dal menu laterale.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboardOverview;
