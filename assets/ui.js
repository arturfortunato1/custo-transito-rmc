/* Partes compartilhadas: navegação, faixa de status, rodapé, mapa, etiquetas de fonte, prevenção. */
(function(){
const D = window.RMC, M = window.M, F = M.fmt;
const esc = t => String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAGES = [
  ['index.html','Início','inicio'],
  ['sua-cidade.html','Calcule a sua cidade','sua-cidade'],
  ['municipios.html','Municípios','municipios'],
  ['municipio.html','Fichas','municipio'],
  ['calculadora.html','Por CID-10','calculadora'],
  ['quem-paga.html','Quem paga','quem-paga'],
  ['metodo.html','Método e fontes','metodo']
];
const page = (document.querySelector('[data-page]')||{dataset:{}}).dataset.page;
const inFrame = (()=>{try{return window.self!==window.top}catch(e){return true}})();

function bannerText(){
  return 'Versão para revisão. Mortes, internações, valores da tabela, despesas e população são dados oficiais. O custo além da tabela é uma estimativa com base no IPEA/ANTP.';
}

const nav = document.getElementById('nav');
if(nav) nav.outerHTML = `<header class="nav"><div class="wrap">
  <a class="brand" href="index.html"><i aria-hidden="true"></i>Custo do Trânsito <span>RMC</span></a>
  <nav class="links" aria-label="Páginas">${PAGES.map(([h,l,id])=>`<a href="${h}"${id===page?' aria-current="page"':''}>${l}</a>`).join('')}</nav>
</div></header>
${`<div class="strip"><div class="wrap"><i aria-hidden="true"></i><span>${bannerText()} <a href="metodo.html#fontes">Ver status das fontes</a></span></div></div>`}
<div class="print-only wrap"><span class="logo-plate"><img src="assets/fnp.png" alt="FNP" width="187" height="69"></span><span>Custo do Trânsito RMC · Frente Nacional de Prefeitas e Prefeitos · ${new Date().toLocaleDateString('pt-BR')}</span></div>`;

const foot = document.getElementById('footer');
if(foot) foot.outerHTML = `<footer class="site"><div class="wrap">
  <span class="logo-plate"><img src="assets/fnp.png" alt="Frente Nacional de Prefeitas e Prefeitos (FNP)" width="187" height="69"></span>
  <div>
    <nav aria-label="Rodapé">${PAGES.map(([h,l])=>`<a href="${h}">${l}</a>`).join('')}</nav>
    <p>Custo do Trânsito RMC, uma iniciativa da Frente Nacional de Prefeitas e Prefeitos (FNP) e da Coalizão de Cidades pela Redução de Mortes e Lesões no Trânsito, com piloto nos 20 municípios da Região Metropolitana de Campinas. Ano-base ${D.ano}. Fontes: DATASUS (SIM, SIH, SIGTAP), SIOPS, IBGE, metodologia IPEA e ANTP. O custo além da tabela é estimativa.</p>
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

/* Abreviações curtas para os quadrados do mapa */
const SHORT = {'santa-barbara-doeste':'S. Bárbara','santo-antonio-de-posse':'S. A. Posse','engenheiro-coelho':'Eng. Coelho','artur-nogueira':'A. Nogueira','nova-odessa':'N. Odessa','monte-mor':'Monte Mor'};

/* tilemap(el, {key, fmtv, current, href, neutral}). Sem dados comparáveis, fica neutro e mostra a população. */
function tilemap(el, o){
  const neutral = !!o.neutral;
  const key = neutral ? 'pop' : o.key, fmtv = neutral ? (v=>F.int(v)) : o.fmtv;
  const vals = M.cidades.map(c=>c[key]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  el.innerHTML = M.cidades.map(c=>{
    const p = hi>lo ? (c[key]-lo)/(hi-lo) : .5, pp = .08 + p*.92;
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

/* Barra de tipos de vítima (CID-10 V01–V89). grupos: lista de {nome,cid,cor,n,share}. */
function vitimas(el, grupos, label){
  const T=grupos.filter(v=>v.n>0);
  el.innerHTML = `<div class="vbar" aria-hidden="true">${T.map(v=>`<i style="flex:${v.share} 1 0;background:${v.cor}">${v.share>=.1?Math.round(v.share*100)+'%':''}</i>`).join('')}</div>
  <div class="vlist">${grupos.map(v=>`<div style="--c:${v.cor}"><b class="n">${Math.round(v.share*100)}%</b><span>${v.nome}, ${F.int(v.n)} ${label||'internações'}</span><span class="km">${v.cid}</span></div>`).join('')}</div>`;
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
      <div class="levers" aria-label="Principais alavancas"><span>Velocidade</span><span>Álcool</span><span>Motociclistas</span><span>Pontos críticos</span></div>
      <p class="small" style="margin-top:6px">${D.fatos.alcool.txt} (${D.fatos.alcool.fonte}).</p>
    </div>
    <div><div class="saves" id="${id}_s"></div><p class="small" style="margin-top:12px">Simulação sobre as estimativas desta página. A economia na saúde usa o custo estimado por internado, cenário conservador.</p></div>
  </div>`;
  const inp=document.getElementById(id);
  function upd(){
    const p=inp.value/100, e=M.economia(opt.get?opt.get():t,p);
    document.getElementById(id+'_o').textContent=inp.value+'%';
    document.getElementById(id+'_s').innerHTML=`
      <div><b class="n">${F.money(e.saude)}</b><span>a menos por ano na conta da saúde</span></div>
      <div><b class="n">${F.int(e.leitosDia)}</b><span>leitos-dia liberados, como ${F.dec(e.leitos)} leitos ocupados o ano inteiro</span></div>
      <div><b class="n">${F.int(e.internacoes)}</b><span>internações e ${F.int(e.obitos)} mortes a menos por ano</span></div>
      <div><b class="n">${F.money(e.total)}</b><span>a menos para a sociedade, no piso estimado</span></div>`;
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

window.UI = {esc, tilemap, gapbar, countUp, reduce, SHORT, src, ORG, vitimas, prevencao, inFrame};
})();
