/* ===== Tài khoản: đăng ký / đăng nhập / quên mật khẩu =====
   Gọi tới Google Apps Script (xem apps-script/HUONG-DAN.md).
   Cần khai báo CONFIG.apiUrl trong products.js. */
(() => {
  "use strict";
  const { $, esc, toast, load, store } = window.CL;

  let auth = load("auth", null); // { token, name, email, phone }

  const pwOk = p => p.length >= 8 && p.length <= 100 && /\p{L}/u.test(p) && /\d/.test(p);
  const PW_HINT = "Tối thiểu 8 ký tự, gồm cả chữ và số.";

  window.CLAuth = {
    user: () => (auth ? { name: auth.name, email: auth.email, phone: auth.phone || "" } : null),
    profile: () => (auth ? { name: auth.name, phone: auth.phone || "" } : {})
  };

  /* ---------- gọi máy chủ ---------- */
  const api = async (action, data = {}) => {
    if (!CONFIG.apiUrl) {
      return { ok: false, error: "Chưa cấu hình máy chủ đăng nhập. Hãy làm theo hướng dẫn Google Sheet rồi dán địa chỉ vào apiUrl trong products.js." };
    }
    try {
      const r = await fetch(CONFIG.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // tránh preflight CORS
        body: JSON.stringify({ action, ...data })
      });
      return await r.json();
    } catch (err) {
      return { ok: false, error: "Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại." };
    }
  };

  /* ---------- nút trên header ---------- */
  const renderBtn = () => {
    const b = $("#btnUser");
    if (auth) {
      const first = (auth.name || "?").trim().split(/\s+/).pop();
      b.innerHTML = `<span class="mini-av">${esc(first.charAt(0).toUpperCase())}</span>${esc(first)}`;
    } else {
      b.textContent = "Đăng nhập";
    }
  };
  const setAuth = a => { auth = a; store("auth", a); renderBtn(); };

  /* ---------- giao diện các màn hình ---------- */
  const pwField = (id, label, autocomplete) => `
    <label>${label}
      <div class="pw"><input id="${id}" type="password" required minlength="8" maxlength="100" autocomplete="${autocomplete}">
      <button type="button" class="eye" data-pw="${id}" aria-label="Hiện hoặc ẩn mật khẩu">👁</button></div>
    </label>`;

  const notice = d => (d.notice ? `<div class="form-msg ok">${esc(d.notice)}</div>` : "");
  const live = `<div class="form-msg live" role="alert"></div>`;

  const views = {
    login: d => `
      <h2>Đăng nhập</h2>
      <p class="muted">Đăng nhập để lưu yêu thích, theo dõi giá và đặt hàng nhanh hơn.</p>
      ${notice(d)}
      <form data-f="login">
        <label>Email<input id="aEmail" type="email" required autocomplete="email" maxlength="120" value="${esc(d.email || "")}"></label>
        ${pwField("aPass", "Mật khẩu", "current-password")}
        <a href="#" class="lnk" data-auth="forgot">Quên mật khẩu?</a>
        ${live}
        <button class="btn" type="submit">Đăng nhập</button>
      </form>
      <p class="swap">Chưa có tài khoản? <a href="#" data-auth="register">Đăng ký miễn phí</a></p>`,

    register: d => `
      <h2>Tạo tài khoản</h2>
      <p class="muted">Chỉ mất 30 giây.</p>
      <form data-f="register">
        <label>Họ và tên<input id="aName" type="text" required minlength="2" maxlength="60" autocomplete="name" value="${esc(d.name || "")}"></label>
        <label>Email<input id="aEmail" type="email" required maxlength="120" autocomplete="email" value="${esc(d.email || "")}"></label>
        <label>Số điện thoại (không bắt buộc)<input id="aPhone" type="tel" maxlength="16" autocomplete="tel" value="${esc(d.phone || "")}"></label>
        ${pwField("aPass", "Mật khẩu", "new-password")}
        <span class="hint" style="margin-top:-8px">${PW_HINT}</span>
        ${pwField("aPass2", "Nhập lại mật khẩu", "new-password")}
        <input id="aWeb" class="hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
        <label class="check"><input id="aConsent" type="checkbox" required><span>Tôi đồng ý để ${esc(CONFIG.shop)} lưu họ tên, email, số điện thoại của tôi nhằm quản lý tài khoản và đơn hàng.</span></label>
        ${live}
        <button class="btn" type="submit">Đăng ký</button>
      </form>
      <p class="swap">Đã có tài khoản? <a href="#" data-auth="login">Đăng nhập</a></p>`,

    forgot: d => `
      <h2>Quên mật khẩu</h2>
      <p class="muted">Nhập email đã đăng ký, chúng tôi sẽ gửi mã gồm 6 số để bạn đặt lại mật khẩu.</p>
      <form data-f="forgot">
        <label>Email<input id="aEmail" type="email" required maxlength="120" autocomplete="email" value="${esc(d.email || "")}"></label>
        ${live}
        <button class="btn" type="submit">Gửi mã đặt lại</button>
      </form>
      <p class="swap"><a href="#" data-auth="login">← Quay lại đăng nhập</a></p>`,

    reset: d => `
      <h2>Đặt lại mật khẩu</h2>
      ${d.notice ? `<div class="form-msg ok">${esc(d.notice)}</div>` : `<p class="muted">Nhập mã 6 số trong email và mật khẩu mới.</p>`}
      <form data-f="reset">
        <input id="aEmail" type="hidden" value="${esc(d.email || "")}">
        <label>Mã 6 số<input id="aCode" type="text" required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" placeholder="123456"></label>
        ${pwField("aPass", "Mật khẩu mới", "new-password")}
        <span class="hint" style="margin-top:-8px">${PW_HINT}</span>
        ${pwField("aPass2", "Nhập lại mật khẩu mới", "new-password")}
        ${live}
        <button class="btn" type="submit">Đổi mật khẩu</button>
      </form>
      <p class="swap">Không nhận được mã? <a href="#" data-auth="forgot" data-email="${esc(d.email || "")}">Gửi lại</a></p>`,

    account: () => {
      const u = auth || {};
      return `
        <div class="avatar">${esc((u.name || "?").trim().charAt(0).toUpperCase())}</div>
        <h2>Xin chào, ${esc(u.name || "")}</h2>
        <div class="acc-list">
          <div><span>Email</span><strong>${esc(u.email || "")}</strong></div>
          <div><span>Số điện thoại</span><strong>${esc(u.phone || "Chưa cập nhật")}</strong></div>
        </div>
        <button class="btn line" type="button" data-logout>Đăng xuất</button>`;
    }
  };

  const shell = inner => `
    <div class="authbox">
      <aside class="auth-side">
        <div><span class="logo"><i class="logo-mark">⚡</i><span>Computele<em>dev</em></span></span>
          <h3>Mua sắm công nghệ thông minh hơn</h3></div>
        <ul><li>♥ Lưu sản phẩm yêu thích</li><li>🔔 Theo dõi giá mong muốn</li><li>🧾 Đặt hàng nhanh, điền sẵn thông tin</li></ul>
        <small>Mật khẩu được băm trước khi lưu, không ai xem lại được mật khẩu gốc của bạn.</small>
      </aside>
      <div class="auth-main">
        <button class="icon close" data-close aria-label="Đóng">✕</button>
        ${CONFIG.apiUrl ? "" : `<div class="form-msg err">Chưa cấu hình máy chủ đăng nhập (apiUrl trong products.js). Xem apps-script/HUONG-DAN.md.</div>`}
        ${inner}
      </div>
    </div>`;

  const openAuth = (view, data = {}) => {
    const dlg = $("#dlgAuth");
    dlg.innerHTML = shell(views[view](data));
    if (!dlg.open) dlg.showModal();
    const first = dlg.querySelector("input:not([type=hidden]):not(.hp)");
    if (first) first.focus();
  };

  /* ---------- xử lý gửi form ---------- */
  const submit = async f => {
    const kind = f.dataset.f;
    const msg = f.querySelector(".form-msg.live");
    const btn = f.querySelector("button[type=submit]");
    const val = id => { const el = f.querySelector("#" + id); return el ? el.value : ""; };
    const fail = t => { msg.className = "form-msg live err"; msg.textContent = t; };

    msg.className = "form-msg live"; msg.textContent = "";

    if (kind === "register" || kind === "reset") {
      if (!pwOk(val("aPass"))) return fail("Mật khẩu cần 8–100 ký tự, gồm cả chữ và số.");
      if (val("aPass") !== val("aPass2")) return fail("Hai mật khẩu nhập vào chưa khớp.");
    }

    const label = btn.textContent;
    btn.disabled = true; btn.textContent = "Đang xử lý…";
    let res;
    try {
      if (kind === "login") res = await api("login", { email: val("aEmail").trim(), password: val("aPass") });
      else if (kind === "register") res = await api("register", { name: val("aName").trim(), email: val("aEmail").trim(), phone: val("aPhone").trim(), password: val("aPass"), consent: f.querySelector("#aConsent").checked, website: val("aWeb") });
      else if (kind === "forgot") res = await api("forgot", { email: val("aEmail").trim() });
      else if (kind === "reset") res = await api("reset", { email: val("aEmail").trim(), code: val("aCode").trim(), password: val("aPass") });
    } finally {
      btn.disabled = false; btn.textContent = label;
    }

    if (!res || !res.ok) return fail((res && res.error) || "Có lỗi xảy ra, vui lòng thử lại.");

    if (kind === "login" || kind === "register") {
      setAuth({ ...res.user, token: res.token });
      $("#dlgAuth").close();
      toast(kind === "register" ? `Đăng ký thành công! Chào mừng ${res.user.name} 🎉` : `Chào mừng trở lại, ${res.user.name}!`);
    } else if (kind === "forgot") {
      openAuth("reset", { email: val("aEmail").trim(), notice: res.message });
    } else if (kind === "reset") {
      openAuth("login", { email: val("aEmail").trim(), notice: res.message });
    }
  };

  const logout = () => {
    if (auth && auth.token) api("logout", { token: auth.token });
    setAuth(null);
    $("#dlgAuth").close();
    toast("Đã đăng xuất");
  };

  /* ---------- sự kiện ---------- */
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-auth]");
    if (!a) return;
    e.preventDefault();
    const typed = $("#dlgAuth #aEmail");
    openAuth(a.dataset.auth, { email: a.dataset.email || (typed ? typed.value : "") });
  });

  $("#dlgAuth").addEventListener("click", e => {
    const eye = e.target.closest("[data-pw]");
    if (eye) {
      const input = $("#" + eye.dataset.pw, $("#dlgAuth"));
      if (input) input.type = input.type === "password" ? "text" : "password";
      return;
    }
    if (e.target.closest("[data-logout]")) logout();
  });

  $("#dlgAuth").addEventListener("submit", e => { e.preventDefault(); submit(e.target); });
  $("#btnUser").onclick = () => openAuth(auth ? "account" : "login");

  /* ---------- khởi tạo ---------- */
  renderBtn();
  if (auth && auth.token && CONFIG.apiUrl) {
    api("me", { token: auth.token }).then(res => {
      if (res.ok) setAuth({ ...auth, ...res.user });
      else if (res.code === "AUTH") setAuth(null); // chỉ đăng xuất khi máy chủ báo phiên hết hạn
    });
  }
})();
