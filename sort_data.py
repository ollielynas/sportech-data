import gzip
import json

import pandas as pd

# Load event dates fetched by fetch_event_dates.py
try:
    with open("event_dates.json", "r") as _f:
        event_dates = json.load(_f)
except FileNotFoundError:
    print("Warning: event_dates.json not found — run fetch_event_dates.py first")
    event_dates = {}

path = "mega_data.csv"
data = pd.read_csv(path, low_memory=False)
data.columns = data.columns.str.strip()
data = data.rename(
    columns={
        "Event UUID": "Event_UUID",
        "Mark Total": "Mark_Total",
        "∑": "SUM",
        "Given PanelName": "GivenName",
        "Given_PanelName": "GivenName",
        "Surname": "FamilyName",
    }
)

json_data = {}
i = 0
for row in data.itertuples(index=False):
    given_name = str(row.GivenName).strip()
    surname = str(row.FamilyName).strip()
    name = (given_name + " " + surname).strip().lower()
    event_key = row.Title + f" ({hash(row.Event_UUID) % 1000})"
    routine_key = f"{row.Competition} {row.Stage} {row.Mark}"
    if name not in json_data.keys():
        print(f"Processing {name}")
        json_data[name] = {
            "GivenName": given_name,
            "FamilyName": surname,
            "Clubs": [row.Representing],
            "Events": {},
        }
    if row.Representing not in json_data[name]["Clubs"]:
        json_data[name]["Clubs"].append(row.Representing)
    person_data = json_data[name]
    events_data = person_data["Events"]

    if event_key not in events_data:
        ev_meta = event_dates.get(row.Event_UUID, {})
        events_data[event_key] = {
            "Title": row.Title,
            "Event_UUID": row.Event_UUID,
            "StartDate": ev_meta.get("StartDate", ""),
            "EndDate": ev_meta.get("EndDate", ""),
            "TRA_routines": {},
            "DMT_routines": {},
        }

    target_event = events_data[event_key]
    if row.Discipline == "TRA":
        event_tra_routines = target_event["TRA_routines"]
        if routine_key not in event_tra_routines:
            event_tra_routines[routine_key] = {
                "Competition": row.Competition,
                "Stage": row.Stage,
                "Score": row.Mark / 1000,
                "Total Score": row.Mark_Total / 1000,
            }
        routine_data = event_tra_routines[routine_key]

        if row.Judge in ["E4", "E3", "E2", "E1"]:
            routine_data[row.Judge] = [
                row.S1,
                row.S2,
                row.S3,
                row.S4,
                row.S5,
                row.S6,
                row.S7,
                row.S8,
                row.S9,
                row.S10,
                row.L,
                row.A,
            ]
        if row.Judge in ["E\u2211"]:
            routine_data["EX"] = [
                row.S1,
                row.S2,
                row.S3,
                row.S4,
                row.S5,
                row.S6,
                row.S7,
                row.S8,
                row.S9,
                row.S10,
                row.L,
                row.A,
            ]
            ex = row.SUM / 10
            if ex > 20:  # some events store in thousandths instead of tenths
                ex = row.SUM / 1000
            routine_data["EX_total"] = ex
        if row.Judge in ["T"]:
            routine_data["TOF"] = row.SUM / 1000
        if row.Judge in ["D"]:
            routine_data["DIF"] = row.SUM / 10
        if row.Judge in ["H"]:
            routine_data["HD"] = row.SUM / 100

    elif row.Discipline == "DMT":
        # copy paste from above with minor changes
        event_dmt_routines = target_event["DMT_routines"]
        if routine_key not in event_dmt_routines:
            event_dmt_routines[routine_key] = {
                "Competition": row.Competition,
                "Stage": row.Stage,
                "Score": row.Mark / 1000,
                "Total Score": row.Mark_Total / 1000,
            }
        routine_data = event_dmt_routines[routine_key]
        if row.Judge in ["E4", "E3", "E2", "E1"]:
            routine_data[row.Judge] = [row.S1, row.S2, row.L, row.A]
        if row.Judge in ["E\u2211"]:
            routine_data["EX"] = [row.S1, row.S2, row.L, row.A]
            ex = row.SUM / 10
            if ex > 20:
                ex = row.SUM / 1000
            routine_data["EX_total"] = ex
        if row.Judge in ["D"]:
            routine_data["DIF"] = row.SUM / 10

    # i += 1
    # if i > 1000:
    #     break
    row_data = {}
json = json.dumps(json_data, indent=0)
with open("sporttech_search/public/mega_data.json", "w") as f:
    json = json.replace("NaN", "0")
    json = json.replace("\n", "")
    f.write(json)

with gzip.open(
    "sporttech_search/public/mega_data.json.gz", "wt", encoding="utf-8"
) as zipfile:
    zipfile.write(json)
