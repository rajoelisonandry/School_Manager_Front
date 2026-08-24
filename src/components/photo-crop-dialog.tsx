"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ZoomIn } from "lucide-react";

interface PhotoCropDialogProps {
  open: boolean;
  imageSrc: string;
  /** Largeur / hauteur de la boîte photo dans les PDF (carnet, carte d'identité...),
   * pour que le cadrage choisi ici corresponde exactement au rendu final. */
  aspectRatio: number;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de charger l'image"));
    image.src = src;
  });
}

// Découpe la zone sélectionnée dans un <canvas> puis l'exporte en JPEG. La taille de
// sortie est plafonnée pour éviter un fichier inutilement lourd sur une photo très
// haute résolution, sans jamais agrandir au-delà de la zone recadrée d'origine.
const MAX_OUTPUT_SIZE = 900;

async function extractCroppedImage(imageSrc: string, cropPixels: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const scale = Math.min(1, MAX_OUTPUT_SIZE / Math.max(cropPixels.width, cropPixels.height));
  const outputW = Math.round(cropPixels.width * scale);
  const outputH = Math.round(cropPixels.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outputW;
  canvas.height = outputH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Le navigateur ne supporte pas le recadrage d'image");

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputW,
    outputH
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Échec de la génération de l'image"))),
      "image/jpeg",
      0.92
    );
  });
}

export function PhotoCropDialog({
  open,
  imageSrc,
  aspectRatio,
  onCancel,
  onConfirm,
}: PhotoCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Le Dialog s'ouvre avec une animation de zoom (95% -> 100%) : monter le Cropper
  // avant la fin de cette animation lui fait mal mesurer son conteneur (bug connu
  // de react-easy-crop dans une modale animée). On attend la fin de l'animation.
  // (Un useEffect au montage plutôt que onOpenChange : ce dernier ne se déclenche
  // pas pour l'ouverture initiale, seulement pour les changements ultérieurs.)
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsReady(false);
    const timer = window.setTimeout(() => setIsReady(true), 220);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) onCancel();
  };

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await extractCroppedImage(imageSrc, croppedAreaPixels);
      onConfirm(blob);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajuster la photo</DialogTitle>
          <DialogDescription>
            Déplacez et zoomez pour cadrer la photo comme elle apparaîtra dans les documents PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-md bg-muted">
          {isReady ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-1">
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Zoom"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing || !croppedAreaPixels}
            className="gap-2"
          >
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            Valider le cadrage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
