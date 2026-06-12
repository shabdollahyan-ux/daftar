/* ═══════════════════════════════════════════
   دفتر بدهی‌ها — app.js  v4
   ═══════════════════════════════════════════ */
'use strict';

// ── Storage ───────────────────────────────────────────────────────────────────
const IDB_NAME='DaftarBedahi',IDB_STORE='data',IDB_KEY='main',LS_KEY='daftar_bedahi_v2';
let idbDb=null;
async function idbOpen(){return new Promise(r=>{if(!window.indexedDB){r(null);return;}const req=indexedDB.open(IDB_NAME,1);req.onupgradeneeded=e=>e.target.result.createObjectStore(IDB_STORE);req.onsuccess=e=>r(e.target.result);req.onerror=()=>r(null);});}
async function storageSave(data){const json=JSON.stringify(data);try{localStorage.setItem(LS_KEY,json);}catch(_){}if(!idbDb)return true;return new Promise(r=>{const tx=idbDb.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).put(json,IDB_KEY);tx.oncomplete=()=>r(true);tx.onerror=()=>r(false);});}
async function storageLoad(){if(idbDb){const d=await new Promise(r=>{const tx=idbDb.transaction(IDB_STORE,'readonly');const req=tx.objectStore(IDB_STORE).get(IDB_KEY);req.onsuccess=()=>r(req.result||null);req.onerror=()=>r(null);});if(d){try{return JSON.parse(d);}catch(_){}}}try{const r=localStorage.getItem(LS_KEY);if(r)return JSON.parse(r);}catch(_){}return null;}

// ── State ─────────────────────────────────────────────────────────────────────
let db=newDB(),saveTimer=null,activePage='dashboard',deferredInstall=null;
function newDB(){return{version:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastAutoSave:null,lastBackupDate:null,txnsSinceBackup:0,accounts:[],transactions:[],checks:[],loans:[],recurring:[],meta:{lastAccountId:0,lastTxnId:0,lastCheckId:0,lastLoanId:0,lastRecurId:0}};}

// ── Save ──────────────────────────────────────────────────────────────────────
function triggerSave(){setSaveChip('saving');clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{db.updatedAt=db.lastAutoSave=new Date().toISOString();db.version='دفتر بدهی‌ها — نسخه '+jalaliToday()+' - '+nowTime();setSaveChip(await storageSave(db)?'saved':'error');},250);}
function setSaveChip(s){const chip=$('saveChip'),txt=$('saveChipText');chip.className='save-chip '+s;if(s==='saving'){txt.textContent='در حال ذخیره...';}else if(s==='saved'){txt.textContent='ذخیره شد ✓';setTimeout(()=>{chip.className='save-chip';txt.textContent=db.lastAutoSave?'ذخیره: '+relTime(db.lastAutoSave):'آماده';},2000);}else{txt.textContent='خطا در ذخیره';}}
function relTime(iso){const s=Math.floor((Date.now()-new Date(iso))/1000);if(s<60)return'لحظه‌ای پیش';if(s<3600)return fa(Math.floor(s/60))+' دق پیش';return jalaliStr(new Date(iso));}

// ── Jalali ────────────────────────────────────────────────────────────────────
function fa(n){return String(n).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);}
function pad2(n){return String(n).padStart(2,'0');}
function faPad(n){return fa(pad2(n));}
function gregorianToJalali(gy,gm,gd){gy-=1600;gm-=1;gd-=1;let gdn=365*gy+Math.floor((gy+3)/4)-Math.floor((gy+99)/100)+Math.floor((gy+399)/400);const gDM=[31,28+((gy+1600)%4===0&&((gy+1600)%100!==0||(gy+1600)%400===0)?1:0),31,30,31,30,31,31,30,31,30,31];for(let i=0;i<gm;i++)gdn+=gDM[i];gdn+=gd;let jdn=gdn-79,jnp=Math.floor(jdn/12053);jdn%=12053;let jy=979+33*jnp+4*Math.floor(jdn/1461);jdn%=1461;if(jdn>=366){jy+=Math.floor((jdn-1)/365);jdn=(jdn-1)%365;}const jDM=[31,31,31,31,31,31,30,30,30,30,30,29];let jm=0,jd;for(jm=0;jm<11&&jdn>=jDM[jm];jm++)jdn-=jDM[jm];jd=jdn+1;return[jy,jm+1,jd];}
function jalaliToGregorian(jy,jm,jd){jy-=979;jm-=1;jd-=1;let jdn=365*jy+Math.floor(jy/33)*8+Math.floor((jy%33+3)/4);const jDM=[31,31,31,31,31,31,30,30,30,30,30,29];for(let i=0;i<jm;i++)jdn+=jDM[i];jdn+=jd;let gdn=jdn+79,gy=1600+400*Math.floor(gdn/146097);gdn%=146097;let leap=true;if(gdn>=36525){gdn--;gy+=100*Math.floor(gdn/36524);gdn%=36524;if(gdn>=365)gdn++;else leap=false;}gy+=4*Math.floor(gdn/1461);gdn%=1461;if(gdn>=366){leap=false;gdn--;gy+=Math.floor(gdn/365);gdn%=365;}const gDM=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];let gm=0;for(gm=0;gm<11&&gdn>=gDM[gm];gm++)gdn-=gDM[gm];return[gy,gm+1,gdn+1];}
function jalaliStr(d){const[jy,jm,jd]=gregorianToJalali(d.getFullYear(),d.getMonth()+1,d.getDate());return fa(jy)+'/'+faPad(jm)+'/'+faPad(jd);}
function jalaliToday(){return jalaliStr(new Date());}
function nowTime(){const d=new Date();return fa(d.getHours())+':'+fa(String(d.getMinutes()).padStart(2,'0'));}
function fmtAmount(n){if(n==null)return'۰';return fa(Math.abs(Math.round(n)).toLocaleString('en'));}
const JALALI_MONTHS=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

function jalaliToDate(s){if(!s)return null;const c=s.replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));const p=c.split('/');if(p.length!==3)return null;const[gy,gm,gd]=jalaliToGregorian(parseInt(p[0]),parseInt(p[1]),parseInt(p[2]));return new Date(gy,gm-1,gd);}
function daysUntil(s){const d=jalaliToDate(s);if(!d)return null;const t=new Date();t.setHours(0,0,0,0);return Math.ceil((d-t)/86400000);}

// جلالی ماه بعدی
function addJalaliMonths(jalStr, months){
  const c=jalStr.replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  const p=c.split('/');
  let jy=parseInt(p[0]),jm=parseInt(p[1]),jd=parseInt(p[2]);
  jm+=months;
  while(jm>12){jm-=12;jy++;}
  return fa(jy)+'/'+faPad(jm)+'/'+faPad(jd);
}

// ماه جلالی فعلی
function currentJalaliMonth(){
  const[jy,jm]=gregorianToJalali(new Date().getFullYear(),new Date().getMonth()+1,new Date().getDate());
  return{year:jy,month:jm,label:JALALI_MONTHS[jm-1]+' '+fa(jy)};
}

// ── IDs ───────────────────────────────────────────────────────────────────────
function nextAccId(){db.meta.lastAccountId++;return'ح-'+fa(String(db.meta.lastAccountId).padStart(3,'0'));}
function nextTxnId(){db.meta.lastTxnId++;return'ت-'+fa(String(db.meta.lastTxnId).padStart(4,'0'));}
function nextCheckId(){db.meta.lastCheckId++;return'چ-'+fa(String(db.meta.lastCheckId).padStart(3,'0'));}
function nextLoanId(){db.meta.lastLoanId++;return'و-'+fa(String(db.meta.lastLoanId).padStart(3,'0'));}
function nextRecurId(){db.meta.lastRecurId++;return'د-'+fa(String(db.meta.lastRecurId).padStart(3,'0'));}

// ── Balance ───────────────────────────────────────────────────────────────────
function recalcAccount(accId){const acc=db.accounts.find(a=>a.id===accId);if(!acc)return;const txns=db.transactions.filter(t=>t.accountId===accId).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));let recv=0,paid=0,bal=0;txns.forEach(t=>{if(t.type==='receive'){recv+=t.amount;bal+=t.amount;}else if(t.type==='pay'){paid+=t.amount;bal-=t.amount;}else if(t.type==='adjust'){bal+=t.amount;}t.balanceAfter=bal;});acc.totalReceived=recv;acc.totalPaid=paid;acc.balance=bal;acc.lastTxnDate=txns.length?txns[txns.length-1].date:null;}

