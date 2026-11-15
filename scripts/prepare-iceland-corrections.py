#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Apply an explicitly sourced Iceland-only display correction to map assets.

Requires Python 3.10+ and Shapely >= 2.0. Inputs are never modified.
python prepare-iceland-corrections.py --historical detailed \
  --land raw/ne_10m_land.geojson --plan iceland-correction-plan.json --output .
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path

import shapely
from shapely import normalize, set_precision
from shapely.geometry import MultiPolygon, Point, box, mapping, shape
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

NE_COMMIT = "ca96624a56bd078437bca8184e78163e5039ad19"
NE_SHA = "1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value, pretty=False):
    data = json.dumps(value, ensure_ascii=False, indent=2 if pretty else None,
                      separators=None if pretty else (",", ":")).encode()
    path.write_bytes(data + (b"\n" if pretty else b""))
    return {"file": path.name, "bytes": path.stat().st_size,
            "sha256": sha(path.read_bytes())}


def polygons(g):
    if g.geom_type == "Polygon":
        return [g] if not g.is_empty and g.area else []
    return [p for child in getattr(g, "geoms", []) for p in polygons(child)]


def canonical(g):
    ps = polygons(g)
    if not ps:
        return None
    g = normalize(ps[0] if len(ps) == 1 else MultiPolygon(ps))
    assert g.is_valid
    return (orient(g, sign=1) if g.geom_type == "Polygon" else
            MultiPolygon([orient(p, sign=1) for p in g.geoms]))


def coords(value):
    if isinstance(value, (tuple, list)):
        return [coords(v) for v in value]
    return round(value, 5) if isinstance(value, float) else value


def geometry_json(g):
    return None if g is None else {"type": g.geom_type,
                                  "coordinates": coords(mapping(g)["coordinates"])}


