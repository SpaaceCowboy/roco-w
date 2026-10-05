const $ = selector => document.querySelector(selector);
const login = $("#login");
const dashboard = $("#dashboard");
const tokenInput = $("#tokenInput");
const loginBtn = $("#loginBtn");
const loginError = $("#loginError");
const itemsEl = $("#items");
const searchEl = $("#search");
const fileInput = $("#fileInput");
const toast = $("#toast");
const numberFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" });
let uploads = [];
let pollTimer;
let toastTimer;
let uploadInProgress = false;

function adminToken() { return sessionStorage.getItem("adminToken") || ""; }
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}
function showError(error) {
  if (!login.hidden) {
    loginError.textContent = error.message || "ورود انجام نشد. دوباره تلاش کنید.";
    return;
  }
  $("#panelError").textContent = error.message || "انجام درخواست ممکن نشد. دوباره تلاش کنید.";
  $("#panelError").hidden = false;
}
function showLogin() {
  clearInterval(pollTimer);
  sessionStorage.removeItem("adminToken");
  uploads = [];
  itemsEl.replaceChildren();
  dashboard.hidden = true;
  login.hidden = false;
  tokenInput.focus();
}
async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, { ...options, headers: { "X-Admin-Token": adminToken(), ...options.headers } });
  } catch { throw new Error("ارتباط با سامانه برقرار نشد. اتصال اینترنت را بررسی کنید."); }
  let body;
  try { body = await response.json(); }
  catch { throw new Error("پاسخ سامانه قابل پردازش نیست. دوباره تلاش کنید."); }
  if (!response.ok) {
    if (response.status === 401) showLogin();
    throw new Error(body.error || "انجام درخواست ممکن نشد. دوباره تلاش کنید.");
  }
  return body;
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}
function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  const units = ["بایت", "کیلوبایت", "مگابایت", "گیگابایت", "ترابایت"];
  let index = 0;
  let value = bytes;
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; }
  return `${numberFormat.format(value)} ${units[index]}`;
}
function formatDate(iso) {
  const date = new Date(iso);
  return !iso || Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}
