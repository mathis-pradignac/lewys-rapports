import { getStore } from "@netlify/blobs";
import { json, authorized, isProtected, validId } from "../lib/shared.mjs";

// Un rapport = deux objets : "meta/<id>" (léger, pour la liste) et "entry/<id>" (complet, avec l'aperçu HTML)
const META_EXCLUDED = ["snapshot", "editedTexts", "rowConfig"];
const pickMeta = (e) => Object.fromEntries(Object.entries(e).filter(([k]) => !META_EXCLUDED.includes(k)));
const MAX_BYTES = 5 * 1024 * 1024;

export default async (req) => {
  if (!authorized(req)) return json({ error: "Code d'accès invalide" }, 401);
  const url = new URL(req.url);
  if (url.pathname.endsWith("/ping")) return json({ ok: true, protected: isProtected() });

  const store = getStore({ name: "lewys-history", consistency: "strong" });
  const id = url.searchParams.get("id");

  if (req.method === "GET") {
    if (id) {
      if (!validId(id)) return json({ error: "id invalide" }, 400);
      const entry = await store.get("entry/" + id, { type: "json" });
      return entry ? json(entry) : json({ error: "Rapport introuvable" }, 404);
    }
    const { blobs } = await store.list({ prefix: "meta/" });
    const metas = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
    return json(metas.filter(Boolean));
  }

  if (req.method === "POST") {
    const raw = await req.text();
    if (raw.length > MAX_BYTES) return json({ error: "Rapport trop volumineux" }, 413);
    let entry;
    try { entry = JSON.parse(raw); } catch { return json({ error: "JSON invalide" }, 400); }
    if (!entry || !validId(entry.id) || typeof entry.hotelName !== "string" || !entry.hotelName.trim())
      return json({ error: "Rapport incomplet (id / hôtel)" }, 400);
    const now = new Date().toISOString();
    entry.updatedAt = now;
    entry.savedAt = entry.savedAt || now;
    await store.setJSON("entry/" + entry.id, entry);
    const meta = pickMeta(entry);
    await store.setJSON("meta/" + entry.id, meta);
    return json(meta);
  }

  if (req.method === "DELETE") {
    if (!validId(id)) return json({ error: "id invalide" }, 400);
    await store.delete("entry/" + id);
    await store.delete("meta/" + id);
    return json({ ok: true });
  }

  return json({ error: "Méthode non autorisée" }, 405);
};

export const config = { path: ["/api/history", "/api/ping"] };
