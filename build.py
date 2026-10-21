#!/usr/bin/env python3
"""Сборка статичного лендинга: src/template.html + messages/{ru,kk}.json → dist/.

python3 build.py         — собрать dist/
Падает, если в ru.json и kk.json разный набор ключей.
"""
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

from jinja2 import Environment, FileSystemLoader, StrictUndefined
from markupsafe import Markup

ROOT = Path(__file__).parent
DIST = ROOT / "dist"
BASE_URL = "https://farik9797.github.io/saule/"
LANGS = ("ru", "kk")
LUCIDE = ROOT / "node_modules/lucide-static/icons"
SIMPLE = ROOT / "node_modules/simple-icons/icons"


def load(p):
    return json.loads((ROOT / p).read_text(encoding="utf-8"))


def key_paths(obj, prefix=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from key_paths(v, f"{prefix}.{k}" if prefix else k)
    elif isinstance(obj, list):
        yield f"{prefix}[{len(obj)}]"
        for i, v in enumerate(obj):
            yield from key_paths(v, f"{prefix}[{i}]")
    else:
        yield prefix


def check_keys(msgs):
    ru, kk = set(key_paths(msgs["ru"])), set(key_paths(msgs["kk"]))
    if ru != kk:
        sys.exit("Ключи ru/kk различаются:\n  только ru: %s\n  только kk: %s" % (sorted(ru - kk), sorted(kk - ru)))


def icon(name, cls=""):
    svg = (LUCIDE / f"{name}.svg").read_text()
    svg = re.sub(r"<!--.*?-->\s*", "", svg, flags=re.S)
    head, body = svg.split(">", 1)  # атрибуты чистим только у самого <svg>, не у <rect> внутри
    head = re.sub(r'\s(class|width|height)="[^"]*"', "", head)
    svg = head.replace("<svg", f'<svg class="{cls}" aria-hidden="true" focusable="false"', 1) + ">" + body
    return Markup(re.sub(r"\s*\n\s*", " ", svg).replace("> <", "><"))


def brand_icon(name, cls=""):
    svg = (SIMPLE / f"{name}.svg").read_text()
    svg = re.sub(r"<title>.*?</title>", "", svg)
    svg = svg.replace(' role="img"', "").replace("<svg", f'<svg class="{cls}" fill="currentColor" aria-hidden="true" focusable="false"', 1)
    return Markup(svg)


# Знак логотипа: крест векторизован (potrace) из логотипа в брифе клиента; круг — примитив.
CROSS = re.search(r"<g .*?</g>", (ROOT / "src/img/logo-cross-traced.svg").read_text(), flags=re.S).group(0)
CROSS = re.sub(r'fill="#000000"\s*', "", re.sub(r"\s+", " ", CROSS))


def logo_svg(bg, fg, cls=""):
    return (f'<svg class="{cls}" viewBox="0 0 100 100" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">'
            f'<circle cx="50" cy="50" r="50" fill="{bg}"/>'
            f'<svg x="20" y="20.5" width="60" height="57" viewBox="0 0 980 930" fill="{fg}">{CROSS}</svg></svg>')


def logo_mark(cls="", invert=False):
    return Markup(logo_svg("#FFFFFF", "#0062B0", cls) if invert else logo_svg("#0062B0", "#FFFFFF", cls))


def jsonld(t, b, lang):
    org = {
        "@type": "Organization", "@id": BASE_URL + "#org", "name": "ТОО «Саулефарм»", "alternateName": "СаулеФарм",
        "url": BASE_URL, "logo": BASE_URL + "assets/img/favicon.svg", "foundingDate": "2021-09-24",
        "taxID": "210940037976", "telephone": b["phone"]["tel"], "areaServed": "KZ",
    }
    graph = [org]
    for br in b["items"]:
        if not br["lat"]:
            continue
        graph.append({
            "@type": "Pharmacy", "name": "СаулеФарм", "parentOrganization": {"@id": org["@id"]},
            "telephone": br["phone"], "url": br["url"],
            "address": {"@type": "PostalAddress", "streetAddress": br["street"], "addressLocality": br["city"],
                        "postalCode": br["postal"] or None, "addressCountry": "KZ"},
            "geo": {"@type": "GeoCoordinates", "latitude": br["lat"], "longitude": br["lon"]},
            "openingHoursSpecification": [{"@type": "OpeningHoursSpecification",
                                           "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                                           **h} for h in br["schema_hours"]],
            "aggregateRating": {"@type": "AggregateRating", "ratingValue": br["rating"], "ratingCount": br["ratings"]},
        })
    data = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)
    return Markup(data.replace("</", "<\\/"))


def map_url(b):
    """Виджет 2ГИС «организации на карте» — без API-ключа, метки по id карточек."""
    ids = [br["url"].rsplit("/", 1)[1] for br in b["items"] if br["url"]]
    opts = {"pos": {"lat": 42.305, "lon": 69.64, "zoom": 10}, "opt": {"city": "shymkent"}, "org": ",".join(ids)}
    return "https://widgets.2gis.com/widget?type=firmsonmap&options=" + quote(json.dumps(opts, separators=(",", ":")))


def main():
    msgs = {l: load(f"messages/{l}.json") for l in LANGS}
    check_keys(msgs)
    b = load("content/branches.json")

    # чистим содержимое, а не саму папку — локальный dev-сервер держит dist/ открытой
    DIST.mkdir(exist_ok=True)
    for item in DIST.iterdir():
        shutil.rmtree(item) if item.is_dir() else item.unlink()
    (DIST / "assets").mkdir()
    shutil.copytree(ROOT / "assets/img", DIST / "assets/img")
    shutil.copy(ROOT / "src/main.js", DIST / "assets/main.js")
    (DIST / "assets/img/favicon.svg").write_text(logo_svg("#0062B0", "#FFFFFF"))
    (DIST / ".nojekyll").write_text("")

    subprocess.run(["npx", "@tailwindcss/cli", "-i", "src/styles.css", "-o", "dist/assets/styles.css", "--minify"],
                   cwd=ROOT, check=True, capture_output=True)
    version = hashlib.md5((DIST / "assets/styles.css").read_bytes() + (ROOT / "src/main.js").read_bytes()).hexdigest()[:8]

    env = Environment(loader=FileSystemLoader(ROOT / "src"), autoescape=True, undefined=StrictUndefined,
                      trim_blocks=True, lstrip_blocks=True)
    tpl = env.get_template("template.html")
    nav_keys = ["home", "about", "products", "advantages", "partners", "process", "contacts"]
    nav_ids = {"home": "home", "about": "about", "products": "products", "advantages": "advantages",
               "partners": "partners", "process": "process", "contacts": "contacts"}
    urls = {"ru": BASE_URL, "kk": BASE_URL + "kk/"}

    for lang in LANGS:
        t = msgs[lang]
        nested = lang != "ru"
        html = tpl.render(
            t=t, b=b, lang=lang, a="../" if nested else "", version=version, urls=urls,
            lang_href={"ru": "../" if nested else "./", "kk": "./" if nested else "kk/"},
            nav_keys=nav_keys, nav_ids=nav_ids,
            icon=icon, brand_icon=brand_icon, logo_mark=logo_mark, jsonld=jsonld(t, b, lang),
            map_url=map_url(b), wa_hello=quote(t["form"]["wa_hello"]),
            hero_icons=["pill", "badge-percent", "shield-check", "truck"],
            about_icons=["calendar-days", "map-pin", "heart-handshake"],
            adv_icons=["boxes", "badge-percent", "shield-check", "truck", "user-round-check", "handshake"],
            product_imgs=["cat-drugs", "cat-devices", "cat-other"],
            partner_icons=["sliders-horizontal", "clipboard-list", "timer", "headset"],
            pricing_icons=["tag", "badge-check", "heart-handshake"],
            analytics_icons=["microscope", "chart-line", "hand-heart"],
            promo_icons=["badge-percent", "star", "package-check"],
        )
        out = DIST / ("kk/index.html" if nested else "index.html")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html, encoding="utf-8")
        print(f"  {out.relative_to(ROOT)}  {len(html) // 1024} KB")
    print(f"  dist/assets/styles.css  {(DIST / 'assets/styles.css').stat().st_size // 1024} KB  v={version}")


if __name__ == "__main__":
    main()