// ── DOM ───────────────────────────────────────────────────────────────────────
function $(id){return document.getElementById(id);}
function html(id,c){$(id).innerHTML=c;}
function emptyState(icon,title,sub){return`<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div>${sub?`<div class="empty-sub">${sub}</div>`:''}</div>`;}

// ── Nav ───────────────────────────────────────────────────────────────────────
function switchPage(name){
  activePage=name;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  $('page-'+name).classList.add('active');
  $('nav-'+name).classList.add('active');
  const fab=$('fab');
  const cfg={dashboard:{show:true,label:'+ تراکنش',fn:openAddTransaction},accounts:{show:true,label:'+ طرف حساب',fn:openAddAccount},transactions:{show:true,label:'+ تراکنش',fn:openAddTransaction},checks:{show:true,label:'+ چک',fn:openAddCheck},loans:{show:true,label:'+ وام',fn:openAddLoan},recurring:{show:true,label:'+ پرداخت دوره‌ای',fn:openAddRecurring},reports:{show:false}};
  const c=cfg[name]||{show:false};
  if(c.show){fab.classList.remove('hidden');fab.textContent=c.label;fab.onclick=c.fn;}else{fab.classList.add('hidden');}
  renderPage(name);
}
function renderPage(name){
  if(name==='dashboard')renderDashboard();
  if(name==='accounts')renderAccounts();
  if(name==='transactions')renderTransactions();
  if(name==='checks')renderChecks();
  if(name==='loans')renderLoans();
  if(name==='recurring')renderRecurring();
  if(name==='reports')renderReportsPage();
  checkBackupBanner();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function renderDashboard(){
  const active=db.accounts.filter(a=>a.status==='active');
  html('stat-debt',fmtAmount(active.reduce((s,a)=>s+Math.max(0,a.balance||0),0)));
  html('stat-paid',fmtAmount(db.accounts.reduce((s,a)=>s+(a.totalPaid||0),0)));
  html('stat-accounts',fa(active.length));
  html('stat-txns',fa(db.transactions.length));

  // ── این ماه چقدر باید بدهم ──
  const cm=currentJalaliMonth();
  const thisMonthDue=getThisMonthDue(cm.year,cm.month);
  html('stat-month-label',cm.label);
  html('stat-month-due',fmtAmount(thisMonthDue));

  // ── هشدارها ──
  let alerts='';

  // معوق‌ها (گذشته و پرداخت نشده) — اولویت اول
  const overdueRecur=getOverdueRecurring();
  overdueRecur.forEach(({r,p})=>{
    const acc=db.accounts.find(a=>a.id===r.accountId);
    const d=Math.abs(daysUntil(p.dueDate));
    alerts+=`<div class="alert-card alert-overdue" onclick="switchPage('recurring')">
      <div class="alert-icon">🔴</div>
      <div class="alert-body"><strong>معوق — ${recurTypeLabel(r.type)}</strong>
      ${acc?acc.name:'—'} · ${fmtAmount(p.amount)} تومان<br>
      <span class="alert-date">⚠️ ${fa(d)} روز گذشته — سررسید: ${p.dueDate}</span></div>
    </div>`;
  });

  // سررسید نزدیک چک
  (db.checks||[]).filter(c=>c.status==='pending'&&daysUntil(c.dueDate)<=3&&daysUntil(c.dueDate)>=0).forEach(c=>{
    const acc=db.accounts.find(a=>a.id===c.accountId);
    const d=daysUntil(c.dueDate);
    alerts+=`<div class="alert-card alert-red" onclick="switchPage('checks')">
      <div class="alert-icon">📋</div>
      <div class="alert-body"><strong>سررسید چک ${c.direction==='issued'?'صادره':'دریافتی'}</strong>
      ${acc?acc.name:'—'} · ${fmtAmount(c.amount)} تومان<br>
      <span class="alert-date">${d===0?'امروز!':'تا '+fa(d)+' روز دیگر'} — ${c.dueDate}</span></div>
    </div>`;
  });

  // سررسید نزدیک پرداخت دوره‌ای (غیر معوق)
  getUpcomingRecurring(3).forEach(({r,p})=>{
    const acc=db.accounts.find(a=>a.id===r.accountId);
    const d=daysUntil(p.dueDate);
    alerts+=`<div class="alert-card alert-amber" onclick="switchPage('recurring')">
      <div class="alert-icon">📅</div>
      <div class="alert-body"><strong>${recurTypeLabel(r.type)}</strong>
      ${acc?acc.name:'—'} · ${fmtAmount(p.amount)} تومان<br>
      <span class="alert-date">${d===0?'امروز!':'تا '+fa(d)+' روز دیگر'} — ${p.dueDate}</span></div>
    </div>`;
  });

  html('dash-alerts',alerts);

  const recent=[...db.transactions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5);
  html('dash-recent',recent.length
    ?`<div class="section-header"><span class="section-title">آخرین تراکنش‌ها</span><button class="btn btn-sm btn-secondary" onclick="switchPage('transactions')" style="width:auto">همه</button></div><div class="card">${recent.map(t=>txnRow(t)).join('')}</div>`
    :emptyState('📋','هنوز تراکنشی ثبت نشده','اولین تراکنش را ثبت کنید'));
}

// ── Recurring Helpers ─────────────────────────────────────────────────────────
function recurTypeLabel(t){return{rent:'🏠 اجاره',installment:'🛒 خرید اقساطی',other:'📅 سایر'}[t]||t;}

function getThisMonthDue(jy,jm){
  let total=0;
  (db.recurring||[]).forEach(r=>{
    if(r.status==='ended') return;
    (r.periods||[]).forEach(p=>{
      if(p.paid) return;
      const d=jalaliToDate(p.dueDate);
      if(!d) return;
      const[py,pm]=gregorianToJalali(d.getFullYear(),d.getMonth()+1,d.getDate());
      if(py===jy&&pm===jm) total+=p.amount;
    });
  });
  return total;
}

function getOverdueRecurring(){
  const res=[];
  (db.recurring||[]).forEach(r=>{
    if(r.status==='ended') return;
    (r.periods||[]).forEach(p=>{
      if(p.paid) return;
      const d=daysUntil(p.dueDate);
      if(d!==null&&d<0) res.push({r,p});
    });
  });
  return res.sort((a,b)=>(daysUntil(a.p.dueDate)||0)-(daysUntil(b.p.dueDate)||0));
}

function getUpcomingRecurring(days){
  const res=[];
  (db.recurring||[]).forEach(r=>{
    if(r.status==='ended') return;
    (r.periods||[]).forEach(p=>{
      if(p.paid) return;
      const d=daysUntil(p.dueDate);
      if(d!==null&&d>=0&&d<=days) res.push({r,p});
    });
  });
  return res.sort((a,b)=>(daysUntil(a.p.dueDate)||0)-(daysUntil(b.p.dueDate)||0));
}

// ── Recurring Page ────────────────────────────────────────────────────────────
function renderRecurring(){
  const list=db.recurring||[];

  // خلاصه این ماه
  const cm=currentJalaliMonth();
  const thisMonthItems=(list).flatMap(r=>{
    if(r.status==='ended') return[];
    return(r.periods||[]).filter(p=>{
      const d=jalaliToDate(p.dueDate);if(!d)return false;
      const[py,pm]=gregorianToJalali(d.getFullYear(),d.getMonth()+1,d.getDate());
      return py===cm.year&&pm===cm.month;
    }).map(p=>({r,p}));
  });
  const thisMonthTotal=thisMonthItems.reduce((s,x)=>s+x.p.amount,0);
  const thisMonthUnpaid=thisMonthItems.filter(x=>!x.p.paid).reduce((s,x)=>s+x.p.amount,0);
  const thisMonthPaid=thisMonthTotal-thisMonthUnpaid;

  // معوق‌ها
  const overdue=getOverdueRecurring();

  let html_out='';

  // کارت این ماه
  html_out+=`<div class="month-summary-card">
    <div class="month-summary-title">📅 ${cm.label}</div>
    <div class="month-summary-grid">
      <div class="month-stat"><div class="month-stat-label">کل این ماه</div><div class="month-stat-value">${fmtAmount(thisMonthTotal)}</div></div>
      <div class="month-stat green"><div class="month-stat-label">پرداخت شد</div><div class="month-stat-value">${fmtAmount(thisMonthPaid)}</div></div>
      <div class="month-stat red"><div class="month-stat-label">باقی‌مانده</div><div class="month-stat-value">${fmtAmount(thisMonthUnpaid)}</div></div>
    </div>
  </div>`;

  // معوق‌ها — اولویت اول
  if(overdue.length){
    html_out+=`<div class="section-header mt-4"><span class="section-title" style="color:var(--red-700)">🔴 معوق — پرداخت نشده (${fa(overdue.length)})</span></div>`;
    html_out+=`<div class="card" style="border-color:var(--red-200);margin-bottom:12px">`;
    overdue.forEach(({r,p,idx})=>{
      const acc=db.accounts.find(a=>a.id===r.accountId);
      const d=Math.abs(daysUntil(p.dueDate));
      const pidx=(r.periods||[]).indexOf(p);
      html_out+=`<div class="recur-row overdue-row">
        <div class="recur-row-info">
          <div class="recur-row-name">${recurTypeLabel(r.type)} · ${acc?acc.name:'—'}</div>
          <div class="recur-row-meta" style="color:var(--red-700)">⚠️ ${fa(d)} روز گذشته · سررسید: ${p.dueDate}</div>
          ${p.note?`<div class="recur-row-meta">${p.note}</div>`:''}
        </div>
        <div class="recur-row-amount">
          <div style="font-weight:700;color:var(--red-700)">${fmtAmount(p.amount)}</div>
          <div style="font-size:10px;color:var(--gray-500)">تومان</div>
          <button class="btn btn-sm btn-primary mt-2" onclick="markPeriodPaid('${r.id}',${pidx})">✓ پرداخت شد</button>
        </div>
      </div>`;
    });
    html_out+=`</div>`;
  }

  // لیست پرداخت‌های دوره‌ای
  if(!list.length){html_out+=emptyState('📅','هنوز پرداخت دوره‌ای ثبت نشده','دکمه + را بزنید');html('recurring-list',html_out);return;}

  html_out+=`<div class="section-header mt-4"><span class="section-title">همه پرداخت‌های دوره‌ای</span></div>`;
  list.forEach(r=>{
    const acc=db.accounts.find(a=>a.id===r.accountId);
    const periods=r.periods||[];
    const paidCount=periods.filter(p=>p.paid).length;
    const totalCount=periods.length;
    const nextP=periods.find(p=>!p.paid&&daysUntil(p.dueDate)>=0);
    const overdueP=periods.filter(p=>!p.paid&&daysUntil(p.dueDate)<0);
    const progress=totalCount>0?Math.round(paidCount/totalCount*100):0;
    const isEnded=r.status==='ended';
    html_out+=`<div class="card" style="margin-bottom:8px;cursor:pointer${overdueP.length?';border-color:var(--red-200)':''}" onclick="openRecurringDetail('${r.id}')">
      <div style="padding:14px 16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div>
            <div style="font-weight:700;font-size:14px">${recurTypeLabel(r.type)} <span class="id-badge">${r.id}</span></div>
            <div style="font-size:12px;color:var(--gray-500);margin-top:2px">${acc?acc.name:'—'} · ${fmtAmount(r.amount)} تومان/ماه</div>
            ${r.description?`<div style="font-size:12px;color:var(--gray-500)">${r.description}</div>`:''}
          </div>
          <div style="text-align:left;flex-shrink:0">
            ${overdueP.length?`<div style="color:var(--red-700);font-weight:700;font-size:13px">⚠️ ${fa(overdueP.length)} معوق</div>`:''}
            ${nextP&&!overdueP.length?`<div style="font-size:11px;color:var(--gray-500)">بعدی: ${nextP.dueDate}</div>`:''}
            <span class="badge ${isEnded?'badge-gray':overdueP.length?'badge-red':'badge-blue'}">${isEnded?'پایان یافت':overdueP.length?'معوق':'فعال'}</span>
          </div>
        </div>
        ${totalCount>0?`<div style="background:var(--gray-100);border-radius:4px;height:5px;overflow:hidden;margin-bottom:4px"><div style="background:var(--blue-700);height:100%;width:${progress}%;border-radius:4px"></div></div>
        <div style="font-size:11px;color:var(--gray-500)">${fa(paidCount)} از ${fa(totalCount)} دوره پرداخت شده</div>`:''}
      </div>
    </div>`;
  });

  html('recurring-list',html_out);
}

// ── Recurring Detail ──────────────────────────────────────────────────────────
function openRecurringDetail(id){
  const r=(db.recurring||[]).find(x=>x.id===id);if(!r)return;
  const acc=db.accounts.find(a=>a.id===r.accountId);
  const periods=r.periods||[];
  const paidTotal=periods.filter(p=>p.paid).reduce((s,p)=>s+p.amount,0);
  const unpaidTotal=periods.filter(p=>!p.paid).reduce((s,p)=>s+p.amount,0);

  const rows=periods.map((p,i)=>{
    const d=!p.paid?daysUntil(p.dueDate):null;
    const isOverdue=!p.paid&&d!==null&&d<0;
    const isUrgent=!p.paid&&d!==null&&d>=0&&d<=3;
    let rowStyle=isOverdue?'background:#fff0f0':isUrgent?'background:#fff8f0':'';
    let dateStyle=isOverdue?'color:var(--red-700);font-weight:700':isUrgent?'color:var(--amber-700)':'color:var(--gray-500)';
    let dateExtra=isOverdue?` · ⚠️ ${fa(Math.abs(d))} روز گذشته`:isUrgent&&d===0?' · امروز!':isUrgent?` · ${fa(d)} روز دیگر`:'';
    return`<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gray-200);${rowStyle}">
      <div>
        <div style="font-size:13px;font-weight:600">دوره ${fa(i+1)}</div>
        <div style="font-size:11px;${dateStyle}">${p.dueDate}${dateExtra}</div>
        ${p.payMethod?`<div style="font-size:11px;color:var(--gray-500)">${methodLabel(p.payMethod)}${p.note?' · '+p.note:''}</div>`:''}
        ${p.paidDate?`<div style="font-size:11px;color:var(--green-700)">✓ ${p.paidDate}</div>`:''}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="text-align:left"><div style="font-weight:700;font-size:13px">${fmtAmount(p.amount)}</div><div style="font-size:10px;color:var(--gray-500)">تومان</div></div>
        <button class="btn btn-sm ${p.paid?'btn-secondary':'btn-primary'}" style="width:auto${p.paid?';opacity:0.6':''}" onclick="markPeriodPaid('${r.id}',${i})">
          ${p.paid?'↩ برگشت':'✓ پرداخت'}
        </button>
      </div>
    </div>`;
  }).join('');

  $('detail-sheet-title').textContent=recurTypeLabel(r.type);
  html('detail-sheet-body',`
    <div class="detail-summary" style="margin-bottom:16px">
      <div class="detail-stat blue"><div class="detail-stat-label">هر ماه</div><div class="detail-stat-value">${fmtAmount(r.amount)}</div><div class="detail-stat-unit">تومان</div></div>
      <div class="detail-stat green"><div class="detail-stat-label">پرداخت شد</div><div class="detail-stat-value">${fmtAmount(paidTotal)}</div><div class="detail-stat-unit">تومان</div></div>
      <div class="detail-stat red"><div class="detail-stat-label">باقی‌مانده</div><div class="detail-stat-value">${fmtAmount(unpaidTotal)}</div><div class="detail-stat-unit">تومان</div></div>
    </div>
    <div style="font-size:13px;color:var(--gray-600);margin-bottom:12px">
      ${acc?acc.name:'—'}${r.description?' · '+r.description:''} · از ${r.startDate}
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      ${r.status!=='ended'?`<button class="btn btn-sm" style="background:var(--gray-700,#444);color:white;border-color:#444;width:auto" onclick="endRecurring('${r.id}');closeSheet('detail-sheet')">پایان دادن</button>`:''}
      <button class="btn btn-sm btn-danger" onclick="deleteRecurring('${r.id}');closeSheet('detail-sheet')">🗑️ حذف</button>
    </div>
    <div class="section-title mb-2">دوره‌ها (${fa(periods.length)})</div>
    <div>${rows}</div>
  `);
  openSheet('detail-sheet');
}

function markPeriodPaid(recurId, idx){
  const r=(db.recurring||[]).find(x=>x.id===recurId);if(!r)return;
  const p=r.periods[idx];
  p.paid=!p.paid;
  if(p.paid){p.paidDate=jalaliToday();}else{delete p.paidDate;}
  triggerSave();
  // اگر detail sheet باز است refresh کن
  if($('detail-sheet').classList.contains('open')) openRecurringDetail(recurId);
  renderPage(activePage);
  showToast(p.paid?'پرداخت ثبت شد ✓':'پرداخت لغو شد');
}

function endRecurring(id){
  if(!confirm('این پرداخت دوره‌ای پایان یافته ثبت شود؟')) return;
  const r=(db.recurring||[]).find(x=>x.id===id);if(!r)return;
  r.status='ended';
  triggerSave(); renderPage(activePage);
  showToast('پایان یافت ✓');
}

function deleteRecurring(id){
  if(!confirm('این پرداخت دوره‌ای حذف شود؟')) return;
  db.recurring=(db.recurring||[]).filter(x=>x.id!==id);
  triggerSave(); renderPage(activePage);
  showToast('حذف شد');
}

function methodLabel(m){return{card:'کارت به کارت',cash:'نقدی',check:'چک',transfer:'حواله',other:'سایر'}[m]||m;}

// ── Add Recurring Form ────────────────────────────────────────────────────────
function openAddRecurring(presetAccId){
  const sel=$('recur-acc-select');
  sel.innerHTML='<option value="">-- انتخاب کنید --</option>'+db.accounts.map(a=>`<option value="${a.id}">${a.id} — ${a.name}</option>`).join('');
  if(presetAccId) sel.value=presetAccId;
  $('recur-type').value='rent';
  $('recur-amount').value='';
  $('recur-count').value='12';
  $('recur-desc').value='';
  $('recur-method').value='card';
  setRecurDate('');
  openSheet('recur-sheet');
}

function setRecurDate(val){const el=$('recur-start-display');el.dataset.value=val;el.querySelector('.date-val').textContent=val||'انتخاب تاریخ';}
function openRecurCal(){openCalendarFor($('recur-start-display').dataset.value,'cal-sheet','recur');}

function saveRecurring(){
  const accId=$('recur-acc-select').value;
  const type=$('recur-type').value;
  const amount=parseFloat($('recur-amount').value);
  const count=parseInt($('recur-count').value);
  const start=$('recur-start-display').dataset.value;
  const desc=$('recur-desc').value.trim();
  const method=$('recur-method').value;

  if(!accId){showToast('طرف حساب را انتخاب کنید','error');return;}
  if(!start){showToast('تاریخ اولین پرداخت را انتخاب کنید','error');return;}
  if(isNaN(amount)||!amount){showToast('مبلغ را وارد کنید','error');return;}
  if(isNaN(count)||count<1){showToast('تعداد دوره را وارد کنید','error');return;}

  // ساخت دوره‌ها
  const periods=[];
  for(let i=0;i<count;i++){
    periods.push({dueDate:addJalaliMonths(start,i),amount,paid:false,payMethod:method});
  }

  if(!db.recurring)db.recurring=[];
  db.recurring.push({id:nextRecurId(),accountId:accId,type,description:desc,amount,totalPeriods:count,startDate:start,periods,status:'active',createdAt:new Date().toISOString()});
  triggerSave();
  closeSheet('recur-sheet');
  renderPage(activePage);
  showToast('پرداخت دوره‌ای با موفقیت ثبت شد ✓');
}

// ── Accounts ──────────────────────────────────────────────────────────────────
let accSearch='',accStatusFilter='';
function renderAccounts(){
  let list=db.accounts.filter(a=>{const q=accSearch.toLowerCase();return(!q||a.name.toLowerCase().includes(q)||a.id.includes(q))&&(!accStatusFilter||a.status===accStatusFilter);});
  if(!list.length&&!accSearch&&!accStatusFilter){html('accounts-list',emptyState('👥','هنوز طرف حسابی ندارید','دکمه + را بزنید'));return;}
  if(!list.length){html('accounts-list',emptyState('🔍','نتیجه‌ای یافت نشد',''));return;}
  html('accounts-list',`<div class="card card-list">${list.map(a=>`<div class="card-row" onclick="openAccountDetail('${a.id}')"><div class="card-row-info"><div class="card-row-name">${a.name} <span class="id-badge">${a.id}</span></div><div class="card-row-sub"><span class="badge ${a.status==='active'?'badge-blue':'badge-gray'}">${a.status==='active'?'فعال':'تسویه‌شده'}</span>${a.lastTxnDate?' · '+a.lastTxnDate:''}</div></div><div class="card-row-amount ${balClass(a.balance)}">${fmtAmount(a.balance)}<br><small style="font-size:10px;font-weight:400">تومان</small></div><span class="card-chevron">‹</span></div>`).join('')}</div>`);
}
function balClass(b){if(!b||b===0)return'muted';return b>0?'red':'green';}

// ── Transactions ──────────────────────────────────────────────────────────────
let txnSearch='',txnTypeFilter='',txnAccFilter='';
function renderTransactions(){
  let list=[...db.transactions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).filter(t=>{const acc=db.accounts.find(a=>a.id===t.accountId),name=acc?acc.name.toLowerCase():'',q=txnSearch.toLowerCase();return(!q||(t.description||'').toLowerCase().includes(q)||name.includes(q))&&(!txnTypeFilter||t.type===txnTypeFilter)&&(!txnAccFilter||t.accountId===txnAccFilter);});
  if(!list.length&&!txnSearch&&!txnTypeFilter&&!txnAccFilter){html('txn-list',emptyState('📋','هنوز تراکنشی ثبت نشده','دکمه + را بزنید'));return;}
  if(!list.length){html('txn-list',emptyState('🔍','نتیجه‌ای یافت نشد',''));return;}
  html('txn-list',`<div class="card">${list.map(t=>txnRow(t,true)).join('')}</div>`);
}
const TYPE_ICON={receive:'📥',pay:'📤',adjust:'⚙️'};
const TYPE_LABEL={receive:'دریافت',pay:'پرداخت',adjust:'اصلاحیه'};
function txnRow(t,showDelete=false){const acc=db.accounts.find(a=>a.id===t.accountId);const amtClass=t.type==='receive'?'amount-red':t.type==='pay'?'amount-green':'amount-muted';return`<div class="txn-row"><div class="txn-icon">${TYPE_ICON[t.type]}</div><div class="txn-info"><div class="txn-name">${acc?acc.name:'—'}</div><div class="txn-meta">${t.date} · ${methodLabel(t.method)}${t.description?' · '+t.description:''}</div></div><div class="txn-amount-col"><span class="txn-amount ${amtClass}">${fmtAmount(t.amount)}</span><span class="txn-balance">${fmtAmount(t.balanceAfter)} مانده</span>${showDelete?`<button class="btn btn-sm btn-danger mt-2" onclick="event.stopPropagation();deleteTxn('${t.id}')">حذف</button>`:''}</div></div>`;}

// ── Checks ────────────────────────────────────────────────────────────────────
let checkFilter='';
function renderChecks(){
  const checks=db.checks||[];
  let list=checks.filter(c=>!checkFilter||c.status===checkFilter||c.direction===checkFilter);
  const pending=checks.filter(c=>c.status==='pending').length,cleared=checks.filter(c=>c.status==='cleared').length,bounced=checks.filter(c=>c.status==='bounced').length;
  let out=`<div class="stats-grid" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:12px"><div class="stat-card"><div class="stat-label">در جریان</div><div class="stat-value blue">${fa(pending)}</div></div><div class="stat-card"><div class="stat-label">وصول شد</div><div class="stat-value green">${fa(cleared)}</div></div><div class="stat-card"><div class="stat-label">برگشتی</div><div class="stat-value red">${fa(bounced)}</div></div></div>`;
  if(!list.length){html('checks-list',out+emptyState('📋','هنوز چکی ثبت نشده','دکمه + را بزنید'));return;}
  const statusLabel={pending:'در جریان',cleared:'وصول شد',bounced:'برگشتی'};
  const statusClass={pending:'badge-blue',cleared:'badge-green',bounced:'badge-red'};
  out+=`<div class="card">${list.sort((a,b)=>{const da=jalaliToDate(a.dueDate),db2=jalaliToDate(b.dueDate);if(!da||!db2)return 0;return da-db2;}).map(c=>{const acc=db.accounts.find(a=>a.id===c.accountId);const days=daysUntil(c.dueDate);const urgency=c.status==='pending'&&days!=null&&days<=3?(days<0?'overdue':'urgent'):'';let daysLabel='';if(c.status==='pending'&&days!=null){if(days<0)daysLabel=`<span style="color:var(--red-700);font-size:11px;font-weight:700">⚠️ ${fa(Math.abs(days))} روز گذشته</span>`;else if(days===0)daysLabel=`<span style="color:var(--red-700);font-size:11px;font-weight:700">⚠️ امروز!</span>`;else if(days<=7)daysLabel=`<span style="color:var(--amber-700);font-size:11px">${fa(days)} روز دیگر</span>`;}return`<div class="card-row ${urgency}" onclick="openCheckDetail('${c.id}')"><div class="card-row-info"><div class="card-row-name">${c.direction==='issued'?'📤 صادره':'📥 دریافتی'} · ${acc?acc.name:'—'}</div><div class="card-row-sub">سررسید: ${c.dueDate} ${daysLabel?'· '+daysLabel:''}</div>${c.description?`<div class="card-row-sub">${c.description}</div>`:''}</div><div style="text-align:left;flex-shrink:0"><div style="font-weight:700;font-size:14px">${fmtAmount(c.amount)}</div><div style="font-size:11px;color:var(--gray-500)">تومان</div><span class="badge ${statusClass[c.status]}" style="margin-top:4px;display:inline-block">${statusLabel[c.status]}</span></div><span class="card-chevron">‹</span></div>`;}).join('')}</div>`;
  html('checks-list',out);
}

// ── Loans ─────────────────────────────────────────────────────────────────────
function renderLoans(){
  const loans=db.loans||[];
  if(!loans.length){html('loans-list',emptyState('💳','هنوز وامی ثبت نشده','دکمه + را بزنید'));return;}
  html('loans-list',loans.map(l=>{const acc=db.accounts.find(a=>a.id===l.accountId);const paidCount=(l.installments||[]).filter(i=>i.paid).length,totalCount=l.totalInstallments;const remaining=l.totalAmount-(l.installments||[]).filter(i=>i.paid).reduce((s,i)=>s+i.amount,0);const next=nextInstallmentDate(l);const days=next?daysUntil(next):null;let nextLabel='';if(l.status!=='settled'&&next){if(days<0)nextLabel=`<span style="color:var(--red-700);font-size:11px;font-weight:700">⚠️ ${fa(Math.abs(days))} روز گذشته</span>`;else if(days===0)nextLabel=`<span style="color:var(--red-700);font-size:11px;font-weight:700">⚠️ امروز!</span>`;else nextLabel=`<span style="color:var(--gray-500);font-size:11px">قسط بعدی: ${next}</span>`;}const progress=totalCount>0?Math.round(paidCount/totalCount*100):0;return`<div class="card" style="margin-bottom:8px;cursor:pointer" onclick="openLoanDetail('${l.id}')"><div style="padding:14px 16px"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div style="font-weight:700;font-size:14px">${acc?acc.name:'—'} <span class="id-badge">${l.id}</span></div><div style="font-size:12px;color:var(--gray-500);margin-top:2px">${l.description||'وام'} · ${fa(paidCount)}/${fa(totalCount)} قسط</div></div><div style="text-align:left"><div style="font-weight:700;font-size:15px;color:var(--red-700)">${fmtAmount(remaining)}</div><div style="font-size:11px;color:var(--gray-500)">مانده تومان</div></div></div><div style="background:var(--gray-100);border-radius:4px;height:6px;overflow:hidden;margin-bottom:6px"><div style="background:var(--blue-700);height:100%;width:${progress}%;border-radius:4px"></div></div><div style="display:flex;justify-content:space-between;align-items:center">${nextLabel}<span class="badge ${l.status==='settled'?'badge-green':'badge-blue'}">${l.status==='settled'?'تسویه شد':'در جریان'}</span></div></div></div>`;}).join(''));
}
function nextInstallmentDate(l){const u=(l.installments||[]).filter(i=>!i.paid);if(!u.length)return null;return u.sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0].dueDate;}

