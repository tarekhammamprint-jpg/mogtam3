import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

// =============== نظام مكالمات الفيديو — بدون API بدون إعداد ===============
// يستخدم whereby.com — يعمل فوراً على الهاتف والحاسوب بدون تطبيق

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

    // رابط الغرفة ثابت لكل مجتمع — لا يحتاج API
    // whereby يتيح غرف مجانية دائمة بمجرد فتح الرابط
    const roomUrl = `https://whereby.com/mogtam3-${commId}`;

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

// ─── نافذة المكالمة ───────────────────────────────────────────
const openCallModal = (roomUrl, commName, userName) => {
    document.getElementById('dailyCallModal')?.remove();

    // whereby يقبل displayName كـ query param
    const urlWithName = `${roomUrl}?displayName=${encodeURIComponent(userName)}`;

    const modal = document.createElement('div');
    modal.id = 'dailyCallModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;background:#0f172a;';

    modal.innerHTML = `
        <div style="background:#0f172a;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:34px;height:34px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-video" style="color:#fff;font-size:14px;"></i>
                </div>
                <div>
                    <div style="color:#fff;font-weight:800;font-size:14px;font-family:'Cairo',sans-serif;">${commName || 'مكالمة المجتمع'}</div>
                    <div id="dailyCallTimer" style="color:#64748b;font-size:11px;font-family:'Cairo',sans-serif;">00:00</div>
                </div>
            </div>
            <button id="endDailyCallBtn" style="background:#ef4444;color:#fff;border:none;padding:9px 18px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px;">
                <i class="fas fa-phone-slash"></i> إنهاء
            </button>
        </div>
        <iframe
            src="${urlWithName}"
            allow="camera;microphone;fullscreen;display-capture;autoplay;clipboard-write"
            allowfullscreen
            style="flex:1;width:100%;border:none;background:#000;"
        ></iframe>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    currentCallModal = modal;

    // عداد زمن المكالمة
    let secs = 0;
    const timer = setInterval(() => {
        secs++;
        const el = document.getElementById('dailyCallTimer');
        if (el) el.innerText = `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
    }, 1000);

    document.getElementById('endDailyCallBtn').onclick = () => {
        window.dlgConfirm("هل تريد إنهاء المكالمة؟", "إنهاء", "question", "نعم").then(ok => {
            if (!ok) return;
            clearInterval(timer);
            modal.remove();
            document.body.style.overflow = 'auto';
            currentCallModal = null;
        });
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
        callBtn.style.cssText = 'background:#ef4444;border-color:#ef4444;color:#fff;margin-left:8px;';
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
            badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;background:#ef4444;color:#fff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;margin-right:8px;cursor:pointer;';
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
