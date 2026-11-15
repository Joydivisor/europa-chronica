// SPDX-License-Identifier: GPL-3.0-only
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=process.env.ATLAS_DIST||path.resolve(__dirname,'../dist');
const errors=[],fetches=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://example.test/?year=1200',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window;w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
let resize;w.ResizeObserver=class{constructor(fn){resize=fn;}observe(){}disconnect(){}};
let mapWidth=1100;Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return this.classList.contains('map-stage')?mapWidth:352;}});Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return this.classList.contains('map-stage')?650:400;}});
w.HTMLDialogElement.prototype.show=w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
w.fetch=async url=>{fetches.push(url);try{const data=fs.readFileSync(path.join(root,url),'utf8');return {ok:true,json:async()=>JSON.parse(data)};}catch(e){return {ok:false,status:404};}};
for(const file of ['assets/d3.min.js','data.js','content.js','assets/opencc-cn2t.js','locales/en-core.js','locales/en-content.js','i18n.js','app.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const $=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
function click(s){const el=$(s);assert(el,`Missing ${s}`);el.click();}
function input(s,value,event='input'){const el=$(s);el.value=String(value);el.dispatchEvent(new w.Event(event,{bubbles:true}));}
async function ready(){for(let i=0;i<100;i++){if(w.atlasAPI.ready())return;await wait(10);}throw Error('Map not ready');}
async function year(value){w.atlasAPI.setYear(value);await wait(45);}
function names(){return w.atlasAPI.inspect().polities.map(p=>p.name).join(' ');}
async function test(){
 await ready();assert.equal(w.atlasAPI.inspect().year,1200);assert($$('.realm').length>20);assert.equal($('#map-loading').hidden,true);assert($('.map-land').getAttribute('d').length>10000);assert.equal($$('.water-river').length,86);assert.equal($$('.water-lake').length,78);assert($('.terrain-layer image').getAttribute('href').endsWith('.webp'));
 // Regression: capture native range/number values before pause redraws controls.
 input('#year-slider',1350);await wait(70);assert.equal(w.atlasAPI.inspect().year,1350);assert.equal($('#year-slider').value,'1350');assert.equal($('#year-input').value,'1350');
 input('#year-slider',1215,'change');await wait(60);assert.equal(w.atlasAPI.inspect().year,1215);
 click('#play');input('#year-slider',1230);await wait(60);assert.equal(w.atlasAPI.inspect().year,1230);assert.equal($('#play').textContent,'▶');
 for(const value of [1450,1900,-150,800,2024,1200])input('#year-slider',value);await wait(80);assert.equal(w.atlasAPI.inspect().year,1200,'Latest drag input must win');assert.equal($('#year-input').value,'1200');
 for(const value of [1205,1210,1216,1220,1230]){input('#year-slider',value);await wait(25);assert.equal(w.atlasAPI.inspect().year,value);}
 input('#year-input',-27,'change');await wait(60);assert.equal(w.atlasAPI.inspect().year,-27);assert.equal($('#year-prefix').textContent,'ANTE CHRISTUM');
 input('#year-input',0,'change');await wait(60);assert.equal(w.atlasAPI.inspect().year,1);
 input('#year-input',1200,'change');await wait(50);click('#timeline-zoom');assert.equal($('#year-slider').min,'1000');assert.equal($('#year-slider').max,'1299');input('#year-slider',1274);await wait(50);assert.equal(w.atlasAPI.inspect().year,1274);click('#timeline-zoom');assert.equal($('#year-slider').max,'2024');
 await year(-27);click('#timeline-zoom');assert.equal($('#timeline-zoom').textContent,'全部年代');click('#timeline-zoom');assert.equal($('#year-slider').max,'2024');
 // In-app reading: actual narratives and internal navigation, no outbound-link placeholders.
 click('[data-era="high"]');await wait(60);click('[data-event="magna-carta"]');await wait(60);assert.equal(w.atlasAPI.inspect().year,1215);assert($('#detail-dialog').open);assert($('#detail-content').textContent.includes('兰尼米德'));assert.equal($$('#detail-content a').length,0);click('#detail-dialog .dialog-close');
 w.atlasAPI.locate({place:'rome'});await wait(50);assert($('#detail-content').textContent.includes('1871'));assert($('#detail-content').textContent.includes('意大利首都'));assert($$('#detail-content .chronicle-row').length>=4);click('[data-history-year="800"]');await wait(60);assert.equal(w.atlasAPI.inspect().year,800);assert.equal(w.atlasAPI.inspect().place,'rome');assert(!$('#detail-dialog').open);
 await year(1200);click('#legend-toggle');assert(!$('#legend').hidden);click('[data-realm="aggregate-holy-roman-empire"]');assert($('#detail-content').textContent.includes('金玺诏书'));assert($('#detail-content').textContent.includes('1495'));assert($('#detail-content .source-details'));assert.equal($$('#detail-content a').length,0);click('#detail-dialog .dialog-close');
 // Every city opens substantive chronology; each curated polity has sources and dated nodes.
 for(const c of w.EUROPA.cities){w.atlasAPI.locate({place:c.id});assert($$('#detail-content .chronicle-row').length>0,`Empty city ${c.id}`);assert($('#detail-content .source-details'),`No source ${c.id}`);$('#detail-dialog').close();}
 for(const p of w.EUROPA_CONTENT.polities){assert(p.overview.length>=60,p.id);assert(p.milestones.length>=3,p.id);assert(p.sources.length>=2,p.id);}
 click('#sources-button');assert($('#sources-content').textContent.includes('地形与水系'));assert.equal($$('#sources-content a').length,0);assert(!$('#sources-content').textContent.includes('绝对无误'));click('#sources-dialog .dialog-close');
 // Independent layer controls and presets, opacity, legend, and panel toggle.
 await year(1200);click('#layers-button');assert(!$('#layers-menu').hidden);
 for(const key of ['terrain','rivers','lakes','realms','borders','cities','labels','routes','modern']){const before=w.atlasAPI.inspect().layers[key];click('#layer-'+key);assert.equal(w.atlasAPI.inspect().layers[key],!before,key);click('#layer-'+key);}
 click('#layer-terrain');assert.equal($('.terrain-layer').style.display,'none');click('#layer-terrain');
 click('#layer-rivers');assert($$('.water-river').every(p=>p.style.display==='none'));click('#layer-rivers');
 click('#layer-lakes');assert($$('.water-lake').every(p=>p.style.display==='none'));click('#layer-lakes');
 click('#layer-borders');assert($('#map').classList.contains('realm-borderless'));click('#layer-borders');
 click('#layer-labels');assert($('#map').classList.contains('labels-hidden'));click('#layer-labels');
 input('#realm-opacity',35);assert.equal(w.atlasAPI.inspect().opacity,35);assert.equal($('#map').style.getPropertyValue('--realm-opacity'),'0.35');
 click('[data-map-mode="terrain"]');assert.equal(w.atlasAPI.inspect().mode,'terrain');assert($$('.realm').every(p=>p.style.display==='none'));assert(!w.atlasAPI.inspect().layers.realms);assert($('#legend-wrap').hidden);
 click('[data-map-mode="political"]');assert(w.atlasAPI.inspect().layers.realms);click('#reset-layers');assert.equal(w.atlasAPI.inspect().opacity,65);assert(!w.atlasAPI.inspect().layers.modern);click('#close-layers');assert($('#layers-menu').hidden);
 click('#panel-toggle');assert($('.atlas-shell').classList.contains('panel-collapsed'));click('#panel-toggle');assert(!$('.atlas-shell').classList.contains('panel-collapsed'));
 // Camera should survive a panel resize; additional cities appear when zooming.
 w.atlasAPI.locate({place:'rome'});await wait(70);const before=w.d3.zoomTransform($('#map'));mapWidth=1200;resize();await wait(170);const after=w.d3.zoomTransform($('#map'));assert.equal(after.k,before.k);assert($$('.city-marker').length>10);mapWidth=1100;resize();await wait(170);$('#detail-dialog').close();
 // Single and multi-person journeys keep dates, controls and URLs together.
 assert(w.atlasAPI.search('查理曼 奥托').some(r=>r.type==='multi'));
 w.atlasAPI.openPerson('joan');await wait(60);assert.equal($$('.route-stop').length,4);click('[data-stop="3"]');await wait(60);assert.equal(w.atlasAPI.inspect().year,1431);assert.equal(w.atlasAPI.inspect().place,'rouen');assert.equal(new URL(w.location.href).searchParams.get('stop'),'3');
 w.atlasAPI.openPerson('charlemagne,otto');await wait(60);assert.equal(w.atlasAPI.inspect().persons.length,2);assert.equal($$('.route-stop').length,6);click('[data-exit-journey]');click('[data-nav="map"]');
 // Quiz must suppress and restore ALL location labels, including the new river layer.
 click('#quiz-button');await wait(60);assert(w.atlasAPI.inspect().quiz);assert.equal($$('.city-marker').length,0);assert($('#map').classList.contains('labels-hidden'));assert($('#legend-wrap').hidden);
 for(let i=0;i<5;i++){$('#map').dispatchEvent(new w.MouseEvent('click',{bubbles:true,clientX:500,clientY:320}));assert(!$('[data-quiz-confirm]').disabled);click('[data-quiz-confirm]');assert(w.atlasAPI.inspect().quiz.revealed);click('[data-quiz-next]');await wait(50);}
 assert(w.atlasAPI.inspect().quiz.complete);click('[data-quiz-exit]');assert(!w.atlasAPI.inspect().quiz);assert(!$('#map').classList.contains('labels-hidden'));assert($$('.city-marker').length>0);assert($$('.realm-label').length>0);
 // Historical boundary regressions: no state lives beyond the verified endpoint.
 await year(800);assert(names().includes('加洛林'));await year(850);assert(!names().includes('加洛林帝国'));assert(/东法兰克|East Franks/.test(names()),names());assert(/西法兰克|West Franks/.test(names()),names());
 await year(1270);assert(!names().includes('穆瓦希德'));
 await year(1454);assert(!names().includes('拜占庭'));assert(names().includes('特拉比松'));await year(1462);assert(!names().includes('特拉比松'));
 for(const y of [476,843,1000,1453,1492,1648,1789,1815,1914,1945,1993,2004,2020,2024]){await year(y);assert($$('.realm').length>0,`No realm at ${y}`);assert($$('.realm').every(p=>!p.getAttribute('d').includes('NaN')));}
 // Small-screen panel controls use the same content and close correctly.
 Object.defineProperty(w,'innerWidth',{value:390,writable:true});click('#close-sidebar');click('#mobile-panel-toggle');assert($('#sidebar').classList.contains('open'));click('#close-sidebar');assert(!$('#sidebar').classList.contains('open'));w.innerWidth=1452;
 // All three languages cover complete reading views and preserve the selected moment.
 function noChinese(label){const walker=w.document.createTreeWalker(w.document.body,w.NodeFilter.SHOW_TEXT);let node;const leftovers=[];while((node=walker.nextNode())){const el=node.parentElement;if(!el||el.closest('script,style,noscript,[data-no-i18n],[hidden],dialog:not([open])'))continue;if(/[\u3400-\u9fff]/.test(node.data))leftovers.push(node.data.trim());}assert.equal(leftovers.length,0,`${label}: ${[...new Set(leftovers)].join(' | ')}`);}
 await year(1200);w.atlasAPI.locate({place:'rome'});await wait(60);const camera=w.d3.zoomTransform($('#map')),selected=w.atlasAPI.inspect();
 click('[data-lang="en"]');await wait(60);assert.equal(w.atlasAPI.inspect().language,'en');assert.equal(w.atlasAPI.inspect().year,selected.year);assert.equal(w.atlasAPI.inspect().place,'rome');assert.equal(w.d3.zoomTransform($('#map')).k,camera.k);assert($('#detail-content').textContent.includes('Rome'));assert($('#detail-content').textContent.includes('1871'));assert.equal(w.document.documentElement.lang,'en');assert.equal(new URL(w.location.href).searchParams.get('lang'),'en');assert.equal(w.localStorage.getItem('europa-language'),'en');noChinese('English city');
 click('[data-lang="zh-TW"]');assert($('#detail-content').textContent.includes('羅馬'));assert($('#detail-content').textContent.includes('城市紀事'));assert($('.brand strong').textContent.includes('歐陸紀年'));assert.equal(w.atlasAPI.inspect().year,1200);
 click('[data-lang="en"]');$('#detail-dialog').close();click('#layers-button');noChinese('English layers');click('#close-layers');
 click('#sources-button');noChinese('English bibliography');$('#sources-dialog').close();
 for(const c of w.EUROPA.cities){w.atlasAPI.locate({place:c.id});noChinese(`English city ${c.id}`);assert($('#detail-content .chronicle-row'));$('#detail-dialog').close();}
 await year(1200);for(const polygon of $$('.realm')){polygon.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));noChinese(`English polity ${polygon.__data__.properties.name}`);assert($('#detail-dialog').open);$('#detail-dialog').close();}
 for(const p of w.EUROPA.people){w.atlasAPI.openPerson(p.id);await wait(35);noChinese(`English journey ${p.id}`);click(`[data-person-info="${p.id}"]`);noChinese(`English biography ${p.id}`);$('#detail-dialog').close();}click('[data-exit-journey]');click('[data-nav="map"]');
 click('#quiz-button');await wait(60);noChinese('English quiz');for(let i=0;i<5;i++){$('#map').dispatchEvent(new w.MouseEvent('click',{bubbles:true,clientX:500,clientY:320}));click('[data-quiz-confirm]');noChinese('English quiz answer');click('[data-quiz-next]');await wait(35);}noChinese('English quiz result');click('[data-quiz-exit]');
 input('#search','Rome');noChinese('English search');assert(w.atlasAPI.search('罗马').some(r=>r.type==='city'));assert(w.atlasAPI.search('Budapest').some(r=>r.type==='city'));$('#search-results').hidden=true;
 click('#speed-button');assert(!$('#speed-menu').hidden);click('[data-speed="1800"]');assert.equal($('#play-speed').value,'1800');assert($('#speed-menu').hidden);assert.equal($('#speed-button').textContent,'2×');assert.equal($('[data-speed="1800"]').getAttribute('aria-checked'),'true');
 await year(1200);click('#reset-map');await wait(40);const labels=w.EUROPA_UTILS.seaLabelAudit();assert(labels.find(s=>s.id==='black')?.visible,'Black Sea label remains visible');assert(labels.filter(s=>s.visible).every(s=>!s.onLand),'Sea labels must fit water');
 if(process.env.ATLAS_SVG_OUTPUT)fs.writeFileSync(process.env.ATLAS_SVG_OUTPUT.replace(/\.svg$/,'-en.svg'),$('#map').outerHTML);
 const beforeLanguageKey=w.atlasAPI.inspect().year;$('[data-lang="en"]').focus();$('[data-lang="en"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal(w.atlasAPI.inspect().language,'zh-TW');assert.equal(w.atlasAPI.inspect().year,beforeLanguageKey);
 click('[data-lang="zh-CN"]');assert.equal($('.brand strong').textContent,'欧陆纪年');assert.equal(w.atlasAPI.inspect().language,'zh-CN');
 const geoFetches=fetches.filter(f=>f.includes('assets/maps/europe-'));assert.equal(new Set(geoFetches).size,geoFetches.length,'Era data should be cached');
 await year(1200);click('#reset-map');await wait(40);if(process.env.ATLAS_SVG_OUTPUT)fs.writeFileSync(process.env.ATLAS_SVG_OUTPUT,$('#map').outerHTML);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: native timeline input/change + rapid dragging, typed years, era zoom, map-layer independence, all city histories and polity dossiers in three languages, language persistence, sea-label land checks, custom speed menu, internal bibliography, camera resize, journeys, complete quiz, corrected dynasty endpoints, six-era caching, mobile panel state.');
 console.log(`No runtime errors. ${w.atlasAPI.inspect().polities.length} visible political groups at 1200. DOM checks do not substitute for browser layout/touch verification.`);
 dom.window.close();
}
test().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
