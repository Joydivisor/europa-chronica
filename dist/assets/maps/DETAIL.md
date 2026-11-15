# 历史疆域：来源、细节与时间区间

本组文件由 **Cliopatria v0.2.1** 的原始几何重新导出，覆盖公元前 500 年至 2024 年，与原版本使用同一批历史记录。

## 来源与许可

- Bennett, J. S., Mutch, E., Tollefson, A., et al. (2025). **Cliopatria – A geospatial database of world-wide political entities from 3400BCE to 2024CE.** *Scientific Data* 12, 247. https://doi.org/10.1038/s41597-025-04516-9
- 固定源版本：[5f433377139a6eeaeacbdc894b70f8805b72c8b5](https://github.com/Seshat-Global-History-Databank/cliopatria/tree/5f433377139a6eeaeacbdc894b70f8805b72c8b5)。
- 原始压缩包：[cliopatria.geojson.zip](https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/5f433377139a6eeaeacbdc894b70f8805b72c8b5/cliopatria.geojson.zip)，压缩包内文件为 `cliopatria_polities_only_v021.geojson`。
- 压缩包 SHA-256：`e10a4e429fca708788ff9e7572a95fce801fae55852d217cffabc1c59cd4eed4`。
- 数据采用 [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)。共享本欧洲衍生数据时，保留作者、来源、许可与以下修改说明。

## 本次几何处理

1. 将旧版 −16° 的西侧裁切边界扩展至 −25°，恢复冰岛西部；仍只使用原有历史记录。 从固定原始压缩包取回每条 `sourceRecords` 对应的原始几何，裁切至经度 −25°—48°、纬度 30°—72°。
2. 对需要修复的原始几何使用 Shapely `make_valid`，然后以 **0.007°** 容差做保拓扑简化。原版使用先 0.022°、后 0.035° 的两次简化。
3. 使用 **0.00001°** 的有效输出坐标网格，以五位小数保存坐标。保持 GeoJSON 标准环方向：外环逆时针、内环顺时针。
4. 六个分区合计包含 7,939 条记录，其中 7,623 条互不重复。每条记录的 `recordId`、名称、归属关系、来源编号及顶层时间范围与原索引一致。
5. 默认几何顶点由 1,236,174 个增加至 1,289,225 个，约增加 **4.3%**。这一增量包含恢复冰岛西部的裁切范围变化及保留的几何细节；历史信息仍来自同一份学术重建。
6. 原版合并的 614 组连续记录中，有 **35 组**在更细坐标下可区分。对这些记录增加 `geometryVariants`，恢复原始时间分段对应的几何；不将一段几何误用于整个合并时期。

疆域依据来源中的重建区间呈现。增加坐标细节不会扩大史料所能支持的精确程度，也没有新增或推断边界。

## 时间和渲染合同

顶层记录与 `geometryVariants` 均使用包含两端的区间：

```js
const inYear = feature.properties.fromYear <= year && year <= feature.properties.toYear;
const segment = feature.geometryVariants?.find(v => v.fromYear <= year && year <= v.toYear);
const geometry = segment?.geometry ?? feature.geometry;
```

`geometryVariants` 仅在需要时出现；每一段包含 `fromYear`、`toYear`、`sourceRecords` 和 `geometry`。各段覆盖完整顶层区间，连续且不重叠。顶层 `recordId` 保持稳定，已有显示修正规则继续对它生效。

原有 `memberOf`、`components` 与政治体系分组保留；顶层政治体系和成员范围的显示筛选由应用完成。几何精细化不改变这些关系。

## 文件与检查

`manifest.json` 给出每个时代文件的年份、字节数、SHA-256、要素数与顶点数，以及原始压缩包和 GeoJSON 哈希。`audit` 记录修复的原始记录、35 组几何分段及检查结果。所有输出几何均已检查有效性、非空性、裁切边界、属性一致性与时间分段完整性。

可使用 `scripts/prepare-historical-detail.py`（Python 3、Shapely 2）重建：

```sh
python3 scripts/prepare-historical-detail.py \
  --source /path/to/cliopatria.geojson.zip \
  --overview dist/assets/maps \
  --output /tmp/europa-maps-rebuilt
```

`--overview` 读取现有六时代索引的标识、来源记录与时间属性，几何始终来自固定原始压缩包。已有数据说明中的现代界线语境、编辑修正和来源范围仍适用。

## 冰岛与地形范围

自然地理西界扩至 −26°，历史政治范围扩至 −25°，覆盖冰岛全岛。冰岛政治范围仍按同一固定来源逐年选取，没有根据现代岛界补画历史政权。原有高程阴影仍覆盖 `[-20, 28, 55, 74]`，扩展出的西部区域不添加推测地形阴影。

### 冰岛来源区间核对

现有索引已包含原数据中全部涉及冰岛的记录，未追加新政权。源数据的区间与标签存在待另行考证的项目：`Icelandic Commonwealth` 使用 936—1271 年，`Denmark-Norway` 在相关记录中延伸至 1921 年，1940—1945 年体现英美军事范围，`Republic of Iceland` 从 1946 年开始；860—935 年另有部分法兰克体系几何与冰岛叠置。几何恢复保持这些原始记录，不能把它们当成已经核定的冰岛制度史年代。应用中的史事正文、名称及展示修正需要独立的权威文字依据。详细范围与记录列表见本次 `iceland-audit.json`。
