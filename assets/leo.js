/* Hop-0 site: the first orbital product. Payload vs liftoff mass from research/leo_min (site_summary.json, embedded
 * in the page), drawn as an animated chart with uncertainty bands; hover or focus a point for its row. */
(function () {
  "use strict";
  var host = document.getElementById("leo-chart");
  if (!host) return;
  var D = JSON.parse(document.getElementById("leo-data").textContent);
  var P = D.payload_vs_liftoff_mass;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";
  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  var narrow = host.clientWidth < 560;
  var W = narrow ? Math.max(320, host.clientWidth - 20) : 760, H = narrow ? 360 : 400, L = 52, R = 24, T = 18, B = 46;
  var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "group", "aria-label": "Liftoff mass against payload to a 500 km orbit" }, host);
  var lx = function (kg) { return L + (Math.log10(kg) - 0) / (Math.log10(400) - 0) * (W - L - R); };
  var ly = function (t) { return T + (1 - (Math.log10(t) - Math.log10(1.5)) / (Math.log10(40) - Math.log10(1.5))) * (H - T - B); };
  [1, 5, 25, 50, 150, 300].forEach(function (kg) {
    el("line", { x1: lx(kg), x2: lx(kg), y1: T, y2: H - B, class: "grid" }, svg);
    el("text", { x: lx(kg), y: H - B + 18, class: "tick", "text-anchor": "middle" }, svg).textContent = kg;
  });
  [2, 5, 10, 20, 30].forEach(function (t) {
    el("line", { x1: L, x2: W - R, y1: ly(t), y2: ly(t), class: "grid" }, svg);
    el("text", { x: L - 8, y: ly(t) + 4, class: "tick", "text-anchor": "end" }, svg).textContent = t + " t";
  });
  el("text", { x: (L + W - R) / 2, y: H - 6, class: "tick", "text-anchor": "middle" }, svg).textContent = "payload to a 500 km orbit [kg]";
  // uncertainty band
  var top = P.map(function (p) { return lx(p.payload_kg) + "," + ly(p.liftoff_t_max); });
  var bot = P.slice().reverse().map(function (p) { return lx(p.payload_kg) + "," + ly(p.liftoff_t_min); });
  var band = el("polygon", { points: top.concat(bot).join(" "), class: "leo-band" }, svg);
  var line = el("polyline", { points: P.map(function (p) { return lx(p.payload_kg) + "," + ly(p.liftoff_t); }).join(" "), class: "leo-line" }, svg);
  var info = document.getElementById("leo-info"), def = info ? info.innerHTML : "";
  var pts = P.map(function (p, i) {
    var ell = /elliptical/.test(p.orbit), rec = p.payload_kg === 300;
    var g = el("g", { class: "leo-pt" + (rec ? " rec" : ""), tabindex: 0, role: "img",
      "aria-label": p.payload_kg + " kg: " + p.liftoff_t + " t liftoff, range " + p.liftoff_t_min + " to " + p.liftoff_t_max + " t, " + p.stages }, svg);
    el("line", { x1: lx(p.payload_kg), x2: lx(p.payload_kg), y1: ly(p.liftoff_t_min), y2: ly(p.liftoff_t_max), class: "leo-err" }, g);
    el("circle", { cx: lx(p.payload_kg), cy: ly(p.liftoff_t), r: rec ? 9 : 7, class: ell ? "leo-dot hollow" : "leo-dot" }, g);
    var lab = el("text", { x: lx(p.payload_kg) + (i === P.length - 1 ? -12 : 12), y: ly(p.liftoff_t) - 10,
      "text-anchor": i === P.length - 1 ? "end" : "start", class: "val" }, g);
    lab.textContent = p.liftoff_t + " t";
    function on() {
      svg.classList.add("dim"); g.classList.add("hl");
      if (info) info.innerHTML = "<b>" + p.payload_kg + " kg</b> · " + p.stages + " · liftoff " + p.liftoff_t + " t (5-95 %: " +
        p.liftoff_t_min + "-" + p.liftoff_t_max + " t) · " + p.orbit + (rec ? " · <b>recommended first product</b>" : "");
    }
    function off() { svg.classList.remove("dim"); g.classList.remove("hl"); if (info) info.innerHTML = def; }
    g.addEventListener("mouseenter", on); g.addEventListener("focus", on); g.addEventListener("mouseleave", off); g.addEventListener("blur", off);
    return g;
  });
  if (reduce || !("IntersectionObserver" in window)) return;
  var Ll = line.getTotalLength ? line.getTotalLength() : 1000;
  line.style.strokeDasharray = Ll; line.style.strokeDashoffset = Ll; band.style.opacity = 0;
  pts.forEach(function (g) { g.style.opacity = 0; });
  var io = new IntersectionObserver(function (es) {
    if (!es[0].isIntersecting) return; io.disconnect();
    var t0 = performance.now();
    (function f(now) {
      var u = Math.min(1, (now - t0) / 2200), e = 1 - Math.pow(1 - u, 3);
      line.style.strokeDashoffset = Ll * (1 - e); band.style.opacity = Math.min(1, u * 1.6);
      pts.forEach(function (g, i) { g.style.opacity = Math.max(0, Math.min(1, (e * P.length - i))); });
      if (u < 1) requestAnimationFrame(f);
    })(t0);
  }, { threshold: 0.3 });
  io.observe(host);
})();