// ── Account Detail ────────────────────────────────────────────────────────────
function openAccountDetail(accId){
  const acc=db.accounts.find(a=>a.id===accId);if(!acc)return;
  const txns=db.transactions.filter(t=>t.accountId===accId).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  const checks=(db.checks||[]).filter(c=>c.accountId===accId);
  const loans=(db.loans||[]).filter(l=>l.accountId===accId);
  const recurs=(db.recurring||[]).filter(r=>r.accountId===accId);
  $('detail-sheet-title').textContent=acc.name;
  html('detail-sheet-body',`
    <div class="detail-summary"><div class="detail-stat red"><div class="detail-stat-label">دریافتی</div><div class="detail-stat-value">${fmtAmount(acc.totalReceived)}</div><div class="detail-stat-unit">تومان</div></div><div class="detail-stat green"><div class="detail-stat-label">پرداختی</div><div class="detail-stat-value">${fmtAmount(acc.totalPaid)}</div><div class="detail-stat-unit">تومان</div></div><div class="detail-stat blue"><div class="detail-stat-label">مانده</div><div class="detail-stat-value">${fmtAmount(acc.balance)}</div><div class="detail-stat-unit">تومان</div></div></div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="closeSheet('detail-sheet');openAddTransaction('${accId}')">+ تراکنش</button>
      <button class="btn btn-secondary btn-sm" onclick="closeSheet('detail-sheet');openAddCheck('${accId}')">+ چک</button>
      <button class="btn btn-secondary btn-sm" onclick="closeSheet('detail-sheet');openAddLoan('${accId}')">+ وام</button>
      <button class="btn btn-secondary btn-sm" onclick="closeSheet('detail-sheet');openAddRecurring('${accId}')">+ دوره‌ای</button>
      <button class="btn btn-secondary btn-sm" onclick="closeSheet('detail-sheet');openEditAccount('${accId}')">ویرایش</button>
    </div>
    ${txns.length?`<div class="section-title mb-2">تراکنش‌ها (${fa(txns.length)})</div><div class="card" style="margin-bottom:12px">${[...txns].reverse().map(t=>txnRow(t)).join('')}</div>`:''}
    ${checks.length?`<div class="section-title mb-2">چک‌ها</div><div class="card" style="margin-bottom:12px">${checks.map(c=>`<div class="card-row" onclick="closeSheet('detail-sheet');setTimeout(()=>openCheckDetail('${c.id}'),100)"><div class="card-row-info"><div class="card-row-name">${c.direction==='issued'?'📤 صادره':'📥 دریافتی'} · ${fmtAmount(c.amount)} تومان</div><div class="card-row-sub">سررسید: ${c.dueDate}</div></div><span class="badge ${c.status==='cleared'?'badge-green':c.status==='bounced'?'badge-red':'badge-blue'}">${c.status==='cleared'?'وصول':c.status==='bounced'?'برگشتی':'در جریان'}</span></div>`).join('')}</div>`:''}
    ${recurs.length?`<div class="section-title mb-2">پرداخت‌های دوره‌ای</div><div class="card" style="margin-bottom:12px">${recurs.map(r=>`<div class="card-row" onclick="closeSheet('detail-sheet');setTimeout(()=>openRecurringDetail('${r.id}'),100)"><div class="card-row-info"><div class="card-row-name">${recurTypeLabel(r.type)}</div><div class="card-row-sub">${fmtAmount(r.amount)} تومان/ماه · ${fa((r.periods||[]).filter(p=>p.paid).length)}/${fa(r.totalPeriods)} دوره</div></div><span class="badge ${r.status==='ended'?'badge-gray':'badge-blue'}">${r.status==='ended'?'پایان':'فعال'}</span></div>`).join('')}</div>`:''}
    ${loans.length?`<div class="section-title mb-2">وام‌ها</div><div class="card">${loans.map(l=>`<div class="card-row" onclick="closeSheet('detail-sheet');setTimeout(()=>openLoanDetail('${l.id}'),100)"><div class="card-row-info"><div class="card-row-name">${l.description||'وام'}</div><div class="card-row-sub">مانده: ${fmtAmount(l.totalAmount-(l.installments||[]).filter(i=>i.paid).reduce((s,i)=>s+i.amount,0))} تومان</div></div><span class="badge ${l.status==='settled'?'badge-green':'badge-blue'}">${l.status==='settled'?'تسویه':'در جریان'}</span></div>`).join('')}</div>`:''}
  `);
  openSheet('detail-sheet');
}

