import { ref, get, set, remove, push, onValue, off } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

// =============== نظام مكالمات الفيديو — Metered.ca ===============
const METERED_DOMAIN = 'eslam.metered.live';

let meeting = null;
let localStream = null;
let callModal = null;
let callNotifyUnsub = null;
let currentCommId = null;
let currentCallRole = 'listener';
let currentCommentsUnsub = null;

const chooseBroadcastAccess = () => new Promise(resolve => {
    const old = document.getElementById('broadcastAccessChoice'); old?.remove();
    const el = document.createElement('div'); el.id='broadcastAccessChoice'; el.style.cssText='position:fixed;inset:0;z-index:2147483005;background:rgba(15,23,42,.78);display:flex;align-items:center;justify-content:center;padding:18px;direction:rtl;';
    el.innerHTML='<div style="background:#fff;border-radius:18px;padding:24px;max-width:390px;width:100%;text-align:center;font-family:Cairo,sans-serif"><div style="font-size:28px;color:#2563eb;margin-bottom:8px"><i class="fas fa-broadcast-tower"></i></div><h3 style="margin:0 0 7px">اختر جمهور البث</h3><p style="font-size:13px;color:#64748b;line-height:1.7">هل تريد أن يكون الدرس متاحًا لكل أعضاء المجتمع أم للمشتركين المدفوعين فقط؟</p><div style="display:flex;gap:9px;margin-top:16px"><button id="broadcastFreeBtn" style="flex:1;padding:12px;border:1px solid #10b981;background:#ecfdf5;color:#047857;border-radius:10px;font-family:inherit;font-weight:800;cursor:pointer"><i class="fas fa-globe"></i><br>مجاني للأعضاء</button><button id="broadcastPaidBtn" style="flex:1;padding:12px;border:1px solid #f59e0b;background:#fffbeb;color:#b45309;border-radius:10px;font-family:inherit;font-weight:800;cursor:pointer"><i class="fas fa-crown"></i><br>للمشتركين فقط</button></div><button id="broadcastCancelBtn" style="margin-top:12px;background:none;border:0;color:#64748b;cursor:pointer;font-family:inherit">إلغاء</button></div>';
    document.body.appendChild(el); const close=v=>{el.remove();resolve(v)}; document.getElementById('broadcastFreeBtn').onclick=()=>close('free'); document.getElementById('broadcastPaidBtn').onclick=()=>close('paid'); document.getElementById('broadcastCancelBtn').onclick=()=>close(null);
});

window.sendLiveComment = async () => { const input=document.getElementById('vcCommentInput'); const txt=input?.value.trim(); if(!txt||!currentCommId||!window.currentUser)return; await push(ref(db,`communityLiveComments/${currentCommId}`),{author:window.currentUser,text:txt,timestamp:Date.now()}); input.value=''; };

