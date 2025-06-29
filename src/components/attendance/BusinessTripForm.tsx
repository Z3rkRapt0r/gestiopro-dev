
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plane, AlertCircle } from 'lucide-react';
import { useBusinessTrips } from '@/hooks/useBusinessTrips';
import { useAuth } from '@/hooks/useAuth';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useWorkingDaysTracking } from '@/hooks/useWorkingDaysTracking';
import { useBusinessTripValidation } from '@/hooks/useBusinessTripValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

export default function BusinessTripForm() {
  const { createTrip, isCreating } = useBusinessTrips();
  const { profile } = useAuth();
  const { employees } = useActiveEmployees();
  const { isValidDateForEmployee } = useWorkingDaysTracking();
  const { validateTripConflicts } = useBusinessTripValidation();
  
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    destination: '',
    reason: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const validateDates = async (startDate: string, endDate: string) => {
    if (!startDate || !profile?.id || !employees) return true;

    // Valida data di inizio
    const startValidation = isValidDateForEmployee(profile.id, startDate, employees);
    if (!startValidation.isValid) {
      setValidationError(startValidation.message || 'Data di inizio non valida');
      return false;
    }

    // Valida data di fine se presente
    if (endDate) {
      const endValidation = isValidDateForEmployee(profile.id, endDate, employees);
      if (!endValidation.isValid) {
        setValidationError(endValidation.message?.replace('la data selezionata', 'la data di fine') || 'Data di fine non valida');
        return false;
      }

      // Controllo conflitti COMPLETI con tutte le validazioni
      try {
        console.log('🔍 Inizio controllo conflitti completi trasferta');
        const conflictResult = await validateTripConflicts(profile.id, startDate, endDate);
        if (conflictResult.hasConflict) {
          setConflictError(conflictResult.message || 'Conflitto rilevato con evento esistente');
          setValidationError(null);
          return false;
        }
      } catch (error) {
        console.error('Errore validazione conflitti trasferta:', error);
        setConflictError('Errore durante la validazione. Riprova.');
        return false;
      }
    }

    setValidationError(null);
    setConflictError(null);
    return true;
  };

  const handleDateChange = async (field: 'start_date' | 'end_date', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    const startDate = field === 'start_date' ? value : formData.start_date;
    const endDate = field === 'end_date' ? value : formData.end_date;
    
    // Solo se abbiamo entrambe le date, facciamo la validazione completa
    if (startDate && endDate) {
      await validateDates(startDate, endDate);
    } else if (startDate && field === 'start_date') {
      // Validazione base solo per data di inizio
      const startValidation = isValidDateForEmployee(profile?.id || '', startDate, employees || []);
      if (!startValidation.isValid) {
        setValidationError(startValidation.message || 'Data di inizio non valida');
      } else {
        setValidationError(null);
        setConflictError(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Controllo finale completo prima dell'invio
    if (formData.start_date && formData.end_date && profile?.id) {
      console.log('🔐 Controllo finale conflitti trasferta prima dell\'invio');
      
      try {
        const finalCheck = await validateTripConflicts(profile.id, formData.start_date, formData.end_date);
        if (finalCheck.hasConflict) {
          setConflictError(finalCheck.message || 'Conflitto rilevato - creazione trasferta non consentita');
          return;
        }
      } catch (error) {
        console.error('Errore controllo finale trasferta:', error);
        setConflictError('Errore durante il controllo finale. Riprova.');
        return;
      }
    }
    
    // Verifica finale della validazione base
    const isValid = await validateDates(formData.start_date, formData.end_date);
    if (!isValid) {
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
    setConflictError(null);
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
          {/* Errori di conflitto con priorità visiva */}
          {conflictError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{conflictError}</AlertDescription>
            </Alert>
          )}

          {/* Errori di validazione di base */}
          {validationError && !conflictError && (
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
                min={formData.start_date}
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
            disabled={isCreating || !!validationError || !!conflictError} 
            className="w-full"
          >
            {isCreating ? 'Creando...' : 'Crea Trasferta'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
