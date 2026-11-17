// SPDX-License-Identifier: GPL-3.0-only
(() => {
  'use strict';
  const L=window.EUROPA_I18N;
  let {D,C}=L.set(L.initial());
  window.EUROPA=D;
  const layerDefaults = {terrain:true,rivers:true,lakes:true,realms:true,borders:true,cities:true,labels:true,routes:true,modern:false};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const city = id => D.cities.find(c => c.id === id);
  const person = id => D.people.find(p => p.id === id);
  const event = id => D.events.find(e => e.id === id);
  const topic = id => (D.topics||[]).find(t => t.id === id);
  const topicEvents = id => D.events.filter(e => (e.topics||[]).includes(id));
  const eventPeople = e => D.people.filter(p => (e.people||[]).includes(p.id)||(p.relatedEvents||[]).includes(e.id));
  const topicPeople = id => D.people.filter(p => (p.topics||[]).includes(id)||topicEvents(id).some(e => (e.people||[]).includes(p.id)||(p.relatedEvents||[]).includes(e.id)));
  const formatYear = y => L.locale==='en'?(y<0?`${Math.abs(y)} BCE`:`${y} CE`):(y<0?`公元前${Math.abs(y)}年`:`${y}年`);
  const shortYear = y => y < 0 ? `${Math.abs(y)} BCE` : String(y);
  const clampYear = y => { y = Math.round(Number(y)); return Number.isFinite(y) ? Math.max(-500, Math.min(2024, y === 0 ? 1 : y)) : 1200; };
  const era = y => D.eras.find(e => y >= e.start && y < e.end) || D.eras[0];
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const params = new URLSearchParams(location.search);
  const initialTopic=topic(params.get('topic'))?.id||'';
  const state = {reader:null,year: clampYear(params.get('year') || (initialTopic?topicEvents(initialTopic)[0]?.year:1200)),view:initialTopic?'events':'map',topicId:initialTopic,eventScope:'era',peopleScope:'all',eventId:'',cityId:'',eventLocation:0,placeScope:'era',persons:[],stop:0,playing:false,filter:'全部',quiz:null,range:[-500,2024],legendOpen:false,mode:'political',opacity:65,layers:{...layerDefaults}};
  if(initialTopic){const entries=topicEvents(initialTopic),from=Math.min(...entries.map(e=>e.year)),to=Math.max(...entries.map(e=>e.endYear||e.year));if(entries.length)state.range=[Math.max(-500,from),Math.min(2024,Math.max(from+1,to))];}
  let geo, land, modern, rivers, lakes, projection, path, planarPath, zoom, mapRoot, realmGroup, labelGroup, cityGroup, routeGroup, quizGroup, eventSiteGroup, waterGroup, seaGroup, terrainImage, changingLanguage=false, currentFeatures = [], currentGroups = [], playingTimer, toastTimer, renderFrame, mapReady = false, width = 0, height = 0, dataRequest = 0;
  const geometryCache = new Map(),polygonCache=new WeakMap();
  const colors = ['#c8b079','#8ca7b8','#b97f76','#97aa88','#ab91ad','#beb592','#86a9a2','#c9a883','#989bb6','#bc9b84'];
  const knownColors = [[/holy roman/i,'#d1b96f'],[/roman empire/i,'#b77873'],[/france/i,'#85a7bf'],[/england|angevin/i,'#b76d68'],[/byzant/i,'#b28bab'],[/ottoman/i,'#7fa58f'],[/almohad|umayyad|andalus/i,'#97ac8b'],[/hungary/i,'#a4b59e'],[/rus|novgorod/i,'#b9b58f'],[/castile/i,'#cdb579'],[/aragon/i,'#c3a25b'],[/sweden/i,'#86aab4'],[/denmark/i,'#ba827a']];
  const realmColor = name => { const hit = knownColors.find(([r]) => r.test(name)); if (hit) return hit[1]; let hash = 0; for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) | 0; return colors[Math.abs(hash) % colors.length]; };
  const realmName = f => {const correction=(C.corrections?.rules||[]).find(r=>r.action==='rename'&&state.year>=r.fromYear&&state.year<=r.toYear&&r.exactOriginal.includes(f.properties.original));if(L.locale==='en'){const names={'serbia-pre-kingdom-title':'Grand Principality of Serbia','halych-union-label-1200':'Galicia–Volhynia · Galicia','volhynia-union-label-1200':'Galicia–Volhynia · Volhynia'};return names[correction?.id]||f.properties.name||f.properties.original;}return L.text(correction?.nameZh||C.names?.[f.properties.name]||f.properties.nameZh||f.properties.name||f.properties.original);};
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const getSources = refs => [...new Map((refs||[]).map(s=>typeof s==='string'?D.sources[s]:s).filter(Boolean).map(s=>[s.url||s.title,s])).values()];
  const sourceLinks = refs => {const sources=getSources(refs);return sources.length ? `<details class="source-details"><summary>参考资料 · ${sources.length}</summary>${sources.map(s=>`<div class="source-entry"><b>${esc(s.title)}</b><p>${esc(s.institution||s.type||'历史资料')}${s.supports?' · '+esc(Array.isArray(s.supports)?s.supports.join('；'):s.supports):''}</p></div>`).join('')}</details>` : '';};


  function toast(message) { $('#toast').textContent = L.text(message); $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3600); }
  function updateURL() {
    const p = new URLSearchParams(); p.set('year', state.year);p.set('lang',L.locale);
    if(state.topicId)p.set('topic',state.topicId);
    if (state.persons.length) { p.set('person', state.persons.join(',')); p.set('stop', state.stop); }
    else if (state.eventId) p.set('event', state.eventId);
    else if (state.cityId) p.set('place', state.cityId);
    if (state.quiz) p.set('quiz', 'locate');
    history.replaceState(null, '', `${location.pathname}?${p}`);
  }
  function toggleSidebar(open) { $('#sidebar').classList.toggle('open', open); $('.atlas-shell').classList.toggle('panel-collapsed',!open && window.innerWidth>850); $('#mobile-panel-toggle').textContent=open?'收起历史':'阅读历史'; $('#mobile-panel-toggle').setAttribute('aria-expanded',String(open)); $('#panel-toggle use').setAttribute('href',open?'#i-right':'#i-left'); $('#panel-toggle').setAttribute('aria-expanded',String(open)); $('#panel-toggle').setAttribute('aria-label',open?'收起阅读面板':'展开阅读面板'); }
  function activateView(view) { $('#detail-dialog').close(); state.reader=null;state.view = view;if(view==='map')state.topicId='';$('.main-nav').style.setProperty('--active-tab',['map','events','places','people'].indexOf(view)); $$('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.nav === view)); renderSide();updateURL();reveal($('#side-content'),'right'); }
  function setYear(value, opts = {}) {
    const previous = state.year;
    state.year = clampYear(value);
    if (!opts.preserveSelection) { state.eventId = ''; state.cityId = ''; }
    if (state.year < state.range[0] || state.year > state.range[1]) state.range = [-500,2024];
    renderTimeline();
    if (!opts.keepSide || era(previous).id !== era(state.year).id) renderSide();
    else {$$('.event-card').forEach(el=>el.classList.toggle('active',event(el.dataset.event)?.year===state.year));const readingYear=$('.overview-context strong');if(readingYear)readingYear.textContent=formatYear(state.year);}
    if (mapReady) { d3.select('#map').classed('labels-hidden',!state.layers.labels||!!state.quiz);renderCities(); renderRoutes(); renderEventLocations();renderQuizMarkers();loadPeriod(); }
    updateURL();
  }
  function renderTimeline() {
    const e = era(state.year), exact = D.events.find(x => x.id === state.eventId) || D.events.find(x => x.year === state.year);
    $('#year-input').value = state.year; $('#year-prefix').textContent = state.year < 0 ? 'ANTE CHRISTUM' : 'ANNO DOMINI';
    $('#era-tag').textContent = e.name; $('#map-period').textContent = `${e.name} · ${e.en}`;
    $('#year-summary').textContent = exact ? exact.title : e.summary;
    const [min,max] = state.range, slider = $('#year-slider');
    slider.min = min; slider.max = max; slider.value = state.year;slider.setAttribute('aria-valuetext',formatYear(state.year));
    slider.style.setProperty('--progress', `${100*(state.year-min)/(max-min)}%`);
    const eraColors=['#8c786d','#75938e','#a9905c','#976c73','#72899b','#67897f'];
    $('#era-navigation').innerHTML = D.eras.map((a,i) => `<button data-era="${a.id}" style="--era-color:${eraColors[i]};flex:${Math.max(1,Math.min(a.end,max+1)-Math.max(a.start,min))}" class="${a.id===e.id?'active':''}" aria-pressed="${a.id===e.id}" ${a.end<=min||a.start>max?'hidden':''}>${L.locale==='en'?({classical:'Antiquity',early:'Early Medieval',high:'High Medieval',late:'Late Medieval',earlymodern:'Early Modern',modern:'Modern'}[a.id]):a.name}</button>`).join('');
    $('#timeline-zoom').textContent=state.range[0]===-500&&state.range[1]===2024?'放大时代':'全部年代';
    const ticks = min === -500 ? [-500,1,500,1000,1500,2024] : d3.ticks(min,max,7).filter(y => y !== 0);
    $('#timeline-ticks').innerHTML = ticks.map(y => `<span style="left:${100*(y-min)/(max-min)}%">${shortYear(y)}</span>`).join('');
    $('#event-dots').innerHTML = D.events.filter(x=>x.year>=min&&x.year<=max).map(x=>`<span style="left:${100*(x.year-min)/(max-min)}%"></span>`).join('');
    $('#play use').setAttribute('href',state.playing?'#i-pause':'#i-play'); $('#play').setAttribute('aria-label', state.playing?'暂停历史演进':'播放历史演进');$('#play').setAttribute('aria-pressed',String(state.playing));
  }
  function eventPlaceIds(e){return [...new Set([e.city,...(e.relatedPlaces||[])])].filter(id=>city(id));}
  function eventsAtPlace(id){return D.events.filter(e=>eventPlaceIds(e).includes(id));}
  function personCard(p){return `<button class="person-card" data-person="${esc(p.id)}"><span class="person-medallion">${esc(p.initial)}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.life)}<br>${esc(p.role)}</small></span></button>`;}
  function topicButton(t,compact=false){const count=topicEvents(t.id).length;return `<button class="${compact?'topic-chip':'topic-card'} ${state.topicId===t.id?'active':''}" data-topic="${esc(t.id)}" aria-pressed="${state.topicId===t.id}"><span><strong>${esc(t.title)}</strong>${compact?'':`<small>${esc(t.subtitle)}</small>`}</span><em>${count}</em></button>`;}
  function topicPicker(){const active=topic(state.topicId);return `<details class="topic-picker"><summary><span>${esc(active?.title||L.text('专题导读'))}</span><small>${L.text('选择专题')} ⌄</small></summary><div class="topic-grid">${(D.topics||[]).map(t=>topicButton(t,true)).join('')}</div></details>`;}
  function topicShortcuts(){const ids=state.year<476?['antiquity','medieval','diplomacy','science-culture']:state.year<1500?['medieval','renaissance','reformation','science-culture']:state.year<1789?['renaissance','reformation','revolutions','diplomacy']:state.year<1914?['revolutions','napoleonic','industrial','nation-states']:state.year<1946?['ww1','interwar','ww2','diplomacy']:['cold-war','european-integration','revolutions','diplomacy'];return `<div class="topic-shortcuts">${ids.map(id=>topic(id)).filter(Boolean).map(t=>topicButton(t,true)).join('')}</div>`;}
  function openTopic(id){
    const t=topic(id);if(!t)return;
    const entries=topicEvents(id);pause();state.persons=[];state.quiz=null;state.topicId=id;state.filter='全部';state.eventScope='all';state.placeScope='all';
    $('#sources-dialog').close();activateView('events');
    const years=entries.map(e=>e.year),from=years.length?Math.min(...years):t.start,to=years.length?Math.max(...entries.map(e=>e.endYear||e.year)):t.end;
    state.range=[Math.max(-500,from),Math.min(2024,Math.max(from+1,to))];
    setYear(state.year>=from&&state.year<=to?state.year:from);toggleSidebar(true);$('#side-content').scrollTop=0;resetMap();
  }
  function eventCard(e) {
    const place=e.placeLabel||city(e.city)?.name||'',date=e.date&&![''+e.year,formatYear(e.year)].includes(e.date)?e.date:'';
    return `<button class="event-card ${e.id===state.eventId || (!state.eventId&&e.year===state.year)?'active':''}" data-event="${e.id}"><span class="event-date">${e.year<0?(L.locale==='en'?Math.abs(e.year)+' BCE':'前'+Math.abs(e.year)):e.year}</span><strong>${esc(e.title)}</strong><span class="event-meta">${date?`<time>${esc(date)}</time><span aria-hidden="true"> · </span>`:''}${icon('pin')}${esc(place)}</span><p>${esc(e.summary)}</p></button>`;
  }
  function periodPlaces(period,all=false){
    const entries=D.events.filter(e=>(!state.topicId||(e.topics||[]).includes(state.topicId))&&(all||(e.year>=period.start&&e.year<period.end))),places=new Map();
    for(const e of entries)for(const id of eventPlaceIds(e)){if(!places.has(id))places.set(id,{place:city(id),events:[]});places.get(id).events.push(e);}
    return [...places.values()].sort((a,b)=>Math.min(...a.events.map(e=>Math.abs(e.year-state.year)))-Math.min(...b.events.map(e=>Math.abs(e.year-state.year)))||a.place.name.localeCompare(b.place.name,L.locale));
  }
  function placeCard(item){
    const c=item.place,years=item.events.map(e=>e.year),from=Math.min(...years),to=Math.max(...years);
    return `<button class="place-index-card" data-city="${esc(c.id)}"><span class="place-index-symbol">${icon(c.kind==='site'?'compass':'pin')}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.latin)}</small><span class="place-years">${esc(formatYear(from))}${from===to?'':' — '+esc(formatYear(to))}</span></span><span class="place-count">${item.events.length}<small>史事</small></span></button>`;
  }
  function renderPlaceIndex(period){
    const items=periodPlaces(period,state.topicId||state.placeScope==='all'),active=topic(state.topicId);
    $('#side-content').innerHTML=`<span class="eyebrow">LOCA & MEMORIA</span><h1 class="era-title">地点索引</h1><p class="index-intro">从城市、会址与战场走进历史。</p>${topicPicker()}<div class="filter-row"><button class="filter-chip ${!active&&state.placeScope==='era'?'active':''}" data-place-scope="era">本时代</button><button class="filter-chip ${!active&&state.placeScope==='all'?'active':''}" data-place-scope="all">全部地点</button></div><div class="index-caption"><span>${esc(active?.title||(state.placeScope==='era'?period.name:L.text('全部年代')))}</span><span>${items.length} 处地点</span></div><div class="place-index-list">${items.map(placeCard).join('')}</div>`;
  }
  function renderChronicle(period){
    const active=topic(state.topicId),entries=active?topicEvents(active.id):D.events.filter(e=>state.eventScope==='all'||(e.year>=period.start&&e.year<period.end));
    const filtered=state.filter==='全部'?entries:entries.filter(e=>e.category===state.filter),places=new Set(entries.flatMap(eventPlaceIds)),people=active?topicPeople(active.id):D.people.filter(p=>p.stops.some(s=>state.eventScope==='all'||(s.year>=period.start&&s.year<period.end)));
    const years=entries.map(e=>e.year),date=active&&years.length?`${L.text('收录年代')} · ${formatYear(Math.min(...years))} — ${formatYear(Math.max(...entries.map(e=>e.endYear||e.year)))}`:state.eventScope==='all'?L.text('全部年代'):period.dates;
    $('#side-content').innerHTML=`<span class="eyebrow">ANNALS & CONNECTIONS</span><h1 class="era-title">${esc(active?.title||L.text('编年史'))}</h1><div class="era-dates">${esc(date)}</div><p class="index-intro">${esc(active?.description||L.text('从事件出发，连接人物、地点与历史前后。'))}</p>${topicPicker()}${active?'':topicShortcuts()}<div class="chronicle-stats"><span><b>${entries.length}</b> 史事</span><button data-nav="places"><b>${places.size}</b> 地点 ›</button><button data-nav="people"><b>${people.length}</b> 人物 ›</button></div><div class="filter-row scope-filters"><button class="filter-chip ${!active&&state.eventScope==='era'?'active':''}" data-event-scope="era">本时代</button><button class="filter-chip ${!active&&state.eventScope==='all'?'active':''}" data-event-scope="all">全部年代</button></div><div class="filter-row">${['全部','政权','战争','文化','制度','社会'].map(f=>`<button class="filter-chip ${state.filter===f?'active':''}" data-filter="${f}">${f}</button>`).join('')}</div><h2 class="section-label"><span>重要事件</span><small>${filtered.length} 则史事</small></h2><div class="chronicle-list">${filtered.map(eventCard).join('')||'<p class="empty-state">这个时期尚未收录此类事件。<br>可切换分类或拖动时间轴。</p>'}</div>`;
  }
  function renderSide() {
    if (state.quiz) return renderQuiz();
    if (state.persons.length) return renderJourney();
    const e = era(state.year), root = $('#side-content');
    if(state.view==='places')return renderPlaceIndex(e);
    if(state.view==='events')return renderChronicle(e);
    if (state.view === 'people') {
      const active=topic(state.topicId),people=(active?topicPeople(active.id):D.people.filter(p=>state.peopleScope==='all'||p.stops.some(s=>s.year>=e.start&&s.year<e.end))).slice().sort((a,b)=>Math.min(...a.stops.map(s=>Math.abs(s.year-state.year)))-Math.min(...b.stops.map(s=>Math.abs(s.year-state.year))));
      root.innerHTML = `<span class="eyebrow">VITAE & ITINERA</span><h1 class="era-title">追随故人</h1><p class="era-description">从一座城，到另一座城。沿着生平的片段，重新走进他们的时代。</p>${topicPicker()}<div class="filter-row"><button class="filter-chip ${!active&&state.peopleScope==='era'?'active':''}" data-people-scope="era">本时代</button><button class="filter-chip ${!active&&state.peopleScope==='all'?'active':''}" data-people-scope="all">全部人物</button></div><div class="index-caption"><span>${esc(active?.title||(state.peopleScope==='era'?e.name:L.text('全部人物')))}</span><span>${people.length} 位人物</span></div>${people.map(personCard).join('')}<p class="side-note">搜索框可同时输入多个人名，用空格分隔。</p>`;
      return;
    }
    let events = D.events.filter(x => x.year >= e.start && x.year < e.end);
    const eraEventCount=events.length,places=periodPlaces(e);
    events=events.sort((a,b)=>Math.abs(a.year-state.year)-Math.abs(b.year-state.year)).slice(0,12).sort((a,b)=>a.year-b.year);
    const reigning = (D.reigns||[]).filter(r=>state.year>=r.from&&state.year<=r.to);
    const reignHTML = reigning.length ? `<div class="reigning"><small>同时代人物</small>${reigning.map(r=>`<button data-person-info="${r.person}">${icon('crown')}<span>${person(r.person).name}<em>${r.title}</em></span><span>›</span></button>`).join('')}</div>` : '';
    const nearbyPlaces=`<div class="overview-places">${places.slice(0,6).map(item=>`<button data-city="${esc(item.place.id)}">${icon('pin')}${esc(item.place.name)}</button>`).join('')}</div>`;
    const nearPeople=!reigning.length?D.people.filter(p=>p.stops.some(s=>Math.abs(s.year-state.year)<=15)).slice(0,3):[];
    root.innerHTML = `<span class="eyebrow">${e.en}</span><h1 class="era-title">${e.name}</h1><div class="era-dates">${e.dates}</div><div class="overview-context"><strong>${formatYear(state.year)}</strong><span>${eraEventCount} 则史事</span><button data-nav="places">${places.length} 处地点 ›</button></div><p class="era-description">${e.description}</p>${reignHTML}${nearPeople.length?`<div class="related-people-inline"><small>走近人物</small>${nearPeople.map(p=>`<button data-person-info="${esc(p.id)}">${esc(p.name)} ›</button>`).join('')}</div>`:''}${nearbyPlaces}<h2 class="section-label">专题导读</h2>${topicShortcuts()}${topicPicker()}<h2 class="section-label"><span>附近年代</span><small>${shortYear(events[0]?.year||state.year)} — ${shortYear(events.at(-1)?.year||state.year)}</small></h2><div class="chronicle-list">${events.map(eventCard).join('') || '<p class="empty-state">这个时期尚未收录此类事件。<br>可切换分类或拖动时间轴。</p>'}</div><button class="chronicle-more secondary-button" data-nav="events">展开本时代编年史 →</button>`;
  }
  function openDialog(id, html) { pause(); const el=$(id),content=$(id==='#detail-dialog'?'#detail-content':'#sources-content');content.innerHTML=html;if(id==='#detail-dialog'){toggleSidebar(true);if(!el.open)el.show();}else if(!el.open)el.showModal();content.scrollTop=0;reveal(content,id==='#detail-dialog'?'right':'up'); }
  function prose(value){return String(value||'').split(/\n\s*\n/).filter(Boolean).map(p=>`<p class="detail-body">${esc(p)}</p>`).join('');}
  function eventLocationHTML(e){
    const locations=e.eventLocations||[];
    if(!locations.length&&!e.locationNote)return '';
    return `<section class="event-geography"><h3 class="section-label">事件地点</h3>${locations.map((p,i)=>`<button class="event-location-button ${i===state.eventLocation?'active':''}" data-event-location="${i}" data-event-origin="${esc(e.id)}">${icon('pin')}<span><strong>${esc(p.name)}</strong><small>${esc(p.precision||'')}${p.precision?' · ':''}${Math.abs(p.coord[0]).toFixed(3)}°${p.coord[0]<0?'W':'E'}, ${Math.abs(p.coord[1]).toFixed(3)}°${p.coord[1]<0?'S':'N'}</small></span><span aria-hidden="true">↗</span></button>`).join('')}${e.locationNote?`<p class="location-note">${esc(e.locationNote)}</p>`:''}</section>`;
  }
  function openEvent(id) {
    const e = event(id); if (!e) return;state.reader={type:'event',id};
    if(state.topicId&&!(e.topics||[]).includes(state.topicId))state.topicId='';
    state.quiz = null; state.persons = []; state.eventId = id; state.cityId = e.city;if(!changingLanguage)state.eventLocation=0;
    setYear(e.year,{preserveSelection:true});if(e.eventLocations?.length)focusEventLocation(e.id,state.eventLocation);else focusCity(e.city,1.6);
    const related=D.events.filter(item=>item.id!==id&&!item.id.startsWith('city-')&&((e.topics||[]).some(t=>(item.topics||[]).includes(t))||Math.abs(item.year-e.year)<=10)).sort((a,b)=>Number(!(e.topics||[]).some(t=>(a.topics||[]).includes(t)))-Number(!(e.topics||[]).some(t=>(b.topics||[]).includes(t)))||Math.abs(a.year-e.year)-Math.abs(b.year-e.year)).slice(0,4).sort((a,b)=>a.year-b.year);
    const places=eventPlaceIds(e),refs=[...e.sources,...(e.eventLocations||[]).flatMap(p=>p.sourceIds||[])],people=eventPeople(e),topics=(e.topics||[]).map(topic).filter(Boolean);
    openDialog('#detail-dialog', `<div class="detail-kicker">ANNALS · ${esc(e.category)}</div><h2 class="detail-title">${esc(e.title)}</h2><div class="detail-subtitle">${esc(e.date||formatYear(e.year))} · ${esc(e.placeLabel||city(e.city)?.name)}</div>${topics.length?`<div class="event-topics">${topics.map(t=>`<button data-topic="${esc(t.id)}">${esc(t.title)} ›</button>`).join('')}</div>`:''}${prose(e.body)}${e.context?`<section class="event-explanation"><h3 class="section-label">历史背景</h3>${prose(e.context)}</section>`:''}${e.outcome?`<section class="event-explanation"><h3 class="section-label">后续影响</h3>${prose(e.outcome)}</section>`:''}${people.length?`<h3 class="section-label">相关人物</h3><div class="event-people">${people.map(personCard).join('')}</div>`:''}${eventLocationHTML(e)}<div class="action-row"><button class="primary-button" ${e.eventLocations?.length?`data-event-location="${state.eventLocation}" data-event-origin="${esc(e.id)}"`:`data-locate="${e.city}"`}>在舆图中查看</button><button class="secondary-button" data-city="${e.city}">阅读此地沿革</button></div>${places.length>1?`<h3 class="section-label">关联地点</h3><div class="related-places">${places.map(id=>`<button data-city="${esc(id)}">${esc(city(id).name)}</button>`).join('')}</div>`:''}${sourceLinks(refs)}${related.length?`<h3 class="section-label">继续探索</h3><div class="related-events">${related.map(eventCard).join('')}</div>`:''}`);
  }
  function chronicleRows(items, cityId) {
    return items.map(m=>`<article class="chronicle-row"><b>${esc(m.date||m.dateLabel||formatYear(m.year))}</b><div><strong>${esc(m.title)}</strong><p>${esc(m.text)}</p>${m.polity?`<em>${esc(m.polity)}</em>`:''}${m.eventId&&!m.eventId.startsWith('city-')?`<button class="text-button" data-event="${esc(m.eventId)}">阅读详解 ›</button>`:''}<button class="text-button" data-history-year="${m.year}" data-history-event="${m.eventId||D.events.find(e=>e.year===m.year&&(cityId?e.city===cityId:e.title===m.title))?.id||''}" ${cityId?`data-history-city="${cityId}"`:''}>查看此年舆图 ›</button></div></article>`).join('');
  }
  function openCity(id) {
    const c=city(id);if(!c)return;if(state.quiz)exitQuiz();state.reader={type:'city',id};
    state.cityId=id;state.eventId='';if(!changingLanguage&&state.year<c.since)setYear(c.since,{preserveSelection:true});updateURL();renderCities();renderEventLocations();focusCity(id,1.65);
    const profile=C.cities.find(p=>p.id===id), events=eventsAtPlace(id), stops=D.people.flatMap(p=>p.stops.filter(s=>s.city===id).map(s=>({...s,person:p})));
    const records=[...events.map(e=>({eventId:e.id,year:e.year,date:e.date,title:e.title,text:e.body})),...stops.filter(s=>!events.some(e=>e.year===s.year&&e.title.includes(s.person.name))).map(s=>({year:s.year,title:`${s.person.name} · ${s.title}`,text:s.text}))].sort((a,b)=>a.year-b.year);
    const milestones=[...records,...(profile?.milestones||[]).filter(m=>!records.some(r=>r.year===m.year))].sort((a,b)=>a.year-b.year), refs=[...(profile?.sources||[]),...events.flatMap(e=>e.sources),...stops.flatMap(s=>s.person.sources),...(c.coordSources||[])];
    openDialog('#detail-dialog',`<div class="detail-kicker">LOCUS & MEMORIA · 城市沿革</div><h2 class="detail-title">${esc(c.name)}</h2><div class="detail-subtitle">${esc(c.latin)}${c.modern?' · 今 '+esc(c.modern):''}</div>${profile?.overview||c.overview?`<p class="detail-body">${esc(profile?.overview||c.overview)}</p>`:''}<dl class="profile-facts"><dt>定位类型</dt><dd>${esc(c.coordPrecision||'城市参考点')}</dd><dt>地理坐标</dt><dd>${Math.abs(c.coord[0]).toFixed(3)}°${c.coord[0]<0?'W':'E'} · ${Math.abs(c.coord[1]).toFixed(3)}°${c.coord[1]<0?'S':'N'}</dd><dt>纪事</dt><dd>${milestones.length} 则 · ${formatYear(milestones[0]?.year||c.since)}起</dd></dl>${c.locationNote?`<p class="location-note">${esc(c.locationNote)}</p>`:''}<h3 class="section-label">城市纪事</h3>${chronicleRows(milestones,id)}${stops.length?`<h3 class="section-label">与此地有关的人物</h3><div class="related-places">${[...new Set(stops.map(s=>s.person.id))].map(id=>`<button data-person="${id}">${esc(person(id).name)}</button>`).join('')}</div>`:''}${sourceLinks(refs)}`);
  }
  function journeyStops() { return state.persons.flatMap(id => { const p=person(id); return p ? p.stops.map((s,i)=>({...s,person:p,personStop:i})) : []; }).sort((a,b)=>a.year-b.year || state.persons.indexOf(a.person.id)-state.persons.indexOf(b.person.id) || a.personStop-b.personStop); }
  function openPerson(ids, stop = 0) {
    pause(); state.quiz = null; state.eventId = ''; state.cityId = ''; state.persons = [...new Set((Array.isArray(ids)?ids:[ids]).filter(id=>person(id)))].slice(0,3);
    if (!state.persons.length) return;
    state.stop = Math.max(0,Math.min(Number(stop)||0,journeyStops().length-1)); activateView('people');
    $('#detail-dialog').close(); closeSearch();
    goStop(state.stop); toggleSidebar(true);
  }
  function renderJourney() {
    const people = state.persons.map(person), stops = journeyStops(), single = people.length === 1, first = people[0];
    $('#side-content').innerHTML = `<div class="route-heading"><button class="back-button" data-exit-journey>← 人物目录</button><span class="count-badge">${stops.length} 处生平节点</span></div><span class="eyebrow">VITAE & ITINERA</span><h1 class="era-title">${single?first.name:'故人同游'}</h1><div class="era-dates">${single?first.life:'CHRONICLES IN PARALLEL'}</div>${!single?people.map(p=>`<span class="multi-person-label">${p.name}</span>`).join(''):''}<p class="era-description">${single?first.bio:'多人的生平按年代排列；在同一年、同一地留下足迹时，标记为“同途”。'}</p><div class="route-step-controls"><button class="secondary-button" data-step="-1" ${state.stop===0?'disabled':''}>‹ 上一站</button><button class="primary-button" data-toggle-play>${state.playing?'暂停巡礼':'自动巡礼'}</button><button class="secondary-button" data-step="1" ${state.stop===stops.length-1?'disabled':''}>下一站 ›</button></div><div>${stops.map((s,i)=>{const overlap=stops.filter(v=>v.year===s.year&&v.city===s.city&&v.person.id!==s.person.id).length;return `<button class="route-stop ${state.stop===i?'active':''}" data-stop="${i}" data-number="${i+1}"><small>${formatYear(s.year)} · ${s.eventLocations?.[0]?.name||city(s.city).name}${overlap?' · 同途':''}</small><strong>${!single?s.person.name+' · ':''}${s.title}</strong><p>${s.text}</p></button>`;}).join('')}</div><button class="text-button" data-person-info="${first.id}">${icon('book')} 阅读人物传记</button>`;
  }
  function goStop(index) { const stops=journeyStops(); if (!stops.length) return; state.stop=Math.max(0,Math.min(index,stops.length-1)); const s=stops[state.stop]; state.cityId=s.city; setYear(s.year,{preserveSelection:true}); focusCoordinate(stopCoord(s),1.75); }
  function openPersonInfo(id) {
    const p=person(id);if(!p)return;state.reader={type:'person',id};const related=D.events.filter(e=>(p.relatedEvents||[]).includes(e.id)||(e.people||[]).includes(id));
    openDialog('#detail-dialog',`<div class="detail-kicker">VITA · 人物传记</div><h2 class="detail-title">${esc(p.name)}</h2><div class="detail-subtitle">${esc(p.en)} · ${esc(p.life)}</div><p class="detail-body">${esc(p.bio)}</p><p class="detail-body">${esc(p.relations)}</p><h3 class="section-label">生平纪事</h3>${p.stops.map(s=>`<article class="chronicle-row"><b>${formatYear(s.year)}</b><div><strong>${esc(s.title)}</strong><p>${esc(s.text)}</p>${s.locationNote?`<p class="location-note">${esc(s.locationNote)}</p>`:''}<button class="text-button" data-city="${s.city}">${esc(city(s.city).name)} ›</button></div></article>`).join('')}<button class="primary-button" data-person="${p.id}">沿着生平游历</button>${related.length?`<h3 class="section-label">相关史事</h3><div class="related-events">${related.map(eventCard).join('')}</div>`:''}${sourceLinks(p.sources)}`);
  }
  function leaveJourney() { pause(); state.persons=[];state.cityId='';state.stop=0;renderSide();renderRoutes();renderCities();updateURL(); }

  function openSources() {
    const refs=[...Object.values(D.sources),...C.cities.flatMap(c=>c.sources||[]),...C.polities.flatMap(p=>p.sources||[])],sources=[...new Map(refs.map(s=>[s.url,s])).values()];
    openDialog('#sources-dialog',`<div class="detail-kicker">BIBLIOTHECA · 欧陆资料馆</div><h2 class="detail-title">历史与地图</h2><div class="detail-subtitle">公元前500年 — 2024年</div><div class="library-stats"><span><b>${D.events.length}</b> 史事</span><span><b>${D.cities.length}</b> 地点</span><span><b>${C.polities.length}</b> 政权专题</span><span><b>${D.people.length}</b> 人物生平</span></div><h3 class="section-label">专题导读</h3><div class="topic-grid library-topics">${(D.topics||[]).map(t=>topicButton(t)).join('')}</div><h3 class="section-label">地图图层</h3><div class="profile-section"><h3>历史疆域</h3><p>Cliopatria v0.2.1 · Bennett、Mutch、Tollefson 等，Scientific Data，2025。按年代组织历史政权范围，配合中文名称、政权专题与事件索引。许可：CC BY 4.0。</p></div><div class="profile-section"><h3>地形与水系</h3><p>Natural Earth 1:10 million 海岸线、河流与湖泊。地形晕渲由 NOAA ETOPO1、USGS GMTED2010 高程生成，经 Mapzen / Tilezen Terrarium 分发。地理数据为公共领域作品。</p></div><h3 class="section-label">书目与史料</h3>${sources.map(s=>`<details class="source-item"><summary>${esc(s.title)}</summary><p>${esc(s.institution||s.type||'历史研究')}</p>${s.supports?`<p>${esc(Array.isArray(s.supports)?s.supports.join('；'):s.supports)}</p>`:`<p>用于相关历史条目的年代、事件背景与人物关系核对。</p>`}<p class="source-address">${esc(s.url)}</p></details>`).join('')}<p class="attribution-note">交互灵感：DeanChensj / 江山时序。本项目独立设计与实现。<br>D3 · ISC；Noto Serif SC、Cinzel、Uncial Antiqua · SIL Open Font License。<br>资料整理：2026年11月16日。</p>`);
  }
  async function share() {
    updateURL();
    try { await navigator.clipboard.writeText(location.href); toast('已复制当前地图链接，包含年份与所选内容'); }
    catch { state.reader={type:'share'};openDialog('#detail-dialog',`<div class="detail-kicker">SHARE THIS CHRONICLE</div><h2 class="detail-title">分享这一刻</h2><p class="detail-body">复制下面的链接，即可回到当前年份与地点。</p><input id="share-url" readonly value="${esc(location.href)}" aria-label="分享链接" style="width:100%;padding:12px;border:1px solid var(--line);background:var(--paper)">`);$('#share-url').select(); }
  }
  function search(query) {
    const q=query.trim().toLocaleLowerCase(); if(!q)return [];
    const tokens=q.split(/[,，、\s]+/).filter(Boolean), matchedPeople=D.people.filter(p=>tokens.some(t=>`${p.name} ${p.en} ${(p.aliases||[]).join(' ')} ${p.id} ${L.canonical().D.people.find(v=>v.id===p.id)?.name}`.toLowerCase().includes(t)));
    const result=[];
    (D.topics||[]).filter(t=>`${t.title} ${(t.aliases||[]).join(' ')}`.toLocaleLowerCase().includes(q)).forEach(t=>result.push({type:'topic',id:t.id,name:t.title,detail:`专题 · ${topicEvents(t.id).length} 则史事`}));
    if(matchedPeople.length>1) result.push({type:'multi',ids:matchedPeople.map(p=>p.id),name:matchedPeople.map(p=>p.name).join(' · '),detail:'多人同看 · 合并生平时间线'});
    D.cities.filter(c=>`${c.name} ${c.modern||''} ${c.latin} ${(c.aliases||[]).join(' ')} ${c.id} ${L.canonical().D.cities.find(v=>v.id===c.id)?.name}`.toLowerCase().includes(q)).forEach(c=>result.push({type:'city',id:c.id,name:c.name,detail:`地点 · ${c.latin}`}));
    matchedPeople.forEach(p=>result.push({type:'person',id:p.id,name:p.name,detail:`人物 · ${p.life}`}));
    D.events.filter(e=>`${e.title} ${e.summary} ${e.year} ${L.canonical().D.events.find(v=>v.id===e.id)?.title||''}`.toLowerCase().includes(q)).forEach(e=>result.push({type:'event',id:e.id,name:e.title,detail:`史事 · ${e.date||formatYear(e.year)}`}));
    currentGroups.filter(g=>`${g.name} ${g.english}`.toLowerCase().includes(q)).forEach(g=>result.push({type:'realm',id:g.id,name:g.name,detail:`政权 · ${formatYear(state.year)}`}));
    if(/^-?\d{1,4}$/.test(q)) result.push({type:'year',id:q,name:formatYear(clampYear(q)),detail:'跳转至这一年'});
    if(['小试','寻址','quiz'].some(s=>q.includes(s)))result.push({type:'quiz',name:'舆图寻址',detail:'开始五题地图挑战'});
    return result.slice(0,14).map(r=>({...r,name:L.text(r.name),detail:L.text(r.detail)}));
  }
  function searchRecommendations(){
    const current=state.year<476?'antiquity':state.year<1500?'medieval':state.year<1789?'reformation':state.year<1914?'revolutions':state.year<1946?'ww2':'cold-war';
    const topicIds=[...new Set([current,'antiquity','ww1','ww2','diplomacy'])].slice(0,4);
    const chip=(type,id,name)=>`<button class="search-suggestion" data-search-type="${type}" data-search-id="${esc(id)}">${icon(type==='person'?'route':type==='city'?'pin':'book')}<span>${esc(name)}</span></button>`;
    const group=(title,items)=>`<section class="search-suggestion-group"><h3>${title}</h3><div class="search-suggestion-grid">${items.join('')}</div></section>`;
    return `<div class="search-discovery"><div class="search-discovery-heading"><strong>从这里开始</strong><span>点击即可探索</span></div>${group('专题导读',topicIds.map(id=>topic(id)).filter(Boolean).map(t=>chip('topic',t.id,t.title)))}${group('人物足迹',['charlemagne','joan','napoleon'].map(person).filter(Boolean).map(p=>chip('person',p.id,p.name)))}${group('地点与史事',[...['rome','constantinople'].map(city).filter(Boolean).map(c=>chip('city',c.id,c.name)),...['magna-carta','verdun-battle-1916'].map(event).filter(Boolean).map(e=>chip('event',e.id,e.title))])}<div class="search-experiences"><button data-search-type="multi" data-search-id="charlemagne,otto"><strong>多人同看</strong><small>${esc(person('charlemagne').name)} × ${esc(person('otto').name)}</small></button><button data-search-type="quiz" data-search-id="locate"><strong>舆图寻址</strong><small>五道题，走遍欧陆</small></button></div><p class="search-keyboard-hint">↑↓ 选择 · Enter 打开 · Esc 收起</p></div>`;
  }
  function closeSearch(){setMenu($('#search-results'),false,$('#search'));}
  function showSearch() {
    const q=$('#search').value,results=search(q),el=$('#search-results');
    setMenu(el,true,$('#search'));
    el.innerHTML=q.trim()?(results.map(r=>`<button class="search-result" data-search-type="${r.type}" data-search-id="${esc(r.ids?.join(',')||r.id||'')}">${icon(r.type==='person'||r.type==='multi'?'route':r.type==='event'||r.type==='topic'?'book':'pin')}<span><strong>${esc(r.name)}</strong><small>${esc(r.detail)}</small></span></button>`).join('')||'<p class="search-empty">未找到匹配内容，试试下面的推荐。</p>'+searchRecommendations()):searchRecommendations();
  }
  function selectSearch(type,id) {
    closeSearch();$('#search').blur();
    if(type==='topic')openTopic(id);else if(type==='person'||type==='multi')openPerson(id.split(','));else if(type==='event')openEvent(id);
    else if(type==='city'){const c=city(id);if(c&&state.year<c.since)setYear(c.since);openCity(id);}
    else if(type==='year'){if(state.quiz)exitQuiz();$('#detail-dialog').close();leaveJourney();setYear(id);}
    else if(type==='realm'){openRealm(id);focusRealm(id);}else if(type==='quiz')startQuiz();
    const target=$('#detail-dialog').open?$('#detail-dialog .dialog-close'):$('#side-content');if(target.id==='side-content')target.tabIndex=-1;target.focus({preventScroll:true});
  }

  function step(direction) {
    if(state.quiz)return;$('#detail-dialog').close();
    if(state.persons.length){const stops=journeyStops(),next=state.stop+direction;if(next<0||next>=stops.length){pause();return;}goStop(next);return;}
    if(state.topicId){
      const entries=topicEvents(state.topicId),index=entries.findIndex(e=>e.id===state.eventId),next=index>=0?entries[index+direction]:direction>0?entries.find(e=>e.year>=state.year):entries.findLast(e=>e.year<=state.year);
      if(!next){pause();return;}state.eventId=next.id;state.cityId=next.city;state.eventLocation=0;setYear(next.year,{preserveSelection:true});
      if(next.eventLocations?.length)focusEventLocation(next.id,0);else focusCity(next.city);
      $(`#side-content [data-event="${next.id}"]`)?.scrollIntoView?.({block:'nearest',behavior:reducedMotion?'instant':'smooth'});return;
    }
    const entries=state.topicId?topicEvents(state.topicId):D.events,years=[...new Set([...entries.map(e=>e.year),...(state.topicId?[]:[800,1000,1200,1450])])].sort((a,b)=>a-b),next=direction>0?years.find(y=>y>state.year):[...years].reverse().find(y=>y<state.year);
    if(next===undefined){pause();return;}setYear(next);
  }
  function play() {if(state.quiz)return;$('#detail-dialog').close();clearInterval(playingTimer);state.playing=true;renderTimeline();if(state.persons.length)renderJourney();playingTimer=setInterval(()=>step(1),Number($('#play-speed').value));}
  function pause({redraw=true}={}) {state.playing=false;clearInterval(playingTimer);if(redraw){renderTimeline();if(state.persons.length&&!state.quiz)renderJourney();}else{$('#play use').setAttribute('href','#i-play');$('#play').setAttribute('aria-label',L.text('播放历史演进'));$('#play').setAttribute('aria-pressed','false');}}
  function togglePlay() {state.playing?pause():play();}

  function startQuiz() {
    pause();$('#detail-dialog').close();state.persons=[];state.eventId='';state.cityId='';state.quiz={index:0,score:0,guess:null,revealed:false,complete:false};activateView('map');setYear(D.quiz[0].year,{preserveSelection:true});resetMap();renderQuiz();renderCities();renderRoutes();toggleSidebar(true);updateURL();
  }
  function renderQuiz() {
    const q=state.quiz;if(!q)return;
    if(q.complete){$('#side-content').innerHTML=`<span class="eyebrow">EXPLORATOR EUROPAE</span><h1 class="era-title">巡游归来</h1><div class="quiz-emblem">✥</div><div class="quiz-score">${q.score}<small> / ${D.quiz.length*1000}</small></div><p class="era-description">${q.score>=4000?'欧陆舆图师':q.score>=2500?'行旅学者':'初访欧陆'}<br>每一次落针，都是一次与历史的相逢。</p><button class="primary-button" data-quiz-restart>再游一次</button><button class="secondary-button" data-quiz-exit>返回舆图</button>`;return;}
    const question=D.quiz[q.index],target=city(question.city);
    $('#side-content').innerHTML=`<div class="route-heading"><span class="eyebrow">TERRA INCOGNITA</span><button class="back-button" data-quiz-exit>结束挑战 ×</button></div><h1 class="era-title">舆图寻址</h1><div class="era-dates">${q.index+1} / ${D.quiz.length} · ${formatYear(question.year)}</div><p class="quiz-clue">${question.clue}</p><p class="side-note">地图已隐去地名。在舆图上点击落针，再确认答案。可拖动、缩放寻找位置。</p>${q.revealed?`<div class="detail-note"><b>${target.name}</b><br>距离约 ${Math.round(q.distance)} 公里<br>本题 ${q.points} 分 · 累计 ${q.score} 分</div><button class="primary-button" data-quiz-next>${q.index===D.quiz.length-1?'查看成绩':'下一处古城 →'}</button><p class="side-note">答案依据：${D.sources[event(question.event).sources[0]].title}</p>`:`<div class="detail-note">${q.guess?'已落针，可继续点击调整位置。':'等待在地图上落针…'}</div><button class="primary-button" data-quiz-confirm ${q.guess?'':'disabled'}>确认位置 ↵</button>`}`;
  }
  function quizGuess(point) {if(!state.quiz||state.quiz.revealed||state.quiz.complete)return;state.quiz.guess=point;renderQuiz();renderQuizMarkers();}
  function confirmQuiz() {const q=state.quiz;if(!q?.guess||q.revealed)return;const target=city(D.quiz[q.index].city);q.distance=d3.geoDistance(q.guess,target.coord)*6371;q.points=Math.round(1000*Math.exp(-q.distance/800));q.score+=q.points;q.revealed=true;renderQuiz();renderQuizMarkers();}
  function nextQuiz() {const q=state.quiz;if(!q)return;if(q.index===D.quiz.length-1){q.complete=true;renderQuiz();return;}q.index++;q.guess=null;q.revealed=false;state.cityId='';setYear(D.quiz[q.index].year);renderQuizMarkers();resetMap();}
  function exitQuiz() {state.quiz=null;renderSide();applyLayers();renderQuizMarkers();updateURL();}

  function buildMap() {
    const svg=d3.select('#map'),oldTransform=d3.zoomTransform(svg.node()),oldCenter=projection?projection.invert(oldTransform.invert([width/2,height/2])):null;
    width=$('.map-stage').clientWidth;height=$('.map-stage').clientHeight;
    if(!width||!height)return;
    svg.attr('viewBox',`0 0 ${width} ${height}`);svg.selectAll('*').remove();
    projection=d3.geoMercator().fitExtent([[Math.min(width*.08,70),28],[width-28,height-28]],{type:'MultiPoint',coordinates:[[-13,34],[41,67]]});
    path=d3.geoPath(projection);
    planarPath=d3.geoPath(d3.geoTransform({point(x,y){const p=projection([x,y]);this.stream.point(p[0],p[1]);}}));
    const defs=svg.append('defs');defs.append('clipPath').attr('id','viewport-clip').append('rect').attr('width',width).attr('height',height);
    defs.append('clipPath').attr('id','land-clip').append('path').datum(land).attr('d',planarPath).attr('clip-rule','evenodd');
    defs.append('clipPath').attr('id','water-label-clip').append('path').attr('d',`M-10000,-10000H10000V10000H-10000Z${planarPath(land)}`).attr('clip-rule','evenodd');
    const canvas=svg.append('g').attr('clip-path','url(#viewport-clip)');mapRoot=canvas.append('g');
    mapRoot.append('path').datum(d3.geoGraticule().step([10,10])()).attr('class','graticule').attr('d',path);
    mapRoot.append('path').datum(land).attr('class','map-land').attr('d',planarPath).attr('fill-rule','evenodd');
    const nw=projection([-20,74]),se=projection([55,28]);
    terrainImage=mapRoot.append('g').attr('clip-path','url(#land-clip)').attr('class','terrain-layer');
    terrainImage.append('image').attr('href','assets/geography/europe-hillshade.webp').attr('x',nw[0]).attr('y',nw[1]).attr('width',se[0]-nw[0]).attr('height',se[1]-nw[1]).attr('preserveAspectRatio','none');
    realmGroup=mapRoot.insert('g','.terrain-layer').attr('class','realm-layer');
    waterGroup=mapRoot.append('g').attr('class','water-layer');
    waterGroup.selectAll('.water-river').data(rivers?.features||[]).join('path').attr('class','water-river').attr('d',planarPath).attr('data-name',d=>d.properties.nameZh||d.properties.name).style('stroke-width',d=>d.properties.rank<=3?1:.65);
    waterGroup.selectAll('.water-lake').data(lakes?.features||[]).join('path').attr('class','water-lake').attr('d',planarPath).attr('fill-rule','evenodd');
    waterGroup.selectAll('.river-label').data((rivers?.features||[]).filter(f=>f.properties.nameZh&&f.properties.rank<=4)).join('text').attr('class','river-label').attr('x',d=>planarPath.centroid(d)[0]).attr('y',d=>planarPath.centroid(d)[1]).text(d=>L.locale==='en'?d.properties.name:L.text(d.properties.nameZh));
    mapRoot.append('path').datum(modern).attr('id','modern-borders').attr('d',path).attr('fill','none').attr('stroke','#786c61').attr('stroke-width',.7).attr('stroke-dasharray','3 3').attr('vector-effect','non-scaling-stroke').attr('opacity',.65).attr('pointer-events','none');
    seaGroup=mapRoot.append('g').attr('class','sea-layer').attr('clip-path','url(#water-label-clip)');renderSeaLabels();
    labelGroup=mapRoot.append('g');routeGroup=mapRoot.append('g');cityGroup=mapRoot.append('g');eventSiteGroup=mapRoot.append('g').attr('class','event-sites');quizGroup=mapRoot.append('g');
    zoom=d3.zoom().scaleExtent([.7,8]).extent([[0,0],[width,height]]).translateExtent([[-width,-height],[width*2,height*2]]).filter(e=>!e.ctrlKey&&!e.button&&e.type!=='dblclick').on('zoom',e=>{const level=e.transform.k>=1.6;mapRoot.attr('transform',e.transform);if(level!==state.cityDetail){state.cityDetail=level;renderCities();}rescaleMarkers(e.transform.k);updateScale(e.transform);});
    svg.call(zoom).on('dblclick.zoom',null).on('click.quiz',e=>{if(e.defaultPrevented||!state.quiz)return;const p=d3.pointer(e,svg.node()),v=d3.zoomTransform(svg.node()).invert(p),coord=projection.invert(v);if(coord&&Number.isFinite(coord[0])&&Number.isFinite(coord[1]))quizGuess(coord);}).on('dblclick.trace',e=>{if(state.quiz)return;const p=d3.pointer(e,svg.node()),v=d3.zoomTransform(svg.node()).invert(p),coord=projection.invert(v);const c=D.cities.filter(c=>c.since<=state.year).sort((a,b)=>d3.geoDistance(coord,a.coord)-d3.geoDistance(coord,b.coord))[0];if(c&&d3.geoDistance(coord,c.coord)*6371<180)openCity(c.id);});
    let transform=d3.zoomIdentity;
    if(oldCenter&&(oldTransform.k!==1||oldTransform.x!==0||oldTransform.y!==0)){const p=projection(oldCenter);transform=d3.zoomIdentity.translate(width/2-oldTransform.k*p[0],height/2-oldTransform.k*p[1]).scale(oldTransform.k);}
    svg.call(zoom.transform,transform);applyLayers();renderQuizMarkers();
  }
  const seaDefinitions=[
    {id:'atlantic',zh:'大西洋',en:'Atlantic Ocean',coord:[-14.4,46],angle:-68,width:150},
    {id:'north',zh:'北海',en:'North Sea',coord:[3.8,56.9],angle:0,width:88},
    {id:'baltic',zh:'波罗的海',en:'Baltic Sea',coord:[19.4,57.5],angle:-62,width:85},
    {id:'mediterranean',zh:'地中海',en:'Mediterranean Sea',coord:[18.4,34.2],angle:0,width:162},
    {id:'black',zh:'黑海',en:'Black Sea',coord:[34.8,43.25],angle:0,width:82}
  ];
  let seaAudit=[];const seaLayoutCache=new Map();
  function renderSeaLabels(){
    if(!seaGroup)return;
    seaGroup.selectAll('text').data(seaDefinitions,d=>d.id).join('text').attr('class','sea-label').attr('data-sea',d=>d.id).attr('text-anchor','middle').attr('dominant-baseline','central').text(d=>L.locale==='en'?d.en:L.text(d.zh));
    layoutSeaLabels(d3.zoomTransform($('#map')).k);
  }
  function layoutSeaLabels(k){
    if(!seaGroup||!land||!projection)return;const bucket=Math.max(.7,Math.floor(k*10)/10),key=`${L.locale}:${width}:${height}:${bucket}`;const cached=seaLayoutCache.get(key);if(cached){seaAudit=cached;seaGroup.selectAll('text').attr('transform',d=>`translate(${projection(d.coord)}) rotate(${d.angle}) scale(${1/k})`).each(function(d){const item=cached.find(x=>x.id===d.id);d3.select(this).style('font-size',`${Math.max(7,item.fontSize)}px`).style('letter-spacing',L.locale==='en'?'1.1px':'2px').style('display',item.visible?null:'none');});return;}seaAudit=[];
    seaGroup.selectAll('text').each(function(d){
      const el=d3.select(this),label=L.locale==='en'?d.en:L.text(d.zh),center=projection(d.coord),angle=d.angle*Math.PI/180;
      let size=L.locale==='en'?11:12,samples=[],fits=false;
      for(;size>=7;size-=.5){
        const textWidth=Math.min(d.width,label.length*size*(L.locale==='en'?.68:1.05)+Math.max(0,label.length-1)*1.1),half=textWidth/(2*bucket),h=size*.65/bucket;
        samples=[];
        for(let x=-half;x<=half+.1;x+=Math.max(1,half/5))for(const y of [-h,0,h])samples.push(projection.invert([center[0]+x*Math.cos(angle)-y*Math.sin(angle),center[1]+x*Math.sin(angle)+y*Math.cos(angle)]));
        fits=samples.every(p=>!containsPoint(land.features,p));if(fits)break;
      }
      el.attr('transform',`translate(${center}) rotate(${d.angle}) scale(${1/k})`).style('font-size',`${Math.max(7,size)}px`).style('letter-spacing',L.locale==='en'?'1.1px':'2px').style('display',fits?null:'none');
      seaAudit.push({id:d.id,label,visible:fits,fontSize:size,onLand:samples.some(p=>containsPoint(land.features,p))});
    });seaLayoutCache.set(key,seaAudit);
  }
  function seaLabelAudit(){return seaAudit.map(s=>({...s}));}
  let labelWidths=new WeakMap();
  function measuredLabelWidth(node,fallback){
    const key=`${node.textContent}:${node.style.fontSize}:${L.locale}`,cached=labelWidths.get(node);
    if(cached?.key===key)return cached.width;
    let width=fallback;try{width=node.getComputedTextLength()||fallback;}catch{}
    labelWidths.set(node,{key,width});return width;
  }
  function updateScale(transform) {
    const a=projection.invert(transform.invert([width/2-50,height*.7])),b=projection.invert(transform.invert([width/2+50,height*.7])),km=d3.geoDistance(a,b)*6371;
    const distance=[10,20,50,100,200,500,1000,2000].filter(v=>v<=km).pop()||10;
    $('#map-scale i').style.width=`${Math.max(20,Math.min(120,100*distance/km))}px`;$('#map-scale span').textContent=`${distance} km`;
  }
  function rescaleMarkers(k) {
    layoutSeaLabels(k);
    cityGroup?.selectAll('.city-marker').attr('transform',d=>`translate(${projection(d.coord)}) scale(${1/k})`);
    routeGroup?.selectAll('.route-dot').attr('transform',d=>`translate(${projection(stopCoord(d))}) scale(${1/k})`);
    eventSiteGroup?.selectAll('.event-site').attr('transform',d=>`translate(${projection(d.coord)}) scale(${1/k})`);
    quizGroup?.selectAll('.quiz-marker').attr('transform',d=>`translate(${projection(d.coord)}) scale(${1/k})`);
    labelGroup?.selectAll('text').style('font-size',`${Math.min(18,13*Math.sqrt(k))/k}px`);
    waterGroup?.selectAll('.river-label').style('font-size',`${10/k}px`).style('display',state.layers.rivers&&state.layers.labels&&!state.quiz&&k>=1.35?null:'none');
    waterGroup?.selectAll('.water-river').style('display',d=>state.layers.rivers&&(k>=1.2||d.properties.rank<=5)?null:'none');
    const occupied=state.layers.cities&&state.layers.labels&&!state.quiz?(event(state.eventId)?.eventLocations||[]).map(p=>{const point=projection(p.coord);return {x:point[0]*k+11,y:point[1]*k-13,w:p.name.length*(L.locale==='en'?7:11)};}):[];
    const markers=cityGroup?.selectAll('.city-marker').nodes()||[];
    const timelyPlaces=new Set(D.events.filter(e=>e.year===state.year||state.topicId&&(e.topics||[]).includes(state.topicId)).flatMap(eventPlaceIds));
    markers.sort((a,b)=>Number(b.__data__.id===state.cityId)-Number(a.__data__.id===state.cityId)||Number(timelyPlaces.has(b.__data__.id))-Number(timelyPlaces.has(a.__data__.id))||Number(!!b.__data__.important)-Number(!!a.__data__.important));
    for(const node of markers){
      const d=node.__data__,p=projection(d.coord),text=node.querySelector('text'),w=measuredLabelWidth(text,d.name.length*(L.locale==='en'?7:11)),selected=d.id===state.cityId;
      const positions=[{x:8,y:-7},{x:8,y:17},{x:-w-8,y:-7},{x:-w-8,y:17}];
      const position=positions.find(offset=>{const box={x:p[0]*k+offset.x,y:p[1]*k+offset.y,w};return !occupied.some(b=>Math.abs(b.y-box.y)<19&&b.x<box.x+w+8&&b.x+b.w+8>box.x);})||(selected?positions[0]:null);
      d3.select(text).attr('x',position?.x??8).attr('y',position?.y??-7).style('display',state.layers.labels&&position?null:'none');
      if(position)occupied.push({x:p[0]*k+position.x,y:p[1]*k+position.y,w});
    }
  }
  function applyLayers() {
    const svg=d3.select('#map');svg.classed('labels-hidden',!state.layers.labels||!!state.quiz).classed('realm-borderless',!state.layers.borders).style('--realm-opacity',state.opacity/100);
    Object.keys(layerDefaults).forEach(key=>{$(`#layer-${key}`).checked=state.layers[key];});
    $$('[data-map-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mapMode===state.mode);b.setAttribute('aria-pressed',String(b.dataset.mapMode===state.mode));});
    $('#realm-opacity').value=state.opacity;$('#opacity-value').value=`${state.opacity}%`;
    terrainImage?.style('display',state.layers.terrain?null:'none');waterGroup?.selectAll('.water-lake').style('display',state.layers.lakes?null:'none');
    d3.select('#modern-borders').style('display',state.layers.modern?null:'none');
    renderTerritories();renderCities();renderRoutes();renderEventLocations();
    if(mapRoot)rescaleMarkers(d3.zoomTransform($('#map')).k);
  }
  function resetMap() {if(!mapReady||!zoom)return;d3.select('#map').interrupt().transition().duration(reducedMotion?0:450).call(zoom.transform,d3.zoomIdentity);}
  function focusCity(id,k=1.7) {const c=city(id);if(!c||!mapReady||changingLanguage)return;const p=projection(c.coord);d3.select('#map').interrupt().transition().duration(reducedMotion?0:650).call(zoom.transform,d3.zoomIdentity.translate(width*.54-k*p[0],height*.48-k*p[1]).scale(k));}
  function focusCoordinate(coord,k=1.9){if(!coord||!mapReady||changingLanguage)return;const p=projection(coord);d3.select('#map').interrupt().transition().duration(reducedMotion?0:550).call(zoom.transform,d3.zoomIdentity.translate(width*.5-k*p[0],height*.49-k*p[1]).scale(k));}
  function focusEventLocation(id,index){const selected=event(id),point=selected?.eventLocations?.[index];if(!point)return;state.eventLocation=index;focusCoordinate(point.coord);renderEventLocations();$$('[data-event-location]').forEach(b=>{if(b.dataset.eventOrigin===id)b.classList.toggle('active',Number(b.dataset.eventLocation)===index);});}
  function renderEventLocations(){
    if(!eventSiteGroup)return;const selected=event(state.eventId),locations=state.layers.cities&&!state.quiz?(selected?.eventLocations||[]):[];
    const marks=eventSiteGroup.selectAll('.event-site').data(locations.map((p,index)=>({...p,index})),d=>d.index).join(enter=>{const g=enter.append('g').attr('class','event-site').attr('role','button').attr('tabindex',0);g.append('circle').attr('class','site-ring').attr('r',10);g.append('circle').attr('class','site-dot').attr('r',4);g.append('text').attr('x',11).attr('y',-13);g.append('title');return g;});
    const activate=d=>{if(!$('#detail-dialog').open)openEvent(selected.id);focusEventLocation(selected.id,d.index);};
    marks.classed('selected',d=>d.index===state.eventLocation).attr('aria-label',d=>`${d.name} · ${selected?.title||''}`).on('click',(e,d)=>{e.stopPropagation();activate(d);}).on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();activate(d);}});
    marks.select('text').text(d=>d.name).style('display',state.layers.labels?null:'none');marks.select('title').text(d=>`${d.name} · ${selected?.date||''}`);rescaleMarkers(d3.zoomTransform($('#map')).k);
  }
  function stopCoord(stop){return stop.eventLocations?.[0]?.coord||city(stop.city).coord;}
  function renderCities() {
    if(!cityGroup)return;
    const horizon=state.year>=1914?8:35,nearby=new Set(D.events.filter(e=>Math.abs(e.year-state.year)<=horizon&&(!state.topicId||(e.topics||[]).includes(state.topicId))).flatMap(eventPlaceIds));
    let visible=D.cities.filter(c=>c.since<=state.year && (d3.zoomTransform($('#map')).k>=1.6||c.important||c.id===state.cityId||nearby.has(c.id)));
    if(state.quiz||!state.layers.cities)visible=[];
    const markers=cityGroup.selectAll('.city-marker').data(visible,d=>d.id).join(enter=>{const g=enter.append('g').attr('class','city-marker').attr('tabindex',0).attr('role','button');g.append('circle').attr('r',3);g.append('text').attr('x',7).attr('y',-6);g.append('title');return g;});
    markers.classed('selected',d=>d.id===state.cityId).attr('aria-label',d=>`${d.name}，阅读此地历史`).on('click',(e,d)=>{e.stopPropagation();openCity(d.id);}).on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openCity(d.id);}});
    markers.select('text').text(d=>d.name);markers.select('title').text(d=>`${d.name} · ${d.latin}`);rescaleMarkers(d3.zoomTransform($('#map')).k);
  }
  function renderRoutes() {
    if(!routeGroup)return;routeGroup.selectAll('*').remove();if(!state.layers.routes||state.quiz)return;
    const stops=journeyStops();state.persons.forEach((id,pi)=>{const p=person(id),coords=p.stops.map(stopCoord);routeGroup.append('path').datum({type:'LineString',coordinates:coords}).attr('d',planarPath).attr('class','route-line').style('stroke',pi===0?'#743e37':pi===1?'#547575':'#8f7841');});
    const unique=stops.filter((s,i)=>!stops.some((o,j)=>j>i&&o.city===s.city&&i!==state.stop)||i===state.stop);
    const g=routeGroup.selectAll('.route-dot').data(unique).join('g').attr('class',d=>'route-dot'+(stops.indexOf(d)===state.stop?' current':'')).attr('role','button').attr('tabindex',0).attr('aria-label',d=>`${d.person.name}，${formatYear(d.year)}，${d.title}`).on('click',(e,d)=>{e.stopPropagation();goStop(stops.indexOf(d));}).on('keydown',(e,d)=>{if(e.key==='Enter'){goStop(stops.indexOf(d));}});
    g.append('circle').attr('r',9);g.append('text').text(d=>stops.indexOf(d)+1);g.append('title').text(d=>`${formatYear(d.year)} ${d.person.name} · ${d.title}`);rescaleMarkers(d3.zoomTransform($('#map')).k);
  }
  function renderQuizMarkers() {if(!quizGroup)return;quizGroup.selectAll('*').remove();const q=state.quiz;if(!q?.guess)return;const points=[{coord:q.guess,label:'你的落针'}];if(q.revealed)points.push({coord:city(D.quiz[q.index].city).coord,label:city(D.quiz[q.index].city).name});const g=quizGroup.selectAll('g').data(points).join('g').attr('class','quiz-marker');g.append('circle').attr('r',6);g.append('text').attr('x',10).attr('y',-9).text(d=>d.label);if(q.revealed)quizGroup.append('path').datum({type:'LineString',coordinates:points.map(d=>d.coord)}).attr('d',planarPath).attr('class','route-line');rescaleMarkers(d3.zoomTransform($('#map')).k);}
  function parentNames(value) {return (value||'').split(';').map(s=>s.trim()).filter(Boolean);}
  function selectFeatures(features,year) {
    const candidates=features.filter(f=>f.properties.fromYear<=year&&f.properties.toYear>=year).filter(f=>!(C.corrections?.rules||[]).some(r=>r.action==='hide'&&year>=r.fromYear&&year<=r.toYear&&r.exactOriginal.includes(f.properties.original)&&(!r.recordIds||r.recordIds.includes(f.properties.recordId)))).filter(f=>!(state.eventId==='constantinople-1453'&&year===1453&&f.properties.original==='Byzantine Empire'));
    const names=new Set(candidates.map(f=>f.properties.original));
    return candidates.filter(f=>!parentNames(f.properties.memberOf).some(name=>{const unwrapped=name.replace(/^\(|\)$/g,'');return name!==f.properties.original&&(names.has(name)||(unwrapped!==f.properties.original&&names.has(unwrapped)));})).map(f=>{
      const variant=f.geometryVariants?.find(v=>v.fromYear<=year&&year<=v.toYear);
      return variant?{...f,geometry:variant.geometry,resolvedSourceRecords:variant.sourceRecords}:f;
    });
  }
  function renderTerritories() {
    if(!realmGroup||!geo)return;
    currentFeatures=selectFeatures(geo.features,state.year);
    const groups=new Map();for(const f of currentFeatures){const id=f.properties.id;if(!groups.has(id))groups.set(id,{id,name:realmName(f),english:f.properties.name,features:[],area:0});const group=groups.get(id);group.features.push(f);group.area+=planarPath.area(f);}
    currentGroups=[...groups.values()].sort((a,b)=>b.area-a.area);
    const paths=realmGroup.selectAll('path').data(currentFeatures,d=>d.properties.recordId).join('path').attr('class','realm').attr('d',planarPath).attr('fill',d=>realmColor(d.properties.name)).attr('fill-rule','evenodd').style('display',state.layers.realms?null:'none').on('click',(e,d)=>{if(state.quiz)return;e.stopPropagation();openRealm(d.properties.id);}).on('mouseenter',(e,d)=>{if(state.quiz)return;highlightRealm(d.properties.id);showTooltip(e,realmName(d));}).on('mousemove',(e,d)=>showTooltip(e,realmName(d))).on('mouseleave',()=>{highlightRealm(null);$('#map-tooltip').hidden=true;});
    paths.selectAll('title').data(d=>[d]).join('title').text(d=>`${realmName(d)} · ${formatYear(state.year)}`);
    labelGroup.selectAll('*').remove();
    const occupied=state.layers.cities?D.cities.filter(c=>c.since<=state.year&&(c.important||c.id===state.cityId)).map(c=>{const p=projection(c.coord),w=c.name.length*(L.locale==='en'?7:11);return {x:p[0]+8+w/2,y:p[1]-7,w,h:15};}):[];
    for(const sea of seaDefinitions){const audit=seaAudit.find(s=>s.id===sea.id);if(audit?.visible&&sea.angle===0){const p=projection(sea.coord);occupied.push({x:p[0],y:p[1],w:sea.width,h:18});}}
    if(state.layers.realms&&!state.quiz){
      for(const group of currentGroups.filter(g=>(g.features[0].properties.nameZh||C.names?.[g.english])).slice(0,32)){
        if(group.area<450)continue;
        const largest=[...group.features].sort((a,b)=>planarPath.area(b)-planarPath.area(a))[0],center=planarPath.centroid(largest),label=(L.locale==='en'?group.name.replace(/^(?:Grand )?(?:Kingdom|Principality|Republic|Duchy|County|Sultanate|Crown) of /,''):group.name.replace(/（.*?）|及附庸/g,''));
        const text=labelGroup.append('text').attr('class','realm-label').attr('text-anchor','middle').text(label),wide=measuredLabelWidth(text.node(),label.length*(L.locale==='en'?8.5:12))+8;
        const candidates=[center];
        for(const dy of [-24,24,-44,44,0])for(const dx of [0,-28,28,-55,55])candidates.push([center[0]+dx,center[1]+dy]);
        const p=candidates.find(p=>Number.isFinite(p[0])&&p[0]>40&&p[0]<width-50&&p[1]>60&&p[1]<height-65&&containsPoint(group.features,projection.invert(p))&&!occupied.some(b=>Math.abs(b.x-p[0])<(b.w+wide)/2+5&&Math.abs(b.y-p[1])<22));
        if(!p){text.remove();continue;}
        occupied.push({x:p[0],y:p[1],w:wide,h:18});
        text.attr('x',p[0]).attr('y',p[1]);
      }
    }
    $('#legend').innerHTML=state.layers.realms&&!state.quiz?`<div class="legend-caption">${formatYear(state.year)} · 政权范围概览 <span> / 点击色块读档案</span></div>${currentGroups.slice(0,8).map(g=>`<button class="legend-item" data-realm="${esc(g.id)}"><i style="background:${realmColor(g.english)}"></i>${esc(g.name)}</button>`).join('')}${currentGroups.length>8?`<button class="legend-item" data-all-realms>另 ${currentGroups.length-8} 个政权 ›</button>`:''}`:'';
    $('#legend-wrap').hidden=!state.layers.realms||!!state.quiz;$('#legend').hidden=!state.legendOpen||!state.layers.realms||!!state.quiz;$('#legend-count').textContent=currentGroups.length;$('#legend-toggle').setAttribute('aria-expanded',String(state.legendOpen));
    $('#snapshot-note').textContent=`疆域依据：Cliopatria v0.2.1 · ${currentGroups.length} 个政权 / 体系 · 年度区间重建 · 数据截至2024年`;
    rescaleMarkers(d3.zoomTransform($('#map')).k);
  }
  function highlightRealm(id) {realmGroup?.selectAll('path').classed('highlight',d=>d.properties.id===id).classed('muted',d=>id&&d.properties.id!==id);}
  function showTooltip(e,text) {if(state.quiz)return;const box=$('.map-stage').getBoundingClientRect(),el=$('#map-tooltip');el.textContent=L.text(text);el.hidden=false;el.style.left=`${Math.min(e.clientX-box.left+14,width-180)}px`;el.style.top=`${Math.max(50,e.clientY-box.top-30)}px`;}
  function polityProfile(g) {
    const name=g.english.replace(/^\(|\)$/g,'');return C.polities.find(p=>(!p.matchYears||(state.year>=p.matchYears.from&&state.year<=p.matchYears.to))&&((p.aliases||[]).some(a=>a.toLowerCase()===name.toLowerCase())||(p.matchPattern&&new RegExp(p.matchPattern,'i').test(name))));
  }
  function containsPoint(features,coord) {
    const inside=(ring)=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>coord[1])!==(b[1]>coord[1])&&coord[0]<(b[0]-a[0])*(coord[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
    return features.some(f=>{let polygons=polygonCache.get(f);if(!polygons){polygons=(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).map(r=>{let xmin=Infinity,ymin=Infinity,xmax=-Infinity,ymax=-Infinity;for(const p of r[0]){xmin=Math.min(xmin,p[0]);xmax=Math.max(xmax,p[0]);ymin=Math.min(ymin,p[1]);ymax=Math.max(ymax,p[1]);}return {r,xmin,xmax,ymin,ymax};});polygonCache.set(f,polygons);}return polygons.some(p=>coord[0]>=p.xmin&&coord[0]<=p.xmax&&coord[1]>=p.ymin&&coord[1]<=p.ymax&&inside(p.r[0])&&!p.r.slice(1).some(inside));});
  }
  function openRealm(id) {
    const g=currentGroups.find(g=>g.id===id);if(!g)return;state.reader={type:'realm',id};
    const profile=polityProfile(g),places=D.cities.filter(c=>c.since<=state.year&&containsPoint(g.features,c.coord));
    const history=profile?.milestones||D.events.filter(e=>places.some(c=>c.id===e.city)&&Math.abs(e.year-state.year)<100).map(e=>({eventId:e.id,year:e.year,date:e.date,title:e.title,text:e.body}));
    const center=profile?.center,centerText=typeof center==='string'?center:Array.isArray(center)?center.join('、'):center?.text||center?.name||'';
    openDialog('#detail-dialog',`<div class="detail-kicker">REGNUM · 政权档案</div><h2 class="detail-title">${esc(g.name)}</h2><div class="detail-subtitle">${esc(g.english)} · ${formatYear(state.year)}</div>${profile&&profile.name!==g.name?`<span class="profile-topic">专题 · ${esc(profile.name)}</span>`:''}${profile?`<p class="detail-body">${esc(profile.overview)}</p>`:''}<dl class="profile-facts">${profile?.periodLabel?`<dt>历史时期</dt><dd>${esc(profile.periodLabel)}</dd>`:''}${centerText?`<dt>统治中心</dt><dd>${esc(centerText)}</dd>`:''}<dt>地图年份</dt><dd>${formatYear(state.year)}</dd>${places.length?`<dt>图内地点</dt><dd>${places.map(c=>esc(c.name)).join('、')}</dd>`:''}</dl><button class="secondary-button" data-focus-realm="${esc(id)}">聚焦疆域</button>${(profile?.institutions||[]).map(i=>`<section class="profile-section"><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></section>`).join('')}${history.length?`<h3 class="section-label">历史纪事</h3>${chronicleRows(history)}`:''}${places.length?`<h3 class="section-label">走进城市</h3><div class="related-places">${places.map(c=>`<button data-city="${c.id}">${esc(c.name)}</button>`).join('')}</div>`:''}${!profile?`<section class="profile-section"><h3>疆域沿革</h3><p>${formatYear(state.year)}的${esc(g.name)}在地图中包含 ${g.features.length} 片区域。拖动时间轴可逐年查看其疆域变化。</p></section><h3 class="section-label">同时代史事</h3>${D.events.filter(e=>Math.abs(e.year-state.year)<=150).slice(0,3).map(eventCard).join('')}`:''}${sourceLinks(profile?.sources||['maps'])}`);
  }
  function focusRealm(id) {const g=currentGroups.find(g=>g.id===id);if(!g)return;if(changingLanguage)return;const b=planarPath.bounds({type:'FeatureCollection',features:g.features}),dx=b[1][0]-b[0][0],dy=b[1][1]-b[0][1],k=Math.min(4,Math.max(.9,.7/Math.max(dx/width,dy/height))),x=(b[0][0]+b[1][0])/2,y=(b[0][1]+b[1][1])/2;d3.select('#map').interrupt().transition().duration(reducedMotion?0:650).call(zoom.transform,d3.zoomIdentity.translate(width/2-k*x,height/2-k*y).scale(k));highlightRealm(id);}
  function allRealms() {state.reader={type:'realms'};openDialog('#detail-dialog',`<div class="detail-kicker">REGNA EUROPAE</div><h2 class="detail-title">${formatYear(state.year)}的政权</h2><p class="detail-body">当前图层收录 ${currentGroups.length} 个政权或政治体系。点击查看记录与来源。</p>${currentGroups.map(g=>`<button class="person-card" data-realm="${esc(g.id)}"><span style="width:15px;height:15px;background:${realmColor(g.english)};flex-shrink:0"></span><span><strong>${esc(g.name)}</strong><small>${esc(g.english)}</small></span></button>`).join('')}`);}
  async function fetchJSON(url) {const r=await fetch(url);if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json();}
  function choosePeriod(y) {
    const files=[{min:-500,max:475,file:'antiquity'},{min:476,max:999,file:'early-medieval'},{min:1000,max:1299,file:'high-medieval'},{min:1300,max:1499,file:'late-medieval'},{min:1500,max:1788,file:'early-modern'},{min:1789,max:2024,file:'modern'}];
    return files.find(p=>y>=p.min&&y<=p.max);
  }
  async function loadPeriod() {
    const p=choosePeriod(state.year);if(!p)return;const ticket=++dataRequest;
    try {if(!geometryCache.has(p.file)){ $('#snapshot-note').textContent='正在读取这一时代的历史疆域…';geometryCache.set(p.file,fetchJSON(`assets/maps/europe-${p.file}.geojson`).catch(e=>{geometryCache.delete(p.file);throw e;})); }const data=await geometryCache.get(p.file);if(ticket!==dataRequest)return;geo=data;renderTerritories();renderCities();renderRoutes();renderEventLocations();renderQuizMarkers();$('#map-loading').hidden=true;}
    catch(error){console.error(error);if(ticket!==dataRequest)return;geo={type:'FeatureCollection',features:[]};renderTerritories();$('#snapshot-note').textContent='疆域数据暂未加载；可继续浏览史事，点击下方重试';$('#legend').hidden=false;$('#legend').innerHTML='<button class="legend-item" data-retry-map>历史疆域加载失败 · 点击重试</button>';$('#map-loading').hidden=true;toast('疆域加载未成功，底图与史事仍可使用。');}
  }
  async function initializeMap() {
    try {
      const results=await Promise.all([fetchJSON('assets/geography/europe-land-10m.geojson'),fetchJSON('assets/modern-borders.geojson'),fetchJSON('assets/geography/europe-rivers-10m.geojson'),fetchJSON('assets/geography/europe-lakes-10m.geojson')]);
      [land,modern,rivers,lakes]=results;mapReady=true;buildMap();await loadPeriod();
      if(state.persons.length)focusCoordinate(stopCoord(journeyStops()[state.stop]));else if(event(state.eventId)?.eventLocations?.length)focusEventLocation(state.eventId,state.eventLocation);else if(state.cityId)focusCity(state.cityId);
    }catch(error){console.error(error);$('#map-loading').innerHTML='<span>地图加载失败。<button class="secondary-button" data-retry-init>重新加载</button></span>';}
  }

  const menuAnimations=new WeakMap();
  function reveal(el,direction='up'){
    if(!el||reducedMotion||!el.animate)return;
    const old=menuAnimations.get(el);old?.cancel();
    const transform=direction==='right'?'translateX(20px)':'translateY(9px)';
    const animation=el.animate([{opacity:0,transform},{opacity:1,transform:'translate(0,0)'}],{duration:240,easing:'cubic-bezier(.2,.75,.25,1)'});menuAnimations.set(el,animation);animation.finished.catch(()=>{});
  }
  function setMenu(el,open,button){
    if(!el)return;button?.setAttribute('aria-expanded',String(open));
    const wasOpen=el.dataset.expanded==='true'||!el.hidden;el.dataset.expanded=String(open);
    menuAnimations.get(el)?.cancel();
    if(open){el.hidden=false;if(!wasOpen)reveal(el,'up');return;}
    if(el.hidden)return;
    if(reducedMotion||!el.animate){el.hidden=true;return;}
    const animation=el.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(7px)'}],{duration:140,easing:'ease-in'});
    menuAnimations.set(el,animation);animation.finished.then(()=>{if(el.dataset.expanded==='false')el.hidden=true;}).catch(()=>{});
  }
  function updateLanguageButtons(){
    $$('[data-lang]').forEach(b=>{b.classList.toggle('active',b.dataset.lang===L.locale);b.setAttribute('aria-pressed',String(b.dataset.lang===L.locale));});
    $('.language-switch').style.setProperty('--language-index',['zh-CN','zh-TW','en'].indexOf(L.locale));
  }
  function setLanguage(language){
    const next=L.normalise(language);if(next===L.locale)return;
    const reading=$('#detail-dialog').open?state.reader:null,libraryOpen=$('#sources-dialog').open,sidebarScroll=$('#side-content').scrollTop,readingScroll=$('#detail-content').scrollTop;
    changingLanguage=true;({D,C}=L.set(next));window.EUROPA=D;updateLanguageButtons();
    renderTimeline();renderSide();applyLayers();renderSeaLabels();renderQuizMarkers();
    waterGroup?.selectAll('.river-label').text(d=>L.locale==='en'?d.properties.name:L.text(d.properties.nameZh));
    if(reading){if(reading.type==='city')openCity(reading.id);else if(reading.type==='event')openEvent(reading.id);else if(reading.type==='person')openPersonInfo(reading.id);else if(reading.type==='realm')openRealm(reading.id);else if(reading.type==='realms')allRealms();}
    if(libraryOpen)openSources();
    L.localize();$('#side-content').scrollTop=sidebarScroll;$('#detail-content').scrollTop=readingScroll;changingLanguage=false;updateURL();
    if($('#share-url'))$('#share-url').value=location.href;
    window.EUROPA_MUSIC.localize();
    if(!$('#search-results').hidden)showSearch();
    reveal($('#detail-dialog').open?$('#detail-content'):$('#side-content'),'right');
  }
  function translated(fn,root){return function(...args){const result=fn(...args);L.localize($(root));return result;};}
  renderTimeline=translated(renderTimeline,'.timeline');renderSide=translated(renderSide,'#side-content');renderJourney=translated(renderJourney,'#side-content');renderQuiz=translated(renderQuiz,'#side-content');openDialog=translated(openDialog,'.sidebar');
  const originalOpenSources=openSources;openSources=function(...args){originalOpenSources(...args);L.localize($('#sources-dialog'));};
  renderTerritories=translated(renderTerritories,'.map-stage');renderCities=translated(renderCities,'#map');renderRoutes=translated(renderRoutes,'#map');renderQuizMarkers=translated(renderQuizMarkers,'#map');showSearch=translated(showSearch,'#search-results');toggleSidebar=translated(toggleSidebar,'.atlas-shell');

  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.lang){setLanguage(b.dataset.lang);return;}
    if(b.dataset.speed){$('#play-speed').value=b.dataset.speed;$$('[data-speed]').forEach(el=>el.setAttribute('aria-checked',String(el===b)));$('#speed-button').textContent=b.textContent;$('#play-speed').dispatchEvent(new Event('change'));setMenu($('#speed-menu'),false,$('#speed-button'));return;}
    if(b.hasAttribute('data-event-location'))focusEventLocation(b.dataset.eventOrigin,Number(b.dataset.eventLocation));
    else if(b.dataset.topic)openTopic(b.dataset.topic);
    else if(b.dataset.event)openEvent(b.dataset.event);
    else if(b.dataset.city)openCity(b.dataset.city);
    else if(b.dataset.person)openPerson(b.dataset.person);
    else if(b.dataset.personInfo)openPersonInfo(b.dataset.personInfo);
    else if(b.dataset.locate){$('#detail-dialog').close();focusCity(b.dataset.locate,1.8);toggleSidebar(false);}
    else if(b.dataset.focusRealm){$('#detail-dialog').close();focusRealm(b.dataset.focusRealm);}
    else if(b.dataset.realm)openRealm(b.dataset.realm);
    else if(b.hasAttribute('data-all-realms'))allRealms();
    else if(b.dataset.era){$('#detail-dialog').close();pause();state.persons=[];state.quiz=null;state.eventId='';state.cityId='';state.topicId='';state.eventScope='era';setYear(D.eras.find(a=>a.id===b.dataset.era).focus);resetMap();}
    else if(b.hasAttribute('data-history-year')){const item=event(b.dataset.historyEvent),id=b.dataset.historyCity||item?.city;pause();state.persons=[];state.quiz=null;state.eventId=item?.id||'';state.cityId=id||'';state.eventLocation=0;setYear(b.dataset.historyYear,{preserveSelection:true});if(item?.eventLocations?.length)focusEventLocation(item.id,0);else if(id)focusCity(id,1.8);$('#detail-dialog').close();}
    else if(b.dataset.mapMode){state.mode=b.dataset.mapMode;state.layers.realms=state.mode==='political';state.layers.terrain=true;applyLayers();}
    else if(b.dataset.nav){if(state.view==='events'){if(b.dataset.nav==='places')state.placeScope=state.eventScope;if(b.dataset.nav==='people')state.peopleScope=state.eventScope;}leaveJourney();if(state.quiz)exitQuiz();activateView(b.dataset.nav);if(b.dataset.nav!=='map')toggleSidebar(true);}
    else if(b.dataset.filter){state.filter=b.dataset.filter;renderSide();}
    else if(b.dataset.placeScope){state.topicId='';state.placeScope=b.dataset.placeScope;renderSide();updateURL();}
    else if(b.dataset.peopleScope){state.topicId='';state.peopleScope=b.dataset.peopleScope;renderSide();updateURL();}
    else if(b.dataset.eventScope){state.topicId='';state.eventScope=b.dataset.eventScope;renderSide();updateURL();}
    else if(b.dataset.searchType)selectSearch(b.dataset.searchType,b.dataset.searchId);
    else if(b.hasAttribute('data-stop')){pause();goStop(Number(b.dataset.stop));}
    else if(b.dataset.step){pause();goStop(state.stop+Number(b.dataset.step));}
    else if(b.hasAttribute('data-toggle-play'))togglePlay();
    else if(b.hasAttribute('data-exit-journey'))leaveJourney();
    else if(b.hasAttribute('data-quiz-confirm'))confirmQuiz();
    else if(b.hasAttribute('data-quiz-next'))nextQuiz();
    else if(b.hasAttribute('data-quiz-exit'))exitQuiz();
    else if(b.hasAttribute('data-quiz-restart'))startQuiz();
    else if(b.hasAttribute('data-retry-map'))loadPeriod();
    else if(b.hasAttribute('data-retry-init'))initializeMap();
  });
  $('#search').addEventListener('input',showSearch);$('#search').addEventListener('focus',showSearch);$('#search').addEventListener('click',()=>{if($('#search').getAttribute('aria-expanded')!=='true')showSearch();});
  $('.search-box').addEventListener('focusout',e=>{if(!e.currentTarget.contains(e.relatedTarget))closeSearch();});
  $('.search-box').addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();$('#search').focus();closeSearch();return;}
    if(['ArrowLeft','ArrowRight',' ','Enter'].includes(e.key))e.stopPropagation();
    if(e.key==='Enter'&&e.target===$('#search')){e.preventDefault();e.stopPropagation();const b=$('#search-results [data-search-type]');if(b)selectSearch(b.dataset.searchType,b.dataset.searchId);return;}
    if(['ArrowDown','ArrowUp'].includes(e.key)){
      e.preventDefault();e.stopPropagation();if($('#search').getAttribute('aria-expanded')!=='true')showSearch();
      const buttons=$$('#search-results [data-search-type]'),i=buttons.indexOf(document.activeElement);
      if(i===0&&e.key==='ArrowUp'){$('#search').focus();return;}
      buttons[i<0?(e.key==='ArrowDown'?0:buttons.length-1):(i+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length]?.focus();
    }
  });
  document.addEventListener('click',e=>{if(!e.target.closest('.search-box'))closeSearch();if(!e.target.closest('.speed-control'))setMenu($('#speed-menu'),false,$('#speed-button'));if(!e.target.closest('.github-control'))setMenu($('#project-menu'),false,$('#project-menu-button'));if(!e.target.closest('.layers-menu')&&!e.target.closest('#layers-button')){setMenu($('#layers-menu'),false,$('#layers-button'));}});
  function scrubYear(value) {
    const restoreSide=state.persons.length||state.quiz;pause({redraw:false});state.persons=[];state.quiz=null;$('#detail-dialog').close();cancelAnimationFrame(renderFrame);
    renderFrame=requestAnimationFrame(()=>setYear(value,{keepSide:!restoreSide}));
  }
  $('#year-slider').addEventListener('input',e=>scrubYear(e.target.value));
  $('#year-slider').addEventListener('change',e=>{const value=e.target.value;cancelAnimationFrame(renderFrame);pause({redraw:false});state.persons=[];state.quiz=null;setYear(value);});
  $('#year-input').addEventListener('change',e=>{const value=e.target.value;pause({redraw:false});cancelAnimationFrame(renderFrame);state.persons=[];state.quiz=null;$('#detail-dialog').close();setYear(value);});
  $('#year-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.target.dispatchEvent(new Event('change'));e.target.blur();}});
  function zoomTimeline(){state.range=state.range[0]===-500&&state.range[1]===2024?[era(state.year).start,Math.min(2024,era(state.year).end-1)]:[-500,2024];renderTimeline();}
  $('.timeline-track').addEventListener('dblclick',zoomTimeline);$('#timeline-zoom').onclick=zoomTimeline;
  $('#prev-year').onclick=()=>{pause();step(-1);};$('#next-year').onclick=()=>{pause();step(1);};$('#play').onclick=togglePlay;
  $('#play-speed').onchange=()=>{if(state.playing){pause();play();}};
  $('#sources-button').onclick=openSources;$('#map-note').onclick=openSources;$('#quiz-button').onclick=startQuiz;
  function toggleProjectMenu(open){
    setMenu($('#project-menu'),open,$('#project-menu-button'));
    if(open)$('#share-button').focus();
  }
  $('#project-menu-button').onclick=()=>toggleProjectMenu($('#project-menu-button').getAttribute('aria-expanded')!=='true');
  $('#github-star').onclick=()=>toggleProjectMenu(false);
  $('#share-button').onclick=()=>{toggleProjectMenu(false);$('#project-menu-button').focus();share();};
  $('.github-control').addEventListener('focusout',e=>{if(!e.currentTarget.contains(e.relatedTarget))toggleProjectMenu(false);});
  $('.github-control').addEventListener('keydown',e=>{
    const open=$('#project-menu-button').getAttribute('aria-expanded')==='true';
    if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();toggleProjectMenu(false);$('#project-menu-button').focus();}
    else if(e.target!==$('#github-star')&&(['ArrowDown','ArrowUp'].includes(e.key)||(open&&['Home','End'].includes(e.key)))){e.preventDefault();e.stopPropagation();toggleProjectMenu(true);}
    else if(open&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();}
    else if(open&&['Enter',' '].includes(e.key))e.stopPropagation();
  });
  $('#mobile-panel-toggle').onclick=()=>toggleSidebar(!$('#sidebar').classList.contains('open'));
  $('#close-sidebar').onclick=()=>toggleSidebar(false);
  $('#layers-button').onclick=()=>setMenu($('#layers-menu'),$('#layers-button').getAttribute('aria-expanded')!=='true',$('#layers-button'));
  $('#speed-button').onclick=()=>{const open=$('#speed-button').getAttribute('aria-expanded')!=='true';setMenu($('#speed-menu'),open,$('#speed-button'));if(open)$(`[data-speed="${$('#play-speed').value}"]`).focus();};
  $('.language-switch').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const buttons=$$('[data-lang]'),current=buttons.findIndex(b=>b.dataset.lang===L.locale),index=e.key==='Home'?0:e.key==='End'?2:(current+(e.key==='ArrowRight'?1:2))%3;setLanguage(buttons[index].dataset.lang);buttons[index].focus();});
  $('.speed-control').addEventListener('keydown',e=>{if($('#speed-menu').hidden)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setMenu($('#speed-menu'),false,$('#speed-button'));$('#speed-button').focus();}else if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();e.stopPropagation();const buttons=$$('[data-speed]'),index=buttons.indexOf(document.activeElement);buttons[(index+(e.key==='ArrowDown'?1:2))%3].focus();}});
  $('#close-layers').onclick=()=>{setMenu($('#layers-menu'),false,$('#layers-button'));};
  $('#reset-layers').onclick=()=>{state.layers={...layerDefaults};state.mode='political';state.opacity=65;applyLayers();};
  Object.keys(layerDefaults).forEach(key=>{$(`#layer-${key}`).onchange=e=>{state.layers[key]=e.target.checked;if(key==='realms')state.mode=state.layers.realms?'political':'terrain';applyLayers();};});
  $('#realm-opacity').oninput=e=>{state.opacity=Number(e.target.value);$('#opacity-value').value=`${state.opacity}%`;d3.select('#map').style('--realm-opacity',state.opacity/100);};
  $('#legend-toggle').onclick=()=>{state.legendOpen=!state.legendOpen;renderTerritories();if(state.legendOpen)reveal($('#legend'),'up');};
  $('#panel-toggle').onclick=()=>toggleSidebar($('.atlas-shell').classList.contains('panel-collapsed'));
  $('#zoom-in').onclick=()=>{if(zoom)d3.select('#map').interrupt().transition().duration(200).call(zoom.scaleBy,1.4);};$('#zoom-out').onclick=()=>{if(zoom)d3.select('#map').interrupt().transition().duration(200).call(zoom.scaleBy,1/1.4);};$('#reset-map').onclick=resetMap;
  $$('.dialog-close').forEach(b=>b.onclick=()=>b.closest('dialog').close());$$('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
  $('#legend').addEventListener('pointerover',e=>{const b=e.target.closest('[data-realm]');if(b)highlightRealm(b.dataset.realm);});$('#legend').addEventListener('pointerleave',()=>highlightRealm(null));
  document.addEventListener('keydown',e=>{
    const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if(e.key==='Escape'){pause();setMenu($('#speed-menu'),false,$('#speed-button'));setMenu($('#layers-menu'),false,$('#layers-button'));toggleProjectMenu(false);closeSearch();window.EUROPA_MUSIC.close();if($('#detail-dialog').open)$('#detail-dialog').close();else if(window.innerWidth<=850)toggleSidebar(false);return;}
    if((e.key==='/'&&!typing)||((e.ctrlKey||e.metaKey)&&e.key==='k')){e.preventDefault();toggleSidebar(true);$('#search').focus();return;}
    if(typing||$('dialog[open]'))return;
    if(e.key===' '&&!['BUTTON','A'].includes(document.activeElement?.tagName)){e.preventDefault();togglePlay();}
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();pause();const dir=e.key==='ArrowRight'?1:-1;if(e.shiftKey){state.persons=[];setYear(state.year+dir*10);}else step(dir);}
    if(e.key==='Enter'&&state.quiz)confirmQuiz();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  let resizeTimer;new ResizeObserver(()=>{if(!mapReady)return;clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{buildMap();},130);}).observe($('.map-stage'));

  // Small public API for integrations and reproducible checks, mirroring the source project's deep-link model.
  window.atlasAPI={setLanguage,search,openTopic,openEvent,locate({year,place}){if(year!==undefined)setYear(year);const c=D.cities.find(c=>[c.id,c.name,c.modern,c.latin].includes(place));if(c)openCity(c.id);return c||null;},openPerson:(id,stop=0)=>openPerson(String(id).split(','),stop),inspect(){return {language:L.locale,year:state.year,era:era(state.year).name,topic:state.topicId,view:state.view,persons:[...state.persons],stop:state.stop,place:state.cityId,event:state.eventId,eventLocation:state.eventLocation,layers:{...state.layers},opacity:state.opacity,mode:state.mode,polities:currentGroups.map(g=>({id:g.id,name:g.name})),quiz:state.quiz?{index:state.quiz.index,score:state.quiz.score,revealed:state.quiz.revealed,complete:state.quiz.complete}:null};},setYear:y=>setYear(y),ready:()=>mapReady&&!!geo};
  window.EUROPA_UTILS={clampYear,era,selectFeatures,parentNames,formatYear,seaLabelAudit};
  L.localize();updateLanguageButtons();renderTimeline();activateView(state.view);window.EUROPA_MUSIC.init({setMenu});
  const initialPersons=(params.get('person')||'').split(',').filter(id=>person(id));
  if(initialPersons.length)openPerson(initialPersons,params.get('stop'));
  else if(params.get('event')&&event(params.get('event')))openEvent(params.get('event'));
  else if(params.get('place')){const place=params.get('place'),c=D.cities.find(c=>[c.id,c.name,c.modern,c.latin].includes(place));if(c)openCity(c.id);}
  if(params.get('quiz')==='locate')startQuiz();
  initializeMap();
  document.fonts?.ready.then(()=>{seaLayoutCache.clear();labelWidths=new WeakMap();if(mapReady){layoutSeaLabels(d3.zoomTransform($('#map')).k);renderTerritories();renderCities();}});
})();
