# Eve Marly — evemarly.com

Site de la maison de lingerie de luxe Eve Marly.

- `src/` : le site publié (Cloudflare Worker `eve-marley`, assets statiques)
- `wrangler.jsonc` + `worker/index.js` : configuration du Worker et API de la liste d'attente
- `src/film/` : le film au scroll (images extraites des 5 clips)
- `build/` : générateur des pages (`python3 build/build.py`), articles dans `build/articles.py`
- Liste d'attente : KV `WAITLIST` (à déclarer dans `wrangler.jsonc`), export CSV via `/api/waitlist?key=EXPORT_KEY`

Made with love by Aladin.
