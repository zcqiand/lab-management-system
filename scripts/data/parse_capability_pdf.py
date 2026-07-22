#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
parse_capability_pdf.py  —— 一次性回填工具（不进 gate/build）

从 raw/检测专项及检测能力表.pdf 抽取 检测专项 → 检测项目 → 必备/可选检测参数，
join 到既有 data/master-data/inspection-objects.csv 的 object 码，产出
raw/_capability_rows.json： { objectCode: {"required":[...], "optional":[...]} }。

依赖 pymupdf（本地 backfill 用，非仓库运行时依赖）。用 page.find_tables() 取单元格，
按行合并同一检测项目的（含跨页、含子材料）必备/可选参数。
"""
import json
import os
import re
import sys

import fitz  # pymupdf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PDF = os.path.join(ROOT, "raw", "检测专项及检测能力表.pdf")
OBJECTS_CSV = os.path.join(ROOT, "data", "master-data", "inspection-objects.csv")
OUT = os.path.join(ROOT, "raw", "_capability_rows.json")

OFFICIAL_NO_TO_SP = {"一": "SP01", "二": "SP02", "三": "SP03", "四": "SP04", "五": "SP05",
                     "六": "SP06", "七": "SP07", "八": "SP08", "九": "SP09"}


def norm(s):
    return re.sub(r"\s+", "", s or "")


def split_params(cell):
    """把一格文本拆成参数名列表：先剥离『子材料：』前缀，再按顶层『、』切（括号内不切）。"""
    if not cell:
        return None, []
    text = cell.replace("\n", "").strip()
    sub = None
    # 子材料前缀：形如 "细骨料：..."，冒号前无「、」才认作子材料名
    m = re.match(r"^([^、：]{1,20})：(.*)$", text)
    if m:
        sub = m.group(1).strip()
        text = m.group(2).strip()
    if text in ("", "/"):
        return sub, []
    parts = []
    depth = 0
    cur = ""
    for ch in text:
        if ch in "（(":
            depth += 1
            cur += ch
        elif ch in "）)":
            depth = max(0, depth - 1)
            cur += ch
        elif ch == "、" and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    if cur:
        parts.append(cur)
    out = []
    for p in parts:
        p = p.strip()
        if p and p != "/":
            out.append(p)
    return sub, out


def load_objects():
    rows = []
    with open(OBJECTS_CSV, encoding="utf-8") as f:
        headers = f.readline().rstrip("\n").split(",")
        for line in f:
            line = line.rstrip("\n")
            if not line:
                continue
            cells = line.split(",")
            rows.append(dict(zip(headers, cells)))
    # (spCode, sourceProjectNo) -> [ {code, name} ]
    idx = {}
    for r in rows:
        key = (r["inspectionSpecialtyCode"], r["sourceProjectNo"])
        idx.setdefault(key, []).append({"code": r["code"], "name": r["name"]})
    return idx


def parse_objects():
    """遍历所有页表格 → 逻辑检测项目列表：[{sp, no, name, rows:[(reqCell, optCell)]}]。"""
    doc = fitz.open(PDF)
    current_sp = None
    objects = []
    cur = None
    for pi in range(doc.page_count):
        page = doc[pi]
        tabs = page.find_tables()
        if not tabs.tables:
            continue
        for row in tabs.tables[0].extract():
            col = [(c or "").strip() for c in row]
            while len(col) < 6:
                col.append("")
            sxu, spname, no, name, req, opt = col[0], col[1], col[2], col[3], col[4], col[5]
            # 跳过表头
            if norm(no) == "编号" or norm(name) == "检测项目" or norm(req).startswith("必备检测参数"):
                continue
            if norm(sxu) == "序号":
                continue
            # 专项切换
            if norm(sxu) in OFFICIAL_NO_TO_SP:
                current_sp = OFFICIAL_NO_TO_SP[norm(sxu)]
            if no.strip():  # 新检测项目
                cur = {"sp": current_sp, "no": no.strip(), "name": norm(name), "rows": []}
                objects.append(cur)
                cur["rows"].append((req, opt))
            else:
                if cur is None:
                    continue
                cur["rows"].append((req, opt))
    return objects


def main():
    obj_idx = load_objects()
    parsed = parse_objects()
    result = {}  # objectCode -> {"required": [...], "optional": [...]}
    errors = []

    def ensure(code):
        return result.setdefault(code, {"required": [], "optional": []})

    def add(code, level, names):
        bucket = ensure(code)[level]
        existing = set(bucket)
        # 若同一 object 的 required 已含该名，optional 不再加（required 优先）
        req_set = set(ensure(code)["required"])
        for n in names:
            if level == "optional" and n in req_set:
                continue
            if n not in existing:
                bucket.append(n)
                existing.add(n)

    for o in parsed:
        key = (o["sp"], o["no"])
        cands = obj_idx.get(key)
        if not cands:
            errors.append(f"未匹配 objects.csv: sp={o['sp']} no={o['no']} name={o['name']}")
            continue
        single = len(cands) == 1
        for (reqCell, optCell) in o["rows"]:
            sub_r, req_names = split_params(reqCell)
            sub_o, opt_names = split_params(optCell)
            sub = sub_r or sub_o
            if single:
                code = cands[0]["code"]
            else:
                # 子材料：按子名 contains 匹配候选 object.name
                code = None
                if sub:
                    subn = norm(sub)
                    for c in cands:
                        cn = norm(c["name"])
                        if cn == subn or cn in subn or subn in cn:
                            code = c["code"]
                            break
                if code is None:
                    # 兜底：无「：」标签的子材料（如 照明光源 行仅 "/" + "照明光源初始光效"），
                    # 用候选名在本行文本中的出现来判定
                    blob = norm(reqCell) + norm(optCell)
                    for c in cands:
                        if norm(c["name"]) in blob:
                            code = c["code"]
                            break
                if code is None:
                    errors.append(f"子材料未匹配: sp={o['sp']} no={o['no']} sub={sub} cands={[c['name'] for c in cands]}")
                    continue
            add(code, "required", req_names)
            add(code, "optional", opt_names)

    # 硬校验
    if errors:
        for e in errors:
            print("ERROR:", e, file=sys.stderr)
        print(f"\n共 {len(errors)} 处未匹配，已中止。", file=sys.stderr)
        sys.exit(1)

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    # 概要
    all_names = set()
    total_links = 0
    for code, v in result.items():
        all_names.update(v["required"])
        all_names.update(v["optional"])
        total_links += len(v["required"]) + len(v["optional"])
    print(f"objects covered: {len(result)}")
    print(f"unique param names: {len(all_names)}")
    print(f"total (object,param) links: {total_links}")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
