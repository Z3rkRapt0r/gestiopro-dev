
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plane, AlertCircle } from 'lucide-react';
import { useBusinessTrips } from '@/hooks/useBusinessTrips';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

export default function BusinessTripForm() {
  const { createTrip, isCreating } = useBusinessTrips();
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    destination: '',
    reason: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Funzione per validare le date rispetto alla data di assunzione
  const validateDatesAgainstHireDate = (startDate: string, endDate: string) => {
    if (!startDate || !profile?.hire_date) return true;

    const hireDateObj = new Date(profile.hire_date);
    const startDateObj = new Date(startDate);
    
    if (startDateObj < hireDateObj) {
      setValidationError(`⚠️ Impossibile salvare l'evento: la data di inizio (${format(startDateObj, 'dd/MM/yyyy')}) è antecedente alla data di assunzione (${format(hireDateObj, 'dd/MM/yyyy')}).`);
      return false;
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      if (endDateObj < hireDateObj) {
        setValidationError(`⚠️ Impossibile salvare l'evento: la data di fine (${format(endDateObj, 'dd/MM/yyyy')}) è antecedente alla data di assunzione (${format(hireDateObj, 'dd/MM/yyyy')}).`);
        return false;
      }
    }

    setValidationError(null);
    return true;
  };

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    const startDate = field === 'start_date' ? value : formData.start_date;
    const endDate = field === 'end_date' ? value : formData.end_date;
    
    validateDatesAgainstHireDate(startDate, endDate);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verifica finale della validazione
    if (!validateDatesAgainstHireDate(formData.start_date, formData.end_date)) {
      return;
    }
    
    createTrip(formData);
    setFormData({
      start_date: '',
      end_date: '',
      destination: '',
      reason: '',
    });
    setValidationError(null);
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
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Data Inizio</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleDateChange('start_date', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_date">Data Fine</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleDateChange('end_date', e.target.value)}
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

          <Button 
            type="submit" 
            disabled={isCreating || !!validationError} 
            className="w-full"
          >
            {isCreating ? 'Creando...' : 'Crea Trasferta'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
