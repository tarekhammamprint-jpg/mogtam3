import { ref, get, update, push, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

window.playNotifSound = () => { try { let audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); audio.volume = 0.5; audio.play().catch(e => {}); } catch(err) {} };
window.isInitialNotifLoad = true;
window.alertedNotifs = new Set();
window._renderNotifications = (rawVal) => {
    window._lastNotifRaw = rawVal;
    let dd = $('notifDropdown'); if (!dd) return;
    let c = 0, h = '';
    if (rawVal) {
        let n = [];
        Object.keys(rawVal).forEach(k => { let v = rawVal[k]; if (v && typeof v === 'object' && v.type) n.push({ ...v, id: k }); });
        n.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        n = n.slice(0, 50);
        n.forEach(x => {
            try {
                if (x.read === false) c++;
                let d = window.getDisplayName(x.from), pic = window.allUsersData[x.from]?.profilePic || dA, tH = '', tP = '', icon = '';
                if (x.type === 'system') { tH = x.text; tP = x.text; icon = '<i class="fas fa-bell" style="color:#64748b;"></i>'; }
                else if (x.type === 'comment') { tH = `<strong>${d}</strong> علق على منشورك`; tP = `علق ${d} على منشورك`; icon = '<i class="fas fa-comment" style="color:#10b981;"></i>'; }
                else if (x.type === 'like') { tH = `<strong>${d}</strong> تفاعل مع منشورك`; tP = `تفاعل ${d} مع منشورك`; icon = '<i class="fas fa-heart" style="color:#ef4444;"></i>'; }
                else if (x.type === 'comment_like') { tH = `<strong>${d}</strong> تفاعل مع تعليقك`; tP = `تفاعل ${d} مع تعليقك`; icon = '<i class="fas fa-heart" style="color:#ef4444;"></i>'; }
                else if (x.type === 'friend_req') { tH = `<strong>${d}</strong> أرسل طلب صداقة`; tP = `أرسل ${d} طلب صداقة`; icon = '<i class="fas fa-user-plus" style="color:#3b82f6;"></i>'; }
                else if (x.type === 'accept_req') { tH = `<strong>${d}</strong> وافق على طلب الصداقة`; tP = `وافق ${d} على طلب الصداقة`; icon = '<i class="fas fa-user-check" style="color:#10b981;"></i>'; }
                else if (x.type === 'share') { tH = `<strong>${d}</strong> شارك منشورك`; tP = `شارك ${d} منشورك`; icon = '<i class="fas fa-share" style="color:#8b5cf6;"></i>'; }
                else if (x.type === 'reply') { tH = `<strong>${d}</strong> رد على تعليقك`; tP = `رد ${d} على تعليقك`; icon = '<i class="fas fa-reply" style="color:#64748b;"></i>'; }
                else if (x.type === 'mention') { tH = `<strong>${d}</strong> ذكرك في تعليق`; tP = `ذكرك ${d} في تعليق`; icon = '<i class="fas fa-at" style="color:#d946ef;"></i>'; }
                if (!window.isInitialNotifLoad && x.read === false && x.from !== window.currentUser && !window.alertedNotifs.has(x.id)) { window.showToast("إشعار جديد", tP || "تفاعل جديد", pic); }
                window.alertedNotifs.add(x.id);
                let uS = x.read === false ? 'background:#eef2ff;' : 'background:#fff;',
                    uD = x.read === false ? `<div style="width:10px;height:10px;background:var(--primary);border-radius:50%;flex-shrink:0;box-shadow:0 0 5px rgba(37,99,235,0.4);"></div>` : '',
                    tm = window.timeAgo(x.timestamp);
                h += `<div class="notif-item" onclick="window.handleNotifClick('${x.id}','${x.type}','${x.from}','${x.postId}')" style="display:flex; align-items:center; gap:14px; padding:14px 18px; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:background 0.2s; ${uS}">
                    <div style="position:relative; flex-shrink:0;">
                        <img src="${pic}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;">
                        <div style="position:absolute; bottom:-4px; right:-4px; background:#fff; border-radius:50%; width:24px;height:24px; font-size:12px; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(0,0,0,0.15);">${icon}</div>
                    </div>
                    <div style="flex:1; line-height:1.4; text-align:right;">
                        <div style="font-size:14.5px; color:var(--text-main);">${tH || "إشعار جديد"}</div>
                        <div style="font-size:12px; color:${x.read === false ? 'var(--primary)' : '#64748b'}; font-weight:700; margin-top:4px;">${tm}</div>
                    </div>
                    ${uD}
                </div>`;
            } catch (err) {}
        });
    }
    window.isInitialNotifLoad = false;
    let b = $('notifBadge'); if (c > 0) { b.style.display = 'inline-block'; b.innerText = c; } else b.style.display = 'none';
    let head = `<div class="notif-panel-header">
        <span class="notif-panel-title"><i class="fas fa-bell"></i> الإشعارات</span>
        <div class="notif-panel-actions">
            <span class="notif-mark-read" onclick="event.stopPropagation();window.markNotifsAsRead()">تحديد الكل كمقروء</span>
            <span class="notif-close-btn" onclick="event.stopPropagation();window.closeNotifPanel()"><i class="fas fa-times"></i></span>
        </div>
    </div>`;
    dd.innerHTML = head + (h
        ? `<div class="notif-list-scroll">${h}</div>`
        : `<div class="notif-list-scroll"><div class="notif-empty"><i class="far fa-bell-slash"></i>لا توجد إشعارات بعد</div></div>`);
};
window.rerenderNotifications = () => { if (window.currentUser) window._renderNotifications(window._lastNotifRaw); };
function listenToNotifications() { onValue(ref(db, `users/${window.currentUser}/notifications`), s => { window._renderNotifications(s.exists() ? s.val() : null); }); }
window.listenToNotifications = listenToNotifications;
window.handleNotifClick = (id, t, f, p) => { update(ref(db, `users/${window.currentUser}/notifications/${id}`), {read:true}); $('notifDropdown').style.display='none'; if(t==='friend_req') window.openRequestsModal(); else if(t==='accept_req' || t==='system') window.openProfile(f); else if(['comment','like','share','reply','mention','comment_like'].includes(t) && p && p!=='undefined') window.openPostModal(p); };
window.markNotifsAsRead = () => { get(ref(db, `users/${window.currentUser}/notifications`)).then(s => { if(s.exists()) { let updates = {}; s.forEach(c => { if(c.val().read === false) updates[`${c.key}/read`] = true; }); if(Object.keys(updates).length > 0) update(ref(db, `users/${window.currentUser}/notifications`), updates); } }); };
function renderSidebarTop() { let h=''; let reqArr = Object.entries(window.currentRequests||{}).map(([k,v]) => ({id:k, time: v===true ? 0 : v})).sort((a,b) => b.time - a.time); let rc = reqArr.length; if(rc > 0) { h += `<div class="sidebar-title" style="color:var(--primary);"><em class="fas fa-user-friends"></em> طلبات الصداقة (${rc})</div>`; let maxReq = Math.min(rc, 3); for(let i=0; i<maxReq; i++) { let s = reqArr[i].id, p = window.allUsersData[s]?.profilePic || dA, d = window.getDisplayName(s); h += `<div class="user-row"><a href="#/@${s}" class="user-info" style="color:inherit; text-decoration:none;"><img src="${p}" class="avatar-small"><span>${d}</span></a><div style="display:flex;gap:5px;"><button class="btn-primary" style="background:#10b981;padding:4px 10px;border-radius:6px;" onclick="window.acceptRequest('${s}')"><i class="fas fa-check"></i></button><button class="btn-secondary" style="padding:4px 10px;border-radius:6px;" onclick="window.rejectRequest('${s}')"><i class="fas fa-times"></i></button></div></div>`; } } else { let sg = window.getSuggestions ? window.getSuggestions().filter(x => !window.sentRequests[x.name]) : [], t3 = sg.slice(0,3); if(t3.length > 0) { h += `<div class="sidebar-title" style="color:var(--secondary);"><em class="fas fa-user-plus"></em> مقترحون</div>`; t3.forEach(s => { let p = s.data.profilePic || dA, d = window.getDisplayName(s.name); h += `<div class="user-row"><a href="#/@${s.name}" class="user-info" style="color:inherit; text-decoration:none;"><img src="${p}" class="avatar-small"><span>${d}</span></a><button class="btn-primary" style="padding:4px 10px;font-size:12px;border-radius:6px;" onclick="event.stopPropagation();window.sendFriendRequestToFromFeed('${s.name}',this)"><i class="fas fa-user-plus"></i></button></div>`; }); } } let c = $('sidebarTopSection'); if(c) c.innerHTML = h; }
;
window.renderSidebarTop = renderSidebarTop;
window.closeNotifPanel = () => {
    let e = $('notifDropdown'); if(e) e.style.display = 'none';
    document.body.style.overflow = 'auto';
};
