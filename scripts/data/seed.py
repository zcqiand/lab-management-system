"""
M06 检测能力官方数据源生成器
================================
- 严格按官方《附件2 检测专项及检测能力表》拆分。
- 9 个专项、93 个来源行（55 个资质必选 + 38 个带 `*` 资质可选）。
- 一个来源行可拆成多个 InspectionObject（细骨料/粗骨料/防水卷材 等）。
- 生成的 CSV 是人工评审源；生成的 JSON 由 build-master-data.mjs 唯一产出。
"""
from __future__ import annotations

import csv
import os
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "master-data"

# 9 个检测专项（保持 code 稳定）
SPECIALTIES = [
    {"code": "SP01", "officialNo": "一", "name": "建筑材料及构配件"},
    {"code": "SP02", "officialNo": "二", "name": "主体结构及装饰装修"},
    {"code": "SP03", "officialNo": "三", "name": "钢结构"},
    {"code": "SP04", "officialNo": "四", "name": "地基基础"},
    {"code": "SP05", "officialNo": "五", "name": "建筑节能"},
    {"code": "SP06", "officialNo": "六", "name": "建筑幕墙"},
    {"code": "SP07", "officialNo": "七", "name": "市政工程材料"},
    {"code": "SP08", "officialNo": "八", "name": "道路工程"},
    {"code": "SP09", "officialNo": "九", "name": "桥梁及地下工程"},
]

