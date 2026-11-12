/* Hop-0 site, emulator page: a toy landing loop for teaching. NOT the flight software.
 * A planar rigid body (x, z, pitch) with one gimballed engine, quadratic drag acting below the centre of mass, a
 * textbook PD attitude loop under a PD position loop, and a simulated sensor link with noise, latency and lost
 * frames. Every parameter is a generic round number chosen for this page; none is a Hop-0 value.
 * Deterministic: a run is fully defined by its settings and its seed. No dependencies. */
(function () {
  "use strict";

  /* ================================================================ model (generic round numbers) */
  var P = {
    m: 100, I: 50, g: 9.81,               // kg, kg m^2, m/s^2 (constant mass: no propellant burn)
    Tmax: 2000, Tmin: 400,                // N
    L: 1.0,                               // m, centre of mass to gimbal
    dMax: 8 * Math.PI / 180,              // rad, gimbal limit
    CdA: 1.5, rho: 1.2, cp: 0.5,          // m^2, kg/m^3, centre of pressure 0.5 m BELOW the centre of mass
    padX: 40, apex: 40,                   // m
    dt: 0.005, ctrlDt: 0.04, tMax: 60     // s: physics step, controller period (25 Hz), time limit
  };
  var C = {                               // textbook gains, hand-picked for this toy
    kx: 0.25, kvx: 0.9, kix: 0.01, axMax: 3,
    kvz: 1.2, vzUp: 8, vzDown: 6, kh: 0.3, vzLand: 1.0,
    tiltMax: 20 * Math.PI / 180,
    wn: 3.5, zeta: 0.9,                   // attitude loop natural frequency (rad/s) and damping
    holdX: 3, holdV: 1                    // descend only once within 3 m and 1 m/s of the pad
  };
  var LAND = { vz: 2.0, vx: 1.0, miss: 5.0, tilt: 10 };     // touchdown limits used on this page

  function rng(seed) {                    // mulberry32
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307 * v); }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }

  /* settings: wind, gust (m/s), noise (0..3), lat (ms), loss (0..1), rate (deg/s) */
  function simulate(S, seed, keepTrace) {
    var R = rng(seed), Rs = rng(seed ^ 0x9E3779B9), Rw = rng(seed ^ 0x85EBCA6B);   // separate streams
    var x = 0, z = 0, vx = 0, vz = 0, th = 0, om = 0, d = 0;
    var wind = S.wind * (0.8 + 0.4 * R()), gust = 0, tauG = 3;
    var sp = 0.3 * S.noise, sv = 0.1 * S.noise, sth = 0.3 * S.noise * Math.PI / 180, som = 0.6 * S.noise * Math.PI / 180;
    var nDelay = Math.round(S.lat / 1000 / P.dt), buf = [], held = null, bad = false;
    var thr = 0.5, dCmd = 0, ix = 0, phase = 0, tNext = 0, t = 0, maxTilt = 0;
    var rate = S.rate * Math.PI / 180, trace = keepTrace ? [] : null, k = 0, lost = 0, frames = 0;
    var T = P.m * P.g;
    for (; t < P.tMax; t += P.dt, k++) {
      // wind: mean + first-order gust process
      gust += (-gust / tauG) * P.dt + S.gust * Math.sqrt(2 * P.dt / tauG) * gauss(Rw);
      var w = wind + gust;
      // sensors: noisy sample now, delivered after the latency
      buf.push([x + sp * gauss(Rs), z + sp * gauss(Rs), vx + sv * gauss(Rs), vz + sv * gauss(Rs),
                th + sth * gauss(Rs), om + som * gauss(Rs)]);
      if (buf.length > nDelay + 1) buf.shift();
      // controller at 25 Hz
      if (t >= tNext - 1e-9) {
        tNext += P.ctrlDt; frames++;
        // link: bursty loss (two-state model, mean burst 3 frames, long-run loss rate = S.loss). A lost frame
        // delivers nothing; the controller keeps working on the last frame it received, which gets older.
        if (bad) { if (R() < 1 / 3) bad = false; } else if (S.loss > 0 && R() < S.loss / (3 * (1 - S.loss))) bad = true;
        if (bad) lost++; else held = buf[0];
        var y = held;
        if (y) {
          var ex = P.padX - y[0]; ix += ex * P.ctrlDt;
          var ax = clamp(C.kx * ex - C.kvx * y[2] + C.kix * ix, -C.axMax, C.axMax);
          var h = y[1];
          if (phase === 0 && h > P.apex) phase = 1;
          if (phase === 1 && Math.abs(ex) < C.holdX && Math.abs(y[2]) < C.holdV) phase = 2;
          var vzc = phase === 0 ? C.vzUp : (phase === 1 ? 0 : -clamp(C.kh * h, C.vzLand, C.vzDown));
          var az = C.kvz * (vzc - y[3]);
          var thc = clamp(Math.atan2(-ax, az + P.g), -C.tiltMax, C.tiltMax);
          thr = clamp(P.m * Math.sqrt(ax * ax + (az + P.g) * (az + P.g)) / P.Tmax, P.Tmin / P.Tmax, 1);
          // PD attitude loop -> torque -> gimbal angle (torque = -L T sin(delta) in this frame)
          var tau = P.I * (C.wn * C.wn * (thc - y[4]) - 2 * C.zeta * C.wn * y[5]);
          dCmd = Math.asin(clamp(-tau / (P.L * thr * P.Tmax), -1, 1));
          dCmd = clamp(dCmd, -P.dMax, P.dMax);
        }
      }
      // actuator: gimbal rate limit
      d += clamp(dCmd - d, -rate * P.dt, rate * P.dt);
      T = thr * P.Tmax;
      // forces: thrust along the body axis turned by the gimbal; drag at the centre of pressure
      var bx = -Math.sin(th), bz = Math.cos(th);
      var tx = -Math.sin(th + d), tz = Math.cos(th + d);
      var rx = vx - w, rz = vz, sp2 = Math.sqrt(rx * rx + rz * rz), q = 0.5 * P.rho * P.CdA * sp2;
      var fx = -q * rx, fz = -q * rz;
      var torque = -P.L * T * Math.sin(d) + ((-P.cp * bx) * fz - (-P.cp * bz) * fx);
      vx += (T * tx + fx) / P.m * P.dt;
      vz += ((T * tz + fz) / P.m - P.g) * P.dt;
      om += torque / P.I * P.dt;
      x += vx * P.dt; z += vz * P.dt; th += om * P.dt;
      if (z < 0 && t < 1) { z = 0; vz = Math.max(vz, 0); }       // on the pad during spool-up
      var tilt = Math.abs(th) * 180 / Math.PI; if (tilt > maxTilt) maxTilt = tilt;
      if (trace && k % 8 === 0) trace.push([t, x, z, th, thr, d, w]);
      if (tilt > 45) return result("lost attitude", t);
      if (z <= 0 && t > 1) return result(null, t);
    }
    return result("time limit", t);

    function result(fail, tEnd) {
      var miss = Math.abs(x - P.padX), tilt = Math.abs(th) * 180 / Math.PI, why = fail;
      if (!why) {
        if (-vz > LAND.vz) why = "hard landing";
        else if (Math.abs(vx) > LAND.vx) why = "sideways landing";
        else if (tilt > LAND.tilt) why = "tilted landing";
        else if (miss > LAND.miss) why = "off the pad";
      }
      if (trace) trace.push([tEnd, x, Math.max(z, 0), th, 0, d, wind + gust]);
      return { ok: !why, why: why || "landed", t: tEnd, vz: -vz, vx: Math.abs(vx), miss: miss, tilt: tilt,
               maxTilt: maxTilt, lost: lost, frames: frames, wind: wind, trace: trace };
    }
  }
  function batch(S, seed0, n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(simulate(S, seed0 + i, false));
    return out;
  }
  var API = { P: P, C: C, LAND: LAND, simulate: simulate, batch: batch, rng: rng };
  if (typeof module !== "undefined" && module.exports) { module.exports = API; return; }   // node: tests only
  window.HopEmu = API;

  /* ================================================================ page */
  var root = document.getElementById("emu");
  if (!root) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };
  var NS = "http://www.w3.org/2000/svg";
  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function tok(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  var FIELDS = [["wind", 1, " m/s"], ["gust", 1, " m/s"], ["noise", 1, ""], ["lat", 1, " ms"], ["loss", 100, " %"], ["rate", 1, " °/s"]];
  var NOISE = ["none", "low", "medium", "high"];
  var DEFAULTS = { wind: 6, gust: 2, noise: 1, lat: 100, loss: 10, rate: 60 };
  function settings() {
    var S = {};
    FIELDS.forEach(function (f) { S[f[0]] = parseFloat($("e-" + f[0]).value) / f[1]; });
    return S;
  }
  function showValues() {
    FIELDS.forEach(function (f) {
      var v = $("e-" + f[0]).value, o = $("e-" + f[0] + "-out");
      if (o) o.textContent = f[0] === "noise" ? NOISE[+v] : v + f[2];
    });
  }
  function seed() { var v = parseInt($("e-seed").value, 10); return isFinite(v) && v >= 0 ? v : 1; }

  /* ---------------------------------------------------------------- canvas */
  var cv = $("e-canvas"), ctx = cv.getContext && cv.getContext("2d"), W = 0, H = 0, run = null, tPlay = 0, raf = 0, last = 0;
  var visible = true, SPEED = 4;
  var X0 = -8, X1 = 56, Z1 = 48;
  function size() {
    if (!ctx) return;
    var d = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  function sx(x) { return 16 + (x - X0) / (X1 - X0) * (W - 32); }
  function sz(z) { return H - 30 - z / Z1 * (H - 60); }
  function frameAt(t) {
    var tr = run.trace, i = 0;
    while (i < tr.length - 1 && tr[i + 1][0] <= t) i++;
    return i;
  }
  function draw(t) {
    if (!ctx) { if (run && t >= run.t) result(); return; }
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b1220"); g.addColorStop(1, "#1d3150");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var gy = sz(0);
    ctx.fillStyle = "#0e1726"; ctx.fillRect(0, gy, W, H - gy);
    ctx.fillStyle = "#2a3b55"; ctx.fillRect(0, gy, W, 1.5);
    // pad, with the miss limit marked
    var pl = sx(P.padX - LAND.miss), pr = sx(P.padX + LAND.miss);
    ctx.fillStyle = "rgba(95,211,154,0.18)"; ctx.fillRect(pl, gy - 3, pr - pl, 3);
    ctx.fillStyle = "#33445e"; ctx.fillRect(sx(P.padX) - 14, gy - 2, 28, 4);
    ctx.fillStyle = "#9fb0c8"; ctx.font = "12px 'Inter Tight', ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.fillText("pad", sx(P.padX), gy + 18); ctx.fillText("start", sx(0), gy + 18);
    if (!run) return;
    var tr = run.trace, k = frameAt(t), f = tr[k];
    ctx.strokeStyle = "rgba(109,167,236,0.85)"; ctx.lineWidth = 1.6; ctx.beginPath();
    for (var j = 0; j <= k; j++) { if (j) ctx.lineTo(sx(tr[j][1]), sz(tr[j][2])); else ctx.moveTo(sx(tr[j][1]), sz(tr[j][2])); }
    ctx.stroke();
    var done = k >= tr.length - 1;
    vehicle(sx(f[1]), sz(f[2]), f[3], done ? 0 : f[4], f[5]);
    // wind arrow
    ctx.fillStyle = "#cfd8e6"; ctx.textAlign = "left";
    ctx.fillText("wind " + f[6].toFixed(1) + " m/s", 12, 20);
    var ax = 12, ay = 32, len = Math.max(-60, Math.min(60, f[6] * 5));
    ctx.strokeStyle = "#cfd8e6"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax + 30, ay); ctx.lineTo(ax + 30 + len, ay); ctx.stroke();
    ctx.textAlign = "right"; ctx.fillText("t " + f[0].toFixed(1) + " s", W - 12, 20);
    if (done) { ctx.fillStyle = run.ok ? "#5fd39a" : "#ff9a76"; ctx.fillText(run.why, W - 12, 38); }
    readout(f, done);
  }
  function vehicle(px, py, th, thr, d) {
    var s = 1.4, Lb = 24, R = 3.6;
    ctx.save(); ctx.translate(px, py); ctx.rotate(-th); ctx.scale(s, s);
    if (thr > 0.02) {                       // plume along the gimballed thrust direction
      ctx.save(); ctx.rotate(-d); var ln = 6 + 18 * thr;
      var pg = ctx.createLinearGradient(0, 0, 0, ln);
      pg.addColorStop(0, "rgba(255,244,214,0.95)"); pg.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(-2.2, 0); ctx.quadraticCurveTo(0, ln, 2.2, 0); ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = "#8d97a8"; ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.moveTo(-R + 1, -6); ctx.lineTo(-R - 5, 0); ctx.moveTo(R - 1, -6); ctx.lineTo(R + 5, 0); ctx.stroke();
    ctx.fillStyle = "#e8ecf2"; ctx.fillRect(-R, -Lb, 2 * R, Lb - 1);
    ctx.fillStyle = "#e8e2cf"; ctx.beginPath(); ctx.ellipse(0, -Lb, R, 2.6, 0, Math.PI, 0); ctx.fill();
    ctx.restore();
  }
  function readout(f, done) {
    var r = $("e-read");
    if (!r) return;
    var tilt = Math.abs(f[3]) * 180 / Math.PI;
    r.innerHTML = "<span><b>" + f[2].toFixed(1) + " m</b>height</span><span><b>" + (f[1] - P.padX).toFixed(1) +
      " m</b>to the pad</span><span><b>" + tilt.toFixed(1) + "°</b>tilt</span><span><b>" +
      (Math.abs(f[5]) * 180 / Math.PI).toFixed(1) + "°</b>gimbal</span>";
    if (done) result();
  }
  function result() {
    var o = $("e-result"), R0 = run;
    if (!o || o.__run === R0) return;
    o.__run = R0;
    o.innerHTML = (R0.ok ? "<b>Landed.</b> " : "<b>Failed: " + R0.why + ".</b> ") +
      (R0.why === "lost attitude" || R0.why === "time limit" ? "No touchdown. " :
        "Touchdown " + R0.vz.toFixed(2) + " m/s down, " + R0.vx.toFixed(2) + " m/s sideways, " + R0.miss.toFixed(1) +
        " m from the pad, tilt " + R0.tilt.toFixed(1) + "°. ") +
      R0.lost + " of " + R0.frames + " sensor frames lost. Seed " + R0.seed + ".";
  }
  function loop(now) {
    raf = 0;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    tPlay += dt * SPEED;
    draw(tPlay);
    if (run && tPlay < run.t && visible && !document.hidden) raf = requestAnimationFrame(loop); else last = 0;
  }
  function play() {
    if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; tPlay = 0;
    $("e-result").textContent = "Flying...";
    $("e-result").__run = null;
    if (reduce) { tPlay = run.t; draw(tPlay); return; }
    raf = requestAnimationFrame(loop);
  }
  function fly() {
    run = simulate(settings(), seed(), true); run.seed = seed();
    play();
  }
  function resume() { if (run && tPlay < run.t && !raf && visible && !document.hidden && !reduce) raf = requestAnimationFrame(loop); }

  /* ---------------------------------------------------------------- batch */
  var N = 50;
  function scatter(host, res) {
    host.innerHTML = "";
    var Wd = 420, Hd = 260, l = 44, r = 12, t = 12, b = 40;
    var svg = el("svg", { viewBox: "0 0 " + Wd + " " + Hd, role: "img", "aria-label": "Touchdown of each flight: sideways speed against distance from the pad" }, host);
    var X = function (v) { return l + Math.min(v, 2.5) / 2.5 * (Wd - l - r); }, Y = function (v) { return Hd - b - Math.min(v, 10) / 10 * (Hd - t - b); };
    el("rect", { x: X(0), y: Y(LAND.miss), width: X(LAND.vx) - X(0), height: Y(0) - Y(LAND.miss), class: "emu-box" }, svg);
    [0, 0.5, 1, 1.5, 2, 2.5].forEach(function (v) {
      el("line", { x1: X(v), x2: X(v), y1: t, y2: Hd - b, class: "grid" }, svg);
      el("text", { x: X(v), y: Hd - b + 16, class: "tick", "text-anchor": "middle" }, svg).textContent = v;
    });
    [0, 5, 10].forEach(function (v) {
      el("line", { x1: l, x2: Wd - r, y1: Y(v), y2: Y(v), class: "grid" }, svg);
      el("text", { x: l - 6, y: Y(v) + 4, class: "tick", "text-anchor": "end" }, svg).textContent = v;
    });
    el("text", { x: (l + Wd - r) / 2, y: Hd - 6, class: "tick", "text-anchor": "middle" }, svg).textContent = "sideways speed at touchdown [m/s]";
    el("text", { x: 12, y: (t + Hd - b) / 2, class: "tick", "text-anchor": "middle", transform: "rotate(-90 12 " + (t + Hd - b) / 2 + ")" }, svg).textContent = "miss [m]";
    res.forEach(function (q) {
      if (q.why === "lost attitude" || q.why === "time limit") return;
      el("circle", { cx: X(q.vx), cy: Y(q.miss), r: 4.5, class: q.ok ? "emu-ok" : "emu-bad" }, svg);
    });
  }
  function summary(res) {
    var ok = res.filter(function (q) { return q.ok; }).length, why = {};
    res.forEach(function (q) { if (!q.ok) why[q.why] = (why[q.why] || 0) + 1; });
    var w = Object.keys(why).map(function (k) { return why[k] + " " + k; }).join(", ");
    return "<b>" + ok + " of " + res.length + "</b> landed (seeds " + seed() + " to " + (seed() + res.length - 1) + ")" + (w ? ". Failures: " + w + "." : ".");
  }
  function runBatch() {
    var res = batch(settings(), seed(), N);
    $("e-batch-out").innerHTML = summary(res);
    scatter($("e-scatter"), res);
  }
  function sweep(key, vals, label, unit, scale) {
    var host = $("e-sweep"), out = $("e-sweep-out"), S0 = settings(), pts = [], i = 0;
    var btns = root.querySelectorAll("[data-sweep]");
    btns.forEach(function (b) { b.disabled = true; });
    out.textContent = "Running " + vals.length * N + " flights...";
    (function step() {
      var S = {}; for (var k in S0) S[k] = S0[k];
      S[key] = vals[i] / scale;
      var res = batch(S, seed(), N);
      pts.push([vals[i], res.filter(function (q) { return q.ok; }).length]);
      i++;
      drawSweep(host, pts, vals, label, unit, S0[key] * scale);
      if (i < vals.length) setTimeout(step, 0);
      else {
        out.innerHTML = "Success against " + label + ", " + N + " seeded flights per point, everything else as set above: " +
          pts.map(function (p) { return p[0] + unit + " " + p[1] + "/" + N; }).join(", ") + ".";
        btns.forEach(function (b) { b.disabled = false; });
      }
    })();
  }
  function drawSweep(host, pts, vals, label, unit, cur) {
    host.innerHTML = "";
    var Wd = 420, Hd = 260, l = 44, r = 14, t = 12, b = 40, lo = vals[0], hi = vals[vals.length - 1];
    var svg = el("svg", { viewBox: "0 0 " + Wd + " " + Hd, role: "img", "aria-label": "Landings out of " + N + " against " + label }, host);
    var X = function (v) { return l + (v - lo) / (hi - lo) * (Wd - l - r); }, Y = function (n) { return Hd - b - n / N * (Hd - t - b); };
    [0, 25, 50].forEach(function (n) {
      el("line", { x1: l, x2: Wd - r, y1: Y(n), y2: Y(n), class: "grid" }, svg);
      el("text", { x: l - 6, y: Y(n) + 4, class: "tick", "text-anchor": "end" }, svg).textContent = n;
    });
    vals.forEach(function (v) { el("text", { x: X(v), y: Hd - b + 16, class: "tick", "text-anchor": "middle" }, svg).textContent = v; });
    el("text", { x: (l + Wd - r) / 2, y: Hd - 6, class: "tick", "text-anchor": "middle" }, svg).textContent = label + " [" + unit.trim() + "]";
    el("text", { x: 12, y: (t + Hd - b) / 2, class: "tick", "text-anchor": "middle", transform: "rotate(-90 12 " + (t + Hd - b) / 2 + ")" }, svg).textContent = "landings of " + N;
    if (cur >= lo && cur <= hi) el("line", { x1: X(cur), x2: X(cur), y1: t, y2: Hd - b, class: "emu-cur" }, svg);
    el("polyline", { points: pts.map(function (p) { return X(p[0]) + "," + Y(p[1]); }).join(" "), class: "tl-line" }, svg);
    pts.forEach(function (p) { el("circle", { cx: X(p[0]), cy: Y(p[1]), r: 4.5, class: "dot-after" }, svg); });
  }

  /* ---------------------------------------------------------------- wiring */
  FIELDS.forEach(function (f) { $("e-" + f[0]).addEventListener("input", showValues); });
  $("e-fly").addEventListener("click", fly);
  $("e-replay").addEventListener("click", function () { if (run) play(); else fly(); });
  $("e-newseed").addEventListener("click", function () { $("e-seed").value = (seed() * 1103515245 + 12345) % 100000; fly(); });
  $("e-reset").addEventListener("click", function () {
    for (var k in DEFAULTS) $("e-" + k).value = DEFAULTS[k];
    $("e-seed").value = 1; showValues();
  });
  $("e-batch").addEventListener("click", runBatch);
  $("e-sweep-lat").addEventListener("click", function () { sweep("lat", [0, 50, 100, 150, 200, 250, 300], "latency", " ms", 1); });
  $("e-sweep-loss").addEventListener("click", function () { sweep("loss", [0, 10, 20, 30, 40], "packet loss", " %", 100); });
  document.addEventListener("visibilitychange", resume);
  if ("IntersectionObserver" in window)
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; resume(); }).observe(cv);
  window.addEventListener("resize", function () { size(); draw(tPlay); });
  root.classList.add("ready");
  showValues(); size(); fly(); runBatch();
})();
