# -*- coding: utf-8 -*-
"""Génère le site statique Eve Marly dans ../src (le dossier publié par Cloudflare Pages)."""
import os, json, html, datetime
from articles import ARTICLES

ROOT = os.path.join(os.path.dirname(__file__), '..', 'src')
SITE = 'https://evemarly.com'
BRAND = 'Eve Marly'
EMAIL = 'contact@evemarly.com'
TODAY = datetime.date(2026, 11, 11).isoformat()
FRAMES = len([f for f in os.listdir(os.path.join(ROOT, 'film', 'd')) if f.endswith('.webp')])

SOCIAL = [('Instagram', '#'), ('TikTok', '#'), ('YouTube', '#'), ('Facebook', '#'), ('Snapchat', '#')]
CATS = ['Guides', 'Entretien', 'Matières', 'Savoir-faire', 'Style', 'Cadeaux', 'Féminité']

def e(s): return html.escape(s, quote=True)

def write(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f: f.write(content)

def head(title, desc, path, img='/img/og.jpg', kind='website', extra_ld=None, preload=''):
    url = SITE + path
    ld = [{
        "@context": "https://schema.org", "@type": "Organization", "name": BRAND,
        "url": SITE + "/", "logo": SITE + "/favicon.svg", "email": EMAIL,
        "sameAs": []
    }]
    if extra_ld: ld += extra_ld
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#140d12">
<meta property="og:type" content="{kind}">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}{img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{SITE}{img}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
{preload}<script type="application/ld+json">{json.dumps(ld if len(ld) > 1 else ld[0], ensure_ascii=False)}</script>
</head>
"""

def nav(current=''):
    def a(href, label, key, keep=False):
        cur = ' aria-current="page"' if key == current else ''
        cls = ' class="keep"' if keep else ''
        return f'<li{cls}><a href="{href}"{cur}>{label}</a></li>'
    return f"""<a class="skip" href="#contenu">Aller au contenu</a>
<header class="nav">
  <a class="logo" href="/" aria-label="{BRAND}, accueil"><span class="mono" aria-hidden="true">EM</span><span class="word">{BRAND}</span></a>
  <nav aria-label="Navigation principale"><ul>
    {a('/#collection','Collection','collection')}
    {a('/#maison','La Maison','maison')}
    {a('/journal/','Journal','journal')}
    {a('/#liste',"Liste d'attente",'liste',True)}
  </ul></nav>
</header>
"""

LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'
BOX = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>'
SHIELD = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>'
SWAP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>'

def footer():
    soc = ''.join(f'<a href="{h}" rel="noopener">{n}</a>' for n, h in SOCIAL)
    pay = ''.join(f'<li>{p}</li>' for p in ['CB', 'Visa', 'Mastercard', 'American Express', 'Apple Pay', 'Google Pay'])
    return f"""<footer class="site">
<div class="wrap">
  <div class="f-grid">
    <div>
      <a class="logo" href="/" aria-label="{BRAND}, accueil"><span class="mono" aria-hidden="true">EM</span><span class="word">{BRAND}</span></a>
      <p style="max-width:34ch;margin:18px 0 0">Maison de lingerie de luxe. Dentelle, soie et tulle, en petites séries.</p>
      <div class="social" aria-label="Réseaux sociaux">{soc}</div>
    </div>
    <div><h3>La Maison</h3><ul><li><a href="/#collection">Collection</a></li><li><a href="/#maison">Notre histoire</a></li><li><a href="/#rituel">Le rituel</a></li><li><a href="/#liste">Liste d'attente</a></li></ul></div>
    <div><h3>Journal</h3><ul><li><a href="/journal/">Tous les articles</a></li><li><a href="/journal/comment-choisir-sa-taille-de-soutien-gorge/">Guide des tailles</a></li><li><a href="/journal/entretenir-lingerie-en-soie/">Entretien de la soie</a></li><li><a href="/journal/offrir-de-la-lingerie-guide-cadeau/">Offrir de la lingerie</a></li></ul></div>
    <div><h3>Aide</h3><ul><li><a href="mailto:{EMAIL}">{EMAIL}</a></li><li><a href="/mentions-legales/">Mentions légales</a></li><li><a href="/confidentialite/">Confidentialité</a></li><li><a href="/cgv/">Conditions de vente</a></li></ul></div>
  </div>
  <div class="trust">
    <ul class="pay" aria-label="Moyens de paiement acceptés">{pay}</ul>
    <ul class="secure">
      <li>{LOCK}Paiement 100 % sécurisé</li>
      <li>{SHIELD}Connexion chiffrée HTTPS</li>
      <li>{BOX}Envoi discret</li>
      <li>{SWAP}Échange de taille</li>
    </ul>
  </div>
  <div class="legal">
    <span>© 2026 {BRAND}. Tous droits réservés.</span>
    <span class="love">Made with love by <b>Aladin</b> <span aria-hidden="true">♥</span></span>
  </div>
</div>
</footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
"""

def waitlist(title='Soyez la première à <em>découvrir</em> la collection.'):
    return f"""<section class="sec waitlist" id="liste" aria-labelledby="liste-t">
<div class="wrap inner">
  <div class="eyebrow">Liste d'attente</div>
  <h2 id="liste-t">{title}</h2>
  <p>Accès en avant-première à la prévente et aux pièces en série limitée. Un e-mail de temps en temps, jamais plus.</p>
  <form class="wl" novalidate>
    <label class="sr" for="email-{abs(hash(title))%999}">Adresse e-mail</label>
    <input id="email-{abs(hash(title))%999}" type="email" name="email" placeholder="Votre adresse e-mail" autocomplete="email" required>
    <button type="submit">M'inscrire</button>
  </form>
  <div class="msg" role="status"></div>
  <p class="consent">En vous inscrivant, vous acceptez de recevoir nos e-mails. Désinscription en un clic. Voir notre <a href="/confidentialite/">politique de confidentialité</a>.</p>
</div>
</section>
"""

PRODUCTS = [
    ('Balconnet Aube', 'Dentelle Leavers', '180 €', 'p-balconnet'),
    ('Culotte Aube', 'Dentelle et tulle', '85 €', 'p-culotte'),
    ('String Aube', 'Dentelle et tulle', '75 €', 'p-string'),
    ('Body Minuit', 'Dentelle Leavers', '260 €', 'p-body'),
    ('Nuisette Lune', 'Soie', '290 €', 'p-nuisette'),
    ('Kimono Lune', 'Soie', '390 €', 'p-kimono'),
]

def post_card(a):
    return f"""<a class="post rv" href="/journal/{a['slug']}/" data-cat="{e(a['cat'])}">
  <div class="ph"><img src="/img/{a['img']}.webp" alt="" loading="lazy" width="1100" height="614"></div>
  <span class="cat">{e(a['cat'])} · {a['read']} min</span>
  <h3>{e(a['title'])}</h3>
  <p>{e(a['desc'])}</p>
</a>"""

def home():
    scenes = [
        ('h1', 'Eve Marly', '<em>Un fil.</em> Toute une collection.', 'Maison de lingerie de luxe. Dentelle, soie et tulle, en petites séries.', None),
        ('h2', 'La matière', 'Tout commence par <em>la dentelle.</em>', 'Une dentelle choisie à la main, fine et souple comme une seconde peau.', None),
        ('h2', "L'atelier", 'Chaque geste <em>compte.</em>', 'Une coupe essayée puis réessayée, des finitions que personne ne voit et que l\'on sent pourtant.', None),
        ('h2', 'La collection', 'Pensée <em>pour vous.</em>', 'Peu de modèles, faits pour durer, choisis d\'abord pour soi.', None),
        ('h2', 'Le rituel', 'Le rituel <em>commence.</em>', 'Un coffret, un mot écrit à la main, un envoi discret.', ('/#liste', 'Rejoindre la liste')),
    ]
    sc = ''
    for tag, eb, t, p, cta in scenes:
        btn = f'<a class="btn" href="{cta[0]}">{cta[1]}</a>' if cta else ''
        sc += f'<div class="scene"><div class="eyebrow">{eb}</div><{tag}>{t}</{tag}><p>{p}</p>{btn}</div>\n'
    dots = ''.join(f'<li><button type="button" aria-label="Aller à la scène {i+1}"><i><b></b></i></button></li>' for i in range(5))
    prods = ''.join(f"""<a class="card rv" href="#liste"><div class="ph"><img src="/img/{img}.webp" alt="{e(n)}, visuel provisoire" loading="lazy" width="600" height="800"><span class="tag">Bientôt</span></div><div class="meta"><h3>{e(n)}<small>{e(m)}</small></h3><span class="price">{p}</span></div></a>""" for n, m, p, img in PRODUCTS)
    latest = ''.join(post_card(a) for a in ARTICLES[:3])
    ld = [{"@context": "https://schema.org", "@type": "WebSite", "name": BRAND, "url": SITE + "/", "inLanguage": "fr-FR"}]
    pre = '<link rel="preload" as="image" href="/film/d/001.webp" media="(min-width:760px)">\n<link rel="preload" as="image" href="/film/m/001.webp" media="(max-width:759px)">\n'
    body = f"""<body>
{nav()}
<main id="contenu">
<section class="film" data-frames="{FRAMES}" data-d="/film/d/" data-m="/film/m/" aria-label="Le film Eve Marly">
  <div class="film-stage">
    <canvas aria-hidden="true"></canvas>
    <div class="loader" aria-hidden="true"></div>
    {sc}
    <div class="film-ui"><ol class="dots">{dots}</ol><span class="film-hint" aria-hidden="true">Faites défiler</span></div>
  </div>
</section>

<section class="sec" id="maison" aria-labelledby="maison-t">
  <div class="wrap two">
    <div class="eyebrow" id="maison-t">La Maison</div>
    <p class="lead rv">Eve Marly est née d'une idée simple : la lingerie se choisit d'abord <em>pour soi.</em> Chaque pièce commence par une dentelle choisie à la main et se termine dans un coffret, avec un mot écrit pour vous.</p>
  </div>
</section>

<section class="sec" id="collection" aria-labelledby="coll-t" style="padding-top:0">
  <div class="wrap">
    <div class="coll-head">
      <div><div class="eyebrow">Première collection</div><h2 id="coll-t">Aube, Minuit <em>&amp;</em> Lune</h2></div>
      <p class="note">Visuels provisoires. Les photos des pièces arrivent avec l'ouverture de la boutique.</p>
    </div>
    <div class="grid">{prods}</div>
  </div>
</section>

<section class="sec" aria-labelledby="mat-t">
  <div class="wrap split">
    <img class="rv" src="/img/dentelle.webp" alt="Dentelle noire traversée d'un fil d'or" loading="lazy" width="1100" height="614">
    <div>
      <div class="eyebrow">Les matières</div>
      <h2 id="mat-t">Trois matières, choisies <em>pour la peau.</em></h2>
      <dl class="mat">
        <div><dt>Dentelle</dt><dd>Dentelle Leavers, tissée sur des métiers centenaires du Nord de la France. Fine, souple, aux motifs profonds.</dd></div>
        <div><dt>Soie</dt><dd>Une soie lourde et fluide pour les nuisettes et les kimonos. Elle tombe droit et prend la chaleur du corps.</dd></div>
        <div><dt>Tulle</dt><dd>Un tulle léger, presque invisible, pour les transparences et les finitions.</dd></div>
      </dl>
    </div>
  </div>
</section>

<section class="sec band-bg" id="rituel" aria-labelledby="rit-t">
  <div class="wrap">
    <div class="eyebrow">Le rituel</div>
    <h2 id="rit-t" style="max-width:16ch">De l'atelier <em>jusqu'à vous.</em></h2>
    <ol class="steps">
      <li class="rv"><h3>Le coffret</h3><p>Chaque commande part dans un coffret rigide, entre deux feuilles de papier de soie.</p></li>
      <li class="rv"><h3>La carte</h3><p>Un mot écrit à la main, pour vous ou pour la personne à qui vous l'offrez.</p></li>
      <li class="rv"><h3>L'envoi discret</h3><p>Un colis neutre, sans le nom de la marque à l'extérieur.</p></li>
      <li class="rv"><h3>La bonne taille</h3><p>Un guide des tailles précis et un échange simple si la taille ne convient pas.</p></li>
    </ol>
  </div>
</section>

<section class="sec" aria-labelledby="jr-t">
  <div class="wrap">
    <div class="coll-head">
      <div><div class="eyebrow">Le Journal</div><h2 id="jr-t">Conseils, matières <em>&amp; féminité</em></h2></div>
      <a class="btn" href="/journal/">Tous les articles</a>
    </div>
    <div class="posts">{latest}</div>
  </div>
</section>

{waitlist()}
</main>
"""
    write('index.html', head(f'{BRAND} · Maison de lingerie de luxe, dentelle et soie',
        'Eve Marly, maison de lingerie de luxe : dentelle Leavers, soie et tulle en petites séries. Rejoignez la liste d\'attente de la première collection.',
        '/', extra_ld=ld, preload=pre) + body + footer())

def journal():
    filt = '<button type="button" data-cat="all" aria-pressed="true">Tous</button>' + ''.join(
        f'<button type="button" data-cat="{e(c)}" aria-pressed="false">{e(c)}</button>' for c in CATS if any(a['cat'] == c for a in ARTICLES))
    cards = ''.join(post_card(a) for a in ARTICLES)
    ld = [{"@context": "https://schema.org", "@type": "Blog", "name": f"Le Journal {BRAND}", "url": SITE + "/journal/",
           "publisher": {"@type": "Organization", "name": BRAND}},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE + "/"},
              {"@type": "ListItem", "position": 2, "name": "Journal", "item": SITE + "/journal/"}]}]
    body = f"""<body class="page">
{nav('journal')}
<main id="contenu">
  <div class="pagehead">
    <p class="crumbs"><a href="/">Accueil</a> / Journal</p>
    <div class="eyebrow">Le Journal</div>
    <h1>Conseils, matières <em style="color:var(--champagne)">&amp; féminité</em></h1>
    <p>Guides des tailles, entretien de la soie et de la dentelle, histoire des savoir-faire et idées cadeaux. Par La Maison Eve Marly.</p>
    <div class="filters" role="group" aria-label="Filtrer par thème">{filt}</div>
  </div>
  <div class="wrap"><div class="posts">{cards}</div></div>
  {waitlist('Recevez nos prochains <em>articles.</em>')}
</main>
"""
    write('journal/index.html', head(f'Le Journal · Conseils lingerie, soie et dentelle | {BRAND}',
        'Guides des tailles, entretien de la soie et de la dentelle, morphologie, cadeaux et féminité : les conseils lingerie de La Maison Eve Marly.',
        '/journal/', extra_ld=ld) + body + footer())

def article(a):
    path = f"/journal/{a['slug']}/"
    others = [x for x in ARTICLES if x['slug'] != a['slug']]
    same = [x for x in others if x['cat'] == a['cat']] + [x for x in others if x['cat'] != a['cat']]
    rel = ''.join(post_card(x) for x in same[:3])
    d = datetime.date.fromisoformat(a['date'])
    mois = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'][d.month-1]
    ld = [{"@context": "https://schema.org", "@type": "Article", "headline": a['title'], "description": a['desc'],
           "image": f"{SITE}/img/{a['img']}.webp", "datePublished": a['date'], "dateModified": a['date'],
           "inLanguage": "fr-FR", "mainEntityOfPage": SITE + path,
           "author": {"@type": "Organization", "name": f"La Maison {BRAND}", "url": SITE + "/"},
           "publisher": {"@type": "Organization", "name": BRAND, "logo": {"@type": "ImageObject", "url": SITE + "/favicon.svg"}}},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE + "/"},
              {"@type": "ListItem", "position": 2, "name": "Journal", "item": SITE + "/journal/"},
              {"@type": "ListItem", "position": 3, "name": a['title'], "item": SITE + path}]}]
    body = f"""<body class="page">
{nav('journal')}
<main id="contenu">
<article class="article">
  <p class="crumbs"><a href="/">Accueil</a> / <a href="/journal/">Journal</a> / {e(a['cat'])}</p>
  <div class="eyebrow">{e(a['cat'])}</div>
  <h1>{e(a['title'])}</h1>
  <p class="meta">Par La Maison {BRAND} · <time datetime="{a['date']}">{d.day} {mois} {d.year}</time> · {a['read']} min de lecture</p>
  <figure class="hero"><img src="/img/{a['img']}.webp" alt="" width="1100" height="614"></figure>
  <div class="prose">{a['body']}</div>
  <aside class="cta-box">
    <div class="eyebrow">Première collection</div>
    <h2>Dentelle, soie et tulle, en petites séries.</h2>
    <a class="btn" href="/#liste">Rejoindre la liste d'attente</a>
  </aside>
</article>
<section class="wrap related" aria-labelledby="rel-t">
  <h2 id="rel-t" style="font-size:34px;margin:0 0 30px">À lire aussi</h2>
  <div class="posts">{rel}</div>
</section>
<div style="height:100px"></div>
</main>
"""
    write(f"journal/{a['slug']}/index.html", head(f"{a['title']} | {BRAND}", a['desc'], path, img=f"/img/{a['img']}.webp", kind='article', extra_ld=ld) + body + footer())

def simple(path, title, desc, h1, content, robots_index=True):
    body = f"""<body class="page">
{nav()}
<main id="contenu">
<article class="article">
  <p class="crumbs"><a href="/">Accueil</a> / {e(h1)}</p>
  <h1>{e(h1)}</h1>
  <div class="prose">{content}</div>
</article>
<div style="height:120px"></div>
</main>
"""
    write(path.strip('/') + '/index.html' if path != '/404' else '404.html', head(title, desc, path) + body + footer())

def legal():
    simple('/mentions-legales/', f'Mentions légales | {BRAND}', f'Mentions légales du site evemarly.com, édité par {BRAND}.', 'Mentions légales', f"""
<h2>Éditeur du site</h2>
<p>Le site <strong>evemarly.com</strong> est édité par <strong>EVEMARLY</strong>, société en cours de création, détenue par <strong>Madame Ilham Errouane</strong>.</p>
<ul>
<li>Forme juridique : [À COMPLÉTER À L'IMMATRICULATION]</li>
<li>Siège social : [ADRESSE À COMPLÉTER]</li>
<li>SIREN / SIRET : en cours d'immatriculation</li>
<li>Numéro de TVA intracommunautaire : [À COMPLÉTER]</li>
<li>E-mail : <a href="mailto:{EMAIL}">{EMAIL}</a></li>
</ul>
<h2>Directrice de la publication</h2>
<p>Madame Ilham Errouane.</p>
<h2>Hébergement</h2>
<p>Le site est hébergé par <strong>Cloudflare, Inc.</strong>, 101 Townsend St, San Francisco, CA 94107, États-Unis. Site : cloudflare.com.</p>
<h2>Propriété intellectuelle</h2>
<p>L'ensemble des contenus de ce site (textes, images, vidéos, logo, charte graphique) est la propriété d'{BRAND}, sauf mention contraire. Toute reproduction, même partielle, sans autorisation écrite préalable est interdite.</p>
<h2>Conception</h2>
<p>Site conçu et réalisé par Aladin.</p>
""")
    simple('/confidentialite/', f'Politique de confidentialité | {BRAND}', f'Comment {BRAND} collecte, utilise et protège vos données personnelles.', 'Politique de confidentialité', f"""
<p>La présente politique explique quelles données personnelles {BRAND} collecte sur evemarly.com, pourquoi, et quels sont vos droits, conformément au Règlement général sur la protection des données (RGPD).</p>
<h2>Responsable du traitement</h2>
<p>EVEMARLY, société en cours de création, représentée par Madame Ilham Errouane. Contact : <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
<h2>Données collectées</h2>
<p>Lorsque vous vous inscrivez à la liste d'attente, nous collectons uniquement votre <strong>adresse e-mail</strong>, la date de l'inscription et la page depuis laquelle vous vous êtes inscrite.</p>
<h2>Finalité et base légale</h2>
<p>Ces données servent à vous informer de l'ouverture de la boutique, de la prévente et de nos nouveautés. Le traitement repose sur votre <strong>consentement</strong>, que vous pouvez retirer à tout moment.</p>
<h2>Durée de conservation</h2>
<p>Votre adresse est conservée jusqu'à votre désinscription, et au maximum trois ans après notre dernier contact avec vous.</p>
<h2>Destinataires</h2>
<p>Vos données ne sont ni vendues ni louées. Elles sont stockées chez notre hébergeur, Cloudflare, et pourront être transmises à notre prestataire d'envoi d'e-mails, uniquement pour vous écrire.</p>
<h2>Cookies</h2>
<p>Ce site n'utilise pas de cookies publicitaires ni de traceurs de mesure d'audience. Aucun bandeau de consentement n'est donc nécessaire à ce jour. Si cela change, cette page sera mise à jour et votre accord vous sera demandé.</p>
<h2>Vos droits</h2>
<p>Vous disposez d'un droit d'accès, de rectification, d'effacement, d'opposition, de limitation et de portabilité de vos données. Pour les exercer, écrivez à <a href="mailto:{EMAIL}">{EMAIL}</a>. Vous pouvez aussi introduire une réclamation auprès de la CNIL (cnil.fr).</p>
<p>Dernière mise à jour : 11 novembre 2026.</p>
""")
    simple('/cgv/', f'Conditions générales de vente | {BRAND}', f'Conditions générales de vente de la boutique {BRAND}.', 'Conditions générales de vente', f"""
<p>La boutique {BRAND} n'est pas encore ouverte : aucune vente n'est réalisée sur ce site pour le moment.</p>
<p>Les conditions générales de vente complètes (prix, commande, paiement sécurisé, livraison, droit de rétractation de 14 jours, échanges, garanties légales) seront publiées sur cette page avant l'ouverture de la boutique.</p>
<p>Pour toute question : <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
""")
    body = f"""<body class="page">
{nav()}
<main id="contenu">
<article class="article" style="text-align:center;padding-top:60px">
  <div class="eyebrow">Erreur 404</div>
  <h1>Cette page s'est perdue en chemin.</h1>
  <p style="color:var(--ivoire-dim)">L'adresse n'existe pas ou a changé. Revenez à l'accueil ou parcourez le Journal.</p>
  <p style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:30px"><a class="btn" href="/">Accueil</a><a class="btn" href="/journal/">Le Journal</a></p>
</article>
<div style="height:120px"></div>
</main>
"""
    write('404.html', head(f'Page introuvable | {BRAND}', 'Cette page est introuvable.', '/404') .replace('index, follow', 'noindex, follow') + body + footer())

def seo_files():
    urls = [('/', '1.0', 'weekly'), ('/journal/', '0.8', 'weekly')]
    urls += [(f"/journal/{a['slug']}/", '0.7', 'monthly') for a in ARTICLES]
    urls += [('/mentions-legales/', '0.2', 'yearly'), ('/confidentialite/', '0.2', 'yearly'), ('/cgv/', '0.2', 'yearly')]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u, p, c in urls:
        sm += f'  <url><loc>{SITE}{u}</loc><lastmod>{TODAY}</lastmod><changefreq>{c}</changefreq><priority>{p}</priority></url>\n'
    write('sitemap.xml', sm + '</urlset>\n')
    write('robots.txt', f'User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: {SITE}/sitemap.xml\n')

if __name__ == '__main__':
    home(); journal()
    for a in ARTICLES: article(a)
    legal(); seo_files()
    print('OK', FRAMES, 'images du film,', len(ARTICLES), 'articles')
