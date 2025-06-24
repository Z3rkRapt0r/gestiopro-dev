
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Users } from "lucide-react";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

type UploadTarget = "self" | "specific_user" | "all_employees";

interface DocumentRecipientSelectorProps {
  isAdmin: boolean;
  uploadTarget: UploadTarget;
  setUploadTarget: (target: UploadTarget) => void;
  allProfiles: Profile[];
  targetUserId?: string;
  selectedUserId: string;
  setSelectedUserId: (id: string) => void;
}

const DocumentRecipientSelector: React.FC<DocumentRecipientSelectorProps> = ({
  isAdmin,
  uploadTarget,
  setUploadTarget,
  allProfiles,
  targetUserId,
  selectedUserId,
  setSelectedUserId,
}) => {
  // Don't show recipient selector for non-admin users as documents always go to admins
  if (!isAdmin) return null;

  return (
    <>
      {!targetUserId && (
        <div className="space-y-2">
          <Label htmlFor="uploadTarget">Destinatario del documento</Label>
          <Select value={uploadTarget} onValueChange={(value) => setUploadTarget(value as UploadTarget)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona destinatario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="specific_user">
                <User className="inline mr-2 h-4 w-4" /> Utente Specifico
              </SelectItem>
              <SelectItem value="all_employees">
                <Users className="inline mr-2 h-4 w-4" /> Tutti i Dipendenti (Documento Aziendale)
              </SelectItem>
              <SelectItem value="self">
                <User className="inline mr-2 h-4 w-4" /> Personale (per me Admin)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {uploadTarget === "specific_user" && (
        <div className="space-y-2">
          <Label htmlFor="specificUser">Seleziona Utente Specifico</Label>
          {targetUserId ? (
            <Input
              value={
                allProfiles.find((p) => p.id === targetUserId)
                  ? `${allProfiles.find((p) => p.id === targetUserId)?.first_name || ""} ${allProfiles.find((p) => p.id === targetUserId)?.last_name || ""} (${allProfiles.find((p) => p.id === targetUserId)?.email || ""})`
                  : targetUserId
              }
              readOnly
              disabled
            />
          ) : (
            <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un utente" />
              </SelectTrigger>
              <SelectContent>
                {allProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} ({p.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </>
  );
};

export default DocumentRecipientSelector;