// ══════════════════════════════════════════════
// CSS النظام
// ══════════════════════════════════════════════
(function injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
    #videoCallModal {
        position:fixed;inset:0;z-index:10000;
        background:#0a0f1e;display:flex;flex-direction:column;
        font-family:'Cairo',sans-serif;direction:rtl;
    }
    #vcToolbar {
        background:#0f172a;padding:10px 16px;
        display:flex;justify-content:space-between;align-items:center;
        border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0;
    }
    #vcGrid {
        flex:1;display:grid;gap:4px;padding:4px;
        background:#0a0f1e;overflow:hidden;
    }
    .vc-tile {
        background:#1e293b;border-radius:12px;overflow:hidden;
        position:relative;display:flex;align-items:center;justify-content:center;
    }
    .vc-tile video { width:100%;height:100%;object-fit:cover; }
    .vc-tile-name {
        position:absolute;bottom:8px;right:10px;
        background:rgba(0,0,0,0.6);color:#fff;
        font-size:12px;font-weight:700;padding:3px 8px;border-radius:8px;
    }
    .vc-tile-avatar {
        width:72px;height:72px;border-radius:50%;
        background:#334155;display:flex;align-items:center;justify-content:center;
        font-size:28px;color:#94a3b8;
    }
    #vcControls {
        background:#0f172a;padding:12px;
        display:flex;justify-content:center;gap:12px;flex-shrink:0;
        border-top:1px solid rgba(255,255,255,0.07);
    }
    .vc-btn {
        width:52px;height:52px;border-radius:50%;border:none;
        cursor:pointer;font-size:18px;transition:all .2s;
        display:flex;align-items:center;justify-content:center;
    }
    .vc-btn:hover { transform:scale(1.1); }
    .vc-btn.off { background:#ef4444;color:#fff; }
    .vc-btn.on  { background:#1e293b;color:#fff; }
    .vc-btn.end { background:#ef4444;color:#fff;width:60px;height:60px;font-size:20px; }

    /* إشعار المكالمة الواردة */
    #callIncomingOverlay {
        position:fixed;inset:0;z-index:10001;
        background:rgba(10,15,30,0.75);backdrop-filter:blur(8px);
        display:flex;align-items:center;justify-content:center;
        opacity:0;pointer-events:none;transition:opacity .3s;
    }
    #callIncomingOverlay.show { opacity:1;pointer-events:auto; }
    #callIncomingBox {
        background:linear-gradient(145deg,#0f1f3e,#1a3a5c);
        border:1px solid rgba(99,179,237,0.25);border-radius:24px;
        width:90%;max-width:360px;overflow:hidden;
        transform:scale(.85) translateY(20px);
        transition:transform .35s cubic-bezier(.34,1.56,.64,1);
        text-align:center;
    }
    #callIncomingOverlay.show #callIncomingBox { transform:scale(1) translateY(0); }
    .ci-header {
        background:linear-gradient(135deg,#1d4ed8,#1e40af);
        padding:24px 20px 20px;
    }
    .ci-pulse {
        width:76px;height:76px;border-radius:50%;
        background:rgba(255,255,255,0.15);
        display:flex;align-items:center;justify-content:center;
        font-size:30px;color:#fff;margin:0 auto 12px;
        animation:ciPulse 1.5s infinite;
    }
    @keyframes ciPulse {
        0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0.4)}
        50%{box-shadow:0 0 0 16px rgba(255,255,255,0)}
    }
    .ci-body { padding:20px; }
    .ci-actions { display:flex;gap:12px;padding:0 20px 20px; }
    .ci-btn-accept {
        flex:1;background:linear-gradient(135deg,#10b981,#059669);
        color:#fff;border:none;border-radius:14px;padding:14px;
        font-family:'Cairo',sans-serif;font-size:15px;font-weight:700;
        cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;
        box-shadow:0 4px 15px rgba(16,185,129,0.4);
    }
    .ci-btn-decline {
        flex:1;background:rgba(239,68,68,0.15);color:#ef4444;
        border:1px solid rgba(239,68,68,0.3);border-radius:14px;padding:14px;
        font-family:'Cairo',sans-serif;font-size:15px;font-weight:700;cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:8px;
    }
    .ci-countdown {
        color:#475569;font-size:12px;padding:0 20px 16px;
    }
    `;
    document.head.appendChild(s);
})();

// ══════════════════════════════════════════════
// إنشاء HTML إشعار المكالمة
// ══════════════════════════════════════════════
(function createIncomingCallDOM() {
    const el = document.createElement('div');
    el.id = 'callIncomingOverlay';
    el.innerHTML = `
        <div id="callIncomingBox">
            <div class="ci-header">
                <div class="ci-pulse"><i class="fas fa-video"></i></div>
                <div style="color:#fff;font-size:19px;font-weight:800;" id="ciCommName">مجتمع</div>
                <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px;">مكالمة فيديو جماعية</div>
            </div>
            <div class="ci-body">
                <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.05);border-radius:14px;padding:12px 14px;">
                    <img id="ciAvatar" src="" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(99,179,237,0.4);">
                    <div style="text-align:right;">
                        <div style="color:#e2e8f0;font-weight:700;font-size:15px;" id="ciStarterName"></div>
                        <div style="color:#64748b;font-size:12px;">بدأ مكالمة — انضم الآن</div>
                    </div>
                </div>
            </div>
            <div class="ci-actions">
                <button class="ci-btn-accept" id="ciAcceptBtn"><i class="fas fa-video"></i> انضمام</button>
                <button class="ci-btn-decline" id="ciDeclineBtn"><i class="fas fa-phone-slash"></i> رفض</button>
            </div>
            <div class="ci-countdown">سيُغلق تلقائياً خلال <span id="ciCountdown">30</span> ثانية</div>
        </div>
    `;
    document.body.appendChild(el);
})();

// ══════════════════════════════════════════════
// الاستماع لإشعارات المكالمات
// ══════════════════════════════════════════════
window.startCallListener = () => {
    if (!window.currentUser) return;
    if (callNotifyUnsub) { callNotifyUnsub(); callNotifyUnsub = null; }

    const callsRef = ref(db, 'communityCalls');
    const handler = onValue(callsRef, snap => {
        if (!snap.exists()) return;
        const now = Date.now();
        snap.forEach(commSnap => {
            const commId = commSnap.key;
            const data   = commSnap.val();
            if (!data?.roomName || !data.active) return;
            if (now - data.startTime > 60000) return; // أقدم من دقيقة → تجاهل
            const comm = window.allCommunities?.[commId];
            if (!comm?.members?.[window.currentUser]) return;
            if (data.startedBy === window.currentUser) return;
            showIncomingCall(data, commId);
        });
    });
    callNotifyUnsub = () => off(callsRef, 'value', handler);
};

// ══════════════════════════════════════════════
// عرض إشعار المكالمة الواردة
// ══════════════════════════════════════════════
let ciTimer = null;
const showIncomingCall = (data, commId) => {
    const overlay = document.getElementById('callIncomingOverlay');
    const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    const starter = window.allUsersData?.[data.startedBy] || {};

    document.getElementById('ciCommName').innerText    = data.communityName || 'مجتمع';
    document.getElementById('ciStarterName').innerText = data.startedByName || data.startedBy;
    document.getElementById('ciAvatar').src            = starter.profilePic || dA;

    let cd = 30;
    document.getElementById('ciCountdown').innerText = cd;
    clearInterval(ciTimer);
    ciTimer = setInterval(() => {
        cd--;
        const el = document.getElementById('ciCountdown');
        if (el) el.innerText = cd;
        if (cd <= 0) { clearInterval(ciTimer); hideIncomingCall(); }
    }, 1000);

    document.getElementById('ciAcceptBtn').onclick = () => {
        clearInterval(ciTimer); hideIncomingCall();
        joinCall(commId, data.roomName, data.communityName, 'listener', data.access || 'free');
    };
    document.getElementById('ciDeclineBtn').onclick = () => {
        clearInterval(ciTimer); hideIncomingCall();
    };

    overlay.classList.add('show');
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
};

const hideIncomingCall = () => {
    document.getElementById('callIncomingOverlay')?.classList.remove('show');
};

// ══════════════════════════════════════════════
// بدء مكالمة جديدة
// ══════════════════════════════════════════════
window.startCommunityCall = async (commId, commName) => {
    if (!window.currentUser) return window.dlgAlert("يجب تسجيل الدخول أولاً", "warning");

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

    if (community.admin !== window.currentUser)
        return window.dlgAlert("المسؤول فقط يستطيع بدء البث. يمكنك الدخول كمستمع والتعليق.", "warning", "صلاحية البث");

    const audience = await chooseBroadcastAccess();
    if (!audience) return;

    const resolvedName = commName || community.name || window.currentCommunityName || commId;
    const userName     = window.allUsersData?.[window.currentUser]?.displayName || window.currentUser;
    const callRef      = ref(db, `communityCalls/${commId}`);

    // هل يوجد اجتماع نشط؟
    const snap = await get(callRef);
    if (snap.exists()) {
        const ex = snap.val();
        if (ex.roomName && (Date.now() - ex.startTime < 3600000)) {
            const join = await window.dlgConfirm(
                `يوجد اجتماع نشط بدأه ${ex.startedByName || 'أحد الأعضاء'}، هل تريد الانضمام؟`,
                "اجتماع نشط", "question", "انضمام"
            );
            if (join) joinCall(commId, ex.roomName, resolvedName, 'host', ex.access || 'free');
            return;
        }
    }

    // إنشاء غرفة على Metered
    const btn = document.getElementById('startCallBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري...'; }

    try {
        // لا تُستدعَ واجهة Metered مباشرة من المتصفح؛ المفتاح السري يجب أن يبقى في API خادمي.
        throw new Error('video_calls_require_secure_server_endpoint');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const room = await res.json();
        const roomName = room.roomName;

        // حفظ في Firebase → يُطلق الإشعار لباقي الأعضاء تلقائياً
        await set(callRef, {
            roomName,
            startedBy: window.currentUser,
            startedByName: userName,
            startTime: Date.now(),
            active: true,
            access: audience,
            communityId: commId,
            communityName: resolvedName
        });

        // تنظيف بعد ساعة
        setTimeout(() => {
            get(callRef).then(s => { if (s.exists() && s.val().roomName === roomName) remove(callRef); });
        }, 3600000);

        joinCall(commId, roomName, resolvedName, 'host', audience);

    } catch(err) {
        console.error('Metered error:', err);
        const message = err.message === 'video_calls_require_secure_server_endpoint'
            ? 'تم إيقاف إنشاء المكالمات مؤقتاً لحماية مفتاح الخدمة. يلزم إعداد API خادمي آمن.'
            : `فشل إنشاء الغرفة: ${err.message}`;
        window.dlgAlert(message, "danger", "المكالمات غير مهيأة");
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-video"></i> بدء اجتماع'; }
    }
};

// ══════════════════════════════════════════════
// الانضمام لمكالمة
// ══════════════════════════════════════════════
window.joinActiveCommunityCall = async (commId) => {
    if (!window.currentUser) return window.dlgAlert("يجب تسجيل الدخول أولاً", "warning");
    try {
        const snap = await get(ref(db, `communityCalls/${commId}`));
        if (snap.exists()) {
            const call = snap.val();
            if (call.roomName && (Date.now() - call.startTime < 3600000)) {
                const comm = window.allCommunities?.[commId] || {};
                if (call.access === 'paid' && comm.admin !== window.currentUser && !comm.members?.[window.currentUser])
                    return window.dlgAlert("هذا البث متاح للمشتركين المدفوعين فقط.", "warning", "محتوى خاص");
                if (comm.admin !== window.currentUser && !comm.members?.[window.currentUser])
                    return window.dlgAlert("يجب أن تكون عضوًا في المجتمع للدخول إلى البث.", "warning");
                joinCall(commId, call.roomName, comm.name || window.currentCommunityName || 'المجتمع', comm.admin === window.currentUser ? 'host' : 'listener', call.access || 'free');
                return;
            }
        }
        window.dlgAlert("لا يوجد اجتماع نشط حالياً", "info", "لا يوجد اجتماع");
    } catch(e) { console.error(e); }
};

// ══════════════════════════════════════════════
// فتح نافذة المكالمة والانضمام
// ══════════════════════════════════════════════
const joinCall = async (commId, roomName, commName, role = 'listener', access = 'free') => {
    currentCommId = commId;
    currentCallRole = role;
    const userName = window.allUsersData?.[window.currentUser]?.displayName || window.currentUser;

    // إنشاء نافذة المكالمة
    document.getElementById('videoCallModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'videoCallModal';
    modal.innerHTML = `
        <div id="vcToolbar">
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:34px;height:34px;background:#1d4ed8;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-video" style="color:#fff;font-size:13px;"></i>
                </div>
                <div>
                    <div style="color:#fff;font-weight:800;font-size:14px;">${commName || 'مكالمة المجتمع'}</div>
                    <div id="vcTimer" style="color:#64748b;font-size:11px;">${role === 'host' ? 'أنت مقدم البث' : 'وضع المستمع — التعليقات متاحة'}</div>
                </div>
                <span id="vcPartCount" style="background:#1e293b;border:1px solid #334155;padding:3px 10px;border-radius:20px;font-size:12px;color:#94a3b8;margin-right:8px;">
                    <i class="fas fa-users" style="margin-left:4px;"></i><span id="vcPartNum">0</span>
                </span>
            </div>
            <button onclick="window.endCall()" style="background:#ef4444;color:#fff;border:none;padding:9px 16px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px;">
                <i class="fas fa-phone-slash"></i> إنهاء
            </button>
        </div>
        <div style="display:flex;flex:1;min-height:0;overflow:hidden;">
            <div id="vcGrid" style="flex:1;"></div>
            <aside id="vcCommentsPanel" style="width:290px;background:#0f172a;border-right:1px solid #1e293b;display:flex;flex-direction:column;color:#fff;">
                <div style="padding:12px;border-bottom:1px solid #1e293b;font-weight:800;font-size:13px"><i class="fas fa-comments"></i> تعليقات البث ${access==='paid'?'(للمشتركين)':'(مجاني)'}</div>
                <div id="vcComments" style="flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:7px"></div>
                <div style="display:flex;gap:6px;padding:9px;border-top:1px solid #1e293b"><input id="vcCommentInput" placeholder="اكتب تعليقًا..." style="flex:1;min-width:0;background:#1e293b;color:#fff;border:1px solid #334155;border-radius:9px;padding:8px;font-family:Cairo,sans-serif"><button onclick="window.sendLiveComment()" style="background:#2563eb;border:0;color:#fff;border-radius:9px;width:38px;cursor:pointer"><i class="fas fa-paper-plane"></i></button></div>
            </aside>
        </div>
            <div id="vcControls" style="${role === 'listener' ? 'display:none' : ''}">
            <button class="vc-btn on" id="btnMic" onclick="window.toggleMic()" title="كتم الصوت">
                <i class="fas fa-microphone"></i>
            </button>
            <button class="vc-btn on" id="btnCam" onclick="window.toggleCam()" title="إيقاف الكاميرا">
                <i class="fas fa-video"></i>
            </button>
            <button class="vc-btn end" onclick="window.endCall()" title="إنهاء">
                <i class="fas fa-phone-slash"></i>
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    callModal = modal;
    document.body.style.overflow = 'hidden';

    // عداد زمن
    let secs = 0;
    const vcTimerInterval = setInterval(() => {
        secs++;
        const el = document.getElementById('vcTimer');
        if (el) el.innerText = `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
    }, 1000);
    modal._timer = vcTimerInterval;

    if (currentCommentsUnsub) currentCommentsUnsub();
    currentCommentsUnsub = onValue(ref(db, `communityLiveComments/${commId}`), snap => {
        const box = document.getElementById('vcComments'); if (!box) return;
        let html = ''; if (snap.exists()) { let rows=[]; snap.forEach(x=>rows.push(x.val())); rows.sort((a,b)=>(a.timestamp||0)-(b.timestamp||0)); rows.slice(-100).forEach(x => { const name=window.getDisplayName?.(x.author)||x.author||'عضو'; html += `<div style="background:#1e293b;border-radius:9px;padding:7px 9px;font-size:12px;line-height:1.5"><strong style="color:#93c5fd">${name}</strong><div>${String(x.text||'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]))}</div></div>`; }); }
        box.innerHTML = html || '<div style="color:#64748b;text-align:center;padding:20px 5px;font-size:12px">ابدأ أول تعليق في البث.</div>'; box.scrollTop = box.scrollHeight;
    });

    // تحميل Metered SDK
    await loadMeteredSDK();

    meeting = new Metered.Meeting();

    // ── أحداث المشاركين ──
    // أحداث Metered SDK الصحيحة
    meeting.on('remoteTrackStarted', (trackItem) => {
        const p = trackItem.participant;
        const track = trackItem.track;
        if (!p || !track) return;
        const id = p.participantSessionId || p.id;
        let tile = document.getElementById(`tile-${id}`);
        if (!tile) {
            const stream = new MediaStream([track]);
            addRemoteTile(id, p.name || p.displayName || 'عضو', stream);
        } else {
            const video = tile.querySelector('video');
            if (video && video.srcObject) video.srcObject.addTrack(track);
        }
        updatePartCount();
    });

    meeting.on('remoteTrackStopped', (trackItem) => {
        const p = trackItem?.participant;
        if (!p) return;
        const id = p.participantSessionId || p.id;
        document.getElementById(`tile-${id}`)?.remove();
        updateGridLayout(); updatePartCount();
    });

    meeting.on('participantLeft', (p) => {
        const id = p?.participantSessionId || p?.id;
        if (id) document.getElementById(`tile-${id}`)?.remove();
        updateGridLayout(); updatePartCount();
    });

    meeting.on('onlineParticipants', (list) => {
        const el = document.getElementById('vcPartNum');
        if (el) el.innerText = Array.isArray(list) ? list.length : 0;
    });

    meeting.on('error', (err) => {
        console.error('Metered meeting error:', err);
    });

    // الانضمام
    try {
        // المسؤول مقدم البث؛ باقي الأعضاء يدخلون كمستمعين بلا كاميرا أو ميكروفون.
        let videoOk = false, audioOk = false;

        if (role === 'listener') {
            localStream = new MediaStream();
        } else try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            videoOk = true; audioOk = true;
        } catch(e1) {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                audioOk = true;
            } catch(e2) {
                try {
                    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                    videoOk = true;
                } catch(e3) {
                    // لا كاميرا ولا ميكروفون — ندخل كمشاهد
                    localStream = new MediaStream();
                }
            }
        }

        if (role === 'host') addLocalTile(localStream, userName);
        updateGridLayout();

        // الانضمام للغرفة
        await meeting.join({
            roomURL: `${METERED_DOMAIN}/${roomName}`,
            name: userName
        });

        // مشاركة المسارات المتاحة فقط
        const tracks = role === 'host' ? localStream.getTracks() : [];
        for (const track of tracks) {
            try {
                if (track.kind === 'video') await meeting.startVideo({ videoTrack: track });
                if (track.kind === 'audio') await meeting.startAudio({ audioTrack: track });
            } catch(te) {
                // جرب publishTracks كبديل
                try { await meeting.publishTracks([track]); } catch(te2) {
                    console.warn('Could not publish track:', track.kind, te2);
                }
            }
        }

    } catch(err) {
        console.error('Join error:', err);
        window.dlgAlert('فشل الانضمام: ' + (err.message || err.name || err), 'danger', 'خطأ');
        clearInterval(vcTimerInterval);
        modal.remove();
        document.body.style.overflow = 'auto';
    }
};

