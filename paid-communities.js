import { ref, get, set, update, push } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

/*
 * Paid Communities MVP
 *
 * This client layer intentionally does not pretend to process money. It stores a
 * subscription request and waits for an owner/admin approval. For production,
 * replace startPaidCheckout() with a server-created Checkout Session and only
 * grant membership from a verified webhook/Cloud Function.
 */
const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#039;"}[c]));
const money = (price, currency) => price > 0 ? `${Number(price).toLocaleString('ar-EG')} ${esc(currency || 'USD')}` : 'مجاني';
const current = () => window.currentUser;
const community = (id) => window.allCommunities?.[id] || null;
const isOwner = (c) => c && c.admin === current();
const isMember = (c) => !!(c?.members && c.members[current()]);
const hasPending = (c) => !!(c?.requests && c.requests[current()]);

function injectStyle() {
    if ($('paidCommunitiesStyle')) return;
    const s = document.createElement('style');
    s.id = 'paidCommunitiesStyle';
    s.textContent = `
      .paid-badge{display:inline-flex;align-items:center;gap:5px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:999px;padding:3px 9px;font-size:11px;font-weight:800}
      .free-badge{display:inline-flex;align-items:center;gap:5px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;padding:3px 9px;font-size:11px;font-weight:800}
      .community-price{font-weight:900;color:var(--primary,#4f46e5);margin-top:8px}
      .paid-info{background:linear-gradient(135deg,#fff7ed,#fffbeb);border:1px solid #fed7aa;border-radius:14px;padding:13px;margin:12px 0;text-align:right;color:#7c2d12;font-size:13px;line-height:1.8}
      .paid-info strong{color:#9a3412}
      #paidJoinModal .modal-content{max-width:470px;padding:25px}
    `;
    document.head.appendChild(s);
}

function ensureJoinModal() {
    if ($('paidJoinModal')) return;
    const modal = document.createElement('div');
    modal.className = 'modal'; modal.id = 'paidJoinModal';
    modal.innerHTML = `<div class="modal-content" dir="rtl">
      <span class="close-btn" id="paidJoinClose"><em class="fas fa-times"></em></span>
      <div style="text-align:center;margin-bottom:16px"><div style="width:54px;height:54px;margin:auto;background:#fff7ed;color:#ea580c;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:23px"><i class="fas fa-crown"></i></div><h3 id="paidJoinTitle" style="margin:12px 0 5px">الانضمام إلى المجتمع</h3><p id="paidJoinSubtitle" style="margin:0;color:#64748b;font-size:13px"></p></div>
      <div id="paidJoinDetails" class="paid-info"></div>
      <label style="display:block;font-size:13px;font-weight:800;margin:12px 0 6px">ملاحظة لصاحب المجتمع (اختياري)</label>
      <textarea id="paidJoinNote" class="modal-input" rows="3" placeholder="اكتب هدفك أو أي معلومات يحتاجها صاحب المجتمع..."></textarea>
      <button id="paidJoinSubmit" class="btn-primary" style="width:100%;padding:13px"><i class="fas fa-paper-plane"></i> إرسال طلب الاشتراك</button>
      <p style="font-size:11px;color:#64748b;line-height:1.7;margin:12px 0 0">هذا الإصدار يسجل طلب الاشتراك للمراجعة. لا يعتبر الطلب عملية دفع إلكترونية حتى يتم ربط بوابة دفع موثقة.</p>
    </div>`;
    document.body.appendChild(modal);
    $('paidJoinClose').onclick = () => modal.classList.remove('show');
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
}

window.openPaidJoinModal = (id) => {
    if (!current()) return window.showRegisterModal?.();
    const c = community(id); if (!c) return;
    ensureJoinModal();
    $('paidJoinTitle').textContent = `الاشتراك في ${c.name || 'المجتمع'}`;
    $('paidJoinSubtitle').textContent = c.billingCycle === 'yearly' ? 'اشتراك سنوي' : 'اشتراك شهري';
    $('paidJoinDetails').innerHTML = `<strong><i class="fas fa-wallet"></i> السعر: ${money(Number(c.price || 0), c.currency)}</strong><br>${esc(c.paymentInstructions || 'بعد إرسال الطلب سيراجع صاحب المجتمع بياناتك ويؤكد الاشتراك.')}`;
    $('paidJoinNote').value = '';
    $('paidJoinSubmit').onclick = () => window.submitPaidJoinRequest(id);
    $('paidJoinModal').classList.add('show');
};

window.submitPaidJoinRequest = async (id) => {
    const c = community(id); if (!c || !current()) return;
    const btn = $('paidJoinSubmit'); const old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    try {
        await set(ref(db, `communities/${id}/requests/${current()}`), {
            type: 'paid_subscription', status: 'pending', amount: Number(c.price || 0), currency: c.currency || 'USD', billingCycle: c.billingCycle || 'monthly', note: $('paidJoinNote').value.trim(), createdAt: Date.now()
        });
        await push(ref(db, `users/${c.admin}/notifications`), { type:'community_paid_request', from:current(), communityId:id, communityName:c.name || '', timestamp:Date.now(), read:false });
        $('paidJoinModal').classList.remove('show');
        window.showToast?.('تم إرسال طلب الاشتراك', 'سينتظر طلبك مراجعة صاحب المجتمع', '');
        window.renderCommunitiesList?.();
    } catch (e) {
        console.error('[PaidCommunities]', e);
        window.dlgAlert?.('تعذر إرسال الطلب. حاول مرة أخرى.', 'danger', 'خطأ');
    } finally { btn.disabled = false; btn.innerHTML = old; }
};

