// ============================================================
//  chat.js — نظام الدردشة المطور
//  ميزات جديدة:
//  ① جرس إشعار عند وصول رسالة جديدة (صوت Yahoo Messenger)
//  ② إيموشن reactions على الرسائل
//  ③ زر ارفاق ملف (PDF, DOC, ZIP...) يُرفع على Cloudinary
//  ④ عرض الملفات المرفقة بشكل جميل
// ============================================================

import { ref, set, get, update, push, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
let tT = null;

// ── صوت الإشعار (Yahoo Messenger style) ─────────────────────
let audioCtx = null;
function playYahooSound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        // نغمة Yahoo Messenger الكلاسيكية
        const notes = [
            { freq: 880, time: 0,    dur: 0.12 },
            { freq: 660, time: 0.13, dur: 0.12 },
            { freq: 880, time: 0.26, dur: 0.18 },
        ];
        notes.forEach(({ freq, time, dur }) => {
            const osc  = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.35, audioCtx.currentTime + time);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + time + dur);
            osc.start(audioCtx.currentTime + time);
            osc.stop(audioCtx.currentTime + time + dur + 0.05);
        });
    } catch(e) {}
}

// ── الإيموشن المتاحة ─────────────────────────────────────────
const REACTIONS = ['❤️','😂','😮','😢','😡','👍','👏'];

// ── أنواع الملفات وأيقوناتها ─────────────────────────────────
function getFileIcon(filename) {
    const ext = (filename || '').split('.').pop().toLowerCase();
    const icons = {
        pdf : { icon: 'fas fa-file-pdf',  color: '#ef4444' },
        doc : { icon: 'fas fa-file-word', color: '#2563eb' },
        docx: { icon: 'fas fa-file-word', color: '#2563eb' },
        xls : { icon: 'fas fa-file-excel',color: '#16a34a' },
        xlsx: { icon: 'fas fa-file-excel',color: '#16a34a' },
        ppt : { icon: 'fas fa-file-powerpoint', color: '#ea580c' },
        pptx: { icon: 'fas fa-file-powerpoint', color: '#ea580c' },
        zip : { icon: 'fas fa-file-archive', color: '#7c3aed' },
        rar : { icon: 'fas fa-file-archive', color: '#7c3aed' },
        mp3 : { icon: 'fas fa-file-audio', color: '#0284c7' },
        mp4 : { icon: 'fas fa-file-video', color: '#db2777' },
        txt : { icon: 'fas fa-file-alt',   color: '#64748b' },
    };
    return icons[ext] || { icon: 'fas fa-file', color: '#64748b' };
}

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

