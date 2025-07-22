
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeWorkSchedule } from '@/hooks/useEmployeeWorkSchedule';
import { useParams } from "react-router-dom";
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const EmployeeProfileSection = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [id]);

  const { workSchedule, isLoading, upsertWorkSchedule, isUpdating } = useEmployeeWorkSchedule(id);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    work_days: workSchedule?.work_days || ['monday','tuesday','wednesday','thursday','friday'],
    start_time: workSchedule?.start_time || '08:00',
    end_time: workSchedule?.end_time || '17:00',
  });
  const dayLabels = {
    monday: 'Lunedì',
    tuesday: 'Martedì',
    wednesday: 'Mercoledì',
    thursday: 'Giovedì',
    friday: 'Venerdì',
    saturday: 'Sabato',
    sunday: 'Domenica',
  };
  const handleSave = () => {
    if (!profile || !profile.id) {
      alert('Impossibile salvare: dati dipendente non disponibili');
      return;
    }
    upsertWorkSchedule({
      employee_id: profile.id,
      work_days: formData.work_days,
      start_time: formData.start_time,
      end_time: formData.end_time,
    });
    setEditMode(false);
  };

  // Aggiorna formData quando cambia workSchedule
  useEffect(() => {
    setFormData({
      work_days: workSchedule?.work_days || ['monday','tuesday','wednesday','thursday','friday'],
      start_time: workSchedule?.start_time || '08:00',
      end_time: workSchedule?.end_time || '17:00',
    });
  }, [workSchedule]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Profilo Personale</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Personali</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {profile?.first_name} {profile?.last_name}
              </h3>
              <p className="text-gray-600">{profile?.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ruolo</label>
              <p className="mt-1 text-sm text-gray-900">Dipendente</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dipartimento</label>
              <p className="mt-1 text-sm text-gray-900">{profile?.department || 'Non specificato'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data Assunzione</label>
              <p className="mt-1 text-sm text-gray-900">
                {profile?.hire_date ? new Date(profile.hire_date).toLocaleDateString('it-IT') : 'Non specificata'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Codice Dipendente</label>
              <p className="mt-1 text-sm text-gray-900">{profile?.employee_code || 'Non assegnato'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Orari e Giorni di Lavoro Personalizzati</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-muted-foreground">Caricamento orari di lavoro...</div>
          ) : editMode ? (
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSave(); }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Orario Inizio</label>
                  <Input type="time" value={formData.start_time} onChange={e => setFormData(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Orario Fine</label>
                  <Input type="time" value={formData.end_time} onChange={e => setFormData(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Giorni Lavorativi</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(dayLabels).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span>{label}</span>
                      <Switch
                        checked={formData.work_days.includes(key)}
                        onCheckedChange={checked => setFormData(f => ({
                          ...f,
                          work_days: checked
                            ? [...f.work_days, key]
                            : f.work_days.filter(d => d !== key)
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={isUpdating}>{isUpdating ? 'Salvando...' : 'Salva'}</Button>
              <Button type="button" variant="outline" onClick={() => setEditMode(false)} className="ml-2">Annulla</Button>
            </form>
          ) : (
            <div className="space-y-2">
              <div><strong>Orario:</strong> {workSchedule?.start_time || '08:00'} - {workSchedule?.end_time || '17:00'}</div>
              <div><strong>Giorni:</strong> {(workSchedule?.work_days || ['monday','tuesday','wednesday','thursday','friday']).map(d => dayLabels[d as keyof typeof dayLabels]).join(', ')}</div>
              <Button size="sm" onClick={() => setEditMode(true)}>Modifica</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeProfileSection;
