// ═══════════════════════════════════════════════════════
//  نظام Hover Card — مجتمعنا
//  يظهر عند مرور الماوس على اسم أي مستخدم
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── CSS ─────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #hc-card {
      position: fixed;
      z-index: 2147483100;
      width: 280px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      box-shadow: 0 12px 40px rgba(15,23,42,.14), 0 4px 12px rgba(15,23,42,.08);
      overflow: hidden;
      direction: rtl;
      font-family: 'Cairo', sans-serif;
      pointer-events: auto;
      animation: hcIn .18s cubic-bezier(.4,0,.2,1);
    }
    @keyframes hcIn {
      from { opacity:0; transform: translateY(6px) scale(.97); }
      to   { opacity:1; transform: none; }
    }
    body.dark-mode #hc-card {
      background: #1a1d27;
      border-color: #2a2d3e;
    }

    /* الغلاف */
    #hc-cover {
      height: 72px;
      background: linear-gradient(135deg, #1e3a5f, #6366f1 70%, #0ea5e9);
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }
    #hc-cover img {
      width: 100%; height: 100%; object-fit: cover;
    }
    #hc-avatar {
      width: 60px; height: 60px;
      border-radius: 50%;
      border: 3px solid #fff;
      object-fit: cover;
      position: absolute;
      bottom: -24px;
      right: 14px;
      box-shadow: 0 4px 12px rgba(15,23,42,.15);
    }
    body.dark-mode #hc-avatar { border-color: #1a1d27; }

    /* جسم البطاقة */
    #hc-body {
      padding: 28px 14px 14px;
    }
    #hc-name {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 1px;
      line-height: 1.3;
    }
    body.dark-mode #hc-name { color: #e2e8f0; }

    #hc-handle {
      font-size: 12px;
      color: #6366f1;
      direction: ltr;
      font-weight: 600;
      margin-bottom: 8px;
      display: block;
    }

    /* صف المعلومات */
    #hc-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
    }
    .hc-meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .hc-meta-item i {
      color: #6366f1;
      font-size: 11px;
    }

    /* الأصدقاء المشتركون */
    #hc-mutual {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #eef2ff;
      border-radius: 10px;
      padding: 7px 10px;
      margin-bottom: 10px;
      font-size: 12px;
      color: #4338ca;
      font-weight: 700;
    }
    body.dark-mode #hc-mutual {
      background: rgba(99,102,241,.15);
      color: #a5b4fc;
    }
    #hc-mutual i { font-size: 13px; }
    #hc-mutual-pics {
      display: flex;
    }
    #hc-mutual-pics img {
      width: 22px; height: 22px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #eef2ff;
      margin-left: -6px;
    }
    #hc-mutual-pics img:first-child { margin-left: 0; }

    /* الأزرار */
    #hc-actions {
      display: flex;
      gap: 7px;
    }
    .hc-btn {
      flex: 1;
      padding: 9px 6px;
      border: none;
      border-radius: 12px;
      font-family: 'Cairo', sans-serif;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: filter .15s, box-shadow .15s;
      transform: none !important;
    }
    .hc-btn:hover { filter: brightness(.92); }
    .hc-btn-add {
      background: linear-gradient(135deg, #6366f1, #2a5298);
      color: #fff;
      box-shadow: 0 2px 8px rgba(99,102,241,.3);
    }
    .hc-btn-unfriend {
      background: #fee2e2;
      color: #dc2626;
    }
    body.dark-mode .hc-btn-unfriend {
      background: rgba(239,68,68,.15);
      color: #f87171;
    }
    .hc-btn-cancel {
      background: #f1f5f9;
      color: #64748b;
    }
    body.dark-mode .hc-btn-cancel {
      background: #1e2130;
      color: #94a3b8;
    }
    .hc-btn-accept {
      background: #dcfce7;
      color: #16a34a;
    }
    body.dark-mode .hc-btn-accept {
      background: rgba(22,163,74,.15);
      color: #4ade80;
    }
    .hc-btn-msg {
      background: #f1f5f9;
      color: #334155;
    }
    body.dark-mode .hc-btn-msg {
      background: #1e2130;
      color: #94a3b8;
    }

    /* لا شيء على الموبايل */
    @media (max-width: 768px) {
      #hc-card { display: none !important; }
    }
  `;
  document.head.appendChild(style);

  // ── State ────────────────────────────────────────────
  let card = null;
  let showTimer = null;
  let hideTimer = null;
  let currentTarget = null;
  const cache = {};

  // ── بناء البطاقة ─────────────────────────────────────
  function buildCard(username, data, x, y) {
    removeCard();

    const me = window.currentUser;
    const isSelf = (username === me);
    const isFriend = me && window.myFriends && window.myFriends.includes(username);
    const sentReq  = me && window.sentRequests && window.sentRequests[username];
    const gotReq   = me && window.currentRequests && window.currentRequests[username];

    // حساب الأصدقاء المشتركين
    let mutual = [];
    if (me && window.allFriendsData && window.myFriends) {
      const theirFriends = Object.keys(window.allFriendsData[username] || {});
      mutual = window.myFriends.filter(f => theirFriends.includes(f));
    }

    const dA = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    const pic = data.profilePic || dA;
    const cover = data.coverPic || '';
    const displayName = data.displayName || username;
    const friendsCount = Object.keys(window.allFriendsData?.[username] || {}).length;

    // ── الـ card element ──
    card = document.createElement('div');
    card.id = 'hc-card';

    // الغلاف
    card.innerHTML = `
      <div id="hc-cover">
        ${cover ? `<img src="${cover}" alt="" onerror="this.style.display='none'">` : ''}
        <img id="hc-avatar" src="${pic}" alt="" onerror="this.src='${dA}'">
      </div>
      <div id="hc-body">
        <div id="hc-name">${displayName}</div>
        <span id="hc-handle">@${username}</span>
        <div id="hc-meta">
          <div class="hc-meta-item">
            <i class="fas fa-user-friends"></i>
            <span>${friendsCount} صديق</span>
          </div>
        </div>
        ${!isSelf && mutual.length > 0 ? buildMutual(mutual) : ''}
        <div id="hc-actions">
          ${buildButtons(username, isSelf, isFriend, sentReq, gotReq, me)}
        </div>
      </div>
    `;

    document.body.appendChild(card);
    positionCard(x, y);

    // أحداث البطاقة
    card.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    card.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(removeCard, 200);
    });
  }

  function buildMutual(mutual) {
    const max = Math.min(mutual.length, 3);
    const dA = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    let pics = '';
    for (let i = 0; i < max; i++) {
      const p = window.allUsersData?.[mutual[i]]?.profilePic || dA;
      pics += `<img src="${p}" alt="" onerror="this.src='${dA}'">`;
    }
    const extra = mutual.length > 3 ? ` +${mutual.length - 3}` : '';
    return `
      <div id="hc-mutual">
        <div id="hc-mutual-pics">${pics}</div>
        <i class="fas fa-user-friends"></i>
        <span>${mutual.length} صديق مشترك${extra}</span>
      </div>`;
  }

  function buildButtons(username, isSelf, isFriend, sentReq, gotReq, me) {
    if (isSelf || !me) return '';

    let friendBtn = '';
    if (isFriend) {
      friendBtn = `<button class="hc-btn hc-btn-unfriend" onclick="hcUnfriend('${username}')">
        <i class="fas fa-user-minus"></i> إلغاء صداقة
      </button>`;
    } else if (gotReq) {
      friendBtn = `<button class="hc-btn hc-btn-accept" onclick="hcAcceptRequest('${username}')">
        <i class="fas fa-check"></i> قبول الطلب
      </button>`;
    } else if (sentReq) {
      friendBtn = `<button class="hc-btn hc-btn-cancel" onclick="hcCancelRequest('${username}')">
        <i class="fas fa-clock"></i> إلغاء الطلب
      </button>`;
    } else {
      friendBtn = `<button class="hc-btn hc-btn-add" onclick="hcAddFriend('${username}', this)">
        <i class="fas fa-user-plus"></i> إضافة صديق
      </button>`;
    }

    const msgBtn = `<button class="hc-btn hc-btn-msg" onclick="hcMessage('${username}')">
      <i class="fas fa-comment-dots"></i> رسالة
    </button>`;

    return friendBtn + msgBtn;
  }

  // ── تحديد موضع البطاقة ──────────────────────────────
  function positionCard(x, y) {
    if (!card) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = 280, h = 300;
    let left = x + 14;
    let top  = y + 14;
    if (left + w > vw - 8) left = x - w - 8;
    if (top  + h > vh - 8) top  = y - h - 8;
    card.style.left = Math.max(6, left) + 'px';
    card.style.top  = Math.max(6, top)  + 'px';
  }

  function removeCard() {
    if (card) { card.remove(); card = null; }
    currentTarget = null;
  }

  // ── جلب بيانات المستخدم ──────────────────────────────
  async function fetchUser(username) {
    if (cache[username]) return cache[username];
    try {
      // من allUsersData أولاً (متاح فوراً)
      if (window.allUsersData && window.allUsersData[username]) {
        cache[username] = window.allUsersData[username];
        return cache[username];
      }
      // Firebase fallback
      if (window.firebase && window.firebase.database) {
        const snap = await window.firebase.database().ref(`users/${username}`).once('value');
        const val = snap.val() || {};
        cache[username] = val;
        return val;
      }
    } catch (e) {}
    return {};
  }

  // ── الاستماع للـ mouseover ───────────────────────────
  document.addEventListener('mouseover', (e) => {
    const trigger = e.target.closest('[data-hc]');
    if (!trigger) return;
    const username = trigger.dataset.hc;
    if (!username || username === currentTarget) return;

    clearTimeout(showTimer);
    clearTimeout(hideTimer);

    currentTarget = username;
    const mx = e.clientX, my = e.clientY;

    showTimer = setTimeout(async () => {
      const data = await fetchUser(username);
      // تأكد أن المستخدم لا يزال يحوم على نفس العنصر
      if (currentTarget === username) {
        buildCard(username, data, mx, my);
      }
    }, 500);
  });

  document.addEventListener('mouseout', (e) => {
    const trigger = e.target.closest('[data-hc]');
    if (!trigger) return;
    clearTimeout(showTimer);
    hideTimer = setTimeout(removeCard, 300);
  });

  // ── أفعال الأزرار ────────────────────────────────────
  window.hcAddFriend = (username, btn) => {
    removeCard();
    if (window.sendFriendRequestToFromFeed) {
      window.sendFriendRequestToFromFeed(username, btn);
    }
  };

  window.hcCancelRequest = (username) => {
    removeCard();
    if (window.cancelFriendRequest) {
      window.cancelFriendRequest(username);
    }
  };

  window.hcAcceptRequest = (username) => {
    removeCard();
    if (window.acceptRequest) {
      window.acceptRequest(username);
    }
  };

  window.hcUnfriend = (username) => {
    removeCard();
    if (window.unfriend) {
      window.unfriend(username);
    }
  };

  window.hcMessage = (username) => {
    removeCard();
    if (window.openChat) {
      window.openChat(username);
    }
  };

  // ── تصدير للـ app.js ─────────────────────────────────
  window.hcRemove = removeCard;
  window.hcInvalidateCache = (u) => { delete cache[u]; };

})();
