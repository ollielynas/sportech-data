import Plotly from "plotly.js-dist-min";
import { getResults } from "./main";

// --- Category matching helpers ---
function normalizeCategoryStr(s?: string): string {
  if (!s) return "";
  return s
    .replace(/&amp;/g, "and")
    .toLowerCase()
    .replace(/[^a-z0-9+\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameCategory(a?: string, b?: string) {
  return normalizeCategoryStr(a) === normalizeCategoryStr(b);
}

function judgeRow(label: string, values: number[] | undefined): string {
  if (!values || values.length === 0) return "";
  const cells = values
    .map((v) => `<span class="judge-score-val">${v ?? "—"}</span>`)
    .join("");
  return `
    <div class="judge-row">
      <span class="judge-label">${label}</span>
      <div class="judge-scores">${cells}</div>
    </div>`;
}

function stat(label: string, value: string | number): string {
  return `
    <div class="popup-stat">
      <div class="popup-stat-value">${value !== undefined && value !== "" ? value : "—"}</div>
      <div class="popup-stat-label">${label}</div>
    </div>`;
}

function showPopup(
  _data: any,
  routine: any,
  type: string,
  eventMeta?: { Title?: string; StartDate?: string },
) {
  const popup = document.getElementById("popup") as HTMLElement;
  const overlay = document.getElementById("popup-overlay") as HTMLElement;
  popup.style.display = "flex";
  overlay.style.display = "block";

  const score = routine.Score ?? 0;
  const EX = routine.EX_total ? routine.EX_total.toFixed(1) : "0";
  const DIF = routine.DIF ? routine.DIF.toFixed(1) : "0";
  const TOF = routine.TOF ? routine.TOF.toFixed(3) : "";
  const HD = routine.HD ? routine.HD.toFixed(1) : "";
  const cat = routine.Competition || "";
  const stage = routine.Stage || "";

  const traSuffix = type === "TRA" ? stat("TOF", TOF) + stat("HD", HD) : "";

  const evTitle = eventMeta?.Title ?? "";
  const evDate = eventMeta?.StartDate
    ? " · " + eventMeta.StartDate.slice(0, 10)
    : "";

  popup.innerHTML = `
    <div class="popup-header">
      <h2>${type} — ${cat} · ${stage}${evTitle ? " <span style='opacity:0.6;font-weight:400;'>" + evTitle + evDate + "</span>" : ""}</h2>
      <button id="close-popup" class="btn btn-ghost btn-sm"
        style="color:#fff;border-color:rgba(255,255,255,0.25);">✕ Close</button>
    </div>

    <div class="popup-body">
      <div class="popup-stats">
        ${stat("Score", score)}
        ${stat("EX", EX)}
        ${traSuffix}
        ${stat("DIF", DIF)}
      </div>

      <div class="judge-table">
        ${judgeRow("E1", routine.E1)}
        ${judgeRow("E2", routine.E2)}
        ${judgeRow("E3", routine.E3)}
        ${judgeRow("E4", routine.E4)}
      </div>

      <div class="popup-filter">
        <div class="field">
          <label>Filter by Name</label>
          <input type="text" id="filter-search-name" placeholder="Name…" />
        </div>
        <div class="field">
          <label>Filter by Club</label>
          <input type="text" id="filter-club" placeholder="Club…" />
        </div>
        <div class="field">
          <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="filter-same-category" checked /> Only compare same category</label>
        </div>
        <button id="filter-graph-data" class="btn btn-primary btn-sm">Update Graphs</button>
      </div>

      <div class="graphs-grid">
        <div class="graph-card" id="score-graph"></div>
        ${type === "TRA" ? '<div class="graph-card" id="tof-graph"></div>' : ""}
        <div class="graph-card" id="ex-graph"></div>
        ${type === "TRA" ? '<div class="graph-card" id="hd-graph"></div>' : ""}
        <div class="graph-card" id="dif-graph"></div>
      </div>
    </div>`;

  document.getElementById("filter-graph-data")!.onclick = () => {
    const nameVal = (
      document.getElementById("filter-search-name") as HTMLInputElement
    ).value;
    const clubVal = (document.getElementById("filter-club") as HTMLInputElement)
      .value;
    const sameCat = (
      document.getElementById("filter-same-category") as HTMLInputElement
    ).checked;
    plotGraphs(getResults(nameVal, clubVal), routine, type, score, sameCat);
  };

  // Auto-plot with empty filters (compare same category by default)
  plotGraphs(getResults("", ""), routine, type, score, true);

  document.getElementById("close-popup")!.onclick = hidePopup;
  overlay.onclick = hidePopup;
}

function showRoutinePopup(group: any) {
  const popup = document.getElementById("popup") as HTMLElement;
  const overlay = document.getElementById("popup-overlay") as HTMLElement;
  popup.style.display = "flex";
  overlay.style.display = "block";

  const occurrences = [...group.occurrences].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const hasTof = occurrences.some((o) => o.tof > 0);

  popup.innerHTML = `
    <div class="popup-header">
      <h2>${group.type} Routine · DIF ${group.difficultyKey}</h2>
      <button id="close-popup" class="btn btn-ghost btn-sm"
        style="color:#fff;border-color:rgba(255,255,255,0.25);">Close</button>
    </div>

    <div class="popup-body">
      <div class="routine-popup-subtitle">Grouped by exact difficulty value.</div>
      <div class="popup-stats">
        ${stat("Routines", group.occurrenceCount)}
        ${stat("First Date", group.firstDate || "—")}
        ${stat("Last Date", group.lastDate || "—")}
        ${stat("Avg Score", group.avgScore ? group.avgScore.toFixed(3) : "—")}
        ${stat("Avg DIF", group.avgDifficulty ? group.avgDifficulty.toFixed(3) : "—")}
        ${stat("Avg TOF", group.avgTof ? group.avgTof.toFixed(3) : "—")}
      </div>

      <div class="graphs-grid routine-graphs-grid">
        <div class="graph-card" id="routine-score-graph"></div>
        <div class="graph-card" id="routine-ex-graph"></div>
        ${hasTof ? '<div class="graph-card" id="routine-hd-graph"></div>' : ""}
        ${hasTof ? '<div class="graph-card" id="routine-tof-graph"></div>' : ""}
        <div class="graph-card routine-box-card" id="routine-skills-graph"></div>
      </div>

      ${
        group.competitions.length
          ? `
      <div class="routine-competitions-list">
        <div class="competitions-label">Competitions</div>
        <div class="competitions-items">${group.competitions.map((comp: any) => `<div class="competition-item">${comp.event} - ${comp.competition}</div>`).join("")}</div>
      </div>
      `
          : ""
      }
    </div>`;

  const scoreTrace: Partial<Plotly.PlotData> = {
    x: occurrences.map((o) => o.date),
    y: occurrences.map((o) => o.score),
    text: occurrences.map((o) => `${o.event}<br>Click for details`),
    hoverinfo: "y+text",
    type: "scatter",
    mode: "lines+markers",
    marker: { size: 8, color: "#6366f1" },
    line: { color: "#6366f1", width: 2 },
    name: "Score",
  };

  Plotly.newPlot(
    "routine-score-graph",
    [scoreTrace] as Plotly.Data[],
    {
      ...LAYOUT_BASE,
      title: { text: "Score Trend", font: { size: 13, color: "#0f172a" } },
      xaxis: { title: { text: "Date" } },
      yaxis: { title: { text: "Score" } },
      dragmode: false as any,
    } as any as Plotly.Layout,
    {
      responsive: true,
      scrollZoom: false,
      displaylogo: false,
      modeBarButtonsToRemove: [
        "zoom2d",
        "pan2d",
        "select2d",
        "lasso2d",
        "zoomIn2d",
        "zoomOut2d",
        "autoScale2d",
        "resetScale2d",
      ],
    },
  );

  const scoreContainer = document.getElementById(
    "routine-score-graph",
  ) as HTMLElement;
  scoreContainer.addEventListener("plotly_click", (data: any) => {
    const ev = data.event;
    const clientX = ev?.clientX;
    const clientY = ev?.clientY;
    const pointIndex = data.points?.[0]?.pointNumber;
    if (pointIndex !== undefined && occurrences[pointIndex]) {
      const occ = occurrences[pointIndex];
      // on mobile require a confirmation tap
      (window as any).confirmTap
        ? (window as any).confirmTap(
            () => showPopup(null, occ.routine, occ.type, occ.evMeta),
            clientX,
            clientY,
          )
        : showPopup(null, occ.routine, occ.type, occ.evMeta);
    }
  });

  const exTrace: Partial<Plotly.PlotData> = {
    x: occurrences.map((o) => o.date),
    y: occurrences.map((o) => o.ex),
    text: occurrences.map((o) => `${o.event}<br>Click for details`),
    hoverinfo: "y+text",
    type: "scatter",
    mode: "lines+markers",
    marker: { size: 8, color: "#10b981" },
    line: { color: "#10b981", width: 2 },
    name: "EX",
  };

  Plotly.newPlot(
    "routine-ex-graph",
    [exTrace] as Plotly.Data[],
    {
      ...LAYOUT_BASE,
      title: { text: "EX Trend", font: { size: 13, color: "#0f172a" } },
      xaxis: { title: { text: "Date" } },
      yaxis: { title: { text: "EX" } },
      dragmode: false as any,
    } as any as Plotly.Layout,
    {
      responsive: true,
      scrollZoom: false,
      displaylogo: false,
      modeBarButtonsToRemove: [
        "zoom2d",
        "pan2d",
        "select2d",
        "lasso2d",
        "zoomIn2d",
        "zoomOut2d",
        "autoScale2d",
        "resetScale2d",
      ],
    },
  );

  const exContainer = document.getElementById(
    "routine-ex-graph",
  ) as HTMLElement;
  exContainer.addEventListener("plotly_click", (data: any) => {
    const pointIndex = data.points?.[0]?.pointNumber;
    if (pointIndex !== undefined && occurrences[pointIndex]) {
      const occ = occurrences[pointIndex];
      showPopup(null, occ.routine, occ.type, occ.evMeta);
    }
  });

  if (hasTof) {
    const hdTrace: Partial<Plotly.PlotData> = {
      x: occurrences.map((o) => o.date),
      y: occurrences.map((o) => o.hd),
      text: occurrences.map((o) => `${o.event}<br>Click for details`),
      hoverinfo: "y+text",
      type: "scatter",
      mode: "lines+markers",
      marker: { size: 8, color: "#ec4899" },
      line: { color: "#ec4899", width: 2 },
      name: "HD",
    };

    Plotly.newPlot(
      "routine-hd-graph",
      [hdTrace] as Plotly.Data[],
      {
        ...LAYOUT_BASE,
        title: { text: "HD Trend", font: { size: 13, color: "#0f172a" } },
        xaxis: { title: { text: "Date" } },
        yaxis: { title: { text: "HD" } },
        dragmode: false as any,
      } as any as Plotly.Layout,
      {
        responsive: true,
        scrollZoom: false,
        displaylogo: false,
        modeBarButtonsToRemove: [
          "zoom2d",
          "pan2d",
          "select2d",
          "lasso2d",
          "zoomIn2d",
          "zoomOut2d",
          "autoScale2d",
          "resetScale2d",
        ],
      },
    );

    const hdContainer = document.getElementById(
      "routine-hd-graph",
    ) as HTMLElement;
    hdContainer.addEventListener("plotly_click", (data: any) => {
      const pointIndex = data.points?.[0]?.pointNumber;
      if (pointIndex !== undefined && occurrences[pointIndex]) {
        const occ = occurrences[pointIndex];
        showPopup(null, occ.routine, occ.type, occ.evMeta);
      }
    });

    const tofTrace: Partial<Plotly.PlotData> = {
      x: occurrences.map((o) => o.date),
      y: occurrences.map((o) => o.tof),
      text: occurrences.map((o) => `${o.event}<br>Click for details`),
      hoverinfo: "y+text",
      type: "scatter",
      mode: "lines+markers",
      marker: { size: 8, color: "#f59e0b" },
      line: { color: "#f59e0b", width: 2 },
      name: "TOF",
    };

    Plotly.newPlot(
      "routine-tof-graph",
      [tofTrace] as Plotly.Data[],
      {
        ...LAYOUT_BASE,
        title: { text: "TOF Trend", font: { size: 13, color: "#0f172a" } },
        xaxis: { title: { text: "Date" } },
        yaxis: { title: { text: "TOF" } },
        dragmode: false as any,
      } as any as Plotly.Layout,
      {
        responsive: true,
        scrollZoom: false,
        displaylogo: false,
        modeBarButtonsToRemove: [
          "zoom2d",
          "pan2d",
          "select2d",
          "lasso2d",
          "zoomIn2d",
          "zoomOut2d",
          "autoScale2d",
          "resetScale2d",
        ],
      },
    );

    const tofContainer = document.getElementById(
      "routine-tof-graph",
    ) as HTMLElement;
    tofContainer.addEventListener("plotly_click", (data: any) => {
      const pointIndex = data.points?.[0]?.pointNumber;
      if (pointIndex !== undefined && occurrences[pointIndex]) {
        const occ = occurrences[pointIndex];
        showPopup(null, occ.routine, occ.type, occ.evMeta);
      }
    });
  }

  const palette = [
    "#6366f1",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#8b5cf6",
    "#06b6d4",
    "#ef4444",
    "#14b8a6",
    "#a855f7",
    "#f97316",
    "#64748b",
    "#0f766e",
  ];

  const boxTraces = group.skillLabels
    .filter((label: string) => group.skillSeries[label]?.length)
    .map((label: string, index: number) => ({
      y: group.skillSeries[label],
      type: "box",
      name: label,
      boxpoints: false,
      marker: { color: palette[index % palette.length] },
      line: { color: palette[index % palette.length] },
      fillcolor: palette[index % palette.length],
      opacity: 0.85,
      quartilemethod: "exclusive",
    }));

  const meanTrace: Partial<Plotly.PlotData> = {
    x: group.skillLabels.filter(
      (label: string) => group.skillSeries[label]?.length,
    ),
    y: group.skillLabels
      .filter((label: string) => group.skillSeries[label]?.length)
      .map((label: string) => group.skillAverages[label]),
    type: "scatter",
    mode: "lines+markers",
    name: "Average",
    line: { color: "#0f172a", width: 2.5, dash: "solid" },
    marker: { size: 8, color: "#0f172a", symbol: "diamond" },
  };

  Plotly.newPlot(
    "routine-skills-graph",
    [...boxTraces, meanTrace] as Plotly.Data[],
    {
      ...LAYOUT_BASE,
      title: {
        text: "Skill Execution Box Plot",
        font: { size: 13, color: "#0f172a" },
      },
      xaxis: { title: { text: "Skill" } },
      yaxis: { title: { text: "Execution score" } },
      boxmode: "group",
      dragmode: false as any,
    } as any as Plotly.Layout,
    {
      responsive: true,
      scrollZoom: false,
      displaylogo: false,
      modeBarButtonsToRemove: [
        "zoom2d",
        "pan2d",
        "select2d",
        "lasso2d",
        "zoomIn2d",
        "zoomOut2d",
        "autoScale2d",
        "resetScale2d",
      ],
    },
  );

  document.getElementById("close-popup")!.onclick = hidePopup;
  overlay.onclick = hidePopup;
}

/* ── Graph helpers ───────────────────────────────────────── */

const LAYOUT_BASE: Partial<Plotly.Layout> = {
  margin: { t: 36, r: 12, b: 40, l: 40 },
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { family: "Inter, Segoe UI, sans-serif", size: 11, color: "#64748b" },
};

function histogram(
  containerId: string,
  values: number[],
  markerColor: string,
  title: string,
  xLabel: string,
  markerLine: number,
) {
  if (!values.length || !document.getElementById(containerId)) return;

  const trace: Partial<Plotly.PlotData> = {
    x: values,
    type: "histogram",
    marker: { color: markerColor, opacity: 0.8 },
  };
  (trace as any).nbinsx = Math.min(
    30,
    Math.max(100, Math.ceil(Math.sqrt(values.length)) + 2),
  );

  Plotly.newPlot(
    containerId,
    [trace] as Plotly.Data[],
    {
      ...LAYOUT_BASE,
      title: { text: title, font: { size: 13, color: "#0f172a" } },
      xaxis: { title: { text: xLabel } },
      yaxis: { title: { text: "Count" } },
      shapes: [
        {
          type: "line",
          x0: markerLine,
          x1: markerLine,
          y0: 0,
          y1: 1,
          yref: "paper",
          line: { color: "#ef4444", width: 2, dash: "dash" },
        },
      ],
    },
    { staticPlot: true, responsive: true },
  );
}

function plotGraphs(
  data: any,
  routine: any,
  type: string,
  score: number,
  sameCategoryOnly: boolean = true,
) {
  const scores: number[] = [];
  const exScores: number[] = [];
  const tofScores: number[] = [];
  const difScores: number[] = [];
  const hdScores: number[] = [];

  for (const person of data) {
    for (const evName in person.Events) {
      const ev = person.Events[evName];
      const routines = Object.values(
        type === "TRA" ? ev.TRA_routines : ev.DMT_routines,
      ) as any[];
      for (const r of routines) {
        // If user requested same-category comparison, skip routines not in the
        // same (fuzzy) Competition+Stage as the selected routine
        if (sameCategoryOnly) {
          const a = `${r.Competition || ""}`;
          const b = `${routine.Competition || ""}`;
          if (!sameCategory(a, b)) {
            continue;
          }
        }

        if (r.Score > 0) scores.push(r.Score);
        if (r.EX_total > 0) exScores.push(r.EX_total);
        if (r.DIF > 0) difScores.push(r.DIF);
        if (type === "TRA") {
          if (r.TOF > 1) tofScores.push(r.TOF);
          if (r.HD > 1) hdScores.push(r.HD);
        }
      }
    }
  }

  histogram(
    "score-graph",
    scores,
    "#6366f1",
    "Score Distribution",
    "Score",
    score,
  );
  histogram(
    "ex-graph",
    exScores,
    "#10b981",
    "EX Distribution",
    "EX",
    routine.EX_total || 0,
  );
  histogram(
    "dif-graph",
    difScores,
    "#ec4899",
    "DIF Distribution",
    "DIF",
    routine.DIF || 0,
  );

  if (type === "TRA") {
    histogram(
      "tof-graph",
      tofScores,
      "#f59e0b",
      "TOF Distribution",
      "TOF",
      routine.TOF || 0,
    );
    histogram(
      "hd-graph",
      hdScores,
      "#8b5cf6",
      "HD Distribution",
      "HD",
      routine.HD || 0,
    );
  }
}

function hidePopup() {
  const popup = document.getElementById("popup") as HTMLElement;
  const overlay = document.getElementById("popup-overlay") as HTMLElement;
  popup.style.display = "none";
  popup.innerHTML = "";
  overlay.style.display = "none";
  overlay.onclick = null;
}

export { showPopup, showRoutinePopup };
