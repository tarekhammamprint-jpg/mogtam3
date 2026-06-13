import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

// =============== نظام مكالمات الفيديو — Google Meet ===============
// لا يحتاج أي إعداد — يفتح في تبويب جديد على الهاتف والحاسوب

let currentCallModal = null;

// ─── بدء مكالمة في المجتمع ───────────────────────────────────
window.startCommunityCall = async (commId, commName) => {
    if (!window.currentUser) return window.dlgAlert("يجب تسجيل الدخول أولاً", "warning");

    // جلب بيانات المجتمع
    let community = window.allCommunities?.[commId];
    if (!community) {
        try {
            const snap = await get(ref(db, `communities/${commId}`));
            if (snap.exists()) {
                community = snap.val();
                if (!window.allCommunities) window.allCommunities = {};
                window.allCommunities[commId] = community;
            }
        } catch(e) {}
    }
    if (!community) return window.dlgAlert("المجتمع غير موجود", "danger");

    const isMember = community.members?.[window.currentUser];
    if (!isMember && community.admin !== window.currentUser)
        return window.dlgAlert("أنت لست عضواً في هذا المجتمع", "warning");

    const resolvedName = commName || community.name || window.currentCommunityName || commId;
    const userName     = window.allUsersData?.[window.currentUser]?.displayName || window.currentUser;
    const callRef      = ref(db, `communityCalls/${commId}`);

    // رابط Google Meet ثابت لكل مجتمع
    const meetCode = `mogtam3-${commId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 60);
    const roomUrl  = `https://meet.google.com/lookup/${meetCode}`;

    // هل يوجد اجتماع نشط؟
    const snap = await get(callRef);
    if (snap.exists()) {
        const ex = snap.val();
        if (ex.roomUrl && (Date.now() - ex.startTime < 3600000)) {
            const join = await window.dlgConfirm(
                `يوجد اجتماع نشط بدأه ${ex.startedByName || 'أحد الأعضاء'}، هل تريد الانضمام؟`,
                "اجتماع نشط", "question", "انضمام"
            );
            if (join) openCallModal(ex.roomUrl, resolvedName, userName);
            return;
        }
    }

    // حفظ المكالمة في Firebase لإشعار الأعضاء
    await set(callRef, {
        roomUrl,
        startedBy: window.currentUser,
        startedByName: userName,
        startTime: Date.now(),
        communityId: commId,
        communityName: resolvedName
    }).catch(e => console.error(e));

    // تنظيف بعد ساعة
    setTimeout(() => {
        get(callRef).then(s => { if (s.exists() && s.val().roomUrl === roomUrl) remove(callRef); });
    }, 3600000);

    openCallModal(roomUrl, resolvedName, userName);
};

// ─── الانضمام لمكالمة موجودة ─────────────────────────────────
window.joinActiveCommunityCall = async (commId) => {
    if (!window.currentUser) return window.dlgAlert("يجب تسجيل الدخول أولاً", "warning");
    try {
        const snap = await get(ref(db, `communityCalls/${commId}`));
        if (snap.exists()) {
            const call = snap.val();
            if (call.roomUrl && (Date.now() - call.startTime < 3600000)) {
                const userName = window.allUsersData?.[window.currentUser]?.displayName || window.currentUser;
                const comm = window.allCommunities?.[commId] || {};
                openCallModal(call.roomUrl, comm.name || window.currentCommunityName || 'المجتمع', userName);
                return;
            }
        }
        window.dlgAlert("لا يوجد اجتماع نشط حالياً", "info", "لا يوجد اجتماع");
    } catch(e) { console.error(e); }
};

