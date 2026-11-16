(function(){
'use strict';
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var clamp = function(v,a,b){return Math.min(b,Math.max(a,v));};

/* Navigation */
var nav = document.querySelector('.nav');
function onNav(){ if(nav) nav.classList.toggle('solid', window.scrollY > 40); }
window.addEventListener('scroll', onNav, {passive:true}); onNav();

/* Apparitions */
if('IntersectionObserver' in window){
  var io = new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12});
  document.querySelectorAll('.rv').forEach(function(el){io.observe(el);});
} else { document.querySelectorAll('.rv').forEach(function(el){el.classList.add('in');}); }

/* Liste d'attente */
document.querySelectorAll('form.wl').forEach(function(f){
  f.addEventListener('submit', function(e){
    e.preventDefault();
    var input = f.querySelector('input[type=email]'), msg = f.parentNode.querySelector('.msg');
    var v = (input.value || '').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){ msg.textContent = "Cette adresse e-mail ne semble pas valide. Vérifiez-la et réessayez."; input.focus(); return; }
    msg.textContent = "Envoi…";
    fetch('/api/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:v,source:location.pathname})})
      .then(function(r){ return r.json().catch(function(){return {};}).then(function(d){ return {ok:r.ok,d:d}; }); })
      .then(function(res){
        if(res.ok){ msg.textContent = "Merci, vous êtes sur la liste. Nous vous écrirons avant l'ouverture."; input.value=''; }
        else { msg.textContent = (res.d && res.d.error) || "L'inscription n'a pas fonctionné. Réessayez dans un instant ou écrivez à contact@evemarly.com."; }
      })
      .catch(function(){ msg.textContent = "L'inscription n'a pas fonctionné. Réessayez dans un instant ou écrivez à contact@evemarly.com."; });
  });
});

/* Filtres du journal */
var filters = document.querySelectorAll('.filters button');
filters.forEach(function(b){
  b.addEventListener('click', function(){
    var c = b.getAttribute('data-cat');
    filters.forEach(function(x){x.setAttribute('aria-pressed', x===b ? 'true':'false');});
    document.querySelectorAll('.posts .post').forEach(function(p){ p.hidden = !(c==='all' || p.getAttribute('data-cat')===c); });
  });
});

/* Film au scroll */
var film = document.querySelector('.film');
if(!film) return;
var canvas = film.querySelector('canvas'), ctx = canvas.getContext('2d');
var N = parseInt(film.getAttribute('data-frames'),10);
var dir = window.innerWidth < 760 ? film.getAttribute('data-m') : film.getAttribute('data-d');
var scenes = film.querySelectorAll('.scene'), bars = film.querySelectorAll('.dots b'), loader = film.querySelector('.loader');
var frames = new Array(N), loaded = 0, cur = -1, target = 0, shown = 0;
function src(i){ var n = String(i+1); while(n.length<3) n='0'+n; return dir + n + '.webp'; }
function size(){
  var d = Math.min(window.devicePixelRatio||1, 2);
  canvas.width = Math.round(canvas.clientWidth*d); canvas.height = Math.round(canvas.clientHeight*d);
  cur = -1; draw(Math.round(shown));
}
function nearest(i){
  if(frames[i] && frames[i].ok) return frames[i];
  for(var k=1;k<N;k++){ if(i-k>=0 && frames[i-k] && frames[i-k].ok) return frames[i-k]; if(i+k<N && frames[i+k] && frames[i+k].ok) return frames[i+k]; }
  return null;
}
function draw(i){
  if(i===cur) return;
  var f = nearest(i); if(!f) return;
  var img = f.img, cw = canvas.width, ch = canvas.height, s = Math.max(cw/img.naturalWidth, ch/img.naturalHeight);
  var w = img.naturalWidth*s, h = img.naturalHeight*s;
  ctx.drawImage(img, (cw-w)/2, (ch-h)/2, w, h);
  if(frames[i] && frames[i].ok) cur = i;
}
function load(i){
  if(frames[i]) return;
  var img = new Image(); frames[i] = {img:img, ok:false};
  img.decoding = 'async';
  img.onload = function(){ frames[i].ok = true; loaded++; if(loader){ loader.style.width = (loaded/N*100)+'%'; if(loaded>=N) loader.style.opacity = 0; } if(Math.abs(i-Math.round(shown))<6){ cur=-1; draw(Math.round(shown)); } };
  img.onerror = function(){ loaded++; };
  img.src = src(i);
}
// Ordre de chargement : première image, puis une image sur 8, sur 4, sur 2, puis le reste
load(0);
var order = [], seen = {};
[8,4,2,1].forEach(function(step){ for(var i=0;i<N;i+=step){ if(!seen[i]){ seen[i]=1; order.push(i); } } });
var qi = 0;
function pump(){ var c = 0; while(qi<order.length && c<6){ load(order[qi++]); c++; } if(qi<order.length) setTimeout(pump, 60); }
pump();

