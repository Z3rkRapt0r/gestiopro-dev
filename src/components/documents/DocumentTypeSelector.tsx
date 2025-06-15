
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DocumentTypeSelectorProps {
  value: string;
  onChange: (typeValue: string) => void;
  documentTypes: { value: string; label: string }[];
}

const DocumentTypeSelector: React.FC<DocumentTypeSelectorProps> = ({ value, onChange, documentTypes }) => (
  <div className="space-y-2">
    <Label htmlFor="type">Tipo Documento</Label>
    <Select value={value} onValueChange={onChange} required>
      <SelectTrigger>
        <SelectValue placeholder="Seleziona il tipo di documento" />
      </SelectTrigger>
      <SelectContent>
        {documentTypes.map(type => (
          <SelectItem key={type.value} value={type.value}>
            {type.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default DocumentTypeSelector;
