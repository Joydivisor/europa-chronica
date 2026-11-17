// SPDX-License-Identifier: GPL-3.0-only
(() => {
  'use strict';
  const L=window.EUROPA_I18N, tracks=window.EUROPA_MUSIC_TRACKS;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label=(track,key)=>L.locale==='en'?track[key+'En']:L.text(track[key+'Zh']);
  const time=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  let preferences={};try{preferences=JSON.parse(localStorage.getItem('europa-music')||'{}')||{};}catch{}
  const selected=tracks.find(t=>t.id===preferences.track)||tracks.find(t=>t.default)||tracks[0];
  const state={track:selected.id,volume:Number.isFinite(preferences.volume)?Math.max(0,Math.min(1,preferences.volume)):.3,loop:preferences.loop!==false,status:'idle',wanted:false};
  let audio,menu,fadeFrame,request=0,loadedTrack='',initialized=false,renderedLanguage='';
  const track=()=>tracks.find(t=>t.id===state.track);
  const save=()=>{try{localStorage.setItem('europa-music',JSON.stringify({track:state.track,volume:state.volume,loop:state.loop}));}catch{}};
  function cancelFade(){cancelAnimationFrame(fadeFrame);}
  function fadeTo(target,done){
    cancelFade();const from=audio.volume,start=performance.now();
    const tick=now=>{const progress=Math.min(1,(now-start)/220);audio.volume=Math.max(0,Math.min(1,from+(target-from)*progress));if(progress<1)fadeFrame=requestAnimationFrame(tick);else done?.();};
    fadeFrame=requestAnimationFrame(tick);
  }
  function render(){
    if(!initialized)return;
    const current=track(),active=state.wanted;
    $('#music-button').classList.toggle('is-playing',active);
    $('#music-button').setAttribute('aria-label',L.text('欧陆乐馆')+(active?' · '+label(current,'title'):''));
    $('#music-title').textContent=L.text('欧陆乐馆');
    $('#music-subtitle').textContent=L.text('让音乐陪你读历史。');
    if(renderedLanguage!==L.locale){$('#music-tracks').innerHTML=tracks.map((t,i)=>`<button class="music-track" data-music-track="${escape(t.id)}" aria-label="${escape(L.text('播放曲目')+' · '+label(t,'title'))}"><span class="music-track-number">${String(i+1).padStart(2,'0')}</span><span><strong>${escape(label(t,'title'))}</strong><small>${escape(label(t,'composer'))} · ${escape(label(t,'group'))}</small></span><span class="music-track-duration">${time(t.duration)}</span></button>`).join('');renderedLanguage=L.locale;}
    $$('[data-music-track]').forEach(b=>{b.classList.toggle('selected',b.dataset.musicTrack===state.track);b.setAttribute('aria-pressed',String(b.dataset.musicTrack===state.track));});
    $('#music-toggle use').setAttribute('href',active?'#i-pause':'#i-play');
    $('#music-toggle').setAttribute('aria-label',L.text(active?'暂停音乐':'播放音乐'));
    $('#music-toggle').setAttribute('aria-pressed',String(active));
    $('#music-loop').setAttribute('aria-pressed',String(state.loop));
    $('#music-loop').setAttribute('aria-label',L.text(state.loop?'关闭单曲循环':'开启单曲循环'));
    $('#music-volume').value=Math.round(state.volume*100);
    $('#music-volume-value').textContent=Math.round(state.volume*100)+'%';
    const messages={idle:'选择一首，开始聆听',loading:'正在加载音乐…',playing:'正在播放',paused:'已暂停',error:'音乐未能播放，点击播放重试'};
    $('#music-status').textContent=L.text(messages[state.status]);
    $('#music-performer').textContent=current.performer+(current.publisher?' · '+current.publisher:'');
    $('#music-credits-content').innerHTML=`<strong>${escape(label(current,'title'))}</strong><p>${escape(current.performer)}${current.publisher?' · '+escape(current.publisher):''}</p><p>${escape(label(current,'description'))}</p><p><a href="${escape(current.sourceUrl)}" target="_blank" rel="noopener noreferrer">${L.text('录音来源')}</a> · <a href="${escape(current.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escape(current.licenseName)}</a></p><p>${escape(current.attribution)}</p><small>${L.text('已转为 MP3，未裁剪或改变速度与音高。')}</small>`;
    L.localize($('#music-panel'));L.localize($('#music-button'));
  }
  async function start(id=state.track){
    if(!tracks.some(t=>t.id===id))return;
    const ticket=++request;cancelFade();
    const retry=state.status==='error'||audio.error;state.track=id;state.wanted=true;state.status='loading';
    if(loadedTrack!==id||retry){audio.pause();audio.src='assets/music/'+track().file;loadedTrack=id;}
    audio.volume=0;audio.loop=state.loop;save();render();
    try{
      await audio.play();
      if(ticket!==request||!state.wanted)return;
      state.status='playing';fadeTo(state.volume);render();
    }catch(error){
      if(ticket!==request)return;
      cancelFade();audio.pause();state.wanted=false;state.status='error';render();
    }
  }
  function pause(immediate=false){
    if(!audio)return;
    ++request;state.wanted=false;state.status='paused';cancelFade();
    if(immediate){audio.pause();audio.volume=state.volume;}else fadeTo(0,()=>audio.pause());
    render();
  }
  function close(){if(initialized)menu($('#music-panel'),false,$('#music-button'));}
  function init({setMenu}){
    if(initialized)return;initialized=true;menu=setMenu;audio=$('#background-music');audio.loop=state.loop;
    $('#music-button').onclick=()=>{const open=$('#music-button').getAttribute('aria-expanded')!=='true';menu($('#music-panel'),open,$('#music-button'));if(open){render();$(`[data-music-track="${state.track}"]`).focus();}};
    $('#music-close').onclick=()=>{close();$('#music-button').focus();};
    $('#music-toggle').onclick=()=>state.wanted?pause():start();
    $('#music-tracks').onclick=e=>{const b=e.target.closest('[data-music-track]');if(b){start(b.dataset.musicTrack);$(`[data-music-track="${state.track}"]`).focus();}};
    $('#music-volume').oninput=e=>{cancelFade();state.volume=Number(e.target.value)/100;if(!state.wanted)audio.pause();audio.volume=state.wanted?state.volume:0;save();$('#music-volume-value').textContent=Math.round(state.volume*100)+'%';};
    $('#music-loop').onclick=()=>{state.loop=!state.loop;audio.loop=state.loop;save();$('#music-loop').setAttribute('aria-pressed',String(state.loop));$('#music-loop').setAttribute('aria-label',L.text(state.loop?'关闭单曲循环':'开启单曲循环'));};
    audio.addEventListener('ended',()=>{if(!state.loop){cancelFade();++request;state.wanted=false;state.status='paused';render();}});
    audio.addEventListener('error',()=>{if(!state.wanted)return;cancelFade();++request;audio.pause();state.wanted=false;state.status='error';render();});
    audio.addEventListener('pause',()=>{if(!audio.paused||!state.wanted||state.status==='loading')return;cancelFade();++request;state.wanted=false;state.status='paused';render();});
    $('.music-control').addEventListener('focusout',e=>{if(!e.currentTarget.contains(e.relatedTarget))close();});
    document.addEventListener('click',e=>{if(!e.target.closest('.music-control'))close();});
    $('.music-control').addEventListener('keydown',e=>{
      if(e.key==='Escape') {e.preventDefault();e.stopPropagation();close();$('#music-button').focus();return;}
      if(['ArrowLeft','ArrowRight',' ','Enter'].includes(e.key))e.stopPropagation();
      if(e.target.matches('[data-music-track]')&&['ArrowUp','ArrowDown','Home','End'].includes(e.key)){
        e.preventDefault();e.stopPropagation();const buttons=$$('[data-music-track]'),i=buttons.indexOf(e.target);buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length].focus();
      }
    });
    // Never resume sound automatically after a hidden tab or a restored page.
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.wanted)pause(true);});
    window.addEventListener('pagehide',()=>{if(state.wanted)pause(true);});
    render();
  }
  window.EUROPA_MUSIC={init,localize:render,close,inspect:()=>({...state,loadedTrack})};
})();
