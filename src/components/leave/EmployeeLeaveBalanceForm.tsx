
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmployeeLeaveBalance } from "@/hooks/useEmployeeLeaveBalance";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { Calendar, Clock, User } from "lucide-react";

export function EmployeeLeaveBalanceForm() {
  const { upsertMutation } = useEmployeeLeaveBalance();
  const { employees } = useActiveEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [vacationDays, setVacationDays] = useState("");
  const [permissionHours, setPermissionHours] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployeeId || !vacationDays || !permissionHours) {
      return;
    }

    upsertMutation.mutate({
      user_id: selectedEmployeeId,
      year: parseInt(year),
      vacation_days_total: parseInt(vacationDays),
      permission_hours_total: parseInt(permissionHours),
    });

    // Reset form
    setSelectedEmployeeId("");
    setVacationDays("");
    setPermissionHours("");
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i - 2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Assegna Ferie e Permessi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Dipendente</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona dipendente..." />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Anno</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vacation-days" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Giorni di Ferie
              </Label>
              <Input
                id="vacation-days"
                type="number"
                min="0"
                max="365"
                value={vacationDays}
                onChange={(e) => setVacationDays(e.target.value)}
                placeholder="es. 22"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permission-hours" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Ore di Permesso
              </Label>
              <Input
                id="permission-hours"
                type="number"
                min="0"
                max="1000"
                value={permissionHours}
                onChange={(e) => setPermissionHours(e.target.value)}
                placeholder="es. 88"
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={upsertMutation.isPending || !selectedEmployeeId || !vacationDays || !permissionHours}
            className="w-full"
          >
            {upsertMutation.isPending ? "Assegnazione..." : "Assegna Ferie e Permessi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
