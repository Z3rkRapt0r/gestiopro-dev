
import { Button } from "@/components/ui/button";
import { Image } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import React, { useRef } from "react";

interface Props {
  logoUrl: string | null;
  loading: boolean;
  initialLoading: boolean;
  setLogoUploadFile: (file: File | null) => void;
  onLogoUpload: () => void;
  logoUploadFile: File | null;
}

export const GlobalEmailLogoUploader: React.FC<Props> = ({
  logoUrl,
  loading,
  initialLoading,
  setLogoUploadFile,
  onLogoUpload,
  logoUploadFile,
}) => {
  const inputLogoRef = useRef<HTMLInputElement>(null);
  return (
    <div className="w-full md:w-1/2">
      <Label>Logo aziendale:</Label>
      <div className="flex items-center gap-2 mt-1">
        <Button
          size="icon"
          variant="outline"
          onClick={() => inputLogoRef.current?.click()}
          type="button"
          title="Carica logo"
          disabled={loading || initialLoading}
        >
          <Image />
        </Button>
        <Input
          ref={inputLogoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            if (e.target.files?.[0]) setLogoUploadFile(e.target.files[0]);
          }}
          disabled={loading || initialLoading}
        />
        <Button
          onClick={onLogoUpload}
          variant="secondary"
          disabled={loading || initialLoading || !logoUploadFile}
          type="button"
        >
          Carica Logo
        </Button>
        {logoUrl && (
          <img src={logoUrl} alt="logo email" className="h-8 ml-2 rounded shadow" />
        )}
      </div>
    </div>
  );
};
