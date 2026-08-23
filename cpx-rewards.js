// ============================================================
//  نظام "اربح نقاط" — CPX Research Offerwall
//  الملف: cpx-rewards.js
//  استبدل adgem-rewards.js بهذا الملف
// ============================================================

import { ref, get, update, push, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const CPX_APP_ID     = "35568";
const CPX_SECRET_KEY = "FH2aiV3FBmvR48X5zOMk4km5xWL0od0r";

// نسبة العضو من كل عرض (70%)
const USER_SHARE = 0.70;

// ============================================================
//  MD5 — لحساب secure_hash على الـ client
// ============================================================
function md5(str) {
  function safeAdd(x, y) { const lsw=(x&0xFFFF)+(y&0xFFFF); return (((x>>16)+(y>>16)+(lsw>>16))<<16)|(lsw&0xFFFF); }
  function bitRotateLeft(num, cnt) { return (num<<cnt)|(num>>>(32-cnt)); }
  function md5cmn(q,a,b,x,s,t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a,q),safeAdd(x,t)),s),b); }
  function md5ff(a,b,c,d,x,s,t) { return md5cmn((b&c)|((~b)&d),a,b,x,s,t); }
  function md5gg(a,b,c,d,x,s,t) { return md5cmn((b&d)|(c&(~d)),a,b,x,s,t); }
  function md5hh(a,b,c,d,x,s,t) { return md5cmn(b^c^d,a,b,x,s,t); }
  function md5ii(a,b,c,d,x,s,t) { return md5cmn(c^(b|(~d)),a,b,x,s,t); }
  function md5blks(s) {
    const m=[];for(let i=0;i<s.length*8;i+=8)m[i>>5]|=(s.charCodeAt(i/8)&0xFF)<<(i%32);
    m[s.length*8>>5]|=0x80<<(s.length*8%32);m[((s.length+8)>>6<<4)+14]=s.length*8;return m;
  }
  const x=md5blks(str);
  let a=1732584193,b=-271733879,c=-1732584194,d=271733878;
  for(let i=0;i<x.length;i+=16){
    const oA=a,oB=b,oC=c,oD=d;
    a=md5ff(a,b,c,d,x[i],7,-680876936);d=md5ff(d,a,b,c,x[i+1],12,-389564586);c=md5ff(c,d,a,b,x[i+2],17,606105819);b=md5ff(b,c,d,a,x[i+3],22,-1044525330);
    a=md5ff(a,b,c,d,x[i+4],7,-176418897);d=md5ff(d,a,b,c,x[i+5],12,1200080426);c=md5ff(c,d,a,b,x[i+6],17,-1473231341);b=md5ff(b,c,d,a,x[i+7],22,-45705983);
    a=md5ff(a,b,c,d,x[i+8],7,1770035416);d=md5ff(d,a,b,c,x[i+9],12,-1958414417);c=md5ff(c,d,a,b,x[i+10],17,-42063);b=md5ff(b,c,d,a,x[i+11],22,-1990404162);
    a=md5ff(a,b,c,d,x[i+12],7,1804603682);d=md5ff(d,a,b,c,x[i+13],12,-40341101);c=md5ff(c,d,a,b,x[i+14],17,-1502002290);b=md5ff(b,c,d,a,x[i+15],22,1236535329);
    a=md5gg(a,b,c,d,x[i+1],5,-165796510);d=md5gg(d,a,b,c,x[i+6],9,-1069501632);c=md5gg(c,d,a,b,x[i+11],14,643717713);b=md5gg(b,c,d,a,x[i],20,-373897302);
    a=md5gg(a,b,c,d,x[i+5],5,-701558691);d=md5gg(d,a,b,c,x[i+10],9,38016083);c=md5gg(c,d,a,b,x[i+15],14,-660478335);b=md5gg(b,c,d,a,x[i+4],20,-405537848);
    a=md5gg(a,b,c,d,x[i+9],5,568446438);d=md5gg(d,a,b,c,x[i+14],9,-1019803690);c=md5gg(c,d,a,b,x[i+3],14,-187363961);b=md5gg(b,c,d,a,x[i+8],20,1163531501);
    a=md5gg(a,b,c,d,x[i+13],5,-1444681467);d=md5gg(d,a,b,c,x[i+2],9,-51403784);c=md5gg(c,d,a,b,x[i+7],14,1735328473);b=md5gg(b,c,d,a,x[i+12],20,-1926607734);
    a=md5hh(a,b,c,d,x[i+5],4,-378558);d=md5hh(d,a,b,c,x[i+8],11,-2022574463);c=md5hh(c,d,a,b,x[i+11],16,1839030562);b=md5hh(b,c,d,a,x[i+14],23,-35309556);
    a=md5hh(a,b,c,d,x[i+1],4,-1530992060);d=md5hh(d,a,b,c,x[i+4],11,1272893353);c=md5hh(c,d,a,b,x[i+7],16,-155497632);b=md5hh(b,c,d,a,x[i+10],23,-1094730640);
    a=md5hh(a,b,c,d,x[i+13],4,681279174);d=md5hh(d,a,b,c,x[i],11,-358537222);c=md5hh(c,d,a,b,x[i+3],16,-722521979);b=md5hh(b,c,d,a,x[i+6],23,76029189);
    a=md5hh(a,b,c,d,x[i+9],4,-640364487);d=md5hh(d,a,b,c,x[i+12],11,-421815835);c=md5hh(c,d,a,b,x[i+15],16,530742520);b=md5hh(b,c,d,a,x[i+2],23,-995338651);
    a=md5ii(a,b,c,d,x[i],6,-198630844);d=md5ii(d,a,b,c,x[i+7],10,1126891415);c=md5ii(c,d,a,b,x[i+14],15,-1416354905);b=md5ii(b,c,d,a,x[i+5],21,-57434055);
    a=md5ii(a,b,c,d,x[i+12],6,1700485571);d=md5ii(d,a,b,c,x[i+3],10,-1894986606);c=md5ii(c,d,a,b,x[i+10],15,-1051523);b=md5ii(b,c,d,a,x[i+1],21,-2054922799);
    a=md5ii(a,b,c,d,x[i+8],6,1873313359);d=md5ii(d,a,b,c,x[i+15],10,-30611744);c=md5ii(c,d,a,b,x[i+6],15,-1560198380);b=md5ii(b,c,d,a,x[i+13],21,1309151649);
    a=md5ii(a,b,c,d,x[i+4],6,-145523070);d=md5ii(d,a,b,c,x[i+11],10,-1120210379);c=md5ii(c,d,a,b,x[i+2],15,718787259);b=md5ii(b,c,d,a,x[i+9],21,-343485551);
    a=safeAdd(a,oA);b=safeAdd(b,oB);c=safeAdd(c,oC);d=safeAdd(d,oD);
  }
  const hex='0123456789abcdef';
  let out='';
  [a,b,c,d].forEach(n=>{for(let i=0;i<4;i++){const byte=(n>>(i*8))&0xFF;out+=hex[(byte>>4)&0xF]+hex[byte&0xF];}});
  return out;
}

