import { getStore } from "@netlify/blobs";
import { json, authorized, validId } from "../lib/shared.mjs";

const MAX_PHOTO = 600 * 1024; // la photo est recadrée côté navigateur (~20-40 Ko)

export default async (req) => {
  if (!authorized(req)) return json({ error: "Code d'accès invalide" }, 401);
  const store = getStore({ name: "lewys-profiles", consistency: "strong" });
  const id = new URL(req.url).searchParams.get("id");

  if (req.method === "GET") {
    const { blobs } = await store.list({ prefix: "profile/" });
    const list = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
    return json(list.filter(Boolean));
  }

  if (req.method === "POST") {
    let p;
    try { p = await req.json(); } catch { return json({ error: "JSON invalide" }, 400); }
    const prenom = String(p?.prenom || "").trim().slice(0, 60);
    const nom = String(p?.nom || "").trim().slice(0, 60);
    if (!validId(p?.id) || !prenom || !nom) return json({ error: "Profil incomplet" }, 400);
    let photo = p.photo || null;
    if (photo && (typeof photo !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(photo) || photo.length > MAX_PHOTO))
      return json({ error: "Photo invalide ou trop lourde" }, 400);
    const profile = { id: p.id, prenom, nom, photo, updatedAt: new Date().toISOString() };
    await store.setJSON("profile/" + p.id, profile);
    return json(profile);
  }

  if (req.method === "DELETE") {
    if (!validId(id)) return json({ error: "id invalide" }, 400);
    await store.delete("profile/" + id);
    return json({ ok: true });
  }

  return json({ error: "Méthode non autorisée" }, 405);
};

export const config = { path: "/api/profiles" };
