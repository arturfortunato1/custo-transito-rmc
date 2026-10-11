/* Modelo de custos. Entradas reais (SIM, SIH, SIGTAP, SIOPS, IBGE) e referências IPEA/ANTP corrigidas pelo IPCA.
   Nada aqui inventa número: onde falta dado (dias de UTI) o resultado é null e a página mostra "indisponível". */
(function(){
const D = window.RMC;
const REF = D.ref;

const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const fmt={
  int:v=>new Intl.NumberFormat('pt-BR').format(Math.round(v)),
  brl:v=>BRL.format(v),
  money(v){const a=Math.abs(v);
    if(a>=1e9)return 'R$ '+(v/1e9).toLocaleString('pt-BR',{maximumFractionDigits:2})+' bi';
    if(a>=1e6)return 'R$ '+(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mi';
    if(a>=1e4)return 'R$ '+(v/1e3).toLocaleString('pt-BR',{maximumFractionDigits:0})+' mil';
    return BRL.format(v);},
  x:v=>v.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'×',
  x0:v=>Math.round(v).toLocaleString('pt-BR')+'×',
  r2:v=>'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),
  r0:v=>'R$ '+Math.round(v).toLocaleString('pt-BR'),
  dec:(v,d=1)=>v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}),
  pct:v=>Math.round(v*100)+'%'
};

/* Média da RMC, usada só quando quem digita não informa o valor pago ou os dias de internação. */
const MEDIA = (function(){
  const m=D.municipios, int=m.reduce((s,c)=>s+c.internacoes,0);
  return {pagoPorInternacao:m.reduce((s,c)=>s+c.valorAih,0)/int, diasPorInternacao:m.reduce((s,c)=>s+c.diasInternacao,0)/int};
})();

/* Cenário de custo hospitalar por internado. conservador: IPEA "moderado"; medio: IPEA "médio". */
const CENARIOS = {conservador:{lbl:'Conservador', custo:REF.hospModerado}, medio:{lbl:'Médio', custo:REF.hospMedio}};
let cenarioAtual = 'conservador';

/* Um território (cidade, região ou números digitados). */
function territorio(t, cenario){
  cenario = cenario||cenarioAtual;
  const custoInt = CENARIOS[cenario].custo;
  const pagoInformado = t.valorAih>0;
  const pago = pagoInformado ? t.valorAih : t.internacoes*MEDIA.pagoPorInternacao;
  const diasInformado = t.diasInternacao>0;
  const leitosDia = diasInformado ? t.diasInternacao : t.internacoes*MEDIA.diasPorInternacao;
  const hospEst = t.internacoes*custoInt;
  return Object.assign({}, t, {
    cenario, pago, pagoInformado, diasInformado, leitosDia, leitosAno:leitosDia/365,
    utiDias: t.diasUti>0 ? t.diasUti : null,
    tab:pago, real:hospEst, gap:hospEst-pago, fator:pago>0?hospEst/pago:0, custoInt,
    realPor100k:hospEst/t.pop*1e5, pagoPor100k:pago/t.pop*1e5, obitosPor100k:t.obitos/t.pop*1e5, internPor100k:t.internacoes/t.pop*1e5
  });
}

const S = {cidades:[], regiao:null, bySlug:{}};
function montar(){
  S.cidades = D.municipios.map(c=>territorio(c));
  const soma = k => S.cidades.reduce((s,c)=>s+(c[k]||0),0);
  const pop=soma('pop');
  S.regiao = territorio({nome:'Região Metropolitana de Campinas', slug:'rmc', pop,
    obitos:soma('obitos'), internacoes:soma('internacoes'), valorAih:soma('valorAih'), diasInternacao:soma('diasInternacao'),
    obitosHosp:soma('obitosHosp'), pib:soma('pibTotal')/pop, pibTotal:soma('pibTotal'),
    despSaude:soma('despSaude'), despPropria:soma('despPropria'), transfUniao:soma('transfUniao'), transfEstado:soma('transfEstado'),
    vitimas:D.vitimasRMC});
  S.bySlug = Object.fromEntries(S.cidades.map(c=>[c.slug,c]));
  if(window.M){ window.M.cidades=S.cidades; window.M.regiao=S.regiao; window.M.bySlug=S.bySlug; }
}
montar();

function rank(key){ return [...S.cidades].sort((a,b)=>b[key]-a[key]); }
function posicao(slug,key){ return rank(key).findIndex(c=>c.slug===slug)+1; }

/* Composição do custo por vítima (IPEA/ANTP 2003, Tabela 16) agrupada por quem arca com o custo. */
const COMP = Object.fromEntries(D.composicao.map(r=>[r.componente,+r.participacao_pct]));
const GRUPOS_IPEA = [
  {id:'prod', lbl:'Produção perdida', who:'Economia local e famílias', cor:'var(--c-prod)', itens:['Perda de produção','Impacto familiar']},
  {id:'veic', lbl:'Veículos e propriedade', who:'Proprietários, seguradoras e terceiros', cor:'var(--c-dano)', itens:['Danos a veículos','Outro meio de transporte','Danos à propriedade de terceiros']},
  {id:'pub',  lbl:'Poder público fora da saúde', who:'Prefeitura, estado, polícia e Justiça', cor:'var(--c-pref)', itens:['Processos judiciais','Remoção de veículos','Danos a mobiliário urbano','Danos à sinalização','Atendimento policial','Agentes de trânsito']},
  {id:'cong', lbl:'Congestionamento', who:'Quem fica parado', cor:'var(--v-outros)', itens:['Congestionamentos']},
  {id:'prev', lbl:'Previdência', who:'INSS, como transferência de renda', cor:'var(--c-inss)', itens:['Previdenciários'], excl:true}
];
const TOTAL_PCT = Object.values(COMP).reduce((a,b)=>a+b,0);

/* Quem paga. A saúde usa o custo por internado; os demais componentes usam o custo por vítima do IPEA/ANTP,
   sem a parte médica, que já está na saúde. Feridos = internações, então o total é um piso. */
function contaCompleta(t, incluirInss){
  const B = t.obitos*REF.vitimaMorte + t.internacoes*REF.vitimaFerido;
  const ocorr = Math.round((t.obitos+t.internacoes)/1.3);
  const G = [
    {id:'sus', lbl:'Tabela SUS', who:'União, estado e município, pelos valores da tabela SIGTAP', cor:'var(--sus)', saude:true, items:[
      {lbl:t.pagoInformado?'Internações pagas pelas AIH (SIH 2025)':'Internações, valor médio da RMC', d:t.pagoInformado?'valor total pago pelo SUS':'valor médio pago por internação na RMC × internações', val:t.pago}]},
    {id:'gap', lbl:'Fundos de saúde municipal e estadual', who:'O que o hospital gasta além da tabela', cor:'var(--hatch)', saude:true, items:[
      {lbl:'Custo hospitalar estimado menos tabela', d:`${fmt.int(t.internacoes)} internações × ${fmt.brl(t.custoInt)} por internado (IPEA/ANTP, cenário ${CENARIOS[t.cenario].lbl.toLowerCase()}), menos o valor pago`, val:t.gap}]}
  ];
  GRUPOS_IPEA.forEach(g=>{
    G.push({id:g.id, lbl:g.lbl, who:g.who, cor:g.cor, excl:g.excl&&!incluirInss, tot:0,
      items:g.itens.map(k=>({lbl:k, d:`${COMP[k].toLocaleString('pt-BR')}% do custo por vítima, IPEA/ANTP 2003`, val:B*(COMP[k]||0)/TOTAL_PCT}))});
  });
  G.forEach(g=>g.tot=g.items.reduce((s,x)=>s+x.val,0));
  const total = G.filter(g=>!g.excl).reduce((s,g)=>s+g.tot,0);
  const pibTot = t.pibTotal || t.pib*t.pop;
  return {grupos:G, total, saude:t.real, ocorr, B, pibShare: pibTot ? total/pibTot : 0};
}

/* Prevenção: economia proporcional à redução de vítimas. */
function economia(t, pct){
  const c = contaCompleta(t,false);
  return {saude:t.real*pct, pagoSus:t.pago*pct, total:c.total*pct, leitosDia:t.leitosDia*pct, leitos:t.leitosAno*pct,
    obitos:t.obitos*pct, internacoes:t.internacoes*pct, utiDias:t.utiDias!=null?t.utiDias*pct:null};
}

/* Calculadora por CID-10. Procedimento e valor de tabela vêm do SIGTAP (12/2025). A classe de gravidade
   (moderado ou grave) é escolha do site, para escolher a referência de custo hospitalar do IPEA/ANTP. */
const CIDS=[
 ['S06.0','Concussão cerebral','Traumatismo cranioencefálico','0308010019','mod'],
 ['S06.3','Traumatismo cerebral focal (hematoma intracerebral)','Traumatismo cranioencefálico','0403010284','grave'],
 ['S06.4','Hemorragia epidural','Traumatismo cranioencefálico','0403010276','grave'],
 ['S06.5','Hemorragia subdural traumática','Traumatismo cranioencefálico','0403010306','grave'],
 ['S12.1','Fratura da segunda vértebra cervical (áxis)','Coluna e medula','0408030747','grave'],
 ['S32.4','Fratura do acetábulo','Pelve e quadril','0408040297','mod'],
 ['S32.8','Fratura do anel pélvico','Pelve e quadril','0408040262','mod'],
 ['S72.0','Fratura do colo do fêmur','Membros inferiores','0408050489','mod'],
 ['S72.1','Fratura transtrocantérica','Membros inferiores','0408050632','mod'],
 ['S72.3','Fratura da diáfise do fêmur','Membros inferiores','0408050519','mod'],
 ['S82.2','Fratura da diáfise da tíbia','Membros inferiores','0408050500','mod'],
 ['S82.8','Fratura bimaleolar ou trimaleolar do tornozelo','Membros inferiores','0408050497','mod'],
 ['S88.1','Amputação traumática da perna','Amputações','0408050012','grave'],
 ['S78.1','Amputação traumática da coxa','Amputações','0408050012','grave'],
 ['S42.3','Fratura da diáfise do úmero','Membros superiores','0408020393','mod'],
 ['S52.4','Fratura da diáfise do rádio e da ulna','Membros superiores','0408020423','mod'],
 ['S27.0','Pneumotórax traumático','Tórax e abdome','0308010035','grave'],
 ['S36.0','Traumatismo do baço','Tórax e abdome','0308010035','grave'],
 ['S36.1','Traumatismo do fígado','Tórax e abdome','0308010035','grave'],
 ['T07','Traumatismos múltiplos','Politraumatismo','0308010043','grave']
].map(([cid,nome,grupo,cod,classe])=>{
  const p = D.sigtap.find(x=>x.codigo===cod);
  return {cid,nome,grupo,classe,codigo:cod,linha:p.procedimento,tabela:+p.total_hospitalar_rs,permanencia:+p.media_permanencia_dias||0,url:p.url,
    custo: classe==='grave'?REF.hospGrave:REF.hospModerado};
});

function setCenario(c){ if(CENARIOS[c]){ cenarioAtual=c; montar(); } }

window.M = {territorio, cidades:S.cidades, bySlug:S.bySlug, regiao:S.regiao, rank, posicao, contaCompleta, economia,
  CIDS, CENARIOS, MEDIA, fmt, setCenario, cenario:()=>cenarioAtual, GRUPOS_IPEA, COMP};
})();