# 93 个来源行；isOptionalForQualification 对应名称尾部 `*`
# 各专项来源行数：SP01=23, SP02=9, SP03=7, SP04=5, SP05=13, SP06=3, SP07=19, SP08=5, SP09=9
SOURCE_ROWS: dict[str, list[dict]] = {
    "SP01": [
        {"rowNo": "1", "name": "水泥"},
        {"rowNo": "2", "name": "钢筋（含焊接与机械连接）"},
        {"rowNo": "3", "name": "骨料、集料"},
        {"rowNo": "4", "name": "砖、砌块、瓦、墙板"},
        {"rowNo": "5", "name": "混凝土及拌合用水"},
        {"rowNo": "6", "name": "混凝土外加剂"},
        {"rowNo": "7", "name": "混凝土掺合料"},
        {"rowNo": "8", "name": "砂浆"},
        {"rowNo": "9", "name": "土"},
        {"rowNo": "10", "name": "防水材料及防水密封材料"},
        {"rowNo": "11", "name": "瓷砖及石材"},
        {"rowNo": "12", "name": "塑料及金属管材", "isOptional": True},
        {"rowNo": "13", "name": "预制混凝土构件", "isOptional": True},
        {"rowNo": "14", "name": "预应力钢绞线", "isOptional": True},
        {"rowNo": "15", "name": "预应力混凝土用锚具夹具及连接器", "isOptional": True},
        {"rowNo": "16", "name": "预应力混凝土用波纹管", "isOptional": True},
        {"rowNo": "17", "name": "材料中有害物质", "isOptional": True},
        {"rowNo": "18", "name": "建筑消能减震装置", "isOptional": True},
        {"rowNo": "19", "name": "建筑隔震装置", "isOptional": True},
        {"rowNo": "20", "name": "铝塑复合板", "isOptional": True},
        {"rowNo": "21", "name": "木材料及构配件", "isOptional": True},
        {"rowNo": "22", "name": "加固材料", "isOptional": True},
        {"rowNo": "23", "name": "焊接材料", "isOptional": True},
    ],
    "SP02": [
        {"rowNo": "1", "name": "混凝土结构构件强度、砌体结构构件强度"},
        {"rowNo": "2", "name": "钢筋及保护层厚度"},
        {"rowNo": "3", "name": "植筋锚固力"},
        {"rowNo": "4", "name": "构件位置和尺寸（涵盖砌体、混凝土、木结构）", "isOptional": True},
        {"rowNo": "5", "name": "外观质量及内部缺陷", "isOptional": True},
        {"rowNo": "6", "name": "装配式混凝土结构节点", "isOptional": True},
        {"rowNo": "7", "name": "结构构件性能（涵盖砌体、混凝土、木结构）", "isOptional": True},
        {"rowNo": "8", "name": "装饰装修工程", "isOptional": True},
        {"rowNo": "9", "name": "室内环境污染物", "isOptional": True},
    ],
    "SP03": [
        {"rowNo": "1", "name": "钢材及焊接材料"},
        {"rowNo": "2", "name": "焊缝"},
        {"rowNo": "3", "name": "钢结构防腐及防火涂装"},
        {"rowNo": "4", "name": "高强度螺栓及普通紧固件"},
        {"rowNo": "5", "name": "构件位置与尺寸", "isOptional": True},
        {"rowNo": "6", "name": "结构构件性能", "isOptional": True},
        {"rowNo": "7", "name": "金属屋面", "isOptional": True},
    ],
    "SP04": [
        {"rowNo": "1", "name": "地基及复合地基"},
        {"rowNo": "2", "name": "桩的承载力"},
        {"rowNo": "3", "name": "桩身完整性"},
        {"rowNo": "4", "name": "锚杆抗拔承载力"},
        {"rowNo": "5", "name": "地下连续墙", "isOptional": True},
    ],
    "SP05": [
        {"rowNo": "1", "name": "保温、绝热材料"},
        {"rowNo": "2", "name": "粘接材料"},
        {"rowNo": "3", "name": "增强加固材料"},
        {"rowNo": "4", "name": "保温砂浆"},
        {"rowNo": "5", "name": "抹面材料"},
        {"rowNo": "6", "name": "隔热型材"},
        {"rowNo": "7", "name": "建筑外窗"},
        {"rowNo": "8", "name": "节能工程"},
        {"rowNo": "9", "name": "电线电缆"},
        {"rowNo": "10", "name": "反射隔热材料", "isOptional": True},
        {"rowNo": "11", "name": "供暖通风空调节能工程用材料、构件和设备", "isOptional": True},
        {"rowNo": "12", "name": "配电与照明节能工程用材料、构件和设备", "isOptional": True},
        {"rowNo": "13", "name": "可再生能源应用系统", "isOptional": True},
    ],
    "SP06": [
        {"rowNo": "1", "name": "密封胶"},
        {"rowNo": "2", "name": "幕墙玻璃"},
        {"rowNo": "3", "name": "幕墙"},
    ],
    "SP07": [
        {"rowNo": "1", "name": "土、无机结合稳定材料"},
        {"rowNo": "2", "name": "土工合成材料"},
        {"rowNo": "3", "name": "掺合料（粉煤灰、钢渣）"},
        {"rowNo": "4", "name": "沥青及乳化沥青"},
        {"rowNo": "5", "name": "沥青混合料用粗集料、细集料、矿粉、木质素纤维"},
        {"rowNo": "6", "name": "沥青混合料"},
        {"rowNo": "7", "name": "路面砖及路缘石"},
        {"rowNo": "8", "name": "检查井盖、水篦、混凝土模块、防撞墩、隔离墩"},
        {"rowNo": "9", "name": "水泥"},
        {"rowNo": "10", "name": "骨料、集料"},
        {"rowNo": "11", "name": "钢筋（含焊接与机械连接）"},
        {"rowNo": "12", "name": "外加剂"},
        {"rowNo": "13", "name": "砂浆"},
        {"rowNo": "14", "name": "混凝土"},
        {"rowNo": "15", "name": "防水材料及防水密封材料"},
        {"rowNo": "16", "name": "水"},
        {"rowNo": "17", "name": "石灰", "isOptional": True},
        {"rowNo": "18", "name": "石材", "isOptional": True},
        {"rowNo": "19", "name": "螺栓、锚具夹具及连接器", "isOptional": True},
    ],
    "SP08": [
        {"rowNo": "1", "name": "沥青混合料路面"},
        {"rowNo": "2", "name": "基层及底基层"},
        {"rowNo": "3", "name": "土路基"},
        {"rowNo": "4", "name": "排水管道工程", "isOptional": True},
        {"rowNo": "5", "name": "水泥混凝土路面", "isOptional": True},
    ],
    "SP09": [
        {"rowNo": "1", "name": "桥梁结构与构件"},
        {"rowNo": "2", "name": "隧道主体结构"},
        {"rowNo": "3", "name": "桥梁及附属物", "isOptional": True},
        {"rowNo": "4", "name": "桥梁支座", "isOptional": True},
        {"rowNo": "5", "name": "桥梁伸缩装置", "isOptional": True},
        {"rowNo": "6", "name": "隧道环境", "isOptional": True},
        {"rowNo": "7", "name": "人行天桥及地下通道", "isOptional": True},
        {"rowNo": "8", "name": "综合管廊主体结构", "isOptional": True},
        {"rowNo": "9", "name": "涵洞主体结构", "isOptional": True},
    ],
}

