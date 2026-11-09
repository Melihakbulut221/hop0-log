/* Hop-0 site: the life twin. A console that flies the vehicle through recorded flights and keeps the wear account,
 * and a remaining-life chart. Numbers come from research/life (600 HIL flights of the current flight software, the
 * hardest scenario). No dependencies; prefers-reduced-motion shows the final state. */
(function () {
  "use strict";
  var host = document.getElementById("life-console");
  if (!host) return;
  var D = JSON.parse(document.getElementById("life-data").textContent);
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";
  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  var ITEMS = [
    ["shock", "Shock absorbers", "service every 50 landings (policy)"],
    ["chamber", "Chamber hot wall", "low-cycle fatigue"],
    ["battery", "Pump battery", "capacity fade"],
    ["actuators", "Gimbal actuators", "travel"],
    ["structure", "Hull, welded zones", "fatigue"],
    ["honeycomb", "Honeycomb cartridges", "crush"],
    ["strut", "Leg struts", "fatigue"]
  ];
  var counter = host.querySelector(".lc-n"), alive = host.querySelector(".lc-alive"), log = host.querySelector(".lc-log"),
      bars = host.querySelector(".lc-bars"), btn = host.querySelector(".lc-play");
  var rows = ITEMS.map(function (it) {
    var r = document.createElement("div"); r.className = "lc-row";
    r.innerHTML = '<span class="lc-name">' + it[1] + '<em>' + it[2] + '</em></span><span class="lc-track"><i></i></span>' +
      '<span class="lc-val">0%</span><span class="lc-rep"></span>';
    bars.appendChild(r);
    return { key: it[0], name: it[1], fill: r.querySelector("i"), val: r.querySelector(".lc-val"), rep: r.querySelector(".lc-rep"), row: r };
  });
  var N_END = 1500;
  function fmt(p) { return p < 0.1 ? (p > 0 ? "<0.1%" : "0%") : (p < 10 ? p.toFixed(1) : Math.round(p)) + "%"; }
  function state(n) {             // wear after n flights (mean per-flight increments), with replacements
    var events = [];
    rows.forEach(function (r) {
      var d = D.per_flight[r.key] * n, reps = Math.floor(d + 1e-9);
      var cur = d - reps;
      r.fill.style.width = (100 * Math.min(1, cur)) + "%";
      r.val.textContent = fmt(100 * cur);
      r.rep.textContent = reps ? (r.key === "shock" ? "serviced ×" + reps : "replaced ×" + reps) : "";
      r.row.classList.toggle("hot", cur > 0.8);
      if (reps) events.push([r.key, reps]);
    });
    counter.textContent = n.toLocaleString("en-US");
    alive.textContent = (100 * Math.pow(1 - D.p_loss, n)).toFixed(n < 100 ? 1 : 0) + "%";
    var ch = rows[1], last = "";
    if (n >= D.median.chamber) last = "Flight " + D.median.chamber.toLocaleString("en-US") + ": first chamber replacement.";
    else if (n >= 50) last = "Every 50 landings: shock service. Nothing else is close to its limit.";
    else last = "Landing loads so far: about " + D.g[0].toFixed(1) + " g on average, honeycomb untouched.";
    log.textContent = last;
  }
  var playing = false, t0 = 0;
  function run() {
    if (playing) return;
    playing = true; btn.textContent = "Flying…"; btn.disabled = true;
    t0 = performance.now();
    (function f(now) {
      var u = Math.min(1, (now - t0) / 14000);
      var n = Math.round(N_END * (Math.pow(30, u) - 1) / 29);   // slow at first, faster later
      state(n);
      if (u < 1) requestAnimationFrame(f);
      else { playing = false; btn.textContent = "Fly again"; btn.disabled = false; }
    })(t0);
  }
  btn.addEventListener("click", run);
  if (reduce || !("IntersectionObserver" in window)) state(N_END);
  else {
    state(0);
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); run(); } }, { threshold: 0.4 });
    io.observe(host);
  }
  if (/[?&]debug=1/.test(location.search)) window.__life = state;

  // remaining-life chart: median flights until each item needs replacing or servicing, log scale
  var ch = document.getElementById("life-chart");
  if (!ch) return;
  var narrow = ch.clientWidth < 560;
  var W = narrow ? Math.max(300, ch.clientWidth - 20) : 760, rowH = narrow ? 54 : 40, left = narrow ? 8 : 210, right = 80, top = 10;
  var order = ITEMS.slice().sort(function (a, b) { return D.median[a[0]] - D.median[b[0]]; });
  var H = top + rowH * order.length + 34;
  var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "group", "aria-label": "Median flights until each item needs replacing or servicing" }, ch);
  var x = function (v) { return left + (Math.log10(Math.max(1, v)) / 5) * (W - left - right); };
  [1, 10, 100, 1000, 10000, 100000].forEach(function (t) {
    el("line", { x1: x(t), x2: x(t), y1: top, y2: H - 28, class: "grid" }, svg);
    el("text", { x: x(t), y: H - 8, class: "tick", "text-anchor": "middle" }, svg).textContent = t >= 1000 ? (t / 1000) + "k" : t;
  });
  var marks = order.map(function (it, i) {
    var v = D.median[it[0]], y = top + rowH * i + rowH / 2 + (narrow ? 10 : 0), cap = v >= 20000;
    if (narrow) el("text", { x: 4, y: y - 15, class: "rowlab" }, svg).textContent = it[1];
    else el("text", { x: left - 12, y: y + 5, class: "rowlab", "text-anchor": "end" }, svg).textContent = it[1];
    var g = el("g", { role: "img", "aria-label": it[1] + ": " + (cap ? "more than 20,000" : Math.round(v).toLocaleString("en-US")) + " flights" }, svg);
    var bar = el("line", { x1: x(1), x2: x(1), y1: y, y2: y, class: "life-bar" + (it[0] === "shock" ? " policy" : "") }, g);
    var dot = el("circle", { cx: x(1), cy: y, r: 6.5, class: "dot-after" }, g);
    var lab = el("text", { x: x(1) + 12, y: y + 5, class: "val" }, g);
    lab.textContent = cap ? "> 20,000" : Math.round(v).toLocaleString("en-US");
    return { v: Math.min(v, 20000), bar: bar, dot: dot, lab: lab };
  });
  if (D.pess_chamber) {
    var i = order.findIndex(function (it) { return it[0] === "chamber"; }), y = top + rowH * i + rowH / 2 + (narrow ? 10 : 0);
    el("circle", { cx: x(D.pess_chamber), cy: y, r: 5, class: "dot-before" }, svg);
  }
  function setp(e) { marks.forEach(function (m) { var xv = x(Math.pow(m.v, e)); m.bar.setAttribute("x2", xv); m.dot.setAttribute("cx", xv); m.lab.setAttribute("x", xv + 12); }); }
  if (reduce || !("IntersectionObserver" in window)) setp(1);
  else {
    setp(0);
    var io2 = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; io2.disconnect();
      var s0 = performance.now();
      (function f(now) { var u = Math.min(1, (now - s0) / 1600), e = 1 - Math.pow(1 - u, 3); setp(e); if (u < 1) requestAnimationFrame(f); })(s0);
    }, { threshold: 0.3 });
    io2.observe(ch);
  }
})();