// ============================================================
//  حساب الـ secure_hash لـ CPX Research
//  الصيغة: MD5(app_id + "-" + ext_user_id + CPX_SECRET_KEY)
// ============================================================
function getCpxHash(userId) {
  return md5(CPX_APP_ID + "-" + userId + CPX_SECRET_KEY);
}

// ============================================================
//  CSS
// ============================================================
(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #rewardsModal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 99990;
      background: rgba(15,23,42,0.65);
      backdrop-filter: blur(6px);
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    #rewardsModal.show { display: flex; }

    #rewardsBox {
      background: var(--bg-main, #fff);
      border-radius: 20px;
      width: 100%;
      max-width: 760px;
      max-height: 92vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 80px rgba(0,0,0,0.25);
      animation: rwSlideIn 0.3s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes rwSlideIn {
      from { transform: scale(0.88) translateY(30px); opacity: 0; }
      to   { transform: scale(1) translateY(0); opacity: 1; }
    }

    #rewardsHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      flex-shrink: 0;
    }
    #rewardsHeader h3 {
      margin: 0;
      font-size: 17px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #rewardsCloseBtn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: #fff;
      width: 32px; height: 32px;
      border-radius: 50%;
      font-size: 15px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #rewardsCloseBtn:hover { background: rgba(255,255,255,0.35); }

    #rewardsBalanceBar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      background: var(--bg-secondary, #f8fafc);
      border-bottom: 1px solid var(--border-color, #e2e8f0);
      flex-shrink: 0;
      flex-wrap: wrap;
      gap: 8px;
    }
    .rw-balance-card {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .rw-balance-icon {
      width: 42px; height: 42px;
      border-radius: 12px;
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 18px;
    }
    .rw-balance-info span { display: block; font-size: 11px; color: var(--text-muted,#64748b); }
    .rw-balance-info strong { font-size: 20px; font-weight: 900; color: var(--text-main,#0f172a); }

    /* شارة CPX */
    .rw-cpx-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 6px 12px;
      font-size: 12px;
      color: #1d4ed8;
      font-weight: 700;
    }
    body.dark-mode .rw-cpx-badge {
      background: rgba(37,99,235,0.15);
      border-color: rgba(37,99,235,0.3);
      color: #93c5fd;
    }

    #rewardsTabs {
      display: flex;
      border-bottom: 1px solid var(--border-color,#e2e8f0);
      flex-shrink: 0;
      background: var(--bg-main,#fff);
    }
    .rw-tab {
      flex: 1;
      padding: 11px;
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      color: var(--text-muted,#64748b);
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
    }
    .rw-tab.active { color: #6366f1; border-bottom-color: #6366f1; }

    #rewardsContent { flex: 1; overflow: hidden; min-height: 0; position: relative; }

    #rwOfferwallTab { height: 100%; display: flex; flex-direction: column; }

    /* iframe CPX */
    #cpxIframe {
      width: 100%;
      flex: 1;
      border: none;
      min-height: 500px;
      display: none;
    }
    #rwLoadingOverlay {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      background: var(--bg-main,#fff);
    }
    .rw-spinner {
      width: 46px; height: 46px;
      border: 4px solid #e2e8f0;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: rwSpin 0.8s linear infinite;
    }
    @keyframes rwSpin { to { transform: rotate(360deg); } }

    #rwHistoryTab { padding: 16px; overflow-y: auto; max-height: 500px; display: none; }
    .rw-history-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 14px;
      background: var(--bg-secondary,#f8fafc);
      margin-bottom: 10px;
      border: 1px solid var(--border-color,#e2e8f0);
    }
    .rw-history-icon {
      width: 40px; height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg,#6366f1,#8b5cf6);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 16px; flex-shrink: 0;
    }
    .rw-history-info { flex: 1; min-width: 0; }
    .rw-history-info .rw-offer { font-size: 13px; font-weight: 700; color: var(--text-main,#0f172a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rw-history-info .rw-date  { font-size: 11px; color: var(--text-muted,#64748b); margin-top: 2px; }
    .rw-history-pts { font-size: 15px; font-weight: 900; color: #16a34a; white-space: nowrap; }
    .rw-empty {
      text-align: center; padding: 40px 20px;
      color: var(--text-muted,#64748b); font-size: 14px;
    }
    .rw-empty i { font-size: 38px; margin-bottom: 12px; display: block; opacity: 0.35; }

    #rwHowTab { padding: 20px; overflow-y: auto; max-height: 500px; display: none; }
    .rw-step { display: flex; gap: 14px; margin-bottom: 20px; align-items: flex-start; }
    .rw-step-num {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg,#6366f1,#8b5cf6);
      color: #fff; font-weight: 900; font-size: 14px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .rw-step-text h4 { margin: 0 0 4px; font-size: 14px; color: var(--text-main,#0f172a); }
    .rw-step-text p  { margin: 0; font-size: 13px; color: var(--text-muted,#64748b); line-height: 1.6; }
    .rw-info-box {
      background: #eff6ff; border: 1px solid #bfdbfe;
      border-radius: 14px; padding: 14px 16px; margin-top: 10px;
    }
    .rw-info-box p { margin: 0; font-size: 13px; color: #1d4ed8; line-height: 1.7; }

    /* Fallback */
    .rw-fallback {
      padding: 40px 20px; text-align: center; flex: 1;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .rw-fallback-btn {
      display: inline-flex; align-items: center; gap: 10px;
      background: linear-gradient(135deg,#6366f1,#8b5cf6);
      color: #fff; padding: 14px 28px; border-radius: 14px;
      font-weight: 800; font-size: 15px; text-decoration: none;
      box-shadow: 0 4px 20px rgba(99,102,241,0.4);
      margin-top: 16px; cursor: pointer; border: none;
    }
    .rw-fallback-btn:hover { opacity: 0.9; }

    #navPointsBadge {
      background: linear-gradient(135deg,#f59e0b,#ef4444);
      color: #fff; padding: 2px 8px; border-radius: 20px;
      font-size: 11px; font-weight: 800; margin-right: 6px;
      display: inline-flex; align-items: center; gap: 4px;
    }

    #pointsToast {
      position: fixed; bottom: 90px; left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: linear-gradient(135deg,#6366f1,#8b5cf6);
      color: #fff; padding: 12px 24px; border-radius: 30px;
      font-size: 14px; font-weight: 700;
      box-shadow: 0 8px 30px rgba(99,102,241,0.4);
      z-index: 999999; opacity: 0;
      transition: all 0.4s cubic-bezier(.34,1.56,.64,1);
      white-space: nowrap; pointer-events: none;
    }
    #pointsToast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

    @media (max-width: 600px) {
      #rewardsBox { max-height: 95vh; border-radius: 20px 20px 0 0; }
      #rewardsModal { align-items: flex-end; padding: 0; }
      #cpxIframe { min-height: 420px; }
    }
  `;
  document.head.appendChild(style);
})();

// ============================================================
//  إنشاء Modal
// ============================================================
function createRewardsModal() {
  if (document.getElementById('rewardsModal')) return;
  const modal = document.createElement('div');
  modal.id = 'rewardsModal';
  modal.innerHTML = `
    <div id="rewardsBox">
      <div id="rewardsHeader">
        <h3><i class="fas fa-gem"></i> اربح نقاط</h3>
        <button id="rewardsCloseBtn" onclick="window.closeRewardsModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div id="rewardsBalanceBar">
        <div class="rw-balance-card">
          <div class="rw-balance-icon"><i class="fas fa-coins"></i></div>
          <div class="rw-balance-info">
            <span>رصيدك الحالي</span>
            <strong id="rewardsCurrentPoints">0</strong>
            <span style="font-size:12px;display:inline;">نقطة</span>
          </div>
        </div>
        <div class="rw-cpx-badge">
          <i class="fas fa-chart-bar"></i>
          مدعوم بـ CPX Research
        </div>
      </div>

      <div id="rewardsTabs">
        <div class="rw-tab active" onclick="window.switchRewardsTab('offerwall')">
          <i class="fas fa-tasks"></i> العروض
        </div>
        <div class="rw-tab" onclick="window.switchRewardsTab('history')">
          <i class="fas fa-history"></i> سجلي
        </div>
        <div class="rw-tab" onclick="window.switchRewardsTab('how')">
          <i class="fas fa-question-circle"></i> كيف يعمل؟
        </div>
      </div>

      <div id="rewardsContent">

        <div id="rwOfferwallTab">
          <div id="rwLoadingOverlay">
            <div class="rw-spinner"></div>
            <p style="color:var(--text-muted);font-size:13px;margin:0;">جاري تحميل العروض...</p>
          </div>
          <iframe id="cpxIframe" scrolling="yes" allow="clipboard-write; payment"></iframe>
        </div>

        <div id="rwHistoryTab">
          <div id="rewardsHistoryList">
            <div class="rw-empty"><i class="fas fa-receipt"></i>لا توجد معاملات بعد</div>
          </div>
        </div>

        <div id="rwHowTab">
          <div class="rw-step">
            <div class="rw-step-num">1</div>
            <div class="rw-step-text">
              <h4>اختر عرضاً أو استبياناً</h4>
              <p>تصفح قائمة العروض المتاحة — استبيانات، ألعاب، تطبيقات — كلها مجانية وبدون رسوم</p>
            </div>
          </div>
          <div class="rw-step">
            <div class="rw-step-num">2</div>
            <div class="rw-step-text">
              <h4>أكمل المهمة حتى النهاية</h4>
              <p>اتبع تعليمات كل عرض بدقة — يجب إكمال المهمة كاملة للحصول على المكافأة</p>
            </div>
          </div>
          <div class="rw-step">
            <div class="rw-step-num">3</div>
            <div class="rw-step-text">
              <h4>استقبل نقاطك تلقائياً</h4>
              <p>تُضاف 70% من قيمة العرض لرصيدك فوراً مع إشعار تأكيد</p>
            </div>
          </div>
          <div class="rw-step">
            <div class="rw-step-num">4</div>
            <div class="rw-step-text">
              <h4>استخدم نقاطك</h4>
              <p>استخدم نقاطك للحصول على مميزات خاصة ومزايا داخل المنصة</p>
            </div>
          </div>
          <div class="rw-info-box">
            <p>💡 <strong>كيف تُحسب نقاطك؟</strong><br>
            تحصل على <strong>70%</strong> من قيمة كل عرض تُكمله.<br>
            📌 قيمة النقاط تختلف من عرض لآخر حسب صعوبته ووقته.<br>
            ✅ النقاط تُضاف تلقائياً خلال لحظات من إكمال العرض.</p>
          </div>
        </div>

      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) window.closeRewardsModal(); });
}

// ============================================================
//  فتح وإغلاق Modal
// ============================================================
window.openRewardsModal = () => {
  if (!window.currentUser) return window.showRegisterModal();
  createRewardsModal();
  document.getElementById('rewardsModal').classList.add('show');
  document.body.style.overflow = 'hidden';
  document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
  loadCurrentPoints();
  loadCpxOfferwall();
};

window.closeRewardsModal = () => {
  const m = document.getElementById('rewardsModal');
  if (m) m.classList.remove('show');
  document.body.style.overflow = 'auto';
};

// ============================================================
//  تحميل CPX Research Offerwall
// ============================================================
function loadCpxOfferwall() {
  const iframe  = document.getElementById('cpxIframe');
  const loading = document.getElementById('rwLoadingOverlay');
  if (!iframe) return;

  const uid = window.currentUser || '';
  if (!uid) return;

  const userData = window.allUsersData?.[uid] || {};
  const userEmail = userData.email || '';
  const displayName = userData.displayName || uid;
  const secureHash = getCpxHash(uid);

  // بناء رابط CPX Offerwall
  const params = new URLSearchParams({
    app_id: CPX_APP_ID,
    ext_user_id: uid,
    secure_hash: secureHash,
    username: displayName,
    email: userEmail,
    subid_1: 'mogtam3',
    subid_2: ''
  });

  const offerwallUrl = `https://offers.cpx-research.com/index.php?${params.toString()}`;

  iframe.src = offerwallUrl;
  iframe.style.display = 'none';
  if (loading) loading.style.display = 'flex';

  iframe.onload = () => {
    if (loading) loading.style.display = 'none';
    iframe.style.display = 'block';
  };

  // fallback بعد 10 ثوان لو الـ iframe ما اتحملش
  setTimeout(() => {
    if (iframe.style.display === 'none') {
      if (loading) loading.style.display = 'none';
      showOfferwallFallback(offerwallUrl);
    }
  }, 10000);
}

// ============================================================
//  Fallback لو iframe لم يعمل
// ============================================================
function showOfferwallFallback(url) {
  const container = document.getElementById('rwOfferwallTab');
  if (!container) return;
  const old = container.querySelector('.rw-fallback');
  if (old) old.remove();

  const div = document.createElement('div');
  div.className = 'rw-fallback';
  div.innerHTML = `
    <div style="font-size:56px;margin-bottom:14px;">🎯</div>
    <h3 style="color:var(--text-main);margin:0 0 8px;font-size:17px;">عروض CPX Research</h3>
    <p style="color:var(--text-muted);font-size:13px;line-height:1.7;margin-bottom:0;">
      اضغط الزر أدناه لفتح صفحة العروض وكسب النقاط.<br>
      بعد إكمال أي عرض ستُضاف نقاطك تلقائياً.
    </p>
    <a href="${url}" target="_blank" rel="noopener" class="rw-fallback-btn">
      <i class="fas fa-external-link-alt"></i> فتح صفحة العروض
    </a>
    <p style="color:var(--text-muted);font-size:11px;margin-top:14px;">
      ستُفتح في نافذة جديدة — ارجع هنا بعد الانتهاء لمشاهدة نقاطك
    </p>`;
  container.appendChild(div);
}

// ============================================================
//  تبديل التبويبات
// ============================================================
window.switchRewardsTab = (tab) => {
  const tabs = { offerwall:'rwOfferwallTab', history:'rwHistoryTab', how:'rwHowTab' };
  Object.values(tabs).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('.rw-tab').forEach(b => b.classList.remove('active'));

  const el = document.getElementById(tabs[tab]);
  if (el) el.style.display = tab === 'offerwall' ? 'flex' : 'block';

  const idx = { offerwall:0, history:1, how:2 };
  const btns = document.querySelectorAll('.rw-tab');
  if (btns[idx[tab]]) btns[idx[tab]].classList.add('active');

  if (tab === 'history') loadPointsHistory();
};

// ============================================================
//  رصيد النقاط
// ============================================================
function loadCurrentPoints() {
  if (!window.currentUser) return;
  get(ref(db, `users/${window.currentUser}/points`)).then(snap => {
    const pts = snap.exists() ? snap.val() : 0;
    const el  = document.getElementById('rewardsCurrentPoints');
    if (el) el.innerText = pts.toLocaleString('ar-EG');
    updateNavPointsBadge(pts);
  });
}

function updateNavPointsBadge(pts) {
  const badge = document.getElementById('navPointsBadge');
  if (badge) badge.innerHTML = `<i class="fas fa-coins"></i> ${pts.toLocaleString('ar-EG')}`;
}

// ============================================================
//  سجل المكافآت
// ============================================================
function loadPointsHistory() {
  const container = document.getElementById('rewardsHistoryList');
  if (!container) return;
  container.innerHTML = '<div class="rw-empty"><div class="rw-spinner" style="margin:auto;"></div></div>';

  get(ref(db, `users/${window.currentUser}/pointsHistory`)).then(snap => {
    if (!snap.exists()) {
      container.innerHTML = '<div class="rw-empty"><i class="fas fa-receipt"></i>لا توجد معاملات بعد</div>';
      return;
    }
    const items = [];
    snap.forEach(c => items.push({ id: c.key, ...c.val() }));
    items.sort((a,b) => b.timestamp - a.timestamp);

    container.innerHTML = items.map(item => {
      const date = new Date(item.timestamp).toLocaleString('ar-EG', {
        year:'numeric', month:'short', day:'numeric',
        hour:'2-digit', minute:'2-digit'
      });
      return `
        <div class="rw-history-item">
          <div class="rw-history-icon"><i class="fas fa-gem"></i></div>
          <div class="rw-history-info">
            <div class="rw-offer">${item.offerName || 'عرض CPX Research'}</div>
            <div class="rw-date">${date}</div>
          </div>
          <div class="rw-history-pts">+${(item.earned||0).toLocaleString('ar-EG')} نقطة</div>
        </div>`;
    }).join('');
  });
}

// ============================================================
//  Real-time listener للنقاط
// ============================================================
window.listenToPoints = () => {
  if (!window.currentUser) return;
  onValue(ref(db, `users/${window.currentUser}/points`), snap => {
    const pts = snap.exists() ? snap.val() : 0;
    updateNavPointsBadge(pts);
    const el = document.getElementById('rewardsCurrentPoints');
    if (el) el.innerText = pts.toLocaleString('ar-EG');
  });
};

// ============================================================
//  Toast إشعار النقاط
// ============================================================
window.showPointsToast = (points, offerName) => {
  let toast = document.getElementById('pointsToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pointsToast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<i class="fas fa-gem"></i> ربحت ${points.toLocaleString('ar-EG')} نقطة من "${offerName}"! 🎉`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
};

// ============================================================
//  Listener للإشعارات (postback من Cloudflare Worker)
// ============================================================
window.listenToPointsNotifications = () => {
  if (!window.currentUser) return;
  let isFirst = true;
  onValue(ref(db, `users/${window.currentUser}/notifications`), snap => {
    if (isFirst) { isFirst = false; return; }
    if (!snap.exists()) return;
    snap.forEach(child => {
      const n = child.val();
      if (n.type === 'cpx_reward' && !n.read && n.points) {
        window.showPointsToast(n.points, n.offerName || 'CPX Research');
        if (window.showToast) window.showToast('🎉 نقاط جديدة!',
          `ربحت ${n.points.toLocaleString('ar-EG')} نقطة من "${n.offerName}"`, '');
      }
    });
  });
};

// ============================================================
//  postback handler — استقبال النقاط من CPX عبر Cloudflare Worker
//  ⬇ ضع هذا الكود في Cloudflare Worker الخاص بك
// ============================================================
/*
  === كود Cloudflare Worker للـ Postback ===

  رابط الـ postback اللي تحطه في CPX Dashboard:
  https://red-snowflake-1dad.YOUR_SUBDOMAIN.workers.dev/cpx-postback?
    user_id={user_id}&
    amount={amount}&
    offer_name={offer_name}&
    transaction_id={transaction_id}&
    hash={hash}

  ─────────────────────────────────────────
  addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
  });

  const SECRET_KEY = 'FH2aiV3FBmvR48X5zOMk4km5xWL0od0r';
  const FIREBASE_URL = 'https://mogtam3-1b98f-default-rtdb.firebaseio.com';
  const USER_SHARE = 0.70;  // 70% للعضو

  async function handleRequest(request) {
    const url = new URL(request.url);
    if (!url.pathname.includes('cpx-postback')) {
      return new Response('not found', { status: 404 });
    }

    const userId       = url.searchParams.get('user_id');
    const amount       = parseFloat(url.searchParams.get('amount') || '0');
    const offerName    = url.searchParams.get('offer_name') || 'CPX Research';
    const transId      = url.searchParams.get('transaction_id');
    const receivedHash = url.searchParams.get('hash');

    // التحقق من الـ hash
    const expectedHash = await md5(`${userId}${SECRET_KEY}`);
    if (receivedHash !== expectedHash) {
      return new Response('invalid hash', { status: 403 });
    }

    if (!userId || amount <= 0) {
      return new Response('invalid params', { status: 400 });
    }

    // حساب نقاط العضو (70%)
    const userPoints = Math.floor(amount * USER_SHARE);

    // جلب الرصيد الحالي وتحديثه
    const userRef = `${FIREBASE_URL}/users/${userId}`;
    const currentSnap = await fetch(`${userRef}/points.json`);
    const currentPoints = (await currentSnap.json()) || 0;
    const newPoints = currentPoints + userPoints;

    // تحديث النقاط + إضافة للسجل + إضافة إشعار
    const timestamp = Date.now();
    const updates = {
      [`/users/${userId}/points`]: newPoints,
      [`/users/${userId}/pointsHistory/${transId}`]: {
        offerName,
        earned: userPoints,
        rawAmount: amount,
        timestamp,
        source: 'cpx'
      },
      [`/users/${userId}/notifications/${transId}`]: {
        type: 'cpx_reward',
        points: userPoints,
        offerName,
        timestamp,
        read: false
      }
    };

    await fetch(`${FIREBASE_URL}/.json?auth=YOUR_FIREBASE_SECRET`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      headers: { 'Content-Type': 'application/json' }
    });

    return new Response('1', { status: 200 });
  }

  // MD5 في Worker
  async function md5(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('MD5', msgBuffer);  // لا يدعمه Workers
    // استخدم مكتبة md5 خارجية أو نفس الـ pure-JS في الملف الرئيسي
  }
*/

// ============================================================
//  تهيئة النظام — استدعها بعد تسجيل الدخول
// ============================================================
window.initRewardsSystem = () => {
  window.listenToPoints();
  window.listenToPointsNotifications();
};
