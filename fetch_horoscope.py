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
        date = "-".join(date_m.groups())
        days.append({
            "date": date,
            "label": head_text.split(" ")[0],
            "text": text,
            "advice": star_advice(text, date),
            "ratings": star_ratings(text, date),
            "lucky": lucky(date),
        })
    return days


# Зурхайн сэдвээс хамаарсан "Одод юу гэж байна" зөвлөгөө
THEMES = [
    (("мөнгө", "санхүү", "орлого", "зардал", "үрэх", "худалдан"),
     "өнөөдөр мөнгөө хэмнэж, дэмий зүйлд үрэхгүй байх нь зөв өдөр гэнэ. Гэхдээ нэг гоё кофе авч болно шүү хаха"),
    (("найз", "нөхөд", "хамт олон", "хамтран", "харилцаа", "хүмүүстэй"),
     "найзуудтайгаа холбоотой байвал өдөр чинь гэрэлтэнэ гэнэ. Нэг залгаад хэл хэлэхэд л хангалттай"),
    (("ажил", "хичээл", "сурлага", "төлөвлөгөө", "зорилго", "даалгавар", "үүрэг"),
     "ажил, хичээлдээ төвлөрвөл үр дүн нь хурдан гарна гэнэ. Нэг нэгээр нь хийгээд явахад л болно"),
    (("эрсдэл", "болгоомж", "яарах", "хойшлуул", "бүү", "зайлсхий", "хатуу"),
     "өнөөдөр яарах хэрэггүй, том шийдвэрээ маргааш гаргасан ч болно гэнэ. Тайван, өөрийнхөөрөө яваарай"),
    (("амрах", "амралт", "хөндийр", "түр зогс", "ядар"),
     "өөртөө цаг гаргах өдөр гэнэ. Дуртай дуугаа сонсоод, дуртай зүйлээ идээд амраарай"),
    (("хайр", "хувийн амьдрал", "дотно", "гэр бүл", "ганц бие", "халуун"),
     "дотны хүмүүс чинь чамайг санаж явдаг гэнэ. Нэг мессеж бичихэд л хоёр талдаа дулаахан болно"),
    (("эрч хүч", "энерги", "бүтээлч", "шинэ", "идэвх", "урам"),
     "эрч хүч чинь өндөр өдөр гэнэ. Шинэ зүйл эхлэх, шинэ газар очиход яг таарна"),
    (("мэдлэг", "суралц", "судал", "унших", "мэдээлэл"),
     "шинэ зүйл сурахад хамгийн таатай өдөр гэнэ. Сонирхсон зүйлээ 10 минут ч болов үзээрэй"),
]
GENERIC = [
    "өнөөдөр аз таарна гэнэ. Гэхдээ одод ч мэднэ дээ, чи азаа өөрөө бүтээдэг хүн гэдгийг",
    "өнөөдөр инээмсэглэл чинь хамгийн хүчтэй зэвсэг чинь байх юм байна. Ашиглаарай хха",
    "өнөөдөр Ануужинд сайхан зүйл тохионо гэнэ. Хэзээ, хаана гэдгийг хэлээгүй, анхааралтай байгаарай",
    "өнөөдөр Ануужингийн өдөр гэнэ. Бусад ордныхон жаахан хүлээг",
    "бүх зүйл цагтаа болно гэнэ. Чи зүгээр л өөрийнхөөрөө яваарай",
    "хүсээд байгаа тэр зүйл чинь бодсоноос ойрхон байгаа гэнэ. Өнөөдөр нэг алхам л хий",
    "өнөөдөр Ануужинд муу зүйл тохиох магадлал 0% гэнэ. Аль хэдийн шийдчихсэн юм байна",
]
CLOSINGS = [
    "Одод тэгж хэлэхийг хүсч байна ✦",
    "Одод чамайг дэмжиж байна ✦",
    "Одод хэзээ ч худлаа хэлдэггүй хха",
    "Тэгээд өдөржин инээмсэглээрэй ✦",
]


POSITIVE = ("сайн", "амжилт", "аз ", "таатай", "боломж", "урам", "эрч хүч", "тааламжтай", "гайхалтай", "баяр", "тааламж", "олз")
NEGATIVE = ("бүү", "болгоомж", "эрсдэл", "хэрэггүй", "зайлсхий", "хазай", "саад", "сорилт", "хойшлуул", "маргаан", "сөрөг", "буруу")
COLORS = [("ягаан", "#e86c88"), ("цэнхэр", "#6fa8dc"), ("ногоон", "#7bc48a"), ("шар", "#f0c453"),
          ("улбар шар", "#e9aa78"), ("нил", "#a98bd6"), ("цагаан", "#f4f1ee"), ("улаан", "#d9534f")]


def clamp(value):
    return max(1, min(5, value))


def star_ratings(text, date):
    """Зурхайн үгсээс 1-5 оноотой гурван үнэлгээ гаргана."""
    lowered = text.lower()
    day_number = int(date.replace("-", ""))
    pos = sum(w in lowered for w in POSITIVE)
    neg = sum(w in lowered for w in NEGATIVE)
    base = 3 + (day_number % 2)
    overall = clamp(base + min(pos, 2) - min(neg, 2))
    mood = clamp(base + (1 if any(w in lowered for w in ("тайван", "амар", "сэтгэл", "баяр")) else 0) - (1 if any(w in lowered for w in ("зовоо", "маргаан", "стресс", "уур")) else 0) + ((day_number // 7) % 2) - 1 + 1)
    success = clamp(base + (1 if any(w in lowered for w in ("ажил", "амжилт", "үр дүн", "боломж", "орлого")) else 0) - (1 if any(w in lowered for w in ("хазай", "саад", "хойшлуул", "эрсдэл")) else 0))
    return {"overall": overall, "mood": mood, "success": success}


def lucky(date):
    day_number = int(date.replace("-", ""))
    name, hex_code = COLORS[(day_number * 7) % len(COLORS)]
    return {"number": (day_number * 3) % 9 + 1, "color": name, "hex": hex_code}


def star_advice(text, date):
    """Зурхайн текстэнд таарсан сэдвээр зөвлөгөө үүсгэнэ, таарахгүй бол өдрөөр ээлжилнэ."""
    lowered = text.lower()
    day_number = int(date.replace("-", ""))
    scored = [(sum(k in lowered for k in keywords), advice) for keywords, advice in THEMES]
    best = max(score for score, _ in scored)
    matches = [advice for score, advice in scored if score == best and score > 0]
    body = matches[day_number % len(matches)] if matches else GENERIC[day_number % len(GENERIC)]
    return f"Оддын зөвлөгөө: {body}. {CLOSINGS[day_number % len(CLOSINGS)]}"


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
