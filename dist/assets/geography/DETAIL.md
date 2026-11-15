# 欧洲自然地理：Natural Earth 1:10m

这一组图层使用 **Natural Earth 1:10 million** 官方数据，提高海岸线、岛屿、湖泊及河流的可见细节。它是现代自然地理参考，与 Cliopatria 历史政治疆域分别管理。

## 来源与许可

- 来源：[Natural Earth](https://www.naturalearthdata.com/)。
- 原始数据采用[公共领域条款](https://www.naturalearthdata.com/about/terms-of-use/)。
- 固定数据提交：[ca96624a56bd078437bca8184e78163e5039ad19](https://github.com/nvkelso/natural-earth-vector/tree/ca96624a56bd078437bca8184e78163e5039ad19)。
- 取得日期：2026-11-15。
- 三份原始文件的固定下载地址、源文件哈希和衍生文件哈希都记录在 `manifest.json`。

## 内容

| 图层 | 文件 | 顶点数 | 原 1:50m 顶点数 |
| --- | --- | ---: | ---: |
| 海岸与陆地 | `europe-land-10m.geojson` | 79,946 | 8,481 |
| 河流及湖心线 | `europe-rivers-10m.geojson` | 37,186 | 3,369 |
| 湖泊 | `europe-lakes-10m.geojson` | 27,747 | 3,699 |

陆地文件按 Natural Earth 原始组织包含 9 个多边形／多重多边形要素，内部包含多个陆块与岛屿，**9 并非岛屿数量**。河流为 249 个要素，湖泊为 260 个要素；要素可能包含多个部分，不等于独立地理名称数量。全部文件约 2.95 MB。

## 处理

- 统一裁切至 `west=-26, south=28, east=55, north=74`，恢复此前被 −20° 西界裁掉的冰岛西部。
- 保留原始 1:10m 线条顶点，没有额外简化或手绘海岸／河流。
- 使用 0.00001° 有效输出网格，保存五位小数，检查全部几何有效且非空。
- 保留 `id, name, nameZh, kind, rank, minZoom`，其中分类与显示等级来自官方属性。
- 坐标为 WGS84 / EPSG:4326，GeoJSON 外环逆时针、孔顺时针。

水系包含现代湖泊、水库和河道参考；没有据此推断古代同样的水面。现有 NOAA / USGS 高程阴影及其署名保持单独管理。

## 重建

需要 Python 3 与 Shapely 2；源文件缓存默认位于 `.cache/geography-10m/`。

```sh
python3 scripts/prepare-geography-detail.py \
  --cache .cache/geography-10m \
  --output dist/assets/geography/detailed
```

脚本从固定提交下载缺失文件，并检查预置的原始 SHA-256 后再导出。输出目录可按应用的实际资源目录调整。

## 地形阴影的范围

本次扩展矢量海岸与水系，原有 NOAA / USGS 地形阴影未重新生成，仍覆盖 `west=-20, south=28, east=55, north=74`。冰岛西部使用已恢复的真实矢量地理，不补绘或外推山地阴影。
