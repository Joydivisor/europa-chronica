// SPDX-License-Identifier: GPL-3.0-only
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=process.env.ATLAS_DIST||path.resolve(__dirname,'../dist');
const errors=[],fetches=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://example.test/?year=1200&topic=medieval',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window;w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
let resize;w.ResizeObserver=class{constructor(fn){resize=fn;}observe(){}disconnect(){}};
let mapWidth=1100;Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return this.classList.contains('map-stage')?mapWidth:352;}});Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return this.classList.contains('map-stage')?650:400;}});
w.HTMLDialogElement.prototype.show=w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
w.fetch=async url=>{fetches.push(url);try{const data=fs.readFileSync(path.join(root,url),'utf8');return {ok:true,json:async()=>JSON.parse(data)};}catch(e){return {ok:false,status:404};}};
const motions=[];w.HTMLElement.prototype.animate=function(frames,options){let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b;});const animation={finished,cancel(){reject(new Error('cancelled'));},finish:resolve};motions.push({element:this,frames,options,animation});setTimeout(resolve,25);return animation;};
for(const file of ['assets/d3.min.js','data.js','content.js','assets/opencc-cn2t.js','locales/en-core.js','locales/en-content.js','i18n.js','music-data.js','music.js','app.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const $=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
function click(s){const el=$(s);assert(el,`Missing ${s}`);el.click();}
function input(s,value,event='input'){const el=$(s);el.value=String(value);el.dispatchEvent(new w.Event(event,{bubbles:true}));}
async function ready(){for(let i=0;i<100;i++){if(w.atlasAPI.ready())return;await wait(10);}throw Error('Map not ready');}
async function year(value){w.atlasAPI.setYear(value);await wait(45);}
function names(){return w.atlasAPI.inspect().polities.map(p=>p.name).join(' ');}

async function test(){
 click('#music-button');assert(motions.some(m=>m.element.id==='music-panel'));click('#music-close');click('#music-button');await wait(50);assert(!$('#music-panel').hidden,'A closing animation must not hide a reopened music panel');click('#music-close');await wait(50);
 $('#search').focus();assert($('#search-results [data-search-type="topic"]'));click('#music-button');$('#search').focus();await wait(50);assert(!$('#search-results').hidden,'A closing animation must not hide reopened search recommendations');$('#search').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait(50);assert($('#search-results').hidden);
 assert.equal(w.atlasAPI.inspect().topic,'medieval');assert.equal(w.atlasAPI.inspect().view,'events');assert($('[data-nav="events"]').classList.contains('active'));assert($$('#side-content .event-card').length>=40);click('[data-nav="map"]');assert($('#side-content .topic-shortcuts [data-topic="medieval"]'),'Overview recommends topics from the current period');
 await ready();click('#layers-button');assert(!$('#layers-menu').hidden);assert(motions.some(m=>m.element.id==='layers-menu'&&m.frames[0].transform.includes('translateY')));
 click('#close-layers');click('#layers-button');await wait(50);assert(!$('#layers-menu').hidden,'A closing animation must not hide a reopened menu');assert.equal($('#layers-button').getAttribute('aria-expanded'),'true');
 click('#close-layers');await wait(50);assert($('#layers-menu').hidden);assert.equal($('#layers-button').getAttribute('aria-expanded'),'false');
 w.atlasAPI.locate({place:'rome'});await wait(700);assert($('#detail-dialog').open);assert(motions.some(m=>m.element.id==='detail-content'&&m.frames[0].transform.includes('translateX')));
 const before=w.d3.zoomTransform($('#map'));click('[data-lang="en"]');await wait(60);assert.equal(w.d3.zoomTransform($('#map')).k,before.k);assert($('#detail-content').textContent.includes('Rome'));assert.equal(w.atlasAPI.inspect().year,1200);
 click('#speed-button');assert(!$('#speed-menu').hidden);assert.equal(w.document.activeElement.dataset.speed,'3500');w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(w.document.activeElement.dataset.speed,'1800');w.document.activeElement.click();await wait(50);assert($('#speed-menu').hidden);assert.equal($('#speed-button').textContent,'2×');
 const star=$('#github-star'),menuButton=$('#project-menu-button'),menu=$('#project-menu');
 assert.equal(star.href,'https://github.com/Joydivisor/europa-chronica');assert.equal(star.target,'_blank');assert(star.relList.contains('noopener')&&star.relList.contains('noreferrer'));
 assert.equal(menuButton.getAttribute('aria-haspopup'),'menu');assert(menu.hidden);assert.equal(menu.querySelectorAll('[role=menuitem]').length,1);assert(menu.contains($('#share-button')));
 click('#project-menu-button');assert(!menu.hidden);assert.equal(w.document.activeElement,$('#share-button'));assert(motions.some(m=>m.element===menu&&m.frames[0].transform.includes('translateY')));
 click('#project-menu-button');click('#project-menu-button');await wait(50);assert(!menu.hidden,'Reopening the project menu must cancel its closing animation');
 const menuYear=w.atlasAPI.inspect().year;
 $('#share-button').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(w.atlasAPI.inspect().year,menuYear,'Menu navigation must not move the timeline');
 $('#share-button').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait(50);assert(menu.hidden);assert.equal(w.document.activeElement,menuButton);assert($('#detail-dialog').open,'Escaping the project menu must preserve the reading panel');
 menuButton.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(w.document.activeElement,$('#share-button'));
 $('#search').focus();await wait(50);assert(menu.hidden,'Tabbing out must close the project menu');
 click('#project-menu-button');click('.masthead');await wait(50);assert(menu.hidden,'An outside click must close the project menu');
 const copied=[];Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:async value=>copied.push(value)}});
 for(const [language,label,accessible] of [['zh-CN','分享','在 GitHub 上为项目加星标'],['zh-TW','分享','在 GitHub 上為項目加星標'],['en','Share','Star this project on GitHub']]){
  click(`[data-lang="${language}"]`);click('#project-menu-button');assert.equal($('#share-button span').textContent,label);assert.equal(star.getAttribute('aria-label'),accessible);
  click('#share-button');await wait(50);assert(menu.hidden);assert.equal(menuButton.getAttribute('aria-expanded'),'false');assert.equal(w.document.activeElement,menuButton);
  const url=new URL(copied.at(-1));assert.equal(url.searchParams.get('year'),'1200');assert.equal(url.searchParams.get('lang'),language);assert.equal(url.searchParams.get('place'),'rome');
 }
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async()=>{throw new Error('Permission denied');}}});
 click('#project-menu-button');click('#share-button');await wait(50);assert(menu.hidden);assert($('#detail-dialog').open);assert.equal($('#share-url').value,w.location.href);assert($('#detail-content').textContent.includes('Share this moment'),'A denied clipboard must offer the localized copyable link');
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: animated menus, interrupted close/reopen, reading-panel motion, camera-preserving language switch, speed-menu keyboard flow, GitHub link, accessible share dropdown, three-language deep-link sharing and clipboard fallback.');dom.window.close();
}
test().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