// ── Check Detail ──────────────────────────────────────────────────────────────
function openCheckDetail(id){const c=(db.checks||[]).find(x=>x.id===id);if(!c)return;const acc=db.accounts.find(a=>a.id===c.accountId);const statusLabel={pending:'در جریان',cleared:'وصول شد',bounced:'برگشتی'};const statusClass={pending:'badge-blue',cleared:'badge-green',bounced:'badge-red'};$('detail-sheet-title').textContent='جزئیات چک';html('detail-sheet-body',`<div style="background:var(--gray-50);border-radius:10px;padding:16px;margin-bottom:16px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px"><div><div style="color:var(--gray-500);margin-bottom:2px">نوع</div><div style="font-weight:600">${c.direction==='issued'?'📤 صادره':'📥 دریافتی'}</div></div><div><div style="color:var(--gray-500);margin-bottom:2px">طرف حساب</div><div style="font-weight:600">${acc?acc.name:'—'}</div></div><div><div style="color:var(--gray-500);margin-bottom:2px">مبلغ</div><div style="font-weight:700;font-size:15px">${fmtAmount(c.amount)} تومان</div></div><div><div style="color:var(--gray-500);margin-bottom:2px">تاریخ سررسید</div><div style="font-weight:600;color:var(--red-700)">${c.dueDate}</div></div>${c.issueDate?`<div><div style="color:var(--gray-500);margin-bottom:2px">تاریخ صدور</div><div style="font-weight:600">${c.issueDate}</div></div>`:''}${c.checkNumber?`<div><div style="color:var(--gray-500);margin-bottom:2px">شماره چک</div><div style="font-weight:600">${c.checkNumber}</div></div>`:''}</div>${c.description?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--gray-200);font-size:13px;color:var(--gray-600)">${c.description}</div>`:''}</div><div class="section-title mb-2">تغییر وضعیت</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-sm ${c.status==='pending'?'btn-primary':'btn-secondary'}" onclick="updateCheckStatus('${c.id}','pending');closeSheet('detail-sheet')">در جریان</button><button class="btn btn-sm" style="${c.status==='cleared'?'background:var(--green-700);color:white':'background:var(--green-100);color:var(--green-700);border-color:var(--green-200)'}" onclick="updateCheckStatus('${c.id}','cleared');closeSheet('detail-sheet')">✓ وصول شد</button><button class="btn btn-sm" style="${c.status==='bounced'?'background:var(--red-700);color:white':'background:var(--red-100);color:var(--red-700);border-color:var(--red-200)'}" onclick="updateCheckStatus('${c.id}','bounced');closeSheet('detail-sheet')">✗ برگشتی</button></div><div style="margin-top:16px"><button class="btn btn-danger btn-sm" onclick="deleteCheck('${c.id}');closeSheet('detail-sheet')">🗑️ حذف چک</button></div>`);openSheet('detail-sheet');}
function updateCheckStatus(id,status){const c=(db.checks||[]).find(x=>x.id===id);if(!c)return;c.status=status;triggerSave();renderPage(activePage);showToast('وضعیت به‌روز شد ✓');}
function deleteCheck(id){if(!confirm('این چک حذف شود؟'))return;db.checks=(db.checks||[]).filter(x=>x.id!==id);triggerSave();renderPage(activePage);showToast('چک حذف شد');}

// ── Loan Detail ───────────────────────────────────────────────────────────────
function openLoanDetail(id){const l=(db.loans||[]).find(x=>x.id===id);if(!l)return;const acc=db.accounts.find(a=>a.id===l.accountId);const paidCount=(l.installments||[]).filter(i=>i.paid).length;const paidTotal=(l.installments||[]).filter(i=>i.paid).reduce((s,i)=>s+i.amount,0);const remaining=l.totalAmount-paidTotal;const instRows=(l.installments||[]).map((inst,idx)=>{const days=!inst.paid?daysUntil(inst.dueDate):null;let urg='';if(!inst.paid&&days!=null){if(days<0)urg='color:var(--red-700)';else if(days<=3)urg='color:var(--amber-700)';}return`<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gray-200)"><div><div style="font-size:13px;font-weight:600">قسط ${fa(idx+1)}</div><div style="font-size:11px;${urg}">${inst.dueDate}${days!=null&&!inst.paid?(days<0?' · '+fa(Math.abs(days))+' روز گذشته':days===0?' · امروز!':days<=7?' · '+fa(days)+' روز دیگر':''):''}</div>${inst.paidDate?`<div style="font-size:11px;color:var(--green-700)">✓ ${inst.paidDate}</div>`:''}</div><div style="display:flex;align-items:center;gap:10px"><div style="text-align:left"><div style="font-weight:700;font-size:13px">${fmtAmount(inst.amount)}</div><div style="font-size:10px;color:var(--gray-500)">تومان</div></div><button class="btn btn-sm ${inst.paid?'btn-secondary':'btn-primary'}" style="width:auto${inst.paid?';opacity:0.6':''}" onclick="toggleInstallment('${l.id}',${idx})">${inst.paid?'✓ پرداخت شد':'پرداخت'}</button></div></div>`;}).join('');$('detail-sheet-title').textContent='جزئیات وام';html('detail-sheet-body',`<div class="detail-summary" style="margin-bottom:16px"><div class="detail-stat red"><div class="detail-stat-label">مبلغ کل</div><div class="detail-stat-value">${fmtAmount(l.totalAmount)}</div><div class="detail-stat-unit">تومان</div></div><div class="detail-stat green"><div class="detail-stat-label">پرداخت شد</div><div class="detail-stat-value">${fmtAmount(paidTotal)}</div><div class="detail-stat-unit">تومان</div></div><div class="detail-stat blue"><div class="detail-stat-label">مانده</div><div class="detail-stat-value">${fmtAmount(remaining)}</div><div class="detail-stat-unit">تومان</div></div></div><div style="font-size:13px;color:var(--gray-600);margin-bottom:12px"><strong>${acc?acc.name:'—'}</strong> · ${l.description||'وام'} · ${fa(paidCount)}/${fa(l.totalInstallments)} قسط</div><div style="display:flex;gap:8px;margin-bottom:16px">${l.status!=='settled'?`<button class="btn btn-sm" style="background:var(--green-700);color:white;border-color:var(--green-700);width:auto" onclick="settleLoan('${l.id}');closeSheet('detail-sheet')">✓ تسویه کامل</button>`:''}<button class="btn btn-sm btn-danger" onclick="deleteLoan('${l.id}');closeSheet('detail-sheet')">🗑️ حذف</button></div><div class="section-title mb-2">اقساط</div><div>${instRows}</div>`);openSheet('detail-sheet');}
function toggleInstallment(loanId,idx){const l=(db.loans||[]).find(x=>x.id===loanId);if(!l)return;l.installments[idx].paid=!l.installments[idx].paid;if(l.installments[idx].paid)l.installments[idx].paidDate=jalaliToday();else delete l.installments[idx].paidDate;if(l.installments.every(i=>i.paid))l.status='settled';else l.status='active';triggerSave();openLoanDetail(loanId);renderPage(activePage);showToast(l.installments[idx].paid?'قسط پرداخت شد ✓':'پرداخت لغو شد');}
function settleLoan(id){if(!confirm('وام تسویه شود؟'))return;const l=(db.loans||[]).find(x=>x.id===id);if(!l)return;l.status='settled';l.installments.forEach(i=>{i.paid=true;if(!i.paidDate)i.paidDate=jalaliToday();});triggerSave();renderPage(activePage);showToast('وام تسویه شد ✓');}
function deleteLoan(id){if(!confirm('این وام حذف شود؟'))return;db.loans=(db.loans||[]).filter(x=>x.id!==id);triggerSave();renderPage(activePage);showToast('وام حذف شد');}

// ── Account Form ──────────────────────────────────────────────────────────────
let editAccId=null;
function openAddAccount(){editAccId=null;$('acc-sheet-title').textContent='افزودن طرف حساب';$('acc-name').value='';$('acc-desc').value='';$('acc-status').value='active';openSheet('acc-sheet');}
function openEditAccount(id){const acc=db.accounts.find(a=>a.id===id);if(!acc)return;editAccId=id;$('acc-sheet-title').textContent='ویرایش';$('acc-name').value=acc.name;$('acc-desc').value=acc.description||'';$('acc-status').value=acc.status;openSheet('acc-sheet');}
function saveAccount(){const name=$('acc-name').value.trim();if(!name){showToast('نام الزامی است','error');return;}if(editAccId){const acc=db.accounts.find(a=>a.id===editAccId);acc.name=name;acc.description=$('acc-desc').value.trim();acc.status=$('acc-status').value;}else{db.accounts.push({id:nextAccId(),name,description:$('acc-desc').value.trim(),status:$('acc-status').value,totalReceived:0,totalPaid:0,balance:0,lastTxnDate:null,createdAt:new Date().toISOString()});}triggerSave();closeSheet('acc-sheet');renderPage(activePage);showToast('اطلاعات با موفقیت ذخیره شد ✓');}

// ── Transaction Form ──────────────────────────────────────────────────────────
function openAddTransaction(presetAccId){const sel=$('txn-acc-select');sel.innerHTML='<option value="">-- انتخاب کنید --</option>'+db.accounts.map(a=>`<option value="${a.id}">${a.id} — ${a.name}</option>`).join('');if(presetAccId)sel.value=presetAccId;setSegment('receive');$('txn-amount').value='';$('txn-method').value='card';$('txn-desc').value='';setDateDisplay(jalaliToday());$('txn-sheet-title').textContent='ثبت تراکنش';openSheet('txn-sheet');}
let selectedTxnType='receive';
function setSegment(type){selectedTxnType=type;document.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active',b.dataset.type===type));}
function saveTransaction(){const accId=$('txn-acc-select').value,type=selectedTxnType,amount=parseFloat($('txn-amount').value),date=$('txn-date-display').dataset.value,method=$('txn-method').value,desc=$('txn-desc').value.trim();if(!accId){showToast('طرف حساب را انتخاب کنید','error');return;}if(!date){showToast('تاریخ را انتخاب کنید','error');return;}if(isNaN(amount)||!amount){showToast('مبلغ معتبر وارد کنید','error');return;}db.transactions.push({id:nextTxnId(),accountId:accId,type,amount:type==='adjust'?amount:Math.abs(amount),date,method,description:desc,balanceAfter:0,createdAt:new Date().toISOString()});db.txnsSinceBackup=(db.txnsSinceBackup||0)+1;recalcAccount(accId);triggerSave();closeSheet('txn-sheet');renderPage(activePage);showToast('اطلاعات با موفقیت ذخیره شد ✓');}
function deleteTxn(id){if(!confirm('تراکنش حذف شود؟'))return;const t=db.transactions.find(x=>x.id===id);if(!t)return;db.transactions=db.transactions.filter(x=>x.id!==id);recalcAccount(t.accountId);triggerSave();renderPage(activePage);showToast('تراکنش حذف شد');}

// ── Check Form ────────────────────────────────────────────────────────────────
function openAddCheck(presetAccId){const sel=$('check-acc-select');sel.innerHTML='<option value="">-- انتخاب کنید --</option>'+db.accounts.map(a=>`<option value="${a.id}">${a.id} — ${a.name}</option>`).join('');if(presetAccId)sel.value=presetAccId;$('check-direction').value='issued';$('seg-issued').classList.add('active');$('seg-received').classList.remove('active');$('check-amount').value='';$('check-number').value='';$('check-desc').value='';setCheckDate('issue',jalaliToday());setCheckDate('due','');openSheet('check-sheet');}
function setCheckDate(f,v){const el=$('check-'+f+'-display');el.dataset.value=v;el.querySelector('.date-val').textContent=v||'انتخاب تاریخ';}
function openCheckCal(f){openCalendarFor($('check-'+f+'-display').dataset.value,'cal-sheet',f);}
function saveCheck(){const accId=$('check-acc-select').value,dir=$('check-direction').value,amount=parseFloat($('check-amount').value),dueDate=$('check-due-display').dataset.value,issDate=$('check-issue-display').dataset.value,num=$('check-number').value.trim(),desc=$('check-desc').value.trim();if(!accId){showToast('طرف حساب را انتخاب کنید','error');return;}if(!dueDate){showToast('تاریخ سررسید را انتخاب کنید','error');return;}if(isNaN(amount)||!amount){showToast('مبلغ را وارد کنید','error');return;}if(!db.checks)db.checks=[];db.checks.push({id:nextCheckId(),accountId:accId,direction:dir,amount:Math.abs(amount),issueDate:issDate,dueDate,checkNumber:num,description:desc,status:'pending',createdAt:new Date().toISOString()});triggerSave();closeSheet('check-sheet');renderPage(activePage);showToast('چک با موفقیت ثبت شد ✓');}

// ── Loan Form ─────────────────────────────────────────────────────────────────
function openAddLoan(presetAccId){const sel=$('loan-acc-select');sel.innerHTML='<option value="">-- انتخاب کنید --</option>'+db.accounts.map(a=>`<option value="${a.id}">${a.id} — ${a.name}</option>`).join('');if(presetAccId)sel.value=presetAccId;$('loan-total').value='';$('loan-count').value='';$('loan-inst').value='';$('loan-desc').value='';setLoanDate('');openSheet('loan-sheet');}
function setLoanDate(v){const el=$('loan-start-display');el.dataset.value=v;el.querySelector('.date-val').textContent=v||'انتخاب تاریخ';}
function openLoanCal(){openCalendarFor($('loan-start-display').dataset.value,'cal-sheet','loan');}
function calcInstallment(){const t=parseFloat($('loan-total').value)||0,c=parseInt($('loan-count').value)||0;if(t&&c)$('loan-inst').value=Math.ceil(t/c);}
function saveLoan(){const accId=$('loan-acc-select').value,total=parseFloat($('loan-total').value),count=parseInt($('loan-count').value),inst=parseFloat($('loan-inst').value),start=$('loan-start-display').dataset.value,desc=$('loan-desc').value.trim();if(!accId){showToast('طرف حساب را انتخاب کنید','error');return;}if(!start){showToast('تاریخ شروع را انتخاب کنید','error');return;}if(isNaN(total)||!total){showToast('مبلغ کل را وارد کنید','error');return;}if(isNaN(count)||count<1){showToast('تعداد اقساط را وارد کنید','error');return;}if(isNaN(inst)||!inst){showToast('مبلغ قسط را وارد کنید','error');return;}const installments=[];for(let i=0;i<count;i++){installments.push({dueDate:addJalaliMonths(start,i),amount:i<count-1?inst:Math.round(total-inst*(count-1)),paid:false});}if(!db.loans)db.loans=[];db.loans.push({id:nextLoanId(),accountId:accId,description:desc,totalAmount:total,totalInstallments:count,installmentAmount:inst,startDate:start,installments,status:'active',createdAt:new Date().toISOString()});triggerSave();closeSheet('loan-sheet');renderPage(activePage);showToast('وام با موفقیت ثبت شد ✓');}

// ── Reports ───────────────────────────────────────────────────────────────────
function renderReportsPage(){const sel=$('report-acc-select');if(sel)sel.innerHTML='<option value="">-- انتخاب کنید --</option>'+db.accounts.map(a=>`<option value="${a.id}">${a.id} — ${a.name}</option>`).join('');}
function generateReport(){const accId=$('report-acc-select').value;if(!accId){showToast('طرف حساب را انتخاب کنید','error');return;}const acc=db.accounts.find(a=>a.id===accId);const txns=db.transactions.filter(t=>t.accountId===accId).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));const checks=(db.checks||[]).filter(c=>c.accountId===accId);const loans=(db.loans||[]).filter(l=>l.accountId===accId);const recurs=(db.recurring||[]).filter(r=>r.accountId===accId);const txnLines=txns.map(t=>`${t.date} — ${TYPE_LABEL[t.type]} — ${fmtAmount(t.amount)} تومان${t.description?' — '+t.description:''}`).join('\n');const checkLines=checks.map(c=>`${c.dueDate} — ${c.direction==='issued'?'صادره':'دریافتی'} — ${fmtAmount(c.amount)} تومان — ${c.status==='cleared'?'وصول':c.status==='bounced'?'برگشتی':'در جریان'}`).join('\n');const loanLines=loans.map(l=>`${l.description||'وام'} — ${fmtAmount(l.totalAmount)} تومان — ${fa((l.installments||[]).filter(i=>i.paid).length)}/${fa(l.totalInstallments)} قسط`).join('\n');const recurLines=recurs.map(r=>`${recurTypeLabel(r.type)} — ${fmtAmount(r.amount)} تومان/ماه — ${fa((r.periods||[]).filter(p=>p.paid).length)}/${fa(r.totalPeriods)} دوره`).join('\n');html('report-output',`<div class="report-block">حساب: ${acc.name} (${acc.id})
دریافتی: ${fmtAmount(acc.totalReceived)} تومان
پرداختی: ${fmtAmount(acc.totalPaid)} تومان
مانده: ${fmtAmount(acc.balance)} تومان
${txns.length?'\n═══ تراکنش‌ها ═══\n'+txnLines:''}${checks.length?'\n═══ چک‌ها ═══\n'+checkLines:''}${loans.length?'\n═══ وام‌ها ═══\n'+loanLines:''}${recurs.length?'\n═══ پرداخت‌های دوره‌ای ═══\n'+recurLines:''}</div>`);}
function generateSummary(){const active=db.accounts.filter(a=>a.status==='active'),settled=db.accounts.filter(a=>a.status==='settled');const debt=active.reduce((s,a)=>s+Math.max(0,a.balance||0),0),paid=db.accounts.reduce((s,a)=>s+(a.totalPaid||0),0),recv=db.accounts.reduce((s,a)=>s+(a.totalReceived||0),0);const cm=currentJalaliMonth();const monthDue=getThisMonthDue(cm.year,cm.month);const overdue=getOverdueRecurring().length;html('summary-output',`<div class="report-block">═══ خلاصه دفتر بدهی‌ها ═══
تاریخ: ${jalaliToday()}

دریافت‌ها: ${fmtAmount(recv)} تومان
پرداخت‌ها: ${fmtAmount(paid)} تومان
بدهی فعال: ${fmtAmount(debt)} تومان
این ماه باید بدهم: ${fmtAmount(monthDue)} تومان
معوق پرداخت نشده: ${fa(overdue)} مورد

حساب فعال: ${fa(active.length)} · تسویه: ${fa(settled.length)}
تراکنش: ${fa(db.transactions.length)} · چک در جریان: ${fa((db.checks||[]).filter(c=>c.status==='pending').length)}

═══ طرف حساب‌ها ═══
${db.accounts.map(a=>`${a.id} | ${a.name} | مانده: ${fmtAmount(a.balance)} | ${a.status==='active'?'فعال':'تسویه‌شده'}`).join('\n')||'(هیچ حسابی ثبت نشده)'}</div>`);}

