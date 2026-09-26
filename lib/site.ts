/**
 * Endereço público usado em sitemap, robots e URL canônica. Segue `SITE_URL` quando
 * configurada — a mesma variável que autoriza o retorno do login no Supabase.
 */
export const SITE_URL = (process.env.SITE_URL?.trim() || "https://bdo-carrack-planner.vercel.app").replace(/\/+$/, "");
