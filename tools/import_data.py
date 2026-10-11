"""Lê /mnt/project-files/data/ e gera site/assets/data-real.js. Rodar de novo quando o thread de dados atualizar os arquivos."""
import json, pathlib, csv
DATA = pathlib.Path('/mnt/project-files/data')
OUT = pathlib.Path(__file__).resolve().parent.parent/'assets/data-real.js'
j = json.load(open(DATA/'rmc-municipios.json'))
CAMPOS = ['pop','pib_pc','obitos','internacoes','valor_sih_aih','dias_internacao','obitos_hospitalares_sih','obitos_ocorrencia_2024','obitos_2025_preliminar','desp_saude_total_2025','desp_saude_recursos_proprios_2025','pct_receita_propria_em_saude_2025']
mun = {}
for m in j['municipios']:
    mun[m['nome']] = {k: m[k] for k in ['ibge']+CAMPOS if m.get(k) is not None}
campos_reais = sorted({k for m in mun.values() for k in m if k in CAMPOS})

vit = {}
for r in csv.DictReader(open(DATA/'internacoes_sih_rmc_por_vitima.csv', encoding='utf-8')):
    if r['ano_atendimento'] != '2025': continue
    nome = 'RMC' if r['municipio'].startswith('RMC') else r['municipio']
    vit.setdefault(nome, {})[r['tipo_vitima']] = int(float(r['internacoes']))

obt = {}
for r in csv.DictReader(open(DATA/'obitos_sim_rmc.csv', encoding='utf-8')):
    if r['ano'] != '2024' or r['criterio'] != 'residencia': continue
    for k in ['pedestre','ciclista','motociclista','triciclo','automovel','caminhonete','veiculo_pesado','onibus','outros_terrestres']:
        obt[k] = obt.get(k, 0) + int(float(r[k] or 0))

siops = {}
for r in csv.DictReader(open(DATA/'despesa_saude_siops_rmc.csv', encoding='utf-8')):
    if r['ano'] != '2025': continue
    siops[r['cod_ibge6']] = {'uniao': float(r['transf_saude_uniao_recebida'] or 0), 'estado': float(r['transf_saude_estado_recebida'] or 0), 'total': float(r['desp_total_saude_empenhada'] or 0)}

sigtap = [{k: r[k] for k in ['codigo','procedimento','total_hospitalar_rs','media_permanencia_dias','url']} for r in csv.DictReader(open(DATA/'sigtap_procedimentos_trauma.csv', encoding='utf-8'))]
ipea = [{k: r[k] for k in ['id','estudo','ambito','parametro','unidade','valor_original','data_preco_original','valor_dez2025','nota']} for r in csv.DictReader(open(DATA/'parametros_custo_ipea_antp.csv', encoding='utf-8'))]
comp = [{k: r[k] for k in ['componente','participacao_pct']} for r in csv.DictReader(open(DATA/'composicao_custo_ipea_antp_2003.csv', encoding='utf-8'))]
pib = {}
for r in csv.DictReader(open(DATA/'pib_ibge_2023.csv', encoding='utf-8')):
    pib[r['municipio']] = float(r['pib_mil_reais'])*1000

out = {'atualizado': j.get('atualizado'), 'fontesJson': j.get('fontes'), 'municipios': mun, 'campos': campos_reais,
       'vitimas': vit, 'obitosTipo2024': obt, 'siops': siops, 'sigtap': sigtap, 'ipea': ipea, 'composicao': comp, 'pibTotal': pib}
OUT.write_text('/* Gerado por tools/import_data.py a partir de /mnt/project-files/data. Não editar à mão. */\nwindow.RMC_REAL = ' + json.dumps(out, ensure_ascii=False) + ';\n')
print('campos reais:', campos_reais); print('vítimas RMC 2025:', vit.get('RMC')); print('SIM 2024 tipo:', obt); print('sigtap', len(sigtap), 'ipea', len(ipea))
