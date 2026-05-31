import { ref, set, get, update, push, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
let tT = null;

window.openChatFromProfile = () => { if(!window.currentUser) return window.showRegisterModal(); let t = $('profHandle').innerText.replace('@', ''); window.location.hash=''; setTimeout(() => window.openChat(t), 300); };

window.openChat = (t) => {
    if(!window.currentUser) return window.showRegisterModal();
    window.location.hash = ''; 
    document.querySelectorAll('.modal').forEach(m => { if(m.id!=='interestsModal' && m.id!=='communitiesModal' && m.id!=='communityViewModal') m.classList.remove('show'); }); 
    document.body.style.overflow = 'auto';
    $('sidebarArea').classList.remove('mobile-show'); $('floatingChat').style.display = 'none';
    window.currentChatTarget = t; window.isChatBoxVisible = true; $('chatTargetName').innerText = window.getDisplayName(t);
    let td = window.allUsersData[t]; $('chatHeaderAvatar').src = td ? (td.profilePic || dA) : dA; $('chatBox').classList.add('show');
    remove(ref(db, `users/${window.currentUser}/unreadChats/${t}`));
    let rid = [window.currentUser, t].sort().join('_');
    if(window.chatUnsubscribe) window.chatUnsubscribe();
    window.chatUnsubscribe = onValue(ref(db, `chats/${rid}`), s => {
        let h = '', ur = {}, hu = false, fuc = 0, to = window.allUsersData[t]?.online || false;
        if(s.exists()) {
            s.forEach(c => {
                let m = c.val(), mid = c.key, mc = m.sender === window.currentUser ? 'me' : 'other', ts = new Date(m.timestamp).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'});
                if(m.sender !== window.currentUser && !m.read) { if(window.isChatBoxVisible) { ur[mid+'/read'] = true; hu = true; } else fuc++; }
                let ci = ''; if(mc === 'me') { if(m.read) ci = '<i class="fas fa-check-double" style="color:#38bdf8;opacity:1;margin-right:4px;"></i>'; else if(to) ci = '<i class="fas fa-check-double" style="color:#cbd5e1;opacity:0.9;margin-right:4px;"></i>'; else ci = '<i class="fas fa-check" style="color:#cbd5e1;opacity:0.9;margin-right:4px;"></i>'; }
                let th = `<div style="font-size:10px;opacity:0.9;margin-top:4px;display:flex;align-items:center;justify-content:${mc==='me'?'flex-end':'flex-start'};gap:4px;">${ci} ${ts}</div>`;
                let co = m.text || '';
                if(m.image) co = `<img src="${m.image}" style="max-width:100%;border-radius:10px;margin-bottom:5px;cursor:pointer;" onclick="window.open('${m.image}','_blank')"><br>${co}`;
                if(m.video) co = `<video src="${m.video}" controls style="max-width:100%;border-radius:10px;margin-bottom:5px;background:#1e293b;"></video><br>${co}`;
                h += `<div class="msg ${mc}">${co}${th}</div>`;
            });
        }
        if(hu && window.isChatBoxVisible) update(ref(db, `chats/${rid}`), ur);
        let fb = $('floatingChatBadge');
        if(!window.isChatBoxVisible && fuc > 0) { fb.innerText = fuc; fb.style.display = 'block'; } else fb.style.display = 'none';
        let cd = $('chatMessages'); cd.innerHTML = h; setTimeout(() => cd.scrollTop = cd.scrollHeight, 50);
    });
    if(window.typingUnsubscribe) window.typingUnsubscribe();
    window.typingUnsubscribe = onValue(ref(db, `chats_typing/${rid}/${t}`), s => { $('chatTypingStatus').style.display = s.val() ? 'flex' : 'none'; });
};

window.minimizeChat = (e) => { e.stopPropagation(); window.isChatBoxVisible = false; $('chatBox').classList.remove('show'); $('floatingChat').style.display = 'flex'; $('floatingChatAvatar').src = window.allUsersData[window.currentChatTarget]?.profilePic || dA; };
window.restoreChat = () => { $('floatingChat').style.display = 'none'; $('chatBox').classList.add('show'); window.isChatBoxVisible = true; if(window.currentChatTarget) window.openChat(window.currentChatTarget); };
window.closeChat = (e) => { e.stopPropagation(); window.isChatBoxVisible = false; $('chatBox').classList.remove('show'); $('floatingChat').style.display = 'none'; if(window.currentChatTarget) set(ref(db, `chats_typing/${[window.currentUser, window.currentChatTarget].sort().join('_')}/${window.currentUser}`), false); window.currentChatTarget = null; };

window.sendChatMedia = async (e, type) => {
    let f = e.target.files[0]; if(!f || !window.currentChatTarget) return;
    if(type === 'video' && f.size > 50*1024*1024) return alert('الفيديو كبير جداً!');
    let t = window.currentChatTarget, rid = [window.currentUser, t].sort().join('_'), n = Date.now();
    try {
        let url = await window.uploadToCloudinary(f, type);
        let d = {sender:window.currentUser, timestamp:n, read:false}; if(type === 'image') d.image = url; else d.video = url;
        push(ref(db, `chats/${rid}`), d).then(() => { update(ref(db, `users/${window.currentUser}/recentChats`), {[t]:n}); update(ref(db, `users/${t}/recentChats`), {[window.currentUser]:n}); let ur = ref(db, `users/${t}/unreadChats/${window.currentUser}`); get(ur).then(s => set(ur, (s.exists() ? s.val() : 0) + 1)); });
    } catch(err) { alert('فشل الرفع'); }
};

window.handleChatInput = () => { if(!window.currentChatTarget) return; let r = [window.currentUser, window.currentChatTarget].sort().join('_'); set(ref(db, `chats_typing/${r}/${window.currentUser}`), true); clearTimeout(tT); tT = setTimeout(() => set(ref(db, `chats_typing/${r}/${window.currentUser}`), false), 1500); };
window.sendMessage = () => {
    let t = $('chatInput').value.trim(); if(!t || !window.currentChatTarget) return;
    let tg = window.currentChatTarget, r = [window.currentUser, tg].sort().join('_'), n = Date.now();
    set(ref(db, `chats_typing/${r}/${window.currentUser}`), false); clearTimeout(tT);
    push(ref(db, `chats/${r}`), {sender:window.currentUser, text:t, timestamp:n, read:false}).then(() => { $('chatInput').value = ''; update(ref(db, `users/${window.currentUser}/recentChats`), {[tg]:n}); update(ref(db, `users/${tg}/recentChats`), {[window.currentUser]:n}); let ur = ref(db, `users/${tg}/unreadChats/${window.currentUser}`); get(ur).then(s => set(ur, (s.exists() ? s.val() : 0) + 1)); });
};
