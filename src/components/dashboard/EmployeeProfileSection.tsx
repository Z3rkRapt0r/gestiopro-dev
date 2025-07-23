
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeWorkSchedule } from '@/hooks/useEmployeeWorkSchedule';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useParams } from "react-router-dom";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const EmployeeProfileSection = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [editPersonal, setEditPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });
  useEffect(() => {
    if (!id) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setPersonalForm({
          first_name: data?.first_name || '',
          last_name: data?.last_name || '',
          email: data?.email || '',
        });
      });
  }, [id]);

  const { workSchedule: employeeWorkSchedule, isLoading, upsertWorkSchedule, isUpdating } = useEmployeeWorkSchedule(id);
  const { workSchedule: companyWorkSchedule } = useWorkSchedules();
  const workSchedule = useMemo(() => {
    if (employeeWorkSchedule) return employeeWorkSchedule;
    if (companyWorkSchedule) {
      return {
        start_time: companyWorkSchedule.start_time,
        end_time: companyWorkSchedule.end_time,
        work_days: Object.entries(companyWorkSchedule)
          .filter(([k, v]) => ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].includes(k) && v)
          .map(([k]) => k),
      };
    }
    return null;
  }, [employeeWorkSchedule, companyWorkSchedule]);

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    work_days: workSchedule?.work_days || [],
    start_time: workSchedule?.start_time || '',
    end_time: workSchedule?.end_time || '',
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

  // Aggiorna formData quando cambia workSchedule SOLO se i dati sono diversi
  useEffect(() => {
    if (
      workSchedule &&
      (
        formData.start_time !== workSchedule.start_time ||
        formData.end_time !== workSchedule.end_time ||
        JSON.stringify(formData.work_days) !== JSON.stringify(workSchedule.work_days)
      )
    ) {
      setFormData({
        work_days: workSchedule.work_days || [],
        start_time: workSchedule.start_time || '',
        end_time: workSchedule.end_time || '',
      });
    }
  }, [workSchedule]);

  // Aggiorna personalForm solo se i dati sono diversi
  useEffect(() => {
    if (
      profile &&
      (
        personalForm.first_name !== (profile.first_name || '') ||
        personalForm.last_name !== (profile.last_name || '') ||
        personalForm.email !== (profile.email || '')
      )
    ) {
      setPersonalForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
      });
    }
  }, [profile]);

  // Salva dati personali su auth e profiles
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !profile.id || !user) return;
    try {
      const updateData = {
        displayname: `${personalForm.first_name} ${personalForm.last_name}`,
        first_name: personalForm.first_name,
        last_name: personalForm.last_name
      };
      let authError = null;
      // Aggiorna email SOLO se è cambiata
      if (personalForm.email !== user.email) {
        const { error } = await supabase.auth.updateUser({
          email: personalForm.email,
          data: updateData
        });
        authError = error;
      } else {
        const { error } = await supabase.auth.updateUser({
          data: updateData
        });
        authError = error;
      }
      if (authError) {
        toast({ title: 'Errore email', description: authError.message, variant: 'destructive' });
        return;
      }
      // Aggiorna su profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: personalForm.first_name,
          last_name: personalForm.last_name,
          email: personalForm.email,
        })
        .eq('id', profile.id);
      if (profileError) {
        toast({ title: 'Errore profilo', description: profileError.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Profilo aggiornato!' });
      setEditPersonal(false);
      setProfile({ ...profile, ...personalForm });
    } catch (err: any) {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
    }
  };

  // Determina se l'utente autenticato è admin
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-4 sm:p-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">Profilo Personale</h2>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Informazioni Personali</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="bg-blue-100 p-4 rounded-full flex items-center justify-center">
              <User className="h-14 w-14 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-1">
                <h3 className="text-xl font-semibold text-gray-900 truncate">
                  {profile?.first_name} {profile?.last_name}
                </h3>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium mt-1 sm:mt-0">{profile?.role === 'admin' ? 'Amministratore' : 'Dipendente'}</span>
              </div>
              <p className="text-gray-600 text-sm truncate">{profile?.email}</p>
            </div>
          </div>
          {user && user.id === profile?.id && (
            editPersonal ? (
              <form className="space-y-4" onSubmit={handleSavePersonal}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome</label>
                    <Input value={personalForm.first_name} onChange={e => setPersonalForm(f => ({ ...f, first_name: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cognome</label>
                    <Input value={personalForm.last_name} onChange={e => setPersonalForm(f => ({ ...f, last_name: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input value={personalForm.email} onChange={e => setPersonalForm(f => ({ ...f, email: e.target.value }))} required type="email" />
                  </div>
                </div>
                <div className="flex gap-2 mt-2 justify-end">
                  <Button type="submit">Salva</Button>
                  <Button type="button" variant="outline" onClick={() => setEditPersonal(false)}>Annulla</Button>
                </div>
              </form>
            ) : (
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setEditPersonal(true)} className="mt-2">Modifica dati personali</Button>
              </div>
            )
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Dipartimento</label>
              <p className="mt-1 text-sm text-gray-900">{profile?.department || 'Non specificato'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Codice Dipendente</label>
              <p className="mt-1 text-sm text-gray-900">{profile?.employee_code || 'Non assegnato'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data Assunzione</label>
              <p className="mt-1 text-sm text-gray-900">
                {profile?.hire_date ? new Date(profile.hire_date).toLocaleDateString('it-IT') : 'Non specificata'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Sezione Orari e Giorni di Lavoro */}
      {isAdmin ? (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Orari e Giorni di Lavoro Personalizzati</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-muted-foreground">Caricamento orari di lavoro...</div>
            ) : editMode ? (
              <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSave(); }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Orario Inizio</label>
                    <Input type="time" value={formData.start_time} onChange={e => setFormData(f => ({ ...f, start_time: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Orario Fine</label>
                    <Input type="time" value={formData.end_time} onChange={e => setFormData(f => ({ ...f, end_time: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Giorni Lavorativi</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                <div className="flex gap-2 justify-end">
                  <Button type="submit" disabled={isUpdating}>{isUpdating ? 'Salvando...' : 'Salva'}</Button>
                  <Button type="button" variant="outline" onClick={() => setEditMode(false)}>Annulla</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                <div><strong>Orario:</strong> {workSchedule?.start_time || '--:--'} - {workSchedule?.end_time || '--:--'}</div>
                <div><strong>Giorni:</strong> {(workSchedule?.work_days || []).map(d => dayLabels[d as keyof typeof dayLabels]).join(', ')}</div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setEditMode(true)} className="mt-2">Modifica</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-6 mt-8">
          <div className="space-y-2">
            <div className="text-base font-semibold text-gray-900">Orari e Giorni di Lavoro</div>
            <div><strong>Orario:</strong> {workSchedule?.start_time || '--:--'} - {workSchedule?.end_time || '--:--'}</div>
            <div><strong>Giorni:</strong> {(workSchedule?.work_days || []).map(d => dayLabels[d as keyof typeof dayLabels]).join(', ')}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfileSection;
