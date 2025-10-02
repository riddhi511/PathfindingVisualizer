const grid = document.getElementById("grid");
const rows = 20, cols = 20;
let start = null, end = null;
let cells = [];

// Directions: 8 moves
const directions = [
  [1,0], [-1,0], [0,1], [0,-1],
  [1,1], [1,-1], [-1,1], [-1,-1]
];

// Terrain costs
function getCost(cell, dr, dc) {
  if (cell.classList.contains("grass")) return 2;
  if (cell.classList.contains("water")) return 5;
  return (dr !== 0 && dc !== 0) ? Math.SQRT2 : 1; // diagonal normal = √2
}

// Stats helpers
function updateSteps(count) {
  document.getElementById("steps").innerText = count;
}
function updatePathLength(count) {
  document.getElementById("pathLength").innerText = count;
}
function updateRuntime(ms) {
  document.getElementById("runtime").innerText = ms.toFixed(2) + " ms";
}

// Create grid
for (let r = 0; r < rows; r++) {
  let row = [];
  for (let c = 0; c < cols; c++) {
    let cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.row = r;
    cell.dataset.col = c;

    // Left click
    cell.addEventListener("click", e => toggleCell(cell));

    // Right click → cycle terrain
    cell.addEventListener("contextmenu", e => {
      e.preventDefault();
      if (cell !== start && cell !== end && !cell.classList.contains("wall")) {
        if (cell.classList.contains("grass")) {
          cell.classList.remove("grass");
          cell.classList.add("water");
        } else if (cell.classList.contains("water")) {
          cell.classList.remove("water");
        } else {
          cell.classList.add("grass");
        }
      }
    });

    grid.appendChild(cell);
    row.push(cell);
  }
  cells.push(row);
}

function toggleCell(cell) {
  if (!start) {
    start = cell;
    cell.classList.add("start");
  } else if (!end && cell !== start) {
    end = cell;
    cell.classList.add("end");
  } else if (cell !== start && cell !== end) {
    cell.classList.toggle("wall");
  }
}

function clearGrid() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells[r][c].className = "cell";
    }
  }
  start = null; end = null;
  updateSteps(0);
  updatePathLength(0);
  updateRuntime(0);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run selected algorithm
function runAlgorithm() {
  const algo = document.getElementById("algorithm").value;
  if (algo === "bfs") startBFS();
  else if (algo === "dijkstra") startDijkstra();
  else if (algo === "astar") startAStar();
  else if (algo === "dfs") startDFS();
  else if (algo === "greedy") startGreedy();
  else if (algo === "bidirectional") startBiBFS();
}

/* =========================
   ALGORITHMS
   ========================= */

// BFS
async function startBFS() {
  if (!start || !end) { alert("Set start and end first!"); return; }

  updateSteps(0); updatePathLength(0); updateRuntime(0);
  let steps = 0; let t0 = performance.now();

  let queue = [];
  let visited = new Set();
  let parent = {};

  let startPos = [parseInt(start.dataset.row), parseInt(start.dataset.col)];
  let endPos = [parseInt(end.dataset.row), parseInt(end.dataset.col)];

  queue.push(startPos);
  visited.add(startPos.toString());

  while (queue.length > 0) {
    let [r, c] = queue.shift();
    let cell = cells[r][c];

    if (cell !== start && cell !== end) {
      cell.classList.add("visited");
      steps++; updateSteps(steps);
      await sleep(20);
    }

    if (r === endPos[0] && c === endPos[1]) {
      reconstructPath(parent, startPos, endPos);
      updateRuntime(performance.now() - t0);
      return;
    }

    for (let [dr, dc] of directions) {
      let nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        let neighbor = cells[nr][nc];
        if (!neighbor.classList.contains("wall") && !visited.has([nr,nc].toString())) {
          queue.push([nr, nc]);
          visited.add([nr,nc].toString());
          parent[[nr,nc]] = [r,c];
        }
      }
    }
  }
  updateRuntime(performance.now() - t0);
  alert("No path found!");
}

