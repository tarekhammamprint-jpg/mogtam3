// =============== نظام المكالمات الجماعية بالفيديو — مجتمعنا ===============
// jitsi-call.js — نسخة محسّنة مع إشعارات فورية لجميع الأعضاء

import { ref, set, get, remove, onValue, off } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

let activeJitsiApi = null;
let currentMeetingModal = null;
let callNotifyUnsubscribe = null; // للاستماع لإشعارات المكالمات

window.JITSI_DOMAIN = 'meet.jit.si';

// ─────────────────────────────────────────────
// CSS إشعار المكالمة الواردة
// ─────────────────────────────────────────────
(function injectCallNotifyStyles() {
    const style = document.createElement('style');
    style.textContent = `
        #callNotifyOverlay {
            position: fixed;
            inset: 0;
            z-index: 99998;
            background: rgba(10,20,40,0.6);
            backdrop-filter: blur(6px);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity .3s ease;
        }
        #callNotifyOverlay.show {
            opacity: 1;
            pointer-events: auto;
        }
        #callNotifyBox {
            background: linear-gradient(145deg, #0f1f3e, #1a3a5c);
            border: 1px solid rgba(99,179,237,0.3);
            border-radius: 24px;
            width: 90%;
            max-width: 380px;
            padding: 0 0 24px 0;
            box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
            direction: rtl;
            font-family: 'Cairo', sans-serif;
            overflow: hidden;
            transform: scale(.85) translateY(30px);
            transition: transform .35s cubic-bezier(.34,1.56,.64,1);
            text-align: center;
        }
        #callNotifyOverlay.show #callNotifyBox {
            transform: scale(1) translateY(0);
        }
        #callNotifyHeader {
            background: linear-gradient(135deg, #ef4444, #b91c1c);
            padding: 20px;
            position: relative;
            overflow: hidden;
        }
        #callNotifyHeader::before {
            content: '';
            position: absolute;
            top: -40px; right: -40px;
            width: 120px; height: 120px;
            border-radius: 50%;
            background: rgba(255,255,255,0.07);
        }
        #callNotifyHeader::after {
            content: '';
            position: absolute;
            bottom: -30px; left: -20px;
            width: 90px; height: 90px;
            border-radius: 50%;
            background: rgba(255,255,255,0.05);
        }
        .call-pulse-icon {
            width: 80px;
            height: 80px;
            background: rgba(255,255,255,0.15);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: #fff;
            margin: 0 auto 12px;
            position: relative;
            z-index: 1;
            animation: callPulse 1.5s infinite;
        }
        @keyframes callPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
            50% { box-shadow: 0 0 0 18px rgba(255,255,255,0); }
        }
        .call-comm-name {
            color: #fff;
            font-size: 20px;
            font-weight: 800;
            position: relative;
            z-index: 1;
        }
        .call-sub {
            color: rgba(255,255,255,0.8);
            font-size: 13px;
            position: relative;
            z-index: 1;
            margin-top: 4px;
        }
        #callNotifyBody {
            padding: 20px 24px 4px;
        }
        .call-starter-row {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(255,255,255,0.06);
            border-radius: 14px;
            padding: 12px 14px;
            margin-bottom: 4px;
        }
        .call-starter-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(99,179,237,0.5);
        }
        .call-starter-name {
            color: #e2e8f0;
            font-weight: 700;
            font-size: 15px;
        }
        .call-starter-label {
            color: #94a3b8;
            font-size: 12px;
        }
        #callNotifyActions {
            display: flex;
            gap: 12px;
            padding: 16px 24px 0;
        }
        .call-btn-join {
            flex: 1;
            background: linear-gradient(135deg, #10b981, #059669);
            color: #fff;
            border: none;
            border-radius: 14px;
            padding: 14px;
            font-family: 'Cairo', sans-serif;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: filter .15s, transform .1s;
            box-shadow: 0 4px 15px rgba(16,185,129,0.4);
        }
        .call-btn-join:hover { filter: brightness(1.1); }
        .call-btn-join:active { transform: scale(.97); }
        .call-btn-decline {
            flex: 1;
            background: rgba(255,255,255,0.08);
            color: #94a3b8;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 14px;
            padding: 14px;
            font-family: 'Cairo', sans-serif;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: background .15s, transform .1s;
        }
        .call-btn-decline:hover { background: rgba(255,255,255,0.14); }
        .call-btn-decline:active { transform: scale(.97); }
        .call-timer {
            color: #64748b;
            font-size: 12px;
            margin-top: 14px;
            padding: 0 24px;
        }
        /* بادج مكالمة نشطة في عنوان المجتمع */
        .active-call-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: #fff;
            font-size: 12px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 20px;
            margin-right: 8px;
            animation: liveBlink 2s infinite;
            cursor: pointer;
        }
        @keyframes liveBlink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        .active-call-badge i { font-size: 10px; }
    `;
    document.head.appendChild(style);
})();

