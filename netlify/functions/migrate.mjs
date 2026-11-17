import { getStore } from "@netlify/blobs";
import { json, authorized, validId } from "../lib/shared.mjs";

// Récupère les données d'un ANCIEN site Netlify du générateur (historique, profils, hôtels, checklist)
// et les copie dans ce site. Le serveur appelle l'ancien site lui-même : pas de blocage navigateur.
//   POST { from, code, action: "list" }        → copie profils / hôtels / checklist, renvoie la liste des rapports
//   POST { from, code, action: "copy", id }    → copie un rapport
const META_EXCLUDED = ["snapshot", "editedTexts", "rowConfig"];
const pickMeta = (e) => Object.fromEntries(Object.entries(e).filter(([k]) => !META_EXCLUDED.includes(k)));

function originOf(raw) {
  let u;
  try { u = new URL(String(raw || "").trim()); } catch { return null; }
  const local = ["localhost", "127.0.0.1"].includes(u.hostname);   // pour les tests sur un poste
  if (u.protocol !== "https:" && !(local && u.protocol === "http:")) return null;
  return u.origin;
}
async function getOld(origin, path, code) {
  const res = await fetch(origin + path, { headers: code ? { "x-access-code": code } : {} });
  const type = res.headers.get("content-type") || "";
  if (res.status === 401) throw new Error("Code d'accès de l'ancien site refusé.");
  if (!res.ok || !type.includes("application/json")) return null;
  return res.json();
}
const monthKey = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");

export default async (req) => {
  if (!authorized(req)) return json({ error: "Code d'accès invalide" }, 401);
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: "JSON invalide" }, 400); }
  const origin = originOf(body?.from);
  if (!origin) return json({ error: "Adresse de l'ancien site invalide (elle doit commencer par https://)." }, 400);
  if (origin === new URL(req.url).origin) return json({ error: "C'est l'adresse de ce site-ci : indiquez celle de l'ancien site." }, 400);
  const code = String(body.code || "").trim();

  try {
    if (body.action === "list") {
      const ping = await getOld(origin, "/api/ping", code);
      if (!ping || !ping.ok) return json({ error: "L'ancien site ne répond pas comme un générateur de rapports Lewys (adresse incorrecte, site supprimé ou fonctions serveur absentes)." }, 502);
      const history = (await getOld(origin, "/api/history", code)) || [];

      let profiles = 0;
      const plist = (await getOld(origin, "/api/profiles", code)) || [];
      const pstore = getStore({ name: "lewys-profiles", consistency: "strong" });
      for (const p of plist) {
        if (!p || !validId(p.id)) continue;
        await pstore.setJSON("profile/" + p.id, p);
        profiles++;
      }

      let hotels = 0;
      const hlist = await getOld(origin, "/api/hotels", code);
      const cstore = getStore({ name: "lewys-config", consistency: "strong" });
      if (Array.isArray(hlist) && hlist.length) {
        const current = (await cstore.get("hotels", { type: "json" })) || [];
        const merged = Array.from(new Set(current.concat(hlist)));
        await cstore.setJSON("hotels", merged);
        hotels = hlist.length;
      }

      let checklists = 0;
      const kstore = getStore({ name: "lewys-checklist", consistency: "strong" });
      const now = new Date();
      for (const d of [now, new Date(now.getFullYear(), now.getMonth() - 1, 1)]) {
        const mk = monthKey(d);
        const old = await getOld(origin, "/api/checklist?month=" + mk, code);
        if (old && typeof old === "object" && Object.keys(old).length) {
          const cur = (await kstore.get("month/" + mk, { type: "json" })) || {};
          await kstore.setJSON("month/" + mk, { ...old, ...cur });
          checklists++;
        }
      }

      const ids = (Array.isArray(history) ? history : []).map((h) => h && h.id).filter(validId);
      return json({ ok: true, ids, profiles, hotels, checklists });
    }

    if (body.action === "copy") {
      if (!validId(body.id)) return json({ error: "id invalide" }, 400);
      const entry = await getOld(origin, "/api/history?id=" + encodeURIComponent(body.id), code);
      if (!entry || !validId(entry.id)) return json({ error: "Rapport introuvable sur l'ancien site" }, 404);
      const hstore = getStore({ name: "lewys-history", consistency: "strong" });
      await hstore.setJSON("entry/" + entry.id, entry);   // même identifiant : relancer la récupération ne crée pas de doublon
      await hstore.setJSON("meta/" + entry.id, pickMeta(entry));
      return json({ ok: true, id: entry.id });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (err) {
    return json({ error: String(err.message || err) }, 502);
  }
};

export const config = { path: "/api/migrate" };
