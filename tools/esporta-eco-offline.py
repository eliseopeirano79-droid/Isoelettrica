"""Esporta il laboratorio Eco come singolo HTML apribile anche senza server."""
from base64 import b64encode
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
dest = Path(sys.argv[1])
shell = """<!doctype html><html lang="it"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Isoelettrica · Laboratorio Eco 47.8</title><style>
:root{color-scheme:dark;--panel:#17212b;--bg:#0a1016;--fg:#e9eef2;--line:#394651;--muted:#adbdc6;--accent:#b7e6cf}
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:var(--bg);color:var(--fg);font:16px system-ui}button,select{font:inherit;cursor:pointer;color:inherit;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:6px}.btn.on{background:#285446}#v-eco{height:100dvh}a{color:#9ee2cc}
""" + (root/'eco.css').read_text() + '</style><section id="v-eco" class="view on" aria-label="Laboratorio Eco"></section>'
def inline(source):
    return '<script>' + re.sub(r'</script', r'<\\/script', source, flags=re.I) + '</script>\n'

parts = [shell]
page = (root/'ambulatorio-eco.html').read_text()
for path in re.findall(r'<script src="([^"?]+)\?v=[^"]+"></script>', page):
    if path == 'ambulatorio.js':
        continue
    parts.append(inline((root/path).read_text()))
    if path == 'three.min.js':
        models = []
        for name in ('heart-eco.glb','torace-eco.glb'):
            encoded = b64encode((root/'prototipo-cuore'/name).read_bytes()).decode('ascii')
            models.append(repr(name)+":'"+encoded+"'")
        parts.append(inline("(()=>{const encoded={"+','.join(models)+"}, urls={};"
            "THREE.DefaultLoadingManager.setURLModifier(url=>{const name=url.split('/').pop().split('?')[0];"
            "if(!Object.hasOwn(encoded,name))return url;"
            "if(!urls[name]){const s=atob(encoded[name]),b=new Uint8Array(s.length);"
            "for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);"
            "urls[name]=URL.createObjectURL(new Blob([b],{type:'model/gltf-binary'}));}return urls[name];});})();"))
parts.append('<details style="padding:1em"><summary>Fonti e licenze dei modelli</summary><pre style="white-space:pre-wrap">')
from html import escape
parts.append(escape((root/'prototipo-cuore/ATTRIBUZIONI.md').read_text()))
parts.append('</pre></details></html>')
dest.write_text('\n'.join(parts))
