
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';

export default function NewManualAttendanceForm() {
  const { createManualAttendance, isCreating } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const [formData, setFormData] = useState({
    user_id: '',
    date: '',
    date_to: '',
    check_in_time: '',
    check_out_time: '',
    notes: '',
    is_sick_leave: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.is_sick_leave && formData.date && formData.date_to) {
      // Gestione range di date per malattia
      const startDate = new Date(formData.date);
      const endDate = new Date(formData.date_to);
      
      const dates = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate).toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Crea una presenza per ogni giorno nel range
      for (const date of dates) {
        const attendanceData = {
          user_id: formData.user_id,
          date: date,
          check_in_time: null,
          check_out_time: null,
          notes: formData.notes || null,
          is_sick_leave: true,
        };
        
        console.log('Salvando giorno di malattia per data:', date);
        createManualAttendance(attendanceData);
      }
    } else {
      // Gestione presenza singola
      const attendanceData = {
        user_id: formData.user_id,
        date: formData.date,
        check_in_time: formData.is_sick_leave ? null : (formData.check_in_time || null),
        check_out_time: formData.is_sick_leave ? null : (formData.check_out_time || null),
        notes: formData.notes || null,
        is_sick_leave: formData.is_sick_leave,
      };

      console.log('Dati presenza da salvare:', attendanceData);
      createManualAttendance(attendanceData);
    }
    
    // Reset form
    setFormData({
      user_id: '',
      date: '',
      date_to: '',
      check_in_time: '',
      check_out_time: '',
      notes: '',
      is_sick_leave: false,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Inserimento Presenza Manuale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="employee">Dipendente</Label>
              <Select value={formData.user_id} onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona dipendente" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name} ({employee.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sick_leave"
                checked={formData.is_sick_leave}
                onCheckedChange={(checked) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    is_sick_leave: checked as boolean,
                    // Se è malattia, svuota gli orari
                    check_in_time: checked ? '' : prev.check_in_time,
                    check_out_time: checked ? '' : prev.check_out_time
                  }));
                }}
              />
              <Label htmlFor="sick_leave" className="text-orange-700 font-medium">
                Giorno/i di malattia
              </Label>
            </div>

            {formData.is_sick_leave ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Data Inizio</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => {
                      console.log('Data inizio malattia selezionata:', e.target.value);
                      setFormData(prev => ({ ...prev, date: e.target.value }));
                    }}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date_to">Data Fine</Label>
                  <Input
                    id="date_to"
                    type="date"
                    value={formData.date_to}
                    min={formData.date}
                    onChange={(e) => {
                      console.log('Data fine malattia selezionata:', e.target.value);
                      setFormData(prev => ({ ...prev, date_to: e.target.value }));
                    }}
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    console.log('Data selezionata dal picker:', e.target.value);
                    setFormData(prev => ({ ...prev, date: e.target.value }));
                  }}
                  required
                />
              </div>
            )}

            {!formData.is_sick_leave && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="check_in">Orario Entrata</Label>
                  <Input
                    id="check_in"
                    type="time"
                    value={formData.check_in_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_in_time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="check_out">Orario Uscita</Label>
                  <Input
                    id="check_out"
                    type="time"
                    value={formData.check_out_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_out_time: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Note</Label>
              <Textarea
                id="notes"
                placeholder="Note aggiuntive..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <Button 
              type="submit" 
              disabled={isCreating || !formData.user_id || !formData.date || (formData.is_sick_leave && !formData.date_to)} 
              className="w-full"
            >
              {isCreating ? 'Salvando...' : (formData.is_sick_leave ? 'Registra Malattia' : 'Salva Presenza')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