// ─────────────────────────────────────────────
// إنشاء HTML إشعار المكالمة مرة واحدة
// ─────────────────────────────────────────────
(function createCallNotifyDOM() {
    const overlay = document.createElement('div');
    overlay.id = 'callNotifyOverlay';
    overlay.innerHTML = `
        <div id="callNotifyBox">
            <div id="callNotifyHeader">
                <div class="call-pulse-icon"><i class="fas fa-video"></i></div>
                <div class="call-comm-name" id="callNotifyCommName">مجتمع</div>
                <div class="call-sub">مكالمة فيديو جماعية جارية</div>
            </div>
            <div id="callNotifyBody">
                <div class="call-starter-row">
                    <img id="callNotifyAvatar" class="call-starter-avatar" src="">
                    <div style="text-align:right;">
                        <div class="call-starter-name" id="callNotifyStarterName"></div>
                        <div class="call-starter-label">بدأ مكالمة فيديو — انضم الآن!</div>
                    </div>
                </div>
            </div>
            <div id="callNotifyActions">
                <button class="call-btn-join" id="callNotifyJoinBtn">
                    <i class="fas fa-video"></i> انضمام
                </button>
                <button class="call-btn-decline" id="callNotifyDeclineBtn">
                    رفض
                </button>
            </div>
            <div class="call-timer" id="callNotifyTimer">سيتم إغلاق هذا الإشعار تلقائياً بعد <span id="callCountdown">30</span> ثانية</div>
        </div>
    `;
    document.body.appendChild(overlay);
})();

// ─────────────────────────────────────────────
// عرض إشعار المكالمة للأعضاء
// ─────────────────────────────────────────────
let callCountdownInterval = null;

const showCallNotification = (callData, commId) => {
    const overlay = document.getElementById('callNotifyOverlay');
    if (!overlay) return;

    const starterData = window.allUsersData?.[callData.startedBy] || {};
    const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

    document.getElementById('callNotifyCommName').innerText = callData.communityName || 'مجتمع';
    document.getElementById('callNotifyStarterName').innerText = callData.startedByName || callData.startedBy;
    document.getElementById('callNotifyAvatar').src = starterData.profilePic || dA;

    // عداد تنازلي 30 ثانية
    let countdown = 30;
    document.getElementById('callCountdown').innerText = countdown;
    clearInterval(callCountdownInterval);
    callCountdownInterval = setInterval(() => {
        countdown--;
        const el = document.getElementById('callCountdown');
        if (el) el.innerText = countdown;
        if (countdown <= 0) {
            clearInterval(callCountdownInterval);
            hideCallNotification();
        }
    }, 1000);

    // زر الانضمام
    document.getElementById('callNotifyJoinBtn').onclick = () => {
        clearInterval(callCountdownInterval);
        hideCallNotification();
        joinExistingCall(callData.roomId, callData.communityName || 'المجتمع', commId);
    };

    // زر الرفض
    document.getElementById('callNotifyDeclineBtn').onclick = () => {
        clearInterval(callCountdownInterval);
        hideCallNotification();
    };

    overlay.classList.add('show');
    // اهتزاز الهاتف (إن دعمه المتصفح)
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    // إشعار المتصفح
    if (Notification.permission === 'granted') {
        new Notification(`مكالمة فيديو في ${callData.communityName || 'مجتمع'}`, {
            body: `${callData.startedByName} يدعوك للانضمام إلى مكالمة فيديو`,
            icon: starterData.profilePic || dA,
            tag: 'community-call'
        });
    }
};

const hideCallNotification = () => {
    const overlay = document.getElementById('callNotifyOverlay');
    if (overlay) overlay.classList.remove('show');
};

