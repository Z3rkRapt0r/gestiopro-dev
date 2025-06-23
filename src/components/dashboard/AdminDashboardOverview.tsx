
import { useAdminStats } from "@/hooks/useAdminStats";
import AdminStatsCards from "./AdminStatsCards";
import UpcomingLeavesSection from "./UpcomingLeavesSection";
import { Skeleton } from "@/components/ui/skeleton";

const AdminDashboardOverview = () => {
  const { stats, loading } = useAdminStats();

  const DashboardSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Carte statistiche */}
      <AdminStatsCards stats={stats} />

      {/* Sezione ferie imminenti */}
      <UpcomingLeavesSection />
    </div>
  );
};

export default AdminDashboardOverview;
