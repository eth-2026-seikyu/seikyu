// Minimal deck runtime: fixed-size slides scaled to the viewport, keyboard
// navigation, and a deep-linkable #n hash. No dependencies, works offline.
(function () {
  var stage = document.getElementById("stage");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  if (!stage || !slides.length) return;
  var i = 0;

  slides.forEach(function (s, n) {
    if (!s.querySelector(".num")) {
      var num = document.createElement("div");
      num.className = "num";
      num.textContent = n + 1 + " / " + slides.length;
      s.appendChild(num);
    }
    if (!s.querySelector(".brand")) {
      var b = document.createElement("div");
      b.className = "brand";
      b.textContent = "seikyu.xyz";
      s.appendChild(b);
    }
  });

  function show(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach(function (s, k) { s.classList.toggle("on", k === i); });
    if (history.replaceState) history.replaceState(null, "", "#" + (i + 1));
  }

  function fit() {
    // Contain the 1280x720 slide in the viewport; never upscale past 1.6x so
    // a huge external display doesn't blow the images out.
    var s = Math.min(window.innerWidth / 1280, window.innerHeight / 720, 1.6);
    stage.style.transform = "translate(-50%, -50%) scale(" + s + ")";
  }

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (k === "ArrowRight" || k === "PageDown" || k === " " || k === "Enter") { show(i + 1); e.preventDefault(); }
    else if (k === "ArrowLeft" || k === "PageUp" || k === "Backspace") { show(i - 1); e.preventDefault(); }
    else if (k === "Home") { show(0); e.preventDefault(); }
    else if (k === "End") { show(slides.length - 1); e.preventDefault(); }
    else if (k === "f" || k === "F") {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    }
  });

  document.addEventListener("click", function (e) {
    if (e.target.closest("a")) return;
    show(i + (e.clientX < window.innerWidth * 0.25 ? -1 : 1));
  });

  // Changing only the hash is a same-document navigation, so react to it too —
  // that makes deep links and the browser's back button work during a talk.
  window.addEventListener("hashchange", function () {
    var n = parseInt((location.hash || "").slice(1), 10);
    if (!isNaN(n) && n - 1 !== i) show(n - 1);
  });

  window.addEventListener("resize", fit);
  fit();
  var start = parseInt((location.hash || "").slice(1), 10);
  show(isNaN(start) ? 0 : start - 1);
})();
