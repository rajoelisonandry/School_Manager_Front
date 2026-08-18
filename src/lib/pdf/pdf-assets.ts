// Polices Poppins, chargement de photo et QR code, partagés entre les PDF qui ont
// besoin d'une typographie plus moderne que le Helvetica standard de jsPDF et/ou
// d'embarquer la photo d'identité d'un élève (carnet de correspondance, carte
// d'identité scolaire...).
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export const POPPINS = "Poppins";
const POPPINS_FILES: Record<"normal" | "semibold" | "bold", string> = {
  normal: "/fonts/poppins/Poppins-Regular.ttf",
  semibold: "/fonts/poppins/Poppins-SemiBold.ttf",
  bold: "/fonts/poppins/Poppins-Bold.ttf",
};

let poppinsCache: Record<keyof typeof POPPINS_FILES, string> | null = null;

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function loadPoppins() {
  if (poppinsCache) return poppinsCache;
  const entries = Object.entries(POPPINS_FILES) as [keyof typeof POPPINS_FILES, string][];
  const results = await Promise.all(
    entries.map(async ([, url]) => {
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      return arrayBufferToBase64(buffer);
    })
  );
  const cache = {} as Record<keyof typeof POPPINS_FILES, string>;
  entries.forEach(([key], i) => {
    cache[key] = results[i];
  });
  poppinsCache = cache;
  return cache;
}

export async function registerPoppins(doc: jsPDF) {
  const fonts = await loadPoppins();
  doc.addFileToVFS("Poppins-Regular.ttf", fonts.normal);
  doc.addFont("Poppins-Regular.ttf", POPPINS, "normal");
  doc.addFileToVFS("Poppins-SemiBold.ttf", fonts.semibold);
  doc.addFont("Poppins-SemiBold.ttf", POPPINS, "semibold");
  doc.addFileToVFS("Poppins-Bold.ttf", fonts.bold);
  doc.addFont("Poppins-Bold.ttf", POPPINS, "bold");
}

const MIME_TO_FORMAT: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/jpg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WEBP",
};

export async function loadPhoto(
  url: string
): Promise<{ dataUrl: string; format: string; width: number; height: number } | null> {
  try {
    // Passe par notre proxy serveur : le bucket R2 public (et les anciens fichiers
    // locaux) ne renvoient pas d'en-têtes CORS, ce qui bloquerait un fetch() direct
    // depuis le navigateur (contrairement à un simple <img>, qui s'en moque).
    const res = await fetch(`/api/photo-proxy?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const blob = await res.blob();
    const format = MIME_TO_FORMAT[blob.type] ?? "JPEG";

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    const { width, height } = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error("image decode failed"));
        img.src = dataUrl;
      }
    );

    return { dataUrl, format, width, height };
  } catch {
    return null;
  }
}

// Redimensionne (sans déformer) l'image pour qu'elle tienne dans la boîte, centrée.
export function fitContain(imgW: number, imgH: number, boxW: number, boxH: number) {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return { w, h, x: (boxW - w) / 2, y: (boxH - h) / 2 };
}

// Génère un QR code (PNG en data URL) à partir d'un texte, pour l'embarquer dans un
// PDF via doc.addImage(). "M" (15% de correction d'erreur) suffit largement pour du
// texte et reste plus dense/lisible qu'un niveau de correction plus élevé.
export async function generateQrCode(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
