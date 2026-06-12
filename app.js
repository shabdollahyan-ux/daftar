/* ═══════════════════════════════════════════
   دفتر بدهی‌ها — app.js
   ═══════════════════════════════════════════ */

'use strict';

// ── Storage Engine ────────────────────────────────────────────────────────────
const IDB_NAME  = 'DaftarBedahi';
const IDB_STORE = 'data';
const IDB_KEY   = 'main';
const LS_KEY    = 'daftar_bedahi_v2';

let idbDb = null;

async function idbOpen() {
  return new Promise((resolve) => {
    if (!window.indexedDB) { resolve(null); return; }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = () => resolve(null);
  });
}

async function storageSave(data) {
  const json = JSON.stringify(data);
  // Always write localStorage as safety net
  try { localStorage.setItem(LS_KEY, json); } catch(_) {}
  if (!idbDb) return true;
  return new Promise(resolve => {
    const tx  = idbDb.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).put(json, IDB_KEY);
    req.onsuccess = () => resolve(true);
    req.onerror   = () => resolve(false);
  });
}

async function storageLoad() {
  if (idbDb) {
    const data = await new Promise(resolve => {
      const tx  = idbDb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => resolve(null);
    });
    if (data) { try { return JSON.parse(data); } catch(_) {} }
  }
  // Fallback localStorage
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch(_) {}
  return null;
}

// ── App State ─────────────────────────────────────────────────────────────────
let db = newDB();
let saveTimer = null;
let activePage = 'dashboard';
let deferredInstall = null;   // PWA install prompt

function newDB() {
  return {
    version: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastAutoSave: null,
    lastBackupDate: null,
    txnsSinceBackup: 0,
    accounts: [],
    transactions: [],
    meta: { lastAccountId: 0, lastTxnId: 0 }
  };
}

// ── Auto-save ─────────────────────────────────────────────────────────────────
function triggerSave() {
  setSaveChip('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    db.updatedAt   = new Date().toISOString();
    db.lastAutoSave = new Date().toISOString();
    db.version     = 'دفتر بدهی‌ها — نسخه ' + jalaliToday() + ' - ' + nowTime();
    const ok = await storageSave(db);
    setSaveChip(ok ? 'saved' : 'error');
  }, 250);
}

function setSaveChip(state) {
  const chip = $('saveChip');
  const txt  = $('saveChipText');
  chip.className = 'save-chip ' + state;
  if (state === 'saving') {
    txt.textContent = 'در حال ذخیره...';
  } else if (state === 'saved') {
    txt.textContent = 'ذخیره شد ✓';
    setTimeout(() => {
      chip.className = 'save-chip';
      txt.textContent = db.lastAutoSave ? 'ذخیره: ' + relativeTime(db.lastAutoSave) : 'آماده';
    }, 2000);
  } else {
    txt.textContent = 'خطا در ذخیره';
  }
}

function relativeTime(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)   return 'لحظه‌ای پیش';
  if (s < 3600) return fa(Math.floor(s/60)) + ' دق پیش';
  return jalaliStr(new Date(iso));
}