// ══════════════════════════════════════════════
// إدارة الـ Tiles (بطاقات الفيديو)
// ══════════════════════════════════════════════
const addLocalTile = (stream, name) => {
    const grid = document.getElementById('vcGrid');
    if (!grid || document.getElementById('tile-local')) return;
    const tile = document.createElement('div');
    tile.className = 'vc-tile';
    tile.id = 'tile-local';
    const video = document.createElement('video');
    video.autoplay = true; video.muted = true; video.playsInline = true;
    video.srcObject = stream;
    tile.appendChild(video);
    const nameEl = document.createElement('div');
    nameEl.className = 'vc-tile-name';
    nameEl.innerText = `${name} (أنت)`;
    tile.appendChild(nameEl);
    grid.appendChild(tile);
    updateGridLayout();
};

const addRemoteTile = (id, name, stream) => {
    const grid = document.getElementById('vcGrid');
    if (!grid || document.getElementById(`tile-${id}`)) return;
    const tile = document.createElement('div');
    tile.className = 'vc-tile';
    tile.id = `tile-${id}`;
    const video = document.createElement('video');
    video.autoplay = true; video.playsInline = true;
    video.srcObject = stream;
    tile.appendChild(video);
    const nameEl = document.createElement('div');
    nameEl.className = 'vc-tile-name';
    nameEl.innerText = name;
    tile.appendChild(nameEl);
    grid.appendChild(tile);
    updateGridLayout();
};

