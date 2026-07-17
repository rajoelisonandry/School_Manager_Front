"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, FileImage, Loader2, X, AlertCircle } from "lucide-react";
import { backendFileUrl } from "@/lib/backend/public-url";

interface DocumentUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  uploadAction: (formData: FormData) => Promise<{ url: string }>;
}

export function DocumentUploadField({
  label,
  value,
  onChange,
  uploadAction,
}: DocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadAction(formData);
      onChange(result.url);
    } catch {
      setError("Échec de l'envoi du fichier");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onChange("");
    setError("");
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {value ? (
        <div className="flex items-center gap-3 rounded-md border border-input p-2">
          <a
            href={backendFileUrl(value) ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <img
              src={backendFileUrl(value) ?? undefined}
              alt={label}
              className="h-12 w-12 rounded object-cover"
            />
          </a>
          <span className="flex-1 text-sm text-muted-foreground truncate">
            Fichier envoyé
          </span>
          <Button type="button" variant="ghost" size="icon" onClick={handleRemove}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2 text-muted-foreground"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {isUploading ? "Envoi en cours..." : "Prendre une photo ou choisir un fichier"}
          <FileImage className="h-4 w-4 ml-auto" />
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