def vertex_count(g):
    if g is None:
        return 0
    def count(v):
        return 1 if len(v) >= 2 and isinstance(v[0], (int, float)) else sum(map(count, v))
    return count(g["coordinates"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--historical", required=True, type=Path)
    ap.add_argument("--land", required=True, type=Path)
    ap.add_argument("--plan", required=True, type=Path)
    ap.add_argument("--output", required=True, type=Path)
    a = ap.parse_args()
    a.output.mkdir(parents=True, exist_ok=True)
    display = a.output / "display"
    display.mkdir(exist_ok=True)
    plan_bytes = a.plan.read_bytes()
    plan = json.loads(plan_bytes)
    region = box(*plan["excisionBbox"])
    land_bytes = a.land.read_bytes()
    assert sha(land_bytes) == NE_SHA, "Unexpected Natural Earth source"
    land = json.loads(land_bytes)
    native = unary_union([shape(f["geometry"]).intersection(region)
                          for f in land["features"]])
    island = canonical(set_precision(native, .00001))
    assert island is not None and island.is_valid and region.contains(island)
    island_json = geometry_json(island)
    island = shape(island_json)
    assert island.is_valid
    upstream_manifest_bytes = (a.historical / "manifest.json").read_bytes()
    upstream = json.loads(upstream_manifest_bytes)
    source_features = {}
    era_payloads = {}
    for era in upstream["eras"]:
        data = (a.historical / era["file"]).read_bytes()
        assert sha(data) == era["sha256"], ("Unexpected upstream file", era["file"])
        era_payloads[era["id"]] = json.loads(data)
        for f in era_payloads[era["id"]]["features"]:
            record = f["properties"]["recordId"]
            assert record not in source_features or source_features[record] == f
            source_features[record] = f
    transformed = {}
    changes = []
    geometry_audits = 0
    for record, original in source_features.items():
        f = copy.deepcopy(original)
        targets = [f] + f.get("geometryVariants", [])
        changed = False
        for target in targets:
            g = shape(target["geometry"])
            if not g.intersects(region) or g.intersection(region).area == 0:
                continue
            changed = True
            remainder = canonical(g.difference(region))
            converted = geometry_json(remainder)
            after = shape(converted) if converted else None
            # Differences elsewhere are forbidden, including in geometry variants.
            expected = g.difference(region)
            error = expected.symmetric_difference(after).area if after else expected.area
            assert error < 1e-9, ("Changed geometry outside Iceland", record, error)
            if after:
                assert after.is_valid and after.intersection(region).area < 1e-9
            target["geometry"] = converted
            geometry_audits += 1
        if changed:
            f["properties"]["displayOverrideIds"] = [plan["overrideId"]]
            changes.append({"recordId": record,
                            "sourceRecords": original["properties"]["sourceRecords"],
                            "name": original["properties"]["original"],
                            "fromYear": original["properties"]["fromYear"],
                            "toYear": original["properties"]["toYear"],
                            "action": "removed" if not any(t["geometry"] for t in targets) else "iceland-excised"})
        nonempty = [t["geometry"] is not None for t in targets]
        # The current source has no mixed null/non-null variant intervals. Refuse
        # future cases until their rendering contract is explicitly supported.
        assert all(nonempty) or not any(nonempty), ("Mixed empty variants", record)
        transformed[record] = f if any(nonempty) else None
    corrections = []
    periods = plan["periods"]
    assert periods[0]["fromYear"] == 930 and periods[-1]["toYear"] == 2024
    for prior, current in zip(periods, periods[1:]):
        assert prior["toYear"] + 1 == current["fromYear"]
    for p in periods:
        assert p["recordId"] not in source_features
        props = {**p, "group": p["id"], "original": p["name"],
                 "sourceId": plan["sourceId"], "sourceRecords": [],
                 "overrideId": plan["overrideId"], "memberOf": "", "components": "", "note": "",
                 "profileId": "iceland-history", "geometryRole": "modern-island-display-mask"}
        corrections.append({"type": "Feature", "properties": props, "geometry": island_json})
    metadata = {
        "overrideId": plan["overrideId"], "verifiedOn": plan["verifiedOn"],
        "sourceId": plan["sourceId"], "excisionBbox": plan["excisionBbox"],
        "islandBounds": list(island.bounds), "annualConvention": plan["annualConvention"],
        "geometryConvention": plan["geometryConvention"], "before930": plan["before930"],
        "geometrySource": {"name": "Natural Earth 1:10m land", "commit": NE_COMMIT,
                           "url": f"https://raw.githubusercontent.com/nvkelso/natural-earth-vector/{NE_COMMIT}/geojson/ne_10m_land.geojson",
                           "sha256": NE_SHA, "license": "Public domain"},
        "planSha256": sha(plan_bytes), "shapelyVersion": shapely.__version__,
        "license": "Natural Earth geometry: public domain; project editorial compilation and script: GPL-3.0-only",
    }
    correction_file = write_json(a.output / "iceland-corrections.geojson",
                                {"type": "FeatureCollection", "metadata": metadata, "features": corrections})
    mask_file = write_json(a.output / "iceland-mask.geojson", {
        "type": "FeatureCollection", "metadata": metadata,
        "features": [{"type": "Feature", "properties": {"id": "iceland-native-land-mask", "role": "island-display-mask"}, "geometry": island_json},
                     {"type": "Feature", "properties": {"id": "iceland-excision-envelope", "role": "processing-only-do-not-render"}, "geometry": geometry_json(region)}]})
    write_json(a.output / "iceland-correction-sources.json", {
        "overrideId": plan["overrideId"], "verifiedOn": plan["verifiedOn"], "sources": plan["sources"]}, True)
    # Deployable bundle: provenance references remain valid when this directory
    # is copied onto the app's existing assets/maps directory.
    for filename in ["iceland-corrections.geojson", "iceland-mask.geojson", "iceland-correction-sources.json"]:
        (display / filename).write_bytes((a.output / filename).read_bytes())
    source_ids = {s["id"] for s in plan["sources"]}
    assert all(set(p["sourceIds"]) <= source_ids for p in periods)
    display_meta = {**upstream["metadata"],
                    "title": "Cliopatria v0.2.1 — European detailed display with sourced Iceland correction",
                    "resolution": "detail-display", "upstreamGeometryEdits": upstream["metadata"]["geometryEdits"],
                    "geometryEdits": upstream["metadata"]["geometryEdits"] + " Iceland-only editorial display correction: upstream shapes are excised inside the isolated Iceland envelope, then replaced by dated Natural Earth island masks; see icelandCorrection.",
                    "icelandCorrection": {**metadata, "correctionsFile": "iceland-corrections.geojson", "correctionsSha256": correction_file["sha256"], "sourceFile": "iceland-correction-sources.json"},
                    "license": "Cliopatria portions: CC BY 4.0; Natural Earth masks: public domain; editorial compilation: GPL-3.0-only"}
    manifest = {"metadata": display_meta, "eras": [],
                "sourceManifest": {"sha256": sha(upstream_manifest_bytes), "role": "uncorrected detailed inputs retained in the preparation workspace", "inputName": "detailed/manifest.json", "deployed": False},
                "upstreamAudit": upstream["audit"]}
    for era in upstream["eras"]:
        source = era_payloads[era["id"]]["features"]
        fs = [transformed[f["properties"]["recordId"]] for f in source
              if transformed[f["properties"]["recordId"]] is not None]
        retained = len(fs)
        added = [f for f in corrections if f["properties"]["fromYear"] <= era["toYear"]
                 and f["properties"]["toYear"] >= era["fromYear"]]
        fs += added
        payload = {"type": "FeatureCollection", "metadata": {**display_meta, "eraYearRange": [era["fromYear"], era["toYear"]]}, "features": fs}
        file_info = write_json(display / era["file"], payload)
        manifest["eras"].append({"id": era["id"], "title": era["title"], "fromYear": era["fromYear"], "toYear": era["toYear"],
                                 **file_info, "featureCount": len(fs), "sourceFeatureCount": len(source), "retainedSourceFeatureCount": retained,
                                 "removedSourceFeatureCount": len(source) - retained, "correctionFeatureCount": len(added),
                                 "sourceSha256": era["sha256"], "sourceBytes": era["bytes"],
                                 "vertexCountIncludingVariants": sum(vertex_count(f["geometry"]) + sum(vertex_count(v["geometry"]) for v in f.get("geometryVariants", [])) for f in fs),
                                 "geometryVariantFeatureCount": sum("geometryVariants" in f for f in fs)})
        print(era["file"], "source", len(source), "display", len(fs), "bytes", file_info["bytes"], flush=True)
    # Deliberately inland test locations: cartographic coastal generalization
    # is not a reason to move a real city's coordinates onto a land polygon.
    reference_points = {"Southwest inland": [-21.5, 64.2], "Westfjords inland": [-23.2, 65.9],
                        "North inland": [-18.1, 65.6], "East inland": [-14.4, 65.3]}
    assert all(island.covers(Point(pt)) for pt in reference_points.values())
    annual = []
    for year in range(-500, 2025):
        if year == 0:
            continue
        active = [p for p in periods if p["fromYear"] <= year <= p["toYear"]]
        assert len(active) == (1 if year >= 930 else 0)
        if year in [929, 930, 1261, 1262, 1263, 1264, 1379, 1380, 1813, 1814, 1917, 1918, 1939, 1940, 1941, 1943, 1944, 1945, 1946, 2024]:
            annual.append({"year": year, "recordId": active[0]["recordId"] if active else None,
                           "name": active[0]["name"] if active else None})
    audit = {"sourceUniqueFeatureCount": len(source_features),
             "retainedSourceUniqueFeatureCount": sum(f is not None for f in transformed.values()),
             "removedSourceUniqueFeatureCount": sum(f is None for f in transformed.values()),
             "correctionUniqueFeatureCount": len(corrections),
             "displayUniqueFeatureCount": sum(f is not None for f in transformed.values()) + len(corrections),
             "modifiedUniqueSourceFeatureCount": len(changes), "changedGeometryVariantsAndDefaultsAudited": geometry_audits,
             "sourceRecordsAndOriginalPropertiesPreserved": True,
             "allChangesConfinedToExcisionEnvelope": True, "allGeometryValid": True,
             "allAnnualOverlaysContinuousAndNonOverlapping": True, "annualYearsChecked": 2524,
             "islandMaskVertexCount": vertex_count(island_json), "islandBounds": list(island.bounds),
             "referencePointsCovered": reference_points, "selectedYearChecks": annual,
             "coastalPointCheck": {"name": "Akureyri reference point", "coordinate": [-18.0878, 65.6839],
                                   "insideNaturalEarthLandMask": island.covers(Point(-18.0878, 65.6839)),
                                   "note": "This coastal point lies just outside the generalized 1:10m land polygon; the coordinate is not moved and no shoreline is invented to force a point-in-polygon pass."},
             "changedSourceFeatures": changes,
             "files": {"corrections": correction_file, "mask": mask_file},
             "unchangedHillshadeBbox": [-20, 28, 55, 74]}
    manifest["audit"] = {k: v for k, v in audit.items() if k not in {"changedSourceFeatures", "referencePointsCovered", "selectedYearChecks", "files"}}
    manifest["correctionProvenance"] = {"affectedSourceRecords": changes,
                                       "periods": periods, "sources": plan["sources"]}
    write_json(display / "manifest.json", manifest, True)
    write_json(a.output / "iceland-display-audit.json", audit, True)
    print(json.dumps({k: v for k, v in audit.items() if k.endswith("Count")}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
