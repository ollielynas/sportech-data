
import json

import pandas as pd

path = 'mega_data.csv'
data = pd.read_csv(path)

json_data = {}
i = 0
for row in data.itertuples(index=False):
    
    name = row.GivenName + ' ' + row.Surname
    event_key = row.Title + f" ({hash(row.Event_UUID)%1000})"
    routine_key = f"{row.Competition} {row.Stage} {row.Mark}" 
    if name not in json_data.keys():
        json_data[name] = {
            'GivenName': row.GivenName,
            'FamilyName': row.Surname,
            'Club': row.Representing,
            'Events': {}
        }
    person_data = json_data[name]
    events_data = person_data['Events']
    
    if event_key not in events_data:
        events_data[event_key] = {
            'Title': row.Title,
            'Event_UUID': row.Event_UUID,
            'TRA_routines': {},
            'DMT_routines': {},
            }
    
    target_event = events_data[event_key];
    
    if row.Discipline == 'TRA':
        event_tra_routines = target_event['TRA_routines']
        if routine_key not in event_tra_routines:
            event_tra_routines[routine_key] = {
                'Competition': row.Competition,
                'Stage': row.Stage,
                'Score': row.Mark/1000,
                'Total Score': row.Mark_Total/1000,
            }
        routine_data = event_tra_routines[routine_key]
        
        if row.Judge in ["E4", "E3", "E2", "E1"]:
            routine_data[row.Judge] = [row.S1, row.S2, row.S3, row.S4, row.S5, row.S6, row.S7, row.S8, row.S9, row.S10, row.L, row.A]
        if row.Judge in ["ESUM"]:
            routine_data["EX"] = [row.S1, row.S2, row.S3, row.S4, row.S5, row.S6, row.S7, row.S8, row.S9, row.S10, row.L, row.A]
            routine_data["EX_total"] = row.SUM / 10
        if row.Judge in ["T"]:
            routine_data["TOF"] = row.SUM / 1000
        if row.Judge in ["D"]:
            routine_data["DIF"] = row.SUM / 10
        if row.Judge in ["H"]:
            routine_data["HD"] = row.SUM / 100
        
    elif row.Discipline == 'DMT':
        # copy paste from above with minor changes
        event_dmt_routines = target_event['DMT_routines']
        if routine_key not in event_dmt_routines:
            event_dmt_routines[routine_key] = {
                'Competition': row.Competition,
                'Stage': row.Stage,
                'Mark': row.Mark,
                'Total Mark': row.Mark_Total,
            }
        routine_data = event_dmt_routines[routine_key]
        if row.Judge in ["E4", "E3", "E2", "E1"]:
            routine_data[row.Judge] = [row.S1, row.S2, row.L, row.A]
        if row.Judge in ["ESUM"]:
            routine_data["EX"] = [row.S1, row.S2, row.L, row.A]
            routine_data["EX_total"] = row.SUM / 10
        if row.Judge in ["D"]:
            routine_data["DIF"] = row.SUM / 10
        
    i += 1
    if i > 1000:
        break
    row_data = {}
json = json.dumps(json_data, indent=0)
with open('mega_data.json', 'w') as f:
    f.write(json)