import Plotly from "plotly.js-dist-min";
import { showPopup, showRoutinePopup } from "./popup";
import { sortPeople } from "./sort";

let jsonData: any = {};
let keys: string[] = [];
let fetchesPending = 2; // we fire two fetches; count down to 0
let autoRestoreDone = false;

/* ── localStorage ───────────────────────────────────── */
const LS_RECENT = "sportech_recent";
const LS_LAST = "sportech_last";

function getRecentKeys(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_RECENT) || "[]");
  } catch {
    return [];
  }
}

function pushRecent(key: string) {
  const list = getRecentKeys().filter((k) => k !== key);
  list.unshift(key);
  localStorage.setItem(LS_RECENT, JSON.stringify(list.slice(0, 10)));
  localStorage.setItem(LS_LAST, key);
  renderRecentList();
}

function renderRecentList() {
  const container = document.getElementById("recent-list")!;
  const list = getRecentKeys().filter((k) => keys.includes(k));
  container.innerHTML = "";
  if (!list.length) {
    container.innerHTML = `<div class="load-prompt"><p>No recently viewed athletes yet.</p></div>`;
    return;
  }
  for (const k of list) {
    const p = jsonData[k];
    const btn = document.createElement("button");
    btn.className = "person";
    btn.innerHTML = `
      <span class="person-name">${p.GivenName} ${p.FamilyName}</span>
      <span class="person-club">${(p.Clubs as string[]).filter(Boolean).join(", ")}</span>`;
    btn.addEventListener("click", () => loadPersonDetails(k));
    container.appendChild(btn);
  }
}

/* ── Sidebar tabs ─────────────────────────────────────── */
document.querySelectorAll(".sidebar-tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = (btn as HTMLElement).dataset.sidebarTab!;
    document
      .querySelectorAll(".sidebar-tab-btn")
      .forEach((b) =>
        b.classList.toggle(
          "active",
          (b as HTMLElement).dataset.sidebarTab === tab,
        ),
      );
    document.getElementById("search-panel")!.style.display =
      tab === "search" ? "" : "none";
    document.getElementById("recent-panel")!.style.display =
      tab === "recent" ? "" : "none";
    if (tab === "recent") renderRecentList();
  });
});

/* ── Data loading ─────────────────────────────────────── */
function onFetchComplete() {
  fetchesPending--;
  document.getElementById("details")!.textContent =
    `${keys.length} athletes loaded`;

  if (fetchesPending <= 0) {
    // Both fetches done — reveal search UI
    document.getElementById("search-loading")!.style.display = "none";
    document.getElementById("search-window")!.style.display = "block";

    // Restore last-viewed profile once
    if (!autoRestoreDone) {
      autoRestoreDone = true;
      const last = localStorage.getItem(LS_LAST);
      if (last && keys.includes(last)) {
        loadPersonDetails(last);
        // Switch to recent tab so user sees the list
        renderRecentList();
      }
    }
  }
}

function fetchJson(url: string) {
  fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error("Network error: " + r.statusText);
      return r.json();
    })
    .then((data) => {
      const new_keys = Object.keys(data).filter(
        (k) => k !== "undefined" && k !== "" && k !== null && k !== "nan nan",
      );
      for (const key of new_keys) {
        if (!keys.includes(key)) {
          keys.push(key);
          jsonData[key] = data[key];
        } else {
          for (const ev in data[key].Events) {
            jsonData[key].Events[ev] = data[key].Events[ev];
          }
          jsonData[key].Clubs = Array.from(
            new Set([...jsonData[key].Clubs, ...data[key].Clubs]),
          );
        }
      }
      console.log("Fetch complete. Athletes so far:", keys.length);
      onFetchComplete();
    })
    .catch((e) => {
      console.error("Fetch error:", e);
      onFetchComplete();
    });
}

// Auto-load on page open
fetchJson("./scoreholder_data.json");
fetchJson("./mega_data.json");

/* ── Helpers ─────────────────────────────────────────────── */

function totalPointsEver(person: any): number {
  let total = 0;
  for (const evName in person.Events) {
    const ev = person.Events[evName];
    for (const r of [
      ...Object.values(ev.TRA_routines),
      ...Object.values(ev.DMT_routines),
    ]) {
      total += (r as any).Score || 0;
    }
  }
  return total;
}

function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "—";
  return value
    .toFixed(digits)
    .replace(/\.0+$/, "")
    .replace(/\.?0+$/, "");
}

function formatDate(value: string): string {
  return value || "—";
}

const TRA_SKILL_LABELS = [
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6",
  "S7",
  "S8",
  "S9",
  "S10",
  "L",
  "A",
];

const DMT_SKILL_LABELS = ["S1", "S2", "L", "A"];

function getSkillLabels(type: "TRA" | "DMT"): string[] {
  return type === "TRA" ? TRA_SKILL_LABELS : DMT_SKILL_LABELS;
}

type RoutineOccurrence = {
  date: string;
  event: string;
  type: "TRA" | "DMT";
  score: number;
  tof: number;
  dif: number;
  ex: number;
  hd: number;
  routine: any;
  evMeta: any;
  skillSeries: Record<string, number[]>;
};

