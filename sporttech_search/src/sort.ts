import { totalPointsEver } from "./main";

function sortPeople(people: any[]) {
    //    <select name="Sort By" id="sort">
    //       <option value="HighestTotal">Highest Total</option>
    //       <option value="HighestTRA">Highest Tramp Score</option>
    //       <option value="HighestTRA_EX">Highest Tramp EX</option>
    //       <option value="HighestTRA_HD">Highest Tramp HD</option>
    //       <option value="HighestTRA_DIF">Highest Tramp DIF</option>
    //       <option value="HighestTRA_TOF">Highest Tramp TOF</option>
    //       <option value="HighestDMT_EX">Highest DMT EX</option>
    //       <option value="HighestDMT_DIF">Highest DMT DIF</option>
    //       <option value="HighestDMT">Highest DMT Score</option>
    //     </select>

        let selector = (document.getElementById("sort") as HTMLSelectElement).value;
        console.log("Sorting by:", selector);
        if (selector === "HighestTRA") {
          people.sort((a, b) => {
            let aMax = 0;
            let bMax = 0;
            for (let eventName in a.Events) {
              let event = a.Events[eventName];
              let tra_scores = Object.values(event.TRA_routines);
              for (let scoreEntry of tra_scores) {
                aMax = Math.max(aMax, (scoreEntry as { Score?: number }).Score || 0);
              }
            }
            for (let eventName in b.Events) {
              let event = b.Events[eventName];
              let tra_scores = Object.values(event.TRA_routines);
              for (let scoreEntry of tra_scores) {
                bMax = Math.max(bMax, (scoreEntry as { Score?: number }).Score || 0);
              }
            }
            return bMax - aMax;
          });
        } else if (selector === "HighestDMT") {
          people.sort((a, b) => {
            let aMax = 0;
            let bMax = 0;
            for (let eventName in a.Events) {
              let event = a.Events[eventName];
              let dmt_scores = Object.values(event.DMT_routines);
              for (let scoreEntry of dmt_scores) {
                aMax = Math.max(aMax, (scoreEntry as { Score?: number }).Score || 0);
              }
            }
            for (let eventName in b.Events) {
              let event = b.Events[eventName];
              let dmt_scores = Object.values(event.DMT_routines);
              for (let scoreEntry of dmt_scores) {
                bMax = Math.max(bMax, (scoreEntry as { Score?: number }).Score || 0);
              }
            }
            return bMax - aMax;
          });
        } else if (selector === "HighestTotal") {
          people.sort((a, b) => totalPointsEver(b) - totalPointsEver(a));

        } else if (selector === "HighestTRA_EX") {
          people.sort((a, b) => {
            let aMax = 0;
            let bMax = 0;
            for (let eventName in a.Events) {
              let event = a.Events[eventName];
              let tra_scores = Object.values(event.TRA_routines);
              for (let scoreEntry of tra_scores) {
                aMax = Math.max(aMax, (scoreEntry as { EX_total?: number }).EX_total || 0);
              }
            }
            for (let eventName in b.Events) {
              let event = b.Events[eventName];
              let tra_scores = Object.values(event.TRA_routines);
              for (let scoreEntry of tra_scores) {
                bMax = Math.max(bMax, (scoreEntry as { EX_total?: number }).EX_total || 0);
              }
            }
            return bMax - aMax;
          });
        } else if (selector === "HighestTRA_HD") {
          people.sort((a, b) => {
            let aMax = 0;
            let bMax = 0;
            for (let eventName in a.Events) {
              let event = a.Events[eventName];
              let tra_scores = Object.values(event.TRA_routines);
              for (let scoreEntry of tra_scores) {
                aMax = Math.max(aMax, (scoreEntry as { HD?: number }).HD || 0);
              }
            }
            for (let eventName in b.Events) {
              let event = b.Events[eventName];
              let tra_scores = Object.values(event.TRA_routines);
              for (let scoreEntry of tra_scores) {
                bMax = Math.max(bMax, (scoreEntry as { HD?: number }).HD || 0);
              }
            }
            return bMax - aMax;
          });
        } else if (selector === "HighestTRA_TOF") {
          people.sort((a, b) => {
            let aMax = 0;
            let bMax = 0;
            for (let eventName in a.Events) {
              let event = a.Events[eventName];
              let tra_scores = Object.values(event.TRA_routines);
              for (let scoreEntry of tra_scores) {
                aMax = Math.max(aMax, (scoreEntry as { TOF?: number }).TOF || 0);
              }
            }
            for (let eventName in b.Events) {
              let event = b.Events[eventName];
              let tra_scores = Object.values(event.TRA_routines);
              for (let scoreEntry of tra_scores) {
                bMax = Math.max(bMax, (scoreEntry as { TOF?: number }).TOF || 0);
              }
            }
            return bMax - aMax;
          });
        } else if (selector === "HighestDMT_EX") {
          people.sort((a, b) => {
            let aMax = 0;
            let bMax = 0;
            for (let eventName in a.Events) {
              let event = a.Events[eventName];
              let dmt_scores = Object.values(event.DMT_routines);
              for (let scoreEntry of dmt_scores) {
                aMax = Math.max(aMax, (scoreEntry as { EX_total?: number }).EX_total || 0);
              }
            }
            for (let eventName in b.Events) {
              let event = b.Events[eventName];
              let dmt_scores = Object.values(event.DMT_routines);
              for (let scoreEntry of dmt_scores) {
                bMax = Math.max(bMax, (scoreEntry as { EX_total?: number }).EX_total || 0);
              }
            }
            return bMax - aMax;
          });
        } else if (selector === "HighestDMT_DIF") {
          people.sort((a, b) => {
            let aMax = 0;
            let bMax = 0;
            for (let eventName in a.Events) {
              let event = a.Events[eventName];
              let dmt_scores = Object.values(event.DMT_routines);
                for (let scoreEntry of dmt_scores) {
                    aMax = Math.max(aMax, (scoreEntry as { DIF?: number }).DIF || 0);
                }
            }
            for (let eventName in b.Events) {
              let event = b.Events[eventName];
              let dmt_scores = Object.values(event.DMT_routines);
                for (let scoreEntry of dmt_scores) {
                    bMax = Math.max(bMax, (scoreEntry as { DIF?: number }).DIF || 0);
                }
            }
            return bMax - aMax;
            }
        );
        

        } else if (selector === "HighestTRA_DIF") {
          people.sort((a, b) => {
            let aMax = 0;
            let bMax = 0;
            for (let eventName in a.Events) {
                let event = a.Events[eventName];
                let tra_scores = Object.values(event.TRA_routines);
                for (let scoreEntry of tra_scores) {
                    aMax = Math.max(aMax, (scoreEntry as { DIF?: number }).DIF || 0);
                }
            }
            for (let eventName in b.Events) {
                let event = b.Events[eventName];
                let tra_scores = Object.values(event.TRA_routines);
                for (let scoreEntry of tra_scores) {
                    bMax = Math.max(bMax, (scoreEntry as { DIF?: number }).DIF || 0);
                }
            }
            return bMax - aMax;
          }
        );
        }

        return people;
}

export { sortPeople };

