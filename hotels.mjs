import { getStore } from "@netlify/blobs";
import { json, authorized } from "../lib/shared.mjs";

// Liste des hôtels suivis (mise à jour à chaque chargement du fichier central) — sert à la checklist
export default async (req) => {
  if (!authorized(req)) return json({ error: "Code d'accès invalide" }, 401);
  const store = getStore({ name: "lewys-config", consistency: "strong" });
  if (req.method === "GET") return json((await store.get("hotels", { type: "json" })) || []);
  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "JSON invalide" }, 400); }
    const list = Array.isArray(body?.hotels)
      ? Array.from(new Set(body.hotels.map((h) => String(h).trim().slice(0, 120)).filter(Boolean))).slice(0, 500)
      : null;
    if (!list) return json({ error: "Liste invalide" }, 400);
    await store.setJSON("hotels", list);
    return json(list);
  }
  return json({ error: "Méthode non autorisée" }, 405);
};
export const config = { path: "/api/hotels" };
