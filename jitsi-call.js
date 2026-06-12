// =============== نظام المكالمات الجماعية باستخدام Jitsi ===============
// ملف: jitsi-call.js

let activeJitsiApi = null;
let currentMeetingModal = null;

// إعدادات Jitsi (استبدل بالرابط الخاص بك بعد التثبيت)
window.JITSI_DOMAIN = 'meet.jit.si'; // استبدل بمجال السيرفر الخاص بك مثلاً: 'meet.yourdomain.com'
window.JITSI_SERVER_TYPE = 'public'; // 'public' أو 'self-hosted'

// دالة لبدء اجتماع في المجتمع
window.startCommunityCall = async (commId, commName) => {
    if (!window.currentUser) {
        window.dlgAlert("يجب تسجيل الدخول أولاً", "warning");
        return false;
    }
    
    const userName = window.allUsersData[window.currentUser]?.displayName || window.currentUser;
    const userEmail = `${window.currentUser}@mogtam3.com`;
    const roomId = `mogtam3_comm_${commId}_${Date.now()}`;
    
    // التحقق من صلاحية العضو في المجتمع
    const community = window.allCommunities[commId];
    if (!community) {
        window.dlgAlert("المجتمع غير موجود", "danger");
        return false;
    }
    
    const isMember = community.members && community.members[window.currentUser];
    if (!isMember && community.admin !== window.currentUser) {
        window.dlgAlert("أنت لست عضواً في هذا المجتمع", "warning");
        return false;
    }
    
    // تسجيل بدء الاجتماع في Firebase (للتتبع فقط)
    try {
        const callRef = ref(db, `communityCalls/${commId}/active`);
        const snapshot = await get(callRef);
        let existingCall = snapshot.exists() ? snapshot.val() : null;
        
        if (existingCall && existingCall.active && (Date.now() - existingCall.startTime < 3600000)) {
            // اجتماع نشط موجود
            const join = await window.dlgConfirm(`يوجد اجتماع نشط بدأه ${existingCall.startedByName || 'أحد الأعضاء'}، هل تريد الانضمام؟`, "اجتماع نشط", "question");
            if (join) {
                openJitsiMeeting(roomId, commName, userName, userEmail);
                return true;
            }
            return false;
        }
        
        // حفظ معلومات الاجتماع الجديد
        await set(callRef, {
            roomId: roomId,
            startedBy: window.currentUser,
            startedByName: userName,
            startTime: Date.now(),
            active: true,
            communityId: commId
        });
        
        // حذف الاجتماع بعد ساعة (تنظيف تلقائي)
        setTimeout(async () => {
            const currentCall = await get(callRef);
            if (currentCall.exists() && currentCall.val().roomId === roomId) {
                await remove(callRef);
            }
        }, 3600000);
        
    } catch(e) {
        console.error('خطأ في حفظ بيانات الاجتماع:', e);
    }
    
    // فتح نافذة الاجتماع
    openJitsiMeeting(roomId, commName, userName, userEmail);
    return true;
};