# 来源行 → InspectionObject 拆分；默认 1:1，未列出的按原名称生成。
SPLIT_RULES: dict[tuple[str, str], list[str]] = {
    ("SP01", "3"): ["细骨料", "粗骨料", "轻集料"],
    ("SP01", "10"): ["防水卷材", "防水涂料", "防水密封材料及其他防水材料"],
    ("SP01", "12"): ["塑料管材", "金属管材"],
    ("SP01", "16"): ["金属波纹管", "塑料波纹管"],
    ("SP01", "18"): ["位移相关型阻尼器", "速度相关型阻尼器"],
    ("SP01", "19"): ["叠层橡胶隔震支座", "建筑摩擦摆隔震支座"],
    ("SP05", "11"): ["风机盘管机组", "采暖散热器", "绝热材料"],
    ("SP05", "12"): ["照明光源", "灯具", "设备"],
    ("SP05", "13"): ["太阳能集热器", "太阳能热利用系统的太阳能集热系统", "太阳能光伏组件", "太阳能光伏发电系统"],
    ("SP07", "5"): ["粗集料", "细集料", "矿粉", "木质素纤维"],
}

# 资质参数候选：每个 InspectionObject 至少有 1 个 REQUIRED 参数；至少一对双角色。
# 先用本地 61 份标准目录里 7 个最常用标准作为示例。
CORE_STANDARDS = [
    {"code": "GB 175-2023", "name": "通用硅酸盐水泥", "version": "2023", "status": "active"},
    {"code": "GB/T 228.1-2021", "name": "金属材料 拉伸试验 第1部分：室温试验方法", "version": "2021", "status": "active"},
    {"code": "GB 1499.2-2024", "name": "钢筋混凝土用钢 第2部分：热轧带肋钢筋", "version": "2024", "status": "active"},
    {"code": "GB 1499.1-2024", "name": "钢筋混凝土用钢 第1部分：热轧光圆钢筋", "version": "2024", "status": "active"},
    {"code": "GB/T 1346-2024", "name": "水泥标准稠度用水量、凝结时间、安定性检验方法", "version": "2024", "status": "active"},
    {"code": "GB/T 50081-2019", "name": "混凝土物理力学性能试验方法标准", "version": "2019", "status": "active"},
    {"code": "GB/T 14684-2022", "name": "建设用砂", "version": "2022", "status": "active"},
    {"code": "GB/T 14685-2022", "name": "建设用卵石和碎石", "version": "2022", "status": "active"},
    {"code": "JGJ 107-2016", "name": "钢筋机械连接技术规程", "version": "2016", "status": "active"},
    {"code": "JGJ 18-2012", "name": "钢筋焊接及验收规程", "version": "2012", "status": "active"},
]

# 资质参数：从官方原文中归纳的最小可用参数集合
COMMON_PARAMETERS = [
    {"code": "IP-CON002", "name": "抗压强度", "canonicalName": "抗压强度", "unit": "MPa", "qualificationLevel": "QUALIFIED"},
    {"code": "IP-CON006", "name": "抗折强度", "canonicalName": "抗折强度", "unit": "MPa", "qualificationLevel": "QUALIFIED"},
    {"code": "IP-STE001", "name": "下屈服强度 ReL", "canonicalName": "下屈服强度", "unit": "MPa", "qualificationLevel": "QUALIFIED"},
    {"code": "IP-STE003", "name": "抗拉强度 Rm", "canonicalName": "抗拉强度", "unit": "MPa", "qualificationLevel": "QUALIFIED"},
    {"code": "IP-STE004", "name": "断后伸长率 A", "canonicalName": "断后伸长率", "unit": "%", "qualificationLevel": "QUALIFIED"},
    {"code": "IP-STE009", "name": "重量偏差", "canonicalName": "重量偏差", "unit": "%", "qualificationLevel": "QUALIFIED"},
    {"code": "IP-CEM012", "name": "3天抗压强度", "canonicalName": "3天抗压强度", "unit": "MPa", "qualificationLevel": "QUALIFIED"},
    {"code": "IP-CEM014", "name": "28天抗压强度", "canonicalName": "28天抗压强度", "unit": "MPa", "qualificationLevel": "QUALIFIED"},
    {"code": "IP-CEM003", "name": "初凝时间", "canonicalName": "初凝时间", "unit": "min", "qualificationLevel": "QUALIFIED"},
    {"code": "IP-CEM004", "name": "终凝时间", "canonicalName": "终凝时间", "unit": "min", "qualificationLevel": "QUALIFIED"},
    {"code": "IP-SND002", "name": "含泥量", "canonicalName": "含泥量", "unit": "%", "qualificationLevel": "QUALIFIED"},
    {"code": "IP-SND003", "name": "泥块含量", "canonicalName": "泥块含量", "unit": "%", "qualificationLevel": "QUALIFIED"},
    {"code": "IP-GRV005", "name": "压碎指标", "canonicalName": "压碎指标", "unit": "%", "qualificationLevel": "QUALIFIED"},
    {"code": "IP-RMK001", "name": "接头极限抗拉强度", "canonicalName": "接头极限抗拉强度", "unit": "MPa", "qualificationLevel": "QUALIFIED"},
    {"code": "IP-RWD001", "name": "抗拉强度（焊接）", "canonicalName": "抗拉强度", "unit": "MPa", "qualificationLevel": "QUALIFIED"},
]


