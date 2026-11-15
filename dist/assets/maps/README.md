# 欧洲历史疆域数据：来源与方法

此目录为 **Cliopatria v0.2.1** 的欧洲范围衍生数据。它是一份学术历史空间重建，不是每年国界的精确测量，也不是主权主张或现代边界裁定。空白不等于无人居住、无政治组织或无归属。不同政权、附庸关系、共主关系和影响范围可能交叠，且历史分期在不同地区并不完全一致。

## 原始来源

- Bennett, J. S., Mutch, E., Tollefson, A., et al. (2025). **Cliopatria – A geospatial database of world-wide political entities from 3400BCE to 2024CE.** *Scientific Data* 12, 247. https://doi.org/10.1038/s41597-025-04516-9
- 官方数据仓库：https://github.com/Seshat-Global-History-Databank/cliopatria
- 固定提交：https://github.com/Seshat-Global-History-Databank/cliopatria/tree/5f433377139a6eeaeacbdc894b70f8805b72c8b5
- 官方压缩档内文件：`cliopatria_polities_only_v021.geojson`。
- 获取日期：2026-11-15。
- 原始数据许可证：**Creative Commons Attribution 4.0 International (CC BY 4.0)**。https://creativecommons.org/licenses/by/4.0/

保留以上署名、来源、许可证与修改说明即可共享和再利用本衍生数据。该许可证仅指本目录的疆域数据，不代指网站其他内容的许可。

## 修改

1. 仅提取与公元前500年至公元2024年的日期范围相交的记录，裁切到经度 -16°至48°、纬度30°至72°（包含欧洲邻近的地中海沿岸）。
2. 使用 Shapely 裁切和保持拓扑的简化：0.022°后再0.035°，坐标保留3位小数。此级别适合欧洲全图，放大后不应解释为城镇级精确边界。
3. 几何无效处使用 `make_valid` 修复；不手绘、扩张或推断缺失疆域。
4. 简化裁切后几何及政权关系完全相同的连续来源记录合并，原始行号保留在 `sourceRecords`。
5. 常见名称附中文翻译；无法确认的保留原文。`original` 永远保留来源原名。源数据可能以同一名称覆盖不同制度阶段：例如塞尔维亚1217年前不能仅凭源数据的“Kingdom”一词写成已建立王国；中文采用“塞尔维亚政权”，并附说明。
6. 按六个叙述时期分文件，仅为加载优化；这些分期本身不改变来源日期。

## 文件和使用

`manifest.json` 列出每个时期的包含日期、文件名、要素数和校验值。选择唯一满足 `era.fromYear <= year <= era.toYear` 的文件。记录的 `fromYear` 和 `toYear` **包含两端**，即：

```js
const candidates = geojson.features.filter(f => f.properties.fromYear <= year && year <= f.properties.toYear);
const names = new Set(candidates.map(f => f.properties.original));
const visible = candidates.filter(f => !f.properties.memberOf.split(';').some(parent => names.has(parent.trim())));
```

`memberOf`指向来源中的复合政权名称。过滤其子记录可避免同一聚合疆域与其成员重复上色。部分不同层级的历史地域仍可能在来源中重叠，不能将色块理解为现代式互斥领土。

几何为WGS84标准GeoJSON环方向：外环逆时针、孔顺时针。D3球面`geoPath`使用相反环方向，使用时应反转所有环，或先投影为平面路径。

标准属性：`recordId`（合并后第一条原始行号）、`sourceRecords`（所有原始行号）、`id`、`group`、`name`、`nameZh`、`original`、`fromYear`、`toYear`、`sourceId`、`memberOf`、`components`、`note`。

## 历史准确性的限度

Cliopatria作者明确指出，古代及中世纪边界、名称、存续年代和控制范围存在不确定性，数据代表一种综合重建。来源把历史地图在时间上分段编码；一个日期落在记录区间内，并不能证明这一年的全部细节均获独立核验。精确事件日期应另引史学文字来源；图上显示“疆域约示 / 学术重建”。不宜宣称本地图已逐年、逐边界无误。

本项目初步研究中另检索过Harvard DARMC，但发现其“约1200年”图层含显著异时标签，未采用也未分发该套图层。

## 现代边界说明

覆盖截止于 **2024年**，不外推为2026年现状。现代边界沿用源数据的历史重建，不能用于裁定争议地区的主权、国际承认或现实控制状态；政治实体名称也保留其数据语境。
