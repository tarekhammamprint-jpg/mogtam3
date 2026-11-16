import { ref, get, set, update, push, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const escChat = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
let chatUnsubscribe = null;
let chatTypingUnsubscribe = null;
let chatTypingTimer = null;

function roomWith(uid) { return [window.currentUser, uid].sort().join('_'); }
function userName(uid) { return window.getDisplayName ? window.getDisplayName(uid) : uid; }
function touchConversation(uid, timestamp) {
    if (!uid || !window.currentUser) return Promise.resolve();
    return Promise.all([
        update(ref(db, `users/${window.currentUser}/recentChats`), {[uid]: timestamp}),
        update(ref(db, `users/${uid}/recentChats`), {[window.currentUser]: timestamp}),
        get(ref(db, `users/${uid}/unreadChats/${window.currentUser}`)).then(s => set(ref(db, `users/${uid}/unreadChats/${window.currentUser}`), (s.exists() ? Number(s.val()) : 0) + 1))
    ]);
}

function renderFloatingMessages(snap, uid) {
    const box = document.getElementById('chatMessages'); if (!box) return;
    let html = '', unread = {}, mark = false;
    const online = !!window.allUsersData?.[uid]?.online;
    if (snap.exists()) snap.forEach(child => {
        const m = child.val() || {}, mine = m.sender === window.currentUser;
        if (!mine && !m.read) { unread[`${child.key}/read`] = true; mark = true; }
        const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : '';
        let body = escChat(m.text || '');
        if (m.image) body = `<img src="${escChat(m.image)}" class="chat-media" alt="صورة" onclick="window.open('${escChat(m.image)}','_blank')">${body ? `<div>${body}</div>` : ''}`;
        if (m.video) body = `<video src="${escChat(m.video)}" class="chat-media" controls></video>${body ? `<div>${body}</div>` : ''}`;
        const ticks = mine ? `<span class="chat-ticks">${m.read ? '✓✓' : (online ? '✓✓' : '✓')}</span>` : '';
        html += `<div class="chat-bubble-row ${mine ? 'mine' : 'theirs'}"><div class="chat-bubble">${body}<div class="chat-meta">${ticks}<span>${time}</span></div></div></div>`;
    });
    box.innerHTML = html || `<div class="chat-empty-state"><i class="fas fa-comments"></i><span>ابدأ المحادثة مع ${escChat(userName(uid))}</span></div>`;
    if (mark) update(ref(db, `chats/${roomWith(uid)}`), unread);
    requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
}

window.openChat = (uid) => {
    if (!window.currentUser) return window.showRegisterModal?.();
    if (!uid || uid === window.currentUser) return;
    if (document.getElementById('messagesPageModal')?.classList.contains('show')) return window.openMessagesPageChat?.(uid);
    window.currentChatTarget = uid; window.isChatBoxVisible = true;
    const data = window.allUsersData?.[uid] || {};
    const box = document.getElementById('chatBox');
    document.getElementById('chatTargetName').textContent = userName(uid);
    document.getElementById('chatHeaderAvatar').src = data.profilePic || DEFAULT_AVATAR;
    box?.classList.add('show'); document.getElementById('floatingChat')?.style.setProperty('display','none');
    if (chatUnsubscribe) chatUnsubscribe();
    chatUnsubscribe = onValue(ref(db, `chats/${roomWith(uid)}`), snap => renderFloatingMessages(snap, uid));
    document.getElementById('chatInput')?.focus();
};
window.closeChat = (event) => { event?.stopPropagation(); window.isChatBoxVisible = false; document.getElementById('chatBox')?.classList.remove('show'); if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; } };
window.minimizeChat = (event) => { event?.stopPropagation(); window.isChatBoxVisible = false; document.getElementById('chatBox')?.classList.remove('show'); const f = document.getElementById('floatingChat'); if (f) { f.style.display = 'flex'; const d = window.allUsersData?.[window.currentChatTarget] || {}; document.getElementById('floatingChatAvatar').src = d.profilePic || DEFAULT_AVATAR; } };
window.restoreChat = () => { if (window.currentChatTarget) window.openChat(window.currentChatTarget); };
window.handleChatInput = () => { const uid = window.currentChatTarget; if (!uid) return; const room = roomWith(uid); set(ref(db, `chats_typing/${room}/${window.currentUser}`), true); clearTimeout(chatTypingTimer); chatTypingTimer = setTimeout(() => set(ref(db, `chats_typing/${room}/${window.currentUser}`), false), 1500); };
window.sendMessage = () => { const input = document.getElementById('chatInput'), text = input?.value.trim(), uid = window.currentChatTarget; if (!text || !uid) return; const now = Date.now(), room = roomWith(uid); set(ref(db, `chats_typing/${room}/${window.currentUser}`), false); push(ref(db, `chats/${room}`), {sender:window.currentUser, text, timestamp:now, read:false}).then(() => { input.value=''; return touchConversation(uid, now); }); };
window.sendChatMedia = async (event, type) => { const file = event.target.files?.[0], uid = window.currentChatTarget; if (!file || !uid) return; if (type === 'video' && file.size > 50 * 1024 * 1024) return window.dlgAlert?.('الفيديو كبير جدًا، الحد الأقصى 50 ميجابايت.', 'warning', 'الملف كبير'); try { const url = await window.uploadToCloudinary(file, type), now = Date.now(), data = {sender:window.currentUser, timestamp:now, read:false}; if (type === 'image') data.image = url; else data.video = url; await push(ref(db, `chats/${roomWith(uid)}`), data); await touchConversation(uid, now); event.target.value=''; } catch (e) { console.error(e); window.dlgAlert?.('تعذر إرسال الملف.', 'danger', 'خطأ'); } };

function startTypingListener() {
    if (chatTypingUnsubscribe || !window.currentUser) return;
    const check = () => { const uid = window.currentChatTarget; if (!uid) return; if (chatTypingUnsubscribe) chatTypingUnsubscribe(); chatTypingUnsubscribe = onValue(ref(db, `chats_typing/${roomWith(uid)}/${uid}`), s => { const el = document.getElementById('chatTypingStatus'); if (el) el.style.display = s.val() ? 'flex' : 'none'; }); };
    setInterval(check, 1000);
}
window.addEventListener('load', startTypingListener);
