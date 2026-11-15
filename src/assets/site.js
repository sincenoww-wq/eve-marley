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
    scenes[k].style.opacity = o.toFixed(3);
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
(function(){
  var rooms = Array.prototype.slice.call(document.querySelectorAll('.room')); if(!rooms.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var Y0 = window.innerWidth < 980 ? -8 : -16;
  var st = [], R = [];
  function kick(s, f){ if(s) s.v += f * 14; }
  rooms.forEach(function(room){
    var r = {el:room, vis:false, word:room.querySelector('.room-word'), list:[], lastX:null, lastT:0};
    R.push(r);
    if(!reduce) room.classList.add('anim');
    Array.prototype.forEach.call(room.querySelectorAll('.hang'), function(el, i){
      var s = {el:el, a:0, v:0, yaw:Y0, yawT:Y0, ph:i*1.7 + R.length, r:r};
      r.list.push(s); st.push(s);
      el.addEventListener('pointerenter', function(){ s.yawT = 0; kick(r.list[i-1], .25); kick(r.list[i+1], -.25); });
      el.addEventListener('pointerleave', function(){ s.yawT = Y0; });
      el.addEventListener('touchstart', function(){ kick(s, 1.2); }, {passive:true});
      el.addEventListener('focus', function(){ s.yawT = 0; });
      el.addEventListener('blur', function(){ s.yawT = Y0; });
    });
    room.addEventListener('pointermove', function(e){
      var now = performance.now();
      if(r.lastX !== null && e.pointerType !== 'touch'){
        var vx = (e.clientX - r.lastX) / Math.max(8, now - r.lastT);
        r.list.forEach(function(s){
          var b = s.el.getBoundingClientRect();
          if(e.clientX > b.left && e.clientX < b.right && e.clientY > b.top && e.clientY < b.bottom) kick(s, vx * 0.9);
        });
      }
      r.lastX = e.clientX; r.lastT = now;
    });
    room.addEventListener('pointerleave', function(){ r.lastX = null; });
  });
  var nav = document.querySelector('.dress-nav'), links = nav ? nav.querySelectorAll('a') : [];
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){ es.forEach(function(en){
      var k = rooms.indexOf(en.target), r = R[k]; r.vis = en.isIntersecting;
      if(en.isIntersecting && !en.target.classList.contains('in')){
        en.target.classList.add('in');
        r.list.forEach(function(s, i){ setTimeout(function(){ kick(s, -2.6); }, 250 + i*90); });
      }
    }); }, {rootMargin:'0px 0px -18% 0px'});
    rooms.forEach(function(x){ io.observe(x); });
    var io2 = new IntersectionObserver(function(es){ es.forEach(function(en){
      if(en.isIntersecting){ var k = rooms.indexOf(en.target); Array.prototype.forEach.call(links, function(l, i){ if(i===k) l.setAttribute('aria-current','true'); else l.removeAttribute('aria-current'); }); }
    }); }, {rootMargin:'-45% 0px -45% 0px'});
    rooms.forEach(function(x){ io2.observe(x); });
    var dr = document.querySelector('.dressing');
    if(nav && dr) new IntersectionObserver(function(es){ nav.classList.toggle('on', es[0].isIntersecting); }, {rootMargin:'-30% 0px -30% 0px'}).observe(dr);
  } else { rooms.forEach(function(x, k){ x.classList.add('in'); R[k].vis = true; }); }
  var ly = window.scrollY;
  window.addEventListener('scroll', function(){
    var d = Math.max(-80, Math.min(80, window.scrollY - ly)); ly = window.scrollY;
    if(reduce) return;
    for(var i=0;i<st.length;i++){ if(st[i].r.vis) st[i].v += d * (0.5 + (i%3)*0.22); }
  }, {passive:true});
  var prev = performance.now();
  function tick(now){
    var dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    for(var q=0;q<R.length;q++){
      var r = R[q]; if(!r.vis) continue;
      if(r.word && !reduce){ var bb = r.el.getBoundingClientRect(); r.word.style.transform = 'translate3d(' + (bb.top / window.innerHeight * 9).toFixed(2) + '%,0,0)'; }
      for(var i=0;i<r.list.length;i++){
        var s = r.list[i];
        var idle = reduce ? 0 : Math.sin(now/1000*0.9 + s.ph) * 0.9;
        for(var k=0, n=Math.ceil(dt*240); k<n; k++){
          var h = dt / n;
          s.v += (-60 * (s.a - idle) - 6 * s.v) * h;
          s.a += s.v * h;
        }
        s.a = Math.max(-26, Math.min(26, s.a));
        s.yaw += (s.yawT - s.yaw) * Math.min(1, dt * 6);
        s.el.style.transform = reduce ? '' : 'rotateZ(' + s.a.toFixed(2) + 'deg) rotateY(' + s.yaw.toFixed(2) + 'deg)';
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
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
