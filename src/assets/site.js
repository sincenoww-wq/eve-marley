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
