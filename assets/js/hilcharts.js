/* Hop-0 site, landing page: the HIL charts. Before/after landing success in seven scenarios and the step-by-step
 * timeline of the hardest scenario on two disjoint seed sets. Numbers are copied from the HIL tables in
 * research/plantfix/README.md (see the evidence notes on the page). The before -> after movement and the timeline
 * line are the only animations: each shows the change it describes, once. No dependencies. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function onVisible(node, fn, threshold) {
    if (reduce || !("IntersectionObserver" in window)) { fn(true); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(false); } });
    }, { threshold: threshold || 0.35 });
    io.observe(node);
  }
  function tween(ms, step, done) {
    var t0 = performance.now();
    function f(now) {
      var u = Math.min(1, (now - t0) / ms);
      step(1 - Math.pow(1 - u, 3));
      if (u < 1) requestAnimationFrame(f); else if (done) done();
    }
    requestAnimationFrame(f);
  }
  function fmtPct(x) {
    var s = (Math.round(x * 10) / 10).toFixed(1);
    return (s.slice(-2) === ".0" ? s.slice(0, -2) : s) + "%";
  }

  /* ------------------------------------------------------------------ before / after chart */
  var BA = [
    ["COTS sensors", 75, 100, 100], ["COTS + 5% sensor faults", 75, 100, 100], ["COTS + 15% packet loss", 72, 100, 100],
    ["Harsh sensors", 72, 100, 100], ["Harsh + 200 ms latency", 57, 100, 100],
    ["Harsh + 200 ms + 15% loss", 159, 299, 300], ["No radar, 1 Hz GNSS", 192, 299, 300]
  ];
  function beforeAfter(host) {
    var narrow = host.clientWidth < 560;      // phones: row label above its bar, real-size text
    var W = narrow ? Math.max(300, host.clientWidth - 20) : 760, rowH = narrow ? 58 : 46, top = narrow ? 8 : 16,
        left = narrow ? 34 : 230, right = narrow ? 58 : 64, H = top + rowH * BA.length + 34, dy = narrow ? 12 : 0;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-labelledby": "ba-title" }, host);
    el("title", { id: "ba-title" }, svg).textContent =
      "Landing success before and after in seven HIL scenarios; values are in the table below.";
    var x = function (p) { return left + (p - 40) / 60 * (W - left - right); };
    (narrow ? [40, 60, 80, 100] : [40, 50, 60, 70, 80, 90, 100]).forEach(function (t) {
      el("line", { x1: x(t), x2: x(t), y1: top - 6, y2: H - 30, class: "grid" }, svg);
      el("text", { x: x(t), y: H - 10, class: "tick", "text-anchor": "middle" }, svg).textContent = t + "%";
    });
    var items = BA.map(function (r, i) {
      var y = top + rowH * i + rowH / 2 + dy, pb = 100 * r[1] / r[3], pa = 100 * r[2] / r[3];
      if (narrow) el("text", { x: 4, y: y - 17, class: "rowlab" }, svg).textContent = r[0];
      else el("text", { x: left - 14, y: y + 5, class: "rowlab", "text-anchor": "end" }, svg).textContent = r[0];
      var bar = el("line", { x1: x(pb), x2: x(pb), y1: y, y2: y, class: "track" }, svg);
      var tb = el("text", { x: x(pb) - 12, y: y + 5, class: "val2", "text-anchor": "end" }, svg);
      tb.textContent = fmtPct(pb);
      el("circle", { cx: x(pb), cy: y, r: 7, class: "dot-before" }, svg);
      var da = el("circle", { cx: x(pb), cy: y, r: 7, class: "dot-after" }, svg);
      var ta = el("text", { x: x(pb) + 12, y: y + 5, class: "val" }, svg);
      ta.textContent = fmtPct(pa);
      return { pb: pb, pa: pa, bar: bar, da: da, ta: ta };
    });
    onVisible(host, function (instant) {
      function set(e) {
        items.forEach(function (it) {
          var p = it.pb + (it.pa - it.pb) * e;
          it.bar.setAttribute("x2", x(p)); it.da.setAttribute("cx", x(p));
          it.ta.setAttribute("x", x(p) + 12);        // the label shows the final value from the start
        });
      }
      if (instant) set(1); else tween(1600, set);
    });
  }

  /* ------------------------------------------------------------------ HIL timeline */
  // [step, landings of 300 on seed set A, on held-out seed set B (null: not run), log entry, date]
  // Sources: research/plantfix/README.md HIL tables (2026-11-04 ... 2026-11-10).
  var TL = [
    ["Simple aero model (before CFD)", 293, null, "e-1104-plant-v4", "11-04"],
    ["CFD aerodynamics added", 159, null, "e-1104-cfd", "11-04"],
    ["Angular-disturbance state in the nav filter", 266, null, "e-1104-filter", "11-04"],
    ["Terminal tilt limits", 271, null, "e-1106-tilt", "11-06"],
    ["Divert-feasibility sink limit", 276, 282, "e-1107-divert", "11-07"],
    ["Terminal velocity law", 287, 286, "e-1107-termvel", "11-07"],
    ["Smoother braking feed-forward", 285, 283, "e-1108-ramp", "11-08"],
    ["Higher terminal gate", 289, 289, "e-1108-gate", "11-08"],
    ["Filter gain in accelerometer mode", 294, 289, "e-1108-kad", "11-08"],
    ["Predictive terminal guidance (LQR)", 296, 294, "e-1109-lqr", "11-09"],
    ["Stiffer attitude loop at 50 Hz", 299, 298, "e-1110-att", "11-10"]
  ];
  function timeline(host) {
    var narrow = host.clientWidth < 560;
    var W = narrow ? Math.max(300, host.clientWidth - 20) : 760, rowH = narrow ? 52 : 40, top = 14,
        left = narrow ? 34 : 300, right = narrow ? 70 : 70, H = top + rowH * TL.length + 30, dy = narrow ? 12 : 0;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-labelledby": "tl-title" }, host);
    el("title", { id: "tl-title" }, svg).textContent =
      "Landings out of 300 in the hardest HIL scenario after each change, seed set A: 293, 159, 266, 271, 276, 287, 285, 289, 294, 296, 299; held-out seed set B, where run: 282, 286, 283, 289, 289, 294, 298.";
    var x = function (p) { return left + (p - 40) / 60 * (W - left - right); };
    (narrow ? [40, 60, 80, 100] : [40, 50, 60, 70, 80, 90, 100]).forEach(function (t) {
      el("line", { x1: x(t), x2: x(t), y1: top - 6, y2: H - 26, class: "grid" }, svg);
      el("text", { x: x(t), y: H - 6, class: "tick", "text-anchor": "middle" }, svg).textContent = t + "%";
    });
    var pts = TL.map(function (r, i) { return [x(100 * r[1] / 300), top + rowH * i + rowH / 2 + dy]; });
    var d = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var path = el("path", { d: d, class: "tl-line" }, svg);
    var labs = [];
    var marks = TL.map(function (r, i) {
      var p = pts[i];
      var lab = narrow ? el("text", { x: 4, y: p[1] - 15, class: "rowlab" }, svg)
                       : el("text", { x: left - 14, y: p[1] + 5, class: "rowlab", "text-anchor": "end" }, svg);
      lab.textContent = (i + 1) + ". " + r[0]; labs.push(lab);
      var g = el("g", { class: "tl-pt" }, svg);
      if (r[2] !== null) {                         // set B: a ring on its own line just below, with its value
        var xb = x(100 * r[2] / 300);
        el("circle", { cx: xb, cy: p[1] + 13, r: 4, class: "dot-b" }, g);
        el("text", { x: xb - 9, y: p[1] + 17, class: "valb", "text-anchor": "end" }, g).textContent = "B " + r[2];
      }
      el("circle", { cx: p[0], cy: p[1], r: 6.5, class: "dot-after" }, g);
      var lft = 100 * r[1] / 300 < 70;
      el("text", { x: lft ? p[0] - 12 : p[0] + 12, y: p[1] + 5, class: "val", "text-anchor": lft ? "end" : "start" }, g)
        .textContent = r[1] + "/300";
      return g;
    });
    host.__tl = { marks: marks, labs: labs };
    var len = path.getTotalLength();
    path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
    marks.forEach(function (g) { g.style.opacity = 0; });
    onVisible(host, function (instant) {
      if (instant) { path.style.strokeDashoffset = 0; marks.forEach(function (g) { g.style.opacity = 1; }); return; }
      var n = marks.length;
      tween(2600, function (e) {
        path.style.strokeDashoffset = len * (1 - e);
        marks.forEach(function (g, i) { g.style.opacity = Math.max(0, Math.min(1, (e * (n - 1) - i + 0.6) / 0.6)); });
      });
    }, 0.25);
  }

  document.querySelectorAll("[data-chart]").forEach(function (h) {
    var k = h.getAttribute("data-chart");
    if (k === "before-after") beforeAfter(h); else if (k === "timeline") timeline(h);
  });

  /* ------------------------------------------------------------------ step list: each step links to its log entry */
  var chips = document.getElementById("chips"), tlHost = document.getElementById("tl-chart");
  if (chips && tlHost && tlHost.__tl) {
    TL.forEach(function (r, i) {
      var li = document.createElement("li"), a = document.createElement("a");
      a.href = "log.html#" + r[3];
      a.innerHTML = "<b>" + r[1] + "</b><span>" + (i + 1) + ". " + r[0] + "</span><small>" +
        (r[2] !== null ? "set B " + r[2] + " · " : "") + "log 2026-" + r[4] + "</small>";
      function on() {
        tlHost.classList.add("dim");
        tlHost.__tl.marks.forEach(function (g, j) { g.classList.toggle("hl", j === i); });
        tlHost.__tl.labs.forEach(function (g, j) { g.classList.toggle("hl", j === i); });
      }
      function off() { tlHost.classList.remove("dim"); }
      a.addEventListener("mouseenter", on); a.addEventListener("focus", on);
      a.addEventListener("mouseleave", off); a.addEventListener("blur", off);
      li.appendChild(a); chips.appendChild(li);
    });
  }
})();
