/* Hop-0 site: data-driven animations.
 * - hero: replays real landings recorded from the flight software (assets/flights.json)
 * - charts: drawn from the HIL tables, animated when they scroll into view
 * - reveal: sections fade in on scroll
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
    var marks = TL.map(function (r, i) {
      var p = pts[i];
      if (narrow) el("text", { x: 4, y: p[1] - 15, class: "rowlab" }, svg).textContent = (i + 1) + ". " + r[0];
      else el("text", { x: left - 14, y: p[1] + 5, class: "rowlab", "text-anchor": "end" }, svg).textContent = (i + 1) + ". " + r[0];
      var g = el("g", { class: "tl-pt" }, svg);
      el("circle", { cx: p[0], cy: p[1], r: 6.5, class: "dot-after" }, g);
      var lft = 100 * r[1] / 300 < 70;
      el("text", { x: lft ? p[0] - 12 : p[0] + 12, y: p[1] + 5, class: "val", "text-anchor": lft ? "end" : "start" }, g)
        .textContent = r[1] + "/300";
      return g;
    });
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

  /* ------------------------------------------------------------------ hero: replayed landings */
  var cv = document.getElementById("hero-canvas");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var DATA = null, lanes = [], next = 0, W = 0, H = 0, dpr = 1, scale = 1, groundY = 0, stars = [];
  var SPEED = 4;                       // playback speed (x real time)
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = H - 50;
    // px per metre: the flights use the sky below the title block (highest apex ~230 m); on small screens they may
    // run behind the text rather than shrink to nothing
    var over = document.querySelector(".hero .over"), top = 40;
    if (over) top = over.getBoundingClientRect().bottom - cv.getBoundingClientRect().top + 12;
    scale = Math.max((groundY - top) / 235, (groundY - 40) / 235 * 0.55);
    var n = W < 560 ? 3 : (W < 900 ? 4 : 5);
    if (lanes.length !== n) {
      lanes = [];
      for (var i = 0; i < n; i++) lanes.push(newLane(i, n, i * 1.1));
    } else lanes.forEach(function (l, i) { l.cx = laneX(i, n); });
    stars = [];
    for (var s = 0; s < Math.round(W * H / 9000); s++)
      stars.push([Math.random() * W, Math.random() * groundY * 0.8, Math.random() * 1.1 + 0.3, Math.random()]);
  }
  function laneX(i, n) {                // pads sit right of centre of each lane: flights approach from the left
    var w = W / n; return w * i + w * 0.66;
  }
  function newLane(i, n, delay) {
    var f = DATA ? DATA.flights[(next++) % DATA.flights.length] : null;
    return { cx: laneX(i, n), f: f, t: -delay, done: -1, dust: [], trail: [] };
  }
  function sample(f, t) {               // linear interpolation of the 10 Hz record
    var k = t / f.dt, i = Math.max(0, Math.min(f.s.length - 2, Math.floor(k))), u = Math.max(0, Math.min(1, k - i));
    function g(a) { return a[i] + (a[i + 1] - a[i]) * u; }
    return { s: g(f.s), z: g(f.z), tilt: g(f.tilt), thr: g(f.thr), gim: g(f.gim), end: k >= f.s.length - 1 };
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
  function drawPad(l) {
    ctx.fillStyle = "#33445e"; ctx.fillRect(l.cx - 26, groundY - 2, 52, 4);
    var lit = l.done >= 0;
    ctx.fillStyle = lit ? "#5fd39a" : "#e0a03c";
    ctx.globalAlpha = lit ? 1 : 0.55 + 0.45 * Math.sin(performance.now() / 260);
    ctx.fillRect(l.cx - 28, groundY - 4, 4, 3); ctx.fillRect(l.cx + 24, groundY - 4, 4, 3);
    ctx.globalAlpha = 1;
  }
  function drawRocket(px, py, tiltDeg, thr, gimDeg, alpha) {
    var L = 36, R = 5;                 // drawn size (exaggerated, not to scale)
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.translate(px, py); ctx.rotate(tiltDeg * Math.PI / 180);
    if (thr > 0.02) {                  // plume: length ~ throttle, flicker, gimbal deflection
      ctx.save(); ctx.rotate(-gimDeg * 1.5 * Math.PI / 180);
      var len = 10 + 34 * thr * (0.85 + 0.3 * Math.random());
      var pg = ctx.createLinearGradient(0, 0, 0, len);
      pg.addColorStop(0, "rgba(255,244,214,0.95)"); pg.addColorStop(0.35, "rgba(255,170,70,0.8)");
      pg.addColorStop(1, "rgba(255,90,30,0)");
      ctx.fillStyle = pg; ctx.beginPath();
      ctx.moveTo(-3.2, 0); ctx.quadraticCurveTo(0, len * 1.05, 3.2, 0); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = "lighter";
      var gl = ctx.createRadialGradient(0, 4, 0, 0, 4, 16 + 18 * thr);
      gl.addColorStop(0, "rgba(255,170,80," + (0.35 * thr) + ")"); gl.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 4, 16 + 18 * thr, 0, 6.283); ctx.fill();
      ctx.restore();
    }
    // legs (inverted tripod seen from the side), body, nose
    ctx.strokeStyle = "#8d97a8"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-R + 1, -9); ctx.lineTo(-R - 8, 1); ctx.moveTo(R - 1, -9); ctx.lineTo(R + 8, 1);
    ctx.moveTo(-R + 1, -1); ctx.lineTo(-R - 8, 1); ctx.moveTo(R - 1, -1); ctx.lineTo(R + 8, 1); ctx.stroke();
    var bg = ctx.createLinearGradient(-R, 0, R, 0);
    bg.addColorStop(0, "#b9c1cd"); bg.addColorStop(0.45, "#f4f6f8"); bg.addColorStop(1, "#9aa3b1");
    ctx.fillStyle = bg; ctx.fillRect(-R, -L, 2 * R, L - 1);
    ctx.fillStyle = "#e8e2cf"; ctx.beginPath(); ctx.ellipse(0, -L, R, 3.4, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#c8693a"; ctx.fillRect(-2, -1.5, 4, 2.5);
    ctx.restore();
  }
  function frame(dtReal) {
    drawSky();
    lanes.forEach(function (l, i) {
      drawPad(l);
      if (!l.f) return;
      l.t += dtReal * SPEED;
      if (l.t < 0) return;
      var st = sample(l.f, Math.min(l.t, l.f.dt * (l.f.s.length - 1)));
      var px = l.cx + st.s * scale, py = groundY - Math.max(0, st.z) * scale;
      if (l.done < 0) {
        l.trail.push([px, py]); if (l.trail.length > 160) l.trail.shift();
        if (st.end) {
          l.done = 0;
          for (var k = 0; k < 26; k++)
            l.dust.push({ x: px, y: groundY - 1, vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 22, a: 1 });
        }
      } else l.done += dtReal;
      // trajectory trail
      ctx.strokeStyle = "rgba(109,167,236,0.35)"; ctx.lineWidth = 1.2; ctx.beginPath();
      l.trail.forEach(function (p, j) { if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
      ctx.stroke();
      var fade = l.done > 2.2 ? Math.max(0, 1 - (l.done - 2.2) / 0.8) : 1;
      drawRocket(px, py, st.tilt, l.done >= 0 ? 0 : st.thr, st.gim, fade);
      l.dust.forEach(function (p) {
        p.x += p.vx * dtReal; p.y += p.vy * dtReal; p.vy += 30 * dtReal; p.vx *= 0.97; p.a -= dtReal * 0.6;
        if (p.y > groundY) p.y = groundY;
        if (p.a > 0) { ctx.fillStyle = "rgba(190,180,160," + (p.a * 0.5) + ")"; ctx.fillRect(p.x, p.y - 2, 2.4, 2.4); }
      });
      if (l.done >= 0 && l.done < 2.6) {
        ctx.globalAlpha = Math.min(1, l.done * 3) * fade;
        ctx.fillStyle = "#cfe3ff"; ctx.font = "12px ui-sans-serif, system-ui, sans-serif"; ctx.textAlign = "center";
        ctx.fillText("landed  " + l.f.touch.vh.toFixed(2) + " m/s lateral", l.cx, groundY + 18);
        ctx.globalAlpha = 1;
      }
      if (l.done > 3.0) lanes[i] = newLane(i, lanes.length, 0.4 + Math.random());
    });
  }
  function still() {                    // reduced motion: all trajectories and landed vehicles
    drawSky();
    lanes.forEach(function (l) {
      drawPad(l); if (!l.f) return;
      ctx.strokeStyle = "rgba(109,167,236,0.45)"; ctx.lineWidth = 1.2; ctx.beginPath();
      l.f.s.forEach(function (s, j) {
        var px = l.cx + s * scale, py = groundY - Math.max(0, l.f.z[j]) * scale;
        if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      });
      ctx.stroke();
      drawRocket(l.cx + l.f.s[l.f.s.length - 1] * scale, groundY, 0, 0, 0, 1);
    });
  }
  var running = true, last = 0;
  function loop(now) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    if (running) frame(dt);
    requestAnimationFrame(loop);
  }
  fetch("assets/flights.json").then(function (r) { return r.json(); }).then(function (d) {
    DATA = d;
    // shuffle so every visit starts with different flights
    for (var i = d.flights.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = d.flights[i]; d.flights[i] = d.flights[j]; d.flights[j] = t; }
    lanes = []; resize();
    if (reduce) { still(); window.addEventListener("resize", function () { resize(); still(); }); return; }
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function () { running = !document.hidden; last = 0; });
    if ("IntersectionObserver" in window)
      new IntersectionObserver(function (es) { running = es[0].isIntersecting && !document.hidden; last = 0; }).observe(cv);
    requestAnimationFrame(loop);
    if (/[?&]debug=1/.test(location.search))   // test hook: advance the replay without requestAnimationFrame
      window.__hopStep = function (seconds) { for (var t = 0; t < seconds; t += 1 / 30) frame(1 / 30); return lanes.map(function (l) { return [l.t.toFixed(1), l.done]; }); };
  }).catch(function () { resize(); drawSky(); });
})();