// ── رفع ملف على Cloudinary ───────────────────────────────────
async function uploadFileToCloudinary(file) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', 'mogtam3_unsigned');
    fd.append('folder', 'chat_files');
    // Cloudinary يقبل كل أنواع الملفات عبر resource_type=auto
    const res = await fetch('https://api.cloudinary.com/v1_1/dkfinndef/auto/upload', {
        method: 'POST',
        body: fd
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return {
        url     : data.secure_url,
        name    : file.name,
        size    : file.size,
        type    : file.type,
        publicId: data.public_id
    };
}

// ── بناء HTML رسالة ─────────────────────────────────────────
function buildMessageHTML(m, mid, mc, ts, to) {
    let ci = '';
    if (mc === 'me') {
        if (m.read) ci = '<i class="fas fa-check-double" style="color:#38bdf8;margin-right:4px;"></i>';
        else if (to) ci = '<i class="fas fa-check-double" style="color:#cbd5e1;opacity:.9;margin-right:4px;"></i>';
        else ci = '<i class="fas fa-check" style="color:#cbd5e1;opacity:.9;margin-right:4px;"></i>';
    }
    const th = `<div style="font-size:10px;opacity:.9;margin-top:4px;display:flex;align-items:center;justify-content:${mc==='me'?'flex-end':'flex-start'};gap:4px;">${ci} ${ts}</div>`;

    // محتوى الرسالة
    let co = '';

    // Buzz مميز
    if (m.isBuzz) {
        co += `<div style="display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;padding:8px 14px;border:2px solid #f59e0b;">
            <span style="font-size:24px;animation:buzzShake 0.3s infinite;">⚡</span>
            <span style="font-weight:800;color:#92400e;font-size:14px;">Buzz!</span>
        </div>
        <style>@keyframes buzzShake{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(10deg)}}</style>`;
    } else if (m.text) {
        co += `<div style="word-break:break-word;">${m.text}</div>`;
    }

    // صورة
    if (m.image) co += `<img src="${m.image}" style="max-width:100%;border-radius:10px;margin:4px 0;cursor:pointer;display:block;" onclick="window.openNewsImageViewer('${m.image}','')">`;

    // فيديو
    if (m.video) co += `<video src="${m.video}" controls style="max-width:100%;border-radius:10px;margin:4px 0;background:#1e293b;display:block;"></video>`;

    // ملف مرفق
    if (m.file) {
        const fi = getFileIcon(m.file.name);
        co += `<div onclick="window.open('${m.file.url}','_blank')" style="display:flex;align-items:center;gap:10px;background:${mc==='me'?'rgba(255,255,255,0.15)':'#f1f5f9'};border-radius:12px;padding:10px 14px;cursor:pointer;margin:4px 0;min-width:200px;max-width:260px;transition:.2s;" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            <div style="width:40px;height:40px;border-radius:10px;background:${fi.color}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="${fi.icon}" style="color:${fi.color};font-size:20px;"></i>
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${mc==='me'?'#fff':'#0f172a'};">${m.file.name}</div>
                <div style="font-size:11px;color:${mc==='me'?'rgba(255,255,255,.7)':'#64748b'};">${formatFileSize(m.file.size)}</div>
            </div>
            <i class="fas fa-download" style="color:${mc==='me'?'rgba(255,255,255,.7)':'#64748b'};font-size:14px;"></i>
        </div>`;
    }

    // Reactions الموجودة
    const reactions = m.reactions || {};
    let reactHTML = '';
    if (Object.keys(reactions).length > 0) {
        // تجميع الـ reactions
        const grouped = {};
        Object.values(reactions).forEach(r => { grouped[r] = (grouped[r]||0)+1; });
        reactHTML = `<div class="msg-reactions" style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;justify-content:${mc==='me'?'flex-end':'flex-start'};">
            ${Object.entries(grouped).map(([emoji,count]) =>
                `<span style="background:${mc==='me'?'rgba(255,255,255,0.2)':'#f1f5f9'};border-radius:20px;padding:2px 7px;font-size:13px;cursor:pointer;" onclick="window.addReaction('${mid}','${emoji}')">${emoji}${count>1?` ${count}`:''}</span>`
            ).join('')}
        </div>`;
    }

    return `<div class="msg ${mc}" data-mid="${mid}" style="position:relative;" onmouseenter="window.showReactBtn('${mid}','${mc}')" onmouseleave="window.hideReactBtn('${mid}')">
        ${co}
        ${reactHTML}
        ${th}
        <div id="react-btn-${mid}" style="display:none;position:absolute;${mc==='me'?'left:-38px':'right:-38px'};top:0;z-index:10;">
            <button onclick="window.toggleReactPicker('${mid}','${mc}')" style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.1);">😊</button>
        </div>
    </div>`;
}

// ── فتح الدردشة ──────────────────────────────────────────────
window.openChatFromProfile = () => {
    if (!window.currentUser) return window.showRegisterModal();
    let t = $('profHandle').innerText.replace('@','');
    window.location.hash = '';
    setTimeout(() => window.openChat(t), 300);
};

window.openChat = (t) => {
    if (!window.currentUser) return window.showRegisterModal();
    window.location.hash = '';
    document.querySelectorAll('.modal').forEach(m => {
        if (m.id!=='interestsModal'&&m.id!=='communitiesModal'&&m.id!=='communityViewModal')
            m.classList.remove('show');
    });
    document.body.style.overflow = 'auto';
    $('sidebarArea').classList.remove('mobile-show');
    $('floatingChat').style.display = 'none';
    window.currentChatTarget = t;
    window.isChatBoxVisible = true;
    $('chatTargetName').innerText = window.getDisplayName(t);
    let td = window.allUsersData[t];
    $('chatHeaderAvatar').src = td ? (td.profilePic || dA) : dA;
    $('chatBox').classList.add('show');
    remove(ref(db, `users/${window.currentUser}/unreadChats/${t}`));

    let rid = [window.currentUser, t].sort().join('_');
    if (window.chatUnsubscribe) window.chatUnsubscribe();

    let lastMsgCount = 0;
    window.chatUnsubscribe = onValue(ref(db, `chats/${rid}`), s => {
        let h = '', ur = {}, hu = false, fuc = 0, to = window.allUsersData[t]?.online || false;
        let msgCount = 0;

        if (s.exists()) {
            s.forEach(c => {
                let m = c.val(), mid = c.key;
                let mc = m.sender === window.currentUser ? 'me' : 'other';
                let ts = new Date(m.timestamp).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'});

                if (m.sender !== window.currentUser && !m.read) {
                    if (window.isChatBoxVisible) { ur[mid+'/read'] = true; hu = true; }
                    else fuc++;
                }

                h += buildMessageHTML(m, mid, mc, ts, to);
                msgCount++;
            });
        }

        // تشغيل صوت Yahoo عند وصول رسالة جديدة
        if (msgCount > lastMsgCount && lastMsgCount > 0) {
            const lastMsg = s.exists() ? Object.values(s.val()).pop() : null;
            if (lastMsg && lastMsg.sender !== window.currentUser) {
                playYahooSound();
                // اهتزاز الأيقونة
            }
        }
        lastMsgCount = msgCount;

        if (hu && window.isChatBoxVisible) update(ref(db, `chats/${rid}`), ur);

        let fb = $('floatingChatBadge');
        if (!window.isChatBoxVisible && fuc > 0) {
            fb.innerText = fuc; fb.style.display = 'block';
        } else fb.style.display = 'none';

        let cd = $('chatMessages');
        cd.innerHTML = h;
        setTimeout(() => cd.scrollTop = cd.scrollHeight, 50);
    });

    if (window.typingUnsubscribe) window.typingUnsubscribe();
    window.typingUnsubscribe = onValue(ref(db, `chats_typing/${rid}/${t}`), s => {
        $('chatTypingStatus').style.display = s.val() ? 'flex' : 'none';
    });
};

// ── Reactions ────────────────────────────────────────────────
window.showReactBtn = (mid, mc) => {
    const btn = document.getElementById(`react-btn-${mid}`);
    if (btn) btn.style.display = 'block';
};
window.hideReactBtn = (mid) => {
    setTimeout(() => {
        const btn = document.getElementById(`react-btn-${mid}`);
        const picker = document.getElementById(`react-picker-${mid}`);
        if (btn && !picker) btn.style.display = 'none';
    }, 300);
};

window.toggleReactPicker = (mid, mc) => {
    // إزالة أي picker قديم
    document.querySelectorAll('.react-picker').forEach(p => p.remove());

    const btn = document.getElementById(`react-btn-${mid}`);
    if (!btn) return;

    const picker = document.createElement('div');
    picker.id = `react-picker-${mid}`;
    picker.className = 'react-picker';
    picker.style.cssText = `
        position:absolute;${mc==='me'?'left:-210px':'right:-210px'};top:-50px;
        background:var(--card-bg);border:1px solid var(--border-color);
        border-radius:30px;padding:8px 12px;display:flex;gap:8px;
        box-shadow:0 4px 20px rgba(0,0,0,.15);z-index:100;
    `;
    picker.innerHTML = REACTIONS.map(r =>
        `<span onclick="window.addReaction('${mid}','${r}')" style="font-size:22px;cursor:pointer;transition:.2s;display:inline-block;" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'">${r}</span>`
    ).join('');

    btn.parentElement.appendChild(picker);

    // إغلاق عند الضغط خارجه
    setTimeout(() => {
        document.addEventListener('click', function closePicker(e) {
            if (!picker.contains(e.target)) {
                picker.remove();
                document.removeEventListener('click', closePicker);
            }
        });
    }, 100);
};

window.addReaction = (mid, emoji) => {
    if (!window.currentUser || !window.currentChatTarget) return;
    const rid = [window.currentUser, window.currentChatTarget].sort().join('_');
    // إزالة reaction القديمة للمستخدم ثم إضافة الجديدة
    const reactRef = ref(db, `chats/${rid}/${mid}/reactions/${window.currentUser}`);
    get(reactRef).then(s => {
        if (s.exists() && s.val() === emoji) {
            remove(reactRef); // نفس الـ reaction = إزالة
        } else {
            set(reactRef, emoji);
        }
    });
    document.querySelectorAll('.react-picker').forEach(p => p.remove());
};

// ── إرسال وسائط ─────────────────────────────────────────────
window.minimizeChat = (e) => {
    e.stopPropagation();
    window.isChatBoxVisible = false;
    $('chatBox').classList.remove('show');
    $('floatingChat').style.display = 'flex';
    $('floatingChatAvatar').src = window.allUsersData[window.currentChatTarget]?.profilePic || dA;
};

window.restoreChat = () => {
    $('floatingChat').style.display = 'none';
    $('chatBox').classList.add('show');
    window.isChatBoxVisible = true;
    if (window.currentChatTarget) window.openChat(window.currentChatTarget);
};

window.closeChat = (e) => {
    e.stopPropagation();
    window.isChatBoxVisible = false;
    $('chatBox').classList.remove('show');
    $('floatingChat').style.display = 'none';
    if (window.currentChatTarget) {
        set(ref(db, `chats_typing/${[window.currentUser, window.currentChatTarget].sort().join('_')}/${window.currentUser}`), false);
    }
    window.currentChatTarget = null;
};

window.sendChatMedia = async (e, type) => {
    let f = e.target.files[0];
    if (!f || !window.currentChatTarget) return;
    if (type === 'video' && f.size > 50*1024*1024)
        return window.dlgAlert('الفيديو كبير جداً! الحد الأقصى 50 ميجا.','warning','تنبيه');

    let t = window.currentChatTarget;
    let rid = [window.currentUser, t].sort().join('_');
    let n = Date.now();

    try {
        let url = await window.uploadToCloudinary(f, type);
        let d = { sender: window.currentUser, timestamp: n, read: false };
        if (type === 'image') d.image = url;
        else d.video = url;
        push(ref(db, `chats/${rid}`), d).then(() => {
            update(ref(db, `users/${window.currentUser}/recentChats`), {[t]:n});
            update(ref(db, `users/${t}/recentChats`), {[window.currentUser]:n});
            let ur = ref(db, `users/${t}/unreadChats/${window.currentUser}`);
            get(ur).then(s => set(ur, (s.exists()?s.val():0)+1));
        });
    } catch(err) {
        window.dlgAlert('فشل رفع الملف، يرجى المحاولة مجدداً.','danger','خطأ');
    }
    e.target.value = '';
};

// ── إرسال ملف مرفق ──────────────────────────────────────────
window.sendChatFile = async (e) => {
    let f = e.target.files[0];
    if (!f || !window.currentChatTarget) return;

    const maxSize = 25 * 1024 * 1024; // 25MB
    if (f.size > maxSize) return window.dlgAlert('حجم الملف كبير جداً! الحد الأقصى 25 ميجا.','warning','تنبيه');

    let t = window.currentChatTarget;
    let rid = [window.currentUser, t].sort().join('_');
    let n = Date.now();

    // عرض مؤشر رفع
    const sendBtn = $('chatSendBtn');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

    try {
        const fileData = await uploadFileToCloudinary(f);
        await push(ref(db, `chats/${rid}`), {
            sender   : window.currentUser,
            timestamp: n,
            read     : false,
            file     : fileData
        });
        update(ref(db, `users/${window.currentUser}/recentChats`), {[t]:n});
        update(ref(db, `users/${t}/recentChats`), {[window.currentUser]:n});
        let ur = ref(db, `users/${t}/unreadChats/${window.currentUser}`);
        get(ur).then(s => set(ur, (s.exists()?s.val():0)+1));
    } catch(err) {
        window.dlgAlert('فشل رفع الملف. تأكد من الاتصال وحاول مجدداً.','danger','خطأ');
    } finally {
        if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>'; }
        e.target.value = '';
    }
};

// ── الكتابة ──────────────────────────────────────────────────
window.handleChatInput = () => {
    if (!window.currentChatTarget) return;
    let r = [window.currentUser, window.currentChatTarget].sort().join('_');
    set(ref(db, `chats_typing/${r}/${window.currentUser}`), true);
    clearTimeout(tT);
    tT = setTimeout(() => set(ref(db, `chats_typing/${r}/${window.currentUser}`), false), 1500);
};

// ── إرسال رسالة نصية ────────────────────────────────────────
window.sendMessage = () => {
    let t = $('chatInput').value.trim();
    if (!t || !window.currentChatTarget) return;
    let tg = window.currentChatTarget;
    let r  = [window.currentUser, tg].sort().join('_');
    let n  = Date.now();
    set(ref(db, `chats_typing/${r}/${window.currentUser}`), false);
    clearTimeout(tT);
    push(ref(db, `chats/${r}`), {
        sender: window.currentUser, text: t, timestamp: n, read: false
    }).then(() => {
        $('chatInput').value = '';
        update(ref(db, `users/${window.currentUser}/recentChats`), {[tg]:n});
        update(ref(db, `users/${tg}/recentChats`), {[window.currentUser]:n});
        let ur = ref(db, `users/${tg}/unreadChats/${window.currentUser}`);
        get(ur).then(s => set(ur, (s.exists()?s.val():0)+1));
    });
};

// ── صوت إشعار الرسائل الواردة (من أي محادثة) ────────────────
window.initChatNotificationSound = () => {
    if (!window.currentUser) return;
    onValue(ref(db, `users/${window.currentUser}/unreadChats`), snap => {
        if (!snap.exists()) return;
        const total = Object.values(snap.val()).reduce((a,b) => a+b, 0);
        if (total > 0 && !window.isChatBoxVisible) {
            playYahooSound();
        }
    });
};


// ============================================================
//  ⚡ نظام BUZZ — زي Yahoo Messenger
// ============================================================

// صوت Buzz قوي ومميز
function playBuzzSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // صوت Buzz — اهتزاز سريع
        const sequence = [
            { freq: 150, start: 0,    dur: 0.08, vol: 0.5 },
            { freq: 200, start: 0.09, dur: 0.08, vol: 0.5 },
            { freq: 150, start: 0.18, dur: 0.08, vol: 0.5 },
            { freq: 200, start: 0.27, dur: 0.08, vol: 0.5 },
            { freq: 250, start: 0.36, dur: 0.15, vol: 0.4 },
        ];
        sequence.forEach(({ freq, start, dur, vol }) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(vol, ctx.currentTime + start);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + dur + 0.05);
        });
    } catch(e) {}
}

