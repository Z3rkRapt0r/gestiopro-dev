
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface EmployeeChartsProps {
  stats: {
    pendingLeaveRequests: number;
    approvedLeaveRequests: number;
    rejectedLeaveRequests: number;
    documentsCount: number;
    unreadNotificationsCount: number;
  };
}

const EmployeeCharts = ({ stats }: EmployeeChartsProps) => {
  // Provide default values if stats is undefined
  const safeStats = stats || {
    pendingLeaveRequests: 0,
    approvedLeaveRequests: 0,
    rejectedLeaveRequests: 0,
    documentsCount: 0,
    unreadNotificationsCount: 0,
  };

  const leaveRequestsData = [
    { name: 'In Attesa', value: safeStats.pendingLeaveRequests, color: '#f59e0b' },
    { name: 'Approvate', value: safeStats.approvedLeaveRequests, color: '#10b981' },
    { name: 'Respinte', value: safeStats.rejectedLeaveRequests, color: '#ef4444' },
  ];

  const activityData = [
    { name: 'Documenti', value: safeStats.documentsCount },
    { name: 'Notifiche Non Lette', value: safeStats.unreadNotificationsCount },
  ];

  const chartConfig = {
    pending: { label: "In Attesa", color: "#f59e0b" },
    approved: { label: "Approvate", color: "#10b981" },
    rejected: { label: "Respinte", color: "#ef4444" },
    documents: { label: "Documenti", color: "#3b82f6" },
    notifications: { label: "Notifiche", color: "#8b5cf6" },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardHeader>
          <CardTitle>Stato Richieste Ferie</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leaveRequestsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leaveRequestsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attività Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Bar dataKey="value" fill="#3b82f6" />
                <ChartTooltip content={<ChartTooltipContent />} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeCharts;
