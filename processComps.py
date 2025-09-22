import requests

data_links = []

with open("event_links.txt", "r") as f:
    event_links = [line.strip() for line in f.readlines()]
    print(f"Loaded {len(event_links)} event links.")
    data_links = [link + "/api/event/export" for link in event_links]


for link in data_links:
    print(f"Downloading data from {link}...")
    response = requests.get(link)
    if response.status_code == 200:
        filename = "csv/" + link.split("/")[-6] + "_data.csv"
        with open(filename, "wb") as f:
            f.write(response.content)
        print(f"Saved data to {filename}.")
    else:
        print(f"Failed to download data from {link}. Status code: {response.status_code}")