// ── Backup ────────────────────────────────────────────────────────────────────
function checkBackupBanner(){const b=$('backup-banner');if(!b)return;const t=db.txnsSinceBackup||0,l=db.lastBackupDate?(Date.now()-new Date(db.lastBackupDate))/86400000:999;b.style.display=(t>=5||l>=7)?'flex':'none';}
function dismissBackup(){$('backup-banner').style.display='none';}
function exportJSON(){db.lastBackupDate=new Date().toISOString();db.txnsSinceBackup=0;triggerSave();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));a.download='دفتر_بدهی‌ها_بکاپ_'+jalaliToday().replace(/\//g,'-')+'_'+nowTime().replace(':','-')+'.json';a.click();checkBackupBanner();showToast('فایل بکاپ ذخیره شد ✓');}
function importJSON(){$('import-file').click();}
async function handleImport(e){const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=async ev=>{try{const data=JSON.parse(ev.target.result);if(!data.accounts||!data.transactions)throw new Error('فرمت فایل نامعتبر');if(!confirm('⚠️ هشدار\n\nتمام اطلاعات فعلی با فایل وارد‌شده جایگزین می‌شود.\nاین عملیات برگشت‌پذیر نیست.\n\nادامه می‌دهید؟')){e.target.value='';return;}db=data;if(!db.meta)db.meta={lastAccountId:db.accounts.length,lastTxnId:db.transactions.length,lastCheckId:0,lastLoanId:0,lastRecurId:0};if(!db.checks)db.checks=[];if(!db.loans)db.loans=[];if(!db.recurring)db.recurring=[];if(!db.meta.lastRecurId)db.meta.lastRecurId=0;if(db.txnsSinceBackup==null)db.txnsSinceBackup=0;await storageSave(db);renderPage(activePage);renderReportsPage();setSaveChip('saved');showToast('بکاپ با موفقیت بازیابی شد ✓');}catch(err){showToast('خطا: '+err.message,'error');}e.target.value='';};reader.readAsText(file);}

// ── Factory Reset ─────────────────────────────────────────────────────────────
async function factoryReset(){if(!confirm('⚠️ پاک کردن همه اطلاعات\n\nتمام طرف حساب‌ها، تراکنش‌ها، چک‌ها، وام‌ها و پرداخت‌های دوره‌ای پاک می‌شود.\nاین عملیات برگشت‌پذیر نیست.\n\nادامه می‌دهید؟'))return;if(!confirm('آخرین تأیید: مطمئن هستید؟'))return;if(idbDb)await new Promise(r=>{const tx=idbDb.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).delete(IDB_KEY);tx.oncomplete=r;tx.onerror=r;});try{localStorage.removeItem(LS_KEY);}catch(_){}db=newDB();renderPage(activePage);renderReportsPage();setSaveChip('saved');showToast('همه اطلاعات پاک شد');}