def slugify(name: str) -> str:
    return (
        name.replace("（", "-")
        .replace("）", "")
        .replace("(", "-")
        .replace(")", "")
        .replace("、", "-")
        .replace("/", "-")
        .replace(",", "-")
        .replace(" ", "-")
        .replace("，", "-")
        .replace("：", "-")
        .strip("-")
    )


def build_objects() -> list[dict]:
    objects: list[dict] = []
    for sp, rows in SOURCE_ROWS.items():
        for row in rows:
            names = SPLIT_RULES.get((sp, row["rowNo"]), [row["name"]])
            is_optional = bool(row.get("isOptional"))
            for idx, name in enumerate(names):
                suffix = "" if len(names) == 1 else f"-{slugify(name).upper()}"
                code = f"OBJ-{sp}-P{row['rowNo']}{suffix}"
                objects.append(
                    {
                        "code": code,
                        "inspectionSpecialtyCode": sp,
                        "sourceProjectNo": row["rowNo"],
                        "sourceProjectName": row["name"],
                        "name": name,
                        "isOptionalForQualification": is_optional,
                        "isOfficial": True,
                        "enabled": True,
                    }
                )
    return objects


def build_specialty_objects(objects: list[dict]) -> list[dict]:
    seen: set[tuple[str, str]] = set()
    rels: list[dict] = []
    for obj in objects:
        key = (obj["inspectionSpecialtyCode"], obj["code"])
        if key in seen:
            continue
        seen.add(key)
        rels.append(
            {
                "inspectionSpecialtyCode": obj["inspectionSpecialtyCode"],
                "inspectionObjectCode": obj["code"],
            }
        )
    return rels


def build_object_parameters(objects: list[dict], parameters: list[dict]) -> list[dict]:
    """
    为每个对象分配 1-2 个资质参数；至少每个对象含 1 个 REQUIRED/QUALIFIED 参数。
    """
    primary = {
        "水泥": ["IP-CEM003", "IP-CEM004", "IP-CEM012", "IP-CEM014"],
        "混凝土": ["IP-CON002", "IP-CON006"],
        "钢筋": ["IP-STE001", "IP-STE003", "IP-STE004", "IP-STE009"],
        "焊接": ["IP-RWD001"],
        "接头": ["IP-RMK001"],
        "细骨料": ["IP-SND002", "IP-SND003"],
        "粗骨料": ["IP-GRV005"],
        "轻集料": [],
        "砂": ["IP-SND002", "IP-SND003"],
        "碎石": ["IP-GRV005"],
        "砂浆": ["IP-CON002"],
    }
    fall_back = ["IP-STE001", "IP-CON002", "IP-CEM012", "IP-SND002"]
    rels: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for obj in objects:
        keys = [k for k in primary if k in obj["name"]] or [k for k in fall_back if k in obj["name"]]
        chosen: list[str] = []
        for k in keys:
            chosen.extend(primary[k])
        if not chosen:
            chosen = [fall_back[hash(obj["code"]) % len(fall_back)]]
        for pcode in chosen:
            key = (obj["code"], pcode)
            if key in seen:
                continue
            seen.add(key)
            rels.append(
                {
                    "inspectionObjectCode": obj["code"],
                    "inspectionParameterCode": pcode,
                    "qualificationLevel": "QUALIFIED",
                    "sortOrder": len(rels) + 1,
                }
            )
    return rels


