
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Plus, Edit2, Trash2, CalendarDays } from 'lucide-react';
import { useCompanyHolidays, CreateHolidayData } from '@/hooks/useCompanyHolidays';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function AdminHolidaysManagement() {
  const {
    holidays,
    isLoading,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    isCreating,
    isUpdating,
    isDeleting
  } = useCompanyHolidays();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateHolidayData>({
    date: '',
    name: '',
    description: '',
    is_recurring: false
  });

  const resetForm = () => {
    setFormData({
      date: '',
      name: '',
      description: '',
      is_recurring: false
    });
    setEditingHoliday(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingHoliday) {
      updateHoliday({ id: editingHoliday, updates: formData });
    } else {
      createHoliday(formData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (holiday: any) => {
    setFormData({
      date: holiday.date,
      name: holiday.name,
      description: holiday.description || '',
      is_recurring: holiday.is_recurring
    });
    setEditingHoliday(holiday.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteHoliday(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Calendar className="h-8 w-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Caricamento giorni festivi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestione Giorni Festivi</h2>
          <p className="text-muted-foreground">
            Configura i giorni festivi aziendali per bloccare automaticamente le operazioni
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Festività
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingHoliday ? 'Modifica Festività' : 'Aggiungi Festività'}
              </DialogTitle>
              <DialogDescription>
                {editingHoliday 
                  ? 'Modifica i dettagli della festività selezionata'
                  : 'Configura una nuova festività aziendale'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="name">Nome Festività *</Label>
                <Input
                  id="name"
                  placeholder="es. Natale, Capodanno, Festa della Repubblica..."
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  placeholder="Dettagli aggiuntivi sulla festività..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, is_recurring: checked as boolean }))
                  }
                />
                <Label htmlFor="recurring" className="text-sm">
                  Festività ricorrente (si ripete ogni anno)
                </Label>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={isCreating || isUpdating}
                >
                  {editingHoliday ? 'Aggiorna' : 'Aggiungi'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista giorni festivi */}
      <div className="grid gap-4">
        {holidays.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nessuna festività configurata</h3>
              <p className="text-muted-foreground mb-4">
                Inizia aggiungendo i giorni festivi aziendali
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Prima Festività
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          holidays.map((holiday) => (
            <Card key={holiday.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-medium">{holiday.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(holiday.date), 'EEEE, d MMMM yyyy', { locale: it })}
                          {holiday.is_recurring && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              Ricorrente
                            </span>
                          )}
                        </p>
                        {holiday.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {holiday.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(holiday)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Elimina Festività</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sei sicuro di voler eliminare "{holiday.name}"?
                            Questa azione non può essere annullata.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(holiday.id)}
                            disabled={isDeleting}
                          >
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {holidays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Riepilogo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{holidays.length}</div>
                <div className="text-sm text-muted-foreground">Totale Festività</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {holidays.filter(h => h.is_recurring).length}
                </div>
                <div className="text-sm text-muted-foreground">Ricorrenti</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {holidays.filter(h => new Date(h.date) > new Date()).length}
                </div>
                <div className="text-sm text-muted-foreground">Future</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {holidays.filter(h => new Date(h.date).getFullYear() === new Date().getFullYear()).length}
                </div>
                <div className="text-sm text-muted-foreground">Quest'Anno</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