// Dijkstra
async function startDijkstra() {
  if (!start || !end) { alert("Set start and end first!"); return; }

  updateSteps(0); updatePathLength(0); updateRuntime(0);
  let steps = 0; let t0 = performance.now();

  let dist = {};
  let parent = {};
  let pq = [];

  let startPos = [parseInt(start.dataset.row), parseInt(start.dataset.col)];
  let endPos = [parseInt(end.dataset.row), parseInt(end.dataset.col)];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dist[[r,c]] = Infinity;
    }
  }
  dist[startPos] = 0;
  pq.push({pos: startPos, dist: 0});

  while (pq.length > 0) {
    pq.sort((a,b) => a.dist - b.dist);
    let {pos} = pq.shift();
    let [r,c] = pos;

    let cell = cells[r][c];
    if (cell !== start && cell !== end) {
      cell.classList.add("visited");
      steps++; updateSteps(steps);
      await sleep(15);
    }

    if (r === endPos[0] && c === endPos[1]) {
      reconstructPath(parent, startPos, endPos);
      updateRuntime(performance.now() - t0);
      return;
    }

    for (let [dr, dc] of directions) {
      let nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        let neighbor = cells[nr][nc];
        if (!neighbor.classList.contains("wall")) {
          let cost = getCost(neighbor, dr, dc);
          let newDist = dist[[r,c]] + cost;
          if (newDist < dist[[nr,nc]]) {
            dist[[nr,nc]] = newDist;
            parent[[nr,nc]] = [r,c];
            pq.push({pos:[nr,nc], dist:newDist});
          }
        }
      }
    }
  }
  updateRuntime(performance.now() - t0);
  alert("No path found!");
}

// A*
async function startAStar() {
  if (!start || !end) { alert("Set start and end first!"); return; }

  updateSteps(0); updatePathLength(0); updateRuntime(0);
  let steps = 0; let t0 = performance.now();

  let gScore = {};
  let fScore = {};
  let parent = {};
  let openSet = [];

  let startPos = [parseInt(start.dataset.row), parseInt(start.dataset.col)];
  let endPos = [parseInt(end.dataset.row), parseInt(end.dataset.col)];

  function heuristic(a, b) {
    return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      gScore[[r,c]] = Infinity;
      fScore[[r,c]] = Infinity;
    }
  }
  gScore[startPos] = 0;
  fScore[startPos] = heuristic(startPos, endPos);
  openSet.push({pos: startPos, f: fScore[startPos]});

  while (openSet.length > 0) {
    openSet.sort((a,b) => a.f - b.f);
    let {pos} = openSet.shift();
    let [r,c] = pos;

    let cell = cells[r][c];
    if (cell !== start && cell !== end) {
      cell.classList.add("visited");
      steps++; updateSteps(steps);
      await sleep(15);
    }

    if (r === endPos[0] && c === endPos[1]) {
      reconstructPath(parent, startPos, endPos);
      updateRuntime(performance.now() - t0);
      return;
    }

    for (let [dr, dc] of directions) {
      let nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        let neighbor = cells[nr][nc];
        if (!neighbor.classList.contains("wall")) {
          let cost = getCost(neighbor, dr, dc);
          let tentative_g = gScore[[r,c]] + cost;
          if (tentative_g < gScore[[nr,nc]]) {
            parent[[nr,nc]] = [r,c];
            gScore[[nr,nc]] = tentative_g;
            fScore[[nr,nc]] = tentative_g + heuristic([nr,nc], endPos);
            if (!openSet.some(e => e.pos[0] === nr && e.pos[1] === nc)) {
              openSet.push({pos:[nr,nc], f:fScore[[nr,nc]]});
            }
          }
        }
      }
    }
  }
  updateRuntime(performance.now() - t0);
  alert("No path found!");
}

