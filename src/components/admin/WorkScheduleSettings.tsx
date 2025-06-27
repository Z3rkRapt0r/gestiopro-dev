
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, Calendar } from 'lucide-react';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';

export default function WorkScheduleSettings() {
  const { workSchedule, updateWorkSchedule, isUpdating, isLoading } = useWorkSchedules();
  const [formData, setFormData] = useState({
    start_time: '08:00',
    end_time: '17:00',
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
    tolerance_minutes: 15,
  });

  useEffect(() => {
    if (workSchedule) {
      console.log('Impostazione dati form con orari caricati:', workSchedule);
      setFormData({
        start_time: workSchedule.start_time || '08:00',
        end_time: workSchedule.end_time || '17:00',
        monday: workSchedule.monday ?? true,
        tuesday: workSchedule.tuesday ?? true,
        wednesday: workSchedule.wednesday ?? true,
        thursday: workSchedule.thursday ?? true,
        friday: workSchedule.friday ?? true,
        saturday: workSchedule.saturday ?? false,
        sunday: workSchedule.sunday ?? false,
        tolerance_minutes: workSchedule.tolerance_minutes ?? 15,
      });
    }
  }, [workSchedule]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Invio form orari:', formData);
    updateWorkSchedule(formData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Caricamento orari di lavoro...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dayLabels = {
    monday: 'Lunedì',
    tuesday: 'Martedì',
    wednesday: 'Mercoledì',
    thursday: 'Giovedì',
    friday: 'Venerdì',
    saturday: 'Sabato',
    sunday: 'Domenica'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Orari di Lavoro
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Orario di Inizio</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="end_time">Orario di Fine</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tolerance">Tolleranza (minuti)</Label>
            <Input
              id="tolerance"
              type="number"
              min="0"
              max="60"
              value={formData.tolerance_minutes}
              onChange={(e) => setFormData(prev => ({ ...prev, tolerance_minutes: parseInt(e.target.value) }))}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <Label className="text-base">Giorni Lavorativi</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(dayLabels).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key}>{label}</Label>
                  <Switch
                    id={key}
                    checked={formData[key as keyof typeof formData] as boolean}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, [key]: checked }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? 'Salvando...' : 'Salva Orari'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
