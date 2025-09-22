import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

# Configure headless browser for efficiency
options = Options()
options.add_argument("--headless")
options.add_argument("--no-sandbox")

driver = webdriver.Chrome(options=options)

event_links = []

for year in range(2022, 2026):
    url = f"https://sporttech.io/explore?year={year}&country=NZL&sport=TRA"
    print(f"Processing URL: {url}")
    driver.get(url)
    time.sleep(3)
    
    events = driver.find_elements(By.CSS_SELECTOR, ".event-name a")
    links = ["https://sporttech.io" + e.get_attribute("href") if e.get_attribute("href").startswith("/") else e.get_attribute("href") for e in events]
    print(f"Found {len(links)} links for year {year}")
    event_links.extend(links)

driver.quit()

print("Collected links:")
for link in event_links:
    print(link)

# Save links to a file
with open("event_links.txt", "w") as f:
    for link in event_links:
        f.write(link + "\n")
