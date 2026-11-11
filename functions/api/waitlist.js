// Liste d'attente Eve Marly : enregistre les e-mails dans le KV "WAITLIST" de Cloudflare.
// Export : GET /api/waitlist?key=VOTRE_CLE (variable d'environnement EXPORT_KEY) renvoie un CSV.
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8' }
});

export async function onRequestPost({ request, env }) {
  if (!env.WAITLIST) return json({ error: "La liste d'attente n'est pas encore activée. Écrivez-nous à contact@evemarly.com." }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json({ error: 'Adresse e-mail invalide.' }, 400);
  const key = 'email:' + email;
  if (!(await env.WAITLIST.get(key))) {
    await env.WAITLIST.put(key, JSON.stringify({
      email, date: new Date().toISOString(),
      source: String(body.source || '').slice(0, 200),
      country: request.cf && request.cf.country || ''
    }));
  }
  return json({ ok: true });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!env.EXPORT_KEY || url.searchParams.get('key') !== env.EXPORT_KEY) return json({ error: 'Non autorisé.' }, 401);
  if (!env.WAITLIST) return json({ error: 'KV non configuré.' }, 503);
  let rows = ['email,date,source,pays'], cursor;
  do {
    const list = await env.WAITLIST.list({ prefix: 'email:', cursor });
    for (const k of list.keys) {
      const v = JSON.parse(await env.WAITLIST.get(k.name) || '{}');
      rows.push([v.email, v.date, v.source, v.country].map(x => '"' + String(x || '').replace(/"/g, '""') + '"').join(','));
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  return new Response(rows.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="liste-attente-evemarly.csv"' } });
}
