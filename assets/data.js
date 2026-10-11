/* Dados do site Custo do Trânsito RMC.
   Tudo que é número de saúde, população e PIB vem de assets/data-real.js (gerado por tools/import_data.py a partir de /mnt/project-files/data).
   Aqui ficam só a lista de municípios, o mapa esquemático, os parâmetros de cálculo e os textos de fonte. */
(function(){
const R = window.RMC_REAL;
if(!R){ document.body.innerHTML='<p style="padding:24px">Faltam os dados (assets/data-real.js). Rode tools/import_data.py.</p>'; throw new Error('RMC_REAL ausente'); }

/* nome, slug, posição no mapa esquemático [coluna, linha] */
const LISTA = [
  ['Americana','americana',[1,1]],['Artur Nogueira','artur-nogueira',[3,1]],['Campinas','campinas',[3,3]],['Cosmópolis','cosmopolis',[2,1]],
  ['Engenheiro Coelho','engenheiro-coelho',[3,0]],['Holambra','holambra',[4,1]],['Hortolândia','hortolandia',[2,3]],['Indaiatuba','indaiatuba',[2,4]],
  ['Itatiba','itatiba',[5,3]],['Jaguariúna','jaguariuna',[3,2]],['Monte Mor','monte-mor',[1,4]],['Morungaba','morungaba',[5,2]],
  ['Nova Odessa','nova-odessa',[1,2]],['Paulínia','paulinia',[2,2]],['Pedreira','pedreira',[4,2]],["Santa Bárbara d'Oeste",'santa-barbara-doeste',[0,1]],
  ['Santo Antônio de Posse','santo-antonio-de-posse',[5,1]],['Sumaré','sumare',[1,3]],['Valinhos','valinhos',[4,3]],['Vinhedo','vinhedo',[4,4]]
];

/* Tipos de vítima pela causa externa (CID-10, capítulo XX). Cada grupo soma tipos do SIH/SIM. */
const TIPOS = [
  {id:'moto',  nome:'Motociclistas',          cid:'V20–V29', cor:'var(--v-moto)',  de:['motociclista']},
  {id:'ped',   nome:'Pedestres',              cid:'V01–V09', cor:'var(--v-ped)',   de:['pedestre']},
  {id:'bici',  nome:'Ciclistas',              cid:'V10–V19', cor:'var(--v-bici)',  de:['ciclista']},
  {id:'auto',  nome:'Ocupantes de automóvel', cid:'V40–V59', cor:'var(--v-auto)',  de:['automovel','caminhonete']},
  {id:'outros',nome:'Outros',                 cid:'V30–V39, V60–V89', cor:'var(--v-outros)', de:['triciclo','veiculo_pesado','onibus','outros_terrestres']}
];
function agrupar(porTipo){
  const tot = Object.values(porTipo||{}).reduce((a,b)=>a+b,0);
  return TIPOS.map(t=>{const n=t.de.reduce((s,k)=>s+((porTipo||{})[k]||0),0);return {...t,n,share:tot?n/tot:0}});
}

const municipios = LISTA.map(([nome,slug,tile])=>{
  const r = R.municipios[nome];
  if(!r) throw new Error('Sem dados para '+nome);
  const sio = R.siops[(r.ibge||'').slice(0,6)] || {};
  return {
    nome, slug, tile, ibge:r.ibge, pop:r.pop, pib:r.pib_pc,
    obitos:r.obitos, obitosOcorrencia:r.obitos_ocorrencia_2024, obitos2025:r.obitos_2025_preliminar, obitosHosp:r.obitos_hospitalares_sih,
    internacoes:r.internacoes, valorAih:r.valor_sih_aih, diasInternacao:r.dias_internacao, diasUti:null,
    despSaude:r.desp_saude_total_2025, despPropria:r.desp_saude_recursos_proprios_2025, pctPropria:r.pct_receita_propria_em_saude_2025,
    transfUniao:sio.uniao, transfEstado:sio.estado,
    vitimas:agrupar(R.vitimas[nome]), pibTotal:R.pibTotal[nome]
  };
});

const ipea = Object.fromEntries(R.ipea.map(r=>[r.id,+r.valor_dez2025]));

window.RMC = {
  ano: 2025, anoObitos: 2024, status:'parcial', atualizado: R.atualizado, comparavel: true,
  municipios, tipos:TIPOS, agrupar, vitimasRMC: agrupar(R.vitimas.RMC), obitosTipoRMC: agrupar(R.obitosTipo2024),
  sigtap: R.sigtap, ipeaTabela: R.ipea, composicao: R.composicao,
  /* Referências IPEA/ANTP corrigidas pelo IPCA até dez/2025. Estimativas, com margem de ±50% no estudo original. */
  ref: {
    hospModerado: ipea.ipea03_hosp_internado_moderado, hospMedio: ipea.ipea03_hosp_internado_medio, hospGrave: ipea.ipea03_hosp_internado_grave,
    hospNaoInternado: ipea.ipea03_hosp_nao_internado_medio,
    vitimaMorte: ipea.ipea03_vitima_morte, vitimaFerido: ipea.ipea03_vitima_ferido
  },
  utiDiaria: 600, /* SIGTAP, diária de UTI adulto II, competência 12/2025 */
  fatos: {
    motoMarioGatti: {txt:'Na Rede Mário Gatti, em Campinas, 73% das 2.724 vítimas de trânsito atendidas desde o início de 2025 estavam de moto.', fonte:'Correio da Manhã, maio de 2026', url:'https://www.correiodamanha.com.br/nacional/sao-paulo/campinas/2026/05/284694-campinas-reduz-em-63-as-mortes-em-vias-urbanas-e-dario-vai-liderar-movimento-nacional-sobre-transito.html'},
    campinasReducao: {pct:.32, txt:'Campinas reduziu em 32% as mortes em vias urbanas em 2026.', fonte:'Emdec, Prefeitura de Campinas', url:'https://www.correiodamanha.com.br/nacional/sao-paulo/campinas/2026/05/284694-campinas-reduz-em-63-as-mortes-em-vias-urbanas-e-dario-vai-liderar-movimento-nacional-sobre-transito.html'},
    alcool: {txt:'Em Campinas, o álcool aparece em metade dos sinistros com morte.', fonte:'Emdec'},
    fnpPib: {txt:'A FNP cita perdas de até 3,8% do PIB com sinistros de trânsito.', fonte:'FNP, lançamento da Coalizão, setembro de 2026', url:'https://brasil61.com/n/acidentes-de-transito-pressionam-rede-publica-de-saude-e-prefeituras-lancam-coalizao-nacional-bras2617109'}
  },
  fontes: [
    {id:'sim',   nome:'SIM, Sistema de Informações sobre Mortalidade', orgao:'DATASUS / Ministério da Saúde', uso:'Mortes por acidente de transporte terrestre (CID-10 V01 a V89), por município de residência, 2024 (último ano fechado).', real:true, url:'http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sim/cnv/obt10sp.def'},
    {id:'sih',   nome:'SIH/SUS, Sistema de Informações Hospitalares', orgao:'DATASUS / Ministério da Saúde', uso:'Internações pagas pelo SUS por causa externa V01–V89, valor pago, dias de permanência e tipo de vítima, 2025. É um piso: não inclui rede privada, convênios nem atendimentos sem internação. Dias de UTI não estão disponíveis.', real:true, url:'http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sih/cnv/frsp.def'},
    {id:'sigtap',nome:'SIGTAP, Tabela de Procedimentos do SUS', orgao:'Ministério da Saúde', uso:'Valores da tabela de 23 procedimentos típicos de trauma e da diária de UTI, competência 12/2025.', real:true, url:'http://sigtap.datasus.gov.br/'},
    {id:'siops', nome:'SIOPS, orçamentos públicos em saúde', orgao:'Ministério da Saúde', uso:'Despesa municipal total com saúde, recursos próprios e transferências do SUS, 2025.', real:true, url:'http://siops.datasus.gov.br/consleirespfiscal.php'},
    {id:'ibge',  nome:'IBGE, Estimativas da População 2025 e PIB dos Municípios 2023', orgao:'IBGE', uso:'População em 1º/jul/2025 e PIB per capita de 2023.', real:true, url:'https://cidades.ibge.gov.br/'},
    {id:'ipea',  nome:'IPEA e ANTP, custos dos acidentes de trânsito', orgao:'IPEA / ANTP', uso:'Custo hospitalar por internado, custo por vítima e composição do custo. Valores de 2003 e 2015 corrigidos pelo IPCA até dez/2025: são estimativas, com margem de ±50% no estudo original.', real:'estimativa', url:'https://repositorio.ipea.gov.br/bitstreams/fe27e3f0-6ee3-497d-bc4f-7e0f4800f0dc/download'}
  ]
};
})();
