
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  initialFirstName: string;
  initialLastName: string;
  onSuccess: (newFirst: string, newLast: string) => void;
}

export default function EditProfileDialog({
  open,
  onOpenChange,
  profileId,
  initialFirstName,
  initialLastName,
  onSuccess,
}: EditProfileDialogProps) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ first_name: firstName, last_name: lastName })
        .eq("id", profileId);
      if (error) throw error;
      toast({ title: "Dati dipendente aggiornati!" });
      onSuccess(firstName, lastName);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Errore aggiornamento", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Resetta i dati quando si riapre la modale
  // (evita che rimangano i vecchi valori tra una richiesta e l'altra)
  React.useEffect(() => {
    if (open) {
      setFirstName(initialFirstName);
      setLastName(initialLastName);
    }
  }, [open, initialFirstName, initialLastName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifica nome dipendente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Nome</label>
            <Input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Cognome</label>
            <Input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="space-x-2 flex-row-reverse justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvataggio..." : "Salva"}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">Annulla</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
