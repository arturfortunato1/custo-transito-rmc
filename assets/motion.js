/* Movimento com a rolagem (referência: transições da home Martminas, sem copiar conteúdo).
   0. Menu da página (.secnav): aparece depois da abertura e marca a seção na tela. Vale também com "reduzir movimento".
   1. Entradas: ao chegar na tela, títulos, números e cartões deslizam para o lugar; voltando para cima, a entrada se desfaz e toca de novo.
   2. Sobreposição: seções marcadas com data-pin ficam paradas enquanto a seguinte desliza por cima delas, que recuam e escurecem.
   3. Paralaxe: elementos com data-depth andam um pouco mais devagar ou mais rápido que a página; a fita zebrada corre com a rolagem.
   4. Números grandes contam até o valor quando chegam na tela (uma vez).
   5. Vídeo de fundo (.bgv) toca só enquanto está na tela; sem movimento ou com economia de dados fica a imagem parada.
   Só transform e opacity, um único laço de quadro por rolagem. */
(function(){
const de = document.documentElement, main = document.querySelector('main');
if(!main) return;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasIO = 'IntersectionObserver' in window;
const nav = document.querySelector('.nav');
let navH = 0, vh = innerHeight, raf = 0, Z = 1;  /* Z: zoom do CSS em monitores grandes (rects e scrollY vêm já multiplicados; offsetHeight não) */

/* Posição de uma seção no documento, ignorando o deslocamento de quem está fixada (sticky):
   uma seção fixada termina onde começa a seguinte. */
function docTop(el){
  if(el.matches('[data-pin]') && el.nextElementSibling) return docTop(el.nextElementSibling) - el.offsetHeight*Z;
  return el.getBoundingClientRect().top + scrollY;
}

/* 0. Menu da página */
const secnav = document.querySelector('.secnav');
const marks = secnav ? [...secnav.querySelectorAll('a[href^="#"]')].map(a=>({a, s:document.getElementById(a.hash.slice(1))})).filter(x=>x.s) : [];
function navFrame(){
  if(!marks.length) return;
  const y = scrollY, line = y + vh*.45;
  let cur = marks[0];
  marks.forEach(m=>{ if(docTop(m.s) <= line) cur = m; });
  marks.forEach(m=>{ const on = m===cur; m.a.classList.toggle('cur',on); on?m.a.setAttribute('aria-current','true'):m.a.removeAttribute('aria-current'); });
  const foot = document.querySelector('footer.site');
  const past = y > marks[0].s.offsetHeight*Z*.6, atFoot = foot && foot.getBoundingClientRect().top < vh*.9;
  secnav.classList.toggle('on', past && !atFoot);
  if(cur.a !== secnav._cur){ secnav._cur = cur.a;
    const a = cur.a; secnav.scrollTo({left: a.offsetLeft - (secnav.clientWidth - a.offsetWidth)/2, behavior: reduced?'auto':'smooth'}); }
}
if(secnav) secnav.addEventListener('click', e=>{
  const m = marks.find(x=>x.a===e.target.closest('a')); if(!m) return;
  e.preventDefault();
  const i = marks.indexOf(m), top = i===0 ? 0 : Math.max(0, docTop(m.s) - navH*Z);
  scrollTo({top, behavior: reduced ? 'auto' : 'smooth'});
  history.replaceState(null,'',m.a.hash);
});

/* 5. Vídeo de fundo */
const conn = navigator.connection||{};
const vids = [...document.querySelectorAll('video.bgv')];
if(!reduced && !conn.saveData && hasIO) vids.forEach(v=>{
  v.muted = true; v.defaultMuted = true;
  new IntersectionObserver(([e])=>{
    if(e.isIntersecting){ if(v.preload==='none'){ v.preload='auto'; v.load(); } const p=v.play(); if(p&&p.catch) p.catch(()=>{}); }
    else v.pause();
  },{threshold:.05}).observe(v);
});

function measureNav(){ vh = innerHeight; Z = nav && nav.offsetHeight ? (nav.getBoundingClientRect().height / nav.offsetHeight) || 1 : 1;
  navH = nav && getComputedStyle(nav).position==='sticky' ? nav.offsetHeight : 0; de.style.setProperty('--navh', navH+'px'); }

if(reduced || !hasIO){
  const t = ()=>{ if(!raf) raf = requestAnimationFrame(()=>{ raf=0; navFrame(); }); };
  addEventListener('scroll', t, {passive:true}); addEventListener('resize', ()=>{ measureNav(); t(); });
  measureNav(); navFrame();
  return;
}
de.classList.add('mo');

/* 1. Entradas. Cada peça recebe um tipo (data-r) e um atraso pela ordem dentro do grupo. */
const RULES = [
  ['main>section:not(.hero) .sec-head>*, main>section:not(.hero) .h2', 'left'],
  ['.quote, .lede:not(.hero .lede)', 'right'],
  ['.vbar', 'grow'],
  ['.vkey, .vlist, .units-cap:not(.hero *), .gap-legend:not(.hero *)', 'up'],
  ['.gapbar:not(.hero *):not(.rail *), .stack, .payroad, .track', 'grow'],
  ['.tilemap', 'tiles'],
  ['.rank', 'rows'],
  ['.figs, .doors, .peers, .groups, .saves, .strips, .rail', 'cards'],
  ['main>section:not(.hero) .wrap>p, main>section:not(.hero) .actions, .prev .slider', 'up'],
];
const seen = new Set();
RULES.forEach(([sel, kind])=>document.querySelectorAll(sel).forEach(el=>{
  if(seen.has(el) || el.closest('[data-r]') || el.closest('#intro')) return;
  seen.add(el); el.dataset.r = kind;
  if(kind==='tiles') el.querySelectorAll('.tile').forEach(t=>{
    const c=parseInt(t.style.gridColumn)||1, r=parseInt(t.style.gridRow)||1; t.style.setProperty('--d',((c+r)*45)+'ms'); });
  if(kind==='rows') el.querySelectorAll(':scope>li').forEach((li,i)=>li.style.setProperty('--d',(i*70)+'ms'));
  if(kind==='cards') [...el.children].forEach((c,i)=>c.style.setProperty('--d',(i*90)+'ms'));
  if(kind==='grow') [...el.children].forEach((c,i)=>c.style.setProperty('--d',(i*80)+'ms'));
}));
/* Peças vizinhas que entram juntas ganham um pequeno escalonamento */
document.querySelectorAll('[data-r]').forEach(el=>{
  const sibs=[...el.parentElement.children].filter(c=>c.dataset.r);
  if(!el.style.getPropertyValue('--d')) el.style.setProperty('--o',(sibs.indexOf(el)*90)+'ms');
});
const io = new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting) e.target.classList.add('in');
  else if(e.boundingClientRect.top > innerHeight*.5) e.target.classList.remove('in'); /* saiu por baixo: rearma */
}),{rootMargin:'0px 0px -10% 0px'});
document.querySelectorAll('[data-r]').forEach(el=>io.observe(el));
document.querySelectorAll('.hero .units i').forEach((u,i)=>u.style.setProperty('--i',i));

