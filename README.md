# Eve Marly — evemarly.com

Site de la maison de lingerie de luxe Eve Marly.

- `src/` : le site publié (Cloudflare Pages, dossier de sortie `src`)
- `src/film/` : le film au scroll (images extraites des 5 clips)
- `build/` : générateur des pages (`python3 build/build.py`), articles dans `build/articles.py`
- `functions/api/waitlist.js` : liste d'attente (KV Cloudflare `WAITLIST`, export CSV avec `EXPORT_KEY`)

Made with love by Aladin.