type RoutineGroup = {
  type: "TRA" | "DMT";
  difficulty: number;
  difficultyKey: string;
  occurrenceCount: number;
  firstDate: string;
  lastDate: string;
  avgScore: number;
  avgDifficulty: number;
  avgTof: number;
  competitions: Array<{ event: string; competition: string }>;
  skillLabels: string[];
  skillSeries: Record<string, number[]>;
  skillAverages: Record<string, number>;
  occurrences: RoutineOccurrence[];
};

function buildRoutineGroups(person: any): RoutineGroup[] {
  const groups = new Map<string, RoutineGroup>();

  for (const evName in person.Events) {
    const ev = person.Events[evName];
    const date = ev.StartDate ? ev.StartDate.slice(0, 10) : "";

    for (const type of ["TRA", "DMT"] as const) {
      const routines = Object.values(
        type === "TRA" ? ev.TRA_routines : ev.DMT_routines,
      ) as any[];

      for (const routine of routines) {
        const difficulty = Number(routine.DIF ?? 0);
        if (!Number.isFinite(difficulty) || difficulty <= 0) continue;

        const difficultyKey = String(routine.DIF);
        const groupKey = `${type}|${difficultyKey}`;
        const skillLabels = getSkillLabels(type);
        const skillSeries: Record<string, number[]> = Object.fromEntries(
          skillLabels.map((label) => [label, []]),
        );

        for (const judge of ["E1", "E2", "E3", "E4"]) {
          const scores = routine[judge];
          if (!Array.isArray(scores)) continue;
          skillLabels.forEach((label, index) => {
            const value = Number(scores[index]);
            if (Number.isFinite(value)) skillSeries[label].push(value);
          });
        }

        const occurrence: RoutineOccurrence = {
          date,
          event: ev.Title || "",
          type,
          score: Number(routine.Score) || 0,
          tof: Number(routine.TOF) || 0,
          dif: difficulty,
          ex: Number(routine.EX_total) || 0,
          hd: Number(routine.HD) || 0,
          routine,
          evMeta: ev,
          skillSeries,
        };

        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            type,
            difficulty,
            difficultyKey,
            occurrenceCount: 0,
            firstDate: "",
            lastDate: "",
            avgScore: 0,
            avgDifficulty: 0,
            avgTof: 0,
            competitions: [],
            skillLabels,
            skillSeries: Object.fromEntries(
              skillLabels.map((label) => [label, []]),
            ),
            skillAverages: Object.fromEntries(
              skillLabels.map((label) => [label, 0]),
            ),
            occurrences: [],
          });
        }

        const group = groups.get(groupKey)!;
        group.occurrences.push(occurrence);
        if (routine.Competition && ev.Title) {
          const exists = group.competitions.some(
            (c) =>
              c.event === ev.Title && c.competition === routine.Competition,
          );
          if (!exists) {
            group.competitions.push({
              event: ev.Title,
              competition: routine.Competition as string,
            });
          }
        }
      }
    }
  }

  for (const group of groups.values()) {
    group.occurrences.sort((a, b) => a.date.localeCompare(b.date));
    group.occurrenceCount = group.occurrences.length;
    group.firstDate = group.occurrences[0]?.date || "";
    group.lastDate =
      group.occurrences[group.occurrences.length - 1]?.date || "";

    let scoreSum = 0;
    let difficultySum = 0;
    let tofSum = 0;
    let tofCount = 0;

    for (const occurrence of group.occurrences) {
      scoreSum += occurrence.score;
      difficultySum += occurrence.dif;
      if (occurrence.tof > 0) {
        tofSum += occurrence.tof;
        tofCount++;
      }
      for (const label of group.skillLabels) {
        group.skillSeries[label].push(...occurrence.skillSeries[label]);
      }
    }

    group.avgScore = group.occurrenceCount
      ? scoreSum / group.occurrenceCount
      : 0;
    group.avgDifficulty = group.occurrenceCount
      ? difficultySum / group.occurrenceCount
      : 0;
    group.avgTof = tofCount ? tofSum / tofCount : 0;

    for (const label of group.skillLabels) {
      const values = group.skillSeries[label];
      if (values.length > 0) {
        group.skillAverages[label] =
          values.reduce((a, b) => a + b, 0) / values.length;
      }
    }
  }

  return Array.from(groups.values()).sort((a, b) =>
    b.lastDate.localeCompare(a.lastDate),
  );
}

/* ── Profile panel ───────────────────────────────────────── */

