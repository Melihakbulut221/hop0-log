/* Hop-0 site: "Mechanical design" section (#mechanical).
 * Charts are drawn from the JSON block inside the section (#mech-data) in their final state and show a tooltip on
 * hover, tap or keyboard focus.
 * No dependencies. Safe to load on a page without the section. */
(function () {
  "use strict";
  var root = document.getElementById("mechanical");
  var src = document.getElementById("mech-data");
  if (!root || !src) return;
  var D;
  try { D = JSON.parse(src.textContent); } catch (e) { return; }
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, cls, anchor) {
    var t = el("text", { x: x, y: y, class: cls || "tick", "text-anchor": anchor || "start" }, parent);
    t.textContent = s;
    return t;
  }
  function fx(v, n) { return Number(v).toFixed(n === undefined ? 1 : n); }
  function sgn(v, n) { return (v < 0 ? "−" : "+") + Math.abs(v).toFixed(n === undefined ? 2 : n); }
  // Charts are drawn in their final state: entrance animations carried no information. The interactive parts
  // (propellant slider, hover read-outs) are unchanged.
  function onVisible(node, fn, th) {
    if (true) { fn(true); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(false); } });
    }, { threshold: th || 0.3 });
    io.observe(node);
  }
  function tween(ms, step) {
    var t0 = performance.now();
    function f(now) {
      var u = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - u, 3);
      step(e);
      if (u < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }
  function animate(host, ms, step, th) {        // step(e) with e in 0..1; instant when reduced motion or rebuilt
    if (host.__built) { step(1); return; }
    step(0);
    onVisible(host, function (instant) { if (instant) step(1); else tween(ms, step); }, th);
  }

  /* ------------------------------------------------------------------ reveal (the page script does this too) */
  var rv = root.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) rv.forEach(function (n) { n.classList.add("shown"); });
  else {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("shown"); rio.unobserve(e.target); } });
    }, { threshold: 0.12 });
    rv.forEach(function (n) { rio.observe(n); });
  }

  /* ------------------------------------------------------------------ count-up numbers */
  root.querySelectorAll("[data-mcount]").forEach(function (n) {
    var b = parseFloat(n.getAttribute("data-mcount"));
    if (!b || reduce) { n.textContent = String(b); return; }
    n.textContent = "0";
    onVisible(n, function (instant) {
      if (instant) { n.textContent = String(b); return; }
      tween(1400, function (e) { n.textContent = String(Math.round(b * e)); });
    }, 0.6);
  });

  /* ------------------------------------------------------------------ tooltip */
  function tooltip(host) {
    var t = document.createElement("div");
    t.className = "m-tt"; t.setAttribute("aria-hidden", "true");
    host.appendChild(t);
    return {
      show: function (html, ev, anchor) {
        t.innerHTML = html;
        var hb = host.getBoundingClientRect(), x, y;
        if (ev && ev.clientX !== undefined && ev.clientX !== 0) { x = ev.clientX - hb.left; y = ev.clientY - hb.top; }
        else { var ab = anchor.getBoundingClientRect(); x = ab.left - hb.left + ab.width / 2; y = ab.top - hb.top; }
        var w = t.offsetWidth, h = t.offsetHeight;
        var left = Math.max(4, Math.min(hb.width - w - 4, x + 14));
        var top = y - h - 12 < 0 ? y + 18 : y - h - 12;
        t.style.left = left + "px"; t.style.top = top + "px";
        t.classList.add("on");
      },
      hide: function () { t.classList.remove("on"); }
    };
  }
  function hover(node, host, tt, html, extraOn, extraOff) {
    function on(ev) { tt.show(typeof html === "function" ? html() : html, ev, node); if (extraOn) extraOn(); }
    function off() { tt.hide(); if (extraOff) extraOff(); }
    node.addEventListener("pointerenter", on);
    node.addEventListener("pointermove", on);
    node.addEventListener("pointerleave", off);
    node.addEventListener("focus", on);
    node.addEventListener("blur", off);
  }
  function geom(host, wideW) {
    var narrow = host.clientWidth < 560;
    return { narrow: narrow, W: narrow ? Math.max(300, host.clientWidth - 24) : wideW };
  }
  function svgIn(host, W, H, title) {
    var old = host.querySelector("svg"); if (old) old.remove();
    var tt = host.querySelector(".m-tt"); if (tt) tt.remove();
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "group", "aria-label": title }, host);
    el("title", {}, svg).textContent = title;
    return svg;
  }

  /* ------------------------------------------------------------------ 02 mass budget */
  function massChart(host) {
    var G = D.groups.slice().sort(function (a, b) { return b.cbe - a.cbe; });
    var g = geom(host, 760), W = g.W, nar = g.narrow;
    var rowH = nar ? 50 : 36, top = 10, left = nar ? 8 : 250, right = nar ? 92 : 110, H = top + rowH * G.length + 58;
    var svg = svgIn(host, W, H, "Dry mass by group, CAD best estimate against budget, in kilograms: " +
      G.map(function (r) { return r.name + " " + fx(r.cbe) + " of " + fx(r.budget); }).join("; ") + ".");
    var tt = tooltip(host);
    var xmax = 22, x = function (v) { return left + v / xmax * (W - left - right); };
    [0, 5, 10, 15, 20].forEach(function (t) {
      el("line", { x1: x(t), x2: x(t), y1: top - 4, y2: top + rowH * G.length, class: "grid" }, svg);
      txt(svg, x(t), top + rowH * G.length + 18, t + (t === 20 ? " kg" : ""), "tick", "middle");
    });
    var bars = G.map(function (r, i) {
      var y = top + rowH * i + rowH / 2 + (nar ? 9 : 0);
      var row = el("g", { class: "m-r", tabindex: 0, role: "img", "aria-label": r.name + ": " + fx(r.cbe) + " kg, budget " + fx(r.budget) + " kg" }, svg);
      el("rect", { x: 0, y: y - rowH / 2 - (nar ? 9 : 0), width: W, height: rowH, class: "m-hit" }, row);
      if (nar) txt(row, left, y - 14, r.name, "rowlab");
      else txt(row, left - 14, y + 5, r.name, "rowlab", "end");
      var bar = el("rect", { x: x(0), y: y - 7, width: 0, height: 14, rx: 2, class: "m-bar" }, row);
      el("line", { x1: x(r.budget), x2: x(r.budget), y1: y - 12, y2: y + 12, class: "m-bud" }, row);
      var d = (r.cbe / r.budget - 1) * 100, end = Math.max(x(r.cbe), x(r.budget));
      txt(row, end + 10, y + 5, fx(r.cbe) + " kg", "val");
      var dl = txt(row, end + 10 + (nar ? 0 : 58), y + 5 + (nar ? 0 : 0), Math.abs(d) < 0.5 ? "on budget" : (d > 0 ? "+" : "−") + Math.abs(d).toFixed(0) + "%", "val2");
      if (nar) dl.setAttribute("y", y - 14), dl.setAttribute("x", W - 4), dl.setAttribute("text-anchor", "end");
      if (d > 0.5) dl.style.fill = "var(--accent)";
      hover(row, host, tt, "<b>" + r.name + "</b><br>" + r.note + "<br>CAD " + fx(r.cbe, 2) + " kg, budget " + fx(r.budget, 2) + " kg",
        function () { host.classList.add("m-dim"); row.classList.add("hl"); },
        function () { host.classList.remove("m-dim"); row.classList.remove("hl"); });
      return { bar: bar, v: r.cbe };
    });
    var M = D.mass, yT = top + rowH * G.length + 46;
    txt(svg, nar ? left : left - 14, yT, "Total " + fx(M.cbe) + " kg against " + fx(M.budget) + " kg, +" + fx(M.over_pct) + "%",
        "val", nar ? "start" : "end");
    animate(host, 1300, function (e) { bars.forEach(function (b) { b.bar.setAttribute("width", Math.max(0, x(b.v * e) - x(0))); }); });
  }

  /* ------------------------------------------------------------------ 03 CoM and inertia vs propellant */
  var fillState = { p: D.fill.takeoff.prop, hooks: [] };
  function rowAt(p) {             // linear interpolation in the 2.5 kg table
    var R = D.fill.rows;
    for (var i = 0; i < R.length - 1; i++) {
      if (p <= R[i + 1].p) {
        var u = (p - R[i].p) / (R[i + 1].p - R[i].p);
        return { p: p, m: R[i].m + u * (R[i + 1].m - R[i].m), z: R[i].z + u * (R[i + 1].z - R[i].z),
                 ixx: R[i].ixx + u * (R[i + 1].ixx - R[i].ixx) };
      }
    }
    return R[R.length - 1];
  }
  function setFill(p) {
    fillState.p = Math.max(0, Math.min(100, p));
    fillState.hooks.forEach(function (f) { f(fillState.p); });
  }
  function fillChart(host, key) {
    var R = D.fill.rows, g = geom(host, 640), W = g.W, nar = g.narrow;
    var H = nar ? 200 : 210, l = 54, r = 16, t = 26, b = 34;
    var isZ = key === "com";
    var vals = R.map(function (q) { return isZ ? q.z : q.ixx; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = (hi - lo) * 0.12;
    lo -= pad; hi += pad;
    var svg = svgIn(host, W, H, isZ ? "Centre-of-mass height above the hull base against propellant load, from " +
      fx(vals[0], 2) + " m empty to " + fx(vals[vals.length - 1], 2) + " m at 100 kg." :
      "Pitch inertia about the centre of mass against propellant load, from " + fx(vals[0], 0) + " to " +
      fx(vals[vals.length - 1], 0) + " kg m2.");
    var x = function (p) { return l + p / 100 * (W - l - r); };
    var y = function (v) { return t + (1 - (v - lo) / (hi - lo)) * (H - t - b); };
    txt(svg, l, 14, isZ ? "Centre of mass above hull base [m]" : "Pitch inertia [kg·m²]", "rowlab");
    var step = isZ ? 0.04 : 4, v0 = Math.ceil(lo / step) * step;
    for (var v = v0; v <= hi; v += step) {
      el("line", { x1: l, x2: W - r, y1: y(v), y2: y(v), class: "grid" }, svg);
      txt(svg, l - 8, y(v) + 4, isZ ? fx(v, 2) : fx(v, 0), "tick", "end");
    }
    [0, 25, 50, 75, 100].forEach(function (p) { txt(svg, x(p), H - 12, p + (p === 100 ? " kg" : ""), "tick", "middle"); });
    [["landing", D.fill.landing.prop], ["take-off", D.fill.takeoff.prop]].forEach(function (m) {
      el("line", { x1: x(m[1]), x2: x(m[1]), y1: t - 4, y2: H - b, class: "m-mark" }, svg);
      txt(svg, x(m[1]) + (m[0] === "take-off" ? -6 : 6), t + 8, m[0], "tick", m[0] === "take-off" ? "end" : "start");
    });
    var d = R.map(function (q, i) { return (i ? "L" : "M") + x(q.p).toFixed(1) + " " + y(isZ ? q.z : q.ixx).toFixed(1); }).join(" ");
    var path = el("path", { d: d, class: "m-line" }, svg);
    var cl = el("line", { y1: t - 4, y2: H - b, class: "m-cross" }, svg);
    var cp = el("circle", { r: 5.5, class: "m-crosspt" }, svg);
    var hit = el("rect", { x: l, y: t, width: W - l - r, height: H - t - b, class: "m-hit m-drag" }, svg);
    function draw(p) {
      var q = rowAt(p), X = x(p), Y = y(isZ ? q.z : q.ixx);
      cl.setAttribute("x1", X); cl.setAttribute("x2", X); cp.setAttribute("cx", X); cp.setAttribute("cy", Y);
    }
    fillState.hooks.push(draw);
    function fromEv(ev) {
      var bb = svg.getBoundingClientRect(), px = (ev.clientX - bb.left) / bb.width * W;
      setFill(Math.round(((px - l) / (W - l - r) * 100) / 2.5) * 2.5);
    }
    hit.addEventListener("pointermove", fromEv);
    hit.addEventListener("pointerdown", fromEv);
    var len = 0;
    try { len = path.getTotalLength(); } catch (e) { len = 0; }
    animate(host, 1500, function (e) {
      if (len) { path.style.strokeDasharray = len; path.style.strokeDashoffset = len * (1 - e); }
      cl.style.opacity = cp.style.opacity = e > 0.95 ? 1 : 0;
    }, 0.4);
    draw(fillState.p);
  }
  function fillControls() {
    var s = document.getElementById("m-prop"), out = document.getElementById("m-prop-out"),
        rd = document.getElementById("m-read"), com = document.getElementById("m-com"), I = D.img;
    if (!s) return;
    rd.innerHTML = "<div><b id='m-r-m'></b><span>vehicle mass, kg</span></div><div><b id='m-r-z'></b>" +
      "<span>centre of mass above hull base, m</span></div><div><b id='m-r-i'></b><span>pitch inertia, kg·m²</span></div>";
    var bm = document.getElementById("m-r-m"), bz = document.getElementById("m-r-z"), bi = document.getElementById("m-r-i");
    fillState.hooks.push(function (p) {
      var q = rowAt(p);
      if (String(s.value) !== String(p)) s.value = p;
      out.textContent = fx(p) + " kg";
      bm.textContent = fx(q.m, 1); bz.textContent = fx(q.z, 3); bi.textContent = fx(q.ixx, 1);
      var ypx = I.y_ground - (q.z * 1000 - I.z_ground_mm) * (I.y_ground - I.y_top) / (I.z_top_mm - I.z_ground_mm);
      com.style.top = (ypx / I.h * 100).toFixed(2) + "%";
    });
    if (!s.__mech) { s.__mech = true; s.addEventListener("input", function () { setFill(parseFloat(s.value)); }); }
  }

  /* ------------------------------------------------------------------ 04 margins */
  function marginChart(host) {
    var Ms = D.margins.slice().sort(function (a, b) { return a.ms - b.ms; });
    var g = geom(host, 760), W = g.W, nar = g.narrow;
    var rowH = nar ? 50 : 36, top = 12, left = nar ? 8 : 330, right = nar ? 62 : 64, H = top + rowH * Ms.length + 30;
    var svg = svgIn(host, W, H, "Lowest margin of safety per structural check: " +
      Ms.map(function (m) { return m.label + " " + sgn(m.ms); }).join("; ") + ".");
    var tt = tooltip(host);
    var lo = nar ? -0.6 : -0.4, hi = 1.0, x = function (v) { return left + (v - lo) / (hi - lo) * (W - left - right); };
    (nar ? [-0.25, 0, 0.5, 1] : [-0.25, 0, 0.25, 0.5, 0.75, 1]).forEach(function (tk) {
      el("line", { x1: x(tk), x2: x(tk), y1: top - 4, y2: top + rowH * Ms.length, class: tk === 0 ? "m-zero" : "grid" }, svg);
      txt(svg, x(tk), H - 8, tk === 0 ? "0" : sgn(tk), "tick", "middle");
    });
    var bars = Ms.map(function (m, i) {
      var y = top + rowH * i + rowH / 2 + (nar ? 9 : 0);
      var row = el("g", { class: "m-r", tabindex: 0, role: "img", "aria-label": m.label + ": margin " + sgn(m.ms) + (m.open ? ", open: " + m.note : "") }, svg);
      el("rect", { x: 0, y: y - rowH / 2 - (nar ? 9 : 0), width: W, height: rowH, class: "m-hit" }, row);
      if (nar) txt(row, left, y - 14, m.label, "rowlab");
      else txt(row, left - 14, y + 5, m.label, "rowlab", "end");
      var v = Math.max(lo, Math.min(hi, m.ms));
      var bar = el("rect", { y: y - 7, height: 14, rx: 2, class: "m-bar" + (m.ms < 0 ? " neg" : (m.open ? " open" : "")) }, row);
      var lab = txt(row, 0, y + 5, sgn(m.ms) + (m.ms > hi ? " ›" : "") + (m.open && m.ms >= 0 ? " open" : ""), "val", m.ms < 0 ? "end" : "start");
      if (m.ms < 0) lab.style.fill = "var(--accent)";
      hover(row, host, tt, "<b>" + m.label + "</b><br>Margin " + sgn(m.ms) + ", " + m.tool + (m.open ? "<br><b>Open:</b> " + m.note : ""),
        function () { host.classList.add("m-dim"); row.classList.add("hl"); },
        function () { host.classList.remove("m-dim"); row.classList.remove("hl"); });
      return { bar: bar, lab: lab, v: v, neg: m.ms < 0 };
    });
    animate(host, 1300, function (e) {
      bars.forEach(function (b) {
        var xe = x(b.v * e), x0 = x(0);
        b.bar.setAttribute("x", Math.min(xe, x0)); b.bar.setAttribute("width", Math.abs(xe - x0));
        b.lab.setAttribute("x", b.neg ? xe - 8 : xe + 8);
        b.lab.style.opacity = e > 0.9 ? 1 : 0;
      });
    });
  }

  /* ------------------------------------------------------------------ 05 drop envelope and friction */
  function legend(host, items) {
    var lg = host.querySelector(".legend");
    if (lg) return;
    lg = document.createElement("div"); lg.className = "legend";
    lg.innerHTML = items.map(function (i) { return "<span><i class='m-key " + i[0] + "'></i>" + i[1] + "</span>"; }).join("");
    host.insertBefore(lg, host.firstChild);
  }
  function dropChart(host) {
    var Dr = D.drop, g = geom(host, 520), W = g.W;
    var H = 300, l = 48, r = 14, t = 16, b = 40;
    legend(host, [["m-key-line", "tripod leg"], ["m-key-old", "earlier leg (could not carry friction)"]]);
    var svg = svgIn(host, W, H, "Lowest sideways landing speed that tips the vehicle over, against vertical speed, " +
      "for the tripod leg (" + Dr.new75.join(", ") + " m/s) and the earlier leg (" + Dr.old75.join(", ") + " m/s) at vertical " +
      "speeds of " + Dr.vz.join(", ") + " m/s.");
    var tt = tooltip(host);
    var x = function (v) { return l + v / 3.25 * (W - l - r); }, y = function (v) { return t + (1 - v / 3) * (H - t - b); };
    [0, 1, 2, 3].forEach(function (v) {
      el("line", { x1: l, x2: W - r, y1: y(v), y2: y(v), class: "grid" }, svg);
      txt(svg, l - 8, y(v) + 4, v, "tick", "end");
    });
    [0.5, 1, 1.5, 2, 2.5, 3].forEach(function (v) { txt(svg, x(v), H - 20, v, "tick", "middle"); });
    txt(svg, (l + W - r) / 2, H - 4, "vertical speed at touchdown [m/s]", "tick", "middle");
    txt(svg, l, t - 4 + 2, "sideways speed [m/s]", "tick");
    el("rect", { x: x(0), y: y(Dr.env.vh), width: x(Dr.env.vz) - x(0), height: y(0) - y(Dr.env.vh), class: "m-env" }, svg);
    el("rect", { x: x(0), y: y(Dr.env.vh), width: x(Dr.env.vz) - x(0), height: y(0) - y(Dr.env.vh), class: "m-envline" }, svg);
    txt(svg, x(0) + 8, y(0) - 10, "design envelope", "tick");
    function line(vals, cls) {
      var d = Dr.vz.map(function (v, i) { return (i ? "L" : "M") + x(v).toFixed(1) + " " + y(vals[i]).toFixed(1); }).join(" ");
      return el("path", { d: d, class: cls }, svg);
    }
    var pO = line(Dr.old75, "m-line-old"), pN = line(Dr.new75, "m-line");
    txt(svg, x(1.0), y(2.3), "tips over above the line", "tick", "middle");
    var pts = [];
    Dr.vz.forEach(function (v, i) {
      var c2 = el("circle", { cx: x(v), cy: y(Dr.old75[i]), r: 4.5, class: "m-pt-old" }, svg);
      var c1 = el("circle", { cx: x(v), cy: y(Dr.new75[i]), r: 5.5, class: "m-pt", tabindex: 0, role: "img",
        "aria-label": "vertical " + v + " m/s: tips from " + Dr.new75[i] + " m/s sideways" }, svg);
      pts.push(c1, c2);
      var hit = el("rect", { x: x(v) - 18, y: t, width: 36, height: H - t - b, class: "m-hit" }, svg);
      var html = "<b>" + v + " m/s down</b><br>Tripod tips from " + fx(Dr.new75[i], 2) + " m/s sideways<br>Earlier leg (could not carry friction) from " +
        fx(Dr.old75[i], 2) + " m/s";
      hover(hit, host, tt, html); hover(c1, host, tt, html);
    });
    var lens = [pN, pO].map(function (p) { try { return p.getTotalLength(); } catch (e) { return 0; } });
    animate(host, 1600, function (e) {
      [pN, pO].forEach(function (p, i) { if (lens[i]) { p.style.strokeDasharray = lens[i]; p.style.strokeDashoffset = lens[i] * (1 - e); } });
      pts.forEach(function (c) { c.style.opacity = e > 0.95 ? 1 : 0; });
    }, 0.35);
  }
  function frictionChart(host) {
    var Dr = D.drop, g = geom(host, 520), W = g.W;
    var H = 300, l = 48, r = 18, t = 16, b = 40;
    legend(host, [["m-key-line", "tripod leg"], ["m-key-old", "earlier leg (could not carry friction)"]]);
    var svg = svgIn(host, W, H, "Peak deceleration inside the envelope against ground friction coefficient " + Dr.mu.join(", ") +
      ": tripod leg " + Dr.g_new.join(", ") + " g; earlier leg " + Dr.g_old.join(", ") + " g.");
    var tt = tooltip(host);
    var x = function (v) { return l + 14 + v * (W - l - r - 28); }, y = function (v) { return t + (1 - v / 20) * (H - t - b); };
    [0, 5, 10, 15, 20].forEach(function (v) {
      el("line", { x1: l, x2: W - r, y1: y(v), y2: y(v), class: "grid" }, svg);
      txt(svg, l - 8, y(v) + 4, v, "tick", "end");
    });
    Dr.mu.forEach(function (m) { txt(svg, x(m), H - 20, m, "tick", "middle"); });
    txt(svg, (l + W - r) / 2, H - 4, "ground friction coefficient", "tick", "middle");
    txt(svg, l, t - 2, "peak deceleration [g]", "tick");
    el("line", { x1: x(0.6), x2: x(0.6), y1: t, y2: H - b, class: "m-ref" }, svg);
    txt(svg, x(0.6) - 6, t + 14, "requirement ≤ 0.6", "m-reftxt", "end");
    function line(vals, cls) {
      return el("path", { d: Dr.mu.map(function (m, i) { return (i ? "L" : "M") + x(m).toFixed(1) + " " + y(vals[i]).toFixed(1); }).join(" "), class: cls }, svg);
    }
    var pO = line(Dr.g_old, "m-line-old"), pN = line(Dr.g_new, "m-line");
    var pts = [];
    Dr.mu.forEach(function (m, i) {
      pts.push(el("circle", { cx: x(m), cy: y(Dr.g_old[i]), r: 4.5, class: "m-pt-old" }, svg));
      var c = el("circle", { cx: x(m), cy: y(Dr.g_new[i]), r: 5.5, class: "m-pt", tabindex: 0, role: "img",
        "aria-label": "friction " + m + ": " + Dr.g_new[i] + " g" }, svg);
      pts.push(c);
      var lab = txt(svg, x(m) + (i === Dr.mu.length - 1 ? -10 : 10), y(Dr.g_new[i]) - 10, fx(Dr.g_new[i]) + " g", "val",
        i === Dr.mu.length - 1 ? "end" : "start");
      pts.push(lab);
      var hit = el("rect", { x: x(m) - 20, y: t, width: 40, height: H - t - b, class: "m-hit" }, svg);
      var html = "<b>Friction " + m + "</b><br>Tripod " + fx(Dr.g_new[i]) + " g, earlier leg " + fx(Dr.g_old[i]) + " g<br>The earlier leg was softer here only because it could not carry friction loads";
      hover(hit, host, tt, html); hover(c, host, tt, html);
    });
    var lens = [pN, pO].map(function (p) { try { return p.getTotalLength(); } catch (e) { return 0; } });
    animate(host, 1400, function (e) {
      [pN, pO].forEach(function (p, i) { if (lens[i]) { p.style.strokeDasharray = lens[i]; p.style.strokeDashoffset = lens[i] * (1 - e); } });
      pts.forEach(function (c) { c.style.opacity = e > 0.95 ? 1 : 0; });
    }, 0.35);
  }

  /* ------------------------------------------------------------------ 06 deck modes */
  function deckChart(host) {
    var Mo = D.modes.deck, g = geom(host, 640), W = g.W, nar = g.narrow;
    var rowH = nar ? 64 : 58, top = 26, left = 8, right = 70, H = top + rowH * Mo.length + 26;
    var svg = svgIn(host, W, H, "First structural mode of the avionics deck: " +
      Mo.map(function (m) { return m.name + " " + fx(m.f) + " Hz"; }).join("; ") + ".");
    var tt = tooltip(host);
    var xmax = 180, x = function (v) { return left + v / xmax * (W - left - right); };
    [0, 50, 100, 150].forEach(function (v) {
      el("line", { x1: x(v), x2: x(v), y1: top - 6, y2: top + rowH * Mo.length, class: "grid" }, svg);
      txt(svg, x(v), H - 6, v + (v === 150 ? " Hz" : ""), "tick", "middle");
    });
    el("line", { x1: x(D.modes.loop_hz), x2: x(D.modes.loop_hz), y1: 4, y2: top + rowH * Mo.length, class: "m-ref" }, svg);
    txt(svg, x(D.modes.loop_hz) + 6, 15, D.modes.loop_hz + " Hz control loop", "m-reftxt");
    var bars = Mo.map(function (m, i) {
      var y = top + rowH * i + rowH / 2 + 8;
      var row = el("g", { class: "m-r", tabindex: 0, role: "img", "aria-label": m.name + ": " + fx(m.f) + " Hz" }, svg);
      el("rect", { x: 0, y: y - rowH / 2 - 8, width: W, height: rowH, class: "m-hit" }, row);
      txt(row, left, y - 14, m.name, "rowlab");
      var bar = el("rect", { x: x(0), y: y - 8, width: 0, height: 16, rx: 2, class: "m-bar" + (m.f < 2 * D.modes.loop_hz ? " neg" : "") }, row);
      var lab = txt(row, x(0), y + 5, fx(m.f) + " Hz", "val");
      hover(row, host, tt, "<b>" + m.name + "</b><br>First mode " + fx(m.f) + " Hz" +
        (i === Mo.length - 1 ? ": the helium regulator, not the deck" : (i === 1 ? ": the helium vessel rocking" : "")),
        function () { host.classList.add("m-dim"); row.classList.add("hl"); },
        function () { host.classList.remove("m-dim"); row.classList.remove("hl"); });
      return { bar: bar, lab: lab, v: m.f };
    });
    animate(host, 1400, function (e) {
      bars.forEach(function (b) {
        var xe = x(b.v * e);
        b.bar.setAttribute("width", Math.max(0, xe - x(0))); b.lab.setAttribute("x", xe + 8);
        b.lab.textContent = fx(b.v * e) + " Hz";
      });
    });
  }

  /* ------------------------------------------------------------------ 07 gimbal first contact (polar) */
  function gimbalChart(host) {
    var Gm = D.gimbal, g = geom(host, 540), W = g.W, H = W;
    legend(host, [["m-key-line", "current layout"], ["m-key-old", "earlier layout"], ["m-key-tick", "±10° range used"]]);
    var svg = svgIn(host, W, H, "Tilt at first contact in each of " + Gm.az.length + " directions. Current layout: " +
      Math.min.apply(null, Gm.v03).toFixed(1) + " to " + Math.max.apply(null, Gm.v03).toFixed(1) + " degrees; earlier layout from " +
      Math.min.apply(null, Gm.v02).toFixed(1) + " degrees. The range used is 10 degrees per axis, " + Gm.corner + " at the corners.");
    var tt = tooltip(host);
    var cx = W / 2, cy = H / 2, Rr = W / 2 - 46, tmax = 30, rr = function (th) { return th / tmax * Rr; };
    function P(az, th) { var a = az * Math.PI / 180; return [cx + rr(th) * Math.cos(a), cy - rr(th) * Math.sin(a)]; }
    [10, 20, 30].forEach(function (th) {
      el("circle", { cx: cx, cy: cy, r: rr(th), class: "m-ring" }, svg);
      txt(svg, cx + 4, cy - rr(th) - 4, th + "°", "tick");
    });
    [0, 45, 90, 135, 180, 225, 270, 315].forEach(function (az) {
      var p = P(az, tmax);
      el("line", { x1: cx, y1: cy, x2: p[0], y2: p[1], class: "m-spoke" }, svg);
      if (az % 90 === 0) {
        var q = P(az, tmax + 2.6);
        txt(svg, q[0], q[1] + 4, az + "°", "tick", "middle");
      }
    });
    var sectors = Gm.az.map(function (az) {
      var a0 = (az - 7.5) * Math.PI / 180, a1 = (az + 7.5) * Math.PI / 180;
      var d = "M" + cx + " " + cy + " L" + (cx + Rr * Math.cos(a0)) + " " + (cy - Rr * Math.sin(a0)) +
        " A" + Rr + " " + Rr + " 0 0 0 " + (cx + Rr * Math.cos(a1)) + " " + (cy - Rr * Math.sin(a1)) + " Z";
      return el("path", { d: d, class: "m-sector" }, svg);
    });
    var box = [[10, 10], [-10, 10], [-10, -10], [10, -10]].map(function (q) { return [cx + rr(q[0]), cy - rr(q[1])]; });
    el("polygon", { points: box.map(function (q) { return q.join(","); }).join(" "), class: "m-box" }, svg);
    var pOld = el("polygon", { class: "m-poly-old" }, svg), pNew = el("polygon", { class: "m-poly" }, svg);
    function pts(vals, e) { return Gm.az.map(function (az, i) { return P(az, vals[i] * e).join(","); }).join(" "); }
    function used(az) { var a = az * Math.PI / 180; return Gm.limit / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))); }
    Gm.az.forEach(function (az, i) {
      var a0 = (az - 7.5) * Math.PI / 180, a1 = (az + 7.5) * Math.PI / 180;
      var d = "M" + cx + " " + cy + " L" + (cx + Rr * Math.cos(a0)) + " " + (cy - Rr * Math.sin(a0)) +
        " A" + Rr + " " + Rr + " 0 0 0 " + (cx + Rr * Math.cos(a1)) + " " + (cy - Rr * Math.sin(a1)) + " Z";
      var hit = el("path", { d: d, class: "m-hit", tabindex: 0, role: "img",
        "aria-label": "direction " + az + " degrees: first contact at " + fx(Gm.v03[i]) + " degrees" }, svg);
      hover(hit, host, tt, "<b>Tilting toward " + az + "°</b><br>First contact at " + fx(Gm.v03[i]) +
        "° (earlier layout " + fx(Gm.v02[i]) + "°)<br>Range used about " + fx(used(az)) + "°",
        function () { sectors[i].classList.add("hl"); }, function () { sectors[i].classList.remove("hl"); });
    });
    animate(host, 1600, function (e) {
      pNew.setAttribute("points", pts(Gm.v03, e)); pOld.setAttribute("points", pts(Gm.v02, Math.min(1, e * 1.15)));
    }, 0.35);
  }

  /* ------------------------------------------------------------------ build, and rebuild on width class change */
  var builders = { mass: massChart, com: function (h) { fillChart(h, "com"); }, ixx: function (h) { fillChart(h, "ixx"); },
                   margins: marginChart, drop: dropChart, friction: frictionChart, deck: deckChart, gimbal: gimbalChart };
  var hosts = Array.prototype.slice.call(root.querySelectorAll("[data-mchart]"));
  function buildAll() {
    fillState.hooks = [];
    hosts.forEach(function (h) {
      var f = builders[h.getAttribute("data-mchart")];
      if (!f) return;
      try { f(h); } catch (e) { if (window.console) console.error("mech chart", h.getAttribute("data-mchart"), e); }
      h.__built = true;
      h.__narrow = h.clientWidth < 560;
    });
    fillControls();
    setFill(fillState.p);
  }
  buildAll();
  var rt = null;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var changed = hosts.some(function (h) { return (h.clientWidth < 560) !== h.__narrow; });
      if (changed) buildAll();
    }, 200);
  });
})();