function renderPaidList() {
    const list = $('communitiesListArea'); if (!list) return;
    const q = (window.currentCommunitySearchQuery || '').toLowerCase();
    let html = `<div style="margin-bottom:15px"><input type="text" id="commSearchInput" oninput="window.searchCommunities(this.value)" placeholder="ابحث عن مجتمع..." style="width:100%;border:1px solid var(--border-color);padding:10px;border-radius:8px;font-family:inherit" value="${esc(window.currentCommunitySearchQuery || '')}"></div>`;
    let count = 0;
    Object.entries(window.allCommunities || {}).forEach(([id, c]) => {
        if (!c || (q && !String(c.name || '').toLowerCase().includes(q))) return;
        count++;
        const paid = Number(c.price || 0) > 0;
        const member = isMember(c), owner = isOwner(c), pending = hasPending(c);
        const badge = paid ? `<span class="paid-badge"><i class="fas fa-lock"></i> مدفوع</span>` : `<span class="free-badge"><i class="fas fa-unlock"></i> مجاني</span>`;
        let action = member ? `<button class="btn-secondary" onclick="window.openCommunityView('${esc(id)}')">فتح المجتمع</button>` : owner ? `<button class="btn-secondary" onclick="window.openCommunityView('${esc(id)}')">إدارة المجتمع</button>` : pending ? `<button class="btn-secondary" disabled style="opacity:.7">قيد المراجعة</button>` : paid ? `<button class="btn-primary" onclick="window.openCommunityView('${esc(id)}')"><i class="fas fa-play-circle"></i> شاهد المعاينة</button>` : `<button class="btn-primary" onclick="window.requestJoinCommunity('${esc(id)}')">طلب انضمام</button>`;
        html += `<div style="background:#f8fafc;border:1px solid var(--border-color);padding:15px;border-radius:12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:12px"><div style="min-width:0"><div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap"><h4 style="margin:0;color:var(--primary);font-size:16px">${esc(c.name)}</h4>${badge}</div><div style="font-size:13px;color:var(--text-muted);margin-top:5px">${esc(c.description || '')}</div><div class="community-price">${paid ? money(Number(c.price), c.currency) + ' / ' + (c.billingCycle === 'yearly' ? 'سنة' : 'شهر') : 'انضم مجانًا'} <span style="font-size:12px;font-weight:500;color:#64748b"> · ${c.members ? Object.keys(c.members).length : 0} أعضاء</span></div></div><div style="flex-shrink:0">${action}</div></div>`;
    });
    list.innerHTML = html + (count ? '' : '<p style="text-align:center;color:#666;padding:10px">لا توجد مجتمعات لعرضها حالياً.</p>');
}

function wrapCreateCommunity() {
    const original = window.createCommunity;
    window.createCommunity = async () => {
        const name = $('communityNameInput')?.value.trim(), desc = $('communityDescInput')?.value.trim();
        const price = Math.max(0, Number($('communityPriceInput')?.value || 0));
        const currency = $('communityCurrencyInput')?.value || 'USD';
        const billingCycle = $('communityBillingInput')?.value || 'monthly';
        const instructions = $('communityPaymentInstructions')?.value.trim() || '';
        if (!name) return window.dlgAlert?.('الرجاء إدخال اسم المجتمع.', 'warning', 'بيانات ناقصة');
        if (price > 0 && !instructions) return window.dlgAlert?.('أضف طريقة الدفع أو تعليمات الاشتراك حتى يعرف العضو الخطوة التالية.', 'warning', 'تعليمات ناقصة');
        const btn = $('createCommunityBtn'); if (btn) { btn.disabled = true; btn.dataset.old = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري...'; }
        try {
            const r = push(ref(db, 'communities'));
            const data = { name, description:desc, admin:current(), timestamp:Date.now(), members:{[current()]:true}, price, currency, billingCycle, paymentInstructions: price > 0 ? instructions : '', visibility: price > 0 ? 'paid' : 'free', version: 2 };
            await set(r, data);
            ['communityNameInput','communityDescInput','communityPriceInput','communityPaymentInstructions'].forEach(id => { if ($(id)) $(id).value=''; });
            window.dlgAlert?.('تم إنشاء المجتمع بنجاح.', 'success', 'تم الإنشاء');
            window.renderCommunitiesList?.();
        } catch(e) { console.error(e); window.dlgAlert?.('تعذر إنشاء المجتمع.', 'danger', 'خطأ'); }
        finally { if (btn) { btn.disabled=false; btn.innerHTML=btn.dataset.old || 'إنشاء المجتمع'; } }
    };
    window.renderCommunitiesList = renderPaidList;
}

function gateCommunityView() {
    const originalOpen = window.openCommunityView;
    if (originalOpen && !originalOpen.__paidWrapped) {
      const wrapped = function(id) {
        return originalOpen(id);
      };
      wrapped.__paidWrapped = true; window.openCommunityView = wrapped;
    }
    const originalDirect = window.openCommunityViewDirect;
    if (originalDirect && !originalDirect.__paidWrapped) {
      const direct = function(id) {
        return originalDirect(id);
      };
      direct.__paidWrapped = true; window.openCommunityViewDirect = direct;
    }
}

injectStyle(); ensureJoinModal();
wrapCreateCommunity();
gateCommunityView();
// app.js can redraw after Firebase listeners; keep the paid renderer authoritative.
window.renderCommunitiesList = renderPaidList;