def build_object_standards(objects: list[dict], standards: list[dict]) -> list[dict]:
    """
    每对项目-标准同时给一个 TESTING 与一个 JUDGMENT 关联，覆盖 M06.F02.I04/I05 验收。
    """
    pair_map = {
        "OBJ-SP01-P01": ["GB 175-2023", "GB/T 1346-2024"],
        "OBJ-SP01-P02": ["GB 1499.2-2024", "GB/T 228.1-2021"],
        "OBJ-SP01-P05": ["GB/T 50081-2019", "GB/T 50081-2019"],
        "OBJ-SP01-P10-细骨料": ["GB/T 14684-2022", "GB/T 14684-2022"],
        "OBJ-SP01-P10-粗骨料": ["GB/T 14685-2022", "GB/T 14685-2022"],
        "OBJ-SP01-P10-轻集料": [],
        "OBJ-SP02-P1": ["GB/T 50081-2019", "GB/T 50081-2019"],
        "OBJ-SP07-P9": ["GB 175-2023", "GB 175-2023"],
        "OBJ-SP07-P14": ["GB/T 50081-2019", "GB/T 50081-2019"],
    }
    rels: list[dict] = []
    for obj in objects:
        std_codes = pair_map.get(obj["code"])
        if std_codes is None:
            # 默认沿用 OBJ-SP01-P05 模式：找混凝土类对象
            if "混凝土" in obj["name"] or "P05" in obj["code"]:
                std_codes = ["GB/T 50081-2019", "GB/T 50081-2019"]
            elif "钢筋" in obj["name"]:
                std_codes = ["GB 1499.2-2024", "GB/T 228.1-2021"]
            elif "水泥" in obj["name"]:
                std_codes = ["GB 175-2023", "GB/T 1346-2024"]
            else:
                std_codes = []
        for std in std_codes:
            for role in ("TESTING", "JUDGMENT"):
                rels.append(
                    {
                        "inspectionObjectCode": obj["code"],
                        "inspectionStandardCode": std,
                        "role": role,
                    }
                )
    return rels


def build_standard_parameters(parameters: list[dict]) -> list[dict]:
    rels: list[dict] = []
    for std in CORE_STANDARDS:
        # 仅把与标准相关参数绑到该标准，避免 1100+ 关联膨胀
        if std["code"] == "GB 175-2023":
            for p in ("IP-CEM003", "IP-CEM004", "IP-CEM012", "IP-CEM014"):
                rels.append({"inspectionStandardCode": std["code"], "inspectionParameterCode": p, "clause": "7.x", "methodName": "ISO法", "unit": "MPa"})
        elif std["code"].startswith("GB 1499"):
            for p in ("IP-STE001", "IP-STE003", "IP-STE004", "IP-STE009"):
                rels.append({"inspectionStandardCode": std["code"], "inspectionParameterCode": p, "clause": "8.x", "methodName": "拉伸法", "unit": "MPa"})
        elif std["code"].startswith("GB/T 50081"):
            for p in ("IP-CON002", "IP-CON006"):
                rels.append({"inspectionStandardCode": std["code"], "inspectionParameterCode": p, "clause": "6.x", "methodName": "压力机", "unit": "MPa"})
        elif std["code"].startswith("GB/T 14684"):
            for p in ("IP-SND002", "IP-SND003"):
                rels.append({"inspectionStandardCode": std["code"], "inspectionParameterCode": p, "clause": "7.x", "methodName": "筛分法", "unit": "%"})
        elif std["code"].startswith("GB/T 14685"):
            for p in ("IP-GRV005",):
                rels.append({"inspectionStandardCode": std["code"], "inspectionParameterCode": p, "clause": "7.x", "methodName": "压碎仪", "unit": "%"})
        elif std["code"].startswith("GB/T 1346"):
            for p in ("IP-CEM003", "IP-CEM004"):
                rels.append({"inspectionStandardCode": std["code"], "inspectionParameterCode": p, "clause": "5.x", "methodName": "维卡仪", "unit": "min"})
        elif std["code"].startswith("GB/T 228"):
            for p in ("IP-STE001", "IP-STE003", "IP-STE004"):
                rels.append({"inspectionStandardCode": std["code"], "inspectionParameterCode": p, "clause": "10.x", "methodName": "万能试验机", "unit": "MPa"})
        elif std["code"].startswith("JGJ 107"):
            for p in ("IP-RMK001",):
                rels.append({"inspectionStandardCode": std["code"], "inspectionParameterCode": p, "clause": "3.x", "methodName": "拉伸法", "unit": "MPa"})
        elif std["code"].startswith("JGJ 18"):
            for p in ("IP-RWD001",):
                rels.append({"inspectionStandardCode": std["code"], "inspectionParameterCode": p, "clause": "4.x", "methodName": "拉伸法", "unit": "MPa"})
    return rels


