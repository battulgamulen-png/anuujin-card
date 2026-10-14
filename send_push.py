"""subscriptions.json дахь утаснууд руу push мэдэгдэл явуулна."""
import json
import os
import sys
from datetime import datetime, timedelta, timezone

from pywebpush import WebPushException, webpush

SUBS_FILE = "subscriptions.json"
VAPID_CLAIMS = {"sub": "mailto:uchrakhbayartemuulen5@gmail.com"}


def morning_horoscope():
    """Өглөөний зурхай: horoscope.json-оос өнөөдрийн эхний өгүүлбэр."""
    today = (datetime.now(timezone.utc) + timedelta(hours=8)).strftime("%Y-%m-%d")
    with open("horoscope.json", encoding="utf-8") as f:
        days = json.load(f)["days"]
    entry = next((d for d in days if d["date"] == today), None) or [d for d in days if d["date"] <= today][-1]
    first = entry["text"].split(". ")[0].rstrip(".") + "."
    return "Өнөөдрийн зурхай чинь бэлэн ✦", first


def dalian_now():
    return datetime.now(timezone.utc) + timedelta(hours=8)


def load_schedule():
    with open("schedule.json", encoding="utf-8") as f:
        return json.load(f)


def to_minutes(hhmm):
    return int(hhmm[:2]) * 60 + int(hhmm[3:])


def lessons_today(data, now):
    """Өнөөдрийн (Далианы) хичээлүүд, тэгш/сондгой долоо хоногийг тооцсон."""
    weekday = now.isoweekday()
    if weekday > 5:
        return [], 0
    start = datetime.strptime(data["semesterStart"], "%Y-%m-%d").date()
    week = (now.date() - start).days // 7 + 1
    in_semester = 1 <= week <= data["semesterWeeks"]
    if not in_semester:
        return [], week
    lessons = [l for l in data["schedule"].get(str(weekday), []) if not l.get("weeks") or (l["weeks"] == "even") == (week % 2 == 0)]
    return sorted(lessons, key=lambda l: l["slot"]), week


def dalian_weather():
    try:
        url = ("https://api.open-meteo.com/v1/forecast?latitude=38.9140&longitude=121.6147"
               "&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Asia%2FShanghai&forecast_days=1")
        d = json.loads(fetch_json(url))
        code = d["daily"]["weather_code"][0]
        desc = "цас" if 71 <= code <= 86 else "бороотой, шүхэр ав ☂" if code >= 51 else "цэлмэг" if code <= 1 else "үүлэрхэг" if code <= 3 else "манантай"
        return f"Далианд {round(d['current']['temperature_2m'])}° ({round(d['daily']['temperature_2m_min'][0])}°…{round(d['daily']['temperature_2m_max'][0])}°), {desc}"
    except Exception:  # цаг агаар авагдахгүй бол тоймд оруулахгүй
        return ""


def fetch_json(url):
    import urllib.request
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=20).read().decode("utf-8")


def auto_message():
    """Хуваарьт ажиллах үед цагаас нь хамаарч өглөөний тойм эсвэл хичээлийн сануулга гаргана."""
    data = load_schedule()
    now = dalian_now()
    minutes = now.hour * 60 + now.minute
    lessons, week = lessons_today(data, now)
    if 7 * 60 + 15 <= minutes < 7 * 60 + 45:  # Өглөөний тойм (07:30-д ажиллана)
        if not lessons:
            return None
        first = data["slots"][lessons[0]["slot"]][0]
        _, horoscope = morning_horoscope()
        weather = dalian_weather()
        parts = [f"Өнөөдөр {len(lessons)} хичээл, эхнийх {first}"]
        if weather:
            parts.append(weather)
        parts.append(f"Зурхай: {horoscope}")
        return "Өглөөний мэнд, Ануужин ✦", " · ".join(parts)
    for lesson in lessons:  # Хичээлийн сануулга: 5–25 минутын өмнө
        start = to_minutes(data["slots"][lesson["slot"]][0])
        if 5 <= start - minutes <= 25:
            course = data["courses"][lesson["course"]]
            room = lesson.get("room") or data["defaultRoom"]
            return f"{start - minutes} минутын дараа хичээл ✎", f"{course['zh']} · {course['mn']} · {data['slots'][lesson['slot']][0]}-д эхэлнэ · {room.split(' · ')[-1]}"
    return None


def main():
    title = os.environ.get("PUSH_TITLE") or "Ануужин ✦"
    body = os.environ.get("PUSH_BODY") or ""
    url = os.environ.get("PUSH_URL") or "./"
    if os.environ.get("PUSH_MODE") == "auto":
        message = auto_message()
        if not message:
            print("Энэ цагт явуулах мэдэгдэл алга")
            return
        title, body = message
    elif not body:
        title, body = morning_horoscope()
    with open("vapid_private.pem", "w", encoding="utf-8") as f:
        f.write(os.environ["VAPID_PRIVATE_KEY"])
    with open(SUBS_FILE, encoding="utf-8") as f:
        subs = json.load(f)
    if not subs:
        print("Бүртгэлтэй утас алга")
        return
    payload = json.dumps({"title": title, "body": body, "url": url}, ensure_ascii=False)
    alive = []
    for sub in subs:
        try:
            webpush(subscription_info=sub, data=payload, vapid_private_key="vapid_private.pem", vapid_claims=dict(VAPID_CLAIMS), ttl=43200)
            print("илгээлээ:", sub["endpoint"][:60])
            alive.append(sub)
        except WebPushException as err:
            status = getattr(err.response, "status_code", None)
            print("алдаа:", status, str(err)[:120], file=sys.stderr)
            if status not in (404, 410):
                alive.append(sub)
    if len(alive) != len(subs):
        with open(SUBS_FILE, "w", encoding="utf-8") as f:
            json.dump(alive, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print("хүчингүй бүртгэлийг хасав")


if __name__ == "__main__":
    main()
