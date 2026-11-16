// SPDX-License-Identifier: GPL-3.0-only
(() => {
  'use strict';
  const chineseCore=window.EUROPA, chineseContent=window.EUROPA_CONTENT;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const convert=OpenCC.Converter({from:'cn',to:'tw'});
  const english={
    '收录年代':'Years covered','定位类型':'Location type','城市参考点':'City reference point',
    '搜索人物、地点、史事或专题':'Search people, places, events or topics','搜索人物、地点、史事和专题':'Search people, places, events and topics','未找到已收录内容。试试“凡尔登”“一战”或“1916”。':'No entries found. Try Verdun, World War I or 1916.','搜索地点、人物、事件、专题或年份。':'Search places, people, events, topics or years.','试试：凡尔登 · 诺曼底 · 一战':'Try: Verdun · Normandy · World War I',
    '专题导读':'Explore a topic','选择专题':'Choose a topic','专题':'Topic','全部人物':'All people','相关人物':'People in this story','相关史事':'Related events','继续探索':'Continue exploring','走近人物':'Meet the people','从事件出发，连接人物、地点与历史前后。':'Connect events with the people, places and developments around them.','资料整理：2026年11月16日。':'Sources reviewed: 16 November 2026.',
    '阅读详解 ›':'Read the full account ›','地点':'Places','地点索引':'Place index','从城市、会址与战场走进历史。':'Enter history through cities, meeting places and battlefields.','本时代':'This era','全部地点':'All places','附近年代':'Nearby years','展开本时代编年史 →':'Explore this era’s chronicle →','历史背景':'Historical context','后续影响':'What followed','事件地点':'Event locations','关联地点':'Related places','同期史事':'Events around this time',
    '欧陆纪年 · Europa Chronica':'Europa Chronica · Historical Atlas','欧陆纪年首页':'Europa Chronica home','欧陆纪年':'Europa Chronica','欧洲历史地图':'Historical Atlas of Europe','古典至现代':'Antiquity to the present',
    '图层':'Layers','资料馆':'Library','分享当前地图':'Share the current map','分享':'Share','在 GitHub 上为项目加星标':'Star this project on GitHub','更多操作':'More actions','项目菜单':'Project menu','选择语言':'Choose language','简体中文':'Simplified Chinese','繁體中文':'Traditional Chinese',
    '可拖动和缩放的欧洲历史地图':'Interactive map of European history','搜索城市、人物、史事':'Search places, people, events','搜索城市、人物和事件':'Search cities, people and events',
    '地图图层':'Map layers','关闭图层菜单':'Close map layers','地图模式':'Map mode','政权图':'Political','地形图':'Terrain','自然地理':'Geography','山地阴影':'Relief shading','河流':'Rivers','湖泊':'Lakes',
    '历史信息':'History','历史疆域':'Historical territories','疆域边线':'Territory borders','疆域浓度':'Colour strength','疆域颜色浓度':'Territory colour strength','城市标记':'Cities','地名标注':'Place names','人物行迹':'Journeys','现代边界':'Modern borders','对照':'Reference','恢复默认图层':'Restore defaults',
    '正在展开地图':'Unfolding the atlas','收起阅读面板':'Close the reading panel','展开阅读面板':'Open the reading panel','放大地图':'Zoom in','缩小地图':'Zoom out','放大':'Zoom in','缩小':'Zoom out','回到欧洲全图':'Show all of Europe','复位视图':'Reset view','政权图例':'Polities','地图资料':'Map sources',
    '阅读历史':'Read history','收起历史':'Close history','阅读内容':'Reading panel','时代概览':'Overview','编年史':'Chronicle','人物':'People','返回时代概览':'Return to overview','← 返回':'← Back','舆图寻址':'Map challenge','五道题，走遍欧陆':'Five places to discover',
    '历史时间轴':'Historical timeline','播放或暂停（空格）':'Play or pause (Space)','播放历史演进':'Play through history','暂停历史演进':'Pause history','播放速度':'Playback speed','开启语音讲解':'Enable narration','关闭语音讲解':'Disable narration','语音讲解':'Narration','放大当前时代':'Zoom into this era','放大时代':'Zoom era','全部年代':'All years','拖动穿越历史年份':'Move through historical years','上一历史节点（←）':'Previous historical moment (←)','上一历史节点':'Previous moment','下一历史节点（→）':'Next historical moment (→)','下一历史节点':'Next moment','历史年份':'Historical year','公元纪年':'Historical year','关闭资料馆':'Close the library','请启用 JavaScript 以使用交互地图。':'Enable JavaScript to explore the interactive atlas.',
    '参考资料':'References','历史资料':'Historical sources','追随故人':'Lives & journeys','从一座城，到另一座城。沿着生平的片段，重新走进他们的时代。':'Follow lives from city to city and enter the world they knew.','搜索框可同时输入多个人名，用空格分隔。':'Search several names, separated by spaces, to compare their journeys.','同时代人物':'Contemporary figures','重要事件':'Historical moments','全部':'All','政权':'Polities','战争':'War','文化':'Culture','制度':'Institutions','社会':'Society','这个时期尚未收录此类事件。':'No entries in this category for this era.','可切换分类或拖动时间轴。':'Choose another category or move along the timeline.',
    '在舆图中查看':'Locate on map','阅读此地沿革':'Read this place’s history','查看此年舆图':'View this year','城市沿革':'City histories','地理坐标':'Coordinates','城市纪事':'City chronicle','与此地有关的人物':'Lives connected to this place','纪事':'Entries','人物目录':'All people','故人同游':'Parallel journeys','多人的生平按年代排列；在同一年、同一地留下足迹时，标记为“同途”。':'Lives are arranged in chronological order. Places visited in the same year are marked “Shared”.','上一站':'Previous','下一站':'Next','暂停巡礼':'Pause journey','自动巡礼':'Play journey','同途':'Shared','阅读人物传记':'Read biography','人物传记':'Biography','生平纪事':'Life chronicle','沿着生平游历':'Follow this life',
    '欧陆资料馆':'Atlas library','历史与地图':'History & cartography','史事':'Events','政权专题':'Polity profiles','人物生平':'Lives','地形与水系':'Relief & waterways','书目与史料':'Bibliography','历史研究':'Historical research','用于相关历史条目的年代、事件背景与人物关系核对。':'Reference for dates, historical context and the people in these entries.',
    'Cliopatria v0.2.1 · Bennett、Mutch、Tollefson 等，Scientific Data，2025。按年代组织历史政权范围，配合中文名称、政权专题与事件索引。许可：CC BY 4.0。':'Cliopatria v0.2.1 · Bennett, Mutch, Tollefson et al., Scientific Data, 2025. Historical territories are organised by date, with polity profiles and an event index. Licensed under CC BY 4.0.',
    'Natural Earth 1:10 million 海岸线、河流与湖泊。地形晕渲由 NOAA ETOPO1、USGS GMTED2010 高程生成，经 Mapzen / Tilezen Terrarium 分发。地理数据为公共领域作品。':'Coastlines, rivers and lakes: Natural Earth, 1:10 million. Relief shading uses NOAA ETOPO1 and USGS GMTED2010 elevation data, distributed through Mapzen / Tilezen Terrarium. Geographic data are in the public domain.',
    '交互灵感：DeanChensj / 江山时序。本项目独立设计与实现。':'Interaction inspiration: DeanChensj / Jiangshan Atlas. Independently designed and implemented.',
    'D3 · ISC；Noto Serif SC、Cinzel、Uncial Antiqua · SIL Open Font License。':'D3 · ISC. Noto Serif SC, Cinzel, Uncial Antiqua and Cormorant Garamond · SIL Open Font License.',
    '资料整理：2026年11月15日。':'Sources reviewed: 15 November 2026.',
    '已复制当前地图链接，包含年份与所选内容':'Map link copied, including the year, language and selection','分享这一刻':'Share this moment','复制下面的链接，即可回到当前年份与地点。':'Copy this link to return to the same year and place.','分享链接':'Shareable link','多人同看 · 合并生平时间线':'Compare lives · Combined chronology','地点':'Place','跳转至这一年':'Go to this year','开始五题地图挑战':'Begin the five-place challenge',
    '未找到已收录内容。试试“查理曼”“罗马”或“1215”。':'No results. Try “Charlemagne”, “Rome” or “1215”.','搜索古今城市名、人物、事件或年份。':'Search places, people, events or a year.','试试：罗马 · 查理曼 · 大宪章':'Try: Rome · Charlemagne · Magna Carta','多人同看：查理曼 奥托':'Compare lives: Charlemagne Otto',
    '巡游归来':'Journey complete','欧陆舆图师':'Master cartographer','行旅学者':'Travelling scholar','初访欧陆':'New explorer','每一次落针，都是一次与历史的相逢。':'Every pin is an encounter with history.','再游一次':'Explore again','返回舆图':'Return to the atlas','结束挑战':'End challenge','地图已隐去地名。在舆图上点击落针，再确认答案。可拖动、缩放寻找位置。':'Place names are hidden. Explore the map, place your pin, then confirm.','查看成绩':'View results','下一处古城':'Next place','答案依据：':'Answer source: ','已落针，可继续点击调整位置。':'Pin placed. Click again to adjust it.','等待在地图上落针…':'Place a pin on the map…','确认位置':'Confirm location','你的落针':'Your pin',
    '政权范围概览':'Political map','点击色块读档案':'Select a colour to read its profile','政权档案':'Polity profile','专题':'In focus','历史时期':'Period','统治中心':'Centres of rule','地图年份':'Map year','图内地点':'Places on this map','聚焦疆域':'Focus territory','历史纪事':'Historical chronicle','走进城市':'Explore the cities','疆域沿革':'Territory over time','同时代史事':'Events of the era',
    '正在读取这一时代的历史疆域…':'Loading this era’s territories…','疆域数据暂未加载；可继续浏览史事，点击下方重试':'Territories could not be loaded. Select retry below.','历史疆域加载失败 · 点击重试':'Territories could not be loaded · Retry','疆域加载未成功，底图与史事仍可使用。':'Territories could not be loaded. The base map and chronicles remain available.','地图加载失败。':'The map could not be loaded.','重新加载':'Retry','此浏览器不支持语音讲解，文字史事仍可阅读。':'Narration is unavailable in this browser.','已开启语音讲解，播放时朗读史事':'Narration is on during playback','已关闭语音讲解':'Narration is off','朗读史事':'Read history aloud',
    '大西洋':'Atlantic Ocean','北海':'North Sea','地中海':'Mediterranean Sea','黑海':'Black Sea','波罗的海':'Baltic Sea','（空格）':' (Space)',
    '开启音效':'Enable sound','关闭音效':'Disable sound'
  };
  const phrases=Object.keys(english).sort((a,b)=>b.length-a.length);
  const nodeSources=new WeakMap(),attributeSources=new WeakMap(),cache=new Map();
  let locale='zh-CN';
  function normalise(value){return /^(en|en-)/i.test(value||'')?'en':/^(zh-tw|zh-hant|tw|繁)$/i.test(value||'')?'zh-TW':'zh-CN';}
  function text(value){
    let s=String(value??'');if(locale==='zh-CN')return s;if(locale==='zh-TW')return convert(s);
    const key=s.trim();if(english[key])return s.replace(key,english[key]);
    s=s.replace(/公元前(\d+)年/g,'$1 BCE').replace(/公元(\d+)年/g,'$1 CE').replace(/(\d+)年/g,'$1');
    s=s.replace(/^(\d+) 则精选史事$/,'$1 entries').replace(/^(\d+) 处生平节点$/,'$1 moments').replace(/^(\d+) 则 · (.+)起$/,'$1 entries · from $2').replace(/^另 (\d+) 个政权/,'$1 more polities').replace(/^(.+)的政权$/,'Polities in $1');
    s=s.replace(/^(\d+) 则史事$/,'$1 events').replace(/^(\d+) 处地点/,'$1 places');
    s=s.replace(/(\d+) 位人物/g,'$1 people').replace(/(\d+) 则史事/g,'$1 events');
    s=s.replace(/^距离约 (\d+) 公里$/,'About $1 km away').replace(/^本题 (\d+) 分 · 累计 (\d+) 分$/,'$1 points · Total $2').replace(/^(.+)，阅读此地历史$/,'$1 · Read the history of this place');
    s=s.replace(/^当前图层收录 (\d+) 个政权或政治体系。点击查看记录与来源。$/,'Explore $1 polities on this map. Select one to read its profile.');
    s=s.replace(/^(.+)的(.+)在地图中包含 (\d+) 片区域。拖动时间轴可逐年查看其疆域变化。$/,'$2 is shown in $3 geographic areas in $1. Move along the timeline to explore changes.');
    s=s.replace(/ · 今 /g,' · Today: ').replace(/, 今 /g,', today: ').replace(/，/g,', ').replace(/；/g,'; ').replace(/、/g,', ');
    for(const phrase of phrases)if(s.includes(phrase))s=s.split(phrase).join(english[phrase]);
    return s;
  }
  function transform(value,key=''){
    if(typeof value==='string')return ['id','category','url','matchPattern','sourceId'].includes(key)?value:convert(value);
    if(Array.isArray(value))return value.map(x=>transform(x,key));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,transform(v,k)]));
    return value;
  }
  function compile(core,content){
    const D=clone(core),C=clone(content);
    C.cities.forEach(profile=>{
      const existing=D.cities.find(c=>c.id===profile.id),original=chineseContent.cities.find(c=>c.id===profile.id);
      if(existing){existing.since=Math.min(existing.since,...profile.milestones.map(m=>m.year));existing.name=profile.name;if(profile.modern)existing.modern=profile.modern;}
      else if(profile.coord)D.cities.push({id:profile.id,name:profile.name,latin:profile.latin,modern:profile.modern,coord:profile.coord,since:profile.since,important:true});
      profile.milestones.forEach((m,i)=>{
        if(D.events.some(e=>e.city===profile.id&&e.year===m.year))return;
        const sources=profile.sources.filter(r=>(m.sourceIds||[]).includes(r.id));
        const ids=(sources.length?sources:profile.sources).map((r,j)=>{const id=`city-${profile.id}-${r.id||j}`;D.sources[id]=r;return id;});
        const title=original?.milestones[i]?.title||m.title;
        D.events.push({id:`city-${profile.id}-${m.year}-${i}`,year:m.year,date:m.date||String(m.year),title:`${profile.name} · ${m.title}`,city:profile.id,category:/战|围|攻|占|征服|解放/.test(title)?'战争':/大学|教堂|典礼|圣物|建筑/.test(title)?'文化':'政权',summary:m.text,body:m.text,sources:ids});
      });
    });
    D.events.sort((a,b)=>a.year-b.year||(a.sortOrder||0)-(b.sortOrder||0)||a.id.localeCompare(b.id));return {D,C};
  }
  function data(language=locale){
    if(!cache.has(language)){
      if(language==='zh-TW')cache.set(language,compile(transform(chineseCore),transform(chineseContent)));
      else if(language==='en')cache.set(language,compile(window.EUROPA_EN_CORE,{...chineseContent,...window.EUROPA_EN_CONTENT}));
      else cache.set(language,compile(chineseCore,chineseContent));
    }return cache.get(language);
  }
  function localize(root=document.body){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      if(!node.parentElement||node.parentElement.closest('script,style,[data-no-i18n]'))continue;
      const previous=nodeSources.get(node),source=previous&&previous.last===node.data?previous.source:node.data;
      const translated=text(source);if(node.data!==translated)node.data=translated;nodeSources.set(node,{source,last:translated});
    }
    for(const el of [root,...root.querySelectorAll('[title],[aria-label],[placeholder]')]){
      if(el.closest?.('[data-no-i18n]'))continue;
      const stored=attributeSources.get(el)||{};
      for(const attr of ['title','aria-label','placeholder']){
        if(!el.hasAttribute?.(attr))continue;const current=el.getAttribute(attr),previous=stored[attr],source=previous&&previous.last===current?previous.source:current,translated=text(source);
        if(current!==translated)el.setAttribute(attr,translated);stored[attr]={source,last:translated};
      }attributeSources.set(el,stored);
    }
  }
  function set(language){locale=normalise(language);document.documentElement.lang=locale;document.title=text('欧陆纪年 · Europa Chronica');const description=document.querySelector('meta[name=description]');if(description)description.content=locale==='en'?'Explore European history through maps, city chronicles, polity profiles and the lives of historical figures.':text('拖动时间轴探索欧洲历史地图，阅读城市沿革、政权档案与人物生平。');try{localStorage.setItem('europa-language',locale);}catch{}return data();}
  function initial(){let saved;try{saved=localStorage.getItem('europa-language');}catch{}return normalise(new URLSearchParams(location.search).get('lang')||saved);}
  window.EUROPA_I18N={text,localize,data,set,initial,normalise,get locale(){return locale;},canonical:()=>data('zh-CN'),traditional:convert,english};
})();