function stateOf(upload) {
  const state = upload.linkState || (upload.status !== "ready" ? "uploading" : upload.revoked ? "revoked" : upload.firstUsedAt ? "used" : "unused");
  const labels = { uploading: "در حال بارگذاری", unused: "استفاده‌نشده", used: "استفاده‌شده", revoked: "لغوشده" };
  return { cls: state, label: labels[state] || "نامشخص" };
}
function actionButton(action, id, label, kind = "ghost") {
  return `<button type="button" class="button small ${kind}" data-action="${action}" data-id="${escapeHtml(id)}">${label}</button>`;
}
function render() {
  const query = searchEl.value.trim().toLocaleLowerCase("fa-IR");
  const list = uploads.filter(upload => !query || upload.filename.toLocaleLowerCase("fa-IR").includes(query));
  const unused = uploads.filter(upload => stateOf(upload).cls === "unused").length;
  const used = uploads.filter(upload => stateOf(upload).cls === "used").length;
  $("#stats").textContent = `${numberFormat.format(uploads.length)} ویدئو · ${numberFormat.format(unused)} پیوند استفاده‌نشده · ${numberFormat.format(used)} پیوند استفاده‌شده`;
  if (!list.length) {
    itemsEl.innerHTML = `<div class="empty">${uploads.length ? "فایلی با این نام یافت نشد." : "هنوز ویدئویی بارگذاری نشده است."}</div>`;
    return;
  }
  itemsEl.innerHTML = list.map(upload => {
    const state = stateOf(upload);
    const usable = state.cls === "unused";
    const ready = upload.status === "ready";
    return `<article class="item"><div class="file-row"><div class="file-icon" aria-hidden="true">▶</div><div class="file-main">
      <div class="file-name" dir="auto" title="${escapeHtml(upload.filename)}">${escapeHtml(upload.filename)}</div>
      <div class="file-meta">${escapeHtml(formatBytes(upload.size))} · بارگذاری: ${escapeHtml(formatDate(upload.createdAt))}</div>
      ${usable ? `<div class="linkbox"><div class="linktext" dir="ltr">${escapeHtml(upload.downloadUrl)}</div>${actionButton("copy", upload.id, "کپی پیوند", "primary")}</div>` : !ready ? '<div class="file-meta">در انتظار تکمیل بارگذاری</div>' : ""}
      </div></div><div class="side"><span class="status ${state.cls}"><span class="dot" aria-hidden="true"></span>${state.label}</span>
      <div class="timing">زمان استفاده: ${escapeHtml(formatDate(upload.firstUsedAt))}</div><div class="actions">
      ${usable ? actionButton("open", upload.id, "صفحهٔ دانلود") + actionButton("revoke", upload.id, "لغو پیوند") : ""}
      ${ready ? actionButton("new", upload.id, "پیوند جدید") : ""}${actionButton("delete", upload.id, "حذف ویدئو", "danger")}
      </div></div></article>`;
  }).join("");
}
async function loadUploads() {
  itemsEl.setAttribute("aria-busy", "true");
  try {
    const data = await api("/api/uploads");
    if (!adminToken()) return;
    uploads = data.uploads || [];
    $("#panelError").hidden = true;
    render();
  } finally { itemsEl.setAttribute("aria-busy", "false"); }
}
function unlockDashboard() {
  login.hidden = true;
  dashboard.hidden = false;
  loginError.textContent = "";
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (!document.hidden && adminToken()) loadUploads().catch(showError);
  }, 15_000);
  $("#chooseFile").focus();
}
$("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  sessionStorage.setItem("adminToken", tokenInput.value.trim());
  loginBtn.disabled = true;
  loginBtn.textContent = "در حال ورود…";
  loginError.textContent = "";
  try { await loadUploads(); unlockDashboard(); tokenInput.value = ""; }
  catch (error) { showLogin(); loginError.textContent = error.message; }
  finally { loginBtn.disabled = false; loginBtn.textContent = "ورود به پنل"; }
});
$("#logoutBtn").addEventListener("click", showLogin);
$("#refreshBtn").addEventListener("click", () => loadUploads().catch(showError));
searchEl.addEventListener("input", render);
itemsEl.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const upload = uploads.find(item => item.id === button.dataset.id);
  if (!upload) return;
  const action = button.dataset.action;
  try {
    if (action === "copy") { await navigator.clipboard.writeText(upload.downloadUrl); showToast("پیوند دانلود کپی شد."); return; }
    if (action === "open") { window.open(upload.downloadUrl, "_blank", "noopener,noreferrer"); return; }
    const prompts = { revoke: "این پیوند لغو شود؟ ویدئو در فضای ذخیره‌سازی باقی می‌ماند.", new: "پیوند یک‌بارمصرف جدید ایجاد شود؟ پیوند قبلی دیگر قابل استفاده نخواهد بود.", delete: `ویدئوی «${upload.filename}» برای همیشه حذف شود؟` };
    if (!confirm(prompts[action])) return;
    button.disabled = true;
    const endpoint = action === "new" ? "regenerate" : "revoke";
    await api(`/api/uploads/${encodeURIComponent(upload.id)}${action === "delete" ? "" : `/${endpoint}`}`, { method: action === "delete" ? "DELETE" : "POST" });
    showToast({ revoke: "پیوند لغو شد.", new: "پیوند جدید ایجاد شد.", delete: "ویدئو حذف شد." }[action]);
    await loadUploads();
  } catch (error) { showError(action === "copy" ? new Error("کپی پیوند انجام نشد. دسترسی مرورگر به حافظهٔ موقت را بررسی کنید.") : error); }
  finally { button.disabled = false; }
});
$("#chooseFile").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (file) uploadFile(file);
});
for (const name of ["dragenter", "dragover"]) $("#dropzone").addEventListener(name, event => { event.preventDefault(); $("#dropzone").classList.add("drag"); });
for (const name of ["dragleave", "drop"]) $("#dropzone").addEventListener(name, event => { event.preventDefault(); $("#dropzone").classList.remove("drag"); });
$("#dropzone").addEventListener("drop", event => { const file = event.dataTransfer.files?.[0]; if (file) uploadFile(file); });
function updateProgress(percent) {
  $("#progressPct").textContent = `${numberFormat.format(percent)}٪`;
  $("#progressBar").style.width = `${percent}%`;
  $("#progressTrack").setAttribute("aria-valuenow", String(percent));
}
async function uploadFile(file) {
  if (uploadInProgress) { showToast("لطفاً تا پایان بارگذاری فعلی صبر کنید."); return; }
  if (!(file.type || "").startsWith("video/") && !/\.(mkv|avi|m4v|mp4|mov|webm)$/i.test(file.name)) { showError(new Error("لطفاً یک فایل ویدئویی انتخاب کنید.")); return; }
  uploadInProgress = true;
  $("#chooseFile").disabled = true;
  $("#progressWrap").style.display = "block";
  $("#progressName").textContent = file.name;
  updateProgress(0);
  try {
    const record = await api("/api/uploads/init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream", size: file.size }) });
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", record.putUrl);
      for (const [name, value] of Object.entries(record.putHeaders)) xhr.setRequestHeader(name, value);
      xhr.upload.onprogress = event => { if (event.lengthComputable) updateProgress(Math.round(event.loaded / event.total * 100)); };
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`بارگذاری در فضای ذخیره‌سازی انجام نشد (کد ${numberFormat.format(xhr.status)}).`));
      xhr.onerror = () => reject(new Error("ارتباط با فضای ذخیره‌سازی برقرار نشد. اتصال اینترنت و تنظیمات دسترسی را بررسی کنید."));
      xhr.send(file);
    });
    $("#progressPct").textContent = "در حال تأیید فایل…";
    await api(`/api/uploads/${encodeURIComponent(record.id)}/complete`, { method: "POST" });
    updateProgress(100);
    showToast("ویدئو با موفقیت بارگذاری شد.");
    await loadUploads();
  } catch (error) { showError(error); }
  finally { uploadInProgress = false; $("#chooseFile").disabled = false; }
}
if (adminToken()) loadUploads().then(unlockDashboard).catch(error => { showLogin(); loginError.textContent = error.message; });
else showLogin();
