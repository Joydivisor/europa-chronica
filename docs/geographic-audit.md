# Europa Chronica 地点审计

核对日期：2026-11-15。覆盖现有 48 个地点、28 个核心事件、8 位人物的 27 个停靠点。

## 处理结果

城市点与事件地点分开。保留合理的城市参考坐标，另用 `eventLocations` 标注建筑、遗址、战场或区域；每个点有精度类别与可追溯资料。

- 直布罗陀坐标位于巨岩地区：名称从“海峡”改为“直布罗陀”。
- 威斯特伐利亚：区分明斯特签约与奥斯纳布吕克谈判；两份1648年10月帝国和约均在明斯特签署。
- 1789年：补凡尔赛皇家网球场与巴黎巴士底狱遗址；城市索引新增凡尔赛。
- 1945年：补兰斯投降文书会场和柏林卡尔斯霍斯特投降大厅；分别标明5月7日和5月8日至9日。
- 1993年：条约生效与1992年马斯特里赫特签约会场明确区分。
- 中世纪加冕：旧圣彼得大教堂遗址与今天的重建建筑区分；威斯敏斯特、亚琛、兰斯、美因茨等已知会场独立定位。
- 埃莉诺1204年停靠点明确为丰特夫罗葬地。
- 基督教化、黑死病、欧盟扩员等广域事件说明城市参考点的具体角色。

## 坐标核对方法

Natural Earth 1:1000万城市数据支持 37 个现有城市的具名位置交叉核对。各原坐标与该数据的城市代表点最大距离 3.955 公里；这反映城市点选取差异，不是测量误差。未因另一城市恰好较近就认定小遗址通过核对。

建筑坐标是适合历史地图的地理参考点，不表示房间内部的测量点。兰尼米德、穆希、黑斯廷斯等按已知遗址或战场范围定位。`since` 是显示／索引起始年，不是城市建成年。

## 补丁与接入

- 核对结果已合入 `dist/data.js` 与 `dist/locales/en-core.js`。
- `coordSources` 和 `eventLocations[].sourceIds` 均引用对应内容文件的 `sources` 字典。
- `newPlaces` 提供凡尔赛、奥斯纳布吕克；事件 `relatedPlaces` 为有效地点 ID。
- 人物 stopPatches 以原有0起始 index 更新，保留原 city 作为关联城市。
- 英文补丁为独立翻译；繁中可沿项目既有 OpenCC 管线转换。

## 可追溯检查表

