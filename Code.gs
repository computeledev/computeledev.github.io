/**
 * Computeledev – Backend đăng ký / đăng nhập / quên mật khẩu
 * Chạy trên Google Apps Script, gắn với một Google Sheet.
 *
 * Sheet "Users"    : danh sách tài khoản (mật khẩu chỉ lưu dạng đã băm + salt)
 * Sheet "Sessions" : phiên đăng nhập (token đã băm)
 * Sheet "Resets"   : mã đặt lại mật khẩu (đã băm, hết hạn sau 15 phút)
 *
 * Cách cài đặt: xem file HUONG-DAN.md
 */

const SHOP_NAME = 'Computeledev';
const SESSION_DAYS = 14;        // đăng nhập có hiệu lực bao nhiêu ngày
const RESET_MINUTES = 15;       // mã đặt lại mật khẩu có hiệu lực bao nhiêu phút
const HASH_ROUNDS = 200;        // số vòng băm mật khẩu
const MAX_LOGIN_FAILS = 5;      // sai quá số lần này sẽ bị khóa tạm 15 phút
const MAX_RESET_REQUESTS = 3;   // số lần xin mã đặt lại trong 15 phút
const MAX_CODE_TRIES = 5;       // số lần nhập sai mã đặt lại

const USERS_HEADERS = ['ID', 'Họ tên', 'Email', 'Số điện thoại', 'Mật khẩu (đã băm)', 'Salt', 'Ngày đăng ký', 'Đăng nhập gần nhất'];
const SESSIONS_HEADERS = ['Token (đã băm)', 'Email', 'Hết hạn (ms)'];
const RESETS_HEADERS = ['Email', 'Mã (đã băm)', 'Hết hạn (ms)', 'Số lần thử'];

/* ============ Điểm vào ============ */

/** Chạy hàm này MỘT LẦN trong trình soạn thảo để tạo các sheet và cấp quyền gửi email. */
function setup() {
  getSheet_('Users', USERS_HEADERS);
  getSheet_('Sessions', SESSIONS_HEADERS);
  getSheet_('Resets', RESETS_HEADERS);
  MailApp.getRemainingDailyQuota(); // buộc Google hiện hộp thoại xin quyền gửi email
  Logger.log('Đã sẵn sàng. Số email còn gửi được hôm nay: ' + MailApp.getRemainingDailyQuota());
}

