import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

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
  title: "Au Bel Enfant - Système de Gestion d'École",
  description: "Syst ème de gestion scolaire complet",
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
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