// DFS
async function startDFS() {
  if (!start || !end) { alert("Set start and end first!"); return; }
  updateSteps(0); updatePathLength(0); updateRuntime(0);
  let steps = 0; let t0 = performance.now();

  let visited = new Set();
  let parent = {};
  let stack = [];
  let startPos = [parseInt(start.dataset.row), parseInt(start.dataset.col)];
  let endPos = [parseInt(end.dataset.row), parseInt(end.dataset.col)];

  stack.push(startPos);

  while (stack.length > 0) {
    let [r,c] = stack.pop();
    if (visited.has([r,c].toString())) continue;
    visited.add([r,c].toString());

    let cell = cells[r][c];
    if (cell !== start && cell !== end) {
      cell.classList.add("visited");
      steps++; updateSteps(steps);
      await sleep(20);
    }

    if (r === endPos[0] && c === endPos[1]) {
      reconstructPath(parent, startPos, endPos);
      updateRuntime(performance.now() - t0);
      return;
    }

    for (let [dr,dc] of directions) {
      let nr=r+dr, nc=c+dc;
      if (nr>=0 && nr<rows && nc>=0 && nc<cols) {
        let neighbor=cells[nr][nc];
        if (!neighbor.classList.contains("wall") && !visited.has([nr,nc].toString())) {
          stack.push([nr,nc]);
          parent[[nr,nc]]=[r,c];
        }
      }
    }
  }
  updateRuntime(performance.now() - t0);
  alert("No path found!");
}

// Greedy Best-First
async function startGreedy() {
  if (!start || !end) { alert("Set start and end first!"); return; }
  updateSteps(0); updatePathLength(0); updateRuntime(0);
  let steps=0; let t0=performance.now();

  let parent={};
  let endPos=[parseInt(end.dataset.row), parseInt(end.dataset.col)];
  let startPos=[parseInt(start.dataset.row), parseInt(start.dataset.col)];
  let openSet=[{pos:startPos, h:heuristic(startPos,endPos)}];
  let visited=new Set();

  function heuristic(a,b) {
    return Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2);
  }

  while(openSet.length>0) {
    openSet.sort((a,b)=>a.h-b.h);
    let {pos} = openSet.shift();
    let [r,c]=pos;

    if(visited.has([r,c].toString())) continue;
    visited.add([r,c].toString());

    let cell=cells[r][c];
    if(cell!==start && cell!==end) {
      cell.classList.add("visited");
      steps++; updateSteps(steps);
      await sleep(20);
    }

    if(r===endPos[0] && c===endPos[1]) {
      reconstructPath(parent,startPos,endPos);
      updateRuntime(performance.now()-t0);
      return;
    }

    for(let [dr,dc] of directions) {
      let nr=r+dr, nc=c+dc;
      if(nr>=0 && nr<rows && nc>=0 && nc<cols) {
        let neighbor=cells[nr][nc];
        if(!neighbor.classList.contains("wall")) {
          parent[[nr,nc]]=[r,c];
          openSet.push({pos:[nr,nc],h:heuristic([nr,nc],endPos)});
        }
      }
    }
  }
  updateRuntime(performance.now()-t0);
  alert("No path found!");
}