/* 4. Números que contam. Lê o número escrito (formato brasileiro), mantém prefixo, sufixo e casas decimais.
   Se outro script trocar o texto no meio da contagem, a contagem para e o texto novo fica. */
const COUNT = '.kpis b, .gap-legend .v, .units-cap b, .fig .v, .rail .big';
const NUM = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/;
function countUp(el){
  const txt = el.textContent, m = txt.match(NUM); if(!m) return;
  const raw = m[0], dec = (raw.split(',')[1]||'').length, to = parseFloat(raw.replace(/\./g,'').replace(',','.'));
  if(!(to>1)) return;
  const pre = txt.slice(0,m.index), post = txt.slice(m.index+raw.length);
  const fmt = v => pre + v.toLocaleString('pt-BR',{minimumFractionDigits:dec,maximumFractionDigits:dec}) + post;
  const dur = 1400, t0 = performance.now(); let last = fmt(0); el.textContent = last;
  (function tick(now){
    if(el.textContent !== last) return;
    const p = Math.min(1,(now-t0)/dur), e = 1-Math.pow(1-p,4);
    last = p<1 ? fmt(to*e) : txt; el.textContent = last;
    if(p<1) requestAnimationFrame(tick);
  })(t0);
}
const cio = new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting) return;
  cio.unobserve(e.target);
  const go = ()=>countUp(e.target);
  /* Na página inicial, espera a abertura em vídeo terminar */
  if(de.classList.contains('intro-on')){
    const mo = new MutationObserver(()=>{ if(!de.classList.contains('intro-on')){ mo.disconnect(); setTimeout(go,350); } });
    mo.observe(de,{attributes:true,attributeFilter:['class']});
  } else go();
}),{rootMargin:'0px 0px -8% 0px'});
document.querySelectorAll(COUNT).forEach(el=>cio.observe(el));

/* 2 e 3. Laço de rolagem */
const pins = [...document.querySelectorAll('[data-pin]')];
const deep = [...document.querySelectorAll('[data-depth]')];
const ribbons = [...document.querySelectorAll('.ribbon')];
function measure(){
  measureNav();
  pins.forEach(p=>{ p.style.setProperty('--pin', Math.min(navH, vh/Z - p.offsetHeight)+'px'); });
  frame();
}
function frame(){
  raf = 0;
  const y = scrollY;
  pins.forEach(p=>{
    const next = p.nextElementSibling; if(!next) return;
    const nt = next.getBoundingClientRect().top, pb = Math.min(vh, p.getBoundingClientRect().bottom);
    /* 0 enquanto a próxima seção ainda não passou da borda de baixo da fixada, 1 quando já a cobriu */
    const k = Math.max(0, Math.min(1, (pb - nt) / Math.max(1, pb - navH*Z)));
    p.style.setProperty('--k', k.toFixed(3));
  });
  deep.forEach(el=>{
    const r = el.getBoundingClientRect();
    if(r.bottom < -200 || r.top > vh + 200) return;
    const c = (r.top + r.height/2 - vh/2) / vh;      /* -1..1 em torno do centro da tela */
    el.style.translate = `0 ${(c * parseFloat(el.dataset.depth) * 100).toFixed(1)}px`;
  });
  ribbons.forEach(el=>{ el.style.backgroundPosition = `${(-y*.6).toFixed(1)}px 0`; });
  navFrame();
}
const tick = ()=>{ if(!raf) raf = requestAnimationFrame(frame); };
addEventListener('scroll', tick, {passive:true});
addEventListener('resize', measure);
addEventListener('load', measure);
if(document.fonts) document.fonts.ready.then(measure);
measure();
})();
