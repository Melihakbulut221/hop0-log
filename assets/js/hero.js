/* Hop-0 site, home page: replays recorded landings (assets/flights.json, see flightdraw.js) behind the title.
 * The only data on screen is real: trajectory, attitude and throttle (plume length, 0.1 steps) of each
 * record, and the touchdown speed and miss distance. Pause button; stops drawing when off-screen or hidden;
 * prefers-reduced-motion shows all trajectories at once. Needs flightdraw.js. */
(function () {
  "use strict";
  var F = window.HopFlight, cv = document.getElementById("hero-canvas");
  if (!F || !cv) return;
  var ctx = cv.getContext("2d");
  if (!ctx) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hero = cv.parentNode, copy = hero.querySelector(".hero-copy");
  var featT = document.getElementById("feat-t"), featD = document.getElementById("feat-d"), feat = document.getElementById("feat");
  var btn = document.getElementById("hero-pause");
  var ORDER = [], lanes = [], next = 0, W = 0, H = 0, scale = 1, groundY = 0, stars = [];
  var paused = reduce, visible = true, featLast = -10;

  function rand(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = H - (W < 760 ? 112 : 64);                    // the caption and the pause button sit below the ground line
    var top = 70, ct = cv.getBoundingClientRect().top;
    if (W < 760) [copy, feat].forEach(function (n) { if (n) top = Math.max(top, n.getBoundingClientRect().bottom - ct + 16); });
    scale = Math.max(0.6, (groundY - top) / 235);      // the highest apex (~230 m) fits under the text
    var n = W < 560 ? 3 : (W < 900 ? 4 : (W < 1300 ? 5 : 6));
    if (lanes.length !== n) { lanes = []; for (var i = 0; i < n; i++) lanes.push(newLane(i, n, i * 1.1)); }
    else lanes.forEach(function (l, i) { l.cx = laneX(i, n); });
    var r = rand(7); stars = [];                          // a fixed, static star field
    for (var s = 0; s < Math.round(W * H / 12000); s++) stars.push([r() * W, r() * groundY * 0.8, r() * 1.1 + 0.3, 0.25 + 0.4 * r()]);
  }
  function laneX(i, n) { var w = W / n; return w * i + w * 0.66; }
  function newLane(i, n, delay) {
    var f = ORDER.length ? ORDER[(next++) % ORDER.length] : null;
    return { cx: laneX(i, n), f: f, t: -delay, done: -1, trail: [] };
  }
  function sky() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b1220"); g.addColorStop(0.7, "#14233b"); g.addColorStop(1, "#1d3150");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    stars.forEach(function (s) { ctx.globalAlpha = s[3]; ctx.fillStyle = "#cfd8e6"; ctx.fillRect(s[0], s[1], s[2], s[2]); });
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0e1726"; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = "#2a3b55"; ctx.fillRect(0, groundY, W, 1.5);
  }
  function setFeat(f) {
    if (!featT) return;
    var now = performance.now() / 1000;
    if (now - featLast < 2.5) return;
    featLast = now;
    featT.textContent = "Landed at " + f.touch.vh.toFixed(2) + " m/s sideways, " + f.touch.miss.toFixed(1) + " m from the pad";
    featD.textContent = F.cap(f.label) + ". Wind " + f.wind.toFixed(1) + " m/s.";
  }
  function frame(dt) {
    sky();
    lanes.forEach(function (l, i) {
      F.drawPad(ctx, l.cx, groundY, l.done >= 0, 24);
      if (!l.f) return;
      l.t += dt * F.SPEED;
      if (l.t < 0) return;
      var st = F.sample(l.f, Math.min(l.t, F.flightLen(l.f)));
      var px = l.cx + st.s * scale, py = groundY - Math.max(0, st.z) * scale;
      if (l.done < 0) {
        l.trail.push([px, py]); if (l.trail.length > 160) l.trail.shift();
        if (st.end) { l.done = 0; setFeat(l.f); }
      } else l.done += dt;
      ctx.strokeStyle = "rgba(109,167,236,0.35)"; ctx.lineWidth = 1.2; ctx.beginPath();
      l.trail.forEach(function (p, j) { if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
      ctx.stroke();
      var fade = l.done > 2.2 ? Math.max(0, 1 - (l.done - 2.2) / 0.8) : 1;
      F.drawRocket(ctx, px, py, st.tilt, l.done >= 0 ? 0 : st.thr, fade, 1);
      if (l.done >= 0 && l.done < 2.6) {
        ctx.globalAlpha = fade; ctx.fillStyle = "#cfe3ff"; ctx.textAlign = "center";
        ctx.font = "12px 'Inter Tight', ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(l.f.touch.vh.toFixed(2) + " m/s", l.cx, groundY + 18);
        ctx.globalAlpha = 1;
      }
      if (l.done > 3.0) lanes[i] = newLane(i, lanes.length, 0.4 + Math.random());
    });
  }
  function still() {                    // all trajectories and landed vehicles, no motion
    sky();
    lanes.forEach(function (l) {
      F.drawPad(ctx, l.cx, groundY, true, 24); if (!l.f) return;
      ctx.strokeStyle = "rgba(109,167,236,0.45)"; ctx.lineWidth = 1.2; ctx.beginPath();
      l.f.s.forEach(function (s, j) {
        var px = l.cx + s * scale, py = groundY - Math.max(0, l.f.z[j]) * scale;
        if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      });
      ctx.stroke();
      F.drawRocket(ctx, l.cx + l.f.s[l.f.s.length - 1] * scale, groundY, 0, 0, 1, 1);
    });
  }
  var last = 0, raf = 0;
  function loop(now) {
    raf = 0;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    frame(dt);
    schedule();
  }
  function schedule() {
    if (!paused && visible && !document.hidden && !raf) raf = requestAnimationFrame(loop);
    if (paused || !visible) last = 0;
  }
  function setPaused(p) {
    paused = p;
    if (btn) { btn.setAttribute("aria-pressed", p ? "true" : "false"); btn.textContent = p ? "Play replay" : "Pause replay"; }
    if (p) { if (raf) cancelAnimationFrame(raf); raf = 0; still(); } else schedule();
  }
  F.load().then(function (d) {
    ORDER = d.flights.slice();           // shuffled copy so every visit starts with different flights
    for (var i = ORDER.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = ORDER[i]; ORDER[i] = ORDER[j]; ORDER[j] = t; }
    lanes = []; resize();
    if (btn) { btn.hidden = false; btn.addEventListener("click", function () { setPaused(!paused); }); }
    window.addEventListener("resize", function () { resize(); if (paused) still(); });
    document.addEventListener("visibilitychange", schedule);
    if ("IntersectionObserver" in window)
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; schedule(); }).observe(hero);
    setPaused(paused);
  }).catch(function () { resize(); sky(); });
})();