// ─────────────────────────────────────────────
// الاستماع لمكالمات المجتمعات التي ينتمي إليها المستخدم
// ─────────────────────────────────────────────
window.startListeningForCalls = () => {
    if (!window.currentUser || !window.allCommunities) return;

    // توقف عن الاستماع السابق
    if (callNotifyUnsubscribe) {
        callNotifyUnsubscribe();
        callNotifyUnsubscribe = null;
    }

    const callsRef = ref(db, 'communityCalls');
    const handler = onValue(callsRef, (snapshot) => {
        if (!snapshot.exists()) return;
        const now = Date.now();
        snapshot.forEach((commSnap) => {
            const commId = commSnap.key;
            const data = commSnap.val();
            if (!data || !data.active || !data.roomId) return;
            // تجاهل المكالمات القديمة (أكثر من ساعة)
            if (now - data.startTime > 3600000) return;
            // تأكد أن المستخدم عضو في هذا المجتمع
            const comm = window.allCommunities[commId];
            if (!comm || !comm.members || !comm.members[window.currentUser]) return;
            // لا تُظهر الإشعار لمن بدأ المكالمة
            if (data.startedBy === window.currentUser) return;
            // تأكد أن المكالمة جديدة (أقل من 60 ثانية)
            if (now - data.startTime > 60000) return;

            showCallNotification({ ...data, communityName: comm.name }, commId);
        });
    });

    // حفظ دالة إلغاء الاستماع
    callNotifyUnsubscribe = () => off(callsRef, 'value', handler);
};

// ─────────────────────────────────────────────
// بدء مكالمة جديدة في المجتمع
// ─────────────────────────────────────────────
window.startCommunityCall = async (commId, commName) => {
    if (!window.currentUser) return window.dlgAlert("يجب تسجيل الدخول أولاً", "warning");

    // جلب بيانات المجتمع — من الذاكرة أو Firebase مباشرة
    let community = window.allCommunities?.[commId];
    if (!community) {
        try {
            const snap = await get(ref(db, `communities/${commId}`));
            if (snap.exists()) {
                community = snap.val();
                // حفظها في الذاكرة للمرات القادمة
                if (window.allCommunities) window.allCommunities[commId] = community;
            }
        } catch(e) {}
    }
    if (!community) return window.dlgAlert("المجتمع غير موجود", "danger");

    // استخدم الاسم الممرر أو من البيانات المجلوبة
    const resolvedName = commName || community.name || commId;

    const isMember = community.members?.[window.currentUser];
    if (!isMember && community.admin !== window.currentUser)
        return window.dlgAlert("أنت لست عضواً في هذا المجتمع", "warning");

    const userName = window.allUsersData?.[window.currentUser]?.displayName || window.currentUser;
    const callRef  = ref(db, `communityCalls/${commId}`);

    // هل يوجد اجتماع نشط؟
    const snapshot = await get(callRef);
    if (snapshot.exists()) {
        const ex = snapshot.val();
        if (ex.active && ex.roomId && (Date.now() - ex.startTime < 3600000)) {
            const join = await window.dlgConfirm(
                `يوجد اجتماع نشط بدأه ${ex.startedByName || 'أحد الأعضاء'}، هل تريد الانضمام؟`,
                "اجتماع نشط", "question", "انضمام"
            );
            if (join) openJitsiMeeting(ex.roomId, resolvedName, userName, commId);
            return;
        }
    }

    // إنشاء غرفة جديدة
    const roomId = `Mogtam3_${commId}_${Date.now()}`;

    // حفظ بيانات المكالمة في Firebase → يُطلق الإشعار تلقائياً لباقي الأعضاء
    await set(callRef, {
        roomId,
        startedBy: window.currentUser,
        startedByName: userName,
        startTime: Date.now(),
        active: true,
        communityId: commId,
        communityName: resolvedName
    });

    // تنظيف تلقائي بعد ساعة
    setTimeout(() => {
        get(callRef).then(s => {
            if (s.exists() && s.val().roomId === roomId) remove(callRef);
        });
    }, 3600000);

    // فتح الاجتماع مباشرة
    openJitsiMeeting(roomId, resolvedName, userName, commId);
};

// ─────────────────────────────────────────────
// الانضمام لمكالمة موجودة
// ─────────────────────────────────────────────
const joinExistingCall = (roomId, commName, commId) => {
    const userName = window.allUsersData?.[window.currentUser]?.displayName || window.currentUser;
    openJitsiMeeting(roomId, commName, userName, commId);
};

