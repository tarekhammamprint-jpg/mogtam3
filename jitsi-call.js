// =============== نظام المكالمات الجماعية باستخدام Jitsi ===============
// ملف: jitsi-call.js

let activeJitsiApi = null;
let currentMeetingModal = null;

window.JITSI_DOMAIN = 'meet.jit.si';
window.JITSI_SERVER_TYPE = 'public';

// دالة لبدء اجتماع في المجتمع
window.startCommunityCall = async (commId, commName) => {
    if (!window.currentUser) {
        window.dlgAlert("يجب تسجيل الدخول أولاً", "warning");
        return false;
    }
    
    const userName = window.allUsersData[window.currentUser]?.displayName || window.currentUser;
    const userEmail = `${window.currentUser}@mogtam3.com`;
    const roomId = `mogtam3_comm_${commId}_${Date.now()}`;
    
    // التحقق من صلاحية العضو في المجتمع — مع جلب من Firebase كاحتياط
    let community = window.allCommunities && window.allCommunities[commId];
    if (!community) {
        try {
            const commSnap = await get(ref(db, `communities/${commId}`));
            if (commSnap.exists()) {
                community = commSnap.val();
                if (!window.allCommunities) window.allCommunities = {};
                window.allCommunities[commId] = community;
            }
        } catch(e) {}
    }
    if (!community) {
        window.dlgAlert("المجتمع غير موجود", "danger");
        return false;
    }
    
    const isMember = community.members && community.members[window.currentUser];
    if (!isMember && community.admin !== window.currentUser) {
        window.dlgAlert("أنت لست عضواً في هذا المجتمع", "warning");
        return false;
    }
    
    // التحقق من وجود اجتماع نشط
    try {
        const callRef = ref(db, `communityCalls/${commId}/active`);
        const snapshot = await get(callRef);
        let existingCall = snapshot.exists() ? snapshot.val() : null;
        
        if (existingCall && existingCall.active && (Date.now() - existingCall.startTime < 3600000)) {
            const join = await window.dlgConfirm(`يوجد اجتماع نشط بدأه ${existingCall.startedByName || 'أحد الأعضاء'}، هل تريد الانضمام؟`, "اجتماع نشط", "question");
            if (join) {
                openJitsiMeeting(existingCall.roomId, commName || window.currentCommunityName, userName, userEmail);
                return true;
            }
            return false;
        }
        
        await set(callRef, {
            roomId: roomId,
            startedBy: window.currentUser,
            startedByName: userName,
            startTime: Date.now(),
            active: true,
            communityId: commId
        });
        
        setTimeout(async () => {
            const currentCall = await get(callRef);
            if (currentCall.exists() && currentCall.val().roomId === roomId) {
                await remove(callRef);
            }
        }, 3600000);
        
    } catch(e) {
        console.error('خطأ في حفظ بيانات الاجتماع:', e);
    }
    
    openJitsiMeeting(roomId, commName || community.name || window.currentCommunityName, userName, userEmail);
    return true;
};

// ── فتح نافذة Jitsi عبر iframe — يعمل على الهاتف والحاسوب بدون تطبيق ──
const openJitsiMeeting = (roomId, commName, userName, userEmail) => {
    if (currentMeetingModal) { currentMeetingModal.remove(); currentMeetingModal = null; }
    activeJitsiApi = null;

    // config.disableDeepLinking=true هو المفتاح لمنع طلب تطبيق الهاتف
    const displayName = encodeURIComponent(userName || 'عضو');
    const jitsiUrl = `https://${window.JITSI_DOMAIN}/${roomId}`
        + `#config.disableDeepLinking=true`
        + `&config.prejoinPageEnabled=false`
        + `&config.enableWelcomePage=false`
        + `&config.startWithAudioMuted=false`
        + `&config.startWithVideoMuted=false`
        + `&config.defaultLanguage="ar"`
        + `&interfaceConfig.SHOW_JITSI_WATERMARK=false`
        + `&interfaceConfig.SHOW_BRAND_WATERMARK=false`
        + `&interfaceConfig.MOBILE_APP_PROMO=false`
        + `&interfaceConfig.NATIVE_APP_PROMO=false`
        + `&interfaceConfig.SHOW_DEEP_LINKING_IMAGE=false`
        + `&userInfo.displayName=${displayName}`;

    const modal = document.createElement('div');
    modal.id = 'jitsiMeetingModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#111;z-index:10000;display:flex;flex-direction:column;';

    modal.innerHTML = `
        <div style="background:rgba(0,0,0,0.95);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:32px;height:32px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-video" style="color:#fff;font-size:13px;"></i>
                </div>
                <div>
                    <div style="color:#fff;font-weight:800;font-size:14px;font-family:'Cairo',sans-serif;">${commName || 'مكالمة المجتمع'}</div>
                    <div id="jitsiCallTimer" style="color:#94a3b8;font-size:11px;font-family:'Cairo',sans-serif;">00:00</div>
                </div>
            </div>
            <button id="exitMeetingBtn" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;padding:9px 16px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px;">
                <i class="fas fa-phone-slash"></i> إنهاء
            </button>
        </div>
        <iframe
            id="jitsiIframe"
            src="${jitsiUrl}"
            allow="camera; microphone; display-capture; fullscreen; autoplay; clipboard-write"
            allowfullscreen="true"
            style="flex:1;width:100%;border:none;background:#000;"
        ></iframe>
    `;

    document.body.appendChild(modal);
    currentMeetingModal = modal;
    document.body.style.overflow = 'hidden';

    // عداد مدة المكالمة
    let secs = 0;
    const timerInterval = setInterval(() => {
        secs++;
        const m = String(Math.floor(secs / 60)).padStart(2, '0');
        const s = String(secs % 60).padStart(2, '0');
        const el = document.getElementById('jitsiCallTimer');
        if (el) el.innerText = `${m}:${s}`;
    }, 1000);
    modal._timerInterval = timerInterval;

    document.getElementById('exitMeetingBtn').onclick = () => {
        window.dlgConfirm("هل تريد إنهاء المكالمة؟", "إنهاء المكالمة", "question", "نعم").then(ok => {
            if (ok) { clearInterval(timerInterval); closeMeeting(); }
        });
    };
};

// دالة لإغلاق الاجتماع
const closeMeeting = () => {
    if (activeJitsiApi) {
        try { activeJitsiApi.dispose(); } catch(e) {}
        activeJitsiApi = null;
    }
    if (currentMeetingModal) {
        if (currentMeetingModal._timerInterval) clearInterval(currentMeetingModal._timerInterval);
        currentMeetingModal.remove();
        currentMeetingModal = null;
    }
    document.body.style.overflow = 'auto';
};

// دالة للانضمام إلى اجتماع نشط
window.joinActiveCommunityCall = async (commId) => {
    if (!window.currentUser) {
        window.dlgAlert("يجب تسجيل الدخول أولاً", "warning");
        return;
    }
    try {
        const callRef = ref(db, `communityCalls/${commId}/active`);
        const snapshot = await get(callRef);
        if (snapshot.exists()) {
            const call = snapshot.val();
            if (call.active && call.roomId) {
                const userName = window.allUsersData[window.currentUser]?.displayName || window.currentUser;
                const userEmail = `${window.currentUser}@mogtam3.com`;
                const community = (window.allCommunities && window.allCommunities[commId]) || {};
                openJitsiMeeting(call.roomId, community?.name || window.currentCommunityName || 'المجتمع', userName, userEmail);
                return true;
            }
        }
        window.dlgAlert("لا يوجد اجتماع نشط حالياً", "info", "لا يوجد اجتماع");
        return false;
    } catch(e) {
        console.error(e);
        return false;
    }
};

// إضافة زر بدء الاجتماع في واجهة المجتمع
const enhanceCommunityView = (commId) => {
    setTimeout(() => {
        const actionsDiv = document.getElementById('communityHeaderActions');
        if (actionsDiv && !document.getElementById('startCallBtn')) {
            const callBtn = document.createElement('button');
            callBtn.id = 'startCallBtn';
            callBtn.className = 'btn-primary';
            callBtn.style.cssText = 'background:#ef4444; color:#fff; margin-left:8px;';
            callBtn.innerHTML = '<i class="fas fa-video"></i> بدء اجتماع';

            const joinBtn = document.createElement('button');
            joinBtn.id = 'joinCallBtn';
            joinBtn.className = 'btn-secondary';
            joinBtn.style.cssText = 'background:#10b981; color:#fff; margin-left:8px;';
            joinBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> انضمام';

            const comm = window.allCommunities && window.allCommunities[commId];
            const commName = comm?.name || window.currentCommunityName || commId;
            callBtn.onclick = () => window.startCommunityCall(commId, commName);
            joinBtn.onclick = () => window.joinActiveCommunityCall(commId);

            if (actionsDiv.firstChild) {
                actionsDiv.insertBefore(callBtn, actionsDiv.firstChild);
                actionsDiv.insertBefore(joinBtn, actionsDiv.firstChild.nextSibling);
            } else {
                actionsDiv.appendChild(callBtn);
                actionsDiv.appendChild(joinBtn);
            }
        }
    }, 200);
};

if (typeof window.renderCommunityFeed === 'function') {
    const originalRenderCommunityFeed = window.renderCommunityFeed;
    window.renderCommunityFeed = (commId) => {
        originalRenderCommunityFeed(commId);
        enhanceCommunityView(commId);
    };
}

window.closeMeeting = closeMeeting;

// دالة لعرض حالة الاجتماعات النشطة
window.showActiveCalls = async () => {
    if (!window.currentUser) return;
    const callsRef = ref(db, 'communityCalls');
    const snapshot = await get(callsRef);
    if (!snapshot.exists()) return;
    const calls = snapshot.val();
    const activeCalls = [];
    const now = Date.now();
    for (const [commId, data] of Object.entries(calls)) {
        if (data.active && data.roomId && (now - data.startTime < 3600000)) {
            const community = window.allCommunities && window.allCommunities[commId];
            if (community && community.members && community.members[window.currentUser]) {
                activeCalls.push({ commId, commName: community.name, startedBy: data.startedByName || data.startedBy, startTime: data.startTime });
            }
        }
    }
    if (activeCalls.length > 0) {
        let msg = 'هناك اجتماعات نشطة حالياً:\n';
        activeCalls.forEach(call => { msg += `\n📹 ${call.commName} (بدأ بواسطة ${call.startedBy})`; });
        msg += '\n\nهل تريد الانضمام؟';
        const join = await window.dlgConfirm(msg, "اجتماعات نشطة", "info", "انضمام");
        if (join && activeCalls[0]) await window.joinActiveCommunityCall(activeCalls[0].commId);
    }
};

if (window.currentUser) {
    setInterval(() => {
        if (document.visibilityState === 'visible') window.showActiveCalls();
    }, 60000);
}