// دالة لفتح نافذة Jitsi (متوافقة مع الموبايل)
const openJitsiMeeting = (roomId, commName, userName, userEmail) => {
    // إغلاق أي اجتماع مفتوح مسبقاً
    if (activeJitsiApi) {
        try { activeJitsiApi.dispose(); } catch(e) {}
        activeJitsiApi = null;
    }
    if (currentMeetingModal) {
        currentMeetingModal.remove();
        currentMeetingModal = null;
    }
    
    // إنشاء مودال الاجتماع
    const modal = document.createElement('div');
    modal.id = 'jitsiMeetingModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #1a1a1a;
        z-index: 10000;
        display: flex;
        flex-direction: column;
    `;
    
    // شريط التحكم العلوي
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
        background: rgba(0,0,0,0.9);
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        z-index: 10001;
    `;
    
    toolbar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-video" style="color: #ef4444; font-size: 20px;"></i>
            <span style="color: white; font-weight: bold;">${commName || 'اجتماع المجتمع'}</span>
            <span id="participantsCount" style="background: #333; padding: 4px 8px; border-radius: 20px; font-size: 12px; color: #fff;">0 مشارك</span>
        </div>
        <div style="display: flex; gap: 10px;">
            <button id="exitMeetingBtn" style="
                background: #ef4444;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-family: inherit;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                <i class="fas fa-sign-out-alt"></i>
                إنهاء الاجتماع
            </button>
        </div>
    `;
    
    // حاوية Jitsi
    const container = document.createElement('div');
    container.id = 'jitsi-container';
    container.style.cssText = `
        flex: 1;
        width: 100%;
        background: #000;
    `;
    
    modal.appendChild(toolbar);
    modal.appendChild(container);
    document.body.appendChild(modal);
    currentMeetingModal = modal;
    
    // منع تمرير الصفحة الخلفية
    document.body.style.overflow = 'hidden';
    
    // تحميل مكتبة Jitsi (متوافقة مع الموبايل)
    const loadJitsiScript = () => {
        return new Promise((resolve, reject) => {
            if (typeof JitsiMeetExternalAPI !== 'undefined') {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = `https://${window.JITSI_DOMAIN}/external_api.js`;
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    };
    
    // بدء الاجتماع
    loadJitsiScript().then(() => {
        const domain = window.JITSI_DOMAIN;
        
        // إعدادات متوافقة مع الموبايل
        const options = {
            roomName: roomId,
            width: '100%',
            height: '100%',
            parentNode: document.getElementById('jitsi-container'),
            userInfo: {
                displayName: userName,
                email: userEmail
            },
            configOverwrite: {
                // إعدادات محسنة للموبايل
                startWithAudioMuted: true,
                startWithVideoMuted: false,
                disableDeepLinking: true,
                prejoinPageEnabled: false,
                enableWelcomePage: false,
                enableClosePage: false,
                disableProfile: true,
                defaultLanguage: 'ar',
                // تحسينات للموبايل
                disableInviteFunctions: false,
                disableRemoteControl: true,
                disableLocalVideoFlip: true,
                // جودة أقل للموبايل لتحسين الأداء
                resolution: 720,
                constraints: {
                    video: {
                        height: { ideal: 720, max: 720 },
                        width: { ideal: 1280, max: 1280 }
                    }
                }
            },
            interfaceConfigOverwrite: {
                // واجهة مبسطة للموبايل
                SHOW_JITSI_WATERMARK: false,
                SHOW_BRAND_WATERMARK: false,
                SHOW_POWERED_BY: false,
                SHOW_DEEP_LINKING_IMAGE: false,
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'desktop', 'fullscreen',
                    'hangup', 'chat', 'raisehand', 'videoquality',
                    'noisesuppression', 'tileview', 'download'
                ],
                MOBILE_APP_PROMO: false,
                NATIVE_APP_PROMO: false,
                SETTINGS_SECTIONS: ['devices', 'language', 'moderator'],
                VIDEO_LAYOUT_FIT: 'both',
                DEFAULT_REMOTE_DISPLAY_NAME: 'عضو'
            },
            // دعم الموبايل بشكل كامل
            getInitialDevices: true,
            disableBeforeUnloadHandlers: true,
            enableNoAudioDetection: true,
            enableNoisyMicDetection: true
        };
        
        activeJitsiApi = new JitsiMeetExternalAPI(domain, options);
        
        // الاستماع لأحداث الاجتماع
        activeJitsiApi.addEventListener('videoConferenceJoined', (event) => {
            console.log('انضممت للاجتماع');
            updateParticipantsCount();
        });
        
        activeJitsiApi.addEventListener('participantJoined', (event) => {
            console.log('مستخدم جديد انضم:', event.displayName);
            updateParticipantsCount();
        });
        
        activeJitsiApi.addEventListener('participantLeft', (event) => {
            console.log('مستخدم غادر:', event.displayName);
            updateParticipantsCount();
        });
        
        activeJitsiApi.addEventListener('videoConferenceLeft', () => {
            closeMeeting();
        });
        
        // تحديث عدد المشاركين
        const updateParticipantsCount = () => {
            if (activeJitsiApi) {
                try {
                    const participants = activeJitsiApi.getParticipantsInfo();
                    const countElem = document.getElementById('participantsCount');
                    if (countElem && participants) {
                        countElem.innerText = `${participants.length || 0} مشارك`;
                    }
                } catch(e) {}
            }
        };
        
        // تحديث كل 5 ثوان
        setInterval(updateParticipantsCount, 5000);
        
    }).catch(error => {
        console.error('خطأ في تحميل Jitsi:', error);
        window.dlgAlert("حدث خطأ في تحميل غرفة الاجتماع، يرجى المحاولة مجدداً.", "danger", "خطأ");
        closeMeeting();
    });
    
    // زر الخروج
    const exitBtn = document.getElementById('exitMeetingBtn');
    if (exitBtn) {
        exitBtn.onclick = () => {
            window.dlgConfirm("هل تريد إنهاء الاجتماع؟", "إنهاء الاجتماع", "question", "نعم").then(ok => {
                if (ok) closeMeeting();
            });
        };
    }
};

// دالة لإغلاق الاجتماع
const closeMeeting = () => {
    if (activeJitsiApi) {
        try {
            activeJitsiApi.dispose();
        } catch(e) {}
        activeJitsiApi = null;
    }
    
    if (currentMeetingModal) {
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
                const community = window.allCommunities[commId];
                openJitsiMeeting(call.roomId, community?.name || 'المجتمع', userName, userEmail);
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

// إضافة زر "بدء الاجتماع" في واجهة المجتمع
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
            
            const comm = window.allCommunities[commId];
            callBtn.onclick = () => window.startCommunityCall(commId, comm?.name);
            joinBtn.onclick = () => window.joinActiveCommunityCall(commId);
            
            // إضافة الأزرار مع ترتيب مناسب
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

// حفظ الدالة الأصلية وتوسيعها
if (typeof window.renderCommunityFeed === 'function') {
    const originalRenderCommunityFeed = window.renderCommunityFeed;
    window.renderCommunityFeed = (commId) => {
        originalRenderCommunityFeed(commId);
        enhanceCommunityView(commId);
    };
}

// تصدير الدوال للاستخدام العام
window.closeMeeting = closeMeeting;