// ── Sheet ─────────────────────────────────────────────────────────────────────
function openSheet(id){const el=$(id);el.classList.add('open');el.addEventListener('click',e=>{if(e.target===el)closeSheet(id);},{once:true});}
function closeSheet(id){$(id).classList.remove('open');}

// ── Calendar ──────────────────────────────────────────────────────────────────
let calYear,calMonth,calTargetSheet='cal-sheet',calTargetField='txn';
function setDateDisplay(v){const el=$('txn-date-display');el.dataset.value=v;el.querySelector('.date-val').textContent=v||'انتخاب تاریخ';}
function openCalendar(){openCalendarFor($('txn-date-display').dataset.value,'cal-sheet','txn');}
function openCalendarFor(cur,sheetId,field){calTargetSheet=sheetId;calTargetField=field;if(cur&&/\d/.test(cur)){const p=cur.replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).split('/');calYear=parseInt(p[0]);calMonth=parseInt(p[1]);}else{const[jy,jm]=gregorianToJalali(new Date().getFullYear(),new Date().getMonth()+1,new Date().getDate());calYear=jy;calMonth=jm;}renderCalendar();openSheet(sheetId);}
function renderCalendar(){$('cal-month-label').textContent=fa(calYear)+' — '+JALALI_MONTHS[calMonth-1];const[gy,gm,gd]=jalaliToGregorian(calYear,calMonth,1);const jsDay=new Date(gy,gm-1,gd).getDay();const startOffset=(jsDay+1)%7;const[tjy,tjm,tjd]=gregorianToJalali(new Date().getFullYear(),new Date().getMonth()+1,new Date().getDate());const selMap={txn:$('txn-date-display').dataset.value,issue:$('check-issue-display')?$('check-issue-display').dataset.value:'',due:$('check-due-display')?$('check-due-display').dataset.value:'',loan:$('loan-start-display')?$('loan-start-display').dataset.value:'',recur:$('recur-start-display')?$('recur-start-display').dataset.value:''};const selectedStr=selMap[calTargetField]||'';const jDM=[31,31,31,31,31,31,30,30,30,30,30,calYear%4===3?30:29];let cells='';for(let i=0;i<startOffset;i++)cells+=`<div class="cal-day empty"></div>`;for(let d=1;d<=jDM[calMonth-1];d++){const jalStr=fa(calYear)+'/'+faPad(calMonth)+'/'+faPad(d);cells+=`<div class="cal-day${calYear===tjy&&calMonth===tjm&&d===tjd?' today':''}${jalStr===selectedStr?' selected':''}" onclick="selectDate('${jalStr}')">${fa(d)}</div>`;}html('cal-days',cells);}
function calPrev(){calMonth--;if(calMonth<1){calMonth=12;calYear--;}renderCalendar();}
function calNext(){calMonth++;if(calMonth>12){calMonth=1;calYear++;}renderCalendar();}
function selectDate(val){if(calTargetField==='txn')setDateDisplay(val);else if(calTargetField==='issue')setCheckDate('issue',val);else if(calTargetField==='due')setCheckDate('due',val);else if(calTargetField==='loan')setLoanDate(val);else if(calTargetField==='recur')setRecurDate(val);closeSheet(calTargetSheet);}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg,type=''){const c=$('toast-wrap'),t=document.createElement('div');t.className='toast'+(type?' '+type:'');t.textContent=msg;c.appendChild(t);setTimeout(()=>t.remove(),3500);}