// اهتزاز نافذة الدردشة
function shakeChatBox() {
    const box = document.getElementById('chatBox');
    if (!box) return;
    box.style.transition = 'none';
    const shakes = [
        [-8,0],[8,0],[-6,0],[6,0],[-4,0],[4,0],[-2,0],[0,0]
    ];
    let i = 0;
    const interval = setInterval(() => {
        if (i >= shakes.length) {
            clearInterval(interval);
            box.style.transform = '';
            box.style.transition = '';
            return;
        }
        box.style.transform = `translateX(${shakes[i][0]}px)`;
        i++;
    }, 50);
}

// إرسال Buzz
window.sendBuzz = async () => {
    if (!window.currentUser || !window.currentChatTarget) return;
    const rid = [window.currentUser, window.currentChatTarget].sort().join('_');
    const n   = Date.now();

    // إرسال رسالة buzz في Firebase
    await push(ref(db, `chats/${rid}`), {
        sender   : window.currentUser,
        timestamp: n,
        read     : false,
        isBuzz   : true,
        text     : '⚡ Buzz!'
    });

    // تحديث recentChats
    update(ref(db, `users/${window.currentUser}/recentChats`), { [window.currentChatTarget]: n });
    update(ref(db, `users/${window.currentChatTarget}/recentChats`), { [window.currentUser]: n });

    // إشعار للطرف الآخر
    const ur = ref(db, `users/${window.currentChatTarget}/unreadChats/${window.currentUser}`);
    get(ur).then(s => set(ur, (s.exists() ? s.val() : 0) + 1));

    // buzz لنفسي
    playBuzzSound();
    shakeChatBox();

    // buzz للطرف الآخر عبر Firebase
    set(ref(db, `buzz/${window.currentChatTarget}`), {
        from     : window.currentUser,
        timestamp: n
    });
};