// ─── نافذة المكالمة — تفتح Google Meet في تبويب جديد ────────
const openCallModal = (roomUrl, commName, userName) => {
    document.getElementById('videoCallModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'videoCallModal';
    modal.style.cssText = `
        position:fixed;inset:0;z-index:10000;
        display:flex;align-items:center;justify-content:center;
        background:rgba(10,20,40,0.85);backdrop-filter:blur(8px);
        font-family:'Cairo',sans-serif;direction:rtl;
    `;

    modal.innerHTML = `
        <div style="background:linear-gradient(145deg,#0f1f3e,#1a3a5c);border:1px solid rgba(99,179,237,0.2);border-radius:24px;padding:36px 32px;width:90%;max-width:400px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,0.5);">
            <div style="width:72px;height:72px;background:linear-gradient(135deg,#10b981,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                <i class="fas fa-video" style="color:#fff;font-size:28px;"></i>
            </div>
            <div style="color:#fff;font-size:20px;font-weight:800;margin-bottom:8px;">${commName || 'مكالمة المجتمع'}</div>
            <div style="color:#94a3b8;font-size:13px;margin-bottom:24px;">سيتم فتح المكالمة في تبويب جديد</div>
            <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:12px 16px;margin-bottom:24px;display:flex;align-items:center;gap:10px;">
                <i class="fas fa-user-circle" style="color:#60a5fa;font-size:20px;"></i>
                <div style="text-align:right;">
                    <div style="color:#e2e8f0;font-weight:700;font-size:14px;">${userName}</div>
                    <div style="color:#64748b;font-size:12px;">اسمك في المكالمة</div>
                </div>
            </div>
            <button id="openMeetBtn" style="width:100%;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:14px;border-radius:14px;font-family:'Cairo',sans-serif;font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:12px;box-shadow:0 4px 20px rgba(16,185,129,0.4);">
                <i class="fas fa-video"></i> فتح المكالمة
            </button>
            <button id="copyLinkBtn" style="width:100%;background:rgba(255,255,255,0.08);color:#94a3b8;border:1px solid rgba(255,255,255,0.1);padding:12px;border-radius:14px;font-family:'Cairo',sans-serif;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">
                <i class="fas fa-copy"></i> نسخ الرابط لمشاركته
            </button>
            <button id="closeVideoModalBtn" style="width:100%;background:transparent;color:#64748b;border:none;padding:10px;font-family:'Cairo',sans-serif;font-size:13px;cursor:pointer;">
                إغلاق
            </button>
        </div>
    `;

    document.body.appendChild(modal);
    currentCallModal = modal;

    document.getElementById('openMeetBtn').onclick = () => {
        window.open(roomUrl, '_blank');
    };

    document.getElementById('copyLinkBtn').onclick = () => {
        navigator.clipboard.writeText(roomUrl).then(() => {
            const btn = document.getElementById('copyLinkBtn');
            if (btn) { btn.innerHTML = '<i class="fas fa-check"></i> تم النسخ!'; btn.style.color = '#10b981'; }
            setTimeout(() => {
                if (btn) { btn.innerHTML = '<i class="fas fa-copy"></i> نسخ الرابط لمشاركته'; btn.style.color = '#94a3b8'; }
            }, 2000);
        });
    };

    document.getElementById('closeVideoModalBtn').onclick = () => {
        modal.remove();
        currentCallModal = null;
    };

    modal.onclick = (e) => {
        if (e.target === modal) { modal.remove(); currentCallModal = null; }
    };
};

// ─── أزرار المكالمة في واجهة المجتمع ────────────────────────
const enhanceCommunityView = (commId) => {
    setTimeout(() => {
        const actionsDiv = document.getElementById('communityHeaderActions');
        if (!actionsDiv || document.getElementById('startCallBtn')) return;

        const comm     = window.allCommunities?.[commId] || {};
        const commName = comm.name || window.currentCommunityName || commId;

        const callBtn = document.createElement('button');
        callBtn.id = 'startCallBtn';
        callBtn.className = 'btn-primary';
        callBtn.style.cssText = 'background:#10b981;border-color:#10b981;color:#fff;margin-left:8px;';
        callBtn.innerHTML = '<i class="fas fa-video"></i> بدء اجتماع';
        callBtn.onclick = () => window.startCommunityCall(commId, commName);

        const joinBtn = document.createElement('button');
        joinBtn.id = 'joinCallBtn';
        joinBtn.className = 'btn-secondary';
        joinBtn.style.cssText = 'margin-left:8px;';
        joinBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> انضمام';
        joinBtn.onclick = () => window.joinActiveCommunityCall(commId);

        actionsDiv.insertBefore(joinBtn, actionsDiv.firstChild);
        actionsDiv.insertBefore(callBtn, actionsDiv.firstChild);

        // بادج مكالمة نشطة
        get(ref(db, `communityCalls/${commId}`)).then(snap => {
            if (!snap.exists()) return;
            const call = snap.val();
            if (!call.roomUrl || Date.now() - call.startTime > 3600000) return;
            const badge = document.createElement('span');
            badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;background:#10b981;color:#fff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;margin-right:8px;cursor:pointer;';
            badge.innerHTML = '<i class="fas fa-circle" style="font-size:8px;"></i> مكالمة نشطة — انضم';
            badge.onclick = () => window.joinActiveCommunityCall(commId);
            const title = document.getElementById('communityViewTitle');
            if (title) title.insertAdjacentElement('afterend', badge);
        });
    }, 200);
};

// ─── ربط مع renderCommunityFeed ──────────────────────────────
const _hookEnhance = () => {
    if (typeof window.renderCommunityFeed === 'function') {
        const _orig = window.renderCommunityFeed;
        window.renderCommunityFeed = (commId) => {
            _orig(commId);
            enhanceCommunityView(commId);
        };
    } else {
        setTimeout(_hookEnhance, 100);
    }
};
_hookEnhance();
