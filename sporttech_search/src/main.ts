let jsonData: any = {};
let keys: string[] = [];

document.getElementById("load_data")?.addEventListener("click", () => {
  console.log("Fetching and loading the JSON file...");

  fetch("./mega_data.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      jsonData = data;
      keys = Object.keys(jsonData).filter(
        (key) =>
          key !== "undefined" && key !== "" && key !== null && key !== "nan nan"
      );
      document.getElementById(
        "details"
      )!.innerHTML = `Data loaded. ${keys.length} athletes available.`;
    })
    .catch((error) => {
      console.error("Error fetching the JSON file:", error);
    });

  document.getElementById("load_data")?.setAttribute("style", "display:none");
  document
    .getElementById("search-window")
    ?.setAttribute("style", "display:block");
});


function displayScores(event: any, tra_scores: any[], dmt_scores: any[]) {
  
  let scoresDiv = document.createElement("div");
  let title = document.createElement("h3");
  title.textContent = event.Title + " - Trampoline Scores";
  title.id = "scores-title";
  scoresDiv.appendChild(title);

  if (!tra_scores || tra_scores.length === 0) {
    let li = document.createElement("li");
    li.textContent = "No Trampoline Scores";
    scoresDiv.appendChild(li);
  }

  for (let scoreEntry of tra_scores) {
    let score = scoreEntry.Score || "No Score";
    let TOF = scoreEntry.TOF || "";
    let DIF = scoreEntry.DIF || "";
    let EX = scoreEntry.EX_total || "";
    let HD = scoreEntry.HD || "";
    let Category = scoreEntry.Competition || "";
    let Routine = scoreEntry.Stage || "";
    // pad int with leading zeros
    let E1 = scoreEntry.E1.map((n: number) => String(n).padStart(3, " ")).join(",").replace("nan", " ") || "";
    let E2 = scoreEntry.E2.map((n: number) => String(n).padStart(3, " ")).join(",").replace("nan", " ") || "";
    let E3 = scoreEntry.E3.map((n: number) => String(n).padStart(3, " ")).join(",").replace("nan", " ") || "";
    let E4 = scoreEntry.E4.map((n: number) => String(n).padStart(3, " ")).join(",").replace("nan", " ") || "";
    let li = document.createElement("button");
    li.innerHTML = `${Category} - ${Routine} <br /> Score: ${score} EX:${EX} TOF:${TOF} DIF:${DIF} HD:${HD}`;
    li.className = "score-entry";
    li.onclick = () => {
      alert(
        `Details:\nCategory: ${Category}\nRoutine: ${Routine}\nScore: ${score}\nEX:${EX}\nTOF: ${TOF}\nDIF: ${DIF}\nHD: ${HD}`
        + `\n      S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, L,  A`
        + `\nE1: ${E1}\nE2: ${E2}\nE3: ${E3}\nE4: ${E4}`
      );
    };

    scoresDiv.appendChild(li);
  }
  

  let title2 = document.createElement("h3");
  title2.id = "scores-title";
  title2.textContent = event.Title + " - Double Mini Scores";
  scoresDiv.appendChild(title2);
  
  if (!dmt_scores || dmt_scores.length === 0) {
    let li = document.createElement("li");
    li.textContent = "No Double Mini Scores";
    scoresDiv.appendChild(li);
  }
  for (let scoreEntry of dmt_scores) {
    let score = scoreEntry.Score || "No Score";
    let TOF = scoreEntry.TOF || "";
    let DIF = scoreEntry.DIF || "";
    let HD = scoreEntry.HD || "";
    let EX = scoreEntry.EX_total || "";
    let Category = scoreEntry.Competition || "";
    let Routine = scoreEntry.Stage || "";
    // pad int with leading zeros
    let E1 = scoreEntry.E1.map((n: number) => String(n).padStart(3, " ")).join(",").replace("Nan", " ") || "";
    let E2 = scoreEntry.E2.map((n: number) => String(n).padStart(3, " ")).join(",").replace("Nan", " ") || "";
    let E3 = scoreEntry.E3.map((n: number) => String(n).padStart(3, " ")).join(",").replace("Nan", " ") || "";
    let E4 = scoreEntry.E4.map((n: number) => String(n).padStart(3, " ")).join(",").replace("Nan", " ") || "";
    let li = document.createElement("button");
    li.innerHTML = `${Category} - ${Routine} <br /> Score: ${score} EX:${EX} TOF:${TOF} DIF:${DIF} HD:${HD}`;
    li.className = "score-entry";
    li.onclick = () => {
      alert(
        `Details:\nCategory: ${Category}\nRoutine: ${Routine}\nScore: ${score}\nEX:${EX}\nTOF: ${TOF}\nDIF: ${DIF}\nHD: ${HD}`
        + `\n      S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, L,  A`
        + `\nE1: ${E1}\nE2: ${E2}\nE3: ${E3}\nE4: ${E4}`
      );
    };

    scoresDiv.appendChild(li);
  }
  return scoresDiv;
}