| 地点 | 坐标 | 类型 | 核对 |
|---|---|---|---|
| 布鲁塞尔 (`brussels`) | [4.352, 50.85] | City reference point | Natural Earth 具名城市点 |
| 雅典 (`athens`) | [23.7275, 37.9838] | City reference point | Natural Earth 具名城市点 |
| 罗马 (`rome`) | [12.483, 41.893] | City reference point | Natural Earth 具名城市点 |
| 拉文纳 (`ravenna`) | [12.201, 44.418] | City reference point | Natural Earth 具名城市点 |
| 君士坦丁堡 (`constantinople`) | [28.978, 41.008] | City reference point | Natural Earth 具名城市点 |
| 直布罗陀 (`gibraltar`) | [-5.35, 36.13] | Regional reference point | Natural Earth 具名城市点 |
| 林迪斯法恩 (`lindisfarne`) | [-1.8, 55.67] | Historic-site area | 遗址／关联城市资料；未套用邻近城市点 |
| 凡尔登 (`verdun`) | [5.383, 49.159] | City reference point | 遗址／关联城市资料；未套用邻近城市点 |
| 基辅 (`kyiv`) | [30.523, 50.45] | City reference point | Natural Earth 具名城市点 |
| 黑斯廷斯战场 (`battle`) | [0.486, 50.915] | Battlefield-area reference point | 遗址／关联城市资料；未套用邻近城市点 |
| 克莱蒙 (`clermont`) | [3.087, 45.778] | City reference point | Natural Earth 具名城市点 |
| 兰尼米德 (`runnymede`) | [-0.57, 51.44] | Meadow-area reference point | 遗址／关联城市资料；未套用邻近城市点 |
| 穆希 (`muhi`) | [20.936, 47.98] | Battlefield-area reference point | 遗址／关联城市资料；未套用邻近城市点 |
| 墨西拿 (`messina`) | [15.55, 38.193] | City reference point | Natural Earth 具名城市点 |
| 格拉纳达 (`granada`) | [-3.598, 37.177] | City reference point | Natural Earth 具名城市点 |
| 明斯特 (`munster`) | [7.626, 51.961] | City reference point | Natural Earth 具名城市点 |
| 巴黎 (`paris`) | [2.352, 48.857] | City reference point | Natural Earth 具名城市点 |
| 维也纳 (`vienna`) | [16.373, 48.208] | City reference point | Natural Earth 具名城市点 |
| 萨拉热窝 (`sarajevo`) | [18.425, 43.856] | City reference point | Natural Earth 具名城市点 |
| 柏林 (`berlin`) | [13.405, 52.52] | City reference point | Natural Earth 具名城市点 |
| 马斯特里赫特 (`maastricht`) | [5.691, 50.851] | City reference point | Natural Earth 具名城市点 |
| 亚琛 (`aachen`) | [6.084, 50.775] | City reference point | 遗址／关联城市资料；未套用邻近城市点 |
| 伦敦 (`london`) | [-0.128, 51.507] | City reference point | Natural Earth 具名城市点 |
| 努瓦永 (`noyon`) | [3, 49.582] | City reference point | 遗址／关联城市资料；未套用邻近城市点 |
| 梅姆莱本 (`memleben`) | [11.493, 51.269] | City reference point | 遗址／关联城市资料；未套用邻近城市点 |
| 鲁昂 (`rouen`) | [1.099, 49.443] | City reference point | Natural Earth 具名城市点 |
| 奥尔良 (`orleans`) | [1.91, 47.903] | City reference point | Natural Earth 具名城市点 |
| 兰斯 (`reims`) | [4.032, 49.258] | City reference point | Natural Earth 具名城市点 |
| 希农 (`chinon`) | [0.243, 47.167] | City reference point | 遗址／关联城市资料；未套用邻近城市点 |
| 普瓦捷 (`poitiers`) | [0.34, 46.58] | City reference point | Natural Earth 具名城市点 |
| 丰特夫罗 (`fontevraud`) | [0.052, 47.182] | Historic-site area | 遗址／关联城市资料；未套用邻近城市点 |
| 巴勒莫 (`palermo`) | [13.362, 38.116] | City reference point | Natural Earth 具名城市点 |
| 美因茨 (`mainz`) | [8.247, 50] | City reference point | Natural Earth 具名城市点 |
| 耶路撒冷 (`jerusalem`) | [35.234, 31.778] | City reference point | Natural Earth 具名城市点 |
| 埃迪尔内 (`edirne`) | [26.555, 41.677] | City reference point | Natural Earth 具名城市点 |
| 陶雷西乌姆附近 (`tauresium`) | [21.612, 41.9] | Historic-site area | 遗址／关联城市资料；未套用邻近城市点 |
| 威尼斯 (`venice`) | [12.3358, 45.4372] | City reference point | Natural Earth 具名城市点 |
| 热那亚 (`genoa`) | [8.9339, 44.4056] | City reference point | Natural Earth 具名城市点 |
| 佛罗伦萨 (`florence`) | [11.2558, 43.7696] | City reference point | Natural Earth 具名城市点 |
| 米兰 (`milan`) | [9.19, 45.4642] | City reference point | Natural Earth 具名城市点 |
| 那不勒斯 (`naples`) | [14.2681, 40.8518] | City reference point | Natural Earth 具名城市点 |
| 布拉格 (`prague`) | [14.4208, 50.0875] | City reference point | Natural Earth 具名城市点 |
| 克拉科夫 (`krakow`) | [19.945, 50.0647] | City reference point | Natural Earth 具名城市点 |
| 布达 (`buda`) | [19.0399, 47.4981] | City reference point | Natural Earth 具名城市点 |
| 里斯本 (`lisbon`) | [-9.1393, 38.7223] | City reference point | Natural Earth 具名城市点 |
| 科尔多瓦 (`cordoba`) | [-4.7794, 37.8882] | City reference point | Natural Earth 具名城市点 |
| 托莱多 (`toledo`) | [-4.0245, 39.8628] | City reference point | Natural Earth 具名城市点 |
| 诺夫哥罗德 (`novgorod`) | [31.2758, 58.5215] | City reference point | Natural Earth 具名城市点 |