function progress(){
  var r = film.getBoundingClientRect(), total = film.offsetHeight - window.innerHeight;
  return clamp(-r.top/total, 0, 1);
}
var S = scenes.length;
function ui(p){
  for(var k=0;k<S;k++){
    var a = k/S, b = (k+1)/S, mid = (a+b)/2, half = (b-a)/2;
    var o = 1 - clamp((Math.abs(p-mid) - half*0.55)/(half*0.45), 0, 1);
    if(k===0 && p < mid) o = 1;
    if(k===S-1 && p > mid) o = 1;
    scenes[k].style.opacity = o.toFixed(3); scenes[k].style.filter = o > .98 ? '' : 'blur(' + ((1 - o) * 10).toFixed(1) + 'px)'; scenes[k].style.letterSpacing = ((1 - o) * .06).toFixed(3) + 'em';
    scenes[k].classList.toggle('on', o > .5);
    if(bars[k]) bars[k].style.transform = 'scaleX(' + clamp((p-a)/(b-a),0,1).toFixed(3) + ')';
  }
}
function tick(){
  var p = progress();
  target = p*(N-1);
  shown += (target-shown)*(reduce?1:.18);
  if(Math.abs(target-shown)<.05) shown = target;
  draw(Math.round(shown));
  ui(p);
  requestAnimationFrame(tick);
}
film.querySelectorAll('.dots button').forEach(function(btn, k){
  btn.addEventListener('click', function(){
    var total = film.offsetHeight - window.innerHeight;
    var y = film.getBoundingClientRect().top + window.scrollY + total*((k+.5)/S);
    window.scrollTo({top:y, behavior: reduce ? 'auto':'smooth'});
  });
});
window.addEventListener('resize', size);
size();
if(reduce){ draw(N-1); } else { requestAnimationFrame(tick); }
})();