function getCompScores(event: any) {
  let tra_scores = Object.keys(event.TRA_routines).map(
    (key) => event.TRA_routines[key]
  );
  let dmt_scores = Object.keys(event.DMT_routines).map(
    (key) => event.DMT_routines[key]
  );
  return displayScores(event, tra_scores, dmt_scores);
}
function getTop5(person: any) {
  let events = person.Events;
  let tra_scores: any[] = [];
  let dmt_scores: any[] = [];
  for (let eventName in events) {
    let event = events[eventName];
    tra_scores.push(...Object.values(event.TRA_routines));
    dmt_scores.push(...Object.values(event.DMT_routines));
  }
  tra_scores.sort((a, b) => (b.Score || 0) - (a.Score || 0));
  dmt_scores.sort((a, b) => (b.Score || 0) - (a.Score || 0));
  tra_scores = tra_scores.slice(0, 5);
  dmt_scores = dmt_scores.slice(0, 5);
  let event = { Title: "Top 5 Scores" };
  return displayScores(event, tra_scores, dmt_scores);
}


function totalPointsEver(person: any) {
  let events = person.Events;
  let total = 0;
  for (let eventName in events) {
    let event = events[eventName];
    let tra_scores = Object.values(event.TRA_routines);
    let dmt_scores = Object.values(event.DMT_routines);
    for (let scoreEntry of tra_scores) {
      if (typeof scoreEntry === "object" && scoreEntry !== null && "Score" in scoreEntry) {
        total += (scoreEntry as { Score?: number }).Score || 0;
      }
    }
    for (let scoreEntry of dmt_scores) {
      if (typeof scoreEntry === "object" && scoreEntry !== null && "Score" in scoreEntry) {
        total += (scoreEntry as { Score?: number }).Score || 0;
      }
    }
  }
  return total;
}

function getResults(name: string, club: string) {
  let results = [];

  name = name.trim().toLowerCase();
  club = club.trim().toLowerCase();
  for (let key of keys) {
    console.log("Checking key:", key);
    let person = jsonData[key];
    let fullName = (person.GivenName + " " + person.FamilyName).toLowerCase();
    let lastName = person.FamilyName.toLowerCase();
    let clubs = person.Clubs.map((c: string) => c.toLowerCase());
    if (
      ((name === "" || fullName.startsWith(name)) ||
      (name === "" || lastName.startsWith(name)) )&&
      (club === "" || clubs.some((c: string) => c.startsWith(club)))
    ) {
      results.push(person);
    }
  }
  return results.slice(0, 20); // Limit to first 100 results
}

function loadPersonDetails(person: string) {
  let right = document.querySelector(".right")!;
  right.innerHTML = "";
  console.log("Loading details for:", person);
  let personJson = jsonData[person];
  let name = "" + personJson.GivenName + " " + personJson.FamilyName;
  let totalPoints = totalPointsEver(personJson);
  let totalPointsElement = document.createElement("p");
  let clubs = personJson.Clubs.join(", ");
  let nameElement = document.createElement("h2");
  nameElement.textContent = name;
  let clubsElement = document.createElement("p");
  clubsElement.textContent = "Clubs: " + clubs;
  let scoresDiv = document.createElement("div");
  totalPointsElement.textContent = "Total Points Ever: " + totalPoints.toFixed(3);
  right.appendChild(nameElement);
  right.appendChild(totalPointsElement);
  right.appendChild(clubsElement);

  // add dropdown to select tramp competition
  let events = personJson.Events;
  let select = document.createElement("select");
  select.id = "event-select";
  let defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select Event";
  select.appendChild(defaultOption);

  for (let eventName in events) {
    let option = document.createElement("option");
    option.value = eventName;
    option.textContent = events[eventName].Title;
    select.appendChild(option);
  }

  let top5Button = document.createElement("button");
  top5Button.textContent = "Show Top 5 Scores";
  top5Button.addEventListener("click", () => {
    scoresDiv.innerHTML = "";
    scoresDiv.appendChild(getTop5(personJson));
  });
  right.appendChild(top5Button);
  right.appendChild(document.createElement("br"));

  select.addEventListener("change", () => {
    scoresDiv.innerHTML = "";
    let eventName = (
      document.getElementById("event-select") as HTMLSelectElement
    ).value;
    let event = events[eventName];
    if (!event) {
    } else {
      scoresDiv.appendChild(getCompScores(event));
    }
  });

  right.appendChild(select);
  right.appendChild(document.createElement("br"));

  right.appendChild(scoresDiv);

  scoresDiv.id = "scores-div";
  select.id = "event-select";
  nameElement.id = "person-name";
  clubsElement.id = "person-clubs";
}

document.getElementById("search-button")?.addEventListener("click", () => {
  const nameInput = (document.getElementById("search-name") as HTMLInputElement)
    .value;
  const clubInput = (document.getElementById("search-club") as HTMLInputElement)
    .value;
  const results = getResults(nameInput, clubInput);
  let res_div = document.getElementById("results")!;
  const dataDiv = document.querySelector(".data")!;
  res_div.innerHTML = "";
  dataDiv.innerHTML = "";
  if (results.length === 0) {
    res_div.innerHTML = "<p>No results found</p>";
    return;
  }
  res_div.innerHTML = `<p>Showing first ${results.length} results</p>`;
  for (let person of results) {
    const personDiv = document.createElement("button");
    personDiv.className = "person";
    const fullName = `${person.GivenName} ${person.FamilyName}`.toLowerCase();
    const capsName = `${person.GivenName} ${person.FamilyName}`;
    personDiv.textContent = capsName + " (" + person.Clubs.join(", ") + ")";
    personDiv.addEventListener("click", () => loadPersonDetails(fullName));
    res_div.appendChild(personDiv);
  }
});
