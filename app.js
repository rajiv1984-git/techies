(function () {
  const { products: P, banners: B } = window.CATALOG;
  const USD_RATE = 1500; // 1 USD = 1500 RWF (change here to update conversions)
  // Price markup (RWF): products under 5,000 get +500, products 5,000 and up get +2,000
  const markup = price => (price < 5000 ? 500 : 2000);
  P.forEach(p => { const m = markup(p.p); p.p += m; if (p.o) p.o += m; });
  B.forEach(b => { if (b.pp != null) b.pp += markup(b.pp); });
  const PER_PAGE = 24;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const bySlug = new Map(P.map(p => [p.s, p]));
  const NOIMG = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f1f5f9"/><text x="50" y="55" font-size="10" text-anchor="middle" fill="#94a3b8" font-family="sans-serif">Techies</text></svg>');

  // categories derived from the catalog
  const catMap = new Map();
  P.forEach(p => { const c = catMap.get(p.c) || { s: p.c, n: p.cn, cnt: 0, img: "" }; c.cnt++; if (!c.img && p.i) c.img = p.i; catMap.set(p.c, c); });
  const CATS = [...catMap.values()].sort((a, b) => a.n.localeCompare(b.n));

  // ---------- state ----------
  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem("techies_" + k)) ?? d; } catch { return d; } },
    set: (k, v) => localStorage.setItem("techies_" + k, JSON.stringify(v))
  };
  let lang = store.get("lang", "en"), cur = store.get("cur", "RWF"), cart = store.get("cart", {});
  const t = k => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function money(rwf) {
    if (rwf == null) return "";
    if (cur === "USD") {
      const v = rwf / USD_RATE;
      return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return "RWF " + Math.round(rwf).toLocaleString("en-US");
  }

  // ---------- components ----------
  function card(p) {
    const out = p.st <= 0;
    const disc = p.o && p.o > p.p ? Math.round((1 - p.p / p.o) * 100) : 0;
    return `<div class="card">
      <a class="img" href="#/product/${p.s}">${disc ? `<span class="badge">-${disc}%</span>` : ""}
        <img loading="lazy" src="${esc(p.i) || NOIMG}" alt="${esc(p.n)}" onerror="this.src='${NOIMG}'"></a>
      <div class="body">
        <a class="cat" href="#/shop?cat=${p.c}">${esc(p.cn)}</a>
        <a href="#/product/${p.s}"><h3>${esc(p.n)}</h3></a>
        <div class="stars">☆☆☆☆☆ <small>(0)</small></div>
        <div class="price">${money(p.p)}${disc ? `<s>${money(p.o)}</s>` : ""}</div>
        <div class="stock ${out ? "out" : "in"}">● ${out ? t("outStock") : t("inStock")}</div>
        <div class="acts">${out
          ? `<button class="btn-blue notify" data-notify="${p.id}">🔔 ${t("notify")}</button>`
          : `<button class="btn-orange" data-buy="${p.id}">${t("buyNow")}</button><button class="btn-blue" data-add="${p.id}">🛒 ${t("addCart")}</button>`}</div>
      </div>
      <a class="compare" href="#/product/${p.s}">⚖ ${t("compare")}</a>
    </div>`;
  }
  const grid = list => list.length ? `<div class="grid">${list.map(card).join("")}</div>` : `<p class="empty">${t("noResults")}</p>`;
  const secHead = (title, sub, link, linkTxt) => `<div class="sec-h"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div>${link ? `<a href="${link}">${linkTxt}</a>` : ""}</div>`;

  function shuffle(a, seed) { a = a.slice(); let s = seed; for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const inStock = P.filter(p => p.st > 0);
  const popular = inStock.slice().sort((a, b) => b.sold - a.sold);

  // ---------- pages ----------
  let heroIdx = 0, heroTimer;
  function home() {
    const heroes = B.length ? B : [{ t: popular[0].n, img: popular[0].i, slug: popular[0].s, pn: popular[0].n, pp: popular[0].p }];
    const featured = P.filter(p => p.f && p.st > 0);
    const feat = (featured.length >= 8 ? featured : popular).slice(0, 8);
    const rec = shuffle(inStock, 7).slice(0, 20);
    const trend = popular.slice(8, 13);
    const explore = shuffle(inStock, 42).slice(0, 40);
    const brands = ["Arduino", "Raspberry Pi", "ESP32", "STM32", "nRF24L01", "SIM800L", "Creality", "PIC", "ARM Cortex", "LoRaWAN", "RFID", "TensorFlow Lite"];
    return `
    <div class="hero-grid">
      <div class="hero" id="hero">
        <button class="hero-nav prev" data-hero="-1">‹</button>
        <div class="hero-l">
          <span class="pill">🌐 ${t("oneStop")}</span>
          <h1 id="heroTitle"></h1>
          <div class="hero-btns"><a class="btn-orange" id="heroBtn" href="#">🛍 ${t("viewProduct")}</a>
            <a class="btn-white" href="#/shop">🛒 ${t("shop")}</a></div>
          <div class="stats">
            <div><b>${P.length.toLocaleString("en-US")}+</b><span>${t("products")}</span></div>
            <div><b>2 hrs</b><span>${t("kigaliDelivery")}</span></div>
            <div><b>30K+</b><span>${t("itemsYear")}</span></div>
            <div><b>6</b><span>${t("countries")}</span></div>
          </div>
        </div>
        <a class="hero-card" id="heroCard" href="#"><img id="heroImg" alt=""><div class="tag">${t("featured")}</div><h3 id="heroPn"></h3><div class="pr" id="heroPp"></div><span class="btn-orange">${t("viewProduct")}</span></a>
        <button class="hero-nav next" data-hero="1">›</button>
        <div class="dots">${heroes.map((_, i) => `<i data-dot="${i}"></i>`).join("")}</div>
      </div>
      <div class="side-banners">
        <a class="sb b" href="#/shop?sort=new"><small>✨ ${t("newArrivals")}</small><h3>${t("newArrivalsT")}</h3><span>${t("seeNew")}</span></a>
      </div>
    </div>

    <section class="section">${secHead(t("featuredT"), t("featuredS"), "#/shop", t("viewAll"))}${grid(feat)}</section>

    <div class="features">
      <div class="feat"><i>⚡</i><div><b>${t("f1")}</b><span>${t("f1s")}</span></div></div>
      <div class="feat"><i>🎯</i><div><b>${t("f2")}</b><span>${t("f2s")}</span></div></div>
      <div class="feat"><i>⭐</i><div><b>${t("f3")}</b><span>${t("f3s")}</span></div></div>
      <div class="feat"><i>🛡️</i><div><b>${t("f4")}</b><span>${t("f4s")}</span></div></div>
    </div>

    <section class="section">${secHead(t("recT"), t("recS"), "#/shop", t("viewAll"))}${grid(rec)}</section>

    <section class="section">${secHead(t("catT"), t("catS"))}
      <div class="cats">${CATS.slice().sort((a, b) => b.cnt - a.cnt).slice(0, 20).map(catCard).join("")}</div></section>

    <section class="section"><div class="promo3">
      <a class="promo p2" href="#/shop?cat=artificial-intelligence"><small>${t("future")}</small><h3>${t("futureT")}</h3><span>${t("shopAI")}</span></a>
      <a class="promo p3" href="#/shop?cat=robotic-electromechanical"><small>${t("robo")}</small><h3>${t("roboT")}</h3><span>${t("shopRobo")}</span></a>
    </div></section>

    <section class="section">${secHead(t("trendT"), t("trendS"), "#/shop?sort=pop", t("viewAll"))}${grid(trend)}</section>
    <section class="section">${secHead(t("exploreT"), t("exploreS"), "#/shop", t("shopAll"))}${grid(explore)}</section>

    <section class="section"><div class="newsletter">
      <div><small><b>${t("stay")}</b></small><h2>${t("stayT")}</h2><p>${t("stayS")}</p></div>
      <form id="newsForm"><input type="email" required placeholder="${t("email")}"><button class="btn-orange">${t("subscribe")}</button></form>
    </div></section>

    <div class="marquee"><div><small>${t("compatible")}</small>${brands.concat(brands).map(b => `<span>${b}</span>`).join("")}</div></div>`;

    function catCard(c) { return `<a class="catc" href="#/shop?cat=${c.s}"><img loading="lazy" src="${esc(c.img) || NOIMG}" onerror="this.src='${NOIMG}'" alt=""><div><b>${esc(c.n)}</b><span>${c.cnt} ${t("productsN")}</span></div></a>`; }
  }

  function initHero() {
    const heroes = B.length ? B : [{ t: popular[0].n, img: popular[0].i, slug: popular[0].s, pn: popular[0].n, pp: popular[0].p }];
    const show = i => {
      heroIdx = (i + heroes.length) % heroes.length;
      const h = heroes[heroIdx], el = $("#hero"); if (!el) return;
      el.style.setProperty("--heroimg", `url("${h.img}")`);
      $("#heroTitle").textContent = h.t;
      $("#heroBtn").href = $("#heroCard").href = "#/product/" + h.slug;
      $("#heroImg").src = h.img; $("#heroPn").textContent = h.pn; $("#heroPp").textContent = money(h.pp);
      $$(".dots i").forEach((d, j) => d.classList.toggle("on", j === heroIdx));
    };
    show(heroIdx);
    clearInterval(heroTimer); heroTimer = setInterval(() => $("#hero") ? show(heroIdx + 1) : clearInterval(heroTimer), 6000);
    $$("[data-hero]").forEach(b => b.onclick = () => show(heroIdx + +b.dataset.hero));
    $$("[data-dot]").forEach(b => b.onclick = () => show(+b.dataset.dot));
  }

  function listPage(params, opts = {}) {
    const q = (params.get("q") || "").trim().toLowerCase();
    const cat = params.get("cat") || "";
    const sort = params.get("sort") || "pop";
    const page = Math.max(1, +params.get("page") || 1);
    let list = opts.base || P;
    if (cat) list = list.filter(p => p.c === cat);
    if (q) { const words = q.split(/\s+/); list = list.filter(p => { const n = (p.n + " " + p.cn).toLowerCase(); return words.every(w => n.includes(w)); }); }
    const sorters = { pop: (a, b) => (b.st > 0) - (a.st > 0) || b.sold - a.sold, new: (a, b) => b.id - a.id, low: (a, b) => a.p - b.p, high: (a, b) => b.p - a.p, name: (a, b) => a.n.localeCompare(b.n) };
    list = list.slice().sort(sorters[sort] || sorters.pop);
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    const pg = Math.min(page, pages);
    const slice = list.slice((pg - 1) * PER_PAGE, pg * PER_PAGE);
    const catName = cat ? (catMap.get(cat) || {}).n : "";
    const title = opts.title || catName || (q ? `“${esc(q)}”` : t("allProducts"));
    const route = opts.route || "shop";
    const link = (o) => { const p = new URLSearchParams(params); Object.entries(o).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k)); return `#/${route}?${p}`; };
    const nums = []; for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - pg) <= 2) nums.push(i); else if (nums[nums.length - 1] !== "…") nums.push("…");
    return `<div class="crumbs"><a href="#/">${t("home")}</a> › <a href="#/shop">${t("shop")}</a>${catName ? ` › ${esc(catName)}` : ""}</div>
    <div class="shop">
      <aside class="filters"><h4>${t("categories")}</h4>
        <a href="${link({ cat: "", page: "" })}" class="${cat ? "" : "on"}">${t("all")} <small>${(opts.base || P).length}</small></a>
        ${CATS.map(c => `<a href="${link({ cat: c.s, page: "" })}" class="${c.s === cat ? "on" : ""}">${esc(c.n)} <small>${c.cnt}</small></a>`).join("")}
      </aside>
      <div>
        ${opts.intro ? `<div class="page" style="margin:0 0 14px;padding:18px 22px"><h2 style="margin:0">${opts.title}</h2><p style="margin:4px 0 0;color:var(--muted)">${opts.intro}</p></div>` : ""}
        <div class="toolbar"><div><b>${title}</b> — ${t("showing")} ${list.length ? (pg - 1) * PER_PAGE + 1 : 0}–${Math.min(pg * PER_PAGE, list.length)} ${t("of")} ${list.length} ${t("results")}</div>
          <label>${t("sortBy")} <select id="sortSel">${["pop", "new", "low", "high", "name"].map(s => `<option value="${s}" ${s === sort ? "selected" : ""}>${t({ pop: "sPop", new: "sNew", low: "sLow", high: "sHigh", name: "sName" }[s])}</option>`).join("")}</select></label></div>
        ${grid(slice)}
        <div class="pager">
          <button ${pg <= 1 ? "disabled" : ""} data-go="${link({ page: pg - 1 })}">‹</button>
          ${nums.map(n => n === "…" ? `<button disabled>…</button>` : `<button class="${n === pg ? "on" : ""}" data-go="${link({ page: n })}">${n}</button>`).join("")}
          <button ${pg >= pages ? "disabled" : ""} data-go="${link({ page: pg + 1 })}">›</button>
        </div>
      </div>
    </div>`;
  }

  function productPage(slug) {
    const p = bySlug.get(slug);
    if (!p) return `<div class="page"><h1>404</h1><p>${t("noResults")}</p><a class="btn-blue" href="#/shop">${t("shop")}</a></div>`;
    const out = p.st <= 0;
    const related = P.filter(x => x.c === p.c && x.id !== p.id && x.st > 0).slice(0, 8);
    return `<div class="crumbs"><a href="#/">${t("home")}</a> › <a href="#/shop?cat=${p.c}">${esc(p.cn)}</a> › ${esc(p.n)}</div>
    <div class="pdp">
      <div class="gal"><img src="${esc(p.i) || NOIMG}" alt="${esc(p.n)}" onerror="this.src='${NOIMG}'"></div>
      <div>
        <a class="cat" style="color:var(--blue);font-weight:800;font-size:12px;text-transform:uppercase" href="#/shop?cat=${p.c}">${esc(p.cn)}</a>
        <h1>${esc(p.n)}</h1>
        <div class="stars">☆☆☆☆☆ <small>(0)</small> · <small>${p.sold.toLocaleString("en-US")} ${t("sold")}</small></div>
        <div class="price">${money(p.p)}${p.o && p.o > p.p ? `<s>${money(p.o)}</s>` : ""}</div>
        <div class="stock ${out ? "out" : "in"}">${t("availability")}: ● ${out ? t("outStock") : t("inStock")}</div>
        <div class="buy">
          ${out ? `<button class="btn-blue" data-notify="${p.id}">🔔 ${t("notify")}</button>` : `
          <div class="qty"><button data-q="-1">−</button><input id="qty" value="1" inputmode="numeric"><button data-q="1">+</button></div>
          <button class="btn-orange" data-buy="${p.id}" data-useqty>${t("buyNow")}</button>
          <button class="btn-blue" data-add="${p.id}" data-useqty>🛒 ${t("addCart")}</button>`}
        </div>
        <ul><li>${t("pdp1")}</li><li>${t("pdp2")}</li><li>${t("pdp3")}</li><li>${t("pdp4")}</li></ul>
      </div>
    </div>
    ${related.length ? `<section class="section">${secHead(esc(p.cn), "", "#/shop?cat=" + p.c, t("viewAll"))}${grid(related)}</section>` : ""}`;
  }

  function categoriesPage() {
    return `<section class="section">${secHead(t("catT"), t("catS"))}<div class="cats">${CATS.map(c => `<a class="catc" href="#/shop?cat=${c.s}"><img loading="lazy" src="${esc(c.img) || NOIMG}" onerror="this.src='${NOIMG}'" alt=""><div><b>${esc(c.n)}</b><span>${c.cnt} ${t("productsN")}</span></div></a>`).join("")}</div></section>`;
  }
  const aboutPage = () => `<div class="page"><h1>${t("aboutT")}</h1><p>${t("aboutP")}</p><p><b>${P.length.toLocaleString("en-US")}+</b> ${t("productsN")} · <b>${CATS.length}</b> ${t("categories").toLowerCase()}</p></div>`;
  const contactPage = () => `<div class="page"><h1>${t("contactT")}</h1><p>${t("contactS")}</p>
    <p>📍 ${t("location")} &nbsp; 📞 +250 7XX XXX XXX &nbsp; ✉️ sales@techies.rw</p>
    <form id="contactForm"><input required placeholder="${t("name")}"><input placeholder="${t("phone")}"><input type="email" placeholder="${t("email")}"><textarea rows="5" required placeholder="${t("message")}"></textarea><button class="btn-blue">${t("send")}</button></form></div>`;

  // ---------- router ----------
  function render() {
    const [path, qs] = (location.hash.slice(1) || "/").split("?");
    const params = new URLSearchParams(qs || "");
    const parts = path.split("/").filter(Boolean);
    const app = $("#app");
    let html;
    switch (parts[0]) {
      case undefined: html = home(); break;
      case "shop": html = listPage(params); break;
      case "deals": html = listPage(params, { route: "deals", title: t("hotDeals"), intro: t("dealsS"), base: (() => { const d = P.filter(p => p.o && p.o > p.p); return d.length ? d : P.filter(p => p.st > 0 && p.p >= 5000).sort((a, b) => b.sold - a.sold).slice(0, 96); })() }); break;
      case "preorder": html = listPage(params, { route: "preorder", title: t("preorderT"), intro: t("preorderS"), base: P.filter(p => p.st <= 0) }); break;
      case "product": html = productPage(parts[1]); break;
      case "categories": html = categoriesPage(); break;
      case "about": html = aboutPage(); break;
      case "contact": html = contactPage(); break;
      default: html = home();
    }
    app.innerHTML = html;
    if (!parts[0]) initHero();
    $$(".subnav a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#/" + (parts[0] || "shop")));
    const ss = $("#sortSel"); if (ss) ss.onchange = () => { params.set("sort", ss.value); params.delete("page"); location.hash = `#/${parts[0]}?${params}`; };
    if (parts[0] === "shop") { $("#searchInput").value = params.get("q") || ""; $("#searchCat").value = params.get("cat") || ""; }
    if (!render.keepScroll) window.scrollTo(0, 0);
  }

  // ---------- cart ----------
  function saveCart() { store.set("cart", cart); updateCartUI(); }
  function addToCart(id, qty = 1) { cart[id] = (cart[id] || 0) + qty; saveCart(); toast("✓ " + t("added")); }
  function updateCartUI() {
    const ids = Object.keys(cart);
    const count = ids.reduce((s, id) => s + cart[id], 0);
    $("#cartCount").textContent = count;
    const byId = id => P.find(p => p.id == id);
    let total = 0;
    $("#drawerBody").innerHTML = ids.length ? ids.map(id => {
      const p = byId(id); if (!p) return ""; total += p.p * cart[id];
      return `<div class="ci"><img src="${esc(p.i) || NOIMG}" onerror="this.src='${NOIMG}'"><div><div class="n">${esc(p.n)}</div><div class="q"><button data-cq="${id}" data-d="-1">−</button>${cart[id]}<button data-cq="${id}" data-d="1">+</button> × ${money(p.p)}</div></div><button class="rm" data-rm="${id}">🗑</button></div>`;
    }).join("") : `<div class="empty">🛒<br>${t("emptyCart")}</div>`;
    $("#cartTotal").textContent = money(total);
  }
  const openDrawer = (o) => { $("#drawer").classList.toggle("open", o); $("#overlay").classList.toggle("open", o); };

  // ---------- language / currency ----------
  function applyLang() {
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
    $("#searchInput").placeholder = t("searchPh");
    $("#swLang").textContent = lang.toUpperCase();
    $("#swCur").textContent = cur;
    $("#swFlag").textContent = cur === "RWF" ? "FRw" : "$";
    $$("[data-lang]").forEach(b => b.classList.toggle("on", b.dataset.lang === lang));
    $$("[data-cur]").forEach(b => b.classList.toggle("on", b.dataset.cur === cur));
  }

  // ---------- misc ----------
  let toastT;
  function toast(msg) { const el = $("#toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 2200); }
  function modal(kind) {
    const reg = kind === "register";
    $("#modalC").innerHTML = `<button class="x" data-close>✕</button><h2>${t(reg ? "registerT" : "loginT")}</h2>
      ${reg ? `<input placeholder="${t("fullName")}">` : ""}<input placeholder="${t("phone")} / ${t("email")}"><input type="password" placeholder="${t("password")}">
      <button class="btn-blue" data-close>${t(reg ? "register" : "login")}</button>`;
    $("#modal").classList.add("open");
  }

  // ---------- events ----------
  document.addEventListener("click", e => {
    const el = e.target.closest("button,a,[data-close]"); if (!el) { $("#swMenu").classList.remove("open"); $("#suggest").classList.remove("open"); return; }
    const d = el.dataset;
    const qtyVal = () => Math.max(1, parseInt(($("#qty") || {}).value) || 1);
    if (d.add) { addToCart(+d.add, d.useqty !== undefined ? qtyVal() : 1); }
    else if (d.buy) { cart[d.buy] = (cart[d.buy] || 0) + (d.useqty !== undefined ? qtyVal() : 1); saveCart(); openDrawer(true); }
    else if (d.notify) { toast("🔔 " + t("notify") + " ✓"); }
    else if (d.q) { const q = $("#qty"); q.value = Math.max(1, (parseInt(q.value) || 1) + +d.q); }
    else if (d.cq) { cart[d.cq] = Math.max(0, cart[d.cq] + +d.d); if (!cart[d.cq]) delete cart[d.cq]; saveCart(); }
    else if (d.rm) { delete cart[d.rm]; saveCart(); }
    else if (d.go) { location.hash = d.go; }
    else if (d.lang) { lang = d.lang; store.set("lang", lang); applyLang(); render.keepScroll = true; render(); render.keepScroll = false; updateCartUI(); $("#swMenu").classList.remove("open"); }
    else if (d.cur) { cur = d.cur; store.set("cur", cur); applyLang(); render.keepScroll = true; render(); render.keepScroll = false; updateCartUI(); $("#swMenu").classList.remove("open"); }
    else if (d.modal) { modal(d.modal); }
    else if (d.close !== undefined) { $("#modal").classList.remove("open"); }
    if (el.id === "swBtn") { $("#swMenu").classList.toggle("open"); return; }
    if (!el.closest("#switcher")) $("#swMenu").classList.remove("open");
    if (!el.closest("#searchForm")) $("#suggest").classList.remove("open");
  });
  $("#modal").addEventListener("click", e => { if (e.target.id === "modal") $("#modal").classList.remove("open"); });
  $("#cartBtn").onclick = () => openDrawer(true);
  $("#closeDrawer").onclick = $("#overlay").onclick = () => openDrawer(false);
  $("#checkoutBtn").onclick = () => { if (!Object.keys(cart).length) return toast(t("emptyCart")); cart = {}; saveCart(); openDrawer(false); toast("✓ " + t("checkoutMsg")); };
  document.addEventListener("submit", e => {
    e.preventDefault();
    if (e.target.id === "searchForm") {
      const q = $("#searchInput").value.trim(), c = $("#searchCat").value;
      const p = new URLSearchParams(); if (q) p.set("q", q); if (c) p.set("cat", c);
      $("#suggest").classList.remove("open"); location.hash = "#/shop?" + p;
    } else if (e.target.id === "newsForm") { toast(t("subscribed")); e.target.reset(); }
    else if (e.target.id === "contactForm") { toast(t("sent")); e.target.reset(); }
  });
  $("#searchInput").addEventListener("input", e => {
    const q = e.target.value.trim().toLowerCase(), box = $("#suggest");
    if (q.length < 2) return box.classList.remove("open");
    const words = q.split(/\s+/);
    const hits = P.filter(p => words.every(w => p.n.toLowerCase().includes(w))).slice(0, 8);
    box.innerHTML = hits.map(p => `<a href="#/product/${p.s}"><img src="${esc(p.i) || NOIMG}" onerror="this.src='${NOIMG}'"><span>${esc(p.n)}</span><span class="sp">${money(p.p)}</span></a>`).join("") || `<div class="empty" style="padding:16px">${t("noResults")}</div>`;
    box.classList.add("open");
  });
  $("#suggest").addEventListener("click", () => $("#suggest").classList.remove("open"));

  // ---------- boot ----------
  $("#searchCat").insertAdjacentHTML("beforeend", CATS.map(c => `<option value="${c.s}">${esc(c.n)}</option>`).join(""));
  $("#year").textContent = new Date().getFullYear();
  window.addEventListener("hashchange", render);
  applyLang(); updateCartUI(); render();
})();
