#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Build a static Mercator hillshade from public Mapzen Terrarium elevation tiles.
Preserves exact geographic bounds and per-tile source headers. Requires Pillow/numpy.
"""
import os,pathlib,math,json,hashlib,urllib.request,concurrent.futures,time,io
import numpy as np
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'dist/assets/geography';RAW=pathlib.Path(os.environ.get('EUROPA_DATA_CACHE',ROOT/'.cache/geography'))/'terrarium-z6';RAW.mkdir(parents=True,exist_ok=True)
Z=6;N=2**Z;S=256;BBOX=[-20,28,55,74];W=2000

def tx(lon):return (lon+180)/360*N

def ty(lat):return (1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*N
xmin,xmax=math.floor(tx(BBOX[0])),math.floor(tx(BBOX[2]));ymin,ymax=math.floor(ty(BBOX[3])),math.floor(ty(BBOX[1]));tiles=[(x,y) for y in range(ymin,ymax+1) for x in range(xmin,xmax+1)]

def get_tile(xy):
 x,y=xy;url=f'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{Z}/{x}/{y}.png';p=RAW/f'{x}-{y}.png';hp=RAW/f'{x}-{y}.json'
 if p.exists() and hp.exists():return json.loads(hp.read_text())
 for attempt in range(3):
  try:
   with urllib.request.urlopen(url,timeout=20) as r:
    b=r.read();h=dict(r.headers)
   img=Image.open(io.BytesIO(b));assert img.size==(256,256)
   meta={'z':Z,'x':x,'y':y,'url':url,'imagerySources':h.get('x-amz-meta-x-imagery-sources') or h.get('X-Amz-Meta-X-Imagery-Sources') or h.get('x-imagery-sources'),'etag':h.get('ETag') or h.get('etag'),'lastModified':h.get('Last-Modified') or h.get('last-modified'),'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)}
   # Header keys are case-insensitive in HTTPMessage, but normalize for saved dict.
   norm={k.lower():v for k,v in h.items()};meta['imagerySources']=norm.get('x-amz-meta-x-imagery-sources') or norm.get('x-imagery-sources')
   p.write_bytes(b);hp.write_text(json.dumps(meta));return meta
  except Exception:
   if attempt==2:raise
   time.sleep(.4*(attempt+1))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: metas=list(pool.map(get_tile,tiles))
sources=sorted(set(m['imagerySources'] or 'UNREPORTED' for m in metas));print('downloaded',len(metas),'sources',sources,flush=True)
# Only known US public-domain sources are accepted for this asset pass.
allowed=('etopo1/','gmted/','srtm/')
assert all(m['imagerySources'] and all(a.strip().startswith(allowed) for a in m['imagerySources'].split(',')) for m in metas),'Non-public-domain or unknown source; review before rendering'
elev=np.empty(((ymax-ymin+1)*S,(xmax-xmin+1)*S),dtype=np.float32)
for x,y in tiles:
 im=np.asarray(Image.open(RAW/f'{x}-{y}.png').convert('RGB'),dtype=np.float32)
 a=im[:,:,0]*256+im[:,:,1]+im[:,:,2]/256-32768
 elev[(y-ymin)*S:(y-ymin+1)*S,(x-xmin)*S:(x-xmin+1)*S]=a
left=(tx(BBOX[0])-xmin)*S;right=(tx(BBOX[2])-xmin)*S;top=(ty(BBOX[3])-ymin)*S;bottom=(ty(BBOX[1])-ymin)*S
H=round(W*(bottom-top)/(right-left))
# Resample elevation, then compute slope in metres using Mercator local latitude scale.
dem=np.asarray(Image.fromarray(elev,mode='F').resize((W,H),Image.Resampling.BILINEAR,box=(left,top,right,bottom)),dtype=np.float64)
R=6378137.;west=math.radians(BBOX[0])*R;east=math.radians(BBOX[2])*R;north=R*math.asinh(math.tan(math.radians(BBOX[3])));south=R*math.asinh(math.tan(math.radians(BBOX[1])))
ys=north-(np.arange(H)+.5)*(north-south)/H;lats=np.arctan(np.sinh(ys/R));dx=(east-west)/W*np.cos(lats);dy=(north-south)/H*np.cos(lats)
# Modest 2.2x vertical exaggeration improves legibility at continental scale; disclosed in metadata.
gy,gx=np.gradient(dem);gx=gx/dx[:,None]*2.2;gy=gy/dy[:,None]*2.2
az=math.radians(315);alt=math.radians(45)
# Coordinates: +x east, +y south. Light from NW has negative x/y horizontal components.
nx=-gx;ny=-gy;nz=np.ones_like(nx);norm=np.sqrt(nx*nx+ny*ny+1)
lx=math.sin(az)*math.cos(alt);ly=-math.cos(az)*math.cos(alt);lz=math.sin(alt)
shade=np.clip((nx*lx+ny*ly+nz*lz)/norm,0,1)
# Neutral white low relief; real positive relief gains increasing opacity. Water masked to alpha 0.
val=np.clip(224+(shade-math.sin(alt))*150,95,255).astype('uint8')
alpha=np.clip(np.maximum(dem,0)/450*150+np.hypot(gx,gy)*140,0,185).astype('uint8');alpha[dem<=0]=0
rgba=np.dstack([val,val,val,alpha]);img=Image.fromarray(rgba,'RGBA');img.save(OUT/'europe-hillshade.png',optimize=True);img.save(OUT/'europe-hillshade.webp',lossless=True,method=6)
manifest={'title':'European terrain hillshade','file':'europe-hillshade.webp','pngFallback':'europe-hillshade.png','width':W,'height':H,'crs':'EPSG:3857','geographicBounds':{'west':BBOX[0],'south':BBOX[1],'east':BBOX[2],'north':BBOX[3]},'mercatorBoundsMetres':{'west':west,'south':south,'east':east,'north':north},'tileZoom':Z,'tiles':metas,'imagerySources':sources,'attribution':'Terrain Tiles / Mapzen; elevation: DOC/NOAA/NESDIS/NCEI > National Centers for Environmental Information, NESDIS, NOAA, U.S. Department of Commerce; GMTED2010 data courtesy of U.S. Geological Survey.','license':'Underlying ETOPO1 and GMTED2010 sources are public domain; attribution retained.','sourceDocs':'https://github.com/tilezen/joerd/blob/master/docs/attribution.md','sourceRegistry':'https://registry.opendata.aws/terrain-tiles/','retrievedAt':'2026-11-15','rendering':{'illuminationAzimuthDegrees':315,'illuminationAltitudeDegrees':45,'verticalExaggeration':2.2,'resampling':'Bilinear elevation to output Mercator grid, metric slope calculation with latitude correction','waterMask':'Elevation <= 0 has zero alpha; recommended additional Natural Earth land clipping','note':'Modern physical relief reference. This is a visual derivative of real elevation, not a historical land-surface reconstruction or navigation product.'}}
for f in ['europe-hillshade.webp','europe-hillshade.png']:
 b=(OUT/f).read_bytes();manifest[f]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(OUT/'hillshade.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('render',W,H,'webp',manifest['europe-hillshade.webp']['bytes'],'png',manifest['europe-hillshade.png']['bytes'],flush=True)
