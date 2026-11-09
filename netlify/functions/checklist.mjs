import { getStore } from "@netlify/blobs";
import { json, authorized } from "../lib/shared.mjs";

// Coches manuelles de la checklist, une liste par mois calendaire (clé AAAA-MM) :
// un nouveau mois = une nouvelle liste vide. Les coches automatiques viennent de l'historique.
export default async (req) => {
  if (!authorized(req)) return json({ error: "Code d'accès invalide" }, 401);
  const month = new URL(req.url).searchParams.get("month") || "";
  if (!/^\d{4}-\d{2}$/.test(month)) return json({ error: "Mois invalide (AAAA-MM)" }, 400);
  const store = getStore({ name: "lewys-checklist", consistency: "strong" });
  const key = "month/" + month;
  if (req.method === "GET") return json((await store.get(key, { type: "json" })) || {});
  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "JSON invalide" }, 400); }
    const hotel = String(body?.hotel || "").trim().slice(0, 120);
    if (!hotel) return json({ error: "Hôtel manquant" }, 400);
    const cur = (await store.get(key, { type: "json" })) || {};
    if (body.done) cur[hotel] = { by: String(body.by || "").slice(0, 120), at: new Date().toISOString() };
    else delete cur[hotel];
    await store.setJSON(key, cur);
    return json(cur);
  }
  return json({ error: "Méthode non autorisée" }, 405);
};
export const config = { path: "/api/checklist" };
