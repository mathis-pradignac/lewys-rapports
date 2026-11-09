// Utilitaires communs aux fonctions serveur (stockage Netlify Blobs + code d'accès)
export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const envGet = (k) => (globalThis.Netlify?.env?.get?.(k)) ?? process.env[k];

// Si la variable d'environnement ACCESS_CODE est définie sur Netlify, chaque appel doit
// présenter ce code (en-tête x-access-code). Sans variable, l'accès est libre.
export function authorized(req) {
  const code = envGet("ACCESS_CODE");
  if (!code) return true;
  return (req.headers.get("x-access-code") || "") === code;
}
export const isProtected = () => !!envGet("ACCESS_CODE");

export const validId = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(id);
