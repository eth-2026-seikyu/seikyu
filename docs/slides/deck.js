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

  // ---- shared sequence diagram -------------------------------------------
  // One drawing, defined once so all four decks tell the same story. A deck
  // asks for it with <figure class="seq" data-hi="worldid,buy"></figure>; the
  // keys listed in data-hi are the parts that deck picks out in the accent
  // colour, and data-sub-<lane> rewrites a lane's subtitle for that audience.
  var LANES = [
    { k: "supplier", t: "Supplier", s: "delivered the work", x: 140, w: 190 },
    { k: "invoice", t: "The invoice", s: "an ENS name", x: 455, w: 205 },
    { k: "investor", t: "Investor", s: "has cash today", x: 770, w: 190 },
    { k: "debtor", t: "Debtor company", s: "owes the money", x: 1035, w: 230 },
  ];

  var STEPS = [
    { type: "band", y: 82, t: "Today" },
    { type: "arrow", k: "issue", from: "supplier", to: "invoice", y: 118,
      t: "Lists the invoice — one signature",
      n: "the name expires on the due date" },
    { type: "arrow", k: "ack", from: "debtor", to: "invoice", y: 176,
      t: "Confirms the invoice is real" },
    { type: "note", k: "worldid", lane: "investor", y: 228, w: 258,
      t: "Proves they are one real person" },
    { type: "arrow", k: "buy", from: "investor", to: "supplier", y: 292,
      t: "Pays 950 today",
      n: "straight to the supplier — nothing sits in escrow" },
    { type: "arrow", k: "transfer", from: "invoice", to: "investor", y: 348,
      t: "Ownership moves to the investor" },
    { type: "band", y: 380, t: "On the due date, 60 days later" },
    { type: "arrow", k: "settle", from: "debtor", to: "investor", y: 422,
      t: "Pays the full 1,000" },
    { type: "end", k: "retire", lane: "invoice", y: 462,
      t: "The name retires with the debt" },
  ];

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  function txt(x, y, cls, anchor, s) {
    return '<text x="' + x + '" y="' + y + '" class="' + cls +
      '" text-anchor="' + anchor + '">' + esc(s) + "</text>";
  }

  function drawSequence(fig) {
    var lane = {};
    LANES.forEach(function (l) { lane[l.k] = l; });
    var hi = (fig.getAttribute("data-hi") || "")
      .split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    function label(p) { return fig.getAttribute("data-t-" + p.k) || p.t; }
    function g(key, inner) {
      var on = key && hi.indexOf(key) !== -1 ? " hi" : "";
      return '<g class="st' + on + '">' + inner + "</g>";
    }

    var s = "";
    LANES.forEach(function (l) {
      var sub = fig.getAttribute("data-sub-" + l.k) || l.s;
      s += g(l.k,
        '<rect class="head" x="' + (l.x - l.w / 2) + '" y="0" width="' + l.w +
          '" height="54" rx="10"/>' +
        txt(l.x, 24, "lane-t", "middle", l.t) +
        txt(l.x, 43, "lane-s", "middle", sub) +
        '<line class="life" x1="' + l.x + '" y1="54" x2="' + l.x + '" y2="478"/>');
    });

    STEPS.forEach(function (p) {
      if (p.type === "band") {
        s += '<line class="bd" x1="20" y1="' + p.y + '" x2="1140" y2="' + p.y + '"/>' +
          txt(20, p.y + 5, "band-t", "start", p.t);
        return;
      }
      if (p.type === "note") {
        var l = lane[p.lane];
        s += g(p.k,
          '<rect class="bx" x="' + (l.x - p.w / 2) + '" y="' + (p.y - 21) +
            '" width="' + p.w + '" height="42" rx="10"/>' +
          txt(l.x, p.y + 6, "", "middle", label(p)));
        return;
      }
      if (p.type === "end") {
        var e = lane[p.lane], d = 8;
        s += g(p.k,
          '<line class="xm" x1="' + (e.x - d) + '" y1="' + (p.y - d) + '" x2="' +
            (e.x + d) + '" y2="' + (p.y + d) + '"/>' +
          '<line class="xm" x1="' + (e.x + d) + '" y1="' + (p.y - d) + '" x2="' +
            (e.x - d) + '" y2="' + (p.y + d) + '"/>' +
          txt(e.x + 20, p.y + 6, "note-t", "start", label(p)));
        return;
      }
      var a = lane[p.from], b = lane[p.to], dir = b.x > a.x ? 1 : -1;
      var x1 = a.x + 3 * dir, x2 = b.x - 9 * dir, mid = (x1 + x2) / 2;
      s += g(p.k,
        '<line class="ar" x1="' + x1 + '" y1="' + p.y + '" x2="' + x2 +
          '" y2="' + p.y + '"/>' +
        txt(mid, p.y - 10, "", "middle", label(p)) +
        (p.n ? txt(mid, p.y + 20, "note-t", "middle", p.n) : ""));
    });

    fig.innerHTML =
      '<svg viewBox="0 0 1160 500" role="img" aria-label="How an invoice moves ' +
      'from the supplier to an investor and is settled by the debtor company">' +
      '<defs>' +
      '<marker id="seq-arrow" viewBox="0 0 10 10" refX="9" refY="5" ' +
        'markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
        '<path d="M0,0 L10,5 L0,10 z" class="ah"/></marker>' +
      '<marker id="seq-arrow-hi" viewBox="0 0 10 10" refX="9" refY="5" ' +
        'markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
        '<path d="M0,0 L10,5 L0,10 z" class="ah hi"/></marker>' +
      "</defs>" + s + "</svg>";
  }

  Array.prototype.forEach.call(document.querySelectorAll("figure.seq"), drawSequence);

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
