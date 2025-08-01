import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { useCompanyHolidays } from '@/hooks/useCompanyHolidays';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface HolidayForm {
  name: string;
  date: string;
  description: string;
  is_recurring: boolean;
}

const ITALIAN_HOLIDAYS = [
  { name: 'Capodanno', date: '01-01', description: 'Primo giorno dell\'anno' },
  { name: 'Epifania', date: '01-06', description: 'Befana' },
  { name: 'Festa della Liberazione', date: '04-25', description: '25 Aprile' },
  { name: 'Festa del Lavoro', date: '05-01', description: '1° Maggio' },
  { name: 'Festa della Repubblica', date: '06-02', description: '2 Giugno' },
  { name: 'Ferragosto', date: '08-15', description: 'Assunzione di Maria' },
  { name: 'Ognissanti', date: '11-01', description: 'Festa di Tutti i Santi' },
  { name: 'Immacolata Concezione', date: '12-08', description: 'Immacolata' },
  { name: 'Natale', date: '12-25', description: 'Natività di Gesù' },
  { name: 'Santo Stefano', date: '12-26', description: 'Primo giorno dopo Natale' }
];

const AdminHolidaysSection = () => {
  const { holidays, createHoliday, updateHoliday, deleteHoliday, isLoading } = useCompanyHolidays();
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<any>(null);
  const [form, setForm] = useState<HolidayForm>({
    name: '',
    date: '',
    description: '',
    is_recurring: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.date) {
      toast({
        title: "Errore",
        description: "Nome e data sono obbligatori",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, form);
        toast({
          title: "Successo",
          description: "Festività aggiornata con successo"
        });
      } else {
        await createHoliday(form);
        toast({
          title: "Successo",
          description: "Festività aggiunta con successo"
        });
      }
      
      resetForm();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il salvataggio della festività",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (holiday: any) => {
    setEditingHoliday(holiday);
    setForm({
      name: holiday.name,
      date: format(new Date(holiday.date), 'yyyy-MM-dd'),
      description: holiday.description || '',
      is_recurring: holiday.is_recurring
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa festività?')) {
      try {
        await deleteHoliday(id);
        toast({
          title: "Successo",
          description: "Festività eliminata con successo"
        });
      } catch (error) {
        toast({
          title: "Errore",
          description: "Errore durante l'eliminazione della festività",
          variant: "destructive"
        });
      }
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      date: '',
      description: '',
      is_recurring: false
    });
    setShowForm(false);
    setEditingHoliday(null);
  };

  const addItalianHoliday = (holiday: typeof ITALIAN_HOLIDAYS[0]) => {
    const currentYear = new Date().getFullYear();
    const fullDate = `${currentYear}-${holiday.date}`;
    
    setForm({
      name: holiday.name,
      date: fullDate,
      description: holiday.description,
      is_recurring: true
    });
    setShowForm(true);
  };

  const addAllItalianHolidays = async () => {
    try {
      for (const holiday of ITALIAN_HOLIDAYS) {
        const currentYear = new Date().getFullYear();
        const fullDate = `${currentYear}-${holiday.date}`;
        
        await createHoliday({
          name: holiday.name,
          date: fullDate,
          description: holiday.description,
          is_recurring: true
        });
      }
      
      toast({
        title: "Successo",
        description: "Tutte le festività italiane sono state aggiunte"
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante l'aggiunta delle festività italiane",
        variant: "destructive"
      });
    }
  };

  const sortedHolidays = holidays?.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestione Festività</h2>
          <p className="text-muted-foreground">
            Gestisci le festività aziendali e nazionali
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Aggiungi Festività
          </Button>
          <Button 
            onClick={addAllItalianHolidays}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Calendar size={16} />
            Aggiungi Festività Italiane
          </Button>
          

        </div>
      </div>

      {/* Form per aggiungere/modificare festività */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} />
              {editingHoliday ? 'Modifica Festività' : 'Nuova Festività'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome Festività *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Es. Natale"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrizione opzionale della festività"
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="recurring"
                  checked={form.is_recurring}
                  onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_recurring: checked }))}
                />
                <Label htmlFor="recurring">Festività ricorrente (si ripete ogni anno)</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  <Save size={16} className="mr-2" />
                  {editingHoliday ? 'Aggiorna' : 'Salva'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X size={16} className="mr-2" />
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Suggerimenti festività italiane */}
      {!showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Festività Nazionali Italiane</CardTitle>
            <p className="text-sm text-muted-foreground">
              Clicca su una festività per aggiungerla rapidamente
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {ITALIAN_HOLIDAYS.map((holiday, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => addItalianHoliday(holiday)}
                  className="h-auto p-3 flex flex-col items-start text-left"
                >
                  <span className="font-medium text-xs">{holiday.name}</span>
                  <span className="text-xs text-muted-foreground">{holiday.date}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista festività esistenti */}
      <Card>
        <CardHeader>
          <CardTitle>Festività Configurate</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p>Caricamento festività...</p>
            </div>
          ) : sortedHolidays.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nessuna festività configurata</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedHolidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium">{holiday.name}</h3>
                      {holiday.is_recurring && (
                        <Badge variant="secondary" className="text-xs">
                          Ricorrente
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(holiday.date), 'dd MMMM yyyy', { locale: it })}
                    </p>
                    {holiday.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {holiday.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(holiday)}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(holiday.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminHolidaysSection;