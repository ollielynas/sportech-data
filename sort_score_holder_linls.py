import os
import random
import time

import requests
from bs4 import BeautifulSoup

links = []
json_data = {}
processed_links = 0

with open("total_links.txt", "r") as f:
    text = f.read();
    processed_links = int(text) if text else 0
    print("processed links:", processed_links)
with open("sporttech_search/public/scoreholder_data.json", "r") as f:
    import json
    json_data = json.load(f)



with open("scoreholder_links.json", "r") as f:
    import json
    links = json.load(f)
links = [f"https://web.archive.org/web/{l[3]}/" + l[0] for l in links if "https://outbounce.nz/results/results.php?gradeKey=" in l[0] and "discipline" not in l[0]]
links.sort()
before_l = len(links)

links = links[processed_links:]
print("total links to process:", len(links))


very_start_time = time.time()
for link in links:
    # check for file to stop
    
    if os.path.exists("stop.txt"):
        print("stop.txt found, stopping...")
        os.remove("stop.txt")
        break
    
    start_time = time.time()
    time.sleep(10)
    try:
        html = requests.get(link).text
    except Exception as e:
        print("error fetching", link, e)
        break
    soup = BeautifulSoup(html, 'html.parser')
    event_title = f"{soup.select('.page-title')}".split("<br/>")[0].split(">")[-1].strip()
    category_title = f"{soup.select('.page-title')}".split("<br/>")[-1].split("<")[0].strip()

    
    if "Double" in category_title or "Mini" in category_title or "DMT" in category_title:
        category = "double-mini"
    elif "Trampoline".lower() in category_title.lower() or "TRA" in category_title:
        category = "trampoline"
    else:
        print("processed", processed_links:=processed_links+1, "of", before_l)
        print("unknown category, skipping:", category_title)
        continue
    

    event_key = event_title + f" ({hash(event_title)%1000})"
    # .accordion-toggle
    table_title_toggle = soup.select('.accordion-toggle')
    for table in table_title_toggle:
        table_body = table.find_next('tr')
        # to html
        name = f"{table.select_one('.name')}".split("<br/>")[0].split(">")[-1].strip()
        club = table.select_one('.clubname-small').text.strip()

        if not name.lower() in json_data:
            json_data[name.lower()] = {
                'GivenName': name.split(" ")[0],
                'FamilyName': " ".join(name.split(" ")[1:]),
                'Clubs': [club],
                'Events': {}
            }
        if club not in json_data[name.lower()]['Clubs']:
            json_data[name.lower()]['Clubs'].append(club)
        if event_key not in json_data[name.lower()]['Events']:
            json_data[name.lower()]['Events'][event_key] = {
                'Title': event_title,
                'Event_UUID': hash(event_title)%1000000,
                'TRA_routines': {},
                'DMT_routines': {},
            }
        if category == "double-mini":
            routines = json_data[name.lower()]['Events'][event_key]['DMT_routines']
            
            line_titles = table_body.select("td.line-title")
            for line_title in line_titles:
                routine_key = line_title.text.strip()
                EX = line_title.find_next('td')
                DIF = EX.find_next('td')
                P = DIF.find_next('td')
                Bonus = P.find_next('td')
                Score = Bonus.find_next('td')
                
                total_score = table.select_one('.score').text.strip()
                routines[routine_key] = {
                    'Competition': event_title,
                    'Stage': line_title.next_sibli,
                    # add default value for int
                    # 'Score': int(Score.text.strip()),
                    'Score': float(Score.text.strip()) if Score.text.strip() else 0,
                    'Total Score': float(total_score) if total_score else 0,
                    'EX_Total': float(EX.text.strip()) if EX and EX.text.strip() else 0,
                    'DIF': float(DIF.text.strip()) if DIF and DIF.text.strip() else 0.0,
                }
            
            
        elif category == "trampoline":
            routines = json_data[name.lower()]['Events'][event_key]['TRA_routines']
            line_titles = table_body.select("td.line-title")
            for line_title in line_titles:
                routine_key = line_title.text.strip()
                EX = line_title.find_next('td')
                DIF = EX.find_next('td')
                HD = DIF.find_next('td')
                TOF = HD.find_next('td')
                P = TOF.find_next('td')
                Score = P.find_next('td')
                
                total_score = table.select_one('.score').text.strip()
                routines[routine_key] = {
                    'Competition': event_title,
                    'Stage': line_title.next_sibli,
                    # add default value for int
                    # 'Score': int(Score.text.strip()),
                    'Score': float(Score.text.strip()) if Score.text.strip() else 0,
                    'Total Score': float(total_score) if total_score else 0,
                    'EX_Total': float(EX.text.strip()) if EX and EX.text.strip() else 0,
                    'DIF': float(DIF.text.strip()) if DIF and DIF.text.strip() else 0.0,
                    'HD': float(HD.text.strip()) if HD and HD.text.strip() else 0.0,
                    'TOF': float(TOF.text.strip()) if TOF and TOF.text.strip() else 0.0,
                }
    print("processed", processed_links:=processed_links+1, "of", before_l)
    print("time taken for this:", ((time.time() - start_time) * 100)//100,  "predicted total:", int(((time.time() - start_time) * len(links) - processed_links) // 2) * 2, "seconds")


with open("total_links.txt", "w") as f:
    f.write(str(processed_links))

with open("sporttech_search/public/scoreholder_data.json", "w") as f:
    import json
    json.dump(json_data, f, indent=0)
