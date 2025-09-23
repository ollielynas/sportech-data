# https://web.archive.org/web/20221201033616/https://outbounce.nz/results/index.php

# scrape the scoreholder page for the latest scores
import requests
from bs4 import BeautifulSoup

csv = "#category ,competition,player,score\n"
# https://web.archive.org/web/20220204095323/