const updateGridLayout = () => {
    const grid = document.getElementById('vcGrid');
    if (!grid) return;
    const n = grid.children.length;
    if (n <= 1) grid.style.gridTemplateColumns = '1fr';
    else if (n <= 2) grid.style.gridTemplateColumns = '1fr 1fr';
    else if (n <= 4) grid.style.gridTemplateColumns = '1fr 1fr';
    else grid.style.gridTemplateColumns = 'repeat(3,1fr)';
};

const updatePartCount = () => {
    const grid = document.getElementById('vcGrid');
    const el = document.getElementById('vcPartNum');
    if (grid && el) el.innerText = grid.children.length;
};

// ══════════════════════════════════════════════
// أزرار التحكم
// ══════════════════════════════════════════════
let micOn = true, camOn = true;

window.toggleMic = async () => {
    if (!meeting) return;
    micOn = !micOn;
    micOn ? await meeting.unmuteMic() : await meeting.muteMic();
    const btn = document.getElementById('btnMic');
    if (btn) {
        btn.className = `vc-btn ${micOn ? 'on' : 'off'}`;
        btn.innerHTML = `<i class="fas fa-microphone${micOn ? '' : '-slash'}"></i>`;
    }
};

window.toggleCam = async () => {
    if (!meeting) return;
    camOn = !camOn;
    camOn ? await meeting.startVideo() : await meeting.stopVideo();
    const btn = document.getElementById('btnCam');
    if (btn) {
        btn.className = `vc-btn ${camOn ? 'on' : 'off'}`;
        btn.innerHTML = `<i class="fas fa-video${camOn ? '' : '-slash'}"></i>`;
    }
};

