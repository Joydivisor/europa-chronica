#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Prepare European Natural Earth 1:50m vectors from public-domain source GeoJSON.
Usage: python3 scripts/prepare-geography.py (requires Shapely)
Raw download cache: .cache/geography (or EUROPA_DATA_CACHE)
"""
import os,json,pathlib,hashlib,urllib.request
from shapely.geometry import shape,mapping,box,MultiPolygon,MultiLineString
from shapely.geometry.polygon import orient
from shapely import make_valid
ROOT=pathlib.Path(__file__).resolve().parents[1]; OUT=ROOT/'dist/assets/geography'
RAW=pathlib.Path(os.environ.get('EUROPA_DATA_CACHE',ROOT/'.cache/geography')); RAW.mkdir(parents=True,exist_ok=True); BBOX=[-20,28,55,74]
ZH={'Danube':'多瑙河','Rhine':'莱茵河','Rhone':'罗讷河','Rhône':'罗讷河','Seine':'塞纳河','Loire':'卢瓦尔河','Garonne':'加龙河','Ebro':'埃布罗河','Douro':'杜罗河','Tagus':'塔霍河','Guadalquivir':'瓜达尔基维尔河','Po':'波河','Tiber':'台伯河','Thames':'泰晤士河','Severn':'塞文河','Shannon':'香农河','Elbe':'易北河','Oder':'奥得河','Vistula':'维斯瓦河','Dnieper':'第聂伯河','Dniester':'德涅斯特河','Don':'顿河','Volga':'伏尔加河','Ural':'乌拉尔河','Kama':'卡马河','Northern Dvina':'北德维纳河','Pechora':'伯朝拉河','Neva':'涅瓦河','Sava':'萨瓦河','Drava':'德拉瓦河','Tisza':'蒂萨河','Ladoga':'拉多加湖','Onega':'奥涅加湖'}
def parts(g,kind):
 if kind=='land' or kind=='lakes':
  if g.geom_type=='Polygon':return [g]
 else:
  if g.geom_type=='LineString':return [g]
 if hasattr(g,'geoms'):return [p for a in g.geoms for p in parts(a,kind)]
 return []
def rnd(v):
 if isinstance(v,(list,tuple)):return [rnd(x) for x in v]
 return round(v,5) if isinstance(v,float) else v
manifest={'bbox':BBOX,'crs':'EPSG:4326','scale':'Natural Earth 1:50 million','license':'Public domain','licenseUrl':'https://www.naturalearthdata.com/about/terms-of-use/','sourceRepository':'https://github.com/nvkelso/natural-earth-vector','retrievedAt':'2026-11-15','note':'Modern physical geography reference; not a historical coastline or hydrography reconstruction.','layers':{}}
for kind,src in [('land','ne_50m_land.geojson'),('lakes','ne_50m_lakes.geojson'),('rivers','ne_50m_rivers_lake_centerlines.geojson')]:
 inp=RAW/src
 if not inp.exists():
  with urllib.request.urlopen(f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/{src}',timeout=60) as response: inp.write_bytes(response.read())
 data=json.loads(inp.read_text());fs=[]
 for i,f in enumerate(data['features']):
  g=shape(f['geometry']);a,b,c,d=g.bounds
  if a>55 or c< -20 or b>74 or d<28:continue
  if not g.is_valid:g=make_valid(g)
  gs=[p for p in parts(g.intersection(box(*BBOX)),kind) if not p.is_empty]
  if not gs:continue
  if kind=='rivers':g=gs[0] if len(gs)==1 else MultiLineString(gs)
  else:g=orient(gs[0],sign=1) if len(gs)==1 else MultiPolygon([orient(p,sign=1) for p in gs])
  props=f['properties'];name=props.get('name_en') or props.get('name') or ''
  fs.append({'type':'Feature','properties':{'id':props.get('ne_id',f'{kind}-{i}'),'name':name,'nameZh':props.get('name_zh') or ZH.get(name,''),'kind':props.get('featurecla',kind),'rank':props.get('scalerank',0),'minZoom':props.get('min_zoom',0)},'geometry':{'type':g.geom_type,'coordinates':rnd(mapping(g)['coordinates'])}})
 obj={'type':'FeatureCollection','metadata':dict(source='Natural Earth',sourceFile=src,license='Public domain',bbox=BBOX,scale='1:50m',modifications='Clipped to Europe bounds; nonessential attributes removed; coordinates rounded to five decimal places. No manual geometry; no cartographic simplification.'),'features':fs}
 buf=json.dumps(obj,ensure_ascii=False,separators=(',',':')).encode();fn=f'europe-{kind}-50m.geojson';(OUT/fn).write_bytes(buf)
 manifest['layers'][kind]={'file':fn,'featureCount':len(fs),'bytes':len(buf),'sourceUrl':f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/{src}','sourceSha256':hashlib.sha256(inp.read_bytes()).hexdigest(),'sha256':hashlib.sha256(buf).hexdigest()}
 print(kind,len(fs),len(buf))
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
