# 欧陆地理底图图层

这些图层是**现代自然地理参考**，不是古代海岸线、水系或地表形态的复原。历史政权边界数据另见 `../maps/`。地形高低与真实现代高程有关，不含手绘虚构山脉。

## 精细矢量底图

来源：Natural Earth 1:10 million，公有领域。

- 官方条款：https://www.naturalearthdata.com/about/terms-of-use/
- 数据仓库：https://github.com/nvkelso/natural-earth-vector
- 取得日期：2026-11-15。
- 海岸/陆地：`europe-land-10m.geojson`
- 湖泊：`europe-lakes-10m.geojson`
- 河流及湖心线：`europe-rivers-10m.geojson`
- 完整源URL、文件哈希和要素数量：`manifest.json`。

只裁切至经纬度边界 `west=-26, south=28, east=55, north=74`、精简属性并保留5位坐标小数，没有另行平滑或手绘自然地理。

矢量为 WGS84 / EPSG:4326。GeoJSON标准环方向：外环逆时针、孔顺时针。D3球面geoPath的环方向相反，接入时应反转所有polygon rings（河流线不反转）。属性为 `id, name, nameZh, kind, rank, minZoom`；`rank`与`minZoom`沿用Natural Earth。湖泊与河流包含现代水体及水库，不能据此推断历史年代存在同样水面。

扩展后的西部冰岛使用完整矢量海岸；高程阴影仍维持原有覆盖范围。

## 高程阴影

- 推荐文件：`europe-hillshade.webp`，透明通道，2000 × 2220。
- PNG兼容文件：`europe-hillshade.png`。
- **投影：Web Mercator / EPSG:3857**。
- 精确经纬度边界：`[-20, 28, 55, 74]`（西、南、东、北）。
- `hillshade.json`给出投影米制边界、渲染参数和每一张源瓦片的URL、ETag、最后修改日期、来源响应头与SHA-256。

源数据是Mapzen / Tilezen Terrain Tiles在AWS Open Data的Terrarium z6瓦片，共210张。已逐瓦片检查 `x-amz-meta-x-imagery-sources`，本范围本层级使用的源只有 **NOAA ETOPO1** 与 **USGS GMTED2010**，均为公有领域；没有混入未核验许可的其他高程数据。

- 服务及数据说明：https://registry.opendata.aws/terrain-tiles/
- 源许可证与署名要求：https://github.com/tilezen/joerd/blob/master/docs/attribution.md
- 数据格式：https://github.com/tilezen/joerd/blob/master/docs/formats.md
- 取得日期：2026-11-15。

署名：

> Terrain Tiles / Mapzen. ETOPO1: DOC/NOAA/NESDIS/NCEI > National Centers for Environmental Information, NESDIS, NOAA, U.S. Department of Commerce. GMTED2010 data courtesy of the U.S. Geological Survey.

本图层解码实际海拔，按墨卡托纬度比例计算米制坡度，使用315°方位、45°高度的光源生成山体阴影；为全欧地图可读性使用2.2倍垂直夸张，已在元数据记录。双线性重采样至2000 × 2220，海拔不大于0的像素透明；建议再用陆地矢量裁切，避免海岸简化不一致。它是可视化衍生物，不用于导航、测绘或精确高程分析。

在未旋转的D3 Mercator地图中，可令左上角为`projection([-20,74])`，右下角为`projection([55,28])`，用两点之差作为SVG image的width/height，并设`preserveAspectRatio="none"`。图像放进与矢量相同的缩放组；可使用multiply混合和较低opacity。其他投影需重投影，不能直接拉伸使用。

## 可重建脚本

- `scripts/prepare-geography-detail.py`：从固定提交的官方 10m 源文件生成当前矢量。
- 旧版 50m 资源与 `manifest-50m.json` 保留为对照。
- [详细处理方法](DETAIL.md) 与 `detail-comparison.json` 给出来源哈希和细节比较。
- `scripts/prepare-hillshade.py`：取得/复用缓存瓦片，保存逐瓦片元数据，生成阴影图。

原始源文件与瓦片缓存位于工作区研究目录，未作为网页运行时依赖；网页图层均可直接本地加载。
