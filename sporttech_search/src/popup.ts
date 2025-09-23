// import plotly

import Plotly from "plotly.js-dist-min";
import { getResults } from "./main";


function showPopup(data: any, routine: any, type: string) {
  const popup = document.querySelector(".popup") as HTMLElement;
  popup.style.display = "block";

  let E1 =
    (routine.E1 || [0])
      .map((n: number) => String(n).padStart(3, " "))
      .join(",")
      .replace("Nan", " ") || "";
  let E2 =
    (routine.E2 || [0])
      .map((n: number) => String(n).padStart(3, " "))
      .join(",")
      .replace("Nan", " ") || "";
  let E3 =
    (routine.E3 || [0])
      .map((n: number) => String(n).padStart(3, " "))
      .join(",")
      .replace("Nan", " ") || "";
  let E4 =
    (routine.E4 || [0])
      .map((n: number) => String(n).padStart(3, " "))
      .join(",")
      .replace("Nan", " ") || "";

  let score = routine.Score || 0;
  let EX = routine.EX_total || 0;
  let DIF = routine.DIF || 0;
  

  let Category = routine.Competition || "";
  let Routine = routine.Stage || "";
  let html = `<h2>Details</h2>
    <p><strong>Type:</strong> ${type}</p>
    <p><strong>Category:</strong> ${Category}</p>
    <p><strong>Routine:</strong> ${Routine}</p>
    <p><strong>Score:</strong> ${score}</p>
    <p><strong>EX:</strong> ${EX}</p>
${
    (type === "TRA") ? `<p><strong>TOF:</strong> ${routine.TOF || ""}</p>
    <p><strong>HD:</strong> ${routine.HD || ""}</p>` : ""
}
    <p><strong>DIF:</strong> ${DIF}</p>
    <p><strong>E1:</strong> ${E1}</p>
    <p><strong>E2:</strong> ${E2}</p>
    <p><strong>E3:</strong> ${E3}</p>
    <p><strong>E4:</strong> ${E4}</p>

    <button id="close-popup">Close</button>
    <br />
    <h3>Filter Graph Data</h3>
    <br/>
        <label for="search-name">Filter by Name</label>
        <input type="text" id="filter-search-name" placeholder="Name" />
        <br />
        <label for="filter-name">Filter by Club:</label>
        <input type="text" id="filter-club" placeholder="Club" />
        <br />
        <button id="filter-graph-data">Update Graph Data</button>
    <br />
    <h4>Graphs</h4>

            <div id="score-graph"></div>
    <div id="tof-graph"></div>
    <div id="ex-graph"></div>
    <div id="dif-graph"></div>
    <div id="hd-graph"></div>
    `;
  popup.innerHTML = html;

    
    
    const filterBtn = document.getElementById("filter-graph-data") as HTMLElement;
    filterBtn.onclick = () => {
        const nameInput = document.getElementById("filter-search-name") as HTMLInputElement;
        const clubInput = document.getElementById("filter-club") as HTMLInputElement;

        let filteredData = getResults(nameInput.value, clubInput.value);
        plotGraphs(filteredData, routine, type, score);
    }

    filterBtn.click();

  const closeBtn = document.getElementById("close-popup") as HTMLElement;
  closeBtn.onclick = hidePopup;
}

