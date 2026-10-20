(() => {
  "use strict";

  /* ---------- tiện ích ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const vnd = n => Number(n).toLocaleString("vi-VN") + "₫";
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem("cl_" + k)); return v === null || v === undefined ? d : v; } catch { return d; } };
  const store = (k, v) => { try { localStorage.setItem("cl_" + k, JSON.stringify(v)); } catch { /* bỏ qua */ } };
  const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
  const stars = r => { const n = Math.round(r); return `<span class="st">${"★".repeat(n)}${"☆".repeat(5 - n)}</span>`; };
  const USE_LABEL = { gaming: "Chơi game", office: "Văn phòng", student: "Sinh viên", creator: "Đồ họa / dựng video" };

  /* ---------- dữ liệu ---------- */
  const ALL = {};
  PRODUCTS.forEach(p => { ALL[p.id] = p; });
  Object.entries(PARTS).forEach(([slot, list]) => list.forEach(p => {
    ALL[p.id] = { ...p, slot, cat: "part", brand: "Linh kiện", emoji: "🧩" };
  }));

  let cart = load("cart", {});
  let wish = load("wish", []).filter(id => ALL[id]);
  let cmp = load("cmp", []).filter(id => ALL[id]);
  let alerts = load("alerts", {});
  let coupon = load("coupon", "");
  let bSel = load("build", {});
  Object.keys(cart).forEach(id => { if (!ALL[id]) delete cart[id]; });

  const state = { cat: "all", q: "", max: 50000000, sort: "pop" };

  /* ---------- toast ---------- */
  let toastTimer;
  const toast = msg => {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  };

  /* ---------- giao diện sáng/tối ---------- */
  const setTheme = t => { document.documentElement.dataset.theme = t; store("theme", t); };
  setTheme(load("theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  $("#btnTheme").onclick = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");

  /* ---------- thẻ sản phẩm ---------- */
  const discPct = p => (p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0);
  const thumb = p => (p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">` : p.emoji);

  const card = p => {
    const d = discPct(p);
    return `<article class="card">
      <button class="thumb" data-act="view" data-id="${p.id}" aria-label="Xem ${esc(p.name)}">${thumb(p)}${d ? `<span class="badge">-${d}%</span>` : ""}</button>
      <div class="body">
        <div class="brand">${esc(p.brand)}</div>
        <h3><a href="#" data-act="view" data-id="${p.id}">${esc(p.name)}</a></h3>
        <div class="rating">${stars(p.rating)} ${p.rating} · ${p.sold} đã bán</div>
        <div class="price">${vnd(p.price)}${p.old > p.price ? `<s>${vnd(p.old)}</s>` : ""}</div>
        <div class="row">
          <button class="btn sm" data-act="add" data-id="${p.id}">Thêm vào giỏ</button>
          <button class="icon sm ${wish.includes(p.id) ? "on" : ""}" data-act="wish" data-id="${p.id}" title="Yêu thích" aria-label="Yêu thích">♥</button>
          <button class="icon sm ${cmp.includes(p.id) ? "on" : ""}" data-act="cmp" data-id="${p.id}" title="So sánh" aria-label="So sánh">⚖️</button>
        </div>
      </div>
    </article>`;
  };

  /* ---------- danh sách + bộ lọc ---------- */
  const renderChips = () => {
    $("#chips").innerHTML = [{ id: "all", name: "Tất cả", icon: "✨" }, ...CATS]
      .map(c => `<button class="chip ${state.cat === c.id ? "on" : ""}" data-act="cat" data-id="${c.id}">${c.icon} ${c.name}</button>`).join("");
  };

  const renderGrid = () => {
    const q = norm(state.q.trim());
    let list = PRODUCTS.filter(p => {
      if (state.cat !== "all" && p.cat !== state.cat) return false;
      if (p.price > state.max) return false;
      if (!q) return true;
      const hay = norm([p.name, p.brand, ...Object.values(p.specs)].join(" "));
      return q.split(/\s+/).every(w => hay.includes(w));
    });
    const sorters = {
      pop: (a, b) => b.sold - a.sold,
      asc: (a, b) => a.price - b.price,
      desc: (a, b) => b.price - a.price,
      disc: (a, b) => discPct(b) - discPct(a),
      rate: (a, b) => b.rating - a.rating
    };
    list.sort(sorters[state.sort]);
    $("#priceLabel").textContent = vnd(state.max);
    $("#resultInfo").textContent = `${list.length} sản phẩm`;
    $("#grid").innerHTML = list.length ? list.map(card).join("") : `<div class="empty">Không tìm thấy sản phẩm phù hợp. Hãy thử đổi từ khóa hoặc tăng mức giá.</div>`;
  };

  $("#q").addEventListener("input", e => { state.q = e.target.value; renderGrid(); });
  $("#price").addEventListener("input", e => { state.max = +e.target.value; renderGrid(); });
  $("#sort").addEventListener("change", e => { state.sort = e.target.value; renderGrid(); });

  /* ---------- công cụ gợi ý theo nhu cầu ---------- */
  const renderFinder = () => {
    const use = $("#fUse").value;
    const budget = +$("#fBudget").value;
    $("#fBudgetLabel").textContent = vnd(budget);
    const list = PRODUCTS
      .filter(p => (p.cat === "laptop" || p.cat === "pc") && p.use.includes(use) && p.price <= budget)
      .sort((a, b) => b.rating - a.rating || a.price - b.price)
      .slice(0, 4);
    $("#finderResult").innerHTML = list.length
      ? list.map(card).join("")
      : `<div class="empty">Chưa có máy phù hợp với nhu cầu "${USE_LABEL[use]}" trong mức giá này. Hãy tăng ngân sách một chút.</div>`;
  };
  $("#fUse").addEventListener("change", renderFinder);
  $("#fBudget").addEventListener("input", renderFinder);

  /* ---------- giỏ hàng ---------- */
  const saveCart = () => store("cart", cart);
  const cartQty = () => Object.values(cart).reduce((s, n) => s + n, 0);

  const calc = () => {
    const sub = Object.entries(cart).reduce((s, [id, q]) => s + ALL[id].price * q, 0);
    const c = CONFIG.coupons[coupon];
    let disc = 0;
    if (c) disc = c.type === "pct" ? Math.round(sub * c.value / 100) : Math.min(c.value, sub);
    const ship = sub === 0 ? 0 : (sub - disc >= CONFIG.freeShip ? 0 : CONFIG.shipFee);
    return { sub, disc, ship, total: sub - disc + ship };
  };

  const addToCart = (id, n = 1) => {
    cart[id] = (cart[id] || 0) + n;
    saveCart();
    updateBadges();
    renderCartBody();
    toast(`Đã thêm "${ALL[id].name}" vào giỏ`);
  };

  const updateBadges = () => {
    $("#cartCount").textContent = cartQty();
    $("#wishCount").textContent = wish.length;
    $("#cmpCount").textContent = cmp.length;
  };

  const renderCartBody = () => {
    const list = $("#cartList");
    if (!list) return;
    const ids = Object.keys(cart);
    list.innerHTML = ids.length ? ids.map(id => {
      const p = ALL[id];
      return `<div class="ci">
        <div class="em">${p.emoji}</div>
        <div><strong>${esc(p.name)}</strong><div class="muted">${vnd(p.price)}</div>
          <div class="qty"><button data-act="qty" data-id="${id}" data-d="-1" aria-label="Giảm">−</button><span>${cart[id]}</span><button data-act="qty" data-id="${id}" data-d="1" aria-label="Tăng">+</button></div></div>
        <div style="text-align:right"><strong>${vnd(p.price * cart[id])}</strong><br><button class="rm" data-act="rm" data-id="${id}">Xóa</button></div>
      </div>`;
    }).join("") : `<div class="empty">Giỏ hàng đang trống.</div>`;

    const t = calc();
    const need = Math.max(0, CONFIG.freeShip - (t.sub - t.disc));
    const pct = Math.min(100, Math.round((t.sub - t.disc) / CONFIG.freeShip * 100));
    $("#cartTotals").innerHTML = ids.length ? `
      <div class="muted" style="font-size:.85rem">${need > 0 ? `Mua thêm ${vnd(need)} để được miễn phí giao hàng` : "🎉 Bạn được miễn phí giao hàng"}</div>
      <div class="bar-ship"><i style="width:${pct}%"></i></div>
      <div class="tot"><span>Tạm tính</span><span>${vnd(t.sub)}</span></div>
      ${t.disc ? `<div class="tot"><span>Giảm giá (${esc(coupon)})</span><span>-${vnd(t.disc)}</span></div>` : ""}
      <div class="tot"><span>Phí giao hàng</span><span>${t.ship ? vnd(t.ship) : "Miễn phí"}</span></div>
      <div class="tot big"><span>Tổng cộng</span><span>${vnd(t.total)}</span></div>` : "";
    $("#orderForm").style.display = ids.length ? "" : "none";
  };

  const openCart = () => {
    const d = $("#dlgCart");
    if (!d.dataset.ready) {
      const c = load("cust", {});
      d.innerHTML = `<div class="dwrap">
        <div class="dhead"><h3>🛒 Giỏ hàng</h3><button class="icon" data-close aria-label="Đóng">✕</button></div>
        <div id="cartList"></div>
        <div class="coupon"><input id="cpIn" type="text" placeholder="Mã giảm giá" value="${esc(coupon)}"><button class="btn sm line" data-act="coupon">Áp dụng</button></div>
        <div id="cartTotals"></div>
        <form id="orderForm">
          <input id="oName" type="text" placeholder="Họ và tên" required autocomplete="name" value="${esc(c.name || "")}">
          <input id="oPhone" type="tel" placeholder="Số điện thoại" required autocomplete="tel" value="${esc(c.phone || "")}">
          <input id="oAddr" type="text" placeholder="Địa chỉ nhận hàng" required autocomplete="street-address" value="${esc(c.addr || "")}">
          <textarea id="oNote" placeholder="Ghi chú (không bắt buộc)" rows="2"></textarea>
          <button class="btn" type="submit">Đặt hàng</button>
        </form>
        <div id="orderOut"></div>
      </div>`;
      d.dataset.ready = "1";
      $("#orderForm").addEventListener("submit", submitOrder);
    }
    renderCartBody();
    d.showModal();
  };

  const submitOrder = e => {
    e.preventDefault();
    if (!Object.keys(cart).length) return;
    const cust = { name: $("#oName").value.trim(), phone: $("#oPhone").value.trim(), addr: $("#oAddr").value.trim() };
    store("cust", cust);
    const t = calc();
    const code = "CL" + Date.now().toString(36).toUpperCase();
    const lines = Object.entries(cart).map(([id, q]) => `- ${ALL[id].name} x${q}: ${vnd(ALL[id].price * q)}`);
    const text = [
      `ĐƠN HÀNG ${code} - ${CONFIG.shop}`,
      ...lines,
      `Tạm tính: ${vnd(t.sub)}`,
      t.disc ? `Giảm giá (${coupon}): -${vnd(t.disc)}` : null,
      `Phí giao hàng: ${t.ship ? vnd(t.ship) : "Miễn phí"}`,
      `TỔNG: ${vnd(t.total)}`,
      "",
      `Khách hàng: ${cust.name}`,
      `SĐT: ${cust.phone}`,
      `Địa chỉ: ${cust.addr}`,
      $("#oNote").value.trim() ? `Ghi chú: ${$("#oNote").value.trim()}` : null
    ].filter(x => x !== null).join("\n");

    const mail = `mailto:${CONFIG.email}?subject=${encodeURIComponent("Đơn hàng " + code)}&body=${encodeURIComponent(text)}`;
    $("#orderOut").innerHTML = `
      <h4>✅ Đơn ${esc(code)} đã được tạo</h4>
      <p class="muted">Nội dung đơn hàng bên dưới. Hãy gửi cho cửa hàng qua Zalo hoặc email để xác nhận.</p>
      <textarea readonly>${esc(text)}</textarea>
      <div class="row" style="flex-wrap:wrap">
        <button class="btn sm" type="button" data-act="copyOrder">Sao chép</button>
        <a class="btn sm line" href="https://zalo.me/${esc(CONFIG.zalo)}" target="_blank" rel="noopener">Mở Zalo</a>
        <a class="btn sm line" href="${mail}">Gửi email</a>
        <button class="btn sm line" type="button" data-act="clearCart">Xóa giỏ</button>
      </div>`;
    $("#orderOut").dataset.text = text;
  };

  /* ---------- chi tiết sản phẩm ---------- */
  const openProduct = id => {
    const p = ALL[id];
    if (!p) return;
    const rel = PRODUCTS.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 3);
    const d = discPct(p);
    const al = alerts[id];
    $("#dlgProduct").innerHTML = `<div class="dwrap">
      <div class="dhead"><h3>${esc(p.name)}</h3><button class="icon" data-close aria-label="Đóng">✕</button></div>
      <div class="pm">
        <div class="big">${thumb(p)}</div>
        <div>
          <div class="brand">${esc(p.brand)}</div>
          <div class="rating">${stars(p.rating)} ${p.rating} · ${p.sold} đã bán</div>
          <div class="price" style="font-size:1.5rem">${vnd(p.price)}${p.old > p.price ? `<s>${vnd(p.old)}</s> <span class="badge" style="position:static">-${d}%</span>` : ""}</div>
          ${p.use.length ? `<div class="tags">${p.use.map(u => `<span class="tag">${USE_LABEL[u]}</span>`).join("")}</div>` : ""}
          <table>${Object.entries(p.specs).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>
          <div class="row" style="margin-top:12px">
            <button class="btn" data-act="add" data-id="${id}">Thêm vào giỏ</button>
            <button class="icon ${wish.includes(id) ? "on" : ""}" data-act="wish" data-id="${id}" data-reopen="1" aria-label="Yêu thích">♥</button>
            <button class="icon ${cmp.includes(id) ? "on" : ""}" data-act="cmp" data-id="${id}" data-reopen="1" aria-label="So sánh">⚖️</button>
          </div>
          <div class="alertbox">
            <label>🔔 Báo khi giá ≤ (₫)<input id="alertIn" type="number" min="0" step="10000" value="${al || ""}" placeholder="${p.price}"></label>
            <button class="btn sm line" data-act="alert" data-id="${id}">Lưu</button>
          </div>
          <p class="muted" style="font-size:.8rem;margin:6px 0 0">Lưu trên trình duyệt này; sẽ thông báo mỗi lần bạn mở lại trang nếu giá đạt mục tiêu.</p>
        </div>
      </div>
      ${rel.length ? `<div class="related"><h4>Sản phẩm cùng loại</h4><div class="grid">${rel.map(card).join("")}</div></div>` : ""}
    </div>`;
    const dlg = $("#dlgProduct");
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
  };

  /* ---------- yêu thích ---------- */
  const openWish = () => {
    const items = wish.map(id => ALL[id]);
    $("#dlgWish").innerHTML = `<div class="dwrap">
      <div class="dhead"><h3>♥ Yêu thích</h3><button class="icon" data-close aria-label="Đóng">✕</button></div>
      ${items.length ? `<div class="grid small">${items.map(card).join("")}</div>` : `<div class="empty">Bạn chưa lưu sản phẩm nào. Nhấn ♥ trên sản phẩm để lưu lại.</div>`}
    </div>`;
    $("#dlgWish").showModal();
  };

  /* ---------- so sánh ---------- */
  const openCompare = () => {
    const items = cmp.map(id => ALL[id]);
    let html;
    if (items.length < 2) {
      html = `<div class="empty">Chọn ít nhất 2 sản phẩm bằng nút ⚖️ để so sánh (tối đa 3).</div>`;
    } else {
      const keys = [...new Set(items.flatMap(p => Object.keys(p.specs)))];
      const minPrice = Math.min(...items.map(p => p.price));
      const maxRate = Math.max(...items.map(p => p.rating));
      html = `<div class="cmpwrap"><table>
        <tr><th></th>${items.map(p => `<td><div style="font-size:2.2rem">${p.emoji}</div><strong>${esc(p.name)}</strong><br><button class="rm" data-act="cmp" data-id="${p.id}" data-reopen="2">Bỏ</button></td>`).join("")}</tr>
        <tr><th>Giá</th>${items.map(p => `<td class="${p.price === minPrice ? "best" : ""}">${vnd(p.price)}</td>`).join("")}</tr>
        <tr><th>Đánh giá</th>${items.map(p => `<td class="${p.rating === maxRate ? "best" : ""}">${p.rating} ★</td>`).join("")}</tr>
        ${keys.map(k => `<tr><th>${esc(k)}</th>${items.map(p => `<td>${esc(p.specs[k] || "—")}</td>`).join("")}</tr>`).join("")}
        <tr><th></th>${items.map(p => `<td><button class="btn sm" data-act="add" data-id="${p.id}">Thêm vào giỏ</button></td>`).join("")}</tr>
      </table></div>`;
    }
    $("#dlgCompare").innerHTML = `<div class="dwrap"><div class="dhead"><h3>⚖️ So sánh sản phẩm</h3><button class="icon" data-close aria-label="Đóng">✕</button></div>${html}</div>`;
    const dlg = $("#dlgCompare");
    if (!dlg.open) dlg.showModal();
  };

  /* ---------- Build PC ---------- */
  const SLOTS = [["cpu", "CPU"], ["mb", "Bo mạch chủ"], ["ram", "RAM"], ["gpu", "Card đồ họa"], ["ssd", "SSD"], ["psu", "Nguồn"]];
  const sel = k => (bSel[k] && ALL[bSel[k]] ? ALL[bSel[k]] : null);
  const compat = {
    cpu: p => !sel("mb") || sel("mb").socket === p.socket,
    mb: p => (!sel("cpu") || sel("cpu").socket === p.socket) && (!sel("ram") || sel("ram").ramType === p.ramType),
    ram: p => !sel("mb") || sel("mb").ramType === p.ramType
  };

  const buildSelects = () => {
    $("#bSelects").innerHTML = SLOTS.map(([k, label]) => `
      <label>${label}
        <select data-slot="${k}">
          <option value="">— Chọn ${label} —</option>
          ${PARTS[k].map(p => `<option value="${p.id}">${esc(p.name)} · ${vnd(p.price)}</option>`).join("")}
        </select>
      </label>`).join("");
    $$("#bSelects select").forEach(s => {
      s.value = bSel[s.dataset.slot] || "";
      s.addEventListener("change", () => {
        if (s.value) bSel[s.dataset.slot] = s.value; else delete bSel[s.dataset.slot];
        store("build", bSel);
        refreshBuilder();
      });
    });
    refreshBuilder();
  };

  const refreshBuilder = () => {
    $$("#bSelects select").forEach(s => {
      const k = s.dataset.slot;
      $$("option", s).forEach(o => {
        if (!o.value) return;
        o.disabled = compat[k] ? !compat[k](ALL[o.value]) : false;
      });
    });
    const chosen = SLOTS.map(([k, l]) => [l, sel(k)]).filter(([, p]) => p);
    const total = chosen.reduce((s, [, p]) => s + p.price, 0);
    const msgs = [];
    let ok = true;
    const cpu = sel("cpu"), mb = sel("mb"), ram = sel("ram"), gpu = sel("gpu"), psu = sel("psu");
    if (cpu && mb) {
      if (cpu.socket === mb.socket) msgs.push(["ok", `Socket ${cpu.socket} tương thích`]);
      else { msgs.push(["err", `CPU (${cpu.socket}) không khớp bo mạch (${mb.socket})`]); ok = false; }
    }
    if (mb && ram) {
      if (mb.ramType === ram.ramType) msgs.push(["ok", `RAM ${ram.ramType} tương thích`]);
      else { msgs.push(["err", `Bo mạch dùng ${mb.ramType}, RAM là ${ram.ramType}`]); ok = false; }
    }
    if (cpu && gpu) {
      const need = Math.ceil((cpu.tdp + gpu.tdp + 100) * 1.3 / 50) * 50;
      msgs.push(["", `Công suất nguồn khuyến nghị: ≥ ${need}W`]);
      if (psu) {
        if (psu.watts >= need) msgs.push(["ok", `Nguồn ${psu.watts}W đủ tải`]);
        else { msgs.push(["err", `Nguồn ${psu.watts}W còn yếu, nên chọn ≥ ${need}W`]); ok = false; }
      }
    }
    const complete = chosen.length === SLOTS.length;
    $("#bInfo").innerHTML = `
      ${chosen.length ? chosen.map(([l, p]) => `<div class="bl"><span>${l}: ${esc(p.name)}</span><strong>${vnd(p.price)}</strong></div>`).join("") : `<p class="muted">Hãy chọn linh kiện ở bên trái.</p>`}
      ${msgs.map(([c, m]) => `<div class="msg ${c}">${c === "ok" ? "✅" : c === "err" ? "⚠️" : "ℹ️"} ${esc(m)}</div>`).join("")}
      <div class="tot big"><span>Tổng</span><span>${vnd(total)}</span></div>`;
    $("#bAdd").disabled = !(complete && ok);
  };

  $("#bAdd").onclick = () => {
    SLOTS.forEach(([k]) => { if (sel(k)) cart[sel(k).id] = (cart[sel(k).id] || 0) + 1; });
    saveCart(); updateBadges(); renderCartBody();
    toast("Đã thêm cả bộ PC vào giỏ hàng");
  };

  /* ---------- xử lý click chung ---------- */
  const actions = {
    view: id => openProduct(id),
    add: id => addToCart(id),
    cat: id => { state.cat = id; renderChips(); renderGrid(); },
    wish: (id, el) => {
      wish = wish.includes(id) ? wish.filter(x => x !== id) : [...wish, id];
      store("wish", wish); refreshViews();
      if (el.dataset.reopen) openProduct(id);
      if ($("#dlgWish").open) openWish();
    },
    cmp: (id, el) => {
      if (cmp.includes(id)) cmp = cmp.filter(x => x !== id);
      else if (cmp.length >= 3) { toast("Chỉ so sánh tối đa 3 sản phẩm"); return; }
      else { cmp = [...cmp, id]; toast("Đã thêm vào so sánh"); }
      store("cmp", cmp); refreshViews();
      if (el.dataset.reopen === "1") openProduct(id);
      if (el.dataset.reopen === "2") openCompare();
    },
    qty: (id, el) => {
      cart[id] = (cart[id] || 0) + Number(el.dataset.d);
      if (cart[id] <= 0) delete cart[id];
      saveCart(); updateBadges(); renderCartBody();
    },
    rm: id => { delete cart[id]; saveCart(); updateBadges(); renderCartBody(); },
    coupon: () => {
      const code = $("#cpIn").value.trim().toUpperCase();
      if (!code) { coupon = ""; }
      else if (CONFIG.coupons[code]) { coupon = code; toast("Đã áp dụng mã " + code); }
      else { toast("Mã giảm giá không hợp lệ"); return; }
      store("coupon", coupon); renderCartBody();
    },
    alert: id => {
      const v = Number($("#alertIn").value);
      if (v > 0) { alerts[id] = v; toast("Đã lưu mức giá mong muốn"); }
      else { delete alerts[id]; toast("Đã tắt thông báo giá"); }
      store("alerts", alerts);
    },
    copyOrder: () => {
      const text = $("#orderOut").dataset.text || "";
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast("Đã sao chép đơn hàng"), () => { $("#orderOut textarea").select(); toast("Hãy nhấn Ctrl+C để sao chép"); });
    },
    clearCart: () => { cart = {}; saveCart(); updateBadges(); renderCartBody(); $("#orderOut").innerHTML = ""; toast("Đã xóa giỏ hàng"); }
  };

  const refreshViews = () => { updateBadges(); renderGrid(); renderFinder(); };

  document.addEventListener("click", e => {
    const t = e.target.closest("[data-act]");
    if (t) {
      e.preventDefault();
      const fn = actions[t.dataset.act];
      if (fn) {
        // mở chi tiết từ trong dialog khác -> đóng dialog đó trước
        if (t.dataset.act === "view") { const parent = t.closest("dialog"); if (parent && parent.id !== "dlgProduct") parent.close(); }
        fn(t.dataset.id, t);
      }
      return;
    }
    if (e.target.closest("[data-close]")) { e.target.closest("dialog").close(); return; }
    if (e.target.tagName === "DIALOG") e.target.close();
  });

  $("#btnCart").onclick = openCart;
  $("#btnWish").onclick = openWish;
  $("#btnCompare").onclick = openCompare;

  /* ---------- khởi tạo ---------- */
  $("#year").textContent = new Date().getFullYear();
  $("#contactInfo").innerHTML = `📍 ${esc(CONFIG.address)} · ☎️ ${esc(CONFIG.phone)} · ✉️ ${esc(CONFIG.email)} · <a href="https://zalo.me/${esc(CONFIG.zalo)}" target="_blank" rel="noopener">Zalo</a>`;
  renderChips();
  renderGrid();
  renderFinder();
  buildSelects();
  updateBadges();

  // thông báo các sản phẩm đã đạt mức giá mong muốn
  Object.entries(alerts).forEach(([id, target]) => {
    if (ALL[id] && ALL[id].price <= target) setTimeout(() => toast(`🔔 "${ALL[id].name}" đã đạt mức giá bạn mong muốn!`), 800);
  });
})();