function doGet() {
  return out_({ ok: true, service: 'computeledev-auth' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    locked = lock.tryLock(15000);
    if (!locked) return out_({ ok: false, error: 'Máy chủ đang bận, vui lòng thử lại.' });
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const handlers = { register: register_, login: login_, me: me_, logout: logout_, forgot: forgot_, reset: reset_ };
    if (!Object.prototype.hasOwnProperty.call(handlers, req.action)) {
      return out_({ ok: false, error: 'Yêu cầu không hợp lệ.' });
    }
    return out_(handlers[req.action](req));
  } catch (err) {
    console.error(err);
    return out_({ ok: false, error: 'Có lỗi xảy ra, vui lòng thử lại sau.' });
  } finally {
    if (locked) lock.releaseLock();
  }
}

/* ============ Các hành động ============ */

function register_(r) {
  if (r.website) return { ok: false, error: 'Yêu cầu không hợp lệ.' }; // ô bẫy bot
  if (r.consent !== true) return { ok: false, error: 'Bạn cần đồng ý cho cửa hàng lưu thông tin tài khoản.' };

  const name = clean_(r.name).replace(/^[=+\-@\s]+/, '');
  const email = clean_(r.email).toLowerCase();
  const phone = clean_(r.phone);
  const password = String(r.password || '');

  if (name.length < 2 || name.length > 60) return { ok: false, error: 'Họ tên cần từ 2 đến 60 ký tự.' };
  if (!validEmail_(email)) return { ok: false, error: 'Email không hợp lệ.' };
  if (phone && !/^\+?[0-9 .\-]{8,16}$/.test(phone)) return { ok: false, error: 'Số điện thoại không hợp lệ.' };
  if (!validPassword_(password)) return { ok: false, error: 'Mật khẩu cần 8–100 ký tự, gồm cả chữ và số.' };

  const sh = getSheet_('Users', USERS_HEADERS);
  if (findRow_(sh, 2, email, true)) {
    return { ok: false, error: 'Email này đã được đăng ký. Hãy đăng nhập hoặc chọn "Quên mật khẩu".' };
  }

  const salt = newSalt_();
  const now = new Date().toISOString();
  appendText_(sh, [Utilities.getUuid(), name, email, phone, hashPassword_(password, salt), salt, now, now]);

  return { ok: true, token: createSession_(email), user: { name: name, email: email, phone: phone } };
}

function login_(r) {
  const email = clean_(r.email).toLowerCase();
  const password = String(r.password || '');
  if (!email || !password) return { ok: false, error: 'Vui lòng nhập email và mật khẩu.' };

  const failKey = 'lf:' + sha256_(email);
  if (counter_(failKey) >= MAX_LOGIN_FAILS) {
    return { ok: false, error: 'Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút hoặc đặt lại mật khẩu.' };
  }

  const sh = getSheet_('Users', USERS_HEADERS);
  const found = findRow_(sh, 2, email, true);
  // luôn băm một lần để thời gian phản hồi không lộ email có tồn tại hay không
  const calc = hashPassword_(password, found ? String(found.data[5]) : 'khong-ton-tai');
  if (!found || !safeEquals_(calc, String(found.data[4]))) {
    bump_(failKey, 900);
    return { ok: false, error: 'Email hoặc mật khẩu không đúng.' };
  }

  CacheService.getScriptCache().remove(failKey);
  sh.getRange(found.row, 8).setValue(new Date().toISOString());
  return {
    ok: true,
    token: createSession_(email),
    user: { name: String(found.data[1]), email: email, phone: String(found.data[3]) }
  };
}

function me_(r) {
  const email = sessionEmail_(r.token);
  if (!email) return { ok: false, code: 'AUTH', error: 'Phiên đăng nhập đã hết hạn.' };
  const found = findRow_(getSheet_('Users', USERS_HEADERS), 2, email, true);
  if (!found) return { ok: false, code: 'AUTH', error: 'Tài khoản không tồn tại.' };
  return { ok: true, user: { name: String(found.data[1]), email: email, phone: String(found.data[3]) } };
}

function logout_(r) {
  if (r.token) {
    const sh = getSheet_('Sessions', SESSIONS_HEADERS);
    const found = findRow_(sh, 0, sha256_(String(r.token)), false);
    if (found) sh.deleteRow(found.row);
  }
  return { ok: true };
}

function forgot_(r) {
  const email = clean_(r.email).toLowerCase();
  if (!validEmail_(email)) return { ok: false, error: 'Email không hợp lệ.' };

  const reqKey = 'fr:' + sha256_(email);
  if (counter_(reqKey) >= MAX_RESET_REQUESTS) {
    return { ok: false, error: 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau 15 phút.' };
  }
  bump_(reqKey, 900);

  const generic = { ok: true, message: 'Nếu email này đã đăng ký, mã đặt lại mật khẩu gồm 6 số đã được gửi. Hãy kiểm tra cả mục Spam.' };
  const found = findRow_(getSheet_('Users', USERS_HEADERS), 2, email, true);
  if (!found) return generic;

  const code = newCode_();
  const sh = getSheet_('Resets', RESETS_HEADERS);
  purgeExpired_(sh, 2);
  deleteByCol_(sh, 0, email);
  sh.appendRow([email, sha256_(code + ':' + email), Date.now() + RESET_MINUTES * 60000, 0]);

  try {
    sendResetEmail_(email, String(found.data[1]), code);
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'Không gửi được email lúc này. Vui lòng thử lại sau.' };
  }
  return generic;
}

function reset_(r) {
  const email = clean_(r.email).toLowerCase();
  const code = clean_(r.code);
  const password = String(r.password || '');
  const bad = { ok: false, error: 'Mã không đúng hoặc đã hết hạn.' };

  if (!validEmail_(email) || !/^\d{6}$/.test(code)) return bad;
  if (!validPassword_(password)) return { ok: false, error: 'Mật khẩu mới cần 8–100 ký tự, gồm cả chữ và số.' };

  const rs = getSheet_('Resets', RESETS_HEADERS);
  const found = findRow_(rs, 0, email, true);
  if (!found || Number(found.data[2]) < Date.now()) {
    if (found) rs.deleteRow(found.row);
    return bad;
  }
  if (Number(found.data[3]) >= MAX_CODE_TRIES) {
    rs.deleteRow(found.row);
    return { ok: false, error: 'Bạn đã nhập sai quá nhiều lần. Hãy yêu cầu mã mới.' };
  }
  if (!safeEquals_(sha256_(code + ':' + email), String(found.data[1]))) {
    rs.getRange(found.row, 4).setValue(Number(found.data[3]) + 1);
    return bad;
  }

  const us = getSheet_('Users', USERS_HEADERS);
  const user = findRow_(us, 2, email, true);
  if (!user) { rs.deleteRow(found.row); return bad; }

  const salt = newSalt_();
  us.getRange(user.row, 5).setValue(hashPassword_(password, salt));
  us.getRange(user.row, 6).setValue(salt);
  rs.deleteRow(found.row);
  deleteByCol_(getSheet_('Sessions', SESSIONS_HEADERS), 1, email); // đăng xuất mọi thiết bị
  CacheService.getScriptCache().remove('lf:' + sha256_(email));
  return { ok: true, message: 'Đã đổi mật khẩu. Hãy đăng nhập lại.' };
}

/* ============ Phiên đăng nhập ============ */

function createSession_(email) {
  const sh = getSheet_('Sessions', SESSIONS_HEADERS);
  purgeExpired_(sh, 2);
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  sh.appendRow([sha256_(token), email, Date.now() + SESSION_DAYS * 86400000]);
  return token;
}

function sessionEmail_(token) {
  if (!token) return null;
  const found = findRow_(getSheet_('Sessions', SESSIONS_HEADERS), 0, sha256_(String(token)), false);
  if (!found || Number(found.data[2]) < Date.now()) return null;
  return String(found.data[1]).toLowerCase();
}

/* ============ Tiện ích Google Sheet ============ */

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sh;
}