// الاستماع لـ Buzz الواردة
window.listenToBuzz = () => {
    if (!window.currentUser) return;
    onValue(ref(db, `buzz/${window.currentUser}`), snap => {
        if (!snap.exists()) return;
        const data = snap.val();
        if (!data || !data.timestamp) return;

        // تجاهل buzz قديم (أكثر من 5 ثوان)
        if (Date.now() - data.timestamp > 5000) return;

        // تشغيل صوت وهز الشاشة
        playBuzzSound();
        shakeChatBox();

        // إشعار مرئي
        if (window.showToast) {
            const senderName = window.getDisplayName(data.from) || data.from;
            window.showToast(
                `⚡ ${senderName} أرسل لك Buzz!`,
                'انتبه! لديك رسالة مهمة',
                window.allUsersData?.[data.from]?.profilePic || ''
            );
        }

        // مسح الـ buzz بعد المعالجة
        setTimeout(() => {
            set(ref(db, `buzz/${window.currentUser}`), null);
        }, 1000);
    });
};

// ============================================================
//  😊 Emoji Picker — قائمة إيموشن كاملة
// ============================================================

const EMOJI_CATEGORIES = {
    '😊 مشاعر': ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'],
    '👍 تعابير': ['👍','👎','👌','🤌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👋','🤚','🖐️','✋','🖖','👏','🙌','🤲','🙏','🤝','💪','🦾','🖕','✍️','💅','🤳'],
    '❤️ قلوب': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💝','💘','💟','☮️','✝️','♾️','💯','💢','💥','💫','💦','💨','🕳️','💬','💭','💤'],
    '🎉 احتفال': ['🎉','🎊','🎈','🎁','🎀','🎗️','🎟️','🏆','🥇','🥈','🥉','🎖️','🏅','🎪','🎭','🎨','🎬','🎤','🎵','🎶','🎸','🥁','🎺','🎻','🎮','🕹️','🎲','♟️','🎯','🎳'],
    '🐶 حيوانات': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍'],
    '🍎 طعام': ['🍎','🍊','🍋','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🧄','🧅','🥔','🍠','🥐','🥖','🍞','🥨','🧀','🍳','🥚','🧇','🥞','🧈','🍖','🍗','🥩','🍔','🍟','🌭','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🍝','🍜','🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','☕','🍵','🍺','🥂','🍾'],
    '⚽ رياضة': ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🥅','⛳','🏹','🎣','🤿','🥊','🥋','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🏋️','🤼','🤸','⛹️','🤺','🏇','🧘','🏄','🏊','🚣','🧗','🚵','🚴'],
};