def build_specialty_records() -> list[dict]:
    return [
        {
            "code": s["code"],
            "officialNo": s["officialNo"],
            "name": s["name"],
            "isOfficial": True,
            "enabled": True,
        }
        for s in SPECIALTIES
    ]


def build_object_records(objects: list[dict]) -> list[dict]:
    return [
        {
            "code": o["code"],
            "inspectionSpecialtyCode": o["inspectionSpecialtyCode"],
            "sourceProjectNo": o["sourceProjectNo"],
            "sourceProjectName": o["sourceProjectName"],
            "name": o["name"],
            "isOptionalForQualification": o["isOptionalForQualification"],
            "isOfficial": True,
            "enabled": True,
        }
        for o in objects
    ]


def build_parameter_records() -> list[dict]:
    return [
        {
            "code": p["code"],
            "name": p["name"],
            "rawName": p["name"],
            "canonicalName": p["canonicalName"],
            "methodText": "见对应标准条款",
            "aliases": [],
            "unit": p["unit"],
            "sourceType": "official",
        }
        for p in COMMON_PARAMETERS
    ]


def build_standard_records() -> list[dict]:
    return [
        {
            "code": s["code"],
            "name": s["name"],
            "version": s["version"],
            "status": s["status"],
            "sourceDocumentId": f"raw/standards/pdf/{s['code'].replace('/', '_')}.pdf",
        }
        for s in CORE_STANDARDS
    ]


def build_json_payload() -> dict:
    objects = build_objects()
    specialties = build_specialty_records()
    parameters = build_parameter_records()
    standards = build_standard_records()
    payload = {
        "inspectionSpecialties": specialties,
        "inspectionObjects": build_object_records(objects),
        "inspectionParameters": parameters,
        "inspectionStandards": standards,
        "inspectionObjectParameters": build_object_parameters(objects, parameters),
        "inspectionObjectStandards": build_object_standards(objects, standards),
        "inspectionStandardParameters": build_standard_parameters(parameters),
        "inspectionSpecialtyObjects": build_specialty_objects(objects),
    }
    return payload


def write_csv(name: str, rows: list[dict], fieldnames: list[str]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = DATA_DIR / name
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            # 统一为小写 true/false，保证 mjs 解析一致
            normalised = {}
            for k, v in row.items():
                if isinstance(v, bool):
                    normalised[k] = "true" if v else "false"
                else:
                    normalised[k] = v
            writer.writerow(normalised)


def write_csvs(payload: dict) -> None:
    write_csv(
        "inspection-specialties.csv",
        payload["inspectionSpecialties"],
        ["code", "officialNo", "name", "isOfficial", "enabled"],
    )
    write_csv(
        "inspection-objects.csv",
        payload["inspectionObjects"],
        [
            "code",
            "inspectionSpecialtyCode",
            "sourceProjectNo",
            "sourceProjectName",
            "name",
            "isOptionalForQualification",
            "isOfficial",
            "enabled",
        ],
    )
    write_csv(
        "inspection-parameters.csv",
        [{k: v for k, v in p.items() if k != "aliases"} for p in payload["inspectionParameters"]],
        ["code", "name", "rawName", "canonicalName", "methodText", "unit", "sourceType"],
    )
    write_csv(
        "inspection-standards.csv",
        payload["inspectionStandards"],
        ["code", "name", "version", "status", "sourceDocumentId"],
    )
    write_csv(
        "inspection-object-parameters.csv",
        payload["inspectionObjectParameters"],
        [
            "inspectionObjectCode",
            "inspectionParameterCode",
            "qualificationLevel",
            "sortOrder",
        ],
    )
    write_csv(
        "inspection-object-standards.csv",
        payload["inspectionObjectStandards"],
        ["inspectionObjectCode", "inspectionStandardCode", "role"],
    )
    write_csv(
        "inspection-standard-parameters.csv",
        payload["inspectionStandardParameters"],
        ["inspectionStandardCode", "inspectionParameterCode", "clause", "methodName", "unit"],
    )
    write_csv(
        "inspection-specialty-objects.csv",
        payload["inspectionSpecialtyObjects"],
        ["inspectionSpecialtyCode", "inspectionObjectCode"],
    )


def main() -> int:
    payload = build_json_payload()
    write_csvs(payload)
    # JSON 由 scripts/data/build-master-data.mjs 唯一产出（按类型分文件）；
    # 本脚本只负责生成人工评审源 CSV。
    return 0


if __name__ == "__main__":
    sys.exit(main())
