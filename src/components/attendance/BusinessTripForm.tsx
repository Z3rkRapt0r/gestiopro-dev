
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plane } from 'lucide-react';
import { useBusinessTrips } from '@/hooks/useBusinessTrips';

export default function BusinessTripForm() {
  const { createTrip, isCreating } = useBusinessTrips();
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    destination: '',
    reason: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTrip(formData);
    setFormData({
      start_date: '',
      end_date: '',
      destination: '',
      reason: '',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="w-5 h-5" />
          Richiesta Trasferta
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Data Inizio</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_date">Data Fine</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="destination">Destinazione</Label>
            <Input
              id="destination"
              placeholder="Città, Paese"
              value={formData.destination}
              onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="reason">Motivo della trasferta</Label>
            <Textarea
              id="reason"
              placeholder="Descrivi il motivo della trasferta..."
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            />
          </div>

          <Button type="submit" disabled={isCreating} className="w-full">
            {isCreating ? 'Inviando...' : 'Invia Richiesta'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