window.endCall = async () => {
    const ok = await window.dlgConfirm("هل تريد إنهاء المكالمة؟", "إنهاء", "question", "نعم");
    if (!ok) return;
    if (meeting) { try { await meeting.leaveMeeting(); } catch(e) {} meeting = null; }
    if (callModal) {
        if (callModal._timer) clearInterval(callModal._timer);
        callModal.remove(); callModal = null;
    }
    document.body.style.overflow = 'auto';
    micOn = true; camOn = true;
    if (currentCommentsUnsub) { currentCommentsUnsub(); currentCommentsUnsub = null; }

    // حذف المكالمة من Firebase إذا كنت من بدأها
    if (currentCommId) {
        try {
            const snap = await get(ref(db, `communityCalls/${currentCommId}`));
            if (snap.exists() && snap.val().startedBy === window.currentUser)
                await remove(ref(db, `communityCalls/${currentCommId}`));
        } catch(e) {}
        currentCommId = null;
    }
};

// ══════════════════════════════════════════════
// تحميل Metered SDK
// ══════════════════════════════════════════════
const loadMeteredSDK = () => new Promise((resolve, reject) => {
    if (typeof Metered !== 'undefined') return resolve();
    const s = document.createElement('script');
    s.src = `https://cdn.metered.ca/sdk/video/1.4.6/sdk.min.js`;
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
});

