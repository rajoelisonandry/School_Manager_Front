import { NextRequest, NextResponse } from "next/server";

// Le bucket public Cloudflare R2 (pub-xxx.r2.dev) et les anciens fichiers locaux
// servis par le backend ne renvoient pas d'en-têtes CORS : un <img> les affiche
// sans problème, mais un fetch() côté navigateur (nécessaire pour embarquer la
// photo dans un PDF via jsPDF) est bloqué. Ce proxy fait le fetch côté serveur
// (aucune restriction CORS entre serveurs) et retransmet les octets au client.
const ALLOWED_HOST_SUFFIXES = [".r2.dev", ".r2.cloudflarestorage.com"];

function backendHostname(): string | null {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
  try {
    return new URL(base).hostname;
  } catch {
    return null;
  }
}

function isAllowedHost(hostname: string): boolean {
  if (hostname === backendHostname()) return true;
  return ALLOWED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Paramètre url manquant" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return NextResponse.json({ error: "Protocole non autorisé" }, { status: 400 });
  }
  if (!isAllowedHost(parsed.hostname)) {
    return NextResponse.json({ error: "Hôte non autorisé" }, { status: 403 });
  }

  const upstream = await fetch(parsed.toString(), { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Échec de récupération du fichier" },
      { status: upstream.status || 502 }
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  });
}
