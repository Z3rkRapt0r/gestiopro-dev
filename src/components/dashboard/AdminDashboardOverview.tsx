import { useAdminStats } from "@/hooks/useAdminStats";
import ModernStatsCards from "./ModernStatsCards";
import UpcomingLeavesSection from "./UpcomingLeavesSection";
import TodayAttendanceSummary from "./TodayAttendanceSummary";
import PunctualityChart from "./PunctualityChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, TrendingUp, Activity } from "lucide-react";
const AdminDashboardOverview = () => {
  const {
    stats,
    loading
  } = useAdminStats();
  const DashboardSkeleton = () => <div className="space-y-6 sm:space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {[...Array(6)].map((_, i) => <div key={i} className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 sm:p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-16 sm:w-20 bg-slate-200 rounded"></div>
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-slate-200 rounded-lg"></div>
            </div>
            <div className="h-6 sm:h-8 w-12 sm:w-16 bg-slate-200 rounded mb-2"></div>
            <div className="h-3 w-8 sm:w-12 bg-slate-200 rounded"></div>
          </div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 sm:h-96 rounded-xl" />
        <Skeleton className="h-80 sm:h-96 rounded-xl" />
      </div>
    </div>;
  if (loading) {
    return <div className="space-y-6 px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Dashboard Amministratore</h1>
            <p className="text-slate-600 text-base sm:text-lg">Panoramica generale del sistema</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Activity className="h-4 w-4 animate-pulse" />
            <span>Caricamento dati...</span>
          </div>
        </div>
        <DashboardSkeleton />
      </div>;
  }
  return <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      {/* Header Section - Mobile optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
            Dashboard Amministratore
          </h1>
          <p className="text-slate-600 text-base sm:text-lg">
            Panoramica generale del sistema aziendale
          </p>
        </div>
        <div className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
          <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-emerald-700">Sistema Attivo</span>
        </div>
      </div>

      {/* Modern Stats Cards */}
      <ModernStatsCards stats={stats} />

      {/* Today Attendance Summary */}
      <TodayAttendanceSummary />

      {/* Punctuality Chart and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PunctualityChart />
        
        
      </div>

      {/* Additional Insights */}
      

      {/* Upcoming Leaves Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-4 sm:p-6">
        <UpcomingLeavesSection />
      </div>
    </div>;
};
export default AdminDashboardOverview;