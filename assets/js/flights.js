/* Hop-0 site, landing page: six recorded flights as cards (whole trajectory drawn; Replay plays it back at 6x),
 * and the faint trajectory field behind the wind banner. Data: assets/flights.json (see flightdraw.js).
 * Needs flightdraw.js. */
(function () {
  "use strict";
  var F = window.HopFlight;
  if (!F) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";
  var CARD_PICK = [1, 6, 9, 14, 5, 12];     // indices into flights.json: a spread of scenarios, wind and divert
  var cards = [], raf = 0, last = 0;

  function buildCards(flights) {
    var grid = document.getElementById("fgrid");
    if (!grid) return;
    CARD_PICK.forEach(function (fi, n) {
      var f = flights[fi]; if (!f) return;
      var a = document.createElement("article");
      a.className = "fc";
      a.innerHTML = '<canvas aria-hidden="true"></canvas><div class="prog"><i></i></div>' +
        '<div class="meta"><span>' + F.cap(f.label) + '</span><span>' + F.mmss(F.flightLen(f)) + '</span></div>' +
        '<h3>' + f.touch.vh.toFixed(2) + ' m/s sideways at touchdown, ' + f.touch.miss.toFixed(1) + ' m from the pad</h3>' +
        '<p>Wind ' + f.wind.toFixed(1) + ' m/s, apex ' + Math.round(f.apex) + ' m, divert ' + Math.round(f.d0) + ' m.</p>' +
        '<button type="button" class="btn-small">Replay</button>';
      grid.appendChild(a);
      var c = { el: a, cv: a.querySelector("canvas"), bar: a.querySelector(".prog i"), f: f, t: F.flightLen(f), playing: false };
      a.querySelector("button").addEventListener("click", function () {
        if (reduce) return;
        c.t = 0; c.playing = true; start();
      });
      cards.push(c);
    });
    sizeCards();
  }
  function sizeCards() {
    cards.forEach(function (c) {
      var w = c.cv.clientWidth, h = c.cv.clientHeight, d = Math.min(window.devicePixelRatio || 1, 2);
      if (!w || !h) return;
      c.cv.width = Math.round(w * d); c.cv.height = Math.round(h * d);
      c.ctx = c.cv.getContext("2d"); if (!c.ctx) return;
      c.ctx.setTransform(d, 0, 0, d, 0, 0); c.w = w; c.h = h;
      var smin = Math.min.apply(null, c.f.s), smax = Math.max.apply(null, c.f.s.concat([0]));
      var zmax = Math.max.apply(null, c.f.z);
      c.gy = h - 22;
      c.k = Math.min((w - 40) / Math.max(10, smax - smin), (c.gy - 26) / Math.max(10, zmax));
      c.ox = 20 + (w - 40 - (smax - smin) * c.k) / 2 - smin * c.k;
      drawCard(c, c.t);
    });
  }
  function drawCard(c, t) {
    var g = c.ctx; if (!g) return;
    var f = c.f, L = F.flightLen(f), T = Math.max(0, Math.min(t, L));
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
    var st = F.sample(f, T);
    g.lineTo(X(st.s), Y(st.z)); g.stroke();
    var landed = T >= L;
    F.drawPad(g, X(0), c.gy, landed, 12);
    F.drawRocket(g, X(st.s), Y(st.z), st.tilt, landed ? 0 : st.thr, 1, 0.62);
    g.fillStyle = "#cfd8e6"; g.font = "12px 'Inter Tight', ui-sans-serif, system-ui, sans-serif"; g.textAlign = "left";
    g.fillText(Math.round(Math.max(0, st.z)) + " m", 10, 18);
    if (landed) { g.textAlign = "right"; g.fillStyle = "#5fd39a"; g.fillText("landed", c.w - 10, 18); }
    c.bar.style.width = (100 * T / L) + "%";
  }
  function step(now) {
    raf = 0;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    var any = false;
    cards.forEach(function (c) {
      if (!c.playing) return;
      c.t += dt * F.SPEED * 1.5;
      if (c.t >= F.flightLen(c.f)) { c.t = F.flightLen(c.f); c.playing = false; }
      drawCard(c, c.t); any = any || c.playing;
    });
    if (any) raf = requestAnimationFrame(step); else last = 0;
  }
  function start() { if (!raf) { last = 0; raf = requestAnimationFrame(step); } }

  function bannerBg(flights) {          // every recorded trajectory, drawn once
    var svg = document.getElementById("banner-bg");
    if (!svg) return;
    svg.setAttribute("viewBox", "0 0 1000 500"); svg.setAttribute("preserveAspectRatio", "xMaxYMax slice");
    flights.forEach(function (f) {
      var p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", f.s.map(function (s, j) { return (j ? "L" : "M") + (760 + s * 2.2).toFixed(1) + " " + (480 - f.z[j] * 1.9).toFixed(1); }).join(" "));
      p.setAttribute("fill", "none"); p.setAttribute("stroke", "rgba(246,241,234,0.16)"); p.setAttribute("stroke-width", "1.4");
      svg.appendChild(p);
    });
  }
  F.load().then(function (d) {
    buildCards(d.flights); bannerBg(d.flights);
    window.addEventListener("resize", sizeCards);
  }).catch(function (e) {
    var g = document.getElementById("fgrid");
    if (g) g.innerHTML = '<p class="note">The recorded flights could not be loaded.</p>';
    if (window.console) console.warn(e.message);
  });
})();