window.toggleEmojiPicker = () => {
    const picker = document.getElementById('chatEmojiPicker');
    if (!picker) return;

    if (picker.style.display === 'flex') {
        picker.style.display = 'none';
        return;
    }

    // بناء الـ picker
    if (!picker.dataset.built) {
        let html = '';
        Object.entries(EMOJI_CATEGORIES).forEach(([cat, emojis]) => {
            html += `<div style="width:100%;padding:4px 2px;font-size:11px;color:var(--text-muted);font-weight:700;">${cat}</div>`;
            html += emojis.map(e =>
                `<span onclick="window.insertEmoji('${e}')" style="font-size:22px;cursor:pointer;padding:3px;border-radius:6px;display:inline-block;transition:.15s;line-height:1.3;" onmouseover="this.style.background='#f1f5f9';this.style.transform='scale(1.2)'" onmouseout="this.style.background='';this.style.transform=''">${e}</span>`
            ).join('');
        });
        picker.innerHTML = html;
        picker.dataset.built = '1';
    }

    picker.style.display = 'flex';
    picker.style.flexWrap = 'wrap';

    // إغلاق عند الضغط خارجه
    setTimeout(() => {
        document.addEventListener('click', function closePicker(e) {
            if (!picker.contains(e.target) && !e.target.closest('[onclick*="toggleEmojiPicker"]')) {
                picker.style.display = 'none';
                document.removeEventListener('click', closePicker);
            }
        });
    }, 100);
};

window.insertEmoji = (emoji) => {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const pos   = input.selectionStart || input.value.length;
    input.value = input.value.slice(0, pos) + emoji + input.value.slice(pos);
    input.focus();
    input.selectionStart = input.selectionEnd = pos + emoji.length;

    // إغلاق الـ picker
    const picker = document.getElementById('chatEmojiPicker');
    if (picker) picker.style.display = 'none';
};