## 主要资料

- [Natural Earth · 1:1000万城市参考点](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/)（`geo-naturalearth-places`）
- [直布罗陀遗产部门 · 摩尔城堡与711年登陆](https://www.ministryforheritage.gi/heritage-and-antiquities/the-moorish-castle-1494)（`geo-gibraltar`）
- [Historic England · 林迪斯法恩前征服时期修道院遗址](https://historicengland.org.uk/listing/the-list/list-entry/1011650)（`geo-lindisfarne`）
- [English Heritage · 黑斯廷斯战役的地点](https://www.english-heritage.org.uk/visit/places/1066-battle-of-hastings-abbey-and-battlefield/history-and-stories/battle-of-hastings-location)（`geo-hastings`）
- [National Trust · 兰尼米德草地遗产记录](https://heritagerecords.nationaltrust.org.uk/HBSMR/MonRecord.aspx?skin=printerfriendly&uid=MNA147355)（`geo-runnymede`）
- [圣彼得大教堂官方 · 君士坦丁时代教堂与后期重建](https://www.basilicasanpietro.va/en/san-pietro/the-basilica)（`geo-old-stpeters`）
- [梵蒂冈 · 查理曼在圣彼得大教堂加冕](https://www.vatican.va/content/vatican/en/ra/braccio-carlo-magno.html)（`geo-charlemagne-stpeters`）
- [奥斯纳布吕克市 · 威斯特伐利亚和约](https://friedensstadt.osnabrueck.de/en/die-friedensstadt-wo-frieden-geschichte-und-zukunft-hat/peace-of-westphalia/)（`geo-westphalia-osnabruck`）
- [LWL · 1648年10月24日在明斯特签署和约](https://www.lwl.org/westfaelischer-friede-download/wfe-t/wfe-txt1-46.htm)（`geo-westphalia-signing`）
- [奥地利UNESCO委员会 · 威斯特伐利亚和约文献遗产](https://www.unesco.at/kommunikation/dokumentenerbe/memory-of-austria/verzeichnis/detail/article/westfaelische-friedensvertraege)（`geo-westphalia-archives`）
- [凡尔赛宫 · 皇家网球场](https://en.chateauversailles.fr/discover/estate/royal-tennis-court)（`geo-versailles-tennis`）
- [凡尔赛宫 · 皇家网球场官方地图](https://bienvenue.chateauversailles.fr/en/overview/to-see/8_salle-du-jeu-de-paume)（`geo-versailles-map`）
- [凡尔赛宫 · 镜厅与1871、1919年](https://bienvenue.chateauversailles.fr/en/palace/to-see/214_hall-of-mirrors)（`geo-versailles-mirrors`）
- [维也纳军事历史博物馆 · 萨拉热窝刺杀](https://www.hgm.at/en/visit-our-museums/museum-of-military-history/exhibitions/the-sarajevo-assassination)（`geo-sarajevo`）
- [美国国家档案馆 · 德国投降文书](https://www.archives.gov/milestone-documents/surrender-of-germany)（`geo-surrender-archives`）
- [兰斯市博物馆 · 1945年5月7日投降博物馆](https://musees-reims.fr/fr/musees/musee-de-la-reddition-du-7-mai-1945)（`geo-surrender-reims`）
- [法国国防部 · 兰斯投降博物馆](https://www.defense.gouv.fr/chemins-memoire/musee-reddition-7-mai-1945-reims)（`geo-surrender-reims-address`）
- [马恩省官方旅游机构 · 兰斯投降博物馆地图](https://tourisme-en-champagne.com/activite/musee-de-la-reddition/)（`geo-surrender-reims-map`）
- [柏林卡尔斯霍斯特博物馆 · 历史发生地](https://www.museum-karlshorst.de/en/about-us/the-historic-location/)（`geo-surrender-karlshorst`）
- [柏林卡尔斯霍斯特博物馆 · 官方位置与交通](https://www.museum-karlshorst.de/en/your-visit/visiting-information/)（`geo-karlshorst-map`）
- [柏林文物局 · 博恩霍尔默大街边境口岸](https://www.berlin.de/landesdenkmalamt/denkmale/highlight-berliner-mauer/mauer-denkmale/bornholmer-strasse-649637.en.php)（`geo-bornholmer`）
- [林堡省政府 · 马斯河畔省政府大楼](https://www.limburg.nl/over/organisatie/gouvernement-maas/)（`geo-maastricht-venue`）
- [威斯敏斯特修道院 · 加冕历史](https://www.westminster-abbey.org/history/coronations-at-the-abbey/coronation-stories)（`geo-westminster`）
- [亚琛主教座堂 · 国王宝座](https://www.aachenerdom.de/ort-der-geschichte/der-koenigsthron/)（`geo-aachen-throne`）
- [丰特夫罗修道院 · 埃莉诺的生平与葬地](https://www.fontevraud.fr/histoire-alienor-daquitaine-fontevraud/)（`geo-fontevraud`）
- [希农王家城堡 · 1429年贞德来访](https://forteressechinon.fr/en/discover-fortress/its-history/1429)（`geo-chinon`）
- [兰斯市博物馆 · 1429年7月17日查理七世加冕](https://musees-reims.fr/oeuvre/sacre-de-charles-vii)（`geo-reims-coronation`）
- [鲁昂市 · 旧市场广场与贞德纪念地](https://rouen.fr/eglise-sainte-jeanne-darc)（`geo-rouen-oldmarket`）
- [美因茨教区 · 主教座堂的历史](https://bistummainz.de/mainzer-dom/detail/Der-Mainzer-Dom-kann-auf-eine-ueber-1000-jaehrige-Geschichte-zurueckblicken./)（`geo-mainz-cathedral`）
- [法国文化部 · 努瓦永主教座堂与768年加冕](https://www.culture.gouv.fr/regions/drac-hauts-de-france/actualites/mission-patrimoine-le-batiment-du-jube-de-la-cathedrale-de-noyon-parmi-les-18-sites-emblematiques-2024)（`geo-noyon`）
- [梅姆莱本修道院与王宫博物馆 · 地点历史](https://www.kloster-memleben.de/geschichte-kultur)（`geo-memleben`）
- [HAEMUS · 陶雷西乌姆考古遗址](https://haemus.org.mk/tauresium/)（`geo-tauresium`）

## 新增23处地点复核

补充文件 `content/new-place-review-zh.json` / `-en.json` 覆盖候选地点的坐标、精度、来源与说明。

- 亚克兴候选点落在陆地上，已改为海湾口外海域参考点 `[20.725, 38.925]`，并以10m海岸数据复查为海域。
- 拉斯纳瓦斯采用安达卢西亚文化局公开的战役博物馆位置 `[-3.549, 38.3427]`，明确代表圣埃莱纳附近战场范围。
- 1822年埃皮达鲁斯采用皮亚达／新埃皮达鲁斯村域点 `[23.1286, 37.677]`；不是古剧场、海滨村或阿斯克勒庇俄斯圣地。
- 尼西亚325年不定位到787年的圣索菲亚教堂；惠特比664年不等同于现存哥特式建筑；卡尔马1397年不定位17世纪新城主教座堂；康斯坦茨会议与1417年教皇选举会场作区分。

- `marathon` [23.9784, 38.1185] · Battlefield-area reference point · Reference point for the Marathon battlefield area near the burial mound of the Athenian dead.
- `actium` [20.725, 38.925] · Naval-battle area reference point · Naval battle area in the Ionian Sea outside the entrance of the Ambracian Gulf.
- `nicaea` [29.7205, 40.429] · City reference point · The city of Nicaea, where the 325 council met; the surviving Hagia Sophia is associated with the council of 787.
- `monte-cassino` [13.8137, 41.49] · Historic-site area · Abbey site and rebuilt monastic complex on Monte Cassino.
- `whitby` [-0.6078, 54.488] · Historic-site area · The headland occupied by the early monastery; the surviving Gothic ruins postdate the synod of 664.
- `pavia` [9.1582, 45.1847] · City reference point · Pavia’s historic centre, associated with the end of Lombard rule in 774.
- `lechfeld` [10.889, 48.269] · Regional reference point · The Lech plain near Augsburg; the detailed distribution of the 955 battlefield remains debated.
- `canossa` [10.4467, 44.5755] · Historic-site area · The rock and surviving site of Canossa Castle.
- `worms` [8.3597, 49.6305] · City reference point · Historic Worms near the cathedral; the 1122 concordat and the 1521 hearing involved different venues.
- `legnano` [8.918, 45.595] · Battlefield-area reference point · Regional reference for the battle between Legnano and Borsano.
- `las-navas` [-3.549, 38.3427] · Battlefield-area reference point · Battlefield area near Santa Elena, using the battle museum’s location as the map reference.
- `bouvines` [3.186, 50.579] · Battlefield-area reference point · Bouvines village and the battlefield area near the Marque river.
- `avignon` [4.807, 43.9509] · City reference point · Historic Avignon, where Clement V took up residence in 1309.
- `bannockburn` [-3.9323, 56.0933] · Battlefield-area reference point · Battlefield memorial area south of Stirling; the two days of fighting covered a wider surrounding area.
- `kalmar` [16.346, 56.66] · City reference point · The medieval old town near the castle; the coronation of 1397 took place in the old town church.
- `grunwald` [20.125, 53.487] · Battlefield-area reference point · Grunwald’s battlefield memorial area and surrounding battle site.
- `konstanz` [9.1753, 47.6637] · City reference point · Historic centre near the cathedral, which hosted the council sessions of 1414–1418; the 1417 papal election took place in the harbour warehouse.
- `trent` [11.1211, 46.0673] · City reference point · Historic centre near the cathedral; different phases used the cathedral, legates’ residences and Santa Maria Maggiore.
- `augsburg` [10.8985, 48.3705] · City reference point · Historic Augsburg, the city of the imperial diet of 1555.
- `nantes` [-1.5536, 47.2184] · City reference point · Nantes, where the edict was issued in 1598; the point represents the historic city.
- `waterloo` [4.4032, 50.6806] · Battlefield-area reference point · The Mont-Saint-Jean battlefield south of Waterloo town, referenced by the memorial near the Lion’s Mound.
- `epidaurus` [23.1286, 37.677] · Historic-settlement reference point · Piada, now Nea Epidavros, where the National Assembly met in 1821–1822.
- `helsinki` [24.9333, 60.1757] · Building-location reference point · Finlandia Hall in Helsinki, the venue of the Final Act signing in 1975.

新增来源：

- [希腊文化遗产机构 · 马拉松战场与墓丘](https://www.hh.gr/en/destinations/marathon/)
- [牛津古典辞典 · 亚克兴的海湾入口位置](https://academic.oup.com/edited-volume/61673/chapter-abstract/548060363)
- [尼科波利斯考古博物馆 · 海战与城市的诞生](https://nicopolismuseum.gr/en/genesipolisen/)
- [土耳其世界遗产预备名单申报 · 伊兹尼克](https://whc.unesco.org/en/tentativelists/5900)
- [意大利文化部 · 卡西诺山修道院](https://cultura.gov.it/luogo/abbazia-di-montecassino)
- [English Heritage · 惠特比修道院的历史](https://www.english-heritage.org.uk/visit/places/whitby-abbey/history-and-stories/history/)
- [Treccani历史辞典 · 帕维亚](https://www.treccani.it/enciclopedia/pavia_%28Dizionario-di-Storia%29/)
- [奥格斯堡地区 · 955年莱希费尔德战役](https://www.augsburger-land.de/augsburger-land/kultur-tradition/sagen-geschichten/lechfeldschlacht-955)
- [意大利文化部 · 卡诺莎城堡](https://cultura.gov.it/luogo/castello-di-canossa-e-museo-nazionale-naborre-campanini)
- [沃尔姆斯市 · 城市历史](https://www.worms-erleben.de/erleben/erleben-und-feiern/kultur/Geschichte/)
- [沃尔姆斯市 · 路德与旧主教宫](https://www.worms-erleben.de/erleben/entdecken-und-staunen/kulturprofile/luther/)
- [意大利文化遗产目录 · 莱尼亚诺战役地区](https://www.catalogo.beniculturali.it/detail/HistoricOrArtisticProperty/0500657598)
- [安达卢西亚文化局 · 拉斯纳瓦斯战役博物馆位置](https://www.juntadeandalucia.es/cultura/agendaculturaldeandalucia/espacios/museo-de-la-batalla-de-las-navas-de-tolosa)
- [安达卢西亚文化局 · 拉斯纳瓦斯战场考古调查](https://www.juntadeandalucia.es/cultura/tabula/handle/20.500.11947/17501)
- [布汶市镇 · 布汶战役](https://www.bouvines.fr/tourisme/bataille-de-bouvines)
- [阿维尼翁教皇宫 · 1309年的教皇城市](https://palais-des-papes.com/event/avignon-au-temps-des-papes-2/)
- [苏格兰历史环境局 · 班诺克本战场登记](https://portal.historicenvironment.scot/apex/f?p=1505:300:::::VIEWTYPE,VIEWREF:designation,BTL4)
- [卡尔马省博物馆 · 1397年的卡尔马](https://www.medeltiden.kalmarlansmuseum.se/en/society/the-kalmar-union/kalmar-in-the-summer-of-1397/)
- [卡尔马城堡 · 联盟谈判与旧城加冕](https://kalmarslott.se/historia/historien-om-sverige/)
- [格伦瓦尔德战役博物馆 · 战场与馆址](https://muzeum-grunwald.pl/)
- [康斯坦茨会议城市 · 主教座堂与1417年教皇选举会场](https://www.konstanzer-konzil.de/de/aktuelles/aktuelles-archiv/2012/415-wie-das-konzil-zu-seinem-namen-kam)
- [特伦托教区博物馆 · 特伦托会议的会场](https://www.museodiocesanotridentino.it/pagine/il-concilio-di-trento)
- [奥格斯堡城市辞典 · 1555年宗教和约](https://www.stadtlexikon-augsburg.de/stadtlexikon-augsburg/artikel/stadtlexikon/augsburger-religionsfriedens/3188)
- [南特都市区 Patrimonia · 1598年南特敕令](https://patrimonia.nantes.fr/fiches-encyclopediques/edit-de-nantes-1598/)
- [滑铁卢1815官方导览 · 战场纪念馆位置](https://www.guides1815-waterloo.com/index.php/fr/contact)
- [法国雅典学院 · 新埃皮达鲁斯考古地名范围](https://chronique.efa.gr/?id=5884&r=topo_public)
- [阿尔戈利斯文物局 · 皮亚达与新埃皮达鲁斯](https://www.argolisculture.gr/en/list-of-monuments/piada-nea-epidaurus/)
- [芬兰大厦 · 官方位置与交通](https://www.finlandiatalo.fi/en/finlandia-hall/location-transportation/)
- [欧安组织 · 在芬兰大厦签署最后文件](https://www.osce.org/cio/171836)

## 新事件会场增补

36 条新增事件另有 38 个定位点，康斯坦茨会议、特伦托会议各含两处会场。城市、地区和战场参考点保留相应精度；已核实的凡尔赛镜厅、拉特朗、罗马条约及赫尔辛基会场单独标注。房间名称用于识别文献中的会场，地图点定位到建筑或遗址范围。