// Bidirectional BFS
async function startBiBFS() {
  if (!start || !end) { alert("Set start and end first!"); return; }
  updateSteps(0); updatePathLength(0); updateRuntime(0);
  let steps=0; let t0=performance.now();

  let startPos=[parseInt(start.dataset.row), parseInt(start.dataset.col)];
  let endPos=[parseInt(end.dataset.row), parseInt(end.dataset.col)];
  let q1=[startPos], q2=[endPos];
  let visited1=new Map(), visited2=new Map();
  visited1.set(startPos.toString(), null);
  visited2.set(endPos.toString(), null);

  while(q1.length>0 && q2.length>0) {
    let meet = await expandLayer(q1, visited1, visited2, true);
    if(meet) {
      reconstructBiPath(meet, visited1, visited2);
      updateRuntime(performance.now()-t0);
      return;
    }
    meet = await expandLayer(q2, visited2, visited1, false);
    if(meet) {
      reconstructBiPath(meet, visited1, visited2);
      updateRuntime(performance.now()-t0);
      return;
    }
  }
  updateRuntime(performance.now()-t0);
  alert("No path found!");

  async function expandLayer(queue, visitedThis, visitedOther, forward) {
    let size=queue.length;
    while(size-->0) {
      let [r,c]=queue.shift();
      let cell=cells[r][c];
      if(cell!==start && cell!==end) {
        cell.classList.add("visited");
        steps++; updateSteps(steps);
        await sleep(15);
      }
      if(visitedOther.has([r,c].toString())) return [r,c];
      for(let [dr,dc] of directions) {
        let nr=r+dr, nc=c+dc;
        if(nr>=0&&nr<rows&&nc>=0&&nc<cols) {
          let neighbor=cells[nr][nc];
          if(!neighbor.classList.contains("wall") && !visitedThis.has([nr,nc].toString())) {
            queue.push([nr,nc]);
            visitedThis.set([nr,nc].toString(), [r,c]);
          }
        }
      }
    }
    return null;
  }

  async function reconstructBiPath(meet, v1, v2) {
    let path=[];
    let cur=meet;
    while(cur) { path.push(cur); cur=v1.get(cur.toString()); }
    path.reverse();
    cur=v2.get(meet.toString());
    while(cur) { path.push(cur); cur=v2.get(cur.toString()); }
    updatePathLength(path.length);
    for(let [r,c] of path) {
      let cell=cells[r][c];
      if(!cell.classList.contains("end") && !cell.classList.contains("start")) {
        cell.classList.add("path");
        await sleep(30);
      }
    }
  }
}

/* =========================
   PATH RECONSTRUCTION
   ========================= */
async function reconstructPath(parent, startPos, endPos) {
  let path = [];
  let curr = endPos;
  while (curr && curr.toString() !== startPos.toString()) {
    path.push(curr);
    curr = parent[curr];
  }
  path.reverse();
  updatePathLength(path.length);

  for (let [r,c] of path) {
    let cell = cells[r][c];
    if (!cell.classList.contains("end")) {
      cell.classList.add("path");
      await sleep(30);
    }
  }
}

/* =========================
   GUIDE MODAL LOGIC
   ========================= */
(function () {
  const guideModal = document.getElementById("guideModal");
  const guideBtn   = document.getElementById("guideBtn");
  const guideClose = guideModal ? guideModal.querySelector(".close") : null;
  const prevBtn    = document.getElementById("prevBtn");
  const nextBtn    = document.getElementById("nextBtn");
  const slides     = Array.from(document.querySelectorAll(".guide-slide"));

  if (!guideModal || !guideBtn || !prevBtn || !nextBtn || slides.length === 0) return;

  let currentSlide = 1;
  const totalSlides = slides.length;

  function showSlide(n) {
    slides.forEach((el, i) => {
      el.style.display = (i + 1 === n) ? "block" : "none";
    });
    prevBtn.style.display = (n === 1) ? "none" : "inline-block";
    nextBtn.textContent   = (n === totalSlides) ? "Finish" : "Next ➡";
  }

  guideBtn.addEventListener("click", () => {
    guideModal.style.display = "block";
    currentSlide = 1;
    showSlide(currentSlide);
  });
  guideClose && guideClose.addEventListener("click", () => guideModal.style.display = "none");
  window.addEventListener("click", (e) => {
    if (e.target === guideModal) guideModal.style.display = "none";
  });

  prevBtn.addEventListener("click", () => {
    if (currentSlide > 1) {
      currentSlide--;
      showSlide(currentSlide);
    }
  });
  nextBtn.addEventListener("click", () => {
    if (currentSlide < totalSlides) {
      currentSlide++;
      showSlide(currentSlide);
    } else {
      guideModal.style.display = "none";
      currentSlide = 1;
    }
  });
})();
