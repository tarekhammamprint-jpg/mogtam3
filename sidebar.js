import { ref, set, get, update, push, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

window.followChannel = async (channelId, btn) => {
    if (!window.currentUser) return window.showRegisterModal();
    const r = ref(db, `users/${channelId}/followers/${window.currentUser}`);
    const snap = await get(r);
    if (snap.exists()) {
        await remove(r); await remove(ref(db, `users/${window.currentUser}/following/${channelId}`));
        if (window.allUsersData[window.currentUser]) { if (!window.allUsersData[window.currentUser].following) window.allUsersData[window.currentUser].following = {}; delete window.allUsersData[window.currentUser].following[channelId]; }
        if (btn) { btn.innerHTML = '<i class="fas fa-plus"></i> متابعة'; btn.style.background = 'var(--primary)'; btn.style.color = '#fff'; }
    } else {
        await set(r, true); await set(ref(db, `users/${window.currentUser}/following/${channelId}`), true);
        if (window.allUsersData[window.currentUser]) { if (!window.allUsersData[window.currentUser].following) window.allUsersData[window.currentUser].following = {}; window.allUsersData[window.currentUser].following[channelId] = true; }
        if (btn) { btn.innerHTML = '<i class="fas fa-check"></i> تتابع'; btn.style.background = '#e0e7ff'; btn.style.color = 'var(--primary)'; }
    }
    const cs = await get(ref(db, `users/${channelId}/followers`));
    const count = cs.exists() ? Object.keys(cs.val()).length : 0;
    const countEl = btn ? btn.closest('.channel-card')?.querySelector('.followers-count') : null;
    if (countEl) countEl.innerText = count + ' متابع';
    window.feedLim = 5; window.renderFeed();
};
window.renderNewsChannels = async () => {
    const area = document.getElementById('newsChannelsArea');
    if (!area) return;
    try {
        const snap = await get(ref(db, 'users'));
        if (!snap.exists()) return;
        const allU = snap.val();
        const channels = Object.entries(allU).filter(([, u]) => u.isNewsBot);
        if (channels.length === 0) { area.style.display = 'none'; return; }
        const myI = new Set(window.allUsersData[window.currentUser]?.interests || []);
        channels.sort(([, a], [, b]) => { const am = (a.interests||[]).some(i=>myI.has(i))?1:0, bm = (b.interests||[]).some(i=>myI.has(i))?1:0; return bm-am; });
        let h = '<div style="margin:0 0 12px;font-size:15px;font-weight:800;color:var(--text-main);display:flex;align-items:center;gap:8px;"><i class="fas fa-satellite-dish" style="color:var(--primary);"></i> قنوات الأخبار</div><div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;scrollbar-width:thin;">';
        for (const [id, u] of channels) {
            const fc = u.followers ? Object.keys(u.followers).length : 0;
            const isF = u.followers && u.followers[window.currentUser];
            h += `<div class="channel-card" style="flex-shrink:0;width:140px;background:#fff;border-radius:16px;border:1px solid var(--border-color);overflow:hidden;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);"><div style="height:55px;background:url('${u.coverPic||''}') center/cover;position:relative;cursor:pointer;" onclick="window.openProfile('${id}')"><img src="${u.profilePic||dA}" style="width:50px;height:50px;border-radius:50%;border:3px solid #fff;position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);object-fit:cover;"></div><div style="padding:26px 10px 12px;"><div style="font-size:12px;font-weight:800;color:var(--text-main);cursor:pointer;margin-bottom:3px;" onclick="window.openProfile('${id}')">${u.displayName}</div><div class="followers-count" style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">${fc} متابع</div><button onclick="window.followChannel('${id}',this)" style="width:100%;border:none;padding:6px;border-radius:20px;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;background:${isF?'#e0e7ff':'var(--primary)'};color:${isF?'var(--primary)':'#fff'};"><i class="fas fa-${isF?'check':'plus'}"></i> ${isF?'تتابع':'متابعة'}</button></div></div>`;
        }
        h += '</div>';
        area.innerHTML = h;
        area.style.display = 'block';
    } catch(e) { console.log('renderNewsChannels error:', e); }
};
window.initRightSidebar = async () => {
    if (!window.currentUser) return;
    const container = document.getElementById('rightSidebarContainer');
    if (!container) return;

    container.style.removeProperty('display');
    container.style.display = 'block';

    let d = window.allUsersData[window.currentUser];
    if (!d) {
        await new Promise(r => setTimeout(r, 800));
        d = window.allUsersData[window.currentUser] || {};
    }

    const pic  = d.profilePic || dA;
    const name = d.displayName || window.currentUser;
    let el;
    el = document.getElementById('rsUserPic');    if(el) el.src = pic;
    el = document.getElementById('rsUserName');   if(el) el.innerText = name;
    el = document.getElementById('rsUserHandle'); if(el) el.innerText = '@' + window.currentUser;
    el = document.getElementById('rsProfileLink');if(el) el.href = '#/@' + window.currentUser;

    window.renderRSChannels && window.renderRSChannels();
    window.renderRSCommunities && window.renderRSCommunities();
};
window.renderRSChannels = async () => {
    const wrap = document.getElementById('rsChannelsWrap');
    const list = document.getElementById('rsChannelsList');
    if (!wrap || !list) return;
    try {
        const snap = await get(ref(db, 'users'));
        if (!snap.exists()) return;
        const channels = Object.entries(snap.val()).filter(([,u]) => u.isNewsBot);
        if (channels.length === 0) { wrap.style.display = 'none'; return; }
        wrap.style.display = 'block';
        list.innerHTML = channels.slice(0, 6).map(([id, u]) => {
            const isF = u.followers && u.followers[window.currentUser];
            return `<div class="rs-channel-row" onclick="window.openProfile('${id}')">
                <img src="${u.profilePic||dA}" class="rs-channel-pic">
                <span class="rs-channel-name">${u.displayName}</span>
                <button class="rs-channel-btn"
                    style="background:${isF?'#e0e7ff':'var(--primary)'};color:${isF?'var(--primary)':'#fff'};"
                    onclick="event.stopPropagation();window.followChannel('${id}',this)">
                    ${isF ? '✓' : '+ تابع'}
                </button>
            </div>`;
        }).join('');
    } catch(e) {}
};
window.renderRSCommunities = () => {
    const wrap = document.getElementById('rsCommWrap');
    const list = document.getElementById('rsCommunityList');
    if (!wrap || !list) return;
    const mine = Object.entries(window.allCommunities || {})
        .filter(([,c]) => c.members && c.members[window.currentUser]);
    if (mine.length === 0) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    list.innerHTML = mine.slice(0, 5).map(([id, c]) =>
        `<div class="rs-comm-row" onclick="window.openCommunityView('${id}')">
            <div class="rs-comm-icon"><i class="fas fa-users"></i></div>
            <span class="rs-comm-name">${c.name}</span>
        </div>`
    ).join('');
};
window.openRequestsModal = () => { if(!window.currentUser) return window.showRegisterModal(); window.location.hash = '#/requests'; };
window.renderSuggestedUsersModal = () => { let s = window.getSuggestions ? window.getSuggestions().slice(0,15) : [], h=''; if(s.length===0) h='<p style="text-align:center;color:#666;font-size:14px;padding:20px;">لا يوجد مقترحات حالياً (تظهر فقط للأصدقاء المشتركين أو المقربين).</p>'; else s.forEach(x => { let p=x.data.profilePic||dA, d=window.getDisplayName(x.name), st=x.mutualCount>0?`مشترون: ${x.mutualCount}`:'من منطقتك', rr = window.currentRequests && window.currentRequests[x.name], b=''; if(window.sentRequests && window.sentRequests[x.name]) b=`<button class="btn-secondary" disabled style="padding:6px 12px;font-size:13px;"><i class="fas fa-clock"></i> أرسل</button>`; else if(rr) b=`<button class="btn-primary" style="background:#10b981;padding:6px 12px;font-size:13px;" onclick="event.stopPropagation();window.acceptRequestFromFeed('${x.name}')"><i class="fas fa-check"></i> قبول</button>`; else b=`<button class="btn-primary" data-action="add" data-target="${x.name}" style="padding:6px 12px;font-size:13px;" onclick="event.stopPropagation();window.sendFriendRequestToFromFeed('${x.name}',this)"><i class="fas fa-user-plus"></i> إضافة</button>`; h += `<div class="req-row"><a href="#/@${x.name}" style="display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;"><img src="${p}" class="avatar-small"><div style="display:flex;flex-direction:column;cursor:pointer;"><strong style="font-size:15px;color:var(--text-main);text-align:right;">${d}</strong><span style="font-size:12px;color:var(--text-muted);text-align:right;">${st}</span></div></a><div class="req-actions">${b}</div></div>`; }); let u = $('usersList'); if(u) u.innerHTML=h; };
window.sendFriendRequestToFromFeed = (t, b) => { if(!window.currentUser) { window.showRegisterModal(); return; } if(t === window.currentUser) return; window.sentRequests[t] = true; document.querySelectorAll(`button[data-action="add"][data-target="${t}"]`).forEach(x => { x.innerHTML = `<i class="fas fa-clock"></i> أرسل`; x.style.background = "#e2e8f0"; x.style.color = "#0f172a"; x.disabled = true; }); if(b && !b.hasAttribute('data-target')) { b.innerHTML = `<i class="fas fa-clock"></i> أرسل`; b.style.background = "#e2e8f0"; b.style.color = "#0f172a"; b.disabled = true; } set(ref(db, `friendRequests/${t}/${window.currentUser}`), Date.now()).then(() => push(ref(db, `users/${t}/notifications`), {type:'friend_req', from:window.currentUser, timestamp:Date.now(), read:false})); };
window.cancelFriendRequest = (t) => { if(!window.currentUser) return; delete window.sentRequests[t]; remove(ref(db, `friendRequests/${t}/${window.currentUser}`)).then(() => window.openProfile(t)); };
window.acceptRequestFromProfile = (t, b) => { if(!window.currentUser) return; if(b) { b.innerHTML = `<i class="fas fa-user-friends"></i> تم القبول`; b.style.background = "#e2e8f0"; b.style.color = "#0f172a"; b.disabled = true; } let up = {}; up[`friends/${window.currentUser}/${t}`] = true; up[`friends/${t}/${window.currentUser}`] = true; update(ref(db), up).then(() => { remove(ref(db, `friendRequests/${window.currentUser}/${t}`)); push(ref(db, `users/${t}/notifications`), {type:'accept_req', from:window.currentUser, timestamp:Date.now(), read:false}); }); };
window.acceptRequestFromFeed = (t) => { if(!window.currentUser) return; let up = {}; up[`friends/${window.currentUser}/${t}`] = true; up[`friends/${t}/${window.currentUser}`] = true; update(ref(db), up).then(() => { remove(ref(db, `friendRequests/${window.currentUser}/${t}`)); push(ref(db, `users/${t}/notifications`), {type:'accept_req', from:window.currentUser, timestamp:Date.now(), read:false}); }); };
window.acceptRequest = (s) => { if(!window.currentUser) return; let up = {}; up[`friends/${window.currentUser}/${s}`] = true; up[`friends/${s}/${window.currentUser}`] = true; update(ref(db), up).then(() => { remove(ref(db, `friendRequests/${window.currentUser}/${s}`)); push(ref(db, `users/${s}/notifications`), {type:'accept_req', from:window.currentUser, timestamp:Date.now(), read:false}); }); };
window.rejectRequest = (s) => { if(!window.currentUser) return; remove(ref(db, `friendRequests/${window.currentUser}/${s}`)); };
window.unfriend = (t) => { if(!window.currentUser) return; window.dlgDanger("هل تريد حذف هذه الصداقة؟", "حذف الصداقة").then(ok => { if(ok) { let up = {}; up[`friends/${window.currentUser}/${t}`] = null; up[`friends/${t}/${window.currentUser}`] = null; update(ref(db), up).then(() => window.openProfile(t)); } }); };
window.openRequestsLogic = () => { window.renderSuggestedUsersModal(); $('requestsModal').classList.add('show'); document.body.style.overflow = 'hidden'; };
function renderRequests() { let c = 0, h = ''; let reqArr = Object.entries(window.currentRequests||{}).map(([k,v]) => ({id:k, time: v===true ? 0 : v})).sort((a,b) => b.time - a.time); for(let req of reqArr) { let s = req.id; c++; h += `<div class="req-row"><a href="#/@${s}" style="display:flex;align-items:center;gap:8px;color:inherit;text-decoration:none;"><img src="${window.allUsersData[s]?.profilePic || dA}" class="avatar-small"><strong>${window.getDisplayName(s)}</strong></a><div class="req-actions"><button class="btn-accept" onclick="window.acceptRequest('${s}')"><i class="fas fa-check"></i></button><button class="btn-reject" onclick="window.rejectRequest('${s}')"><i class="fas fa-times"></i></button></div></div>`; } let b1 = $('reqBadge'), b2 = $('reqBadgeMobile'); if(c > 0) { b1.style.display = 'inline-block'; b1.innerText = c; b2.style.display = 'inline-block'; b2.innerText = c; } else { b1.style.display = 'none'; b2.style.display = 'none'; h = '<p style="color:#666;text-align:center;">لا طلبات.</p>'; } $('requestsList').innerHTML = h; window.renderSidebarTop(); }
window.renderRequests = renderRequests;
function listenToFriendRequests() { onValue(ref(db, `friendRequests/${window.currentUser}`), s => { window.currentRequests = s.exists() ? s.val() : {}; window.renderRequests(); }); }
window.listenToFriendRequests = listenToFriendRequests;
function renderSidebarUsers() { let fh = '', fa = [], rh = '', ra = []; window.myFriends.forEach(f => { if(window.allUsersData[f]) fa.push({name:f, time:window.recentChatsData[f] || 0, uc:window.unreadChatsData[f] || 0, d:window.allUsersData[f]}); }); let cu = new Set([...Object.keys(window.recentChatsData || {}), ...Object.keys(window.unreadChatsData || {})]); cu.forEach(c => { if(!window.myFriends.includes(c) && c !== window.currentUser && window.allUsersData[c]) ra.push({name:c, time:window.recentChatsData[c] || 0, uc:window.unreadChatsData[c] || 0, d:window.allUsersData[c]}); }); fa.sort((a,b) => b.time - a.time); fa.forEach(f => { fh += `<div class="user-row"><a href="#/@${f.name}" class="user-info" style="color:inherit; text-decoration:none;"><img src="${f.d.profilePic||dA}" class="avatar-small"><span>${window.getDisplayName(f.name)}</span></a><div style="display:flex;align-items:center;gap:10px;">${f.uc>0?`<span class="unread-msg-badge">${f.uc}</span>`:''}<button class="btn-primary" style="padding:4px 10px;font-size:12px;border-radius:4px;" onclick="event.stopPropagation();window.openChat('${f.name}')"><i class="fas fa-comment-dots"></i></button><span class="status-dot ${f.d.online?'online':'offline'}"></span></div></div>`; }); $('friendsList').innerHTML = fh || '<span style="color:#888;font-size:13px;">لا أصدقاء</span>'; ra.sort((a,b) => b.time - a.time); ra.forEach(r => { rh += `<div class="user-row" style="background:#fffbeb;border:1px solid #fde68a;"><a href="#/@${r.name}" class="user-info" style="color:inherit; text-decoration:none;"><img src="${r.d.profilePic||dA}" class="avatar-small"><span>${window.getDisplayName(r.name)}</span></a><div style="display:flex;align-items:center;gap:10px;">${r.uc>0?`<span class="unread-msg-badge">${r.uc}</span>`:''}<button class="btn-primary" style="background:#f59e0b;padding:4px 10px;font-size:12px;border-radius:4px;" onclick="event.stopPropagation();window.openChat('${r.name}')"><i class="fas fa-comment-dots"></i></button></div></div>`; }); let h = $('msgRequestsHeader'); if(ra.length > 0) { h.style.display = 'block'; $('msgRequestsList').innerHTML = rh; } else { h.style.display = 'none'; $('msgRequestsList').innerHTML = ''; } }
window.renderSidebarUsers = renderSidebarUsers;
window.getSuggestions = () => { let ml = window.currentUser ? (window.allUsersData[window.currentUser]?.location || "غير محدد") : "غير محدد", sg = []; for(let u in window.allUsersData) { if(u === window.currentUser || window.myFriends.includes(u)) continue; let d = window.allUsersData[u];  let tf = Object.keys(window.allFriendsData[u] || {}), mc = tf.filter(f => window.myFriends.includes(f)).length, isl = (d.location && d.location === ml && ml !== "غير محدد"); if(mc > 0 || isl) { sg.push({name:u, data:d, mutualCount:mc, isSameLocation:isl}); } } sg.sort((a,b) => { if(b.mutualCount !== a.mutualCount) return b.mutualCount - a.mutualCount; if(b.isSameLocation && !a.isSameLocation) return 1; if(!b.isSameLocation && a.isSameLocation) return -1; return 0; }); return sg; };
function createSuggestedFriendsWidget() { let s = window.getSuggestions().slice(0,10); if(s.length === 0) return ''; let ch = ''; s.forEach(x => { let rr = window.currentRequests && window.currentRequests[x.name], b = ''; if(window.sentRequests && window.sentRequests[x.name]) b = `<button disabled style="background:#e2e8f0;color:#0f172a;"><i class="fas fa-clock"></i> أرسل</button>`; else if(rr) b = `<button style="background:#10b981;color:white;" onclick="event.stopPropagation();window.acceptRequestFromFeed('${x.name}')"><i class="fas fa-check"></i> قبول</button>`; else b = `<button data-action="add" data-target="${x.name}" onclick="event.stopPropagation();window.sendFriendRequestToFromFeed('${x.name}',this)"><i class="fas fa-user-plus"></i> إضافة</button>`; ch += `<div class="suggested-card"><a href="#/@${x.name}" style="color:inherit; text-decoration:none;"><img src="${x.data.profilePic||dA}"><span class="s-name" style="display:block;">${window.getDisplayName(x.name)}</span><span class="s-mutual" style="display:block;margin-bottom:5px;"><i class="fas ${x.mutualCount > 0 ? 'fa-user-friends' : 'fa-map-marker-alt'}"></i> ${x.mutualCount > 0 ? `مشتركون: ${x.mutualCount}` : 'من منطقتك'}</span></a>${b}</div>`; }); return `<div class="suggested-widget"><h4><i class="fas fa-users"></i> مقترحات</h4><div class="suggested-carousel">${ch}</div></div>`; }
window.createSuggestedFriendsWidget = createSuggestedFriendsWidget;
function listenToAds() {
    onValue(ref(db, 'ads'), snap => {
        const now = Date.now();
        window.activeAds = snap.exists()
            ? Object.entries(snap.val())
                .map(([id, a]) => ({ ...a, id }))
                .filter(a => a.status === 'active' && (!a.endDate || new Date(a.endDate).getTime() > now))
            : [];
        renderSidebarAd();
    });
}
window.listenToAds = listenToAds;
function createAdHTML(ad) {
    const ownerName = window.allUsersData[ad.owner]?.displayName || ad.owner || 'معلن';
    const ownerPic = window.allUsersData[ad.owner]?.profilePic || dA;
    const mediaHtml = ad.mediaUrl
        ? (ad.mediaType === 'image'
            ? `<img src="${ad.mediaUrl}" class="post-media" style="cursor:default;">`
            : `<div class="smart-video-wrap"><video src="${ad.mediaUrl}" class="smart-video" muted playsinline preload="metadata" style="background:#1e293b;cursor:pointer;"></video><div class="sv-overlay"><i class="fas fa-play sv-play-icon"></i></div><button class="sv-mute-btn" onclick="event.stopPropagation();window.toggleVideoMute(this)"><i class="fas fa-volume-mute"></i></button></div>`)
        : '';
    const ctaHtml = ad.destinationUrl
        ? `<a href="${ad.destinationUrl}" target="_blank" rel="noopener" class="ad-cta-btn"><i class="fas fa-external-link-alt"></i> ${ad.cta || 'اعرف المزيد'}</a>`
        : '';
    return `<div class="post ad-post" style="border:1.5px solid #e0e7ff;position:relative;">
        <div class="ad-sponsored-badge"><i class="fas fa-bullhorn"></i> ممول</div>
        <div class="post-header">
            <div style="display:flex;gap:10px;align-items:center;">
                <img src="${ownerPic}" class="avatar-small">
                <div>
                    <div style="font-weight:700;font-size:14px;">${ownerName}</div>
                    <div style="font-size:11px;color:#94a3b8;">إعلان ممول · <i class="fas fa-globe-americas"></i></div>
                </div>
            </div>
        </div>
        ${ad.description ? `<div style="padding:0 0 10px;font-size:14px;color:#334155;">${ad.description}</div>` : ''}
        ${mediaHtml}
        ${ad.headline || ad.destinationUrl ? `
        <div class="ad-bottom-bar">
            <div>
                ${ad.headline ? `<div style="font-size:14px;font-weight:700;color:#0f172a;">${ad.headline}</div>` : ''}
                ${ad.destinationUrl ? `<div style="font-size:11px;color:#64748b;">${ad.destinationUrl.replace(/^https?:\/\//,'').split('/')[0]}</div>` : ''}
            </div>
            ${ctaHtml}
        </div>` : ''}
    </div>`;
}
function renderSidebarAd() {
    const slot = document.getElementById('sidebarAdSlot');
    if (!slot || !window.activeAds.length) { if(slot) slot.innerHTML = ''; return; }
    const ad = window.activeAds[Math.floor(Math.random() * window.activeAds.length)];
    const ownerPic = window.allUsersData[ad.owner]?.profilePic || dA;
    const ownerName = window.allUsersData[ad.owner]?.displayName || ad.owner || 'معلن';
    slot.innerHTML = `
        <div class="sidebar-ad-card">
            <div class="sidebar-ad-label"><i class="fas fa-bullhorn"></i> إعلان ممول</div>
            ${ad.mediaUrl && ad.mediaType === 'image' ? `<img src="${ad.mediaUrl}" class="sidebar-ad-img">` : ''}
            <div class="sidebar-ad-body">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                    <img src="${ownerPic}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;">
                    <span style="font-size:12px;font-weight:700;">${ownerName}</span>
                </div>
                <div class="sidebar-ad-title">${ad.headline || ''}</div>
                <div class="sidebar-ad-desc">${(ad.description||'').substring(0,80)}${(ad.description||'').length>80?'...':''}</div>
                ${ad.destinationUrl ? `<a href="${ad.destinationUrl}" target="_blank" class="sidebar-ad-btn">${ad.cta||'اعرف المزيد'} <i class="fas fa-arrow-left"></i></a>` : ''}
            </div>
        </div>`;
}
window.getActiveAdHTML = () => {
    if (!window.activeAds || !window.activeAds.length) return '';
    const ad = window.activeAds[Math.floor(Math.random() * window.activeAds.length)];
    return createAdHTML(ad);
};
function listenToAllFriends(){ onValue(ref(db,'friends'), s => { window.allFriendsData = s.exists() ? s.val() : {}; window.myFriends = window.allFriendsData[window.currentUser] ? Object.keys(window.allFriendsData[window.currentUser]) : []; window.renderSidebarUsers(); if(!window.isInitialLoad){ window.feedLim=5; window.renderFeed(); } }); }
window.listenToAllFriends = listenToAllFriends;
function listenToUnreadChats(){ onValue(ref(db,`users/${window.currentUser}/unreadChats`), s => { window.unreadChatsData = s.exists() ? s.val() : {}; let t=0; if(window.currentChatTarget && window.isChatBoxVisible && window.unreadChatsData[window.currentChatTarget]){ remove(ref(db,`users/${window.currentUser}/unreadChats/${window.currentChatTarget}`)); delete window.unreadChatsData[window.currentChatTarget]; } for(let x in window.unreadChatsData){ let c = window.unreadChatsData[x], p = window.previousUnreadChats[x]||0; t+=c; if(c>p && x!==window.currentChatTarget) window.showToast("رسالة جديدة", `أرسل ${window.getDisplayName(x)} رسالة`, window.allUsersData[x]?.profilePic); } window.previousUnreadChats = {...window.unreadChatsData}; let b1=$('chatBadge'), b2=$('chatBadgeMobile'); if(t>0){ b1.style.display='inline-block'; b1.innerText=t; b2.style.display='inline-block'; b2.innerText=t; } else { b1.style.display='none'; b2.style.display='none'; } window.renderSidebarUsers(); }); }
window.listenToUnreadChats = listenToUnreadChats;
function listenToRecentChats(){ onValue(ref(db,`users/${window.currentUser}/recentChats`), s => { window.recentChatsData = s.exists() ? s.val() : {}; window.renderSidebarUsers(); }); }
window.listenToRecentChats = listenToRecentChats;
window.checkFriendsBirthdays = () => {
    if(!window.currentUser || !window.myFriends) return;
    let today = new Date(), tm = today.getMonth()+1, td = today.getDate();
    window.myFriends.forEach(f => {
        let d = window.allUsersData[f]; if(!d || !d.birthdate) return;
        let parts = d.birthdate.split('-'); if(parts.length < 3) return;
        let bm = parseInt(parts[1]), bd = parseInt(parts[2]);
        if(bm === tm && bd === td) window.showToast('🎂 عيد ميلاد!', `اليوم عيد ميلاد ${window.getDisplayName(f)}`, d.profilePic || dA);
    });
};
