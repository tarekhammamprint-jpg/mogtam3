// ══════════════════════════════════════════════════════════
//  نظام النوافذ المخصص v2.0 — هوية بصرية مجتمعنا الجديدة
//  يستبدل alert / confirm / prompt بتصميم احترافي
// ══════════════════════════════════════════════════════════

(function () {

  // ── CSS ───────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #dlg-overlay {
      position: fixed; inset: 0; z-index: 2147483600;
      background: rgba(15,23,42,0.6);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
      opacity: 0; pointer-events: none;
      transition: opacity .22s ease;
    }
    #dlg-overlay.dlg-show { opacity: 1; pointer-events: auto; }

    #dlg-box {
      background: var(--card-bg, #fff);
      border-radius: 28px;
      width: 100%; max-width: 400px;
      max-height: 88vh;
      box-shadow: 0 32px 80px rgba(15,23,42,0.22), 0 8px 24px rgba(15,23,42,0.1);
      overflow: hidden;
      display: flex; flex-direction: column;
      transform: scale(.88) translateY(24px);
      transition: transform .3s cubic-bezier(.34,1.56,.64,1);
      font-family: 'Cairo', 'IBM Plex Sans Arabic', sans-serif;
      direction: rtl;
      border: 1px solid var(--border, #e2e8f0);
    }
    #dlg-overlay.dlg-show #dlg-box { transform: scale(1) translateY(0); }

    #dlg-icon-wrap {
      padding: 30px 28px 0;
      display: flex; justify-content: center;
      flex-shrink: 0;
    }
    .dlg-icon-circle {
      width: 70px; height: 70px; border-radius: 22px;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; flex-shrink: 0;
    }
    .dlg-icon-circle.info    { background: #eef2ff; color: #6366f1; }
    .dlg-icon-circle.success { background: #f0fdf4; color: #10b981; }
    .dlg-icon-circle.warning { background: #fffbeb; color: #f59e0b; }
    .dlg-icon-circle.danger  { background: #fef2f2; color: #ef4444; }
    .dlg-icon-circle.question{ background: #f5f3ff; color: #7c3aed; }
    .dlg-icon-circle.input   { background: #e0f2fe; color: #0ea5e9; }

    #dlg-body {
      padding: 20px 28px 24px; text-align: center;
      overflow-y: auto; flex: 1; min-height: 0;
    }
    #dlg-title {
      font-size: 18px; font-weight: 900;
      color: var(--text-main, #0f172a);
      margin-bottom: 8px; line-height: 1.4;
    }
    #dlg-msg {
      font-size: 14px;
      color: var(--text-muted, #64748b);
      line-height: 1.8; margin-bottom: 0;
    }
    #dlg-input-wrap { margin-top: 18px; }
    #dlg-input {
      width: 100%; padding: 13px 16px;
      border: 1.5px solid var(--border, #e2e8f0);
      border-radius: 14px;
      font-family: 'Cairo', sans-serif; font-size: 14px; font-weight: 600;
      outline: none; box-sizing: border-box;
      transition: all .25s;
      direction: rtl; text-align: right;
      background: var(--border-soft, #f1f5f9);
      color: var(--text-main, #0f172a);
    }
    #dlg-input:focus {
      border-color: #6366f1;
      background: var(--card-bg, #fff);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
    }
    #dlg-footer {
      padding: 0 22px 24px;
      display: flex; gap: 10px;
      justify-content: center; flex-wrap: wrap;
      flex-shrink: 0;
    }
    .dlg-btn {
      flex: 1; min-width: 100px; max-width: 180px;
      padding: 12px 18px; border: none; border-radius: 14px;
      font-family: 'Cairo', sans-serif; font-size: 14px; font-weight: 800;
      cursor: pointer; transition: all .18s;
    }
    .dlg-btn:hover  { transform: translateY(-1px); filter: brightness(.93); }
    .dlg-btn:active { transform: scale(.97); }
    .dlg-btn-ok      { background: linear-gradient(135deg,#6366f1,#2a5298); color: #fff; box-shadow: 0 4px 14px rgba(99,102,241,0.35); }
    .dlg-btn-cancel  { background: var(--border-soft,#f1f5f9); color: var(--text-sub,#334155); border: 1.5px solid var(--border,#e2e8f0); }
    .dlg-btn-danger  { background: linear-gradient(135deg,#ef4444,#dc2626); color: #fff; box-shadow: 0 4px 14px rgba(239,68,68,0.35); }
    .dlg-btn-success { background: linear-gradient(135deg,#10b981,#059669); color: #fff; box-shadow: 0 4px 14px rgba(16,185,129,0.35); }
    .dlg-btn-warn    { background: linear-gradient(135deg,#f59e0b,#d97706); color: #fff; box-shadow: 0 4px 14px rgba(245,158,11,0.35); }

    @media (max-width: 480px) {
      #dlg-box { border-radius: 22px; }
      #dlg-body { padding: 16px 20px 18px; }
      #dlg-footer { padding: 0 16px 20px; }
    }

    /* ─── Hover Card للمستخدمين ─── */
    .hover-user-card {
      position: fixed; z-index: 9999999;
      width: 290px;
      background: var(--card-bg, #fff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 28px;
      box-shadow: 0 24px 60px rgba(15,23,42,0.16), 0 6px 18px rgba(15,23,42,0.08);
      overflow: hidden;
      animation: hoverCardIn .22s cubic-bezier(.4,0,.2,1);
      pointer-events: auto;
    }
    @keyframes hoverCardIn {
      from { opacity:0; transform: translateY(8px) scale(.96) }
      to   { opacity:1; transform: none }
    }
    .hc-cover {
      height: 82px;
      background: linear-gradient(135deg, #1e3a5f, #6366f1 60%, #0ea5e9);
      position: relative; overflow: hidden;
    }
    .hc-cover img { width:100%; height:100%; object-fit:cover; }
    .hc-avatar {
      width: 64px; height: 64px; border-radius: 50%;
      border: 3px solid var(--card-bg, #fff);
      object-fit: cover;
      position: absolute; bottom: -26px; right: 14px;
      box-shadow: 0 4px 14px rgba(15,23,42,0.15);
    }
    .hc-body { padding: 30px 16px 14px; }
    .hc-name  { font-size: 15px; font-weight: 900; color: var(--text-main,#0f172a); margin-bottom: 2px; }
    .hc-handle{ font-size: 12px; color: #6366f1; direction: ltr; font-weight: 600; margin-bottom: 6px; }
    .hc-bio   { font-size: 12px; color: var(--text-muted,#64748b); line-height: 1.6; margin-bottom: 10px; }
    .hc-meta  { font-size: 11px; color: var(--text-light,#94a3b8); display:flex; align-items:center; gap:5px; margin-bottom: 10px; }
    .hc-meta i { color: #6366f1; font-size: 10px; }
    .hc-online-dot { width:8px; height:8px; border-radius:50%; background:#10b981; display:inline-block; box-shadow: 0 0 0 2px rgba(16,185,129,.2); }
    .hc-stats {
      display: flex; border-radius: 12px; overflow: hidden;
      border: 1px solid var(--border,#e2e8f0);
      background: var(--border-soft,#f1f5f9);
      margin-bottom: 12px;
    }
    .hc-stat { flex:1; text-align:center; padding: 8px 4px; border-left: 1px solid var(--border,#e2e8f0); }
    .hc-stat:last-child { border-left: none; }
    .hc-stat-num { display:block; font-size:14px; font-weight:900; color: var(--text-main,#0f172a); }
    .hc-stat-lbl { font-size:10px; color: var(--text-muted,#64748b); font-weight:600; }
    .hc-badges { display:flex; flex-wrap:wrap; gap:5px; margin-bottom: 10px; }
    .hc-badge  { background:#eef2ff; color:#6366f1; padding:3px 8px; border-radius:999px; font-size:10px; font-weight:700; }
    .hc-actions { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
    .hc-btn {
      padding: 9px; border-radius: 12px;
      font-size: 12px; font-weight: 800; cursor:pointer;
      font-family: 'Cairo',sans-serif;
      transition: all .2s; display:flex;
      align-items:center; justify-content:center;
      gap: 5px; border: none;
    }
    .hc-btn-primary { background: linear-gradient(135deg,#6366f1,#2a5298); color:#fff; }
    .hc-btn-secondary { background: var(--border-soft,#f1f5f9); color: var(--text-sub,#334155); border: 1.5px solid var(--border,#e2e8f0); }
    .hc-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(15,23,42,0.1); }
    @media(max-width:768px){ .hover-user-card { display:none!important; } }
  `;
  document.head.appendChild(style);

  // ── HTML ──────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'dlg-overlay';
  overlay.innerHTML = `
    <div id="dlg-box">
      <div id="dlg-icon-wrap">
        <div class="dlg-icon-circle" id="dlg-icon"></div>
      </div>
      <div id="dlg-body">
        <div id="dlg-title"></div>
        <div id="dlg-msg"></div>
        <div id="dlg-input-wrap" style="display:none">
          <input id="dlg-input" type="text">
        </div>
      </div>
      <div id="dlg-footer"></div>
    </div>`;
  document.body.appendChild(overlay);

  // ── Core ──────────────────────────────────────────────────
  const ICONS = {
    info:     '<i class="fas fa-circle-info"></i>',
    success:  '<i class="fas fa-circle-check"></i>',
    warning:  '<i class="fas fa-triangle-exclamation"></i>',
    danger:   '<i class="fas fa-circle-xmark"></i>',
    question: '<i class="fas fa-circle-question"></i>',
    input:    '<i class="fas fa-pen-to-square"></i>',
  };

  function open(opts) {
    return new Promise(resolve => {
      const type    = opts.type    || 'info';
      const title   = opts.title   || '';
      const message = opts.message || '';
      const buttons = opts.buttons || [{ label: 'حسناً', value: true, style: 'ok' }];
      const hasInput = !!opts.input;

      document.getElementById('dlg-icon').className = `dlg-icon-circle ${type}`;
      document.getElementById('dlg-icon').innerHTML  = ICONS[type] || ICONS.info;
      document.getElementById('dlg-title').innerHTML = title;
      document.getElementById('dlg-msg').innerHTML   = message;

      const inputWrap = document.getElementById('dlg-input-wrap');
      const inputEl   = document.getElementById('dlg-input');
      if (hasInput) {
        inputWrap.style.display = 'block';
        inputEl.value           = opts.input.default || '';
        inputEl.placeholder     = opts.input.placeholder || '';
        setTimeout(() => inputEl.focus(), 260);
      } else {
        inputWrap.style.display = 'none';
      }

      const footer = document.getElementById('dlg-footer');
      footer.innerHTML = '';
      buttons.forEach(btn => {
        const b = document.createElement('button');
        b.className = `dlg-btn dlg-btn-${btn.style || 'ok'}`;
        b.innerHTML  = btn.label;
        b.onclick = () => {
          close();
          resolve(hasInput ? (btn.value ? inputEl.value : null) : btn.value);
        };
        footer.appendChild(b);
      });

      overlay.classList.add('dlg-show');

      overlay._escHandler = (e) => {
        if (e.key === 'Escape') { close(); resolve(hasInput ? null : false); }
      };
      document.addEventListener('keydown', overlay._escHandler);

      overlay._enterHandler = (e) => {
        if (e.key === 'Enter' && document.activeElement === inputEl) {
          close(); resolve(inputEl.value);
        }
      };
      document.addEventListener('keydown', overlay._enterHandler);
    });
  }

  function close() {
    overlay.classList.remove('dlg-show');
    document.removeEventListener('keydown', overlay._escHandler);
    document.removeEventListener('keydown', overlay._enterHandler);
  }

  // ── Public API ────────────────────────────────────────────
  window.dlgAlert = (message, type = 'info', title = '') => open({
    type, title, message,
    buttons: [{ label: 'حسناً', value: true, style: 'ok' }]
  });

  window.dlgConfirm = (message, title = 'تأكيد', type = 'question', okLabel = 'تأكيد', okStyle = 'ok') => open({
    type, title, message,
    buttons: [
      { label: 'إلغاء', value: false, style: 'cancel' },
      { label: okLabel, value: true,  style: okStyle  },
    ]
  });

  window.dlgDanger = (message, title = 'تأكيد الحذف') =>
    window.dlgConfirm(message, title, 'danger', 'حذف', 'danger');

  window.dlgPrompt = (message, defaultVal = '', placeholder = '') => open({
    type: 'input', title: message, message: '',
    input: { default: defaultVal, placeholder },
    buttons: [
      { label: 'إلغاء', value: false, style: 'cancel' },
      { label: 'تأكيد', value: true,  style: 'ok'     },
    ]
  });

  window._nativeAlert   = window.alert;
  window._nativeConfirm = window.confirm;
  window._nativePrompt  = window.prompt;
  window.alert = (msg) => { window.dlgAlert(String(msg)); };

  // ══════════════════════════════════════════════════════════
  //  نظام Hover Card للمستخدمين
  // ══════════════════════════════════════════════════════════
  let hoverCard = null;
  let hoverTimeout = null;
  let hideTimeout  = null;

  function createHoverCard(userData, x, y) {
    removeHoverCard();
    const card = document.createElement('div');
    card.className = 'hover-user-card';
    card.id = 'hoverUserCard';

    const isOnline  = userData.lastSeen && (Date.now() - userData.lastSeen < 5 * 60 * 1000);
    const joinDate  = userData.joinedAt
      ? new Date(userData.joinedAt).toLocaleDateString('ar-EG', { year:'numeric', month:'long' })
      : '—';
    const coverStyle = userData.coverPhoto
      ? `<img src="${userData.coverPhoto}" alt="" />`
      : '';
    const badgesHtml = (userData.badges || [])
      .map(b => `<span class="hc-badge"><i class="fas fa-star"></i> ${b}</span>`)
      .join('');
    const bioText = userData.bio ? userData.bio.slice(0, 80) + (userData.bio.length > 80 ? '...' : '') : 'لا توجد نبذة.';

    card.innerHTML = `
      <div class="hc-cover">
        ${coverStyle}
        <img class="hc-avatar" src="${userData.pic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" alt="" />
      </div>
      <div class="hc-body">
        <div class="hc-name">${userData.displayName || userData.username || '—'}</div>
        <div class="hc-handle">@${userData.username || ''}</div>
        <div class="hc-bio">${bioText}</div>
        <div class="hc-meta">
          ${isOnline
            ? '<span class="hc-online-dot"></span> متصل الآن'
            : `<i class="fas fa-clock"></i> آخر ظهور ${joinDate}`}
        </div>
        <div class="hc-stats">
          <div class="hc-stat">
            <span class="hc-stat-num">${formatNum(userData.friendsCount || 0)}</span>
            <span class="hc-stat-lbl">صديق</span>
          </div>
          <div class="hc-stat">
            <span class="hc-stat-num">${formatNum(userData.followersCount || 0)}</span>
            <span class="hc-stat-lbl">متابع</span>
          </div>
          <div class="hc-stat">
            <span class="hc-stat-num">${formatNum(userData.postsCount || 0)}</span>
            <span class="hc-stat-lbl">منشور</span>
          </div>
        </div>
        ${badgesHtml ? `<div class="hc-badges">${badgesHtml}</div>` : ''}
        <div class="hc-actions">
          <button class="hc-btn hc-btn-primary" onclick="window.openChat&&window.openChat('${userData.username}');removeHoverCard()">
            <i class="fas fa-comment-dots"></i> مراسلة
          </button>
          <button class="hc-btn hc-btn-secondary" onclick="window.openProfile&&window.openProfile('${userData.username}');removeHoverCard()">
            <i class="fas fa-user"></i> الملف
          </button>
          <button class="hc-btn hc-btn-secondary" id="hcFriendBtn" onclick="window.hcSendFriendRequest&&window.hcSendFriendRequest('${userData.username}',this)">
            <i class="fas fa-user-plus"></i> إضافة
          </button>
          <button class="hc-btn hc-btn-secondary" id="hcFollowBtn" onclick="window.hcFollowUser&&window.hcFollowUser('${userData.username}',this)">
            <i class="fas fa-bell"></i> متابعة
          </button>
        </div>
      </div>`;

    // تحديد الموضع
    document.body.appendChild(card);
    const rect = card.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = x + 12, top = y + 12;
    if (left + rect.width  > vw - 10) left = x - rect.width - 12;
    if (top  + rect.height > vh - 10) top  = y - rect.height - 12;
    card.style.left = Math.max(6, left) + 'px';
    card.style.top  = Math.max(6, top)  + 'px';

    card.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    card.addEventListener('mouseleave', () => { hideTimeout = setTimeout(removeHoverCard, 200); });

    hoverCard = card;
  }

  function removeHoverCard() {
    if (hoverCard) { hoverCard.remove(); hoverCard = null; }
  }
  window.removeHoverCard = removeHoverCard;

  function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'م';
    if (n >= 1000)    return (n / 1000).toFixed(1) + 'ك';
    return n;
  }

  // تفعيل Hover Card على جميع روابط المستخدمين
  document.addEventListener('mouseover', async (e) => {
    const trigger = e.target.closest('[data-hover-user]');
    if (!trigger) return;
    const username = trigger.dataset.hoverUser;
    if (!username) return;

    clearTimeout(hideTimeout);
    hoverTimeout = setTimeout(async () => {
      let userData = {};
      try {
        if (window._hoverCardCache && window._hoverCardCache[username]) {
          userData = window._hoverCardCache[username];
        } else if (window.firebase && window.firebase.database) {
          const snap = await window.firebase.database().ref(`users/${username}`).once('value');
          userData = snap.val() || { username };
          if (!window._hoverCardCache) window._hoverCardCache = {};
          window._hoverCardCache[username] = userData;
        } else {
          userData = { username, displayName: username };
        }
      } catch(err) {
        userData = { username, displayName: username };
      }
      createHoverCard(userData, e.clientX, e.clientY);
    }, 600);
  });

  document.addEventListener('mouseout', (e) => {
    const trigger = e.target.closest('[data-hover-user]');
    if (!trigger) return;
    clearTimeout(hoverTimeout);
    hideTimeout = setTimeout(removeHoverCard, 250);
  });

  document.addEventListener('mousemove', (e) => {
    if (!hoverCard) return;
    if (!e.target.closest('.hover-user-card') && !e.target.closest('[data-hover-user]')) {
      hideTimeout = setTimeout(removeHoverCard, 300);
    }
  });

})();