// ══════════════════════════════════════════════
// أزرار في واجهة المجتمع
// ══════════════════════════════════════════════
const enhanceCommunityView = (commId) => {
    setTimeout(() => {
        const actionsDiv = document.getElementById('communityHeaderActions');
        if (!actionsDiv || document.getElementById('startCallBtn')) return;

        const comm     = window.allCommunities?.[commId] || {};
        const commName = comm.name || window.currentCommunityName || commId;

        const joinBtn = document.createElement('button');
        joinBtn.id = 'joinCallBtn';
        joinBtn.className = 'btn-secondary';
        joinBtn.style.cssText = 'margin-left:8px;';
        joinBtn.innerHTML = '<i class="fas fa-headphones"></i> دخول كمستمع';
        joinBtn.onclick = () => window.joinActiveCommunityCall(commId);

        actionsDiv.insertBefore(joinBtn, actionsDiv.firstChild);
        if (comm.admin === window.currentUser) {
            const callBtn = document.createElement('button');
            callBtn.id = 'startCallBtn';
            callBtn.className = 'btn-primary';
            callBtn.style.cssText = 'background:#1d4ed8;border-color:#1d4ed8;color:#fff;margin-left:8px;';
            callBtn.innerHTML = '<i class="fas fa-broadcast-tower"></i> بدء بث مباشر';
            callBtn.onclick = () => window.startCommunityCall(commId, commName);
            actionsDiv.insertBefore(callBtn, actionsDiv.firstChild);
        }

        // بادج مكالمة نشطة
        get(ref(db, `communityCalls/${commId}`)).then(snap => {
            if (!snap.exists()) return;
            const call = snap.val();
            if (!call.roomName || Date.now() - call.startTime > 3600000) return;
            const badge = document.createElement('span');
            badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;background:#1d4ed8;color:#fff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;margin-right:8px;cursor:pointer;';
            badge.innerHTML = `<i class="fas fa-circle" style="font-size:8px;animation:ciPulse 1.5s infinite;"></i> بث نشط — ${call.access === 'paid' ? 'للمشتركين' : 'مجاني'} — ادخل كمستمع`;
            badge.onclick = () => window.joinActiveCommunityCall(commId);
            document.getElementById('communityViewTitle')?.insertAdjacentElement('afterend', badge);
        });
    }, 200);
};

const _hookEnhance = () => {
    if (typeof window.renderCommunityFeed === 'function') {
        const _orig = window.renderCommunityFeed;
        window.renderCommunityFeed = (commId) => { _orig(commId); enhanceCommunityView(commId); };
    } else { setTimeout(_hookEnhance, 100); }
};
_hookEnhance();
