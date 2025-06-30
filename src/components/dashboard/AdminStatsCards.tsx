
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Calendar, Clock, Bell, UserCheck } from "lucide-react";

interface AdminStatsCardsProps {
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    totalDocuments: number;
    pendingLeaveRequests: number;
    totalAttendancesToday: number;
    unreadNotifications: number;
  };
}

const AdminStatsCards = ({ stats }: AdminStatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 sm:pb-2">
          <CardTitle className="text-sm sm:text-base font-medium text-blue-800">Dipendenti Totali</CardTitle>
          <Users className="h-5 w-5 sm:h-4 sm:w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl sm:text-2xl font-bold text-blue-900">{stats.totalEmployees}</div>
          <p className="text-sm sm:text-xs text-blue-600 mt-1">Dipendenti registrati</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 sm:pb-2">
          <CardTitle className="text-sm sm:text-base font-medium text-green-800">Dipendenti Attivi</CardTitle>
          <UserCheck className="h-5 w-5 sm:h-4 sm:w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl sm:text-2xl font-bold text-green-900">{stats.activeEmployees}</div>
          <p className="text-sm sm:text-xs text-green-600 mt-1">Attualmente attivi</p>
        </CardContent>
      </Card>

      <Card className="sm:col-span-2 lg:col-span-1 hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 sm:pb-2">
          <CardTitle className="text-sm sm:text-base font-medium">Documenti</CardTitle>
          <FileText className="h-5 w-5 sm:h-4 sm:w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl sm:text-2xl font-bold">{stats.totalDocuments}</div>
          <p className="text-sm sm:text-xs text-muted-foreground mt-1">Totali nel sistema</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 sm:pb-2">
          <CardTitle className="text-sm sm:text-base font-medium">Richieste Ferie</CardTitle>
          <Calendar className="h-5 w-5 sm:h-4 sm:w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl sm:text-2xl font-bold">{stats.pendingLeaveRequests}</div>
          <p className="text-sm sm:text-xs text-muted-foreground mt-1">In attesa di approvazione</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 sm:pb-2">
          <CardTitle className="text-sm sm:text-base font-medium">Presenze Oggi</CardTitle>
          <Clock className="h-5 w-5 sm:h-4 sm:w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl sm:text-2xl font-bold">{stats.totalAttendancesToday}</div>
          <p className="text-sm sm:text-xs text-muted-foreground mt-1">Dipendenti presenti</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 sm:pb-2">
          <CardTitle className="text-sm sm:text-base font-medium">Notifiche</CardTitle>
          <Bell className="h-5 w-5 sm:h-4 sm:w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl sm:text-2xl font-bold">{stats.unreadNotifications}</div>
          <p className="text-sm sm:text-xs text-muted-foreground mt-1">Non lette</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStatsCards;
