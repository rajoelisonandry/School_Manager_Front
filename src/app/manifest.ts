import type { MetadataRoute } from "next";
import { SCHOOL_NAME } from "@/lib/branding";

// Remplace l'ancien public/manifest.json statique : généré dynamiquement pour que
// le nom de l'app PWA suive la config de branding (une école différente par
// déploiement) sans avoir à toucher un fichier statique.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SCHOOL_NAME} - Système de Gestion d'École`,
    short_name: SCHOOL_NAME,
    description: "Système de gestion scolaire complet",
    start_url: "/",
    display: "standalone",
    background_color: "#005993",
    theme_color: "#005993",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