// ── Jalali Utilities ──────────────────────────────────────────────────────────
function fa(n) {
  return String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

function pad2(n) { return String(n).padStart(2, '0'); }
function faPad(n) { return fa(pad2(n)); }

function gregorianToJalali(gy, gm, gd) {
  gy -= 1600; gm -= 1; gd -= 1;
  let gdn = 365*gy + Math.floor((gy+3)/4) - Math.floor((gy+99)/100) + Math.floor((gy+399)/400);
  const gDM = [31,28+(gy+1600)%4===0&&((gy+1600)%100!==0||(gy+1600)%400===0)?1:0,31,30,31,30,31,31,30,31,30,31];
  for(let i=0;i<gm;i++) gdn += gDM[i];
  gdn += gd;
  let jdn = gdn - 79;
  let jnp = Math.floor(jdn/12053); jdn %= 12053;
  let jy = 979 + 33*jnp + 4*Math.floor(jdn/1461);
  jdn %= 1461;
  if(jdn >= 366){ jy += Math.floor((jdn-1)/365); jdn = (jdn-1)%365; }
  const jDM = [31,31,31,31,31,31,30,30,30,30,30,29];
  let jm=0, jd;
  for(jm=0; jm<11 && jdn>=jDM[jm]; jm++) jdn -= jDM[jm];
  jd = jdn+1;
  return [jy, jm+1, jd];
}

function jalaliToGregorian(jy, jm, jd) {
  jy -= 979; jm -= 1; jd -= 1;
  let jdn = 365*jy + Math.floor(jy/33)*8 + Math.floor((jy%33+3)/4);
  const jDM = [31,31,31,31,31,31,30,30,30,30,30,29];
  for(let i=0;i<jm;i++) jdn += jDM[i];
  jdn += jd;
  let gdn = jdn + 79;
  let gy = 1600 + 400*Math.floor(gdn/146097); gdn %= 146097;
  let leap=true;
  if(gdn>=36525){ gdn--; gy+=100*Math.floor(gdn/36524); gdn %= 36524; if(gdn>=365) gdn++; else leap=false; }
  gy += 4*Math.floor(gdn/1461); gdn %= 1461;
  if(gdn>=366){ leap=false; gdn--; gy+=Math.floor(gdn/365); gdn %= 365; }
  const gDM = [31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  let gm=0;
  for(gm=0; gm<11&&gdn>=gDM[gm]; gm++) gdn -= gDM[gm];
  return [gy, gm+1, gdn+1];
}

function jalaliStr(d) {
  const [jy,jm,jd] = gregorianToJalali(d.getFullYear(), d.getMonth()+1, d.getDate());
  return fa(jy) + '/' + faPad(jm) + '/' + faPad(jd);
}

function jalaliToday() { return jalaliStr(new Date()); }

function nowTime() {
  const d = new Date();
  return fa(d.getHours()) + ':' + fa(String(d.getMinutes()).padStart(2,'0'));
}

function fmtAmount(n) {
  if (n == null) return '۰';
  return fa(Math.abs(Math.round(n)).toLocaleString('en'));
}

const JALALI_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const JALALI_WEEKDAYS_SHORT = ['ش','ی','د','س','چ','پ','ج'];  // Sat=0 in Jalali week

// ── ID Generators ─────────────────────────────────────────────────────────────
function nextAccId() {
  db.meta.lastAccountId++;
  return 'ح-' + fa(String(db.meta.lastAccountId).padStart(3,'0'));
}
function nextTxnId() {
  db.meta.lastTxnId++;
  return 'ت-' + fa(String(db.meta.lastTxnId).padStart(4,'0'));
}

// ── Balance Recalc ────────────────────────────────────────────────────────────
function recalcAccount(accId) {
  const acc = db.accounts.find(a => a.id === accId);
  if (!acc) return;
  const txns = db.transactions
    .filter(t => t.accountId === accId)
    .sort((a,b) => a.createdAt.localeCompare(b.createdAt));
  let recv=0, paid=0, bal=0;
  txns.forEach(t => {
    if      (t.type==='receive') { recv += t.amount; bal += t.amount; }
    else if (t.type==='pay')     { paid += t.amount; bal -= t.amount; }
    else if (t.type==='adjust')  { bal  += t.amount; }
    t.balanceAfter = bal;
  });
  acc.totalReceived = recv;
  acc.totalPaid     = paid;
  acc.balance       = bal;
  acc.lastTxnDate   = txns.length ? txns[txns.length-1].date : null;
}

// ── DOM Helper ────────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function html(id, content) { $(id).innerHTML = content; }

// ── Navigation ────────────────────────────────────────────────────────────────
function switchPage(name) {
  activePage = name;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  $('page-' + name).classList.add('active');
  $('nav-' + name).classList.add('active');

  // FAB visibility
  const fab = $('fab');
  if (name === 'dashboard' || name === 'accounts' || name === 'transactions') {
    fab.classList.remove('hidden');
    fab.textContent = name === 'accounts' ? '+ طرف حساب' : name === 'transactions' ? '+ تراکنش' : '+ تراکنش';
    fab.onclick = name === 'accounts' ? openAddAccount : openAddTransaction;
  } else {
    fab.classList.add('hidden');
  }

  renderPage(name);
}

function renderPage(name) {
  if (name === 'dashboard')    renderDashboard();
  if (name === 'accounts')     renderAccounts();
  if (name === 'transactions') renderTransactions();
  if (name === 'reports')      renderReportsPage();
  checkBackupBanner();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function renderDashboard() {
  const active = db.accounts.filter(a => a.status === 'active');
  const totalDebt  = active.reduce((s,a) => s + Math.max(0, a.balance||0), 0);
  const totalPaid  = db.accounts.reduce((s,a) => s + (a.totalPaid||0), 0);

  html('stat-debt',    fmtAmount(totalDebt));
  html('stat-paid',    fmtAmount(totalPaid));
  html('stat-accounts',fa(active.length));
  html('stat-txns',    fa(db.transactions.length));

  // Recent transactions (last 5)
  const recent = [...db.transactions]
    .sort((a,b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0,5);

  if (!recent.length) {
    html('dash-recent', emptyState('📋','هنوز تراکنشی ثبت نشده','اولین تراکنش را ثبت کنید'));
    return;
  }

  html('dash-recent', `
    <div class="section-header">
      <span class="section-title">آخرین تراکنش‌ها</span>
      <button class="btn btn-sm btn-secondary" onclick="switchPage('transactions')" style="width:auto">همه</button>
    </div>
    <div class="card">
      ${recent.map(t => txnRow(t)).join('')}
    </div>
  `);
}

// ── Accounts Page ─────────────────────────────────────────────────────────────
let accSearch = '';
let accStatusFilter = '';

function renderAccounts() {
  let list = db.accounts.filter(a => {
    const q = accSearch.toLowerCase();
    const ms = !q || a.name.toLowerCase().includes(q) || a.id.includes(q);
    const mf = !accStatusFilter || a.status === accStatusFilter;
    return ms && mf;
  });

  if (!list.length && !accSearch && !accStatusFilter) {
    html('accounts-list', emptyState('👥','هنوز طرف حسابی ندارید','دکمه + را بزنید تا اولین طرف حساب را اضافه کنید'));
    return;
  }

  if (!list.length) {
    html('accounts-list', emptyState('🔍','نتیجه‌ای یافت نشد','جستجوی دیگری امتحان کنید'));
    return;
  }

  html('accounts-list', `
    <div class="card card-list">
      ${list.map(a => `
        <div class="card-row" onclick="openAccountDetail('${a.id}')">
          <div class="card-row-info">
            <div class="card-row-name">${a.name} <span class="id-badge">${a.id}</span></div>
            <div class="card-row-sub">
              <span class="badge ${a.status==='active'?'badge-blue':'badge-gray'}">${a.status==='active'?'فعال':'تسویه‌شده'}</span>
              ${a.lastTxnDate ? ' · ' + a.lastTxnDate : ''}
            </div>
          </div>
          <div class="card-row-amount ${balClass(a.balance)}">${fmtAmount(a.balance)}<br><small style="font-size:10px;font-weight:400">تومان</small></div>
          <span class="card-chevron">‹</span>
        </div>
      `).join('')}
    </div>
  `);
}

function balClass(b) {
  if (!b || b===0) return 'muted';
  return b>0 ? 'red' : 'green';
}

// ── Transactions Page ─────────────────────────────────────────────────────────
let txnSearch = '';
let txnTypeFilter = '';
let txnAccFilter  = '';

function renderTransactions() {
  let list = [...db.transactions]
    .sort((a,b) => b.createdAt.localeCompare(a.createdAt))
    .filter(t => {
      const acc = db.accounts.find(a => a.id === t.accountId);
      const name = acc ? acc.name.toLowerCase() : '';
      const q = txnSearch.toLowerCase();
      const ms = !q || (t.description||'').toLowerCase().includes(q) || name.includes(q);
      const mt = !txnTypeFilter || t.type === txnTypeFilter;
      const ma = !txnAccFilter  || t.accountId === txnAccFilter;
      return ms && mt && ma;
    });

  if (!list.length && !txnSearch && !txnTypeFilter && !txnAccFilter) {
    html('txn-list', emptyState('📋','هنوز تراکنشی ثبت نشده','دکمه + را بزنید تا اولین تراکنش را ثبت کنید'));
    return;
  }

  if (!list.length) {
    html('txn-list', emptyState('🔍','نتیجه‌ای یافت نشد','فیلتر را تغییر دهید'));
    return;
  }

  html('txn-list', `<div class="card">${list.map(t => txnRow(t, true)).join('')}</div>`);
}

const TYPE_ICON  = { receive:'📥', pay:'📤', adjust:'⚙️' };
const TYPE_LABEL = { receive:'دریافت', pay:'پرداخت', adjust:'اصلاحیه' };
const METHOD_LABEL = { card:'کارت به کارت', cash:'نقدی', check:'چک', transfer:'حواله', other:'سایر' };

function txnRow(t, showDelete=false) {
  const acc = db.accounts.find(a => a.id === t.accountId);
  const amtClass = t.type==='receive' ? 'amount-red' : t.type==='pay' ? 'amount-green' : 'amount-muted';
  return `
    <div class="txn-row">
      <div class="txn-icon">${TYPE_ICON[t.type]}</div>
      <div class="txn-info">
        <div class="txn-name">${acc ? acc.name : '—'}</div>
        <div class="txn-meta">${t.date} · ${METHOD_LABEL[t.method]||t.method}${t.description ? ' · '+t.description : ''}</div>
      </div>
      <div class="txn-amount-col">
        <span class="txn-amount ${amtClass}">${fmtAmount(t.amount)}</span>
        <span class="txn-balance">${fmtAmount(t.balanceAfter)} مانده</span>
        ${showDelete ? `<button class="btn btn-sm btn-danger mt-2" onclick="event.stopPropagation();deleteTxn('${t.id}')">حذف</button>` : ''}
      </div>
    </div>`;
}

// ── Reports Page ──────────────────────────────────────────────────────────────
function renderReportsPage() {
  const sel = $('report-acc-select');
  if (sel) {
    sel.innerHTML = '<option value="">-- انتخاب کنید --</option>' +
      db.accounts.map(a => `<option value="${a.id}">${a.id} — ${a.name}</option>`).join('');
  }
}

function generateReport() {
  const accId = $('report-acc-select').value;
  if (!accId) { showToast('طرف حساب را انتخاب کنید','error'); return; }
  const acc  = db.accounts.find(a => a.id === accId);
  const txns = db.transactions
    .filter(t => t.accountId===accId)
    .sort((a,b) => a.createdAt.localeCompare(b.createdAt));

  const lines = txns.map(t =>
    `${t.date} — ${TYPE_LABEL[t.type]} — ${fmtAmount(t.amount)} تومان${t.description?' — '+t.description:''}`
  ).join('\n');

  const report = `حساب: ${acc.name} (${acc.id})
توضیح: ${acc.description||'—'}
وضعیت: ${acc.status==='active'?'فعال':'تسویه‌شده'}

دریافتی: ${fmtAmount(acc.totalReceived)} تومان
پرداختی: ${fmtAmount(acc.totalPaid)} تومان
مانده:    ${fmtAmount(acc.balance)} تومان

ریز تراکنش‌ها:
${lines||'(هنوز تراکنشی ثبت نشده)'}`;

  html('report-output', `<div class="report-block">${report}</div>`);
}

function generateSummary() {
  const active  = db.accounts.filter(a => a.status==='active');
  const settled = db.accounts.filter(a => a.status==='settled');
  const debt    = active.reduce((s,a)=>s+Math.max(0,a.balance||0),0);
  const paid    = db.accounts.reduce((s,a)=>s+(a.totalPaid||0),0);
  const recv    = db.accounts.reduce((s,a)=>s+(a.totalReceived||0),0);
  const lines   = db.accounts.map(a=>
    `${a.id} | ${a.name} | مانده: ${fmtAmount(a.balance)} | ${a.status==='active'?'فعال':'تسویه‌شده'}`
  ).join('\n');

  html('summary-output', `<div class="report-block">═══ خلاصه دفتر بدهی‌ها ═══
تاریخ: ${jalaliToday()}

دریافت‌ها: ${fmtAmount(recv)} تومان
پرداخت‌ها: ${fmtAmount(paid)} تومان
بدهی فعال: ${fmtAmount(debt)} تومان

حساب فعال: ${fa(active.length)} · تسویه: ${fa(settled.length)} · تراکنش: ${fa(db.transactions.length)}

═══ طرف حساب‌ها ═══
${lines||'(هیچ حسابی ثبت نشده)'}</div>`);
}

// ── Account Detail ────────────────────────────────────────────────────────────
function openAccountDetail(accId) {
  const acc  = db.accounts.find(a => a.id === accId);
  if (!acc) return;
  const txns = db.transactions
    .filter(t => t.accountId===accId)
    .sort((a,b) => a.createdAt.localeCompare(b.createdAt));

  $('detail-sheet-title').textContent = acc.name;
  html('detail-sheet-body', `
    <div class="detail-summary">
      <div class="detail-stat red">
        <div class="detail-stat-label">دریافتی</div>
        <div class="detail-stat-value">${fmtAmount(acc.totalReceived)}</div>
        <div class="detail-stat-unit">تومان</div>
      </div>
      <div class="detail-stat green">
        <div class="detail-stat-label">پرداختی</div>
        <div class="detail-stat-value">${fmtAmount(acc.totalPaid)}</div>
        <div class="detail-stat-unit">تومان</div>
      </div>
      <div class="detail-stat blue">
        <div class="detail-stat-label">مانده</div>
        <div class="detail-stat-value">${fmtAmount(acc.balance)}</div>
        <div class="detail-stat-unit">تومان</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button class="btn btn-primary" onclick="closeSheet('detail-sheet');openAddTransaction('${accId}')">+ تراکنش جدید</button>
      <button class="btn btn-secondary" style="width:auto;padding:13px 14px" onclick="closeSheet('detail-sheet');openEditAccount('${accId}')">ویرایش</button>
    </div>
    <div class="section-title mb-2">تراکنش‌ها (${fa(txns.length)})</div>
    ${txns.length
      ? '<div class="card">' + [...txns].reverse().map(t => txnRow(t)).join('') + '</div>'
      : emptyState('📋','هنوز تراکنشی ثبت نشده','')}
  `);
  openSheet('detail-sheet');
}

// ── Sheet Modal ───────────────────────────────────────────────────────────────
function openSheet(id) {
  const el = $(id);
  el.classList.add('open');
  el.addEventListener('click', e => { if(e.target===el) closeSheet(id); }, {once:true});
}

function closeSheet(id) {
  $(id).classList.remove('open');
}

// ── Account Form ──────────────────────────────────────────────────────────────
let editAccId = null;

function openAddAccount() {
  editAccId = null;
  $('acc-sheet-title').textContent = 'افزودن طرف حساب';
  $('acc-name').value    = '';
  $('acc-desc').value    = '';
  $('acc-status').value  = 'active';
  openSheet('acc-sheet');
}

function openEditAccount(id) {
  const acc = db.accounts.find(a => a.id === id);
  if (!acc) return;
  editAccId = id;
  $('acc-sheet-title').textContent = 'ویرایش طرف حساب';
  $('acc-name').value   = acc.name;
  $('acc-desc').value   = acc.description || '';
  $('acc-status').value = acc.status;
  openSheet('acc-sheet');
}

function saveAccount() {
  const name = $('acc-name').value.trim();
  if (!name) { showToast('نام طرف حساب الزامی است','error'); return; }

  if (editAccId) {
    const acc = db.accounts.find(a => a.id === editAccId);
    acc.name        = name;
    acc.description = $('acc-desc').value.trim();
    acc.status      = $('acc-status').value;
  } else {
    db.accounts.push({
      id: nextAccId(), name,
      description: $('acc-desc').value.trim(),
      status: $('acc-status').value,
      totalReceived: 0, totalPaid: 0, balance: 0,
      lastTxnDate: null,
      createdAt: new Date().toISOString()
    });
  }
  triggerSave();
  closeSheet('acc-sheet');
  renderPage(activePage);
  showToast('اطلاعات با موفقیت ذخیره شد ✓');
}

// ── Transaction Form ──────────────────────────────────────────────────────────
function openAddTransaction(presetAccId) {
  // Populate account selector
  const sel = $('txn-acc-select');
  sel.innerHTML = '<option value="">-- انتخاب کنید --</option>' +
    db.accounts.map(a => `<option value="${a.id}">${a.id} — ${a.name}</option>`).join('');
  if (presetAccId) sel.value = presetAccId;

  // Reset fields
  setSegment('receive');
  $('txn-amount').value = '';
  $('txn-method').value = 'card';
  $('txn-desc').value   = '';
  setDateDisplay(jalaliToday());

  $('txn-sheet-title').textContent = 'ثبت تراکنش';
  openSheet('txn-sheet');
}

let selectedTxnType = 'receive';

function setSegment(type) {
  selectedTxnType = type;
  document.querySelectorAll('.seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
}

function saveTransaction() {
  const accId  = $('txn-acc-select').value;
  const type   = selectedTxnType;
  const amount = parseFloat($('txn-amount').value);
  const date   = $('txn-date-display').dataset.value;
  const method = $('txn-method').value;
  const desc   = $('txn-desc').value.trim();

  if (!accId)               { showToast('طرف حساب را انتخاب کنید','error'); return; }
  if (!date)                { showToast('تاریخ را انتخاب کنید','error'); return; }
  if (isNaN(amount)||!amount){ showToast('مبلغ معتبر وارد کنید','error'); return; }

  db.transactions.push({
    id: nextTxnId(), accountId: accId, type,
    amount: type==='adjust' ? amount : Math.abs(amount),
    date, method, description: desc,
    balanceAfter: 0,
    createdAt: new Date().toISOString()
  });

  db.txnsSinceBackup = (db.txnsSinceBackup||0) + 1;
  recalcAccount(accId);
  triggerSave();
  closeSheet('txn-sheet');
  renderPage(activePage);
  showToast('اطلاعات با موفقیت ذخیره شد ✓');
}

function deleteTxn(id) {
  if (!confirm('تراکنش حذف شود؟')) return;
  const t = db.transactions.find(x => x.id === id);
  if (!t) return;
  const accId = t.accountId;
  db.transactions = db.transactions.filter(x => x.id !== id);
  recalcAccount(accId);
  triggerSave();
  renderPage(activePage);
  showToast('تراکنش حذف شد');
}

// ── Jalali Calendar Picker ────────────────────────────────────────────────────
let calYear, calMonth;

function setDateDisplay(jalStr) {
  const el = $('txn-date-display');
  el.dataset.value = jalStr;
  el.querySelector('.date-val').textContent = jalStr || 'انتخاب تاریخ';
}

function openCalendar() {
  const current = $('txn-date-display').dataset.value;
  if (current && /\d/.test(current)) {
    const parts = current.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).split('/');
    calYear  = parseInt(parts[0]);
    calMonth = parseInt(parts[1]);
  } else {
    const [jy,jm] = gregorianToJalali(new Date().getFullYear(), new Date().getMonth()+1, new Date().getDate());
    calYear = jy; calMonth = jm;
  }
  renderCalendar();
  openSheet('cal-sheet');
}

function renderCalendar() {
  $('cal-month-label').textContent = fa(calYear) + ' — ' + JALALI_MONTHS[calMonth-1];

  // Find first weekday of month (0=Sat in Jalali week display)
  const [gy,gm,gd] = jalaliToGregorian(calYear, calMonth, 1);
  const firstDate = new Date(gy, gm-1, gd);
  // JS: 0=Sun,1=Mon,...,6=Sat → Jalali display: 0=Sat,1=Sun,2=Mon,...,6=Fri
  const jsDay = firstDate.getDay(); // 0=Sun
  // Convert: Sat=0, Sun=1, ..., Fri=6
  const startOffset = (jsDay + 1) % 7;

  const today = new Date();
  const [tjy, tjm, tjd] = gregorianToJalali(today.getFullYear(), today.getMonth()+1, today.getDate());
  const selectedStr = $('txn-date-display').dataset.value;

  // Days in month
  const jDM = [31,31,31,31,31,31,30,30,30,30,30, calYear%4===3?30:29];
  const daysInMonth = jDM[calMonth-1];

  let cells = '';
  for (let i=0; i<startOffset; i++) cells += `<div class="cal-day empty"></div>`;
  for (let d=1; d<=daysInMonth; d++) {
    const jalStr = fa(calYear) + '/' + faPad(calMonth) + '/' + faPad(d);
    const isToday    = (calYear===tjy && calMonth===tjm && d===tjd);
    const isSelected = (jalStr === selectedStr);
    const cls = [
      'cal-day',
      isToday    ? 'today'    : '',
      isSelected ? 'selected' : ''
    ].filter(Boolean).join(' ');
    cells += `<div class="${cls}" onclick="selectDate('${jalStr}')">${fa(d)}</div>`;
  }

  html('cal-days', cells);
}

function calPrev() {
  calMonth--;
  if (calMonth<1) { calMonth=12; calYear--; }
  renderCalendar();
}

function calNext() {
  calMonth++;
  if (calMonth>12) { calMonth=1; calYear++; }
  renderCalendar();
}

function selectDate(jalStr) {
  setDateDisplay(jalStr);
  closeSheet('cal-sheet');
}

// ── Backup Banner ─────────────────────────────────────────────────────────────
function checkBackupBanner() {
  const banner = $('backup-banner');
  if (!banner) return;
  const txns = db.txnsSinceBackup || 0;
  const last  = db.lastBackupDate ? (Date.now()-new Date(db.lastBackupDate))/86400000 : 999;
  banner.style.display = (txns>=5 || last>=7) ? 'flex' : 'none';
}

function dismissBackup() {
  $('backup-banner').style.display = 'none';
}

// ── Export / Import ───────────────────────────────────────────────────────────
function exportJSON() {
  db.lastBackupDate    = new Date().toISOString();
  db.txnsSinceBackup   = 0;
  triggerSave();
  const name = 'دفتر_بدهی‌ها_بکاپ_' + jalaliToday().replace(/\//g,'-') + '_' + nowTime().replace(':','-') + '.json';
  const blob = new Blob([JSON.stringify(db, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  checkBackupBanner();
  showToast('فایل بکاپ ذخیره شد ✓');
}

function importJSON() {
  $('import-file').click();
}

async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.accounts || !data.transactions) throw new Error('فرمت فایل نامعتبر');
      const ok = confirm(
        '⚠️ هشدار\n\nتمام اطلاعات فعلی با فایل وارد‌شده جایگزین می‌شود.\nاین عملیات برگشت‌پذیر نیست.\n\nادامه می‌دهید؟'
      );
      if (!ok) { e.target.value=''; return; }
      db = data;
      if (!db.meta) db.meta = {lastAccountId: db.accounts.length, lastTxnId: db.transactions.length};
      if (db.txnsSinceBackup == null) db.txnsSinceBackup = 0;
      await storageSave(db);
      renderPage(activePage);
      renderReportsPage();
      setSaveChip('saved');
      showToast('بکاپ با موفقیت بازیابی شد ✓');
    } catch(err) {
      showToast('خطا: ' + err.message, 'error');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type='') {
  const wrap = $('toast-wrap');
  const t = document.createElement('div');
  t.className = 'toast' + (type?' '+type:'');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── PWA Install ───────────────────────────────────────────────────────────────
function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstall = e;
    const banner = $('install-banner');
    if (banner) banner.style.display = 'flex';
  });

  window.addEventListener('appinstalled', () => {
    const banner = $('install-banner');
    if (banner) banner.style.display = 'none';
    showToast('اپ با موفقیت نصب شد 🎉');
  });
}

function triggerInstall() {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  deferredInstall.userChoice.then(() => {
    deferredInstall = null;
    const banner = $('install-banner');
    if (banner) banner.style.display = 'none';
  });
}

// ── Service Worker Registration ───────────────────────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('[SW] Registered', reg.scope))
      .catch(err => console.warn('[SW] Registration failed', err));
  }
}

// ── Empty State Helper ────────────────────────────────────────────────────────
function emptyState(icon, title, sub) {
  return `<div class="empty-state">
    <div class="empty-icon">${icon}</div>
    <div class="empty-title">${title}</div>
    ${sub ? `<div class="empty-sub">${sub}</div>` : ''}
  </div>`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  idbDb = await idbOpen();

  const saved = await storageLoad();
  if (saved) {
    db = saved;
    if (!db.meta) db.meta = {lastAccountId: db.accounts.length, lastTxnId: db.transactions.length};
    if (db.txnsSinceBackup == null) db.txnsSinceBackup = 0;
  }

  // Update save chip with last save time
  const chip = $('saveChip');
  const txt  = $('saveChipText');
  if (db.lastAutoSave) {
    txt.textContent = 'ذخیره: ' + relativeTime(db.lastAutoSave);
  } else {
    txt.textContent = idbDb ? 'IndexedDB آماده' : 'localStorage آماده';
  }

  registerSW();
  setupInstallPrompt();

  // Initial render
  switchPage('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
