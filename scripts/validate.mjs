// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root,'dist');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(dir,'data.js'),'utf8'),sandbox);
const data=sandbox.window.EUROPA;
for(const collection of ['events','cities','people'])assert.equal(new Set(data[collection].map(x=>x.id)).size,data[collection].length,`${collection}: duplicate id`);
const cities=new Set(data.cities.map(c=>c.id));
for(const e of data.events){assert(cities.has(e.city),e.id);assert(e.year!==0);assert(e.sources.length);for(const s of e.sources)assert(data.sources[s],s);}
for(const p of data.people){assert(p.stops.length>1);for(const s of p.stops)assert(cities.has(s.city),p.id);for(const s of p.sources)assert(data.sources[s],s);assert(p.stops.every((s,i)=>!i||p.stops[i-1].year<=s.year),p.id);}
for(const q of data.quiz){assert(cities.has(q.city));assert(data.events.some(e=>e.id===q.event));}
for(const s of Object.values(data.sources)){const u=new URL(s.url);assert.equal(u.protocol,'https:');}
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
for(const [,url] of html.matchAll(/(?:src|href)="([^"]+)"/g)){if(!url.startsWith('#')&&url!=='./'&&!/^https?:/.test(url))assert(fs.existsSync(path.join(dir,url)),url);}
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'assets/maps/manifest.json')));
let total=0;
for(const [i,era] of manifest.eras.entries()){
  if(i)assert.equal(manifest.eras[i-1].toYear+1,era.fromYear);
  const raw=fs.readFileSync(path.join(dir,'assets/maps',era.file));
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),era.sha256,era.file);
  const geo=JSON.parse(raw);assert.equal(geo.type,'FeatureCollection');assert.equal(geo.features.length,era.featureCount);
  for(const f of geo.features){const p=f.properties;assert(p.fromYear<=p.toYear);assert(p.id&&p.name&&p.original&&p.sourceId);assert(['Polygon','MultiPolygon'].includes(f.geometry.type));const walk=a=>{if(typeof a[0]==='number'){assert(a.every(Number.isFinite));assert(a[0]>=-16.001&&a[0]<=48.001);assert(a[1]>=29.999&&a[1]<=72.001);}else a.forEach(walk);};walk(f.geometry.coordinates);}
  for(const year of [era.fromYear,era.toYear,Math.floor((era.fromYear+era.toYear)/2)])assert(geo.features.some(f=>f.properties.fromYear<=year&&f.properties.toYear>=year),`${era.id} ${year}`);
  total+=geo.features.length;
}
vm.runInNewContext(fs.readFileSync(path.join(dir,'content.js'),'utf8'),sandbox);
const content=sandbox.window.EUROPA_CONTENT;
assert.equal(new Set(content.cities.map(c=>c.id)).size,content.cities.length);
assert.equal(new Set(content.polities.map(p=>p.id)).size,content.polities.length);
for(const c of content.cities){
  assert(c.overview.length>=60,c.id);assert(c.milestones.length>=3,c.id);
  const sourceIds=new Set(c.sources.map(s=>s.id));
  for(const m of c.milestones){assert(Number.isInteger(m.year)&&m.year!==0,c.id);assert(m.title&&m.text,c.id);assert(m.sourceIds?.length,`${c.id} ${m.year}`);for(const id of m.sourceIds)assert(sourceIds.has(id),`${c.id}: source ${id}`);}
  if(c.coord)assert(c.coord.length===2&&c.coord.every(Number.isFinite),c.id);
}
for(const p of content.polities){
  assert(p.overview.length>=60,p.id);assert(p.milestones.length>=3,p.id);assert(p.sources.length>=2,p.id);
  for(const a of p.aliases)assert(new RegExp(p.matchPattern,'i').test(a),`${p.id}: alias ${a}`);
  for(const m of p.milestones){assert(Number.isInteger(m.year)&&m.year!==0,p.id);for(const i of m.sourceIndexes||[])assert(p.sources[i],p.id);}
  if(p.matchYears)assert(p.matchYears.from<=p.matchYears.to,p.id);
}
for(const r of content.corrections.rules){assert(['hide','rename'].includes(r.action),r.id);assert(Array.isArray(r.exactOriginal)&&r.exactOriginal.length,r.id);assert(r.fromYear<=r.toYear,r.id);if(r.action==='rename')assert(r.nameZh,r.id);}
for(const s of [...content.cities,...content.polities].flatMap(x=>x.sources)){assert.equal(new URL(s.url).protocol,'https:');assert(s.title&&s.institution);}
const geography=JSON.parse(fs.readFileSync(path.join(dir,'assets/geography/manifest.json')));
for(const layer of Object.values(geography.layers)){
  const raw=fs.readFileSync(path.join(dir,'assets/geography',layer.file));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),layer.sha256,layer.file);const fc=JSON.parse(raw);assert.equal(fc.features.length,layer.featureCount);
  for(const f of fc.features){const walk=a=>{if(typeof a[0]==='number'){assert(a.every(Number.isFinite));assert(a[0]>=-20.001&&a[0]<=55.001);assert(a[1]>=27.999&&a[1]<=74.001);}else a.forEach(walk);};walk(f.geometry.coordinates);}
}
const hillshade=JSON.parse(fs.readFileSync(path.join(dir,'assets/geography/hillshade.json')));
for(const name of [hillshade.file,hillshade.pngFallback]){const raw=fs.readFileSync(path.join(dir,'assets/geography',name));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),hillshade[name].sha256,name);}
for(const file of ['locales/en-core.js','locales/en-content.js'])vm.runInNewContext(fs.readFileSync(path.join(dir,file),'utf8'),sandbox);
function assertTranslation(original,translated,key='root'){
  if(typeof original==='string'){
    assert.equal(typeof translated,'string',key);
    if(['id','category','url','matchPattern','sourceId','aliases','sourceIds','sources','city','event','person'].includes(key))assert.equal(translated,original,key);
    else assert(!/[\u3400-\u9fff]/.test(translated),`Untranslated English: ${key}`);
  }else if(Array.isArray(original)){assert(Array.isArray(translated),key);assert.equal(translated.length,original.length,key);original.forEach((v,i)=>assertTranslation(v,translated[i],key));}
  else if(original&&typeof original==='object'){assert.deepEqual(Object.keys(translated).sort(),Object.keys(original).sort(),key);for(const k of Object.keys(original))assertTranslation(original[k],translated[k],k);}
  else assert.equal(translated,original,key);
}
assertTranslation(data,sandbox.window.EUROPA_EN_CORE);
assertTranslation(content.cities,sandbox.window.EUROPA_EN_CONTENT.cities);
assertTranslation(content.polities,sandbox.window.EUROPA_EN_CONTENT.polities);
assert(fs.existsSync(path.join(dir,'assets/OPENCC-LICENSE.txt')));assert(fs.existsSync(path.join(dir,'assets/OPENCC-DATA-LICENSE.txt')));
console.log(`PASS: ${data.events.length} core events, ${content.cities.length} city histories, ${content.polities.length} polity dossiers, ${data.people.length} people, ${data.quiz.length} quiz questions; historical geometry, physical geography, hillshade assets, and source references validated.`);
