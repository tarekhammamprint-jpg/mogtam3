// ============================================================
//  نظام النوافذ المخصص — يستبدل alert / confirm / prompt
//  أضف هذا الملف في index.html قبل باقي السكريبتات
// ============================================================

(function () {

  // ── CSS ──────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #dlg-overlay {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(15,23,42,0.55);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
      opacity: 0; pointer-events: none;
      transition: opacity .22s ease;
    }
    #dlg-overlay.dlg-show { opacity: 1; pointer-events: auto; }

    #dlg-box {
      background: #fff;
      border-radius: 22px;
      width: 100%; max-width: 420px;
      box-shadow: 0 24px 80px rgba(0,0,0,0.22);
      overflow: hidden;
      transform: scale(.88) translateY(20px);
      transition: transform .25s cubic-bezier(.34,1.56,.64,1);
      font-family: 'Cairo', sans-serif;
      direction: rtl;
    }
    #dlg-overlay.dlg-show #dlg-box { transform: scale(1) translateY(0); }

    #dlg-icon-wrap {
      padding: 28px 28px 0;
      display: flex; justify-content: center;
    }
    .dlg-icon-circle {
      width: 66px; height: 66px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px;
    }
    .dlg-icon-circle.info    { background:#eff6ff; color:#2563eb; }
    .dlg-icon-circle.success { background:#f0fdf4; color:#16a34a; }
    .dlg-icon-circle.warning { background:#fffbeb; color:#d97706; }
    .dlg-icon-circle.danger  { background:#fef2f2; color:#dc2626; }
    .dlg-icon-circle.question{ background:#f5f3ff; color:#7c3aed; }
    .dlg-icon-circle.input   { background:#f0f9ff; color:#0284c7; }

    #dlg-body { padding: 18px 28px 24px; text-align: center; }
    #dlg-title {
      font-size: 18px; font-weight: 800; color: #0f172a;
      margin-bottom: 8px; line-height: 1.4;
    }
    #dlg-msg {
      font-size: 14px; color: #475569; line-height: 1.75;
      margin-bottom: 0;
    }

    #dlg-input-wrap { margin-top: 16px; }
    #dlg-input {
      width: 100%; padding: 12px 16px;
      border: 2px solid #e2e8f0; border-radius: 12px;
      font-family: 'Cairo', sans-serif; font-size: 14px;
      outline: none; box-sizing: border-box;
      transition: border .2s;
      direction: rtl; text-align: right;
    }
    #dlg-input:focus { border-color: #2563eb; }

    #dlg-footer {
      padding: 0 20px 22px;
      display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
    }
    .dlg-btn {
      flex: 1; min-width: 100px; max-width: 180px;
      padding: 11px 18px; border: none; border-radius: 12px;
      font-family: 'Cairo', sans-serif; font-size: 14px; font-weight: 700;
      cursor: pointer; transition: filter .15s, transform .1s;
    }
    .dlg-btn:hover  { filter: brightness(.93); }
    .dlg-btn:active { transform: scale(.97); }
    .dlg-btn-ok     { background: #2563eb; color: #fff; }
    .dlg-btn-cancel { background: #f1f5f9; color: #475569; }
    .dlg-btn-danger { background: #ef4444; color: #fff; }
    .dlg-btn-success{ background: #10b981; color: #fff; }
    .dlg-btn-warn   { background: #f59e0b; color: #fff; }

    @media (max-width: 480px) {
      #dlg-box { border-radius: 18px; }
      #dlg-body { padding: 14px 20px 18px; }
      #dlg-footer { padding: 0 16px 18px; }
    }
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
      <div id="dlg-footer" id="dlg-footer"></div>
    </div>`;
  document.body.appendChild(overlay);

  // ── Core ──────────────────────────────────────────────────
  const ICONS = {
    info:     '<i class="fas fa-info"></i>',
    success:  '<i class="fas fa-check"></i>',
    warning:  '<i class="fas fa-exclamation"></i>',
    danger:   '<i class="fas fa-times"></i>',
    question: '<i class="fas fa-question"></i>',
    input:    '<i class="fas fa-pencil-alt"></i>',
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
        inputEl.value       = opts.input.default || '';
        inputEl.placeholder = opts.input.placeholder || '';
        setTimeout(() => inputEl.focus(), 250);
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

      // ESC يغلق ويرجع القيمة الافتراضية للإلغاء
      overlay._escHandler = (e) => {
        if (e.key === 'Escape') { close(); resolve(hasInput ? null : false); }
      };
      document.addEventListener('keydown', overlay._escHandler);

      // Enter يؤكد في حالة input أو alert
      overlay._enterHandler = (e) => {
        if (e.key === 'Enter' && document.activeElement === inputEl) {
          close();
          resolve(inputEl.value);
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

  // alert(msg) أو alert(msg, type, title)
  window.dlgAlert = (message, type = 'info', title = '') => open({
    type, title, message,
    buttons: [{ label: 'حسناً', value: true, style: 'ok' }]
  });

  // confirm(msg) → true/false
  window.dlgConfirm = (message, title = 'تأكيد', type = 'question', okLabel = 'تأكيد', okStyle = 'ok') => open({
    type, title, message,
    buttons: [
      { label: 'إلغاء',  value: false, style: 'cancel' },
      { label: okLabel,  value: true,  style: okStyle  },
    ]
  });

  // confirm خطر → زر أحمر
  window.dlgDanger = (message, title = 'تأكيد الحذف') =>
    window.dlgConfirm(message, title, 'danger', 'حذف', 'danger');

  // prompt(msg, default) → string | null
  window.dlgPrompt = (message, defaultVal = '', placeholder = '') => open({
    type: 'input', title: message, message: '',
    input: { default: defaultVal, placeholder },
    buttons: [
      { label: 'إلغاء', value: false, style: 'cancel' },
      { label: 'تأكيد', value: true,  style: 'ok'     },
    ]
  });

  // ── استبدال دوال المتصفح الأصلية ────────────────────────
  window._nativeAlert   = window.alert;
  window._nativeConfirm = window.confirm;
  window._nativePrompt  = window.prompt;

  window.alert = (msg) => { window.dlgAlert(String(msg)); };

  // لأن confirm المتصفح متزامن ولا يمكن استبداله بدالة async
  // نحتفظ بالأصلية للاستخدام القديم وندعو للاستخدام المباشر
  // لكن في الكود الجديد استخدم dlgConfirm / dlgDanger

})();