function plotGraphs(data: any, routine: any, type: string, score: number) {

  let scores = [];
  let ex_scores = [];
  let tof_scores = [];
  let dif_scores = [];
  let hd_scores = [];

  for (let key of Object.keys(data)) {
    let person = data[key];
    for (let eventName in person.Events) {
      let event = person.Events[eventName];
      let routine_scores = Object.values((type === "TRA")? event.TRA_routines : event.DMT_routines);
      for (let scoreEntry of routine_scores) {
        const entry = scoreEntry as {
          HD?: number;
          TOF?: number;
          Score?: number;
          EX_total?: number;
          DIF?: number;
        };
        if (entry.Score !== undefined && entry.Score > 0) {
          scores.push(entry.Score);
        }

        if (entry.EX_total !== undefined && entry.EX_total > 0) {
            ex_scores.push(entry.EX_total || 0);
        }
          
          
          if (entry.DIF !== undefined && entry.DIF > 0) {
              dif_scores.push(entry.DIF || 0);
          }
          if (type === "TRA") {
            if (entry.TOF !== undefined && entry.TOF > 1) {
            tof_scores.push(entry.TOF || 0);
            }
            if (entry.HD !== undefined && entry.HD > 1) {
            hd_scores.push(entry.HD || 0);
        }
        }
        
      }
    }
  }


var trace: Partial<Plotly.PlotData> = {
  x: scores,
  type: "histogram",
  name: "Total Score",
  marker: { color: "blue" },
  opacity: 0.7,
xbins: { 
    start: Math.min(...scores), 
    end: Math.max(...scores), 
    size: 0.5 // set bin size to 0.1 for finer granularity
    },
};

var d = [trace];
Plotly.newPlot(
  "score-graph",
  d as Plotly.Data[],
  {
    title: { text: "Score Distribution" },
    xaxis: { title: { text: "Score" } },
    yaxis: { title: { text: "Count" } },
    shapes: [
      {
        type: "line",
        x0: score,
        x1: score,
        y0: 0,
        y1: 1,
        yref: "paper",
        line: { color: "red", width: 2, dash: "dash" },
      },
    ],
  },
  { staticPlot: true }
);
if (type === "TRA") {
  var trace2: Partial<Plotly.PlotData> = {
    x: tof_scores,
    type: "histogram",
    name: "TOF Score",
    marker: { color: "green" },
    opacity: 0.7,
    xbins: { 
    start: Math.min(...scores), 
    end: Math.max(...scores), 
    size: 0.5 // set bin size to 0.1 for finer granularity
    },
    };
    var d2 = [trace2];
    Plotly.newPlot(
        "tof-graph",
        d2 as Plotly.Data[],
        {
            title: { text: "TOF Distribution" },
            xaxis: { title: { text: "TOF" } },
            yaxis: { title: { text: "Count" } },
            shapes: [
                {
                    type: "line",
                    x0: routine.TOF || 0,
                    x1: routine.TOF || 0,
                    y0: 0,
                    y1: 1,
                    yref: "paper",
                    line: { color: "red", width: 2, dash: "dash" },
                },
            ],
        },
        { staticPlot: true }
    );
    var trace3: Partial<Plotly.PlotData> = {
        x: hd_scores,
        type: "histogram",
        name: "HD Score",
        marker: { color: "orange" },
        opacity: 0.7,
    };
    var d3 = [trace3];
    Plotly.newPlot(
        "hd-graph",
        d3 as Plotly.Data[],
        {
            title: { text: "HD Distribution" },
            xaxis: { title: { text: "HD" } },
            yaxis: { title: { text: "Count" } },
            shapes: [
                {
                    type: "line",
                    x0: routine.HD || 0,
                    x1: routine.HD || 0,
                    y0: 0,
                    y1: 1,
                    yref: "paper",
                    line: { color: "red", width: 2, dash: "dash" },
                },
            ],
        },
        { staticPlot: true }
    );
}
var trace4: Partial<Plotly.PlotData> = {
    x: ex_scores,
    type: "histogram",
    name: "EX Score",
    marker: { color: "purple" },
    opacity: 0.7,
};
var d4 = [trace4];
Plotly.newPlot(
    "ex-graph",
    d4 as Plotly.Data[],
    {
        title: { text: "EX Distribution" },
        xaxis: { title: { text: "EX" } },
        yaxis: { title: { text: "Count" } },
        shapes: [
            {
                type: "line",
                x0: routine.EX_total || 0,
                x1: routine.EX_total || 0,
                y0: 0,
                y1: 1,
                yref: "paper",
                line: { color: "red", width: 2, dash: "dash" },
            },
        ],
    },
    { staticPlot: true }
);
var trace5: Partial<Plotly.PlotData> = {
    x: dif_scores,
    type: "histogram",
    name: "DIF Score",
    marker: { color: "pink" },
    xbins: { 
    start: Math.min(...dif_scores), 
    end: Math.max(...dif_scores), 
    size: 0.5 // set bin size to 0.1 for finer granularity
    },
    opacity: 0.7,
};
var d5 = [trace5];
Plotly.newPlot(
    "dif-graph",
    d5 as Plotly.Data[],
    {
        title: { text: "DIF Distribution" },
        xaxis: { title: { text: "DIF" } },
        yaxis: { title: { text: "Count" } },
        shapes: [
            {
                type: "line",
                x0: routine.DIF || 0,
                x1: routine.DIF || 0,
                y0: 0,
                y1: 1,
                yref: "paper",
                line: { color: "red", width: 2, dash: "dash" },
            },
        ],
    },
    { staticPlot: true }
);

}


function hidePopup() {
  const popup = document.querySelector(".popup") as HTMLElement;
  popup.style.display = "none";
  popup.innerHTML = "";
}

export { showPopup };