window.joinActiveCommunityCall = async (commId) => {
    if (!window.currentUser) return window.dlgAlert("يجب تسجيل الدخول أولاً", "warning");
    const snapshot = await get(ref(db, `communityCalls/${commId}`));
    if (snapshot.exists()) {
        const call = snapshot.val();
        if (call.active && call.roomId) {
            const comm = window.allCommunities?.[commId];
            joinExistingCall(call.roomId, comm?.name || 'المجتمع', commId);
            return;
        }
    }
    window.dlgAlert("لا يوجد اجتماع نشط حالياً", "info", "لا يوجد اجتماع");
};

// ─────────────────────────────────────────────
// فتح نافذة Jitsi
// ─────────────────────────────────────────────
const openJitsiMeeting = (roomId, commName, userName, commId) => {
    // إغلاق أي اجتماع مفتوح
    if (activeJitsiApi) { try { activeJitsiApi.dispose(); } catch(e) {} activeJitsiApi = null; }
    if (currentMeetingModal) { currentMeetingModal.remove(); currentMeetingModal = null; }

    const modal = document.createElement('div');
    modal.id = 'jitsiMeetingModal';
    modal.style.cssText = `
        position:fixed; top:0; left:0; width:100%; height:100%;
        background:#111827; z-index:10000;
        display:flex; flex-direction:column;
    `;

    modal.innerHTML = `
        <div id="jitsiToolbar" style="
            background:rgba(0,0,0,0.92); padding:12px 16px;
            display:flex; justify-content:space-between; align-items:center;
            gap:10px; flex-wrap:wrap; z-index:10001;
            border-bottom:1px solid rgba(255,255,255,0.08);
        ">
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:36px; height:36px; background:#ef4444; border-radius:50%;
                    display:flex; align-items:center; justify-content:center;">
                    <i class="fas fa-video" style="color:#fff; font-size:15px;"></i>
                </div>
                <div>
                    <div style="color:#fff; font-weight:800; font-size:15px;">${commName || 'اجتماع المجتمع'}</div>
                    <div style="color:#94a3b8; font-size:12px;" id="callDurationLabel">جاري الاتصال...</div>
                </div>
                <span id="participantsCount" style="
                    background:#1e293b; border:1px solid #334155;
                    padding:4px 10px; border-radius:20px; font-size:12px; color:#94a3b8;
                "><i class="fas fa-users" style="margin-left:4px;"></i><span id="partCountNum">0</span> مشارك</span>
            </div>
            <button id="exitMeetingBtn" style="
                background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff;
                border:none; padding:10px 20px; border-radius:10px; cursor:pointer;
                font-family:inherit; font-weight:700; font-size:14px;
                display:flex; align-items:center; gap:8px;
                box-shadow:0 4px 15px rgba(239,68,68,0.4);
            "><i class="fas fa-phone-slash"></i> إنهاء المكالمة</button>
        </div>
        <div id="jitsi-container" style="flex:1; width:100%; background:#000;"></div>
    `;

    document.body.appendChild(modal);
    currentMeetingModal = modal;
    document.body.style.overflow = 'hidden';

    // عداد مدة المكالمة
    let callSeconds = 0;
    const durationInterval = setInterval(() => {
        callSeconds++;
        const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
        const s = String(callSeconds % 60).padStart(2, '0');
        const el = document.getElementById('callDurationLabel');
        if (el) el.innerText = `${m}:${s}`;
    }, 1000);

    // زر الخروج
    document.getElementById('exitMeetingBtn').onclick = () => {
        window.dlgConfirm("هل تريد إنهاء المكالمة؟", "إنهاء المكالمة", "question", "نعم").then(ok => {
            if (ok) { clearInterval(durationInterval); closeMeeting(commId); }
        });
    };

    // تحميل مكتبة Jitsi
    const loadJitsi = () => new Promise((resolve, reject) => {
        if (typeof JitsiMeetExternalAPI !== 'undefined') return resolve();
        const s = document.createElement('script');
        s.src = `https://${window.JITSI_DOMAIN}/external_api.js`;
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
    });

    loadJitsi().then(() => {
        activeJitsiApi = new JitsiMeetExternalAPI(window.JITSI_DOMAIN, {
            roomName: roomId,
            width: '100%',
            height: '100%',
            parentNode: document.getElementById('jitsi-container'),
            userInfo: { displayName: userName, email: `${window.currentUser}@mogtam3.com` },
            configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                disableDeepLinking: true,
                prejoinPageEnabled: false,
                enableWelcomePage: false,
                enableClosePage: false,
                defaultLanguage: 'ar',
                disableRemoteControl: true,
                resolution: 720
            },
            interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                SHOW_BRAND_WATERMARK: false,
                SHOW_POWERED_BY: false,
                MOBILE_APP_PROMO: false,
                NATIVE_APP_PROMO: false,
                TOOLBAR_BUTTONS: ['microphone','camera','desktop','fullscreen','hangup','chat','raisehand','tileview'],
                DEFAULT_REMOTE_DISPLAY_NAME: 'عضو'
            }
        });

        const updateCount = () => {
            if (!activeJitsiApi) return;
            try {
                const n = activeJitsiApi.getParticipantsInfo()?.length || 0;
                const el = document.getElementById('partCountNum');
                if (el) el.innerText = n;
            } catch(e) {}
        };

        activeJitsiApi.addEventListener('videoConferenceJoined', updateCount);
        activeJitsiApi.addEventListener('participantJoined', updateCount);
        activeJitsiApi.addEventListener('participantLeft', updateCount);
        activeJitsiApi.addEventListener('videoConferenceLeft', () => {
            clearInterval(durationInterval);
            closeMeeting(commId);
        });

        setInterval(updateCount, 5000);

    }).catch(() => {
        window.dlgAlert("حدث خطأ في تحميل غرفة الاجتماع، يرجى المحاولة مجدداً.", "danger", "خطأ");
        clearInterval(durationInterval);
        closeMeeting(commId);
    });
};