// ── PWA ───────────────────────────────────────────────────────────────────────
function setupInstallPrompt(){window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;const b=$('install-banner');if(b)b.style.display='flex';});window.addEventListener('appinstalled',()=>{const b=$('install-banner');if(b)b.style.display='none';showToast('اپ نصب شد 🎉');});}
function triggerInstall(){if(!deferredInstall)return;deferredInstall.prompt();deferredInstall.userChoice.then(()=>{deferredInstall=null;const b=$('install-banner');if(b)b.style.display='none';});}
function registerSW(){if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(e=>console.warn('[SW]',e));}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init(){
  idbDb=await idbOpen();
  const saved=await storageLoad();
  if(saved){db=saved;if(!db.meta)db.meta={lastAccountId:db.accounts.length,lastTxnId:db.transactions.length,lastCheckId:0,lastLoanId:0,lastRecurId:0};if(!db.checks)db.checks=[];if(!db.loans)db.loans=[];if(!db.recurring)db.recurring=[];if(!db.meta.lastCheckId)db.meta.lastCheckId=0;if(!db.meta.lastLoanId)db.meta.lastLoanId=0;if(!db.meta.lastRecurId)db.meta.lastRecurId=0;if(db.txnsSinceBackup==null)db.txnsSinceBackup=0;}
  const txt=$('saveChipText');
  txt.textContent=db.lastAutoSave?'ذخیره: '+relTime(db.lastAutoSave):(idbDb?'IndexedDB آماده':'localStorage آماده');
  registerSW();setupInstallPrompt();switchPage('dashboard');
}
document.addEventListener('DOMContentLoaded',init);
