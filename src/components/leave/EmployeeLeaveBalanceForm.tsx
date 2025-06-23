import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEmployeeLeaveBalance } from "@/hooks/useEmployeeLeaveBalance";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { Calendar, Clock, User, Info } from "lucide-react";

interface EmployeeLeaveBalanceFormProps {
  onSuccess?: () => void;
}

export function EmployeeLeaveBalanceForm({ onSuccess }: EmployeeLeaveBalanceFormProps) {
  const { upsertMutation } = useEmployeeLeaveBalance();
  const { employees } = useActiveEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [vacationDays, setVacationDays] = useState("");
  const [permissionHours, setPermissionHours] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const selectedEmployee = employees?.find(emp => emp.id === selectedEmployeeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployeeId || !vacationDays || !permissionHours) {
      return;
    }

    try {
      await upsertMutation.mutateAsync({
        user_id: selectedEmployeeId,
        year: parseInt(year),
        vacation_days_total: parseInt(vacationDays),
        permission_hours_total: parseInt(permissionHours),
      });

      // Reset form
      setSelectedEmployeeId("");
      setVacationDays("");
      setPermissionHours("");
      
      // Call onSuccess callback if provided
      onSuccess?.();
    } catch (error) {
      console.error('Error saving balance:', error);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i - 2);

  const getTrackingTypeInfo = (trackingType?: string) => {
    if (trackingType === 'from_year_start') {
      return {
        label: "Dall'inizio dell'anno",
        description: "Può registrare assenze dal 1° gennaio",
        color: "bg-blue-100 text-blue-800"
      };
    }
    return {
      label: "Dal giorno di assunzione",
      description: "Conteggio dalla data di creazione",
      color: "bg-green-100 text-green-800"
    };
  };

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
              
              {selectedEmployee && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Tipo di tracciamento:</span>
                  </div>
                  <Badge className={getTrackingTypeInfo(selectedEmployee.tracking_start_type).color}>
                    {getTrackingTypeInfo(selectedEmployee.tracking_start_type).label}
                  </Badge>
                  <p className="text-xs text-gray-600 mt-1">
                    {getTrackingTypeInfo(selectedEmployee.tracking_start_type).description}
                  </p>
                </div>
              )}
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