// ─────────────────────────────────────────────
// إغلاق المكالمة
// ─────────────────────────────────────────────
const closeMeeting = async (commId) => {
    if (activeJitsiApi) { try { activeJitsiApi.dispose(); } catch(e) {} activeJitsiApi = null; }
    if (currentMeetingModal) { currentMeetingModal.remove(); currentMeetingModal = null; }
    document.body.style.overflow = 'auto';

    // حذف بيانات المكالمة من Firebase إذا كان المستخدم هو من بدأها
    if (commId) {
        try {
            const snapshot = await get(ref(db, `communityCalls/${commId}`));
            if (snapshot.exists() && snapshot.val().startedBy === window.currentUser) {
                await remove(ref(db, `communityCalls/${commId}`));
            }
        } catch(e) {}
    }
};

window.closeMeeting = closeMeeting;

// ─────────────────────────────────────────────
// تحديث واجهة المجتمع — أزرار المكالمة + بادج نشط
// ─────────────────────────────────────────────
window.updateCommunityCallUI = (commId, commData) => {
    const actionsDiv = document.getElementById('communityHeaderActions');
    if (!actionsDiv) return;

    // أزل الأزرار القديمة
    ['startCallBtn','joinCallBtn','activeCallBadge'].forEach(id => {
        document.getElementById(id)?.remove();
    });

    // استخدم البيانات الممررة مباشرةً أو ابحث عنها كاحتياط
    const comm = commData || window.allCommunities?.[commId];
    const commName = comm?.name || commId;

    // زر بدء مكالمة
    const callBtn = document.createElement('button');
    callBtn.id = 'startCallBtn';
    callBtn.className = 'btn-primary';
    callBtn.style.cssText = 'background:linear-gradient(135deg,#ef4444,#dc2626); border-color:#ef4444; color:#fff; margin-left:8px; display:flex; align-items:center; gap:6px;';
    callBtn.innerHTML = '<i class="fas fa-video"></i> مكالمة فيديو';
    callBtn.onclick = () => window.startCommunityCall(commId, commName);
    actionsDiv.insertBefore(callBtn, actionsDiv.firstChild);

    // فحص مكالمة نشطة وعرض البادج
    get(ref(db, `communityCalls/${commId}`)).then(snap => {
        if (!snap.exists()) return;
        const call = snap.val();
        if (!call.active || Date.now() - call.startTime > 3600000) return;

        const badge = document.createElement('span');
        badge.id = 'activeCallBadge';
        badge.className = 'active-call-badge';
        badge.innerHTML = '<i class="fas fa-circle"></i> مكالمة نشطة — انضم';
        badge.onclick = () => window.joinActiveCommunityCall(commId);

        const titleEl = document.getElementById('communityViewTitle');
        if (titleEl) titleEl.parentNode.insertBefore(badge, titleEl.nextSibling);
    });
};
