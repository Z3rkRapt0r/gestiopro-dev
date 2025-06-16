
import { useEmployeeStats } from "@/hooks/useEmployeeStats";
import EmployeeStatsCards from "./EmployeeStatsCards";
import EmployeeCharts from "./EmployeeCharts";
import EmployeeActivityFeed from "./EmployeeActivityFeed";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

const EmployeeDashboardSection = () => {
  const { stats, loading, refreshStats } = useEmployeeStats();

  const DashboardSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <Button 
          size="icon" 
          variant="outline" 
          onClick={refreshStats} 
          title="Aggiorna statistiche"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Carte statistiche */}
      <EmployeeStatsCards stats={stats} />

      {/* Grafici */}
      <EmployeeCharts stats={stats} />

      {/* Bacheca attività */}
      <EmployeeActivityFeed 
        recentDocuments={stats.recentDocuments}
        recentNotifications={stats.recentNotifications}
      />
    </div>
  );
};

export default EmployeeDashboardSection;