/* Le portant : balancement en pendule amorti */
/* V4.1 : salles (galerie, éventail, colonnes, carrousel 3D) */
(function(){
  var rooms = Array.prototype.slice.call(document.querySelectorAll('.room')); if(!rooms.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mq = window.matchMedia('(min-width: 981px)');
  function clamp(v){ return Math.max(0, Math.min(1, v)); }
  function ease(x){ return 1 - Math.pow(1 - x, 3); }
  var R = rooms.map(function(el){
    var lay = el.getAttribute('data-lay');
    return {el:el, lay:lay, track:el.querySelector('.track'), word:el.querySelector('.room-word'), bar:el.querySelector('.room-bar b'),
      cards:Array.prototype.slice.call(el.querySelectorAll('.fan .fr')), ring:el.querySelector('.ring'),
      cols:Array.prototype.slice.call(el.querySelectorAll('.col')), extra:0, x:0, sp:0, spin:0, R:0, step:0};
  });
  function measure(){
    var vw = window.innerWidth, vh = window.innerHeight;
    R.forEach(function(r){
      if(r.lay === 'gal'){
        if(mq.matches && !reduce){ r.extra = Math.max(0, r.track.scrollWidth - vw); r.el.style.height = (vh + r.extra) + 'px'; }
        else { r.extra = 0; r.el.style.height = ''; r.track.style.transform = ''; }
      } else if(r.lay === 'fan' && r.cards.length){
        var w = r.cards[0].offsetWidth, n = r.cards.length;
        r.step = Math.min(w * 0.86, (vw - w - 36) / Math.max(1, n - 1));
      } else if(r.lay === 'ring' && r.ring){
        var c = r.ring.querySelector('.fr'), k = r.ring.children.length;
        r.R = Math.round(c.offsetWidth / 2 / Math.tan(Math.PI / k)) + (vw < 981 ? 14 : 36);
        r.ring.style.setProperty('--R', r.R + 'px');
      }
    });
  }
  measure(); window.addEventListener('resize', measure); window.addEventListener('load', measure);
  if(!reduce) rooms.forEach(function(x){ x.classList.add('anim'); });
  var nav = document.querySelector('.dress-nav'), links = nav ? nav.querySelectorAll('a') : [];
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting) en.target.classList.add('in'); }); }, {rootMargin:'0px 0px -20% 0px'});
    rooms.forEach(function(x){ io.observe(x); });
    var io2 = new IntersectionObserver(function(es){ es.forEach(function(en){
      if(en.isIntersecting){ var k = rooms.indexOf(en.target); Array.prototype.forEach.call(links, function(l, i){ if(i===k) l.setAttribute('aria-current','true'); else l.removeAttribute('aria-current'); }); }
    }); }, {rootMargin:'-49% 0px -49% 0px'});
    rooms.forEach(function(x){ io2.observe(x); });
    var dr = document.querySelector('.dressing');
    if(nav && dr) new IntersectionObserver(function(es){ nav.classList.toggle('on', es[0].isIntersecting); }, {rootMargin:'-30% 0px -30% 0px'}).observe(dr);
  } else { rooms.forEach(function(x){ x.classList.add('in'); }); }
  var ly = window.scrollY, vel = 0, prev = performance.now();
  function tick(now){
    var dt = Math.min(50, now - prev); prev = now;
    var sy = window.scrollY; vel += ((sy - ly) - vel) * 0.2; ly = sy;
    var vh = window.innerHeight;
    for(var q=0;q<R.length;q++){
      var r = R[q], bb = r.el.getBoundingClientRect();
      if(bb.bottom < -80 || bb.top > vh + 80) continue;
      var span = Math.max(1, bb.height - vh), p = clamp(-bb.top / span);
      if(reduce) p = r.lay === 'fan' ? 1 : 0;
      if(!mq.matches){ if(r.bar && r.sc){ var mx = r.sc.scrollWidth - r.sc.clientWidth; r.bar.style.transform = 'scaleX(' + (mx > 0 ? r.sc.scrollLeft / mx : 1).toFixed(3) + ')'; } continue; }
      r.sp += (p - r.sp) * (reduce ? 1 : 0.12);
      if(r.bar) r.bar.style.transform = 'scaleX(' + r.sp.toFixed(3) + ')';
      if(r.lay === 'gal'){
        if(mq.matches && !reduce){
          var x = r.sp * r.extra, sk = 0;
          r.track.style.transform = 'translate3d(' + (-x).toFixed(1) + 'px,0,0) skewX(' + (-sk).toFixed(2) + 'deg)';
          if(r.word) r.word.style.transform = 'translate3d(' + (-x * 0.25).toFixed(1) + 'px,0,0)';
        }
      } else if(r.lay === 'fan' && mq.matches){
        var n = r.cards.length, mid = (n - 1) / 2;
        for(var i=0;i<n;i++){
          var e = ease(clamp(r.sp / 0.72 - i * 0.05)), d = i - mid;
          var tx = d * r.step * e, ty = d * d * 9 * e - (1 - e) * i * 3;
          var rot = d * 5 * e + (1 - e) * ((i % 2 ? 1 : -1) * (2 + i * 1.6));
          r.cards[i].style.transform = 'translate(-50%,-50%) translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
        }
        if(r.word && !reduce) r.word.style.transform = 'translate3d(' + (-r.sp * 12).toFixed(2) + '%,0,0) scale(' + (1 + r.sp * 0.15).toFixed(3) + ')';
      } else if(r.lay === 'ring' && r.ring){
        if(!reduce) r.spin += dt * 0.006 + Math.abs(vel) * 0.02;
        r.ring.style.transform = 'translateZ(' + (-r.R) + 'px) rotateY(' + (-(r.sp * 360) - r.spin).toFixed(2) + 'deg)';
        if(r.word && !reduce) r.word.style.transform = 'translate3d(' + (r.sp * -14).toFixed(2) + '%,0,0)';
      } else if(r.lay === 'cols' && !reduce){
        var off = (bb.top + bb.height / 2 - vh / 2) / vh;
        for(var c=0;c<r.cols.length;c++){
          var amp = mq.matches ? 130 : 46;
          r.cols[c].style.transform = 'translate3d(0,' + (off * (c % 2 ? amp : -amp)).toFixed(1) + 'px,0)';
        }
        if(r.word) r.word.style.transform = 'translate3d(' + (off * 10).toFixed(2) + '%,0,0)';
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

/* V6.1 : mobile — chaque salon devient un défilé horizontal (coverflow) */
(function(){
  if(window.matchMedia('(min-width: 981px)').matches) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Array.prototype.forEach.call(document.querySelectorAll('.room'), function(room){
    var sc = room.querySelector('.track, .fan, .cols, .mos'); if(!sc) return;
    sc.classList.add('mscroll');
    var head = sc.querySelector('.panel-t'), pin = room.querySelector('.room-pin');
    if(head && sc.classList.contains('track')){ var w = document.createElement('div'); w.className = 'wrap stage-m'; w.appendChild(head); pin.insertBefore(w, sc); }
    if(!room.querySelector('.room-bar')){ var b = document.createElement('div'); b.className = 'room-bar'; b.setAttribute('aria-hidden','true'); b.innerHTML = '<b></b>'; pin.appendChild(b); }
    var bar = room.querySelector('.room-bar b'), cards = sc.querySelectorAll('.fr'), raf = 0;
    var cnt = document.createElement('div'); cnt.className = 'm-count'; cnt.setAttribute('aria-hidden','true'); pin.appendChild(cnt);
    function upd(){
      raf = 0;
      var mid = sc.scrollLeft + sc.clientWidth / 2, best = 0, bd = 1e9, mx = sc.scrollWidth - sc.clientWidth;
      for(var i=0;i<cards.length;i++){
        var c = cards[i], cx = c.offsetLeft + c.offsetWidth / 2, d = Math.abs(cx - mid) / sc.clientWidth;
        if(d < bd){ bd = d; best = i; }
        if(!reduce){ var k = Math.min(1, d * 1.4); c.style.transform = 'scale(' + (1 - k * .1).toFixed(3) + ') translateY(' + (k * 14).toFixed(1) + 'px)'; c.style.opacity = (1 - k * .45).toFixed(3); }
      }
      if(bar) bar.style.transform = 'scaleX(' + (mx > 0 ? sc.scrollLeft / mx : 1).toFixed(3) + ')';
      cnt.textContent = (best + 1 < 10 ? '0' : '') + (best + 1) + ' / ' + (cards.length < 10 ? '0' : '') + cards.length;
    }
    sc.addEventListener('scroll', function(){ if(!raf) raf = requestAnimationFrame(upd); }, {passive:true});
    upd(); window.addEventListener('load', upd);
  });
})();

/* V6.1 : filets dorés qui se tracent, reflets sur les cartes */
(function(){
  if(!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('seen'); io.unobserve(en.target); } }); }, {threshold:.25});
  Array.prototype.forEach.call(document.querySelectorAll('.eyebrow, .card, .steps li, .mood .txt, .panel-t'), function(el){ io.observe(el); });
})();

