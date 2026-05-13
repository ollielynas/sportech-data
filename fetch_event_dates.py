import json

import requests

with open("event_links.txt", "r") as f:
    links = [line.strip() for line in f if line.strip()]

event_dates = {}

for link in links:
    # URL format: https://sporttech.io/events/{UUID}/ovs/
    uuid = link.rstrip("/").split("/")[-2]
    api_url = link + "api/event/"

    print(f"Fetching {uuid} ...", end=" ", flush=True)
    try:
        resp = requests.get(api_url, timeout=15)
        if resp.status_code == 200:
            ev = resp.json().get("Event", {})
            event_dates[uuid] = {
                "Title": ev.get("Title", ""),
                "StartDate": ev.get("StartDate", ""),
                "EndDate": ev.get("EndDate", ""),
            }
            print(ev.get("StartDate", "no date")[:10])
        else:
            print(f"HTTP {resp.status_code}")
    except Exception as e:
        print(f"ERROR: {e}")

with open("event_dates.json", "w") as f:
    json.dump(event_dates, f, indent=2)

print(f"\nDone — saved {len(event_dates)} events to event_dates.json")
