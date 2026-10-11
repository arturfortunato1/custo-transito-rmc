"""Monta o site: src/*.html + assets/head.html -> *.html na raiz de site/.
   Com --artifact DIR, gera também uma cópia para a prévia no claude.ai (página inicial sem o esqueleto <html>)."""
import pathlib, re, shutil, sys
root = pathlib.Path(__file__).parent
head = (root/'assets/head.html').read_text()
pages = sorted((root/'src').glob('*.html'))
for p in pages:
    (root/p.name).write_text(p.read_text().replace('{{HEAD}}', head))
if '--artifact' in sys.argv:
    out = pathlib.Path(sys.argv[sys.argv.index('--artifact')+1]); out.mkdir(parents=True, exist_ok=True)
    shutil.copytree(root/'assets', out/'assets', dirs_exist_ok=True)
    for p in pages:
        html = (root/p.name).read_text()
        if p.name == 'index.html':
            html = re.sub(r'<!doctype html>\s*<html[^>]*>\s*<head>', '', html, flags=re.I)
            html = re.sub(r'<meta charset[^>]*>\s*<meta name="viewport"[^>]*>\s*', '', html)
            html = html.replace('</head>', '').replace('</body>', '').replace('</html>', '')
            html = re.sub(r'<body([^>]*)>', r'<div\1 hidden></div>', html)
        (out/p.name).write_text(html)
print('ok', [p.name for p in pages])
