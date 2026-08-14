import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SCHOOL_NAME } from "@/lib/branding";

const themeInitScript = `
  (function () {
    try {
      var stored = localStorage.getItem('theme');
      var theme = stored === 'light' || stored === 'dark'
        ? stored
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      if (theme === 'dark') document.documentElement.classList.add('dark');
    } catch (e) {}
  })();
`;

const googleSans = localFont({
  src: "../fonts/Google_Sans/GoogleSans-VariableFont_GRAD,opsz,wght.ttf",
  variable: "--font-google-sans",
  weight: "100 900",
});

const googleSansItalic = localFont({
  src: "../fonts/Google_Sans/GoogleSans-Italic-VariableFont_GRAD,opsz,wght.ttf",
  variable: "--font-google-sans-italic",
  weight: "100 900",
  style: "italic",
});

export const metadata: Metadata = {
  title: `${SCHOOL_NAME} - Système de Gestion d'École`,
  description: "Syst ème de gestion scolaire complet",
  // Le manifest PWA est généré dynamiquement par src/app/manifest.ts (branding).
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    // Permet "Ajouter à l'écran d'accueil" sur iPhone : lancement en plein
    // écran (sans barre Safari), avec l'icône ci-dessus au lieu du favicon.
    capable: true,
    statusBarStyle: "black-translucent",
    title: SCHOOL_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: "#005993",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${googleSans.variable} ${googleSansItalic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
