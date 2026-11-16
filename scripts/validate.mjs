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
const eventIds=new Set(data.events.map(e=>e.id)),personIds=new Set(data.people.map(p=>p.id)),topicIds=new Set((data.topics||[]).map(t=>t.id));
assert.equal(topicIds.size,data.topics.length,'Duplicate topic');
for(const t of data.topics){assert(t.title&&t.description&&t.subtitle,t.id);assert(t.start<t.end,t.id);assert(data.events.some(e=>(e.topics||[]).includes(t.id)),`Empty topic ${t.id}`);}
for(const e of data.events){for(const id of e.topics||[])assert(topicIds.has(id),`${e.id}: topic ${id}`);for(const id of e.people||[])assert(personIds.has(id),`${e.id}: person ${id}`);if(e.endYear!==undefined)assert(e.endYear>=e.year,`${e.id}: inverted range`);}
for(const p of data.people){for(const id of p.topics||[])assert(topicIds.has(id),`${p.id}: topic ${id}`);for(const id of p.relatedEvents||[])assert(eventIds.has(id),`${p.id}: event ${id}`);for(const s of p.stops){assert(Number.isInteger(s.year)&&s.year!==0,`${p.id}: stop year`);for(const id of s.sources||[])assert(data.sources[id],`${p.id}: stop source ${id}`);for(const id of s.relatedEvents||[])assert(eventIds.has(id),`${p.id}: stop event ${id}`);}}
const coordinates=point=>assert(Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)&&point[0]>=-26&&point[0]<=55&&point[1]>=28&&point[1]<=74,'Geographic point outside the atlas');
const located=item=>{for(const point of item.eventLocations||[]){coordinates(point.coord);assert(point.name&&point.precision);assert(point.sourceIds?.length);for(const id of point.sourceIds)assert(data.sources[id],`${item.id||item.title}: ${id}`);}};
for(const c of data.cities){coordinates(c.coord);assert(c.coordPrecision,c.id);assert(c.coordSources?.length,c.id);for(const id of c.coordSources)assert(data.sources[id],`${c.id}: ${id}`);}
for(const e of data.events){located(e);for(const id of e.relatedPlaces||[])assert(cities.has(id),`${e.id}: ${id}`);if(e.context||e.outcome)assert(e.context&&e.outcome,e.id);if(e.datePrecision)assert(['day','month','year','range'].includes(e.datePrecision));}
for(const p of data.people)for(const stop of p.stops)located(stop);
for(const e of data.events){assert(cities.has(e.city),e.id);assert(e.year!==0);assert(e.sources.length);for(const s of e.sources)assert(data.sources[s],s);}
for(const p of data.people){assert(p.stops.length>1);for(const s of p.stops)assert(cities.has(s.city),p.id);for(const s of p.sources)assert(data.sources[s],s);assert(p.stops.every((s,i)=>!i||p.stops[i-1].year<=s.year),p.id);}
for(const q of data.quiz){assert(cities.has(q.city));assert(data.events.some(e=>e.id===q.event));}
for(const s of Object.values(data.sources)){const u=new URL(s.url);assert.equal(u.protocol,'https:');}
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
const playback=[...css.matchAll(/\.play-button\{([^}]+)\}/g)].map(m=>m[1]).findLast(block=>block.includes('background:'));
const luminance=hex=>hex.match(/[\da-f]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
const foreground=playback.match(/(?:^|;)color:(#[\da-f]{6})/i)[1],background=playback.match(/(?:^|;)background:(#[\da-f]{6})/i)[1];
const contrast=(Math.max(luminance(foreground),luminance(background))+.05)/(Math.min(luminance(foreground),luminance(background))+.05);assert(contrast>=4.5,`Default play contrast: ${contrast}`);
for(const [,url] of html.matchAll(/(?:src|href)="([^"]+)"/g)){if(!url.startsWith('#')&&url!=='./'&&!/^https?:/.test(url))assert(fs.existsSync(path.join(dir,url)),url);}
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'assets/maps/manifest.json')));
const correctionMeta=manifest.metadata.icelandCorrection;
const correctionRaw=fs.readFileSync(path.join(dir,'assets/maps',correctionMeta.correctionsFile));
assert.equal(crypto.createHash('sha256').update(correctionRaw).digest('hex'),correctionMeta.correctionsSha256);
const islandCorrections=JSON.parse(correctionRaw).features;
assert.equal(islandCorrections.length,7);
for(let year=930;year<=2024;year++)assert.equal(islandCorrections.filter(f=>f.properties.fromYear<=year&&year<=f.properties.toYear).length,1,`Iceland overlap or gap: ${year}`);
for(const f of islandCorrections){assert(f.properties.recordId<0);assert.equal(f.properties.sourceId,'iceland-correction');assert.equal(f.properties.sourceRecords.length,0);assert(f.properties.sourceIds.length);}
let total=0;
for(const [i,era] of manifest.eras.entries()){
  if(i)assert.equal(manifest.eras[i-1].toYear+1,era.fromYear);
  const raw=fs.readFileSync(path.join(dir,'assets/maps',era.file));
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),era.sha256,era.file);
  const geo=JSON.parse(raw);assert.equal(geo.type,'FeatureCollection');assert.equal(geo.features.length,era.featureCount);
  for(const f of geo.features){const p=f.properties;assert(p.fromYear<=p.toYear);assert(p.id&&p.name&&p.original&&p.sourceId);assert(['Polygon','MultiPolygon'].includes(f.geometry.type));const walk=a=>{if(typeof a[0]==='number'){assert(a.every(Number.isFinite));assert(a[0]>=manifest.metadata.bbox[0]-.001&&a[0]<=manifest.metadata.bbox[2]+.001);assert(a[1]>=29.999&&a[1]<=72.001);}else a.forEach(walk);};walk(f.geometry.coordinates);}
  for(const f of geo.features.filter(f=>f.geometryVariants)){
    const variants=f.geometryVariants;assert(variants.length>1,`${f.properties.recordId}: single variant`);
    assert.equal(variants[0].fromYear,f.properties.fromYear);assert.equal(variants.at(-1).toYear,f.properties.toYear);
    for(const [i,v] of variants.entries()){
      assert(v.fromYear<=v.toYear);if(i)assert.equal(variants[i-1].toYear+1,v.fromYear,`${f.properties.recordId}: gap/overlap`);
      assert(v.sourceRecords.length);for(const id of v.sourceRecords)assert(f.properties.sourceRecords.includes(id));
      const walk=a=>{if(typeof a[0]==='number'){assert(a.every(Number.isFinite));assert(a[0]>=manifest.metadata.bbox[0]-.001&&a[0]<=manifest.metadata.bbox[2]+.001&&a[1]>=29.999&&a[1]<=72.001);}else a.forEach(walk);};walk(v.geometry.coordinates);
    }
  }
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
  for(const f of fc.features){const walk=a=>{if(typeof a[0]==='number'){assert(a.every(Number.isFinite));assert(a[0]>=geography.bbox[0]-.001&&a[0]<=geography.bbox[2]+.001);assert(a[1]>=27.999&&a[1]<=74.001);}else a.forEach(walk);};walk(f.geometry.coordinates);}
}
const hillshade=JSON.parse(fs.readFileSync(path.join(dir,'assets/geography/hillshade.json')));
for(const name of [hillshade.file,hillshade.pngFallback]){const raw=fs.readFileSync(path.join(dir,'assets/geography',name));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),hillshade[name].sha256,name);}
for(const file of ['locales/en-core.js','locales/en-content.js'])vm.runInNewContext(fs.readFileSync(path.join(dir,file),'utf8'),sandbox);
function assertTranslation(original,translated,key='root'){
  if(typeof original==='string'){
    assert.equal(typeof translated,'string',key);
    if(['id','category','url','matchPattern','sourceId','aliases','sourceIds','sources','city','event','person','datePrecision','relatedPlaces','coordSources','topics','people','relatedEvents'].includes(key))assert.equal(translated,original,key);
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
