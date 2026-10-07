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


def main():
    title = os.environ.get("PUSH_TITLE") or "Ануужин ✦"
    body = os.environ.get("PUSH_BODY") or ""
    url = os.environ.get("PUSH_URL") or "./"
    if not body:
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