/** Ghi một dòng dưới dạng văn bản thuần để ô không bao giờ bị hiểu là công thức. */
function appendText_(sh, values) {
  const row = sh.getLastRow() + 1;
  if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 1);
  const range = sh.getRange(row, 1, 1, values.length);
  range.setNumberFormat('@');
  range.setValues([values]);
}

function findRow_(sh, colIdx, value, ignoreCase) {
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    let cell = String(data[i][colIdx]);
    if (ignoreCase) cell = cell.toLowerCase();
    if (cell === value) return { row: i + 1, data: data[i] };
  }
  return null;
}

function deleteByCol_(sh, colIdx, email) {
  const data = sh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][colIdx]).toLowerCase() === email) sh.deleteRow(i + 1);
  }
}

function purgeExpired_(sh, expiryCol) {
  const data = sh.getDataRange().getValues();
  const now = Date.now();
  for (let i = data.length - 1; i >= 1; i--) {
    if (Number(data[i][expiryCol]) < now) sh.deleteRow(i + 1);
  }
}

/* ============ Mật mã & kiểm tra dữ liệu ============ */

function sha256_(s) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8));
}

function hashPassword_(password, salt) {
  let h = salt + ':' + password;
  for (let i = 0; i < HASH_ROUNDS; i++) h = sha256_(h + salt);
  return h;
}

function newSalt_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function newCode_() {
  const n = parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 8), 16) % 1000000;
  return ('000000' + n).slice(-6);
}

function safeEquals_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function clean_(v) { return String(v === undefined || v === null ? '' : v).trim(); }
function validEmail_(e) { return e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }
function validPassword_(p) { return p.length >= 8 && p.length <= 100 && /\p{L}/u.test(p) && /\d/.test(p); }
function esc_(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

/* ============ Giới hạn số lần thử (CacheService) ============ */

function counter_(key) { return Number(CacheService.getScriptCache().get(key) || 0); }
function bump_(key, ttlSeconds) {
  const n = counter_(key) + 1;
  CacheService.getScriptCache().put(key, String(n), ttlSeconds);
  return n;
}

/* ============ Email & phản hồi ============ */

function sendResetEmail_(to, name, code) {
  const html =
    '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">' +
    '<h2 style="color:#4f46e5">' + esc_(SHOP_NAME) + '</h2>' +
    '<p>Xin chào ' + esc_(name) + ',</p>' +
    '<p>Mã đặt lại mật khẩu của bạn là:</p>' +
    '<p style="font-size:30px;font-weight:bold;letter-spacing:8px">' + code + '</p>' +
    '<p>Mã có hiệu lực trong ' + RESET_MINUTES + ' phút. Nếu bạn không yêu cầu, hãy bỏ qua email này, mật khẩu của bạn vẫn an toàn.</p>' +
    '</div>';
  MailApp.sendEmail({ to: to, subject: '[' + SHOP_NAME + '] Mã đặt lại mật khẩu', htmlBody: html, name: SHOP_NAME });
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
