"""gogo.mn сайтаас Мэлхийн ордны өдрийн зурхайг татаж horoscope.json болгож хадгална."""
import html
import json
import re
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

URL = "https://gogo.mn/horoscope/western/today"
SIGN_CLASS = "zodiac-body-melhii"
OUT = "horoscope.json"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    except urllib.error.URLError as err:
        # Зарим компьютер дээр сертификатын сан дутуу байдаг тул шалгалтгүйгээр дахин оролдоно
        if not isinstance(err.reason, ssl.SSLError):
            raise
        ctx = ssl._create_unverified_context()
        return urllib.request.urlopen(req, timeout=30, context=ctx).read().decode("utf-8", "replace")


def parse(page):
    days = []
    for m in re.finditer(r'<div class="' + SIGN_CLASS + r'[^"]*"(.*?)</p>\s*</div>', page, flags=re.S):
        block = m.group(0)
        head = re.search(r"<h4[^>]*>(.*?)</h4>", block, re.S)
        para = re.search(r"<p>(.*?)</p>", block, re.S)
        if not head or not para:
            continue
        head_text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", head.group(1))).strip()
        date_m = re.search(r"(\d{4})/(\d{2})/(\d{2})", head_text)
        if not date_m:
            continue
        text = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", para.group(1)))).strip()
        if not text:
            continue
        days.append({
            "date": "-".join(date_m.groups()),
            "label": head_text.split(" ")[0],
            "text": text,
        })
    return days


def main():
    days = parse(fetch(URL))
    if not days:
        print("Зурхай олдсонгүй, файлыг өөрчлөхгүй", file=sys.stderr)
        sys.exit(1)
    try:
        with open(OUT, encoding="utf-8") as f:
            if json.load(f).get("days") == days:
                print("Зурхай өөрчлөгдөөгүй, файл хэвээр")
                return
    except (OSError, ValueError):
        pass
    data = {
        "sign": "Мэлхий",
        "source": "gogo.mn",
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "days": days,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{len(days)} өдрийн зурхай хадгалагдлаа: {days[0]['date']} .. {days[-1]['date']}")


if __name__ == "__main__":
    main()
