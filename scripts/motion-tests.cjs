// SPDX-License-Identifier: GPL-3.0-only
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=process.env.ATLAS_DIST||path.resolve(__dirname,'../dist');
const errors=[],fetches=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://example.test/?year=1200',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window;w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
let resize;w.ResizeObserver=class{constructor(fn){resize=fn;}observe(){}disconnect(){}};
let mapWidth=1100;Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return this.classList.contains('map-stage')?mapWidth:352;}});Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return this.classList.contains('map-stage')?650:400;}});
w.HTMLDialogElement.prototype.show=w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
w.fetch=async url=>{fetches.push(url);try{const data=fs.readFileSync(path.join(root,url),'utf8');return {ok:true,json:async()=>JSON.parse(data)};}catch(e){return {ok:false,status:404};}};
const motions=[];w.HTMLElement.prototype.animate=function(frames,options){let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b;});const animation={finished,cancel(){reject(new Error('cancelled'));},finish:resolve};motions.push({element:this,frames,options,animation});setTimeout(resolve,25);return animation;};
for(const file of ['assets/d3.min.js','data.js','content.js','assets/opencc-cn2t.js','locales/en-core.js','locales/en-content.js','i18n.js','app.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const $=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
function click(s){const el=$(s);assert(el,`Missing ${s}`);el.click();}
function input(s,value,event='input'){const el=$(s);el.value=String(value);el.dispatchEvent(new w.Event(event,{bubbles:true}));}
async function ready(){for(let i=0;i<100;i++){if(w.atlasAPI.ready())return;await wait(10);}throw Error('Map not ready');}
async function year(value){w.atlasAPI.setYear(value);await wait(45);}
function names(){return w.atlasAPI.inspect().polities.map(p=>p.name).join(' ');}

async function test(){
 await ready();click('#layers-button');assert(!$('#layers-menu').hidden);assert(motions.some(m=>m.element.id==='layers-menu'&&m.frames[0].transform.includes('translateY')));
 click('#close-layers');click('#layers-button');await wait(50);assert(!$('#layers-menu').hidden,'A closing animation must not hide a reopened menu');assert.equal($('#layers-button').getAttribute('aria-expanded'),'true');
 click('#close-layers');await wait(50);assert($('#layers-menu').hidden);assert.equal($('#layers-button').getAttribute('aria-expanded'),'false');
 w.atlasAPI.locate({place:'rome'});await wait(700);assert($('#detail-dialog').open);assert(motions.some(m=>m.element.id==='detail-content'&&m.frames[0].transform.includes('translateX')));
 const before=w.d3.zoomTransform($('#map'));click('[data-lang="en"]');await wait(60);assert.equal(w.d3.zoomTransform($('#map')).k,before.k);assert($('#detail-content').textContent.includes('Rome'));assert.equal(w.atlasAPI.inspect().year,1200);
 click('#speed-button');assert(!$('#speed-menu').hidden);assert.equal(w.document.activeElement.dataset.speed,'3500');w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(w.document.activeElement.dataset.speed,'1800');w.document.activeElement.click();await wait(50);assert($('#speed-menu').hidden);assert.equal($('#speed-button').textContent,'2×');
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: menu slide-in, interrupted close/reopen, reading-panel slide, language switch with camera retained, and custom speed-menu keyboard flow.');dom.window.close();
}
test().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