/* V4.1 : animations globales */
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var doc = document.documentElement;
  // intro
  var intro = document.querySelector('.splash');
  if(intro){
    var seen = false; try{ seen = sessionStorage.getItem('em-intro'); sessionStorage.setItem('em-intro','1'); }catch(e){}
    if(seen || reduce) intro.remove(); else { doc.classList.add('intro-on'); setTimeout(function(){ doc.classList.remove('intro-on'); doc.classList.add('intro-done'); }, 1500); setTimeout(function(){ intro.remove(); }, 2600); }
  }
  // barre de progression
  var sp = document.createElement('div'); sp.className = 'sprog'; sp.setAttribute('aria-hidden','true'); document.body.appendChild(sp);
  // titres : révélation mot à mot
  if(!reduce && 'IntersectionObserver' in window){
    var k;
    function split(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(ch){
        if(ch.nodeType === 3){
          var parts = ch.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
          parts.forEach(function(w){
            if(!w) return;
            if(/^\s+$/.test(w)){ frag.appendChild(document.createTextNode(' ')); return; }
            var o = document.createElement('span'); o.className = 'w';
            var i = document.createElement('span'); i.textContent = w; i.style.setProperty('--k', k++);
            o.appendChild(i); frag.appendChild(o);
          });
          node.replaceChild(frag, ch);
        } else if(ch.nodeType === 1 && ch.tagName !== 'BR'){ split(ch); }
      });
    }
    var heads = document.querySelectorAll('main h1, main h2');
    var hio = new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); hio.unobserve(en.target); } }); }, {threshold:.2});
    Array.prototype.forEach.call(heads, function(h){
      if(h.closest('.scene') || h.closest('.prose') || h.closest('.article')) return;
      k = 0; split(h); h.classList.add('sw'); hio.observe(h);
    });
  }
  // curseur
  var cur = null, cx = -100, cy = -100, px = -100, py = -100;
  if(fine && !reduce){
    cur = document.createElement('div'); cur.className = 'cur'; cur.setAttribute('aria-hidden','true'); cur.innerHTML = '<span>Voir</span>'; document.body.appendChild(cur);
    window.addEventListener('pointermove', function(e){ cx = e.clientX; cy = e.clientY; cur.classList.add('on'); }, {passive:true});
    document.addEventListener('pointerover', function(e){
      var t = e.target.closest ? e.target.closest('.fr,.card,.post,.cat-t,.panel-end') : null;
      cur.classList.toggle('big', !!t);
      var l = !t && e.target.closest ? e.target.closest('a,button') : null;
      cur.classList.toggle('lnk', !!l);
    });
    document.addEventListener('pointerleave', function(){ cur.classList.remove('on'); });
    // boutons magnétiques
    Array.prototype.forEach.call(document.querySelectorAll('.btn'), function(b){
      b.addEventListener('pointermove', function(e){ var r = b.getBoundingClientRect(); b.style.translate = ((e.clientX - r.left - r.width/2) * 0.25).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height/2) * 0.35).toFixed(1) + 'px'; });
      b.addEventListener('pointerleave', function(){ b.style.translate = ''; });
    });
    // inclinaison 3D des cadres et cartes
    Array.prototype.forEach.call(document.querySelectorAll('.fr,.card,.post'), function(c){
      var ph = c.querySelector('.ph'); if(!ph) return;
      c.addEventListener('pointermove', function(e){
        var r = ph.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        ph.style.transform = 'perspective(700px) rotateY(' + (x * 6).toFixed(2) + 'deg) rotateX(' + (-y * 5).toFixed(2) + 'deg) translateY(-6px)';
      });
      c.addEventListener('pointerleave', function(){ ph.style.transform = ''; });
    });
    // parallaxe du collage
    var hero = document.querySelector('.hero2');
    if(hero){
      var layers = [['.collage .a', 10], ['.collage .b', -22], ['.collage .c', 34], ['.collage .stamp', -14]].map(function(d){ return [hero.querySelector(d[0]), d[1]]; });
      hero.addEventListener('pointermove', function(e){
        var x = e.clientX / window.innerWidth - .5, y = e.clientY / window.innerHeight - .5;
        layers.forEach(function(l){ if(l[0]) l[0].style.translate = (x * l[1]).toFixed(1) + 'px ' + (y * l[1]).toFixed(1) + 'px'; });
      });
    }
  }
  // boucle : progression, curseur, bandeau, parallaxe au scroll
  var mqs = document.querySelectorAll('.marquee div'), ly = window.scrollY, vel = 0;
  var par = reduce ? [] : Array.prototype.slice.call(document.querySelectorAll('.mood img, .split img, .collage'));
  function loop(){
    var sy = window.scrollY, max = Math.max(1, doc.scrollHeight - window.innerHeight);
    sp.style.transform = 'scaleX(' + (sy / max).toFixed(4) + ')';
    vel += ((sy - ly) - vel) * 0.15; ly = sy;
    if(cur){ px += (cx - px) * 0.22; py += (cy - py) * 0.22; cur.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0)'; }
    if(!reduce){
      Array.prototype.forEach.call(mqs, function(m){ var a = m.getAnimations ? m.getAnimations()[0] : null; if(a) a.playbackRate = 1 + Math.min(3, Math.abs(vel) * 0.08); });
      var vh = window.innerHeight;
      for(var i=0;i<par.length;i++){ var b = par[i].getBoundingClientRect(); if(b.bottom < 0 || b.top > vh) continue; par[i].style.setProperty('--py', (((b.top + b.height/2) / vh - .5) * -34).toFixed(1) + 'px'); }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* Fiche produit : galerie */
(function(){
  var main = document.querySelector('.pdp-main img'); if(!main) return;
  var thumbs = document.querySelectorAll('.thumb');
  thumbs.forEach(function(t, i){
    if(i === 0) t.setAttribute('aria-current','true');
    t.addEventListener('click', function(){
      main.src = t.getAttribute('data-src');
      thumbs.forEach(function(x){ x.removeAttribute('aria-current'); });
      t.setAttribute('aria-current','true');
    });
  });
})();
/* Boutique : filtres */
(function(){
  var bs = document.querySelectorAll('.shop-filters button'); if(!bs.length) return;
  bs.forEach(function(b){ b.addEventListener('click', function(){
    var c = b.getAttribute('data-cat');
    bs.forEach(function(x){ x.setAttribute('aria-pressed', x===b ? 'true' : 'false'); });
    document.querySelectorAll('.shop-grid .card').forEach(function(card){ card.hidden = !(c==='all' || card.getAttribute('data-cat')===c); });
  }); });
  var h = decodeURIComponent(location.hash.slice(1));
  if(h) bs.forEach(function(b){ if(b.getAttribute('data-cat')===h) b.click(); });
})();

/* Mesure d'audience maison : sans cookie, sans adresse IP conservée */
(function(){
  if(location.pathname.indexOf('/admin') === 0) return;
  var sid; try{ sid = sessionStorage.getItem('em-s'); if(!sid){ sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('em-s', sid); } }catch(e){ sid = Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function send(t){
    var d = JSON.stringify({t:t, s:sid, p:location.pathname, r:t === 'pv' ? document.referrer : ''});
    try{ if(navigator.sendBeacon){ navigator.sendBeacon('/api/t', d); return; } }catch(e){}
    try{ fetch('/api/t', {method:'POST', body:d, keepalive:true}); }catch(e){}
  }
  send('pv');
  setInterval(function(){ if(document.visibilityState === 'visible') send('hb'); }, 20000);
})();

/* Catalogue dynamique : produits masqués ou ajoutés depuis l'administration */
(function(){
  var links = document.querySelectorAll('a[href^="/produit/"]'), grid = document.querySelector('.shop-grid');
  if(!links.length && !grid) return;
  fetch('/api/catalog').then(function(r){ return r.json(); }).then(function(c){
    (c.hidden || []).forEach(function(slug){
      Array.prototype.forEach.call(document.querySelectorAll('a[href="/produit/' + slug + '/"]'), function(a){ var li = a.closest('.pc'); (li || a).remove(); });
    });
    if(!grid || !(c.added || []).length) return;
    var filters = document.querySelector('.shop-filters');
    c.added.slice().reverse().forEach(function(p){
      if(c.hidden.indexOf(p.slug) > -1) return;
      var a = document.createElement('a'); a.className = 'card rv in seen'; a.href = '/produit/' + p.slug + '/'; a.setAttribute('data-cat', p.cat);
      var ph = document.createElement('div'); ph.className = 'ph';
      var im = document.createElement('img'); im.src = p.images[0]; im.alt = p.name; im.loading = 'lazy'; im.referrerPolicy = 'no-referrer'; ph.appendChild(im);
      var meta = document.createElement('div'); meta.className = 'meta';
      var h = document.createElement('h3'); h.textContent = p.name; var sm = document.createElement('small'); sm.textContent = p.cat; h.appendChild(sm);
      var pr = document.createElement('span'); pr.className = 'price'; pr.textContent = Number(p.price).toFixed(2).replace('.', ',') + ' €';
      meta.appendChild(h); meta.appendChild(pr); a.appendChild(ph); a.appendChild(meta);
      grid.insertBefore(a, grid.firstChild);
      if(filters && !filters.querySelector('[data-cat="' + p.cat + '"]')){
        var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-cat', p.cat); b.setAttribute('aria-pressed', 'false'); b.textContent = p.cat;
        b.addEventListener('click', function(){
          Array.prototype.forEach.call(filters.querySelectorAll('button'), function(x){ x.setAttribute('aria-pressed', String(x === b)); });
          Array.prototype.forEach.call(grid.querySelectorAll('.card'), function(card){ card.hidden = card.getAttribute('data-cat') !== p.cat; });
        });
        filters.appendChild(b);
      }
    });
  }).catch(function(){});
})();
