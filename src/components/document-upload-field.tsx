"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Crop, FileImage, Loader2, X, AlertCircle } from "lucide-react";
import { backendFileUrl } from "@/lib/backend/public-url";
import { PhotoCropDialog } from "@/components/photo-crop-dialog";

interface DocumentUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  uploadAction: (formData: FormData) => Promise<{ url: string }>;
  /** Largeur / hauteur de la boîte photo dans les PDF (ex: 0.78 pour le carnet de
   * correspondance). Quand elle est fournie, l'utilisateur passe par un écran de
   * recadrage avant l'envoi, pour voir et ajuster le rendu final. Réservé aux
   * champs "photo" (pas aux documents PDF type certificat). */
  cropAspectRatio?: number;
}

export function DocumentUploadField({
  label,
  value,
  onChange,
  uploadAction,
  cropAspectRatio,
}: DocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [cropSource, setCropSource] = useState<string | null>(null);

  const upload = async (file: File) => {
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
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (cropAspectRatio && file.type.startsWith("image/")) {
      // Passe par l'écran de recadrage plutôt qu'un envoi direct.
      setCropSource(URL.createObjectURL(file));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    await upload(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRecrop = () => {
    // Passe par notre proxy serveur (mêmes raisons que pour l'export PDF) : sans
    // ça, l'image cross-origin "tache" le canvas et empêche l'extraction du recadrage.
    const url = backendFileUrl(value);
    if (!url) return;
    setCropSource(`/api/photo-proxy?url=${encodeURIComponent(url)}`);
  };

  const closeCropDialog = () => {
    if (cropSource?.startsWith("blob:")) {
      URL.revokeObjectURL(cropSource);
    }
    setCropSource(null);
  };

  const handleCropConfirm = async (blob: Blob) => {
    closeCropDialog();
    await upload(new File([blob], "photo.jpg", { type: "image/jpeg" }));
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
              className={`h-12 rounded object-cover ${cropAspectRatio ? "w-14" : "w-12"}`}
            />
          </a>
          <span className="flex-1 text-sm text-muted-foreground truncate">
            Fichier envoyé
          </span>
          {cropAspectRatio && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRecrop}
              title="Recadrer"
            >
              <Crop className="h-4 w-4" />
            </Button>
          )}
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

      {cropAspectRatio && cropSource && (
        <PhotoCropDialog
          open
          imageSrc={cropSource}
          aspectRatio={cropAspectRatio}
          onCancel={closeCropDialog}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
