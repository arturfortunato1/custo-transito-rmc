/* Abertura em tela cheia: um clipe curto toca uma vez e o site "abre" para o conteúdo.
   DESLIGADA até existir um clipe real e livre em assets/intro.mp4 (com assets/intro.jpg de capa).
   Para ligar: ENABLED = true. Para ver sem ligar: abrir index.html?intro=1.
   Vai direto ao conteúdo quando: reduzir movimento, economia de dados, conexão lenta, já viu nesta visita,
   endereço com âncora, clipe que não carrega, ou toque em "Pular". */
(function(){
const ENABLED = false, SRC = 'assets/intro.mp4', POSTER = 'assets/intro.jpg', MAX_MS = 5000, LOAD_MS = 2500;
const de = document.documentElement;
const asked = /[?&]intro=1\b/.test(location.search);
if(!(ENABLED||asked)) return;
let seen=false; try{ seen = sessionStorage.getItem('rmc-intro')==='1' && !asked; }catch(e){}
const c = navigator.connection||{};
const skipAll = matchMedia('(prefers-reduced-motion: reduce)').matches || c.saveData || /(^|-)2g$/.test(c.effectiveType||'') || /3g/.test(c.effectiveType||'') || seen || (location.hash && location.hash.length>1);
if(skipAll) return;
de.classList.add('intro-on');
function done(){ de.classList.remove('intro-on'); de.classList.add('intro-open'); try{sessionStorage.setItem('rmc-intro','1')}catch(e){}
  const o=document.getElementById('intro'); if(o){ o.classList.add('out'); setTimeout(()=>o.remove(),900); } }
function build(){
  const o=document.createElement('div'); o.id='intro'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Abertura');
  o.innerHTML=`<video muted playsinline autoplay preload="auto" poster="${POSTER}"><source src="${SRC.replace(/\.mp4$/,".webm")}" type="video/webm"><source src="${SRC}" type="video/mp4"></video><button type="button" class="intro-skip">Pular</button>`;
  document.body.appendChild(o);
  const v=o.querySelector('video'); let started=false, finished=false;
  const end=()=>{ if(finished) return; finished=true; done(); };
  v.addEventListener('playing',()=>{started=true; setTimeout(end,MAX_MS)});
  v.addEventListener('ended',end); v.addEventListener('error',end,true); o.querySelector('.intro-skip').addEventListener('click',end);
  addEventListener('keydown',e=>{ if(e.key==='Escape') end(); });
  setTimeout(()=>{ if(!started) end(); },LOAD_MS);
  const p=v.play(); if(p&&p.catch) p.catch(end);
}
if(document.body) build(); else document.addEventListener('DOMContentLoaded',build);
setTimeout(()=>{ if(de.classList.contains('intro-on')&&!document.getElementById('intro')) done(); },4000);
})();
