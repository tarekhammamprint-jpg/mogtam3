// ============================================================
//  نظام "اربح نقاط" — AdGem Offerwall Integration
//  أضف هذا الملف في index.html:
//  <script src="./adgem-rewards.js" defer></script>
//  أو ادمج محتواه في app.js
// ============================================================

import { ref, get, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const ADGEM_APP_ID = "33111";

// ============================================================
//  إضافة CSS
// ============================================================
(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* ── Modal اربح نقاط ── */
    #rewardsModal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 99990;
      background: rgba(15,23,42,0.6);
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
      max-width: 700px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 80px rgba(0,0,0,0.25);
      animation: rewardsSlideIn 0.3s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes rewardsSlideIn {
      from { transform: scale(0.88) translateY(30px); opacity: 0; }
      to   { transform: scale(1) translateY(0); opacity: 1; }
    }

    #rewardsHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      border-bottom: 1px solid var(--border-color, #e2e8f0);
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #fff;
      flex-shrink: 0;
    }
    #rewardsHeader h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #rewardsCloseBtn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: #fff;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    #rewardsCloseBtn:hover { background: rgba(255,255,255,0.35); }

    /* بطاقة الرصيد */
    #rewardsBalanceBar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      background: var(--bg-secondary, #f8fafc);
      border-bottom: 1px solid var(--border-color, #e2e8f0);
      flex-shrink: 0;
      flex-wrap: wrap;
      gap: 10px;
    }
    .rewards-balance-card {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .rewards-balance-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 20px;
    }
    .rewards-balance-info span {
      display: block;
      font-size: 11px;
      color: var(--text-muted, #64748b);
    }
    .rewards-balance-info strong {
      font-size: 20px;
      font-weight: 900;
      color: var(--text-main, #0f172a);
    }
    .rewards-split-badge {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 20px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 700;
      color: #15803d;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* تبويبات */
    #rewardsTabs {
      display: flex;
      border-bottom: 1px solid var(--border-color, #e2e8f0);
      flex-shrink: 0;
      background: var(--bg-main, #fff);
    }
    .rewards-tab {
      flex: 1;
      padding: 12px;
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      color: var(--text-muted, #64748b);
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
    }
    .rewards-tab.active {
      color: #6366f1;
      border-bottom-color: #6366f1;
    }

    /* محتوى التبويبات */
    #rewardsContent {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }

    /* تبويب الـ Offerwall */
    #rewardsOfferwallTab {
      height: 100%;
      min-height: 480px;
    }
    #adgemIframe {
      width: 100%;
      height: 100%;
      min-height: 480px;
      border: none;
      display: block;
    }
    #rewardsLoadingOverlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      background: var(--bg-main, #fff);
      z-index: 2;
    }
    .rewards-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e2e8f0;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* تبويب السجل */
    #rewardsHistoryTab { padding: 16px; }
    .history-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 14px;
      background: var(--bg-secondary, #f8fafc);
      margin-bottom: 10px;
      border: 1px solid var(--border-color, #e2e8f0);
    }
    .history-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 18px;
      flex-shrink: 0;
    }
    .history-info { flex: 1; min-width: 0; }
    .history-info .offer { font-size: 13px; font-weight: 700; color: var(--text-main,#0f172a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .history-info .date  { font-size: 11px; color: var(--text-muted,#64748b); margin-top: 2px; }
    .history-points {
      font-size: 15px;
      font-weight: 900;
      color: #16a34a;
      white-space: nowrap;
    }
    .history-empty {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted, #64748b);
      font-size: 14px;
    }
    .history-empty i { font-size: 40px; margin-bottom: 12px; display: block; opacity: 0.4; }

    /* تبويب كيف يعمل */
    #rewardsHowTab { padding: 20px; }
    .how-step {
      display: flex;
      gap: 14px;
      margin-bottom: 20px;
      align-items: flex-start;
    }
    .how-step-num {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      font-weight: 900;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .how-step-text h4 { margin: 0 0 4px; font-size: 14px; color: var(--text-main,#0f172a); }
    .how-step-text p  { margin: 0; font-size: 13px; color: var(--text-muted,#64748b); line-height: 1.6; }

    .rewards-info-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 14px;
      padding: 14px 16px;
      margin-top: 10px;
    }
    .rewards-info-box p { margin: 0; font-size: 13px; color: #1d4ed8; line-height: 1.7; }

    /* Toast إشعار النقاط */
    #pointsToast {
      position: fixed;
      bottom: 90px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      padding: 12px 24px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 8px 30px rgba(99,102,241,0.4);
      z-index: 999999;
      opacity: 0;
      transition: all 0.4s cubic-bezier(.34,1.56,.64,1);
      white-space: nowrap;
      pointer-events: none;
    }
    #pointsToast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* نقاط في الـ navbar */
    #navPointsBadge {
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      color: #fff;
      padding: 3px 8px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
      margin-right: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: transform 0.2s;
    }
    #navPointsBadge:hover { transform: scale(1.05); }

    @media (max-width: 600px) {
      #rewardsBox { max-height: 95vh; border-radius: 20px 20px 0 0; }
      #rewardsModal { align-items: flex-end; padding: 0; }
    }
  `;
  document.head.appendChild(style);
})();

// ============================================================
//  إنشاء الـ Modal في DOM
// ============================================================
function createRewardsModal() {
  if (document.getElementById('rewardsModal')) return;

  const modal = document.createElement('div');
  modal.id = 'rewardsModal';
  modal.innerHTML = `
    <div id="rewardsBox">

      <!-- Header -->
      <div id="rewardsHeader">
        <h3><i class="fas fa-gem"></i> اربح نقاط</h3>
        <button id="rewardsCloseBtn" onclick="window.closeRewardsModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- شريط الرصيد -->
      <div id="rewardsBalanceBar">
        <div class="rewards-balance-card">
          <div class="rewards-balance-icon"><i class="fas fa-coins"></i></div>
          <div class="rewards-balance-info">
            <span>رصيدك الحالي</span>
            <strong id="rewardsCurrentPoints">0</strong> <span style="font-size:12px;">نقطة</span>
          </div>
        </div>
        <div class="rewards-split-badge">
          <i class="fas fa-percentage"></i>
          60% لك · 40% للمنصة
        </div>
      </div>

      <!-- تبويبات -->
      <div id="rewardsTabs">
        <div class="rewards-tab active" onclick="window.switchRewardsTab('offerwall')">
          <i class="fas fa-tasks"></i> العروض
        </div>
        <div class="rewards-tab" onclick="window.switchRewardsTab('history')">
          <i class="fas fa-history"></i> السجل
        </div>
        <div class="rewards-tab" onclick="window.switchRewardsTab('how')">
          <i class="fas fa-question-circle"></i> كيف يعمل؟
        </div>
      </div>

      <!-- المحتوى -->
      <div id="rewardsContent" style="position:relative;">

        <!-- تبويب الـ Offerwall -->
        <div id="rewardsOfferwallTab">
          <div id="rewardsLoadingOverlay">
            <div class="rewards-spinner"></div>
            <p style="color:var(--text-muted);font-size:13px;margin:0;">جاري تحميل العروض...</p>
          </div>
          <iframe id="adgemIframe" style="display:none;"
            scrolling="yes"
            allow="clipboard-write"
          ></iframe>
        </div>

        <!-- تبويب السجل -->
        <div id="rewardsHistoryTab" style="display:none;">
          <div id="rewardsHistoryList">
            <div class="history-empty">
              <i class="fas fa-receipt"></i>
              لا توجد معاملات بعد
            </div>
          </div>
        </div>

        <!-- تبويب كيف يعمل -->
        <div id="rewardsHowTab" style="display:none;">
          <div class="how-step">
            <div class="how-step-num">1</div>
            <div class="how-step-text">
              <h4>اختر عرضاً</h4>
              <p>تصفح قائمة العروض المتاحة — استبيانات، ألعاب، تطبيقات — كلها مجانية</p>
            </div>
          </div>
          <div class="how-step">
            <div class="how-step-num">2</div>
            <div class="how-step-text">
              <h4>أكمل المهمة</h4>
              <p>اتبع التعليمات لكل عرض حتى النهاية للحصول على المكافأة</p>
            </div>
          </div>
          <div class="how-step">
            <div class="how-step-num">3</div>
            <div class="how-step-text">
              <h4>اجمع نقاطك</h4>
              <p>تُضاف النقاط تلقائياً لرصيدك خلال لحظات مع إشعار فوري</p>
            </div>
          </div>
          <div class="how-step">
            <div class="how-step-num">4</div>
            <div class="how-step-text">
              <h4>استبدل نقاطك</h4>
              <p>استخدم نقاطك للحصول على مميزات خاصة داخل المنصة</p>
            </div>
          </div>
          <div class="rewards-info-box">
            <p>
              💡 <strong>نظام تقاسم الأرباح:</strong><br>
              من كل مكافأة تجنيها، تحصل على <strong>60%</strong> كنقاط في رصيدك،
              و<strong>40%</strong> تذهب لدعم تشغيل المنصة وتطويرها.<br><br>
              📌 <strong>معدل التحويل:</strong> كل 1$ = 1000 نقطة
            </p>
          </div>
        </div>

      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // إغلاق بالضغط خارج الـ Modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) window.closeRewardsModal();
  });
}

// ============================================================
//  فتح Modal اربح نقاط
// ============================================================
window.openRewardsModal = async () => {
  if (!window.currentUser) return window.showRegisterModal();

  createRewardsModal();
  document.getElementById('rewardsModal').classList.add('show');
  document.body.style.overflow = 'hidden';

  // إغلاق قوائم أخرى
  document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');

  // تحميل الرصيد الحالي
  loadCurrentPoints();

  // تحميل الـ Offerwall
  loadAdgemOfferwall();
};

window.closeRewardsModal = () => {
  const modal = document.getElementById('rewardsModal');
  if (modal) modal.classList.remove('show');
  document.body.style.overflow = 'auto';
};

// ============================================================
//  تحميل الـ Offerwall في iframe
// ============================================================
function loadAdgemOfferwall() {
  const iframe  = document.getElementById('adgemIframe');
  const loading = document.getElementById('rewardsLoadingOverlay');
  if (!iframe) return;

  // AdGem Offerwall URL
  // player_id = username العضو (يُستخدم في الـ Postback)
  const offerwallUrl =
    `https://wall.adgem.com/?app_id=${ADGEM_APP_ID}&player_id=${encodeURIComponent(window.currentUser)}`;

  iframe.src = offerwallUrl;
  iframe.style.display = 'none';

  iframe.onload = () => {
    if (loading) loading.style.display = 'none';
    iframe.style.display = 'block';
  };

  // timeout احتياطي
  setTimeout(() => {
    if (loading) loading.style.display = 'none';
    iframe.style.display = 'block';
  }, 5000);
}

// ============================================================
//  تبديل التبويبات
// ============================================================
window.switchRewardsTab = (tab) => {
  // إخفاء كل التبويبات
  ['offerwall', 'history', 'how'].forEach(t => {
    const el = document.getElementById(`rewards${capitalize(t)}Tab`);
    if (el) el.style.display = 'none';
  });

  // إزالة active من كل الأزرار
  document.querySelectorAll('.rewards-tab').forEach(b => b.classList.remove('active'));

  // إظهار التبويب المطلوب
  const tabMap = { offerwall: 'rewardsOfferwallTab', history: 'rewardsHistoryTab', how: 'rewardsHowTab' };
  const el = document.getElementById(tabMap[tab]);
  if (el) el.style.display = tab === 'offerwall' ? 'block' : 'block';

  // تفعيل الزر
  const tabs = document.querySelectorAll('.rewards-tab');
  const idx  = { offerwall: 0, history: 1, how: 2 };
  if (tabs[idx[tab]]) tabs[idx[tab]].classList.add('active');

  // تحميل السجل عند الضغط عليه
  if (tab === 'history') loadPointsHistory();
};

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ============================================================
//  تحميل الرصيد الحالي من Firebase
// ============================================================
function loadCurrentPoints() {
  if (!window.currentUser) return;
  get(ref(db, `users/${window.currentUser}/points`)).then(snap => {
    const pts = snap.exists() ? snap.val() : 0;
    const el  = document.getElementById('rewardsCurrentPoints');
    if (el) el.innerText = pts.toLocaleString('ar-EG');
    // تحديث شارة النقاط في الـ navbar
    updateNavPointsBadge(pts);
  });
}

// ============================================================
//  تحميل سجل المكافآت
// ============================================================
function loadPointsHistory() {
  const container = document.getElementById('rewardsHistoryList');
  if (!container) return;
  container.innerHTML = '<div class="history-empty"><div class="rewards-spinner" style="margin:auto;"></div></div>';

  get(ref(db, `users/${window.currentUser}/pointsHistory`)).then(snap => {
    if (!snap.exists()) {
      container.innerHTML = `<div class="history-empty"><i class="fas fa-receipt"></i> لا توجد معاملات بعد</div>`;
      return;
    }

    const items = [];
    snap.forEach(child => {
      items.push({ id: child.key, ...child.val() });
    });
    // ترتيب من الأحدث للأقدم
    items.sort((a, b) => b.timestamp - a.timestamp);

    let html = '';
    items.forEach(item => {
      const date = new Date(item.timestamp).toLocaleString('ar-EG', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      html += `
        <div class="history-item">
          <div class="history-icon"><i class="fas fa-gem"></i></div>
          <div class="history-info">
            <div class="offer">${item.offerName || 'عرض AdGem'}</div>
            <div class="date">${date}</div>
          </div>
          <div class="history-points">+${(item.earned || 0).toLocaleString('ar-EG')} نقطة</div>
        </div>
      `;
    });
    container.innerHTML = html;
  });
}

// ============================================================
//  شارة النقاط في الـ Navbar
// ============================================================
function updateNavPointsBadge(points) {
  let badge = document.getElementById('navPointsBadge');
  if (!badge) return;
  badge.innerHTML = `<i class="fas fa-coins"></i> ${points.toLocaleString('ar-EG')}`;
}

// ============================================================
//  الاستماع لتغيرات النقاط في Firebase (real-time)
// ============================================================
window.listenToPoints = () => {
  if (!window.currentUser) return;
  onValue(ref(db, `users/${window.currentUser}/points`), snap => {
    const pts = snap.exists() ? snap.val() : 0;
    updateNavPointsBadge(pts);

    // تحديث العرض داخل الـ Modal لو مفتوح
    const el = document.getElementById('rewardsCurrentPoints');
    if (el) el.innerText = pts.toLocaleString('ar-EG');
  });
};

// ============================================================
//  إشعار نقاط مرئي
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
//  الاستماع لإشعارات النقاط من Firebase
// ============================================================
window.listenToPointsNotifications = () => {
  if (!window.currentUser) return;
  let isFirst = true;
  onValue(ref(db, `users/${window.currentUser}/notifications`), snap => {
    if (isFirst) { isFirst = false; return; } // تجاهل التحميل الأول
    if (!snap.exists()) return;
    snap.forEach(child => {
      const n = child.val();
      if (n.type === 'adgem_reward' && !n.read && n.points) {
        window.showPointsToast(n.points, n.offerName || 'AdGem');
        if (window.showToast) {
          window.showToast(
            '🎉 نقاط جديدة!',
            `ربحت ${n.points.toLocaleString('ar-EG')} نقطة من "${n.offerName}"`,
            ''
          );
        }
      }
    });
  });
};

// ============================================================
//  تصدير دالة التهيئة — استدعها بعد تسجيل الدخول
// ============================================================
window.initRewardsSystem = () => {
  window.listenToPoints();
  window.listenToPointsNotifications();
};
