/* Hop-0 site: data-driven animations.
 * - hero: replays real landings recorded from the flight software (assets/flights.json)
 * - charts: drawn from the HIL tables, animated when they scroll into view
 * - reveal: sections fade in on scroll
 * - flight cards, timeline chips, quote rotation, menu
 * Everything falls back to a static final state with prefers-reduced-motion. No dependencies. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var css = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
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
      var e = 1 - Math.pow(1 - u, 3);              // ease-out cubic
      step(e);
      if (u < 1) requestAnimationFrame(f); else if (done) done();
    }
    requestAnimationFrame(f);
  }
  function fmtPct(x) {
    var s = (Math.round(x * 10) / 10).toFixed(1);
    return (s.slice(-2) === ".0" ? s.slice(0, -2) : s) + "%";
  }

  /* ------------------------------------------------------------------ reveal on scroll */
  var reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (n) { n.classList.add("shown"); });
  } else {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("shown"); rio.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll(".cascade .lc").forEach(function (n, i) { n.style.transitionDelay = (i * 0.09) + "s"; });
    reveals.forEach(function (n) { rio.observe(n); });
  }

  /* ------------------------------------------------------------------ hero counter */
  document.querySelectorAll("[data-count-from]").forEach(function (n) {
    var a = parseFloat(n.getAttribute("data-count-from")), b = parseFloat(n.getAttribute("data-count-to"));
    if (reduce) { n.textContent = fmtPct(b); return; }
    n.textContent = fmtPct(a);
    setTimeout(function () { tween(1800, function (e) { n.textContent = fmtPct(a + (b - a) * e); }); }, 900);
  });

  /* ------------------------------------------------------------------ before / after chart */
  var BA = [
    ["COTS sensors", 75, 100, 100], ["COTS + 5% sensor faults", 75, 100, 100], ["COTS + 15% packet loss", 72, 100, 100],
    ["Harsh sensors", 72, 100, 100], ["Harsh + 200 ms latency", 57, 100, 100],
    ["Harsh + 200 ms + 15% loss", 159, 296, 300], ["No radar, 1 Hz GNSS", 192, 298, 300]
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
      ta.textContent = fmtPct(pb);
      return { pb: pb, pa: pa, bar: bar, da: da, ta: ta };
    });
    onVisible(host, function (instant) {
      function set(e) {
        items.forEach(function (it) {
          var p = it.pb + (it.pa - it.pb) * e;
          it.bar.setAttribute("x2", x(p)); it.da.setAttribute("cx", x(p));
          it.ta.setAttribute("x", x(p) + 12); it.ta.textContent = fmtPct(p);
        });
      }
      if (instant) set(1); else tween(1600, set);
    });
  }

  /* ------------------------------------------------------------------ HIL timeline */
  var TL = [
    ["Simple aero model (before CFD)", 293], ["CFD aerodynamics added", 159],
    ["Angular-disturbance state in the nav filter", 266], ["Terminal tilt limits", 271],
    ["Divert-feasibility sink limit", 276], ["Terminal velocity law", 287], ["Smoother braking feed-forward", 285],
    ["Higher terminal gate", 289], ["Filter gain in accelerometer mode", 294], ["Predictive terminal guidance (LQR)", 296]
  ];
  function timeline(host) {
    var narrow = host.clientWidth < 560;
    var W = narrow ? Math.max(300, host.clientWidth - 20) : 760, rowH = narrow ? 52 : 40, top = 14,
        left = narrow ? 34 : 300, right = narrow ? 70 : 70, H = top + rowH * TL.length + 30, dy = narrow ? 12 : 0;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-labelledby": "tl-title" }, host);
    el("title", { id: "tl-title" }, svg).textContent =
      "Landings out of 300 in the hardest HIL scenario after each change: 293, 159, 266, 271, 276, 287, 285, 289, 294, 296.";
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

  /* ------------------------------------------------------------------ timeline chips: hover highlights a step */
  var chips = document.getElementById("chips"), tlHost = document.getElementById("tl-chart");
  if (chips && tlHost && tlHost.__tl) {
    TL.forEach(function (r, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.innerHTML = "<b>" + r[1] + "</b><span>" + (i + 1) + ". " + r[0] + "</span>";
      b.setAttribute("aria-label", "Step " + (i + 1) + ", " + r[0] + ": " + r[1] + " of 300");
      function on() {
        tlHost.classList.add("dim");
        tlHost.__tl.marks.forEach(function (g, j) { g.classList.toggle("hl", j === i); });
        tlHost.__tl.labs.forEach(function (g, j) { g.classList.toggle("hl", j === i); });
      }
      function off() { tlHost.classList.remove("dim"); }
      b.addEventListener("mouseenter", on); b.addEventListener("focus", on);
      b.addEventListener("mouseleave", off); b.addEventListener("blur", off);
      chips.appendChild(b);
    });
  }

  /* ------------------------------------------------------------------ quotes */
  var qs = document.querySelectorAll("#qbox .q"), qnav = document.getElementById("qnav"), qi = 0, qtimer = null;
  function showQ(k) {
    qi = (k + qs.length) % qs.length;
    qs.forEach(function (q, j) { q.classList.toggle("on", j === qi); q.setAttribute("aria-hidden", j === qi ? "false" : "true"); });
    if (qnav) qnav.querySelectorAll("button").forEach(function (b, j) { b.classList.toggle("on", j === qi); });
  }
  if (qs.length && qnav) {
    qs.forEach(function (q, j) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-label", "Lesson " + (j + 1));
      b.addEventListener("click", function () { showQ(j); if (qtimer) { clearInterval(qtimer); qtimer = null; } });
      qnav.appendChild(b);
    });
    showQ(0);
    if (!reduce) qtimer = setInterval(function () { showQ(qi + 1); }, 6500);
  }

  /* ------------------------------------------------------------------ top bar and menu */
  var bar = document.getElementById("bar"), menu = document.getElementById("menu"), mbtn = document.getElementById("menu-btn");
  var heroEl = document.querySelector(".hero");
  function onScroll() { if (bar && heroEl) bar.classList.toggle("solid", window.scrollY > heroEl.offsetHeight - 70); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  function setMenu(open) {
    menu.classList.toggle("open", open); bar.classList.toggle("menu-open", open);
    mbtn.setAttribute("aria-expanded", open ? "true" : "false");
    mbtn.querySelector("span").textContent = open ? "Close" : "Menu";
    document.body.style.overflow = open ? "hidden" : "";
  }
  if (menu && mbtn) {
    mbtn.addEventListener("click", function () { setMenu(!menu.classList.contains("open")); });
    menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.classList.contains("open")) { setMenu(false); mbtn.focus(); } });
  }

  /* ------------------------------------------------------------------ shared flight drawing */
  function sample(f, t) {               // linear interpolation of the 10 Hz record
    var k = t / f.dt, i = Math.max(0, Math.min(f.s.length - 2, Math.floor(k))), u = Math.max(0, Math.min(1, k - i));
    function g(a) { return a[i] + (a[i + 1] - a[i]) * u; }
    return { s: g(f.s), z: g(f.z), tilt: g(f.tilt), thr: g(f.thr), gim: g(f.gim), end: k >= f.s.length - 1 };
  }
  function flightLen(f) { return f.dt * (f.s.length - 1); }
  function drawRocket(c, px, py, tiltDeg, thr, gimDeg, alpha, size) {
    var L = 36, R = 5;                 // drawn size (exaggerated, not to scale)
    c.save(); c.globalAlpha = alpha;
    c.translate(px, py); c.scale(size, size); c.rotate(tiltDeg * Math.PI / 180);
    if (thr > 0.02) {                  // plume: length ~ throttle, flicker, gimbal deflection
      c.save(); c.rotate(-gimDeg * 1.5 * Math.PI / 180);
      var len = 10 + 34 * thr * (0.85 + 0.3 * Math.random());
      var pg = c.createLinearGradient(0, 0, 0, len);
      pg.addColorStop(0, "rgba(255,244,214,0.95)"); pg.addColorStop(0.35, "rgba(255,170,70,0.8)");
      pg.addColorStop(1, "rgba(255,90,30,0)");
      c.fillStyle = pg; c.beginPath();
      c.moveTo(-3.2, 0); c.quadraticCurveTo(0, len * 1.05, 3.2, 0); c.closePath(); c.fill();
      c.globalCompositeOperation = "lighter";
      var gl = c.createRadialGradient(0, 4, 0, 0, 4, 16 + 18 * thr);
      gl.addColorStop(0, "rgba(255,170,80," + (0.35 * thr) + ")"); gl.addColorStop(1, "rgba(255,120,40,0)");
      c.fillStyle = gl; c.beginPath(); c.arc(0, 4, 16 + 18 * thr, 0, 6.283); c.fill();
      c.restore();
    }
    c.strokeStyle = "#8d97a8"; c.lineWidth = 1.6;   // legs (inverted tripod seen from the side), body, nose
    c.beginPath(); c.moveTo(-R + 1, -9); c.lineTo(-R - 8, 1); c.moveTo(R - 1, -9); c.lineTo(R + 8, 1);
    c.moveTo(-R + 1, -1); c.lineTo(-R - 8, 1); c.moveTo(R - 1, -1); c.lineTo(R + 8, 1); c.stroke();
    var bg = c.createLinearGradient(-R, 0, R, 0);
    bg.addColorStop(0, "#b9c1cd"); bg.addColorStop(0.45, "#f4f6f8"); bg.addColorStop(1, "#9aa3b1");
    c.fillStyle = bg; c.fillRect(-R, -L, 2 * R, L - 1);
    c.fillStyle = "#e8e2cf"; c.beginPath(); c.ellipse(0, -L, R, 3.4, 0, Math.PI, 0); c.fill();
    c.fillStyle = "#c8693a"; c.fillRect(-2, -1.5, 4, 2.5);
    c.restore();
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function mmss(t) { t = Math.round(t); return (t < 600 ? "0" : "") + Math.floor(t / 60) + ":" + (t % 60 < 10 ? "0" : "") + (t % 60); }

  /* ------------------------------------------------------------------ hero: replayed landings */
  var cv = document.getElementById("hero-canvas");
  var ctx = cv ? cv.getContext("2d") : null;
  var DATA = null, ORDER = [], lanes = [], next = 0, W = 0, H = 0, dpr = 1, scale = 1, groundY = 0, stars = [];
  var x0 = 0, x1 = 0;
  var SPEED = 4;                       // playback speed (x real time)
  var featT = document.getElementById("feat-t"), featD = document.getElementById("feat-d"), feat = document.getElementById("feat");
  var featLast = -10;
  function resize() {
    if (!cv) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = H - 50;
    var cr = cv.getBoundingClientRect(), h1 = document.querySelector(".hero h1"), top = 90;
    var wide = W >= 760;
    if (!wide && h1 && feat) {          // phones: headline, then the featured flight, then the sky
      feat.style.top = (h1.getBoundingClientRect().bottom - cr.top + 14) + "px";
    } else if (feat) feat.style.top = "";
    // px per metre: the highest apex (~230 m) fits under the bar on desktop, under the text block on phones;
    // the flights run full width behind the text, like footage behind a title
    if (!wide && feat) top = Math.max(top, feat.getBoundingClientRect().bottom - cr.top + 16);
    scale = Math.max(0.9, (groundY - top) / 235);
    x0 = 0; x1 = W;
    var n = W < 560 ? 3 : (W < 900 ? 4 : (W < 1300 ? 5 : 6));
    if (lanes.length !== n) {
      lanes = [];
      for (var i = 0; i < n; i++) lanes.push(newLane(i, n, i * 1.1));
    } else lanes.forEach(function (l, i) { l.cx = laneX(i, n); });
    stars = [];
    for (var s = 0; s < Math.round(W * H / 9000); s++)
      stars.push([Math.random() * W, Math.random() * groundY * 0.8, Math.random() * 1.1 + 0.3, Math.random()]);
  }
  function laneX(i, n) {                // pads sit right of centre of each lane: flights approach from the left
    var w = (x1 - x0) / n; return x0 + w * i + w * 0.66;
  }
  function newLane(i, n, delay) {
    var f = ORDER.length ? ORDER[(next++) % ORDER.length] : null;
    return { cx: laneX(i, n), f: f, t: -delay, done: -1, dust: [], trail: [] };
  }
  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b1220"); g.addColorStop(0.7, "#14233b"); g.addColorStop(1, "#1d3150");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var tw = performance.now() / 1000;
    stars.forEach(function (s) {
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(tw * 0.8 + s[3] * 6.28);
      ctx.fillStyle = "#cfd8e6"; ctx.fillRect(s[0], s[1], s[2], s[2]);
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0e1726"; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = "#2a3b55"; ctx.fillRect(0, groundY, W, 1.5);
  }
  function drawPad(c, cx, gy, lit, w) {
    c.fillStyle = "#33445e"; c.fillRect(cx - w, gy - 2, 2 * w, 4);
    c.fillStyle = lit ? "#5fd39a" : "#e0a03c";
    c.globalAlpha = lit ? 1 : 0.55 + 0.45 * Math.sin(performance.now() / 260);
    c.fillRect(cx - w - 2, gy - 4, 4, 3); c.fillRect(cx + w - 2, gy - 4, 4, 3);
    c.globalAlpha = 1;
  }
  function setFeat(f) {
    if (!featT) return;
    var now = performance.now() / 1000;
    if (now - featLast < 2.5) return;
    featLast = now;
    var apply = function () {
      featT.textContent = "Landed at " + f.touch.vh.toFixed(2) + " m/s sideways, " + f.touch.miss.toFixed(1) + " m from the pad";
      featD.textContent = cap(f.label) + ". Wind " + f.wind.toFixed(1) + " m/s.";
      feat.style.opacity = 1;
    };
    if (reduce) { apply(); return; }
    feat.style.opacity = 0; setTimeout(apply, 450);
  }
  function frame(dtReal) {
    drawSky();
    lanes.forEach(function (l, i) {
      drawPad(ctx, l.cx, groundY, l.done >= 0, 24);
      if (!l.f) return;
      l.t += dtReal * SPEED;
      if (l.t < 0) return;
      var st = sample(l.f, Math.min(l.t, flightLen(l.f)));
      var px = l.cx + st.s * scale, py = groundY - Math.max(0, st.z) * scale;
      if (l.done < 0) {
        l.trail.push([px, py]); if (l.trail.length > 160) l.trail.shift();
        if (st.end) {
          l.done = 0; setFeat(l.f);
          for (var k = 0; k < 26; k++)
            l.dust.push({ x: px, y: groundY - 1, vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 22, a: 1 });
        }
      } else l.done += dtReal;
      ctx.strokeStyle = "rgba(109,167,236,0.35)"; ctx.lineWidth = 1.2; ctx.beginPath();
      l.trail.forEach(function (p, j) { if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
      ctx.stroke();
      var fade = l.done > 2.2 ? Math.max(0, 1 - (l.done - 2.2) / 0.8) : 1;
      drawRocket(ctx, px, py, st.tilt, l.done >= 0 ? 0 : st.thr, st.gim, fade, 1);
      l.dust.forEach(function (p) {
        p.x += p.vx * dtReal; p.y += p.vy * dtReal; p.vy += 30 * dtReal; p.vx *= 0.97; p.a -= dtReal * 0.6;
        if (p.y > groundY) p.y = groundY;
        if (p.a > 0) { ctx.fillStyle = "rgba(190,180,160," + (p.a * 0.5) + ")"; ctx.fillRect(p.x, p.y - 2, 2.4, 2.4); }
      });
      if (l.done >= 0 && l.done < 2.6) {
        ctx.globalAlpha = Math.min(1, l.done * 3) * fade;
        ctx.fillStyle = "#cfe3ff"; ctx.font = "12px 'Inter Tight', ui-sans-serif, system-ui, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(l.f.touch.vh.toFixed(2) + " m/s", l.cx, groundY + 18);
        ctx.globalAlpha = 1;
      }
      if (l.done > 3.0) lanes[i] = newLane(i, lanes.length, 0.4 + Math.random());
    });
  }
  function still() {                    // reduced motion: all trajectories and landed vehicles
    drawSky();
    lanes.forEach(function (l) {
      drawPad(ctx, l.cx, groundY, true, 24); if (!l.f) return;
      ctx.strokeStyle = "rgba(109,167,236,0.45)"; ctx.lineWidth = 1.2; ctx.beginPath();
      l.f.s.forEach(function (s, j) {
        var px = l.cx + s * scale, py = groundY - Math.max(0, l.f.z[j]) * scale;
        if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      });
      ctx.stroke();
      drawRocket(ctx, l.cx + l.f.s[l.f.s.length - 1] * scale, groundY, 0, 0, 0, 1, 1);
    });
  }

  /* ------------------------------------------------------------------ flight cards */
  var CARD_PICK = [1, 6, 9, 14, 5, 12];     // indices into flights.json: a spread of scenarios, wind and divert
  var cards = [];
  function buildCards(flights) {
    var grid = document.getElementById("fgrid");
    if (!grid) return;
    CARD_PICK.forEach(function (fi, n) {
      var f = flights[fi]; if (!f) return;
      var a = document.createElement("article");
      a.className = "fc reveal"; a.tabIndex = 0;
      a.style.transitionDelay = (n % 3) * 0.08 + "s";
      a.setAttribute("aria-label", "Replay flight " + (n + 1));
      a.innerHTML = '<canvas aria-hidden="true"></canvas><div class="prog"><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0 L9 5 L1 10 Z"/></svg><i></i></div>' +
        '<div class="meta"><span>Flight ' + (n < 9 ? "0" : "") + (n + 1) + '</span><span>' + mmss(flightLen(f)) + '</span></div>' +
        '<h3>Landed at ' + f.touch.vh.toFixed(2) + ' m/s sideways after a ' + Math.round(f.d0) + ' m divert</h3>' +
        '<p>' + cap(f.label) + '. Wind ' + f.wind.toFixed(1) + ' m/s, apex ' + Math.round(f.apex) + ' m.</p>';
      grid.appendChild(a);
      var c = { el: a, cv: a.querySelector("canvas"), bar: a.querySelector(".prog i"), f: f, t: -n * 1.4, hold: 0 };
      function restart() { c.t = 0; c.hold = 0; }
      a.addEventListener("mouseenter", restart); a.addEventListener("click", restart);
      a.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); restart(); } });
      cards.push(c);
      if (reduce || !("IntersectionObserver" in window)) a.classList.add("shown");
      else { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { a.classList.add("shown"); io.disconnect(); } }, { threshold: 0.12 }); io.observe(a); }
    });
    sizeCards();
  }
  function sizeCards() {
    cards.forEach(function (c) {
      var w = c.cv.clientWidth, h = c.cv.clientHeight, d = Math.min(window.devicePixelRatio || 1, 2);
      c.cv.width = Math.round(w * d); c.cv.height = Math.round(h * d);
      c.ctx = c.cv.getContext("2d"); c.ctx.setTransform(d, 0, 0, d, 0, 0); c.w = w; c.h = h;
      var smin = Math.min.apply(null, c.f.s), smax = Math.max.apply(null, c.f.s.concat([0]));
      var zmax = Math.max.apply(null, c.f.z);
      c.gy = h - 22;
      c.k = Math.min((w - 40) / Math.max(10, smax - smin), (c.gy - 26) / Math.max(10, zmax));
      c.ox = 20 + (w - 40 - (smax - smin) * c.k) / 2 - smin * c.k;
      drawCard(c, c.t < 0 ? 0 : c.t);
    });
  }
  function drawCard(c, t) {
    var g = c.ctx, f = c.f, L = flightLen(f), T = Math.max(0, Math.min(t, L));
    var gr = g.createLinearGradient(0, 0, 0, c.h);
    gr.addColorStop(0, "#0b1220"); gr.addColorStop(1, "#1a2c48");
    g.fillStyle = gr; g.fillRect(0, 0, c.w, c.h);
    g.fillStyle = "#0e1726"; g.fillRect(0, c.gy, c.w, c.h - c.gy);
    g.fillStyle = "#2a3b55"; g.fillRect(0, c.gy, c.w, 1);
    var X = function (s) { return c.ox + s * c.k; }, Y = function (z) { return c.gy - Math.max(0, z) * c.k; };
    g.setLineDash([3, 4]); g.strokeStyle = "rgba(159,176,200,0.28)"; g.lineWidth = 1; g.beginPath();
    f.s.forEach(function (s, j) { if (j) g.lineTo(X(s), Y(f.z[j])); else g.moveTo(X(s), Y(f.z[j])); });
    g.stroke(); g.setLineDash([]);
    var nk = Math.floor(T / f.dt);
    g.strokeStyle = "rgba(109,167,236,0.9)"; g.lineWidth = 1.6; g.beginPath();
    for (var j = 0; j <= nk && j < f.s.length; j++) { if (j) g.lineTo(X(f.s[j]), Y(f.z[j])); else g.moveTo(X(f.s[j]), Y(f.z[j])); }
    var st = sample(f, T);
    g.lineTo(X(st.s), Y(st.z)); g.stroke();
    var landed = T >= L;
    drawPad(g, X(0), c.gy, landed, 12);
    drawRocket(g, X(st.s), Y(st.z), st.tilt, landed ? 0 : st.thr, st.gim, 1, 0.62);
    g.fillStyle = "#cfd8e6"; g.font = "12px 'Inter Tight', ui-sans-serif, system-ui, sans-serif"; g.textAlign = "left";
    g.fillText(Math.round(Math.max(0, st.z)) + " m", 10, 18);
    if (landed) { g.textAlign = "right"; g.fillStyle = "#5fd39a"; g.fillText("landed", c.w - 10, 18); }
    c.bar.style.left = (100 * T / L) + "%";
  }
  var cardsVisible = false;
  function stepCards(dt) {
    cards.forEach(function (c) {
      var L = flightLen(c.f);
      if (c.t < L) { c.t += dt * SPEED * 1.5; }
      else { c.hold += dt; if (c.hold > 2.5) { c.t = 0; c.hold = 0; } }
      drawCard(c, c.t < 0 ? 0 : c.t);
    });
  }

  /* ------------------------------------------------------------------ banner background: all trajectories */
  function bannerBg(flights) {
    var svg = document.getElementById("banner-bg");
    if (!svg) return;
    svg.setAttribute("viewBox", "0 0 1000 500"); svg.setAttribute("preserveAspectRatio", "xMaxYMax slice");
    var paths = flights.map(function (f) {
      var d = f.s.map(function (s, j) { return (j ? "L" : "M") + (760 + s * 2.2).toFixed(1) + " " + (480 - f.z[j] * 1.9).toFixed(1); }).join(" ");
      return el("path", { d: d, fill: "none", stroke: "rgba(246,241,234,0.16)", "stroke-width": 1.4 }, svg);
    });
    el("line", { x1: 500, x2: 1000, y1: 481, y2: 481, stroke: "rgba(246,241,234,0.25)", "stroke-width": 1.4 }, svg);
    if (reduce) return;
    paths.forEach(function (p) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.__L = L; });
    onVisible(svg.parentNode, function (instant) {
      if (instant) { paths.forEach(function (p) { p.style.strokeDashoffset = 0; }); return; }
      tween(3200, function (e) { paths.forEach(function (p, i) { var u = Math.max(0, Math.min(1, e * 1.6 - i * 0.035)); p.style.strokeDashoffset = p.__L * (1 - u); }); });
    }, 0.2);
  }

  /* ------------------------------------------------------------------ main loop */
  var running = true, last = 0;
  function loop(now) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    if (running && ctx) frame(dt);
    if (cardsVisible) stepCards(dt);
    requestAnimationFrame(loop);
  }
  fetch("assets/flights.json").then(function (r) { return r.json(); }).then(function (d) {
    DATA = d;
    buildCards(d.flights); bannerBg(d.flights);
    ORDER = d.flights.slice();           // shuffled copy so every visit starts with different flights
    for (var i = ORDER.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = ORDER[i]; ORDER[i] = ORDER[j]; ORDER[j] = t; }
    lanes = []; resize();
    if (reduce) {
      if (ctx) still();
      cards.forEach(function (c) { drawCard(c, flightLen(c.f)); });
      window.addEventListener("resize", function () { resize(); if (ctx) still(); sizeCards(); cards.forEach(function (c) { drawCard(c, flightLen(c.f)); }); });
      return;
    }
    window.addEventListener("resize", function () { resize(); sizeCards(); });
    document.addEventListener("visibilitychange", function () { running = !document.hidden; last = 0; });
    if ("IntersectionObserver" in window) {
      if (cv) new IntersectionObserver(function (es) { running = es[0].isIntersecting && !document.hidden; last = 0; }).observe(cv);
      var grid = document.getElementById("fgrid");
      if (grid) new IntersectionObserver(function (es) { cardsVisible = es[0].isIntersecting; }).observe(grid);
    } else cardsVisible = true;
    requestAnimationFrame(loop);
    if (/[?&]debug=1/.test(location.search))   // test hook: advance the animations without requestAnimationFrame
      window.__hopStep = function (seconds) { for (var t = 0; t < seconds; t += 1 / 30) { if (ctx) frame(1 / 30); stepCards(1 / 30); } return lanes.map(function (l) { return [l.t.toFixed(1), l.done]; }); };
  }).catch(function () { resize(); if (ctx) drawSky(); });
})();
