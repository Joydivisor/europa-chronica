# 参与欧陆纪年

欢迎通过 Issue 提交问题，或通过 Pull Request 改善地图、交互、翻译与历史内容。

## 本地开发

```sh
npm ci
npm test
python3 -m http.server 8000 --directory dist
```

使用 Node.js 22 与 Python 3。网站无需构建；Python 仅用于本地静态服务。

## 历史内容

- 修改年代、事件、人物关系或制度说明时，附上支持具体表述的来源与段落。
- 优先使用学术出版物、大学、博物馆、国家档案馆及官方历史文献。
- 核心中文内容在 `dist/data.js`，城市及政权专题在 `dist/content.js`；对应英文资产位于 `dist/locales/`。保持标识、坐标、年份与来源关系一致。
- 简繁转换使用 OpenCC。术语需特别处理时，同时检查简体、繁体和英文。
- 边界数据修正通过 `dist/assets/maps/editorial-corrections*.json` 管理，保留来源记录与修改理由。

## 界面与交互

保留键盘操作、窄屏布局与 `prefers-reduced-motion` 支持。涉及地图、时间轴、语言或弹层的改动，运行 `npm test`，并在浏览器中检查相关交互。

## 许可

原创代码贡献采用 GPL-3.0-only。新增第三方数据、代码或字体时，请保留原始许可与署名，并补充 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
