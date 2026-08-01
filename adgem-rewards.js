// ============================================================
//  نظام "اربح نقاط" — AdGem Offerwall
//  الملف: adgem-rewards.js
//  ضعه في نفس مجلد app.js على GitHub
// ============================================================

import { ref, get, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const ADGEM_APP_ID = "33111";

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
      max-width: 720px;
      max-height: 90vh;
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

    #rewardsContent { flex: 1; overflow-y: auto; min-height: 0; position: relative; }

    #rwOfferwallTab { height: 100%; min-height: 480px; position: relative; }
    #adgemIframe {
      width: 100%; height: 100%; min-height: 480px;
      border: none; display: none;
    }
    #rwLoadingOverlay {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 14px;
      background: var(--bg-main,#fff);
      z-index: 2;
    }
    .rw-spinner {
      width: 46px; height: 46px;
      border: 4px solid #e2e8f0;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: rwSpin 0.8s linear infinite;
    }
    @keyframes rwSpin { to { transform: rotate(360deg); } }

    #rwHistoryTab { padding: 16px; }
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

    #rwHowTab { padding: 20px; }
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

    .rw-fallback {
      padding: 40px 20px; text-align: center;
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
          <iframe id="adgemIframe" scrolling="yes" allow="clipboard-write"></iframe>
        </div>

        <div id="rwHistoryTab" style="display:none;">
          <div id="rewardsHistoryList">
            <div class="rw-empty"><i class="fas fa-receipt"></i>لا توجد معاملات بعد</div>
          </div>
        </div>

        <div id="rwHowTab" style="display:none;">
          <div class="rw-step">
            <div class="rw-step-num">1</div>
            <div class="rw-step-text">
              <h4>اختر عرضاً</h4>
              <p>تصفح قائمة العروض المتاحة — استبيانات، ألعاب، تطبيقات — كلها مجانية</p>
            </div>
          </div>
          <div class="rw-step">
            <div class="rw-step-num">2</div>
            <div class="rw-step-text">
              <h4>أكمل المهمة</h4>
              <p>اتبع تعليمات كل عرض حتى النهاية للحصول على المكافأة</p>
            </div>
          </div>
          <div class="rw-step">
            <div class="rw-step-num">3</div>
            <div class="rw-step-text">
              <h4>اجمع نقاطك</h4>
              <p>تُضاف النقاط تلقائياً لرصيدك خلال لحظات مع إشعار فوري</p>
            </div>
          </div>
          <div class="rw-step">
            <div class="rw-step-num">4</div>
            <div class="rw-step-text">
              <h4>استبدل نقاطك</h4>
              <p>استخدم نقاطك للحصول على مميزات خاصة داخل المنصة</p>
            </div>
          </div>
          <div class="rw-info-box">
            <p>💡 <strong>كيف تُحسب نقاطك؟</strong><br>
            تُضاف النقاط فور إكمال أي عرض مباشرةً لرصيدك.<br>
            📌 قيمة النقاط تختلف حسب كل عرض</p>
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
  loadAdgemOfferwall();
};

window.closeRewardsModal = () => {
  const m = document.getElementById('rewardsModal');
  if (m) m.classList.remove('show');
  document.body.style.overflow = 'auto';
};

// ============================================================
//  تحميل AdGem Offerwall
// ============================================================
function loadAdgemOfferwall() {
  const iframe  = document.getElementById('adgemIframe');
  const loading = document.getElementById('rwLoadingOverlay');
  if (!iframe) return;

  const uid = window.currentUser || '';
  if (!uid) return;

  const offerwallUrl =
    `https://api.adgem.com/v1/wall?appid=${ADGEM_APP_ID}&playerid=${encodeURIComponent(uid)}`;

  iframe.src = offerwallUrl;
  iframe.style.display = 'none';

  iframe.onload = () => {
    if (loading) loading.style.display = 'none';
    iframe.style.display = 'block';
  };

  // fallback بعد 7 ثوان
  setTimeout(() => {
    if (iframe.style.display === 'none') {
      if (loading) loading.style.display = 'none';
      showOfferwallFallback(offerwallUrl);
    }
  }, 7000);
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
    <h3 style="color:var(--text-main);margin:0 0 8px;font-size:17px;">عروض AdGem</h3>
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
  if (el) el.style.display = 'block';
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
            <div class="rw-offer">${item.offerName || 'عرض AdGem'}</div>
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
//  Listener للإشعارات
// ============================================================
window.listenToPointsNotifications = () => {
  if (!window.currentUser) return;
  let isFirst = true;
  onValue(ref(db, `users/${window.currentUser}/notifications`), snap => {
    if (isFirst) { isFirst = false; return; }
    if (!snap.exists()) return;
    snap.forEach(child => {
      const n = child.val();
      if (n.type === 'adgem_reward' && !n.read && n.points) {
        window.showPointsToast(n.points, n.offerName || 'AdGem');
        if (window.showToast) window.showToast('🎉 نقاط جديدة!',
          `ربحت ${n.points.toLocaleString('ar-EG')} نقطة من "${n.offerName}"`, '');
      }
    });
  });
};

// ============================================================
//  تهيئة النظام — استدعها بعد تسجيل الدخول
// ============================================================
window.initRewardsSystem = () => {
  window.listenToPoints();
  window.listenToPointsNotifications();
};
