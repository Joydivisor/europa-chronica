#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Generate high-detail Cliopatria geometry while retaining the overview index.

Requires Shapely >= 2.0. The source is the original fixed Cliopatria v0.2.1 ZIP.
Usage: python scripts/prepare-historical-detail.py --source /path/cliopatria.geojson.zip \
  --overview dist/assets/maps --output dist/assets/maps/detailed
No new geographic or historical boundaries are inferred.
"""
import argparse,collections,hashlib,json,pathlib,zipfile
import shapely
from shapely import make_valid,normalize,set_precision
from shapely.geometry import shape,mapping,box,MultiPolygon
from shapely.geometry.polygon import orient

def digest(data):return hashlib.sha256(data).hexdigest()
def polygons(g):
 if g.geom_type=='Polygon':return [g] if not g.is_empty and g.area>0 else []
 if hasattr(g,'geoms'):return [p for item in g.geoms for p in polygons(item)]
 return []
def vertex_count(g):
 def count(v):return 1 if len(v)>=2 and isinstance(v[0],(int,float)) else sum(count(x) for x in v)
 return count(g['coordinates'])
def canonical(g):
 ps=polygons(g)
 assert ps,'Geometry became empty'
 g=ps[0] if len(ps)==1 else MultiPolygon(ps)
 if not g.is_valid:
  ps=polygons(make_valid(g));g=ps[0] if len(ps)==1 else MultiPolygon(ps)
 g=normalize(g)
 return orient(g,sign=1) if g.geom_type=='Polygon' else MultiPolygon([orient(p,sign=1) for p in g.geoms])
def rounded(v):
 if isinstance(v,(list,tuple)):return [rounded(x) for x in v]
 return round(v,5) if isinstance(v,float) else v

def main():
 a=argparse.ArgumentParser();a.add_argument('--source',type=pathlib.Path,required=True);a.add_argument('--overview',type=pathlib.Path,required=True);a.add_argument('--output',type=pathlib.Path,required=True);a.add_argument('--tolerance',type=float,default=.007);a.add_argument('--bbox',type=float,nargs=4,default=[-25,30,48,72],metavar=('WEST','SOUTH','EAST','NORTH'));args=a.parse_args()
 args.output.mkdir(parents=True,exist_ok=True)
 index=json.loads((args.overview/'manifest.json').read_text());archive_bytes=args.source.read_bytes();archive_sha=digest(archive_bytes)
 assert archive_sha==index['metadata']['originalArchiveSha256'],'Source archive does not match the published overview provenance'
 with zipfile.ZipFile(args.source) as z:
  entry=index['metadata']['originalArchiveEntry'];raw_bytes=z.read(entry);original=json.loads(raw_bytes)['features']
 bbox=args.bbox;assert bbox[0]<bbox[2] and bbox[1]<bbox[3];clip=box(*bbox);overview=collections.OrderedDict();era_inputs={}
 for era in index['eras']:
  data=(args.overview/era['file']).read_bytes();assert digest(data)==era['sha256'];features=json.loads(data)['features'];era_inputs[era['id']]=features
  for f in features:
   record=f['properties']['recordId']
   if record in overview:assert overview[record]==f
   overview[record]=f
 repairs=0;cache={};invalid_input=[];rounded_repair=[];out={};different=[];raw_coords=0;fine_coords=0;coarse_coords=0
 def geometry(row):
  nonlocal repairs
  if row in cache:return cache[row]
  g=shape(original[row]['geometry'])
  if not g.is_valid:invalid_input.append(row);g=make_valid(g)
  g=canonical(g.intersection(clip).simplify(args.tolerance,preserve_topology=True))
  # Shapely's valid-output grid rounding retains validity; unlike rounding the
  # JSON coordinates blindly, it resolves collapsed rings and intersections.
  g=canonical(set_precision(g,grid_size=.00001,mode='valid_output'))
  js={'type':g.geom_type,'coordinates':rounded(mapping(g)['coordinates'])};check=shape(js)
  if not check.is_valid:
   rounded_repair.append(row);check=canonical(make_valid(check));js={'type':check.geom_type,'coordinates':mapping(check)['coordinates']}
  assert check.is_valid and not check.is_empty
  assert all(lo-1e-8<=x<=hi+1e-8 for x,lo,hi in zip(check.bounds,[bbox[0],bbox[1],bbox[0],bbox[1]],[bbox[2],bbox[3],bbox[2],bbox[3]]))
  cache[row]=js;return js
 for n,(record,f) in enumerate(overview.items()):
  p=f['properties'];rows=p['sourceRecords'];variants=[]
  for row in rows:
   source=original[row];sp=source['properties'];assert sp['Name']==p['original'];assert sp.get('MemberOf','')==p.get('memberOf','');assert sp.get('Components','')==p.get('components','')
   start=max(p['fromYear'],sp['FromYear']);end=min(p['toYear'],sp['ToYear']);assert start<=end
   geom=geometry(row);key=digest(json.dumps(geom,separators=(',',':')).encode())
   if variants and variants[-1]['_key']==key and start<=variants[-1]['toYear']+1:
    variants[-1]['toYear']=max(variants[-1]['toYear'],end);variants[-1]['sourceRecords'].append(row)
   else:variants.append({'fromYear':start,'toYear':end,'sourceRecords':[row],'geometry':geom,'_key':key})
  variants.sort(key=lambda v:v['fromYear'])
  assert variants[0]['fromYear']==p['fromYear'] and variants[-1]['toYear']==p['toYear'],('Uncovered endpoints',record)
  for prior,now in zip(variants,variants[1:]):assert prior['toYear']+1==now['fromYear'],('Overlap or gap',record,prior['toYear'],now['fromYear'])
  feature={'type':'Feature','properties':p,'geometry':variants[0]['geometry']}
  if len(variants)>1:
   for v in variants:v.pop('_key')
   feature['geometryVariants']=variants;different.append({'recordId':record,'name':p['original'],'segments':len(variants),'sourceRecords':rows})
  out[record]=feature
  coarse_coords+=vertex_count(f['geometry']);fine_coords+=vertex_count(feature['geometry'])
  if n%1000==0:print('processed',n,'of',len(overview),flush=True)
 metadata={**index['metadata'],'title':'Cliopatria v0.2.1 — European detailed geometry','resolution':'detail','bbox':bbox,'overviewIndexBbox':index['metadata']['bbox'],'simplificationDegrees':args.tolerance,'coordinatePrecisionDegrees':.00001,'originalArchiveSha256':archive_sha,'originalGeoJsonSha256':digest(raw_bytes),'shapelyVersion':shapely.__version__,'geometryEdits':f'Regenerated from the original source records, clipped to the declared bbox with the west edge extended to -25 degrees to retain Iceland; only the existing sourceRecords are included; make_valid where required; topology-preserving Douglas–Peucker simplification at {args.tolerance} degrees; valid-output coordinate grid 0.00001 degrees; standard GeoJSON orientation. Overview semantic properties, identifiers and coalesced intervals retained. Where finer geometry differs inside an overview interval, geometryVariants preserves the original source intervals. No geometry invented or interpolated.','geometryVariantsSemantics':'For a selected year, use the geometry of the unique geometryVariants segment whose fromYear <= year <= toYear. If geometryVariants is absent, use feature.geometry. Top-level properties and recordId remain identical to the overview file.','historicalInterpretation':'Increased geometric detail retains more of the same academic reconstruction; it does not establish additional historical certainty or settlement-scale boundary accuracy.'}
 manifest={'metadata':metadata,'eras':[],'audit':{'uniqueFeatures':len(out),'uniqueSourceRecords':len(cache),'identifiersPropertiesAndIntervalsUnchanged':True,'overviewVertexCount':coarse_coords,'detailDefaultGeometryVertexCount':fine_coords,'vertexRatio':round(fine_coords/coarse_coords,3),'geometryVariantFeatureCount':len(different),'geometryVariants':different,'invalidOriginalRecordsRepaired':invalid_input,'roundedGeometriesRepaired':rounded_repair,'allGeometryValid':True,'allGeometryWithinBounds':True,'variantIntervalsContinuousAndUnambiguous':True}}
 for era in index['eras']:
  fs=[out[f['properties']['recordId']] for f in era_inputs[era['id']]]
  count=sum(vertex_count(f['geometry'])+sum(vertex_count(v['geometry']) for v in f.get('geometryVariants',[])) for f in fs)
  payload={'type':'FeatureCollection','metadata':{**metadata,'eraYearRange':[era['fromYear'],era['toYear']]},'features':fs};data=json.dumps(payload,ensure_ascii=False,separators=(',',':')).encode();(args.output/era['file']).write_bytes(data)
  manifest['eras'].append({**era,'bytes':len(data),'sha256':digest(data),'vertexCountIncludingVariants':count,'overviewBytes':era['bytes'],'geometryVariantFeatureCount':sum('geometryVariants' in f for f in fs)})
  print(era['file'],'features',len(fs),'bytes',len(data),'vertices',count,flush=True)
 (args.output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'uniqueFeatures':len(out),'vertices':fine_coords,'overviewVertices':coarse_coords,'ratio':fine_coords/coarse_coords,'variants':len(different)}),flush=True)
if __name__=='__main__':main()
