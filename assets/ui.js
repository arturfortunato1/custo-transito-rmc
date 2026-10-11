/* Partes compartilhadas: navegação, faixa de status, rodapé, mapa, etiquetas de fonte, prevenção. */
(function(){
const D = window.RMC, M = window.M, F = M.fmt;
const esc = t => String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAGES = [
  ['index.html','Início','inicio'],
  ['municipio.html','Sua cidade','municipio'],
  ['calculadora.html','Calculadora','calculadora'],
  ['metodo.html','Método','metodo']
];
const FOOT = [['index.html','Início'],['municipio.html','Ficha da cidade'],['municipios.html','Municípios'],['sua-cidade.html','Calcule a sua cidade'],['calculadora.html','Por CID-10'],['quem-paga.html','Quem paga'],['metodo.html','Método e fontes']];
const ALIAS = {'municipios':'municipio','sua-cidade':'municipio','quem-paga':'municipio'};
const page = (document.querySelector('[data-page]')||{dataset:{}}).dataset.page;
const inFrame = (()=>{try{return window.self!==window.top}catch(e){return true}})();

function bannerText(){
  return 'Versão para revisão · <span class="src ok">dado oficial</span> <span class="src est">estimativa</span>';
}

const nav = document.getElementById('nav');
if(nav) nav.outerHTML = `<header class="nav"><div class="wrap">
  <a class="brand" href="index.html"><i aria-hidden="true"></i>Custo do Trânsito <span>RMC</span></a>
  <nav class="links" aria-label="Páginas">${PAGES.map(([h,l,id])=>`<a href="${h}"${id===(ALIAS[page]||page)?' aria-current="page"':''}>${l}</a>`).join('')}</nav>
</div></header>
<div class="print-only wrap"><span class="logo-plate"><img src="assets/fnp.png" alt="FNP" width="187" height="69"></span><span>Custo do Trânsito RMC · Frente Nacional de Prefeitas e Prefeitos · ${new Date().toLocaleDateString('pt-BR')}</span></div>`;

const foot = document.getElementById('footer');
if(foot) foot.outerHTML = `<footer class="site"><div class="wrap">
  <span class="logo-plate"><img src="assets/fnp.png" alt="Frente Nacional de Prefeitas e Prefeitos (FNP)" width="187" height="69"></span>
  <div>
    <nav aria-label="Rodapé">${FOOT.map(([h,l])=>`<a href="${h}">${l}</a>`).join('')}</nav>
    <p>Uma iniciativa da FNP e da Coalizão de Cidades pela Redução de Mortes e Lesões no Trânsito. Fontes: DATASUS, IBGE, SIOPS, IPEA/ANTP.</p>
    <p class="keyline"><span class="src ok">dado oficial</span> dado oficial <span class="src est">estimativa</span> estimativa</p>
  </div>
</div></footer>`;

/* Linha de autoria, para o topo das páginas principais */
const ORG = `<p class="orgline"><b>Frente Nacional de Prefeitas e Prefeitos</b><span>Coalizão de Cidades pela Redução de Mortes e Lesões no Trânsito</span></p>`;

/* Etiqueta de origem de um número: dado oficial ou estimativa */
const SRC = {
  pop:['ok','dado oficial · IBGE 2025'], pib:['ok','dado oficial · IBGE 2023'], obitos:['ok','dado oficial · SIM 2024'],
  internacoes:['ok','dado oficial · SIH/SUS 2025'], dias:['ok','dado oficial · SIH/SUS 2025, dias de internação'], pago:['ok','dado oficial · SIH/SUS 2025'],
  custo:['est','estimativa · IPEA/ANTP corrigido pelo IPCA'], siops:['ok','dado oficial · SIOPS 2025']
};
function src(field, label){ const x=SRC[field]||['est',label||'estimativa']; return `<span class="src ${x[0]}">${label||x[1]}</span>`; }
/* Uma marca só: ● oficial, ○ estimativa. O texto da fonte vira dica ao tocar ou passar o mouse. */
function dots(root){
  (root||document).querySelectorAll('.src:not([data-d])').forEach(e=>{
    const t=e.textContent.trim(); e.dataset.d=1; e.dataset.tip=t; e.setAttribute('tabindex','0'); e.setAttribute('role','img'); e.setAttribute('aria-label',t);
    if(!e.closest('.strip')) e.textContent=''; });
}
new MutationObserver(()=>dots()).observe(document.documentElement,{childList:true,subtree:true}); dots();

/* Abreviações curtas para os quadrados do mapa */
const SHORT = {'santa-barbara-doeste':'S. Bárbara','santo-antonio-de-posse':'S. A. Posse','engenheiro-coelho':'Eng. Coelho','artur-nogueira':'A. Nogueira','nova-odessa':'N. Odessa','monte-mor':'Monte Mor'};

/* tilemap(el, {key, fmtv, current, href, neutral}). Sem dados comparáveis, fica neutro e mostra a população. */
function tilemap(el, o){
  const neutral = !!o.neutral;
  const key = neutral ? 'pop' : o.key, fmtv = neutral ? (v=>F.int(v)) : o.fmtv;
  const vals = M.cidades.map(c=>c[key]);
  const sorted = [...vals].sort((a,b)=>a-b), n = sorted.length;
  el.innerHTML = M.cidades.map(c=>{
    const q = sorted.indexOf(c[key])/(n-1), p = Math.min(4,Math.floor(q*5))/4, pp = .08 + p*.92;
    return `<a class="tile${neutral?' neutral':''}${!neutral&&pp>.62?' hot':''}${c.slug===o.current?' on':''}" style="grid-column:${c.tile[0]+1};grid-row:${c.tile[1]+1};--p:${pp.toFixed(3)}"
      href="${o.href?o.href(c):'municipio.html#'+c.slug}" title="${esc(c.nome)}: ${fmtv(c[key])}${neutral?' habitantes':''}" aria-label="${esc(c.nome)}">
      <b>${esc(SHORT[c.slug]||c.nome)}</b><small>${fmtv(c[key])}</small></a>`;
  }).join('');
  return neutral;
}

function gapbar(tab, real, cls){
  const s = real ? tab/real*100 : 0;
  return `<div class="gapbar ${cls||''}" role="img" aria-label="Tabela SUS ${F.money(tab)} de um custo real de ${F.money(real)}"><span class="s" style="flex-basis:${s}%"></span><span class="g"></span></div>`;
}

/* Gráfico de unidades: 1 quadrado azul pago, o resto tracejado de custo. */
function unitchart(tab, real){
  const k = tab>0 ? Math.max(2,Math.min(80,Math.round(real/tab))) : 2;
  return `<div class="units" role="img" aria-label="Para cada R$ 1 pago pelo SUS, a conta estimada é de R$ ${k}"><i class="p"></i>${'<i></i>'.repeat(k-1)}</div>
  <div class="units-cap"><span class="p"><b>R$ 1</b> pago pela tabela</span><span><b>R$ ${k}</b> de custo estimado</span></div>`;
}

/* Barra fixa no celular: resumo do resultado, que leva ao resultado completo ao tocar. */
function stickybar(targetId){
  const a=document.createElement('a'); a.className='sbar'; a.href='#'+targetId; document.body.appendChild(a); document.body.classList.add('has-sbar');
  const t=document.getElementById(targetId);
  if('IntersectionObserver' in window&&t){ new IntersectionObserver(e=>a.classList.toggle('on',!e[0].isIntersecting),{threshold:.15}).observe(t); } else a.classList.add('on');
  return html=>{a.innerHTML=html};
}

/* Barra de tipos de vítima (CID-10 V01–V89). grupos: lista de {nome,cid,cor,n,share}. */
function vitimas(el, grupos, label, compact){
  const T=grupos.filter(v=>v.n>0);
  el.innerHTML = `<div class="vbar" aria-hidden="true">${T.map(v=>`<i style="flex:${v.share} 1 0;background:${v.cor}">${v.share>=.1?Math.round(v.share*100)+'%':''}</i>`).join('')}</div>
  ${compact?`<div class="vkey">${grupos.filter(v=>v.n>0).map(v=>`<span title="${esc(v.cid)}"><i style="background:${v.cor}"></i>${v.nome}</span>`).join('')}</div>`:''}
  <div class="vlist"${compact?' hidden':''}>${grupos.map(v=>`<div style="--c:${v.cor}"><b class="n">${Math.round(v.share*100)}%</b><span>${v.nome}, ${F.int(v.n)} ${label||'internações'}</span><span class="km">${v.cid}</span></div>`).join('')}</div>`;
}

/* Bloco de prevenção: slider de redução e economia resultante */
function prevencao(el, t, opt){
  opt=opt||{};
  const id = el.id+'_r';
  el.innerHTML = `<div class="prev">
    <div class="slider">
      <label for="${id}">Se ${esc(opt.nome||'a região')} reduzir mortes e internações em</label>
      <output for="${id}" id="${id}_o" class="n">20%</output>
      <input type="range" id="${id}" min="5" max="60" step="5" value="${opt.pct||20}">
    </div>
    <div><div class="saves" id="${id}_s"></div></div>
  </div>`;
  const inp=document.getElementById(id);
  function upd(){
    const p=inp.value/100, e=M.economia(opt.get?opt.get():t,p);
    document.getElementById(id+'_o').textContent=inp.value+'%';
    document.getElementById(id+'_s').innerHTML=`
      <div><b class="n">${F.money(e.saude)}</b><span>a menos por ano na saúde ${src('custo')}</span></div>
      <div><b class="n">${F.int(e.leitosDia)}</b><span>leitos-dia livres</span></div>`;
  }
  inp.addEventListener('input',upd); upd();
  return upd;
}

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Anima uma razão de 1 até o valor final (o "R$ 1 vira R$ X" do topo) */
function countUp(el, to, render, dur){
  if(reduce()){ el.textContent = render(to); return; }
  const t0 = performance.now(); dur = dur||1300;
  (function tick(now){ const p=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-p,3);
    el.textContent = render(1+(to-1)*e); if(p<1) requestAnimationFrame(tick); else el.textContent = render(to); })(t0);
}

window.UI = {unitchart, stickybar, esc, tilemap, gapbar, countUp, reduce, SHORT, src, ORG, vitimas, prevencao, inFrame};
})();
