// SPDX-License-Identifier: GPL-3.0-only
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../dist'),wait=ms=>new Promise(r=>setTimeout(r,ms));
function setup(saved){
  const errors=[],calls=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://example.test/?year=1200',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
  const styles=w.document.createElement('style');styles.textContent=fs.readFileSync(path.join(root,'style.css'),'utf8');w.document.head.append(styles);
  if(saved)w.localStorage.setItem('europa-music',saved);
  w.matchMedia=()=>({matches:true});w.ResizeObserver=class{observe(){}};
  w.HTMLDialogElement.prototype.show=w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  // These tests exercise DOM/audio state. Geometry and real file decoding have separate checks.
  w.fetch=()=>new Promise(()=>{});
  const media=new WeakMap();let behavior='success';
  Object.defineProperty(w.HTMLMediaElement.prototype,'paused',{get(){return media.get(this)!==true;}});
  w.HTMLMediaElement.prototype.play=function(){calls.push(this.getAttribute('src'));if(behavior==='reject')return Promise.reject(new Error('Playback blocked'));if(typeof behavior==='function')return behavior(this);media.set(this,true);return Promise.resolve();};
  w.HTMLMediaElement.prototype.pause=function(){media.set(this,false);this.dispatchEvent(new w.Event('pause'));};
  for(const file of ['assets/d3.min.js','data.js','content.js','assets/opencc-cn2t.js','locales/en-core.js','locales/en-content.js','i18n.js','music-data.js','music.js','app.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
  const $=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
  const click=s=>{assert($(s),s);$(s).click();};
  const key=(el,value)=>el.dispatchEvent(new w.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
  function input(selector,value){$(selector).value=String(value);$(selector).dispatchEvent(new w.Event('input',{bubbles:true}));}
  function discover(){input('#search','');$('#search').focus();}
  return {dom,w,$,$$,click,key,input,discover,errors,calls,setBehavior:v=>{behavior=v;},markPlaying:el=>media.set(el,true)};
}
async function test(){
  const a=setup();const {w,$,$$,click,key,input,discover}=a;
  try{
    assert(!$('#narration'));assert.equal(a.calls.length,0);assert(!$('#background-music').hasAttribute('src'));assert.equal($('#background-music').preload,'none');
    click('#music-button');assert(!$('#music-panel').hidden);assert.equal(a.calls.length,0,'Opening music must not start or fetch audio');assert.equal($$('[data-music-track]').length,3);
    click('#music-toggle');await wait(270);assert.equal(w.EUROPA_MUSIC.inspect().status,'playing');assert.equal(a.calls[0],'assets/music/bach-aria.mp3');assert(Math.abs($('#background-music').volume-.3)<.001);
    const originalYear=w.atlasAPI.inspect().year;key($('#music-loop'),'ArrowRight');assert.equal(w.atlasAPI.inspect().year,originalYear,'Music keys must not move history');
    input('#music-volume',18);assert.equal($('#background-music').volume,.18);assert.equal(JSON.parse(w.localStorage.getItem('europa-music')).volume,.18);
    click('[data-music-track="mozart-andante"]');await wait(270);assert.equal(w.EUROPA_MUSIC.inspect().track,'mozart-andante');assert($('#music-performer').textContent.includes('Musopen'));assert.equal(w.document.activeElement.dataset.musicTrack,'mozart-andante','Async playback keeps track focus');
    click('#music-loop');assert.equal($('#background-music').loop,false);$('#background-music').dispatchEvent(new w.Event('ended'));assert.equal(w.EUROPA_MUSIC.inspect().wanted,false);
    click('#music-toggle');await wait(10);click('#music-toggle');input('#music-volume',22);assert($('#background-music').paused,'Changing volume during pause fade must still stop audio');
    a.setBehavior('reject');click('[data-music-track="angevin"]');await wait(10);assert.equal(w.EUROPA_MUSIC.inspect().status,'error');assert.equal($('#music-toggle').getAttribute('aria-pressed'),'false');
    a.setBehavior('success');click('#music-toggle');await wait(10);assert.equal(w.EUROPA_MUSIC.inspect().status,'playing','Failed playback can be retried');
    $('#background-music').dispatchEvent(new w.Event('error'));assert.equal(w.EUROPA_MUSIC.inspect().status,'error');assert.equal(w.EUROPA_MUSIC.inspect().wanted,false);click('#music-toggle');await wait(10);assert.equal(w.EUROPA_MUSIC.inspect().status,'playing','Media download/decode errors can be retried');
    let finishFirst;a.setBehavior(el=>new Promise(resolve=>{finishFirst=()=>{a.markPlaying(el);resolve();};}));click('[data-music-track="bach-aria"]');
    a.setBehavior('success');click('[data-music-track="mozart-andante"]');await wait(10);finishFirst();await wait(10);assert.equal(w.EUROPA_MUSIC.inspect().track,'mozart-andante');assert.equal($('#background-music').getAttribute('src'),'assets/music/mozart-andante.mp3');
    // A paused in-flight play promise must never restore the playing UI.
    let finishPaused;a.setBehavior(el=>new Promise(resolve=>{finishPaused=resolve;}));click('[data-music-track="bach-aria"]');click('#music-toggle');finishPaused();await wait(270);assert.equal(w.EUROPA_MUSIC.inspect().wanted,false);assert($('#background-music').paused);
    a.setBehavior('success');click('[data-music-track="mozart-andante"]');await wait(20);const source=$('#background-music').getAttribute('src'),playCount=a.calls.length;
    w.atlasAPI.openEvent('magna-carta');assert.equal(w.EUROPA_MUSIC.inspect().status,'playing','Reading history does not pause music');$('#detail-dialog').close();
    for(const language of ['zh-CN','zh-TW','en']){
      w.atlasAPI.setLanguage(language);click('#music-button');if($('#music-panel').hidden)click('#music-button');
      // The same SVG geometry must survive language/font and playback-state changes.
      for(const id of ['music-button','music-toggle','music-close','music-loop','play','prev-year','next-year','panel-toggle','close-layers','close-sidebar','zoom-in','zoom-out']){
        const svg=$(`#${id} svg.control-icon`);assert(svg,`${language}: ${id}`);assert.equal(svg.getAttribute('viewBox'),'0 0 24 24');assert.equal(svg.getAttribute('aria-hidden'),'true');
        assert.equal([...$(`#${id}`).childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(''),'',`${id}: no font-based icon`);
      }
      const buttonStyle=w.getComputedStyle($('#music-button')),iconStyle=w.getComputedStyle($('#music-button svg'));
      assert.equal(buttonStyle.width,'30px');assert.equal(buttonStyle.height,'30px');assert.equal(buttonStyle.paddingTop,'0px');assert.equal(iconStyle.width,'17px');assert.equal(iconStyle.height,'17px');assert.equal(iconStyle.display,'block');
      assert.equal($('#music-button use').getAttribute('href'),'#i-music');assert.equal($('#music-toggle use').getAttribute('href'),'#i-pause');
      click('#play');assert.equal($('#play use').getAttribute('href'),'#i-pause');click('#play');assert.equal($('#play use').getAttribute('href'),'#i-play');
      assert.equal($('#background-music').getAttribute('src'),source);assert.equal(a.calls.length,playCount,'Language changes do not restart sound');
      assert.equal(w.EUROPA_MUSIC.inspect().volume,.22);
      if(language==='en')assert(!/[\u3400-\u9fff]/.test($('#music-panel').textContent),'Music panel fully translated');
      key($('[data-music-track="mozart-andante"]'),'Escape');assert($('#music-panel').hidden);assert.equal(w.document.activeElement,$('#music-button'));
      discover();assert($$('#search-results [data-search-type]').length>=10);assert.equal($('#search').getAttribute('aria-expanded'),'true');
      if(language==='en')assert(!/[\u3400-\u9fff]/.test($('#search-results').textContent),'Recommendations fully translated');
      key($('#search'),'ArrowDown');assert(w.document.activeElement.dataset.searchType);const current=w.atlasAPI.inspect().year;key(w.document.activeElement,'ArrowRight');assert.equal(w.atlasAPI.inspect().year,current);
      key(w.document.activeElement,'Escape');assert($('#search-results').hidden);assert.equal(w.document.activeElement,$('#search'));
      discover();click('#search-results [data-search-type="topic"]');assert.equal(w.atlasAPI.inspect().view,'events');assert(w.atlasAPI.inspect().topic);
      discover();click('#search-results [data-search-type="person"]');assert(w.atlasAPI.inspect().persons.length);click('[data-nav="map"]');
      discover();click('#search-results [data-search-type="city"][data-search-id="rome"]');assert.equal(w.atlasAPI.inspect().place,'rome');$('#detail-dialog').close();
      discover();click('#search-results [data-search-id="verdun-battle-1916"]');assert.equal(w.atlasAPI.inspect().event,'verdun-battle-1916');assert.equal(w.document.activeElement,$('#detail-dialog .dialog-close'));assert.equal($('#detail-dialog .dialog-close').tabIndex,0);$('#detail-dialog').close();
      discover();click('#search-results [data-search-type="multi"]');assert.equal(w.atlasAPI.inspect().persons.length,2);click('[data-nav="map"]');
      discover();click('#search-results [data-search-type="quiz"]');assert(w.atlasAPI.inspect().quiz);click('[data-quiz-exit]');
      input('#search','zzzzzzzz-not-found');assert($('.search-empty'));assert($('#search-results [data-search-type="topic"]'));
      input('#search','Rome');assert($('#search-results .search-result'));assert(!$('.search-discovery'));key($('#search'),'Escape');
    }
    Object.defineProperty(w.document,'hidden',{configurable:true,value:true});w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(w.EUROPA_MUSIC.inspect().wanted,false);assert($('#background-music').paused);
    const saved=w.localStorage.getItem('europa-music'),b=setup(saved);try{assert.equal(b.w.EUROPA_MUSIC.inspect().track,'mozart-andante');assert.equal(b.w.EUROPA_MUSIC.inspect().volume,.22);assert.equal(b.w.EUROPA_MUSIC.inspect().loop,false);assert.equal(b.calls.length,0);assert(!b.$('#background-music').hasAttribute('src'),'Reload restores preferences, never playback');assert.deepEqual(b.errors,[]);}finally{b.dom.window.close();}
    assert.deepEqual(a.errors,[]);
    console.log('PASS: silent/lazy music startup, selection, fades, volume, repeat, rejection/retry, racing play requests, persistence without autoplay, three-language credits, keyboard isolation, visibility pause, clickable topic/person/place/event/multi/quiz suggestions and empty-search recovery.');
  }finally{a.dom.window.close();}
}
test().catch(error=>{console.error(error);process.exitCode=1;});
