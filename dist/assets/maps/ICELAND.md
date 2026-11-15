# Iceland display correction

The deployable bundle is `display/`: the same six era filenames and manifest contract as the detailed maps, plus independent `iceland-corrections.geojson`, `iceland-mask.geojson` and `iceland-correction-sources.json`. Copy its contents onto the application's map asset directory. The source `detailed/` files are unchanged and need not be deployed as a second resolution set. Keep their provenance manifest/hash for future regeneration.

`iceland-profiles.json` provides `zh` and `en` polity profile objects, each with 10 source-linked milestones. Append them to the corresponding `content.js` and `locales/en-content.js` `polities` arrays. Their `matchPattern` matches all seven replacement English names. `profileId` is `iceland-history`.

## Annual boundary nodes

| Display years (inclusive) | Display status | Source precision |
| --- | --- | --- |
| Before 930 | No national fill | Settlement is not equated with one state |
| 930–1261 | Icelandic Commonwealth | Foundation conventionally dated 930 |
| 1262–1263 | Old Covenant transition | Submission occurred during 1262–1264 |
| 1264–1379 | Norwegian crown | Submission completed by 1264 |
| 1380–1813 | Danish–Norwegian crown | Shared monarchy from 1380; constitutional arrangements changed within this broad period |
| 1814–1917 | Danish crown | Treaty of Kiel, January 1814 |
| 1918–1943 | Sovereign Kingdom of Iceland | Union Act effective 1 December 1918 |
| 1944–2024 | Republic of Iceland | Republican constitution effective 17 June 1944 |

The annual map uses the status in force at the end of a selected year. Day/month precision is preserved in `fromDate`, `toDate` and the profile text. The transitional 1262–1263 mask is not an invented subdivision of the island. The 1380–1813 label denotes a shared royal system, not a claim of unchanged institutions or an independent Icelandic monarchy.

British occupation from 10 May 1940 and the American defence arrangements of 1941 are historical events in the profile. They do not replace the sovereign kingdom with British or American national colour. Icelandic diplomatic documents and the 1941 agreement explicitly distinguish foreign military presence from Icelandic sovereignty.

## Spatial method and traceability

The existing Cliopatria source rows are retained outside the isolated processing envelope `[-25, 62, -12, 68]`. This envelope contains Iceland and adjacent Icelandic islets in the fixed Natural Earth source, and excludes Greenland, Jan Mayen, the Faroes, Britain and continental Europe. A rectangle is used **only to remove** the upstream Iceland fragments, including coastal slivers left by mismatched source shorelines. It is never drawn as a political border.

The replacement shape is the unaltered Natural Earth 1:10m Iceland land outline after the existing 0.00001° valid precision grid. Its bounds are `[-24.53991, 63.29532, -13.50292, 66.56415]`, with 3,400 vertices. It is explicitly a **modern island display mask**, not reconstructed medieval coastlines, settlement coverage, internal administration or maritime jurisdiction. The presence of modern islets in the reference mask is not a claim that those islets existed in every historical year. Original hillshade remains limited to `[-20,28,55,74]`; no western Iceland relief has been invented.

Natural Earth is a generalized cartographic source. For example, the Akureyri reference point `[-18.0878,65.6839]` falls just outside its land polygon. The city coordinate is not moved to force a point-in-polygon test. Four independent inland points verify replacement coverage without conflating coastal generalization with geocoding accuracy.

Affected source features keep all original properties, `recordId` and `sourceRecords`; only `displayOverrideIds` is added. Remaining mainland geometry is preserved. Four Iceland-only source features become empty and are removed from display, with their full identifiers and source rows retained in the manifest's `correctionProvenance`. Seven correction records use unique negative integer IDs, `sourceId: "iceland-correction"`, `sourceRecords: []`, explicit `sourceIds`, and `overrideId: "iceland-sovereignty-v1"`. They are not represented as rows from Cliopatria.

The manifest reports source, retained, removed, correction and display counts separately, plus SHA-256 for every era file, the original source manifest, the plan and the geometry source. `iceland-display-audit.json` lists all 138 affected source features. `geometryVariants` retain their previous per-year selection contract.

## Reproduction and verification

Requires Python 3.10+ and Shapely 2.x:

```sh
python scripts/prepare-iceland-corrections.py --historical .cache/europa-detail \
  --land .cache/geography-10m/ne_10m_land.geojson \
  --plan dist/assets/maps/iceland-correction-plan.json --output .cache/iceland-display
```

The script verifies the fixed Natural Earth SHA, every upstream era SHA, source-record identity, geometry validity, unchanged geometry outside the envelope and non-overlapping annual replacement coverage for all 2,524 displayed years. It refuses mixed empty/non-empty geometry variants rather than silently changing the rendering contract. The plan and source list contain official parliamentary, government, museum and diplomatic citations; the profiles paraphrase those sources rather than reproducing their text.

## Credits and licences

Cliopatria: Bennett, Mutch, Tollefson et al., *Scientific Data* 12, 247 (2025), DOI `10.1038/s41597-025-04516-9`, fixed commit `5f433377139a6eeaeacbdc894b70f8805b72c8b5`, CC BY 4.0. Modifications are described above and in the detailed-map provenance.

Natural Earth 1:10m land: public domain, fixed repository commit `ca96624a56bd078437bca8184e78163e5039ad19`, original SHA-256 `1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416`.

Preparation script and original editorial compilation: GPL-3.0-only. Cited institutional texts remain with their respective publishers. Finer geographic coordinates do not establish greater historical evidential certainty.

The historical detail input is rebuilt with `scripts/prepare-historical-detail.py` from the original Cliopatria ZIP. Use the six-file source-record index in repository commit `af0607e290148cabcd5e9669b2e869859f0f8fa3` as `--overview`, and an empty `.cache/europa-detail` as `--output`. Do not feed already corrected display files back into that upstream reconstruction. The fixed Natural Earth cache is produced by `scripts/prepare-geography-detail.py`.
