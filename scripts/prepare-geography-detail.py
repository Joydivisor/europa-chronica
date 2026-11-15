#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Build fixed-source Natural Earth 1:10m Europe coast, river and lake assets.
Requires Shapely >= 2.0. Downloads are cached; no API key is required.
"""
import argparse,hashlib,json,pathlib,urllib.request
from shapely.geometry import shape,mapping,box,MultiPolygon,MultiLineString
from shapely.geometry.polygon import orient
from shapely import make_valid,set_precision
SOURCE_COMMIT='ca96624a56bd078437bca8184e78163e5039ad19'
SOURCES={
 'land':('ne_10m_land.geojson','1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416'),
 'lakes':('ne_10m_lakes.geojson','2d036f53dedec578001c5c30c2959ee7d4eebc1306900fa4367c49929ec8f2d9'),
 'rivers':('ne_10m_rivers_lake_centerlines.geojson','bb854a900ecbd3b408df46d5e16e3e0f974ba55993f9d8b5c26e855273c0905a')
}
BBOX=[-26,28,55,74]
ZH={'Danube':'多瑙河','Rhine':'莱茵河','Rhone':'罗讷河','Rhône':'罗讷河','Seine':'塞纳河','Loire':'卢瓦尔河','Garonne':'加龙河','Ebro':'埃布罗河','Douro':'杜罗河','Tagus':'塔霍河','Guadalquivir':'瓜达尔基维尔河','Po':'波河','Tiber':'台伯河','Thames':'泰晤士河','Severn':'塞文河','Shannon':'香农河','Elbe':'易北河','Oder':'奥得河','Vistula':'维斯瓦河','Dnieper':'第聂伯河','Dniester':'德涅斯特河','Don':'顿河','Volga':'伏尔加河','Ural':'乌拉尔河','Kama':'卡马河','Northern Dvina':'北德维纳河','Pechora':'伯朝拉河','Neva':'涅瓦河','Sava':'萨瓦河','Drava':'德拉瓦河','Tisza':'蒂萨河','Ladoga':'拉多加湖','Onega':'奥涅加湖'}
def parts(g,kind):
 expected='LineString' if kind=='rivers' else 'Polygon'
 if g.geom_type==expected:return [g] if not g.is_empty else []
 if hasattr(g,'geoms'):return [p for item in g.geoms for p in parts(item,kind)]
 return []
def rnd(v):
 if isinstance(v,(list,tuple)):return [rnd(x) for x in v]
 return round(v,5) if isinstance(v,float) else v
def count(v):return 1 if len(v)>=2 and isinstance(v[0],(int,float)) else sum(count(x) for x in v)
def main():
 p=argparse.ArgumentParser();p.add_argument('--cache',type=pathlib.Path,default=pathlib.Path('.cache/geography-10m'));p.add_argument('--output',type=pathlib.Path,default=pathlib.Path('dist/assets/geography/detailed'));a=p.parse_args();a.cache.mkdir(parents=True,exist_ok=True);a.output.mkdir(parents=True,exist_ok=True)
 manifest={'bbox':BBOX,'crs':'EPSG:4326','scale':'Natural Earth 1:10 million','resolution':'detail','sourceCommit':SOURCE_COMMIT,'license':'Public domain','licenseUrl':'https://www.naturalearthdata.com/about/terms-of-use/','sourceRepository':'https://github.com/nvkelso/natural-earth-vector','retrievedAt':'2026-11-15','note':'Modern natural geography reference; not a reconstruction of historical coastlines or historical water surfaces.','reliefCoverageNote':'The separately managed existing hillshade retains its original west=-20, south=28, east=55, north=74 coverage; the newly restored western Iceland coast is displayed without invented relief.', 'geometryEdits':'Spatial clipping to the European viewport, property selection, valid-output 0.00001-degree coordinate grid. Native 1:10m vertices retained without line simplification.','layers':{}}
 for kind,(name,expected_hash) in SOURCES.items():
  source_url=f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/{SOURCE_COMMIT}/geojson/{name}';file=a.cache/name
  if not file.exists():
   with urllib.request.urlopen(source_url,timeout=60) as r:file.write_bytes(r.read())
  raw=file.read_bytes();assert hashlib.sha256(raw).hexdigest()==expected_hash
  data=json.loads(raw);out=[];repaired=0
  for i,f in enumerate(data['features']):
   g=shape(f['geometry']);x,y,X,Y=g.bounds
   if x>BBOX[2] or X<BBOX[0] or y>BBOX[3] or Y<BBOX[1]:continue
   if not g.is_valid:g=make_valid(g);repaired+=1
   gs=parts(set_precision(g.intersection(box(*BBOX)),grid_size=.00001,mode='valid_output'),kind)
   if not gs:continue
   if kind=='rivers':g=gs[0] if len(gs)==1 else MultiLineString(gs)
   else:g=orient(gs[0],sign=1) if len(gs)==1 else MultiPolygon([orient(q,sign=1) for q in gs])
   js={'type':g.geom_type,'coordinates':rnd(mapping(g)['coordinates'])};check=shape(js);assert check.is_valid and not check.is_empty
   props=f['properties'];label=props.get('name_en') or props.get('name') or ''
   out.append({'type':'Feature','properties':{'id':props.get('ne_id',f'{kind}-10m-{i}'),'name':label,'nameZh':props.get('name_zh') or ZH.get(label,''),'kind':props.get('featurecla',kind),'rank':props.get('scalerank',0),'minZoom':props.get('min_zoom',0)},'geometry':js})
  metadata={'source':'Natural Earth','sourceFile':name,'sourceCommit':SOURCE_COMMIT,'license':'Public domain','bbox':BBOX,'scale':'1:10m','modifications':manifest['geometryEdits']}
  payload={'type':'FeatureCollection','metadata':metadata,'features':out};buf=json.dumps(payload,ensure_ascii=False,separators=(',',':')).encode();fn=f'europe-{kind}-10m.geojson';(a.output/fn).write_bytes(buf)
  manifest['layers'][kind]={'file':fn,'featureCount':len(out),'vertexCount':sum(count(f['geometry']['coordinates']) for f in out),'bytes':len(buf),'sourceUrl':source_url,'sourceSha256':expected_hash,'sha256':hashlib.sha256(buf).hexdigest(),'invalidSourceGeometriesRepaired':repaired,'allGeometryValid':True}
  print(kind,manifest['layers'][kind],flush=True)
 (a.output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
