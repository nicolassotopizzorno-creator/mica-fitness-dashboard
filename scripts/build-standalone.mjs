import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const db=JSON.parse(read('dist/history.json'));
for(const session of db.sessions)for(const evidence of session.automatic?.evidence||[]){
  if(evidence.path&&/^evidence\/[a-zA-Z0-9_./-]+$/.test(evidence.path)&&!evidence.path.includes('..')){
    const extension=evidence.path.split('.').at(-1).toLowerCase();
    const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'}[extension];
    const file=new URL('dist/'+evidence.path,root);
    if(mime&&fs.existsSync(file))evidence.path='data:'+mime+';base64,'+fs.readFileSync(file).toString('base64');
  }
}
const json=JSON.stringify(db).replace(/</g,'\\u003c');
const metrics=read('dist/metrics.js').replaceAll('export ','');
const app=read('dist/app.js').replace(/^import .*?;\r?\n/,'').replace("const r=await fetch('history.json',{cache:'no-store'});if(!r.ok)throw new Error('http');db=await r.json();",'db='+json+';').replace('function safePath(path){return','function safePath(path){if(typeof path===\'string\'&&/^data:image\\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(path))return path;return');
let html=read('dist/index.html').replace('<link rel="stylesheet" href="styles.css">','<style>'+read('dist/styles.css')+'</style>');
html=html.replace('<script type="module" src="app.js"></script>','<script type="module">\n'+metrics+'\n'+app+'\n</script>');
html=html.replace('Espacio personal</span>','Copia local</span>');
html=html.replace('Mi Fitness y tus anotaciones, siempre identificados por su fuente.</p>','Mi Fitness y tus anotaciones, siempre identificados por su fuente.</p><p>Copia descargada. Se renueva cuando actualizamos el historial desde el chat.</p>');
fs.writeFileSync(new URL('mica-tablero.html',root),html);
console.log('Standalone dashboard generated in mica-tablero.html');
