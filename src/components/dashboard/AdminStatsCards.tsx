
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-800">Dipendenti Totali</CardTitle>
          <Users className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-900">{stats.totalEmployees}</div>
          <p className="text-xs text-blue-600">Dipendenti registrati</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-800">Dipendenti Attivi</CardTitle>
          <UserCheck className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-900">{stats.activeEmployees}</div>
          <p className="text-xs text-green-600">Attualmente attivi</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Documenti</CardTitle>
          <FileText className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalDocuments}</div>
          <p className="text-xs text-muted-foreground">Totali nel sistema</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Richieste Ferie</CardTitle>
          <Calendar className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingLeaveRequests}</div>
          <p className="text-xs text-muted-foreground">In attesa di approvazione</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Presenze Oggi</CardTitle>
          <Clock className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAttendancesToday}</div>
          <p className="text-xs text-muted-foreground">Dipendenti presenti</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Notifiche</CardTitle>
          <Bell className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.unreadNotifications}</div>
          <p className="text-xs text-muted-foreground">Non lette</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStatsCards;