function loadPersonDetails(personKey: string) {
  pushRecent(personKey);

  const main = document.querySelector(".main-content")!;
  main.innerHTML = "";

  const p = jsonData[personKey];
  const name = `${p.GivenName} ${p.FamilyName}`;
  const clubs = (p.Clubs as string[]).filter(Boolean).join(", ");
  const total = totalPointsEver(p);

  // Collect all routines for stats
  let allTRA: any[] = [];
  let allDMT: any[] = [];
  for (const evName in p.Events) {
    const ev = p.Events[evName];
    allTRA.push(...Object.values(ev.TRA_routines));
    allDMT.push(...Object.values(ev.DMT_routines));
  }
  allTRA.sort((a: any, b: any) => (b.Score || 0) - (a.Score || 0));
  allDMT.sort((a: any, b: any) => (b.Score || 0) - (a.Score || 0));
  const bestTRA = allTRA.length ? (allTRA[0] as any).Score?.toFixed(3) : "—";
  const bestDMT = allDMT.length ? (allDMT[0] as any).Score?.toFixed(3) : "—";

  // Profile header
  const header = document.createElement("div");
  header.className = "profile-header";
  header.innerHTML = `
    <div class="profile-name">${name}</div>
    <div class="profile-meta">
      ${clubs
        .split(",")
        .map((c) => `<span class="profile-tag">${c.trim()}</span>`)
        .join("")}
    </div>`;
  main.appendChild(header);

  // Stats strip
  const stats = document.createElement("div");
  stats.className = "stats-strip";
  stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${total.toFixed(1)}</div>
      <div class="stat-label">Total Points</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${allTRA.length}</div>
      <div class="stat-label">TRA Routines</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${bestTRA}</div>
      <div class="stat-label">Best TRA</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${allDMT.length}</div>
      <div class="stat-label">DMT Routines</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${bestDMT}</div>
      <div class="stat-label">Best DMT</div>
    </div>`;
  main.appendChild(stats);

  // Tabs
  const tabsBar = document.createElement("div");
  tabsBar.className = "tabs-bar";
  tabsBar.innerHTML = `
    <button class="tab-btn active" data-tab="graph">Graph View</button>
    <button class="tab-btn" data-tab="table">Table View</button>`;
  tabsBar.innerHTML += `
    <button class="tab-btn" data-tab="routine">Routine View</button>`;
  main.appendChild(tabsBar);

  const tabContent = document.createElement("div");
  tabContent.className = "tab-content";
  main.appendChild(tabContent);

  function switchTab(name: string) {
    tabsBar
      .querySelectorAll(".tab-btn")
      .forEach((b) =>
        b.classList.toggle("active", (b as HTMLElement).dataset.tab === name),
      );
    tabContent.innerHTML = "";
    if (name === "graph") showGraphView(p, tabContent);
    else if (name === "table") showTableView(p, tabContent);
    else renderRoutineView(p, tabContent);
  }

  tabsBar
    .querySelectorAll(".tab-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        switchTab((btn as HTMLElement).dataset.tab!),
      ),
    );

  switchTab("graph");
}

function renderRoutineView(person: any, container: HTMLElement) {
  container.innerHTML = "";
  const groups = buildRoutineGroups(person);

  if (!groups.length) {
    container.innerHTML = `<p class="table-empty">No routines with difficulty data available.</p>`;
    return;
  }

  const note = document.createElement("p");
  note.className = "routine-view-note";
  note.textContent = "Routines are grouped by exact difficulty value.";
  container.appendChild(note);

  const list = document.createElement("div");
  list.className = "routine-list";
  container.appendChild(list);

  for (const group of groups) {
    const card = document.createElement("button");
    card.className = "routine-card";
    card.innerHTML = `
      <div class="routine-card-top">
        <div class="routine-card-heading">
          <div class="routine-card-title">${group.type} · DIF ${formatNumber(group.difficulty)}</div>
          <div class="routine-card-subtitle">${group.occurrenceCount} routines · ${formatDate(group.firstDate)} to ${formatDate(group.lastDate)}</div>
        </div>
        <div class="routine-card-count">${group.occurrenceCount}</div>
      </div>
      <div class="routine-card-stats">
        <span class="routine-chip">Avg score ${formatNumber(group.avgScore, 3)}</span>
        <span class="routine-chip">Avg DIF ${formatNumber(group.avgDifficulty, 3)}</span>
        <span class="routine-chip">Avg TOF ${group.avgTof > 0 ? formatNumber(group.avgTof, 3) : "—"}</span>
      </div>`;
    card.addEventListener("click", () => showRoutinePopup(group));
    list.appendChild(card);
  }
}

/* ── Scores over time ───────────────────────────────────── */

const CHART_LAYOUT_BASE: Partial<Plotly.Layout> = {
  autosize: true,
  margin: { t: 24, r: 16, b: 80, l: 50 },
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { family: "Inter, Segoe UI, sans-serif", size: 12, color: "#64748b" },
  legend: { orientation: "h", y: -0.3 },
  hovermode: "closest",
};

function showGraphView(person: any, container: HTMLElement) {
  container.innerHTML = "";
  const scoresDiv = document.createElement("div");
  scoresDiv.id = "scores-div";
  container.appendChild(scoresDiv);

  // Gather per-event, per-routine data points
  type Pt = {
    date: string;
    score: number;
    label: string;
    routine: any;
    evMeta: any;
  };
  const tra: Pt[] = [];
  const dmt: Pt[] = [];
  type CompPt = { date: string; val: number; label: string };
  // TRA components
  const ex: CompPt[] = [];
  const tof: CompPt[] = [];
  const dif: CompPt[] = [];
  const hd: CompPt[] = [];
  // DMT components
  const dmtEx: CompPt[] = [];
  const dmtDif: CompPt[] = [];

  for (const evName in person.Events) {
    const ev = person.Events[evName];
    const date = ev.StartDate ? ev.StartDate.slice(0, 10) : null;
    if (!date) continue;
    const label = `${ev.Title} (${date})`;

    for (const r of Object.values(ev.TRA_routines) as any[]) {
      if ((r.Score ?? 0) > 0)
        tra.push({
          date,
          score: r.Score,
          label: `${label} — ${r.Competition} ${r.Stage}`,
          routine: r,
          evMeta: ev,
        });
      if ((r.EX_total ?? 0) > 0) ex.push({ date, val: r.EX_total, label, routine: r, evMeta: ev });
      if ((r.TOF ?? 0) > 0) tof.push({ date, val: r.TOF, label, routine: r, evMeta: ev });
      if ((r.DIF ?? 0) > 0) dif.push({ date, val: r.DIF, label, routine: r, evMeta: ev });
      if ((r.HD ?? 0) > 0) hd.push({ date, val: r.HD, label, routine: r, evMeta: ev });
    }
    for (const r of Object.values(ev.DMT_routines) as any[]) {
      if ((r.Score ?? 0) > 0)
        dmt.push({
          date,
          score: r.Score,
          label: `${label} — ${r.Competition} ${r.Stage}`,
          routine: r,
          evMeta: ev,
        });
      if ((r.EX_total ?? 0) > 0) dmtEx.push({ date, val: r.EX_total, label, routine: r, evMeta: ev });
      if ((r.DIF ?? 0) > 0) dmtDif.push({ date, val: r.DIF, label, routine: r, evMeta: ev });
    }
  }

  const sort = (arr: any[]) => arr.sort((a, b) => a.date.localeCompare(b.date));
  sort(tra);
  sort(dmt);
  sort(ex);
  sort(tof);
  sort(dif);
  sort(hd);
  sort(dmtEx);
  sort(dmtDif);

  // helper to render one score chart
  function plotScoreGraph(
    points: Pt[],
    title: string,
    color: string,
    type: "TRA" | "DMT",
  ) {
    const card = document.createElement("div");
    card.className = "scores-section";
    card.innerHTML = `<div class="scores-section-title">${title}</div>`;
    const graph = document.createElement("div");
    graph.className = "time-graph";
    card.appendChild(graph);
    scoresDiv.appendChild(card);

    if (!points.length) {
      // hide graph
      card.style.display = "none";
      return;
    }

    graph.style.cursor = "pointer";

    const traces: Partial<Plotly.PlotData>[] = [];
    if (type === "TRA") {
      const setPoints = points.filter((p) => Number(p.routine?.DIF ?? 0) === 0);
      const volPoints = points.filter((p) => Number(p.routine?.DIF ?? 0) !== 0);

      if (setPoints.length)
        traces.push({
          x: setPoints.map((p) => p.date),
          y: setPoints.map((p) => p.score),
          text: setPoints.map((p) => p.label),
          customdata: setPoints.map((p) => ({ routine: p.routine, evMeta: p.evMeta })),
          hoverinfo: "y+text",
          type: "scatter",
          mode: "markers",
          name: "SET",
          marker: { size: 9, color: "#0ea5e9" },
        });

      if (volPoints.length)
        traces.push({
          x: volPoints.map((p) => p.date),
          y: volPoints.map((p) => p.score),
          text: volPoints.map((p) => p.label),
          customdata: volPoints.map((p) => ({ routine: p.routine, evMeta: p.evMeta })),
          hoverinfo: "y+text",
          type: "scatter",
          mode: "markers",
          name: "VOL",
          marker: { size: 9, color: "#f97316" },
        });
    } else {
      traces.push({
        x: points.map((p) => p.date),
        y: points.map((p) => p.score),
        text: points.map((p) => p.label),
        customdata: points.map((p) => ({ routine: p.routine, evMeta: p.evMeta })),
        hoverinfo: "y+text",
        type: "scatter",
        mode: "markers",
        marker: { size: 9, color },
      });
    }

    Plotly.newPlot(
      graph,
      traces as Plotly.Data[],
      {
        ...CHART_LAYOUT_BASE,
        showlegend: type === "TRA",
        xaxis: { title: { text: "Date" } },
        yaxis: { title: { text: "Score" } },
      },
      { responsive: true },
    );

    (graph as any).on("plotly_click", (data: any) => {
      const point = data.points?.[0];
      if (!point) return;
      const custom = point.customdata;
      if (custom?.routine) showPopup(jsonData, custom.routine, type, custom.evMeta);
    });
  }

  plotScoreGraph(tra, "TRA Scores Over Time", "#6366f1", "TRA");
  plotScoreGraph(dmt, "DMT Scores Over Time", "#10b981", "DMT");

  // ── TRA component chart ──
  const compTraces: Partial<Plotly.PlotData>[] = [];
  if (ex.length)
    compTraces.push({
      x: ex.map((p) => p.date),
      y: ex.map((p) => p.val),
      text: ex.map((p) => p.label),
      customdata: ex.map((p) => ({ routine: p.routine, evMeta: p.evMeta })),
      hoverinfo: "y+text",
      type: "scatter",
      mode: "markers",
      name: "EX",
      marker: { size: 8, color: "#10b981" },
    });
  if (tof.length)
    compTraces.push({
      x: tof.map((p) => p.date),
      y: tof.map((p) => p.val),
      text: tof.map((p) => p.label),
      customdata: tof.map((p) => ({ routine: p.routine, evMeta: p.evMeta })),
      hoverinfo: "y+text",
      type: "scatter",
      mode: "markers",
      name: "TOF",
      marker: { size: 8, color: "#f59e0b" },
    });
  if (dif.length)
    compTraces.push({
      x: dif.map((p) => p.date),
      y: dif.map((p) => p.val),
      text: dif.map((p) => p.label),
      customdata: dif.map((p) => ({ routine: p.routine, evMeta: p.evMeta })),
      hoverinfo: "y+text",
      type: "scatter",
      mode: "markers",
      name: "DIF",
      marker: { size: 8, color: "#ec4899" },
    });
  if (hd.length)
    compTraces.push({
      x: hd.map((p) => p.date),
      y: hd.map((p) => p.val),
      text: hd.map((p) => p.label),
      customdata: hd.map((p) => ({ routine: p.routine, evMeta: p.evMeta })),
      hoverinfo: "y+text",
      type: "scatter",
      mode: "markers",
      name: "HD",
      marker: { size: 8, color: "#8b5cf6" },
    });

  function plotCompGraph(traces: Partial<Plotly.PlotData>[], title: string, type: "TRA" | "DMT") {
    if (!traces.length) return;
    const card = document.createElement("div");
    card.className = "scores-section";
    card.innerHTML = `<div class="scores-section-title">${title}</div>`;
    const graph = document.createElement("div");
    graph.className = "time-graph";
    card.appendChild(graph);
    scoresDiv.appendChild(card);
    Plotly.newPlot(
      graph,
      traces as Plotly.Data[],
      {
        ...CHART_LAYOUT_BASE,
        xaxis: { title: { text: "Date" } },
        yaxis: { title: { text: "Value" } },
      },
      { responsive: true },
    );
    // enable clicking on component points to open the routine popup
    (graph as any).on("plotly_click", (data: any) => {
      const point = data.points?.[0];
      if (!point) return;
      const custom = point.customdata;
      if (custom && custom.routine) {
        showPopup(jsonData, custom.routine, type, custom.evMeta);
        return;
      }
      // fallback: try to match by date and value if customdata missing
      const idx = point.pointIndex;
      const traceIdx = point.curveNumber;
      const ptsArray = traces[traceIdx] as any;
      if (ptsArray && ptsArray.x && ptsArray.y && idx !== undefined) {
        // try to find a matching routine in score arrays by date
        const date = ptsArray.x[idx];
        const val = ptsArray.y[idx];
        // search in tra/dmt arrays depending on type
        const pool = type === "TRA" ? tra : dmt;
        const found = pool.find((p) => p.date === date && (p.score === val || p.score === Number(val)));
        if (found) showPopup(jsonData, found.routine, type, found.evMeta);
      }
    });
  }

  plotCompGraph(compTraces, "TRA Components Over Time", "TRA");

  // ── DMT component chart ──
  const dmtCompTraces: Partial<Plotly.PlotData>[] = [];
  if (dmtEx.length)
    dmtCompTraces.push({
      x: dmtEx.map((p) => p.date),
      y: dmtEx.map((p) => p.val),
      text: dmtEx.map((p) => p.label),
      customdata: dmtEx.map((p) => ({ routine: p.routine, evMeta: p.evMeta })),
      hoverinfo: "y+text",
      type: "scatter",
      mode: "markers",
      name: "EX",
      marker: { size: 8, color: "#10b981" },
    });
  if (dmtDif.length)
    dmtCompTraces.push({
      x: dmtDif.map((p) => p.date),
      y: dmtDif.map((p) => p.val),
      text: dmtDif.map((p) => p.label),
      customdata: dmtDif.map((p) => ({ routine: p.routine, evMeta: p.evMeta })),
      hoverinfo: "y+text",
      type: "scatter",
      mode: "markers",
      name: "DIF",
      marker: { size: 8, color: "#ec4899" },
    });

  plotCompGraph(dmtCompTraces, "DMT Components Over Time", "DMT");
}

/* ── Table view ────────────────────────────────────────── */

type ScoreRow = {
  date: string;
  event: string;
  type: "TRA" | "DMT";
  category: string;
  stage: string;
  score: number;
  ex: number;
  tof: number;
  dif: number;
  hd: number;
  routine: any;
  evMeta: any;
};

function buildRows(person: any): ScoreRow[] {
  const rows: ScoreRow[] = [];
  for (const evName in person.Events) {
    const ev = person.Events[evName];
    const date = ev.StartDate ? ev.StartDate.slice(0, 10) : "";
    for (const r of Object.values(ev.TRA_routines) as any[])
      rows.push({
        date,
        event: ev.Title,
        type: "TRA",
        category: r.Competition || "",
        stage: r.Stage || "",
        score: r.Score || 0,
        ex: r.EX_total || 0,
        tof: r.TOF || 0,
        dif: r.DIF || 0,
        hd: r.HD || 0,
        routine: r,
        evMeta: ev,
      });
    for (const r of Object.values(ev.DMT_routines) as any[])
      rows.push({
        date,
        event: ev.Title,
        type: "DMT",
        category: r.Competition || "",
        stage: r.Stage || "",
        score: r.Score || 0,
        ex: r.EX_total || 0,
        tof: 0,
        dif: r.DIF || 0,
        hd: 0,
        routine: r,
        evMeta: ev,
      });
  }
  return rows;
}

function downloadCSV(rows: ScoreRow[], name: string) {
  const headers = [
    "Date",
    "Event",
    "Type",
    "Category",
    "Stage",
    "Score",
    "EX",
    "TOF",
    "DIF",
    "HD",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.date,
        `"${r.event}"`,
        r.type,
        `"${r.category}"`,
        r.stage,
        r.score,
        r.ex || "",
        r.tof || "",
        r.dif || "",
        r.hd || "",
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `${name}_scores.csv`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

function showTableView(person: any, container: HTMLElement) {
  container.innerHTML = "";
  const allRows = buildRows(person);

  let sortKey: keyof ScoreRow = "date";
  let sortAsc = false;
  let filterText = "";
  let filterType = "All";
  let filterStage = "All";

  // Controls bar
  const controls = document.createElement("div");
  controls.className = "table-controls";
  controls.innerHTML = `
    <input type="text" id="tbl-filter-text" placeholder="Filter by event or category…" />
    <select id="tbl-filter-type">
      <option value="All">All types</option>
      <option value="TRA">TRA only</option>
      <option value="DMT">DMT only</option>
    </select>
    <select id="tbl-filter-stage">
      <option value="All">All stages</option>
      <option value="Qualification">Qualification</option>
      <option value="Final">Final</option>
    </select>
    <button id="tbl-download" class="btn btn-secondary btn-sm">Download CSV</button>`;
  container.appendChild(controls);

  // Table wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";
  container.appendChild(wrapper);

  const cols: { key: keyof ScoreRow; label: string; tra?: true }[] = [
    { key: "date", label: "Date" },
    { key: "event", label: "Event" },
    { key: "type", label: "Type" },
    { key: "category", label: "Category" },
    { key: "stage", label: "Stage" },
    { key: "score", label: "Score" },
    { key: "ex", label: "EX" },
    { key: "tof", label: "TOF", tra: true },
    { key: "dif", label: "DIF" },
    { key: "hd", label: "HD", tra: true },
  ];

  function getFiltered() {
    return allRows
      .filter(
        (r) =>
          (filterType === "All" || r.type === filterType) &&
          (filterStage === "All" || r.stage === filterStage) &&
          (!filterText ||
            r.event.toLowerCase().includes(filterText.toLowerCase()) ||
            r.category.toLowerCase().includes(filterText.toLowerCase())),
      )
      .sort((a, b) => {
        const av = a[sortKey],
          bv = b[sortKey];
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
        return sortAsc ? cmp : -cmp;
      });
  }

  function render() {
    const rows = getFiltered();
    wrapper.innerHTML = "";

    if (!rows.length) {
      wrapper.innerHTML = `<p class="table-empty">No scores match the current filters.</p>`;
      return;
    }

    const table = document.createElement("table");
    table.className = "scores-table";

    // Header
    const thead = table.createTHead();
    const hr = thead.insertRow();
    for (const col of cols) {
      const th = document.createElement("th");
      const isActive = col.key === sortKey;
      th.className = isActive ? "sort-active" : "";
      th.innerHTML = `${col.label} <span class="sort-arrow">${isActive ? (sortAsc ? "▲" : "▼") : "▽"}</span>`;
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        if (sortKey === col.key) sortAsc = !sortAsc;
        else {
          sortKey = col.key;
          sortAsc = false;
        }
        render();
      });
      hr.appendChild(th);
    }

    // Body
    const tbody = table.createTBody();
    for (const row of rows) {
      const tr = tbody.insertRow();
      tr.className = "score-row";
      tr.style.cursor = "pointer";
      tr.addEventListener("click", () =>
        showPopup(jsonData, row.routine, row.type, row.evMeta),
      );
      const fmt = (n: number) =>
        n > 0 ? n.toFixed(n % 1 === 0 ? 0 : 3).replace(/\.?0+$/, "") : "";
      const vals: string[] = [
        row.date,
        row.event,
        row.type,
        row.category,
        row.stage,
        String(row.score),
        fmt(row.ex),
        fmt(row.tof),
        fmt(row.dif),
        fmt(row.hd),
      ];
      vals.forEach((v) => {
        const td = tr.insertCell();
        td.textContent = v;
      });
    }

    wrapper.appendChild(table);
  }

  // Wire controls
  controls
    .querySelector<HTMLInputElement>("#tbl-filter-text")!
    .addEventListener("input", (e) => {
      filterText = (e.target as HTMLInputElement).value;
      render();
    });
  controls
    .querySelector<HTMLSelectElement>("#tbl-filter-type")!
    .addEventListener("change", (e) => {
      filterType = (e.target as HTMLSelectElement).value;
      render();
    });
  controls
    .querySelector<HTMLSelectElement>("#tbl-filter-stage")!
    .addEventListener("change", (e) => {
      filterStage = (e.target as HTMLSelectElement).value;
      render();
    });
  controls
    .querySelector<HTMLButtonElement>("#tbl-download")!
    .addEventListener("click", () =>
      downloadCSV(getFiltered(), `${person.GivenName}_${person.FamilyName}`),
    );

  render();
}

/* ── Search ──────────────────────────────────────────────── */

function getResults(name: string, club: string) {
  name = name.trim().toLowerCase();
  club = club.trim().toLowerCase();
  const results = [];
  for (const key of keys) {
    const person = jsonData[key];
    const fullName = `${person.GivenName} ${person.FamilyName}`.toLowerCase();
    const lastName = person.FamilyName.toLowerCase();
    const clubs = (person.Clubs as string[]).map((c) => c.toLowerCase());
    if (
      (name === "" || fullName.startsWith(name) || lastName.startsWith(name)) &&
      (club === "" || clubs.some((c) => c.startsWith(club)))
    ) {
      results.push(person);
    }
  }
  return sortPeople(results).slice(0, 20);
}

/* ── Autocomplete ──────────────────────────────────────── */

/** Generic autocomplete — attaches to an input inside an .ac-wrap div. */
function attachAutocomplete(
  input: HTMLInputElement,
  getSuggestions: (
    q: string,
  ) => { label: string; sub?: string; value: string }[],
  onSelect: (value: string) => void,
) {
  const wrap = input.closest(".ac-wrap") as HTMLElement;

  const dropdown = document.createElement("div");
  dropdown.className = "ac-dropdown";
  dropdown.style.display = "none";
  wrap.appendChild(dropdown);

  let activeIdx = -1;

  function close() {
    dropdown.style.display = "none";
    dropdown.innerHTML = "";
    activeIdx = -1;
  }

  function setActive(idx: number) {
    dropdown
      .querySelectorAll<HTMLElement>(".ac-item")
      .forEach((el, i) => el.classList.toggle("ac-active", i === idx));
    const el = dropdown.querySelectorAll<HTMLElement>(".ac-item")[idx];
    if (el) el.scrollIntoView({ block: "nearest" });
  }

  function render(query: string) {
    const suggestions = getSuggestions(query);
    dropdown.innerHTML = "";
    activeIdx = -1;
    if (!suggestions.length) {
      close();
      return;
    }

    for (const s of suggestions) {
      const item = document.createElement("div");
      item.className = "ac-item";
      // bold matching prefix
      const q = query.trim();
      const hl = s.label.toLowerCase().startsWith(q.toLowerCase())
        ? `<strong>${s.label.slice(0, q.length)}</strong>${s.label.slice(q.length)}`
        : s.label;
      item.innerHTML =
        `<span class="ac-name">${hl}</span>` +
        (s.sub ? `<span class="ac-club">${s.sub}</span>` : "");
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        input.value = s.value;
        close();
        onSelect(s.value);
      });
      dropdown.appendChild(item);
    }
    dropdown.style.display = "block";
  }

  input.addEventListener("input", () => render(input.value));
  input.addEventListener("blur", () => setTimeout(close, 150));
  input.addEventListener("keydown", (e) => {
    const items = dropdown.querySelectorAll<HTMLElement>(".ac-item");
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
      setActive(activeIdx);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
      setActive(activeIdx);
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      items[activeIdx].dispatchEvent(new MouseEvent("mousedown"));
    } else if (e.key === "Escape") {
      close();
    }
  });
}

// Name autocomplete: fills name box then fires search
const nameInput = document.getElementById("search-name") as HTMLInputElement;
const clubInput = document.getElementById("search-club") as HTMLInputElement;

attachAutocomplete(
  nameInput,
  (q) => {
    if (!q.trim() || !keys.length) return [];
    const ql = q.trim().toLowerCase();
    const clubFilter = clubInput.value.trim().toLowerCase();
    return keys
      .filter((k) => {
        const p = jsonData[k];
        const full = `${p.GivenName} ${p.FamilyName}`.toLowerCase();
        const last = p.FamilyName.toLowerCase();
        const clubs = (p.Clubs as string[]).map((c) => c.toLowerCase());
        return (
          (full.startsWith(ql) || last.startsWith(ql)) &&
          (clubFilter === "" || clubs.some((c) => c.startsWith(clubFilter)))
        );
      })
      .slice(0, 8)
      .map((k) => {
        const p = jsonData[k];
        return {
          label: `${p.GivenName} ${p.FamilyName}`,
          sub: (p.Clubs as string[]).filter(Boolean).join(", "),
          value: `${p.GivenName} ${p.FamilyName}`,
        };
      });
  },
  (_value) => {
    // After filling the box, trigger the search
    document.getElementById("search-button")!.click();
  },
);

// Club autocomplete: fills club box then fires search
attachAutocomplete(
  clubInput,
  (q) => {
    if (!q.trim() || !keys.length) return [];
    const ql = q.trim().toLowerCase();
    const seen = new Set<string>();
    const results: { label: string; value: string }[] = [];
    for (const k of keys) {
      for (const club of jsonData[k].Clubs as string[]) {
        if (!club || seen.has(club)) continue;
        if (club.toLowerCase().startsWith(ql)) {
          seen.add(club);
          results.push({ label: club, value: club });
        }
      }
      if (results.length >= 8) break;
    }
    return results;
  },
  (_value) => {
    document.getElementById("search-button")!.click();
  },
);

document.getElementById("search-button")?.addEventListener("click", () => {
  const name = (document.getElementById("search-name") as HTMLInputElement)
    .value;
  const club = (document.getElementById("search-club") as HTMLInputElement)
    .value;
  const results = getResults(name, club);
  const resDev = document.getElementById("results")!;
  resDev.innerHTML = "";

  if (results.length === 0) {
    resDev.innerHTML = `<p>No results found</p>`;
    return;
  }

  resDev.innerHTML = `<p>Showing ${results.length} result${results.length !== 1 ? "s" : ""}</p>`;
  for (const person of results) {
    const key = `${person.GivenName} ${person.FamilyName}`.toLowerCase();
    const btn = document.createElement("button");
    btn.className = "person";
    btn.innerHTML = `
      <span class="person-name">${person.GivenName} ${person.FamilyName}</span>
      <span class="person-club">${(person.Clubs as string[]).filter(Boolean).join(", ")}</span>`;
    btn.addEventListener("click", () => loadPersonDetails(key));
    resDev.appendChild(btn);
  }
});

/* Search toggle button */
document.getElementById("search-toggle-btn")?.addEventListener("click", () => {
  const searchWindow = document.getElementById("search-window") as HTMLElement;
  const toggleBtn = document.getElementById("search-toggle-btn") as HTMLElement;
  const isHidden = searchWindow.style.display === "none";

  if (isHidden) {
    searchWindow.style.display = "";
    toggleBtn.classList.remove("collapsed");
    localStorage.setItem("sportech_search_expanded", "true");
  } else {
    searchWindow.style.display = "none";
    toggleBtn.classList.add("collapsed");
    localStorage.setItem("sportech_search_expanded", "false");
  }
});

// Restore search box state from localStorage
const searchExpanded = localStorage.getItem("sportech_search_expanded") !== "false";
const searchWindow = document.getElementById("search-window") as HTMLElement | null;
const toggleBtn = document.getElementById("search-toggle-btn") as HTMLElement | null;

if (!searchExpanded && searchWindow) {
  searchWindow.style.display = "none";
  if (toggleBtn) toggleBtn.classList.add("collapsed");
}

// Keep toggle icon text in sync with state (only if toggle exists)
if (toggleBtn) {
  const toggleIcon = toggleBtn.querySelector('.toggle-icon') as HTMLElement | null;
  if (toggleIcon) toggleIcon.innerText = toggleBtn.classList.contains('collapsed') ? '>>' : '<<';

  // Update icon on clicks as well
  toggleBtn.addEventListener('click', () => {
    const icon = toggleBtn.querySelector('.toggle-icon') as HTMLElement | null;
    if (icon) icon.innerText = toggleBtn.classList.contains('collapsed') ? '>>' : '<<';
  });
}

/* Mobile sidebar toggle (header search) */
const mobileSearchBtn = document.getElementById('mobile-search-btn') as HTMLElement | null;
const mobileBackdrop = document.getElementById('mobile-sidebar-backdrop') as HTMLElement | null;
const sidebar = document.querySelector('.sidebar') as HTMLElement | null;

function setMobileSidebar(open: boolean) {
  if (!sidebar) return;
  if (open) {
    sidebar.classList.add('mobile-open');
    mobileBackdrop?.classList.add('visible');
    if (mobileBackdrop) mobileBackdrop.style.display = 'block';
    localStorage.setItem('sportech_sidebar_mobile_open', 'true');
  } else {
    sidebar.classList.remove('mobile-open');
    mobileBackdrop?.classList.remove('visible');
    if (mobileBackdrop) mobileBackdrop.style.display = 'none';
    localStorage.setItem('sportech_sidebar_mobile_open', 'false');
  }
}

// Open sidebar when mobile header search is tapped; focus real search input inside sidebar
mobileSearchBtn?.addEventListener('click', () => {
  setMobileSidebar(true);
  // focus the actual search input after opening
  setTimeout(() => {
    const input = document.getElementById('search-name') as HTMLInputElement | null;
    input?.focus();
  }, 250);
});

mobileBackdrop?.addEventListener('click', () => setMobileSidebar(false));

// Close mobile sidebar with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMobileSidebar(false);
});

// Restore mobile sidebar state
const mobileOpen = localStorage.getItem('sportech_sidebar_mobile_open') === 'true';
if (mobileOpen) setMobileSidebar(true);

export { getResults, totalPointsEver };
