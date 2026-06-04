import { ref, set, get, onValue, push, update, remove, onDisconnect, query, orderByChild, limitToLast, equalTo } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";
import "./auth.js";
import "./communities.js";
import "./chat.js";

// ── نظام المتابعة ─────────────────────────────────────────
window.followChannel = async (channelId, btn) => {
    if (!window.currentUser) return window.showRegisterModal();
    const r = ref(db, `users/${channelId}/followers/${window.currentUser}`);
    const snap = await get(r);
    if (snap.exists()) {
        await remove(r);
        await remove(ref(db, `users/${window.currentUser}/following/${channelId}`));
        // تحديث محلي فوري
        if (window.allUsersData[window.currentUser]) {
            if (!window.allUsersData[window.currentUser].following) window.allUsersData[window.currentUser].following = {};
            delete window.allUsersData[window.currentUser].following[channelId];
        }
        if (btn) { 
            btn.innerHTML = '<i class="fas fa-plus"></i> متابعة'; 
            btn.classList.remove('following');
            btn.style.background = 'var(--primary)';
            btn.style.color = '#fff';
        }
    } else {
        await set(r, true);
        await set(ref(db, `users/${window.currentUser}/following/${channelId}`), true);
        // تحديث محلي فوري
        if (window.allUsersData[window.currentUser]) {
            if (!window.allUsersData[window.currentUser].following) window.allUsersData[window.currentUser].following = {};
            window.allUsersData[window.currentUser].following[channelId] = true;
        }
        if (btn) { 
            btn.innerHTML = '<i class="fas fa-check"></i> تتابع'; 
            btn.classList.add('following');
            btn.style.background = '#e0e7ff';
            btn.style.color = 'var(--primary)';
        }
    }
    // تحديث العداد
    const countSnap = await get(ref(db, `users/${channelId}/followers`));
    const count = countSnap.exists() ? Object.keys(countSnap.val()).length : 0;
    const countEl = btn ? btn.closest('.channel-card')?.querySelector('.followers-count') : null;
    if (countEl) countEl.innerText = count + ' متابع';
    // إعادة رسم الفيد لإظهار/إخفاء منشورات القناة فوراً
    if (typeof renderFeed === 'function') renderFeed();
};

window.renderNewsChannels = async () => {
    const area = document.getElementById('newsChannelsArea');
    if (!area) return;
    const snap = await get(ref(db, 'users'));
    if (!snap.exists()) return;
    const users = snap.val();
    const channels = Object.entries(users).filter(([, u]) => u.isNewsBot);
    if (channels.length === 0) { area.innerHTML = ''; return; }

    // اهتمامات المستخدم الحالي
    const myInterests = new Set(window.allUsersData[window.currentUser]?.interests || []);

    // ترتيب: المتوافقة مع اهتمامات المستخدم أولاً
    channels.sort(([, a], [, b]) => {
        const aMatch = (a.interests || []).some(i => myInterests.has(i)) ? 1 : 0;
        const bMatch = (b.interests || []).some(i => myInterests.has(i)) ? 1 : 0;
        return bMatch - aMatch;
    });

    let h = `<div style="margin:0 0 12px;font-size:15px;font-weight:800;color:var(--text-main);display:flex;align-items:center;gap:8px;">
        <i class="fas fa-satellite-dish" style="color:var(--primary);"></i> قنوات الأخبار
    </div><div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;scrollbar-width:thin;">`;

    for (const [id, u] of channels) {
        const fc = u.followers ? Object.keys(u.followers).length : 0;
        const isFollowing = u.followers && u.followers[window.currentUser];
        h += `<div class="channel-card" style="flex-shrink:0;width:140px;background:#fff;border-radius:16px;border:1px solid var(--border-color);overflow:hidden;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="height:55px;background:url('${u.coverPic||''}') center/cover;position:relative;cursor:pointer;" onclick="window.openProfile('${id}')">
                <img src="${u.profilePic || dA}" style="width:50px;height:50px;border-radius:50%;border:3px solid #fff;position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);object-fit:cover;">
            </div>
            <div style="padding:26px 10px 12px;">
                <div style="font-size:12px;font-weight:800;color:var(--text-main);line-height:1.3;margin-bottom:3px;cursor:pointer;" onclick="window.openProfile('${id}')">${u.displayName}</div>
                <div class="followers-count" style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">${fc} متابع</div>
                <button onclick="window.followChannel('${id}', this)" 
                    class="follow-btn${isFollowing ? ' following' : ''}"
                    style="width:100%;border:none;padding:6px;border-radius:20px;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;background:${isFollowing ? '#e0e7ff' : 'var(--primary)'};color:${isFollowing ? 'var(--primary)' : '#fff'};transition:all .2s;">
                    <i class="fas fa-${isFollowing ? 'check' : 'plus'}"></i> ${isFollowing ? 'تتابع' : 'متابعة'}
                </button>
            </div>
        </div>`;
    }
    h += '</div>';
    area.innerHTML = h;
};

// ============================================================
//  نظام النوافذ المخصص — مدمج في app.js
// ============================================================
function initDialogSystem() {
  const style = document.createElement('style');
  style.textContent = `
    #dlg-overlay {
      position:fixed;inset:0;z-index:99999;
      background:rgba(15,23,42,.6);
      backdrop-filter:blur(6px);
      display:flex;align-items:center;justify-content:center;
      padding:20px;
      opacity:0;pointer-events:none;
      transition:opacity .22s ease;
    }
    #dlg-overlay.dlg-show{opacity:1;pointer-events:auto;}
    #dlg-box{
      background:#fff;border-radius:22px;
      width:100%;max-width:400px;
      box-shadow:0 24px 80px rgba(0,0,0,.25);
      overflow:hidden;
      transform:scale(.88) translateY(24px);
      transition:transform .28s cubic-bezier(.34,1.56,.64,1);
      font-family:'Cairo',sans-serif;direction:rtl;
    }
    #dlg-overlay.dlg-show #dlg-box{transform:scale(1) translateY(0);}
    #dlg-icon-wrap{padding:28px 28px 0;display:flex;justify-content:center;}
    .dlg-ic{width:68px;height:68px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;}
    .dlg-ic.info   {background:#eff6ff;color:#2563eb;}
    .dlg-ic.success{background:#f0fdf4;color:#16a34a;}
    .dlg-ic.warning{background:#fffbeb;color:#d97706;}
    .dlg-ic.danger {background:#fef2f2;color:#dc2626;}
    .dlg-ic.question{background:#f5f3ff;color:#7c3aed;}
    .dlg-ic.input  {background:#f0f9ff;color:#0284c7;}
    #dlg-body{padding:18px 26px 22px;text-align:center;}
    #dlg-title{font-size:18px;font-weight:800;color:#0f172a;margin-bottom:8px;line-height:1.4;}
    #dlg-msg{font-size:14px;color:#475569;line-height:1.8;}
    #dlg-inp{
      width:100%;margin-top:14px;padding:12px 16px;
      border:2px solid #e2e8f0;border-radius:12px;
      font-family:'Cairo',sans-serif;font-size:14px;
      outline:none;box-sizing:border-box;
      direction:rtl;text-align:right;transition:border .2s;
    }
    #dlg-inp:focus{border-color:#2563eb;}
    #dlg-footer{padding:4px 20px 22px;display:flex;gap:10px;justify-content:center;}
    .dlg-btn{
      flex:1;min-width:90px;max-width:180px;
      padding:11px 16px;border:none;border-radius:12px;
      font-family:'Cairo',sans-serif;font-size:14px;font-weight:700;
      cursor:pointer;transition:filter .15s,transform .1s;
    }
    .dlg-btn:hover{filter:brightness(.92);}
    .dlg-btn:active{transform:scale(.97);}
    .dlg-ok    {background:#2563eb;color:#fff;}
    .dlg-cancel{background:#f1f5f9;color:#475569;}
    .dlg-danger{background:#ef4444;color:#fff;}
    .dlg-success{background:#10b981;color:#fff;}
    .dlg-warn  {background:#f59e0b;color:#fff;}
  `;
  document.head.appendChild(style);

  const ov = document.createElement('div');
  ov.id = 'dlg-overlay';
  ov.innerHTML = `<div id="dlg-box">
    <div id="dlg-icon-wrap"><div class="dlg-ic" id="dlg-ic"></div></div>
    <div id="dlg-body">
      <div id="dlg-title"></div>
      <div id="dlg-msg"></div>
      <input id="dlg-inp" type="text" style="display:none">
    </div>
    <div id="dlg-footer"></div>
  </div>`;
  document.body.appendChild(ov);

  const ICONS = {
    info:'<i class="fas fa-info"></i>',
    success:'<i class="fas fa-check"></i>',
    warning:'<i class="fas fa-exclamation"></i>',
    danger:'<i class="fas fa-times"></i>',
    question:'<i class="fas fa-question"></i>',
    input:'<i class="fas fa-pencil-alt"></i>',
  };

  function dlgOpen(opts) {
    return new Promise(resolve => {
      const type = opts.type || 'info';
      const inp  = document.getElementById('dlg-inp');
      document.getElementById('dlg-ic').className    = 'dlg-ic ' + type;
      document.getElementById('dlg-ic').innerHTML    = ICONS[type] || ICONS.info;
      document.getElementById('dlg-title').innerHTML = opts.title   || '';
      document.getElementById('dlg-msg').innerHTML   = opts.message || '';

      if (opts.isPrompt) {
        inp.style.display   = 'block';
        inp.value           = opts.defaultVal || '';
        inp.placeholder     = opts.placeholder || '';
        setTimeout(() => inp.focus(), 260);
      } else {
        inp.style.display = 'none';
      }

      const footer = document.getElementById('dlg-footer');
      footer.innerHTML = '';
      (opts.buttons || [{label:'حسناً',val:true,cls:'dlg-ok'}]).forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'dlg-btn ' + (b.cls || 'dlg-ok');
        btn.innerHTML = b.label;
        btn.onclick   = () => { dlgClose(); resolve(opts.isPrompt ? (b.val ? inp.value : null) : b.val); };
        footer.appendChild(btn);
      });

      ov.classList.add('dlg-show');

      function onKey(e) {
        if (e.key === 'Escape') { dlgClose(); document.removeEventListener('keydown',onKey); resolve(opts.isPrompt ? null : false); }
        if (e.key === 'Enter' && opts.isPrompt && document.activeElement === inp) { dlgClose(); document.removeEventListener('keydown',onKey); resolve(inp.value); }
      }
      document.addEventListener('keydown', onKey);
    });
  }

  function dlgClose() { document.getElementById('dlg-overlay').classList.remove('dlg-show'); }

  window.dlgAlert = (msg, type='info', title='') =>
    dlgOpen({ type, title, message: msg, buttons:[{label:'حسناً',val:true,cls:'dlg-ok'}] });

  window.dlgConfirm = (msg, title='تأكيد', type='question', okLabel='تأكيد', okCls='dlg-ok') =>
    dlgOpen({ type, title, message: msg, buttons:[
      {label:'إلغاء',val:false,cls:'dlg-cancel'},
      {label:okLabel,val:true, cls:okCls}
    ]});

  window.dlgDanger = (msg, title='تأكيد الحذف') =>
    window.dlgConfirm(msg, title, 'danger', 'حذف', 'dlg-danger');

  window.dlgPrompt = (title, defaultVal='', placeholder='') =>
    dlgOpen({ type:'input', title, message:'', isPrompt:true, defaultVal, placeholder,
      buttons:[{label:'إلغاء',val:false,cls:'dlg-cancel'},{label:'تأكيد',val:true,cls:'dlg-ok'}]
    });
}

// تشغيل بعد جاهزية DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDialogSystem);
} else {
  initDialogSystem();
}


// -- المتغيرات والإعدادات العامة --
window.CLOUDINARY_CLOUD_NAME = "diwaqfsap"; window.CLOUDINARY_UPLOAD_PRESET = "ml_default";
window.currentUser = localStorage.getItem('savedUser') || null;
window.currentChatTarget = null; window.allUsersData = {}; window.allFriendsData = {};
window.myFriends = []; window.allPosts = []; window.postCache = {}; window.renderedPostIds = new Set();
window.isInitialLoad = true; window.currentRequests = {}; window.sentRequests = {}; window.feedLim = 5; 
window.usersListenerActive = false; window.privateListenersStarted = false;
window.allCommunities = {}; window.currentCommunityId = null; window.currentCommunitySearchQuery = "";
window.activeMentionInput = null; window.previousUnreadChats = {}; window.isChatBoxVisible = false;
window.selectedMediaFile = null; window.selectedMediaType = null;
window.selectedInterests = new Set();
window.getDisplayName = (id) => window.allUsersData[id]?.displayName || id;
window.getDisplayHandle = (id) => '@' + id;
window.allReels = []; let reelsObserver = null;

const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const videoPoster = "https://placehold.co/600x400/1e293b/ffffff?text=Video+Loading...";
const reelPoster = "https://placehold.co/300x500/1e293b/ffffff?text=Reel+Video";
const $ = (id) => document.getElementById(id);

window.addEventListener('load', () => { setTimeout(() => { let il = $('initialLoader'); if (il && il.style.display !== 'none') { il.classList.add('hidden'); setTimeout(() => il.style.display = 'none', 400); } }, 4000); });
window.addEventListener('hashchange', handleRouting);

function handleRouting() {
    let hash = window.location.hash; document.querySelectorAll('.modal').forEach(m => { if(!['interestsModal', 'communitiesModal', 'communityViewModal'].includes(m.id)) m.classList.remove('show'); }); document.querySelectorAll('#reelsScrollArea video').forEach(v => { v.pause(); }); document.body.style.overflow = 'auto'; 
    let lw = $('loginModal'), isPublicPage = hash.startsWith('#/post/') || hash.startsWith('#/@');
    if (hash === '#/login' || (!window.currentUser && (hash === '' || hash === '#/'))) { if(lw) { let s = $('hideLoginStyle'); if(s) s.remove(); lw.style.display = 'flex'; setTimeout(() => { lw.style.opacity = '1'; lw.style.pointerEvents = 'auto'; }, 10); } let cb = $('loginModalCloseBtn'); if(cb) cb.style.display = 'none'; let gb = $('guestBrowseBtn'); if(gb) gb.style.display = 'none'; window.toggleLoginMode('login'); } 
    else { if(lw) { lw.style.opacity = '0'; lw.style.pointerEvents = 'none'; if (isPublicPage) lw.style.display = 'none'; setTimeout(() => { if(window.location.hash !== '#/login' && window.location.hash !== '') lw.style.display = 'none'; }, 400); } }
    if(hash === '' || hash === '#/') { if(!window.currentUser) return window.location.replace('#/login'); window.scrollTo({top:0, behavior:'smooth'}); } 
    else if(hash.startsWith('#/@')) window.openProfileLogic(decodeURIComponent(hash.replace('#/@', '')));
    else if(hash.startsWith('#/post/')) window.openPostLogic(decodeURIComponent(hash.replace('#/post/', '')));
    else if(hash.startsWith('#/share/')) window.openShareLogic(decodeURIComponent(hash.replace('#/share/', ''))); // executeShare handles logic
    else if(hash === '#/requests') window.openRequestsLogic();
    else if(hash === '#/stats') window.openStatsLogic();
    else if(hash === '#/edit-profile') window.openEditProfileLogic();
    else if(hash === '#/reels') window.openReelsLogic(window.currentReelIdx || 0);
}

window.openProfile = (u) => { window.location.hash = '#/@' + u; }; window.openPostModal = (id) => { window.location.hash = '#/post/' + id; }; window.openShareModal = (id) => { window.location.hash = '#/share/' + id; };
window.openRequestsModal = () => { if(!window.currentUser) return window.showRegisterModal(); window.location.hash = '#/requests'; }; window.openAdminStats = () => { window.location.hash = '#/stats'; }; window.openEditProfileModal = () => { window.location.hash = '#/edit-profile'; }; window.openReelsViewer = (idx) => { if(!window.currentUser) return window.showRegisterModal(); window.currentReelIdx = idx; window.location.hash = '#/reels'; };
window.closeModal = (id) => { if(window.history.length > 2 && !['communitiesModal','communityViewModal'].includes(id)) { window.history.back(); } else { window.location.hash = ''; let m = $(id); if(m) m.classList.remove('show'); document.body.style.overflow = 'auto'; } }; window.closeReelsViewer = window.closeModal;

window.goHome = () => {
    if(!window.currentUser) { window.location.replace('#/login'); return; }
    window.location.hash = ''; window.scrollTo({top:0, behavior:'smooth'}); $('chatBox').classList.remove('show'); $('floatingChat').style.display='none';
    if(window.chatUnsubscribe){ window.chatUnsubscribe(); window.chatUnsubscribe=null; }
    window.currentChatTarget = null; window.isChatBoxVisible = false;
    ['notifDropdown','userMenuDropdown','mobileUserMenuDropdown'].forEach(x => { let e=$(x); if(e) e.style.display='none'; });
    let sb = $('sidebarArea'); if(sb) sb.classList.remove('mobile-show');
    $('globalSearch').value=''; $('searchResults').style.display='none'; $('chatSearchInput').value=''; $('chatSearchBox').style.display='none'; $('friendsList').style.display='block';
    let rl=$('msgRequestsList'); if(rl&&rl.innerHTML!=='') { $('msgRequestsHeader').style.display='block'; rl.style.display='block'; }
    window.renderedPostIds = new Set(window.allPosts.map(p => p.id)); $('newPostsBtn').style.display='none'; window.feedLim=5; renderFeed();
};

window.uploadToCloudinary = async (file, type) => { let fd = new FormData(); fd.append('file', file); fd.append('upload_preset', window.CLOUDINARY_UPLOAD_PRESET); let res = await fetch(`https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD_NAME}/${type}/upload`, {method:'POST', body:fd}); let data = await res.json(); return data.secure_url; };
window.videoObserver = new IntersectionObserver((entries) => { entries.forEach(entry => { if(entry.isIntersecting) { try { entry.target.muted = true; let playPromise = entry.target.play(); if(playPromise !== undefined) { playPromise.catch(error => {}); } } catch(e){} } else { try { if(!entry.target.paused) entry.target.pause(); } catch(e){} } }); }, {threshold: 0.5});
reelsObserver = new IntersectionObserver((entries) => { entries.forEach(entry => { let video = entry.target.querySelector('video'); if(!video) return; if(entry.isIntersecting) { try { video.muted = false; video.currentTime = 0; let p = video.play(); if(p !== undefined) p.catch(e => {}); } catch(e) {} let rid = entry.target.getAttribute('data-id'); if(rid && window.currentUser) { let vRef = ref(db, `posts/${rid}/views/${window.currentUser}`); get(vRef).then(s => { if(!s.exists()) set(vRef, true); }); } } else { try { if(!video.paused) video.pause(); } catch(e) {} } }); }, {threshold: 0.7});

window.playNotifSound = () => { try { let audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); audio.volume = 0.5; audio.play().catch(e => {}); } catch(err) {} };
window.toastTimeout = null;
window.showToast = (t, x, i) => { try { $('toastTitle').innerText = t; $('toastBody').innerText = x; $('toastImg').src = i || dA; let o = $('toastNotification'); o.classList.add('show'); if(window.toastTimeout) clearTimeout(window.toastTimeout); window.toastTimeout = setTimeout(() => o.classList.remove('show'), 5000); window.playNotifSound(); if("Notification" in window && Notification.permission === "granted") { try { let s = new Notification(t, {body:x, icon:i||dA}); setTimeout(() => s.close(), 5000); } catch(e) {} } } catch(err) {} };
window.timeAgo = (ts) => { if(!ts) return "منذ فترة"; let s = Math.floor((Date.now()-ts)/1000); if(s<0) s = 0; if(s<60) return "الآن"; let m = Math.floor(s/60); if(m<60) return "منذ "+m+" دقيقة"; let h = Math.floor(m/60); if(h<24) return "منذ "+h+" ساعة"; let d = Math.floor(h/24); if(d<7) return "منذ "+d+" أيام"; let dt = new Date(ts); return isNaN(dt) ? "منذ فترة" : dt.toLocaleDateString('ar-EG'); };

// باقي واجهة المستخدم والأدوات العامة (تم الحفاظ عليها بالكامل)
window.isInitialNotifLoad = true; window.alertedNotifs = new Set();
function listenToNotifications() { onValue(ref(db, `users/${window.currentUser}/notifications`), s => { let c = 0, h = ''; if(s.exists()) { let n = []; s.forEach(x => { let v = x.val(); if(v && typeof v === 'object' && v.type) n.push({...v, id: x.key}); }); n.sort((a,b) => (b.timestamp||0) - (a.timestamp||0)); n = n.slice(0,50); n.forEach(x => { try { if(x.read === false) c++; let d = window.getDisplayName(x.from), pic = window.allUsersData[x.from]?.profilePic || dA, tH = '', tP = '', icon = ''; if(x.type==='system'){tH=x.text; tP=x.text; icon='<i class="fas fa-bell" style="color:#64748b;"></i>'} else if(x.type==='comment'){tH=`<strong>${d}</strong> علق على منشورك`; tP=`علق ${d} على منشورك`; icon='<i class="fas fa-comment" style="color:#10b981;"></i>'} else if(x.type==='like'){tH=`<strong>${d}</strong> تفاعل مع منشورك`; tP=`تفاعل ${d} مع منشورك`; icon='<i class="fas fa-heart" style="color:#ef4444;"></i>'} else if(x.type==='friend_req'){tH=`<strong>${d}</strong> أرسل طلب صداقة`; tP=`أرسل ${d} طلب صداقة`; icon='<i class="fas fa-user-plus" style="color:#3b82f6;"></i>'} else if(x.type==='accept_req'){tH=`<strong>${d}</strong> وافق على طلب الصداقة`; tP=`وافق ${d} على طلب الصداقة`; icon='<i class="fas fa-user-check" style="color:#10b981;"></i>'} else if(x.type==='share'){tH=`<strong>${d}</strong> شارك منشورك`; tP=`شارك ${d} منشورك`; icon='<i class="fas fa-share" style="color:#8b5cf6;"></i>'} else if(x.type==='reply'){tH=`<strong>${d}</strong> رد على تعليقك`; tP=`رد ${d} على تعليقك`; icon='<i class="fas fa-reply" style="color:#64748b;"></i>'} else if(x.type==='mention'){tH=`<strong>${d}</strong> ذكرك في تعليق`; tP=`ذكرك ${d} في تعليق`; icon='<i class="fas fa-at" style="color:#d946ef;"></i>'} if(!window.isInitialNotifLoad && x.read===false && x.from!==window.currentUser && !window.alertedNotifs.has(x.id)){ window.showToast("إشعار جديد", tP||"تفاعل جديد", pic); } window.alertedNotifs.add(x.id); let uS = x.read === false ? 'background:#eef2ff;' : 'background:#fff;', uD = x.read === false ? `<div style="width:10px;height:10px;background:var(--primary);border-radius:50%;flex-shrink:0;box-shadow:0 0 5px rgba(37,99,235,0.4);"></div>` : '', tm = window.timeAgo(x.timestamp); h += `<div class="notif-item" onclick="window.handleNotifClick('${x.id}','${x.type}','${x.from}','${x.postId}')" style="display:flex; align-items:center; gap:12px; padding:12px 15px; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:all 0.2s; ${uS}"><div style="position:relative; flex-shrink:0;"><img src="${pic}" style="width:45px;height:45px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;"><div style="position:absolute; bottom:-4px; right:-4px; background:#fff; border-radius:50%; padding:3px; font-size:11px; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(0,0,0,0.15);">${icon}</div></div><div style="flex:1; line-height:1.4; text-align:right;"><div style="font-size:14px; color:var(--text-main);">${tH||"إشعار جديد"}</div><div style="font-size:12px; color:${x.read===false?'var(--primary)':'#64748b'}; font-weight:700; margin-top:4px;">${tm}</div></div>${uD}</div>`; } catch(err) {} }); } window.isInitialNotifLoad = false; let b = $('notifBadge'); if(c > 0) { b.style.display='inline-block'; b.innerText=c; } else b.style.display='none'; let head = `<div style="padding:15px; border-bottom:1px solid #e2e8f0; font-weight:800; font-size:16px; display:flex; justify-content:space-between; align-items:center;"><span>الإشعارات</span><span style="font-size:12px; color:var(--primary); cursor:pointer;" onclick="event.stopPropagation();window.markNotifsAsRead()">تحديد كـ مقروء</span></div>`; $('notifDropdown').innerHTML = head + (h ? `<div style="max-height:350px;overflow-y:auto;overscroll-behavior:contain;">${h}</div>` : '<div style="padding:20px;text-align:center;color:#64748b;font-weight:bold;">لا توجد إشعارات</div>'); }); }
window.handleNotifClick = (id, t, f, p) => { update(ref(db, `users/${window.currentUser}/notifications/${id}`), {read:true}); $('notifDropdown').style.display='none'; if(t==='friend_req') window.openRequestsModal(); else if(t==='accept_req' || t==='system') window.openProfile(f); else if(['comment','like','share','reply','mention'].includes(t) && p && p!=='undefined') window.openPostModal(p); };
window.markNotifsAsRead = () => { get(ref(db, `users/${window.currentUser}/notifications`)).then(s => { if(s.exists()) { let updates = {}; s.forEach(c => { if(c.val().read === false) updates[`${c.key}/read`] = true; }); if(Object.keys(updates).length > 0) update(ref(db, `users/${window.currentUser}/notifications`), updates); } }); };

function renderSidebarTop() { let h=''; let reqArr = Object.entries(window.currentRequests||{}).map(([k,v]) => ({id:k, time: v===true ? 0 : v})).sort((a,b) => b.time - a.time); let rc = reqArr.length; if(rc > 0) { h += `<div class="sidebar-title" style="color:var(--primary);"><em class="fas fa-user-friends"></em> طلبات الصداقة (${rc})</div>`; let maxReq = Math.min(rc, 3); for(let i=0; i<maxReq; i++) { let s = reqArr[i].id, p = window.allUsersData[s]?.profilePic || dA, d = window.getDisplayName(s); h += `<div class="user-row"><a href="#/@${s}" class="user-info" style="color:inherit; text-decoration:none;"><img src="${p}" class="avatar-small"><span>${d}</span></a><div style="display:flex;gap:5px;"><button class="btn-primary" style="background:#10b981;padding:4px 10px;border-radius:6px;" onclick="window.acceptRequest('${s}')"><i class="fas fa-check"></i></button><button class="btn-secondary" style="padding:4px 10px;border-radius:6px;" onclick="window.rejectRequest('${s}')"><i class="fas fa-times"></i></button></div></div>`; } } else { let sg = window.getSuggestions ? window.getSuggestions().filter(x => !window.sentRequests[x.name]) : [], t3 = sg.slice(0,3); if(t3.length > 0) { h += `<div class="sidebar-title" style="color:var(--secondary);"><em class="fas fa-user-plus"></em> مقترحون</div>`; t3.forEach(s => { let p = s.data.profilePic || dA, d = window.getDisplayName(s.name); h += `<div class="user-row"><a href="#/@${s.name}" class="user-info" style="color:inherit; text-decoration:none;"><img src="${p}" class="avatar-small"><span>${d}</span></a><button class="btn-primary" style="padding:4px 10px;font-size:12px;border-radius:6px;" onclick="event.stopPropagation();window.sendFriendRequestToFromFeed('${s.name}',this)"><i class="fas fa-user-plus"></i></button></div>`; }); } } let c = $('sidebarTopSection'); if(c) c.innerHTML = h; }; window.renderSidebarTop = renderSidebarTop;
const eRE = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); window.formatMentions = (t) => { if(!t) return ''; let s = t.replace(/</g, "&lt;").replace(/>/g, "&gt;"); if(window.myFriends) { window.myFriends.forEach(f => { s = s.replace(new RegExp('@'+eRE(f)+'(?=\\s|$)', 'g'), `<a href="#/@${f}" style="color:var(--primary);cursor:pointer;background:#eef2ff;padding:2px 5px;border-radius:4px;text-decoration:none;" onclick="event.stopPropagation();">@${f}</a>`); }); } return s; };
window.handleMentionInput = (e) => { window.activeMentionInput = e; let v = e.value, c = e.selectionStart, tb = v.substring(0,c), la = tb.lastIndexOf('@'), mb = $('globalMentionBox'); if(la !== -1 && (la === 0 || tb[la-1] === ' ')) { let q = tb.substring(la+1), m = window.myFriends.filter(f => f.toLowerCase().includes(q.toLowerCase()) || window.getDisplayName(f).toLowerCase().includes(q.toLowerCase())); if(m.length > 0) { let h = ''; m.forEach(x => { h += `<div class="mention-item" onclick="window.insertMention('${x}')"><img src="${window.allUsersData[x]?.profilePic||dA}"> <span>${window.getDisplayName(x)} (@${x})</span></div>`; }); mb.innerHTML = h; mb.style.display = 'block'; let r = e.getBoundingClientRect(); mb.style.left = r.left + 'px'; mb.style.top = (r.top - mb.offsetHeight - 5) + 'px'; if(r.top < mb.offsetHeight) mb.style.top = (r.bottom + 5) + 'px'; } else mb.style.display = 'none'; } else mb.style.display = 'none'; }; window.insertMention = (f) => { let e = window.activeMentionInput; if(!e) return; let v = e.value, c = e.selectionStart, tb = v.substring(0,c), la = tb.lastIndexOf('@'), ta = v.substring(c); if(la !== -1) { let n = v.substring(0,la) + '@' + f + ' '; e.value = n + ta; e.focus(); e.selectionStart = e.selectionEnd = n.length; } $('globalMentionBox').style.display = 'none'; };

document.addEventListener('click', (e) => { if(!e.target || typeof e.target.closest !== 'function') return; if(!e.target.closest('#globalMentionBox') && !e.target.classList.contains('comment-input') && !e.target.classList.contains('composer-input')) { $('globalMentionBox').style.display = 'none'; } if(!e.target.closest('.search-container')) { $('searchResults').style.display = 'none'; } if(!e.target.closest('.notif-container')) { $('notifDropdown').style.display = 'none'; } if(!e.target.closest('.nav-user-container') && !e.target.closest('.b-nav-item')) { let u = $('userMenuDropdown'), m = $('mobileUserMenuDropdown'); if(u) u.style.display = 'none'; if(m) m.style.display = 'none'; } });
window.toggleDropdown = (id) => { let e = $(id); if(!e) return; let d = e.style.display === 'block'; ['notifDropdown','userMenuDropdown','mobileUserMenuDropdown'].forEach(x => { let el=$(x); if(el) el.style.display='none'; }); if(!d) e.style.display = 'block'; }; window.toggleSidebar = () => { let s = $('sidebarArea'); window.innerWidth <= 768 ? s.classList.toggle('mobile-show') : s.classList.toggle('hidden'); }; window.switchProfileTab = (t) => { ['posts','reels','photos','friends','about'].forEach(x => { let e = $('tab-'+x), b = $('btnTab'+x.charAt(0).toUpperCase()+x.slice(1)); if(e) e.style.display = 'none'; if(b) b.classList.remove('active'); }); $('tab-'+t).style.display = 'block'; $('btnTab'+t.charAt(0).toUpperCase()+t.slice(1)).classList.add('active'); };
window.handleGlobalSearch = (q) => { let r = $('searchResults'); if(!q.trim()){ r.style.display='none'; return; } let h=''; for(let u in window.allUsersData) { let d = window.getDisplayName(u); if(d.toLowerCase().includes(q.toLowerCase()) || u.toLowerCase().includes(q.toLowerCase())) { h += `<a href="#/@${u}" class="search-result-item" onclick="$('searchResults').style.display='none'; $('globalSearch').value='';" style="text-decoration:none; color:inherit;"><img src="${window.allUsersData[u].profilePic||dA}" class="avatar-small"> <div style="display:flex;flex-direction:column;line-height:1.2;"><span>${d}</span><span style="font-size:11px;color:#64748b;">@${u}</span></div></a>`; } } r.innerHTML = h || '<div style="padding:10px;text-align:center;color:#666;">لا توجد نتائج</div>'; r.style.display='block'; }; window.searchChatUsers = (q) => { let r=$('chatSearchBox'), f=$('friendsList'), rh=$('msgRequestsHeader'), rl=$('msgRequestsList'); if(!q.trim()){ r.style.display='none'; f.style.display='block'; if(rl&&rl.innerHTML!==''){ rh.style.display='block'; rl.style.display='block'; } return; } f.style.display='none'; rh.style.display='none'; rl.style.display='none'; let h=''; for(let u in window.allUsersData){ if(u===window.currentUser) continue; let d = window.getDisplayName(u); if(d.toLowerCase().includes(q.toLowerCase()) || u.toLowerCase().includes(q.toLowerCase())){ h += `<div class="user-row" onclick="window.openChat('${u}')"><div class="user-info"><img src="${window.allUsersData[u].profilePic||dA}" class="avatar-small"><span>${d}</span></div><button class="btn-primary" style="padding:4px 10px;font-size:12px;border-radius:4px;"><i class="fas fa-comment-dots"></i></button></div>`; } } r.innerHTML = h || '<div style="padding:10px;text-align:center;color:#64748b;font-size:14px;">لا توجد نتائج</div>'; r.style.display='block'; };

window.renderSuggestedUsersModal = () => { let s = window.getSuggestions ? window.getSuggestions().slice(0,15) : [], h=''; if(s.length===0) h='<p style="text-align:center;color:#666;font-size:14px;padding:20px;">لا يوجد مقترحات حالياً (تظهر فقط للأصدقاء المشتركين أو المقربين).</p>'; else s.forEach(x => { let p=x.data.profilePic||dA, d=window.getDisplayName(x.name), st=x.mutualCount>0?`مشترون: ${x.mutualCount}`:'من منطقتك', rr = window.currentRequests && window.currentRequests[x.name], b=''; if(window.sentRequests && window.sentRequests[x.name]) b=`<button class="btn-secondary" disabled style="padding:6px 12px;font-size:13px;"><i class="fas fa-clock"></i> أرسل</button>`; else if(rr) b=`<button class="btn-primary" style="background:#10b981;padding:6px 12px;font-size:13px;" onclick="event.stopPropagation();window.acceptRequestFromFeed('${x.name}')"><i class="fas fa-check"></i> قبول</button>`; else b=`<button class="btn-primary" data-action="add" data-target="${x.name}" style="padding:6px 12px;font-size:13px;" onclick="event.stopPropagation();window.sendFriendRequestToFromFeed('${x.name}',this)"><i class="fas fa-user-plus"></i> إضافة</button>`; h += `<div class="req-row"><a href="#/@${x.name}" style="display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;"><img src="${p}" class="avatar-small"><div style="display:flex;flex-direction:column;cursor:pointer;"><strong style="font-size:15px;color:var(--text-main);text-align:right;">${d}</strong><span style="font-size:12px;color:var(--text-muted);text-align:right;">${st}</span></div></a><div class="req-actions">${b}</div></div>`; }); let u = $('usersList'); if(u) u.innerHTML=h; };

window.renderInterestsModal = () => { let c = $('interestsContainer'), h = ''; if(c) { window.PLATFORM_INTERESTS?.forEach(cat => { h += `<div class="interest-chip" onclick="window.toggleInterest(this, '${cat}')">${cat}</div>`; }); c.innerHTML = h; $('interestsModal').classList.add('show'); document.body.style.overflow = 'hidden'; } };
window.toggleInterest = (el, cat) => { if(window.selectedInterests.has(cat)) { window.selectedInterests.delete(cat); el.classList.remove('selected'); } else { window.selectedInterests.add(cat); el.classList.add('selected'); } };
window.saveUserInterests = () => { if(window.selectedInterests.size < 3) return window.dlgAlert("الرجاء اختيار 3 اهتمامات على الأقل ليتم تخصيص المنصة لك.", "warning", "تنبيه"); let arr = Array.from(window.selectedInterests); let btn = $('saveInterestsBtn'), ot = btn.innerText; btn.innerText = "جاري الحفظ..."; btn.disabled = true; update(ref(db, `users/${window.currentUser}`), { interests: arr }).then(() => { $('interestsModal').classList.remove('show'); document.body.style.overflow = 'auto'; btn.innerText = ot; btn.disabled = false; window.dlgAlert("تم تخصيص تجربتك بنجاح! ✨", "success", "تم الحفظ"); }).catch(e => { window.dlgAlert("حدث خطأ، يرجى المحاولة مجدداً.", "danger", "خطأ"); btn.innerText = ot; btn.disabled = false; }); };

function listenToPosts() { onValue(query(ref(db,'posts'), orderByChild('timestamp'), limitToLast(100)), s => { let l = []; if(s.exists()){ s.forEach(c => { let p=c.val(); p.id=c.key; l.push(p); window.postCache[p.id]=p; }); l.sort((a,b) => b.timestamp - a.timestamp); } window.allPosts = l; window.allReels = l.filter(p => p.video != null && !p.isNewsBot); window.renderReelsTopBar(); if(window.isInitialLoad){ window.renderedPostIds = new Set(l.map(p=>p.id)); if(window.currentUser) renderFeed(); window.isInitialLoad=false; handleRouting(); } else { let hash = window.location.hash; if(hash.startsWith('#/post/')){ let up = window.postCache[decodeURIComponent(hash.replace('#/post/', ''))]; if(up) window.openPostLogic(up.id); } let nc = l.filter(p=>!window.renderedPostIds.has(p.id)).length, mp = l.some(p=>p.author===window.currentUser&&!window.renderedPostIds.has(p.id)); if(mp){ window.renderedPostIds = new Set(l.map(p=>p.id)); if(window.currentUser) renderFeed(); $('newPostsBtn').style.display='none'; } else if(nc>=3){ $('newPostsBtn').style.display='block'; $('newPostsBtn').innerText=`عرض الجديدة (${nc}) ⬆️`; } else { let ci=new Set(l.map(p=>p.id)); for(let id of window.renderedPostIds) if(!ci.has(id)) window.renderedPostIds.delete(id); } } if(window.location.hash.startsWith('#/@')) try { renderProfilePosts(decodeURIComponent(window.location.hash.replace('#/@', ''))) } catch(e){} }); }
window.showNewPosts = () => { window.renderedPostIds = new Set(window.allPosts.map(p=>p.id)); window.feedLim=5; renderFeed(); $('newPostsBtn').style.display='none'; window.scrollTo({top:0, behavior:'smooth'}); };
window.addEventListener('scroll', () => { if((window.innerHeight+window.scrollY) >= document.body.offsetHeight-800){ if(window.feedLim < window.allPosts.length){ window.feedLim += 5; renderFeed(); } } });

function createPostHTML(p, cp, it=false, im=false) {
    let dt = new Date(p.timestamp).toLocaleString('ar-EG'), ap = window.allUsersData[p.author]?.profilePic || dA, ism = p.author === window.currentUser, ad = window.getDisplayName(p.author), ah = `<span style="font-size:12px;color:var(--text-muted);font-weight:normal;">@${p.author}</span>`, af = '';
    let abg = p.author.toLowerCase() === 'admin21' ? '<span style="background:#7c3aed;color:#fff;padding:2px 6px;border-radius:6px;font-size:10px;margin-right:5px;font-weight:bold;">إدارة</span>' : '';
    if(window.currentUser && !ism && !window.myFriends.includes(p.author)) { let rr = window.currentRequests && window.currentRequests[p.author]; if(window.sentRequests && window.sentRequests[p.author]) af = `<button class="btn-primary" style="padding:2px 10px;font-size:11px;border-radius:6px;margin-right:10px;background:#e2e8f0;color:#0f172a;" disabled><i class="fas fa-clock"></i> تم</button>`; else if(rr) af = `<button class="btn-primary" style="padding:2px 10px;font-size:11px;border-radius:6px;margin-right:10px;background:#10b981;" onclick="event.stopPropagation();window.acceptRequestFromFeed('${p.author}')"><i class="fas fa-check"></i> قبول</button>`; else af = `<button class="btn-primary" data-action="add" data-target="${p.author}" style="padding:2px 10px;font-size:11px;border-radius:6px;margin-right:10px;" onclick="event.stopPropagation();window.sendFriendRequestToFromFeed('${p.author}',this)"><i class="fas fa-user-plus"></i> إضافة</button>`; }
    let tbg = it ? `<span style="background:#ff9800;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;margin-right:10px;font-weight:bold;"><i class="fas fa-fire"></i> رائج</span>` : '', ch = ism ? `<div class="post-controls"><button onclick="event.stopPropagation();window.editPost('${p.id}')"><i class="fas fa-edit"></i></button><button onclick="event.stopPropagation();window.deletePost('${p.id}')"><i class="fas fa-trash"></i></button></div>` : '';
    let hl = window.currentUser ? (p.likes && p.likes[window.currentUser]) : false, hi = hl ? '<i class="fas fa-heart" style="color:#ef4444;"></i>' : '<i class="far fa-heart" style="color:#64748b;"></i>', lc = p.likes ? Object.keys(p.likes).length : 0, lt = lc > 0 ? `<span style="font-size:14px;margin-right:5px;color:#64748b;">${lc}</span>` : `<span style="font-size:14px;margin-right:5px;color:#64748b;">إعجاب</span>`;
    let st = window.formatMentions(p.text), pb = '', ca = im ? '' : `onclick="window.openPostModal('${p.id}')"`; let isLongP = p.text && (p.text.length > 200 || p.text.split('\n').length > 3); let pTxt = `<div class="post-content ${isLongP && !im ? 'collapsed' : ''}" id="ptxt_${p.id}">${st}</div>`; if(isLongP && !im) pTxt += `<div class="show-more-btn" onclick="document.getElementById('ptxt_${p.id}').classList.remove('collapsed'); this.style.display='none'; event.stopPropagation();">عرض المزيد</div>`;
    let headerLeft = `<div style="display:flex; gap:10px; align-items:center;"><a href="#/@${p.author}"><img src="${ap}" class="avatar-small"></a><div style="display:flex; flex-direction:column; line-height:1.2;"><div style="display:flex; align-items:center; flex-wrap:wrap; gap:5px;"><a href="#/@${p.author}" class="post-author" style="color:inherit; text-decoration:none;">${ad}</a>${ah} ${abg} ${af} ${tbg}</div><a href="#/post/${p.id}" class="post-time" style="color:inherit; text-decoration:none; margin-top:3px;">${dt}</a></div></div>`;
    if(p.isShare && p.sharedData) { let sap = window.allUsersData[p.sharedData.author]?.profilePic || dA, sst = window.formatMentions(p.sharedData.text), sd = window.getDisplayName(p.sharedData.author); let isLongS = p.sharedData.text && (p.sharedData.text.length > 200 || p.sharedData.text.split('\n').length > 3); let sTxt = `<div class="post-content ${isLongS && !im ? 'collapsed' : ''}" id="stxt_${p.id}" style="font-size:14px;">${sst}</div>`; if(isLongS && !im) sTxt += `<div class="show-more-btn" onclick="document.getElementById('stxt_${p.id}').classList.remove('collapsed'); this.style.display='none'; event.stopPropagation();">عرض المزيد</div>`; pb = `<div class="post-clickable" ${ca}>${pTxt}<div class="shared-post-box" onclick="event.stopPropagation();window.openProfile('${p.sharedData.author}')"><div class="post-header" style="margin-bottom:8px;"><a href="#/@${p.sharedData.author}"><img src="${sap}" class="avatar-small"></a><div style="display:flex; flex-direction:column; line-height:1.2; margin-right:8px;"><a href="#/@${p.sharedData.author}" class="post-author" style="color:inherit; text-decoration:none;">${sd} <span style="font-size:11px;color:#64748b;">@${p.sharedData.author}</span></a><span class="post-time">${new Date(p.sharedData.timestamp).toLocaleString('ar-EG')}</span></div></div>${sTxt}${p.sharedData.image ? `<img src="${p.sharedData.image}" class="post-media">` : ''}${p.sharedData.video ? `<video src="${p.sharedData.video}" class="post-media" controls poster="${videoPoster}" style="background:#1e293b;"></video>` : ''}</div></div>`; } else { pb = `<div class="post-clickable" ${ca}>${pTxt}${p.image ? `<img src="${p.image}" class="post-media">` : ''}${p.video ? `<video src="${p.video}" class="post-media" controls playsinline poster="${videoPoster}" style="background:#1e293b;"></video>` : ''}</div>`; }
    let cmh = ''; if(p.comments && typeof p.comments === 'object') { let ca = Object.entries(p.comments).map(([id,val]) => ({id,...val})).sort((a,b) => a.timestamp - b.timestamp), cs = im ? ca : ca.slice(-2); cs.forEach(c => { let cPic = window.allUsersData[c.author]?.profilePic || dA, cD = window.getDisplayName(c.author), sct = window.formatMentions(c.text), rh = ''; if(c.replies && typeof c.replies === 'object') { Object.values(c.replies).sort((a,b) => a.timestamp - b.timestamp).forEach(r => { let rPic = window.allUsersData[r.author]?.profilePic || dA, rD = window.getDisplayName(r.author), srt = window.formatMentions(r.text), srb = im ? `<span class="reply-btn" onclick="window.prepareReply('${c.id}','${r.author}')" style="margin-top:4px;display:inline-block;margin-right:5px;">رد</span>` : ''; rh += `<div class="comment reply-block" style="margin-bottom:8px;"><a href="#/@${r.author}"><img src="${rPic}" class="avatar-small" style="width:24px;height:24px;"></a><div style="flex:1;"><div class="comment-text-box" style="background:#fff;border:1px solid #e2e8f0;margin-bottom:2px;padding:8px 12px;"><a href="#/@${r.author}" class="comment-author" style="color:inherit; text-decoration:none; display:block;">${rD}</a><div>${srt}</div></div>${srb}</div></div>`; }); } let rb = im ? `<span class="reply-btn" onclick="window.prepareReply('${c.id}','${c.author}')">رد</span>` : ''; cmh += `<div class="comment"><a href="#/@${c.author}"><img src="${cPic}" class="avatar-small" style="width:28px;height:28px;"></a><div style="flex:1;"><div class="comment-text-box"><a href="#/@${c.author}" class="comment-author" style="color:inherit; text-decoration:none; display:block;">${cD}</a><div>${sct}</div></div>${rb}<div id="replies_${c.id}">${rh}</div></div></div>`; }); if(!im && ca.length > 2) cmh += `<div style="font-size:13px;color:#64748b;cursor:pointer;font-weight:700;margin-top:5px;text-align:center;padding:5px;background:#f1f5f9;border-radius:8px;" onclick="window.openPostModal('${p.id}')">عرض كل التعليقات (${ca.length})</div>`; }
    let cia = (!window.currentUser) ? '' : `<div class="comment-input-area"><img src="${window.allUsersData[window.currentUser]?.profilePic || dA}" class="avatar-small" style="width:32px;height:32px;"><input type="text" oninput="window.handleMentionInput(this)" id="commentInp_${cp}_${p.id}" class="comment-input" placeholder="اكتب تعليقاً..." onkeypress="if(event.key==='Enter') window.addComment('${p.id}','${p.author}','${cp}')"><button class="btn-primary" style="padding:8px 15px;border-radius:20px;" onclick="window.addComment('${p.id}','${p.author}','${cp}')"><i class="fas fa-paper-plane"></i></button></div>`;
    let admC = (window.currentUser && window.currentUser.toLowerCase() === 'admin21') ? `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #cbd5e1;display:flex;gap:10px;justify-content:flex-end;"><button onclick="window.warnUser('${p.author}')" style="background:#f59e0b;color:#fff;border:0;padding:5px 12px;border-radius:6px;cursor:pointer;font-weight:bold;font-family:inherit;font-size:12px;"><i class="fas fa-exclamation-triangle"></i> تحذير</button><button onclick="window.adminDeletePost('${p.id}')" style="background:#ef4444;color:#fff;border:0;padding:5px 12px;border-radius:6px;cursor:pointer;font-weight:bold;font-family:inherit;font-size:12px;"><i class="fas fa-trash"></i> حذف إداري</button></div>` : '';
    return `<div class="post"><div class="post-header">${headerLeft}${ch}</div>${pb}<div class="post-actions-bar"><button class="action-btn" onclick="window.toggleLike('${p.id}','${p.author}',this)"><i class="${hl?'fas':'far'} fa-heart" style="${hl ? 'color:#ef4444;' : 'color:#64748b;'}"></i> <span class="lc-count">${lt}</span></button><button class="action-btn" onclick="${im ? `$('modalCommentInput').focus()` : `window.openPostModal('${p.id}')`}"><i class="far fa-comment-alt"></i> تعليق</button><button class="action-btn" onclick="window.openShareModal('${p.id}')"><i class="fas fa-share"></i> مشاركة</button></div><div class="comments-section" id="modalCommentsSection">${cmh}${cia}</div>${admC}</div>`;
}

function renderFeed() {
    let pf = document.getElementById('postsFeed'); if(!window.currentUser) { if(pf) pf.innerHTML = ''; return; }
    let h='', sg=window.getSuggestions?window.getSuggestions():[], iN=window.currentUser?window.myFriends.length===0:true, vp=[], reg=[], tr=[];
    window.allPosts.forEach(p => { if(!window.renderedPostIds.has(p.id)) return; let im = p.author === window.currentUser; let ifR = window.currentUser ? window.myFriends.includes(p.author) : false;
        // إضافة منشورات القنوات المتابَعة
        let myFollowing = window.allUsersData[window.currentUser] && window.allUsersData[window.currentUser].following ? window.allUsersData[window.currentUser].following : {};
        let isFollowedChannel = p.isNewsBot && myFollowing[p.author];
        if(isFollowedChannel) { reg.push({p:p, it:false}); return; } let lc = p.likes ? Object.keys(p.likes).length : 0; let it = lc >= 10; if(iN){ if(im || it) vp.push({p:p, it:it}); } else { if(im || ifR) reg.push({p:p, it:it}); else if(it) tr.push({p:p, it:true}); } });
    if(!iN){ let t_i = 0; for(let i=0; i<reg.length; i++){ vp.push(reg[i]); if((i+1)%10===0 && t_i<tr.length){ vp.push(tr[t_i]); t_i++; } } }
    vp.slice(0, window.feedLim || 5).forEach((v,i) => { h += createPostHTML(v.p, 'feed', v.it, false); if(window.currentUser && (i+1)%4===0 && sg.length>0) h += createSuggestedFriendsWidget(); if(window.currentUser && i>0 && i%5===0) h += window.generateReelsWidgetHTML(); });
    if(pf) { pf.innerHTML = h || '<p style="text-align:center;color:#666;padding:20px;">المنشورات تظهر هنا.</p>'; document.querySelectorAll('#postsFeed video').forEach(v => window.videoObserver.observe(v)); }
}

window.toggleLike = (id, htmlAuthor, btn) => {
    if(!window.currentUser) return window.showRegisterModal();
    let r = ref(db, `posts/${id}/likes/${window.currentUser}`); 
    get(r).then(s => { if(s.exists()){ remove(r); if(btn){ let i=btn.querySelector('i'); if(i) { i.className='far fa-heart'; i.style.color='#64748b'; } let sp=btn.querySelector('.lc-count'); if(sp && !isNaN(parseInt(sp.innerText))) sp.innerText = parseInt(sp.innerText)-1; } } else { set(r, true).then(() => { if(btn){ let i=btn.querySelector('i'); if(i) { i.className='fas fa-heart'; i.style.color='#ef4444'; } let sp=btn.querySelector('.lc-count'); if(sp && !isNaN(parseInt(sp.innerText))) sp.innerText = parseInt(sp.innerText)+1; } let p = window.postCache[id] || window.allPosts.find(x => x.id === id), tg = p ? p.author : htmlAuthor; if(tg && tg !== window.currentUser) push(ref(db, `users/${tg}/notifications`), {type:'like', from:window.currentUser, postId:id, timestamp:Date.now(), read:false}); }); } });
};

window.addComment = async (id, htmlAuthor, px) => {
    if(!window.currentUser) return window.showRegisterModal(); let i = $(`commentInp_${px}_${id}`), t = i.value.trim(); if(!t) return;
    let mp = window.allUsersData[window.currentUser]?.profilePic || dA, md = window.getDisplayName(window.currentUser), st = window.formatMentions(t);
    let nh = `<div class="comment"><img src="${mp}" class="avatar-small" style="width:28px;height:28px;"><div class="comment-text-box"><div class="comment-author">${md}</div><div>${st}</div></div></div>`, ia = i.closest('.comment-input-area');
    if(ia) ia.insertAdjacentHTML('beforebegin', nh); i.value = ''; await push(ref(db, `posts/${id}/comments`), {author:window.currentUser, text:t, timestamp:Date.now()});
    let p = window.postCache[id] || window.allPosts.find(x => x.id === id), tg = p ? p.author : htmlAuthor; if(tg && tg !== window.currentUser) push(ref(db, `users/${tg}/notifications`), {type:'comment', from:window.currentUser, postId:id, timestamp:Date.now(), read:false});
    window.myFriends.forEach(f => { if(t.includes('@'+f)) push(ref(db, `users/${f}/notifications`), {type:'mention', from:window.currentUser, postId:id, timestamp:Date.now(), read:false}); }); $('globalMentionBox').style.display = 'none';
};

window.openPostLogic = (id) => { let p = window.postCache[id] || window.allPosts.find(x => x.id === id); if(p) { window.renderPostModalLogic(p); } else { get(ref(db, `posts/${id}`)).then(s => { if(s.exists()) { let post = s.val(); post.id = id; window.postCache[id] = post; window.renderPostModalLogic(post); } else { window.dlgAlert("عذراً، هذا المنشور غير موجود.", "warning", "غير موجود"); window.history.back(); } }); } };
window.renderPostModalLogic = (p) => { $('modalPostId').value = p.id; $('modalPostAuthor').value = p.author; $('modalReplyToId').value = ""; $('modalCommentInput').placeholder = "تعليق..."; let lc = p.likes ? Object.keys(p.likes).length : 0, it = lc >= 10; $('postModalBody').innerHTML = createPostHTML(p, 'modal', it, true); let pf = $('postModalFooter'); if(pf) pf.style.display = window.currentUser ? 'flex' : 'none'; let closeBtn = $('postModalCloseBtn'); if(closeBtn) closeBtn.style.display = 'flex'; $('postModal').classList.add('show'); document.body.style.overflow = 'hidden'; document.querySelectorAll('#postModalBody video').forEach(v => window.videoObserver.observe(v)); };
window.prepareReply = (id, a) => { if(!window.currentUser) return window.showRegisterModal(); $('modalReplyToId').value = id; let i = $('modalCommentInput'); if(!i.value.includes(`@${a}`)) i.value = `@${a} ` + i.value; i.focus(); };
window.submitModalComment = () => { if(!window.currentUser) return window.showRegisterModal(); let pid = $('modalPostId').value, pAuthor = $('modalPostAuthor').value, rid = $('modalReplyToId').value, i = $('modalCommentInput'), t = i.value.trim(); if(!t) return; let rp = rid ? `posts/${pid}/comments/${rid}/replies` : `posts/${pid}/comments`; push(ref(db, rp), {author:window.currentUser, text:t, timestamp:Date.now()}).then(() => { let p = window.postCache[pid] || window.allPosts.find(x => x.id === pid); if(rid) { if(p && p.comments && p.comments[rid]) { let ca = p.comments[rid].author; if(ca && ca !== window.currentUser) push(ref(db, `users/${ca}/notifications`), {type:'reply', from:window.currentUser, postId:pid, timestamp:Date.now(), read:false}); } } else { let tg = p ? p.author : pAuthor; if(tg && tg !== window.currentUser) push(ref(db, `users/${tg}/notifications`), {type:'comment', from:window.currentUser, postId:pid, timestamp:Date.now(), read:false}); } window.myFriends.forEach(f => { if(t.includes('@'+f)) push(ref(db, `users/${f}/notifications`), {type:'mention', from:window.currentUser, postId:pid, timestamp:Date.now(), read:false}); }); }); i.value = ''; $('modalReplyToId').value = ''; i.placeholder = "تعليق..."; let mb = $('postModalBody'); setTimeout(() => mb.scrollTop = mb.scrollHeight, 100); $('globalMentionBox').style.display = 'none'; };
window.executeShare = () => { if(!window.currentUser) return window.showRegisterModal(); let id = $('sharePostId').value, c = $('shareCaption').value.trim(), p = window.postCache[id] || window.allPosts.find(x => x.id === id); if(!p) return; let oa = p.isShare ? p.sharedData.author : p.author, ot = p.isShare ? p.sharedData.text : p.text, oi = p.isShare ? p.sharedData.image : p.image, ov = p.isShare ? p.sharedData.video : p.video, ap = window.allUsersData[oa]?.profilePic || dA, st = window.formatMentions(ot), dn = window.getDisplayName(oa); $('sharePreview').innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><img src="${ap}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;"><strong style="font-size:14px;">${dn}</strong></div><div style="font-size:14px;margin-bottom:8px;">${st}</div>${oi ? `<img src="${oi}" style="width:100%;max-height:150px;object-fit:cover;border-radius:8px;">` : ''}${ov ? `<video src="${ov}" style="width:100%;max-height:150px;background:#000;border-radius:8px;"></video>` : ''}`; $('shareModal').classList.add('show'); document.body.style.overflow = 'hidden'; };
window.previewImage = (e) => { let f = e.target.files[0]; if(!f) return; let reader = new FileReader(); reader.onload = (ev) => { let preview = document.getElementById('editModalPicPreview'); let base64Input = document.getElementById('editPicBase64'); if(preview) preview.src = ev.target.result; if(base64Input) base64Input.value = ev.target.result; }; reader.readAsDataURL(f); };
window.previewMedia = (e, type) => { let f = e.target.files[0]; if(!f) return; if(type === 'video' || type === 'reel') { if(f.size > 50*1024*1024) { window.dlgAlert("الفيديو كبير جداً! الحد الأقصى 50 ميجا.", "warning", "تنبيه"); return; } } window.selectedMediaFile = f; window.selectedMediaType = type; let u = URL.createObjectURL(f), img = $('postImagePreview'), vid = $('postVideoPreview'), cont = $('postMediaPreviewContainer'); cont.style.display = 'block'; if(type === 'image') { img.src = u; img.style.display = 'block'; vid.style.display = 'none'; vid.pause(); } else { vid.src = u; vid.style.display = 'block'; img.style.display = 'none'; } };
window.removeMediaPreview = () => { window.selectedMediaFile = null; window.selectedMediaType = null; $('postMediaPreviewContainer').style.display = 'none'; $('postImagePreview').src = ''; $('postVideoPreview').src = ''; $('postVideoPreview').pause(); };
window.publishPost = async () => { let c = $('postContent').value.trim(), f = window.selectedMediaFile, type = window.selectedMediaType; if(!c && f == null) return; let bt = $('publishBtn'), ot = bt.innerHTML; bt.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...'; bt.disabled = true; try { let url = null; if(f) url = await window.uploadToCloudinary(f, type === 'reel' ? 'video' : type); let d = {author:window.currentUser, text:c || (type==='reel'?'ريلز جديد 🎦':''), timestamp:Date.now()}; if(type === 'image') d.image = url; else if(type === 'video' || type === 'reel') d.video = url; if(type === 'reel') d.isReel = true; let nr = push(ref(db, 'posts')); await set(nr, d); window.myFriends.forEach(f => { if(c.includes('@'+f)) push(ref(db, `users/${f}/notifications`), {type:'mention', from:window.currentUser, postId:nr.key, timestamp:Date.now(), read:false}); }); bt.innerHTML = ot; bt.disabled = false; $('postContent').value = ''; window.removeMediaPreview(); $('globalMentionBox').style.display = 'none'; if(type === 'reel' || type === 'video') window.dlgAlert('تم نشر الفيديو بنجاح وإضافته للريلز! 🎬', 'success', 'تم النشر'); } catch(e) { window.dlgAlert("حدث خطأ أثناء الرفع، يرجى المحاولة مجدداً.", "danger", "خطأ"); bt.innerHTML = ot; bt.disabled = false; } };
window.deletePost = (id) => { window.dlgDanger("هل تريد حذف هذا المنشور نهائياً؟").then(ok => { if(ok) { remove(ref(db, `posts/${id}`)); window.location.hash=''; } }); }; window.editPost = (id) => { let p = window.postCache[id]; if(!p) return; window.dlgPrompt("تعديل المنشور:", p.text || '', "اكتب النص الجديد...").then(nt => { if(nt !== null) update(ref(db, `posts/${id}`), {text:nt.trim()}); }); };
window.openEditProfileLogic = () => { let d = window.allUsersData[window.currentUser] || {}; $('editModalPicPreview').src = d.profilePic || dA; $('editPicBase64').value = d.profilePic || ''; $('editBio').value = d.bio || ''; $('editLocation').value = d.location || ''; $('editJob').value = d.job || ''; $('editEducation').value = d.education || ''; $('editHobbies').value = d.hobbies || ''; $('editDobProfile').value = d.birthdate || ''; $('editProfileModal').classList.add('show'); document.body.style.overflow = 'hidden'; };
window.openProfileLogic = (u) => { window.switchProfileTab('posts'); let d = window.allUsersData[u]; if(!d) { get(ref(db, `users/${u}`)).then(s => { if(s.exists()){ window.allUsersData[u] = s.val(); renderProfileData(u, s.val()); } else { window.dlgAlert("الحساب غير موجود.", "warning", "غير موجود"); window.goHome(); } }); } else { renderProfileData(u, d); } };

function renderProfileData(u, d) { $('profPic').src = d.profilePic || dA; $('profName').innerText = window.getDisplayName(u); $('profHandle').innerText = '@' + u; $('profBio').innerText = d.bio || "لا نبذة."; $('profLocText').innerText = d.location || "غير محدد"; $('profileAboutArea').innerHTML = `<div style="background:#fff;border-radius:12px;padding:20px;border:1px solid var(--border-color);text-align:right;"><h4 style="margin-top:0;color:var(--primary);border-bottom:1px solid #e2e8f0;padding-bottom:10px;">معلومات</h4><div><strong>المدينة:</strong> <br>${d.location||'غير محدد'}</div><div><strong>تاريخ الميلاد:</strong> <br>${d.birthdate||'غير محدد'}</div><div><strong>المهنة:</strong> <br>${d.job||'غير محدد'}</div><div><strong>الدراسة:</strong> <br>${d.education||'غير محدد'}</div><div><strong>الهوايات:</strong> <br>${d.hobbies||'غير محدد'}</div></div>`; let intArea = $('profInterestsArea'); if(d.interests && d.interests.length > 0) { intArea.style.display = 'flex'; intArea.innerHTML = d.interests.map(i => `<span style="background:#eef2ff; color:var(--primary); padding:4px 10px; border-radius:12px; font-size:12px; font-weight:700;">${i}</span>`).join(''); } else { intArea.style.display = 'none'; } let ce = $('profCoverImg'); if(d.coverPic) { ce.src = d.coverPic; ce.style.display = 'block'; } else ce.style.display = 'none'; $('statPosts').innerText = window.allPosts.filter(p => p.author === u && !p.isReel).length; $('statPhotos').innerText = window.allPosts.filter(p => p.author === u && (p.image || p.video) && !p.isReel).length; $('statFriends').innerText = Object.keys(window.allFriendsData[u] || {}).length; let ac = $('profActions'); let ism = (u === window.currentUser), isf = window.currentUser ? window.myFriends.includes(u) : false, rr = window.currentRequests && window.currentRequests[u]; if(!window.currentUser) { $('coverEditBtn').style.display = 'none'; ac.innerHTML = `<button class="btn-primary" onclick="window.showRegisterModal()"><i class="fas fa-user-plus"></i> تسجيل الدخول للتفاعل</button>`; } else if(d.isNewsBot) {
        // حساب قناة أخبار — زر متابعة فقط
        $('coverEditBtn').style.display = 'none';
        let isFollowing = d.followers && d.followers[window.currentUser];
        ac.innerHTML = `<button class="follow-btn${isFollowing ? ' following' : ''}" 
            onclick="window.followChannel('${u}', this)"
            style="padding:10px 24px;border:none;border-radius:12px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;background:${isFollowing ? '#e0e7ff' : 'var(--primary)'};color:${isFollowing ? 'var(--primary)' : '#fff'};">
            <i class="fas fa-${isFollowing ? 'check' : 'plus'}"></i> ${isFollowing ? 'تتابع' : '+ متابعة'}
        </button>`;
        // عرض عدد المتابعين بدلاً من الأصدقاء
        let followersCount = d.followers ? Object.keys(d.followers).length : 0;
        $('statFriends').innerText = followersCount;
        // تغيير تسمية إحصائية الأصدقاء
        let friendsLabel = document.querySelector('.stat-friends-label');
        if(friendsLabel) friendsLabel.innerText = 'متابع';
    } else if(ism) { $('coverEditBtn').style.display = 'flex'; ac.innerHTML = `<button class="btn-primary" onclick="window.openEditProfileModal()"><i class="fas fa-edit"></i> تعديل</button><button class="btn-secondary" onclick="window.location.hash=''; window.scrollTo({top:0, behavior:'smooth'}); let c = $('postContent'); c.value = 'حساب رائع: @${u} ✨'; c.focus();"><i class="fas fa-share"></i> مشاركة</button>`; } else { $('coverEditBtn').style.display = 'none'; let sb = `<button class="btn-secondary" onclick="window.location.hash=''; window.scrollTo({top:0, behavior:'smooth'}); let c = $('postContent'); c.value = 'حساب رائع: @${u} ✨'; c.focus();"><i class="fas fa-share"></i> مشاركة</button>`; if(isf) ac.innerHTML = `<button class="btn-secondary" style="background:#ef4444;color:#fff;" onclick="window.unfriend('${u}')"><i class="fas fa-user-minus"></i></button><button class="btn-primary" onclick="window.location.hash=''; setTimeout(()=>window.openChat('${u}'),300)"><i class="fas fa-comment-dots"></i> رسالة</button> ${sb}`; else if(rr) ac.innerHTML = `<button class="btn-primary" style="background:#10b981;" onclick="window.acceptRequestFromProfile('${u}',this)"><i class="fas fa-check"></i> قبول</button> ${sb}`; else if(window.sentRequests && window.sentRequests[u]) ac.innerHTML = `<button class="btn-secondary" onclick="window.cancelFriendRequest('${u}')"><i class="fas fa-user-times"></i> إلغاء</button> ${sb}`; else { ac.innerHTML = `<button class="btn-secondary" disabled>جاري...</button>`; get(ref(db, `friendRequests/${u}/${window.currentUser}`)).then(s => { if($('profHandle').innerText.replace('@', '') === u) { if(s.exists()) { window.sentRequests[u] = true; ac.innerHTML = `<button class="btn-secondary" onclick="window.cancelFriendRequest('${u}')"><i class="fas fa-user-times"></i> إلغاء</button> ${sb}`; } else ac.innerHTML = `<button class="btn-primary" data-action="add" data-target="${u}" onclick="window.sendFriendRequestToFromFeed('${u}',this)"><i class="fas fa-user-plus"></i> إضافة</button> ${sb}`; } }).catch(e => console.log(e)); } } $('profileModal').classList.add('show'); document.body.style.overflow = 'hidden'; try { renderProfilePosts(u) } catch(e) {} }
window.previewCoverImage = async (e) => { let f = e.target.files[0]; if(!f) return; let bt = $('coverEditBtn'), ot = bt.innerHTML; bt.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; try { let url = await window.uploadToCloudinary(f, 'image'); $('profCoverImg').src = url; $('profCoverImg').style.display = 'block'; await update(ref(db, `users/${window.currentUser}`), {coverPic:url}); } catch(err) { window.dlgAlert('فشل رفع الصورة، حاول مجدداً.', 'danger', 'خطأ'); } bt.innerHTML = ot; }; window.saveProfile = async () => { let p = $('editPicBase64').value; if(p && p.startsWith('data:')) { let b = $('saveProfileBtn'), ot = b.innerHTML; b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...'; b.disabled = true; try { p = await window.uploadToCloudinary(p, 'image'); } catch(e) { window.dlgAlert('فشل رفع الصورة، حاول مجدداً.', 'danger', 'خطأ'); b.innerHTML = ot; b.disabled = false; return; } b.innerHTML = ot; b.disabled = false; } let up = {bio:$('editBio').value.trim(), location:$('editLocation').value.trim(), job:$('editJob').value.trim(), education:$('editEducation').value.trim(), hobbies:$('editHobbies').value.trim(), birthdate:$('editDobProfile').value}; if(p) up.profilePic = p; await update(ref(db, `users/${window.currentUser}`), up); if(p) { $('myNavAvatar').src = p; $('mobileNavAvatar').src = p; } window.location.hash = '#/@' + window.currentUser; };
function renderProfilePosts(u) { 
    let pp = window.allUsersData[u]?.profilePic || dA;
    let h = '', ph = '';
    ph += `<a href="#/@${u}"><img src="${pp}" style="cursor:pointer;"></a>`;
    $('profilePostsFeed').innerHTML = '<div style="text-align:center;padding:20px;color:var(--primary);"><i class="fas fa-spinner fa-spin fa-2x"></i><br>جاري جلب المنشورات...</div>';
    
    // دائماً نجلب من Firebase مباشرة لضمان ظهور كل المنشورات القديمة والجديدة
    get(ref(db, 'posts')).then(s => {
        if(s.exists()) {
            let userPosts = [];
            s.forEach(c => { 
                let p = c.val(); p.id = c.key; 
                if(p.author === u) { userPosts.push(p); window.postCache[p.id] = p; }
            });
            userPosts.sort((a,b) => b.timestamp - a.timestamp);
            userPosts.forEach(p => { 
                if(!p.isReel) { 
                    let lc = p.likes ? Object.keys(p.likes).length : 0, it = lc >= 10; 
                    h += createPostHTML(p, 'profile', it, false); 
                    if(p.image) ph += `<a href="#/post/${p.id}"><img src="${p.image}" style="cursor:pointer;"></a>`;
                    if(p.video) ph += `<a href="#/post/${p.id}"><video src="${p.video}" style="cursor:pointer;"></video></a>`;
                } 
            });
        }
        $('profilePostsFeed').innerHTML = h || '<p style="text-align:center;color:#666;font-size:13px;">لا مقالات.</p>';
        $('profilePhotosGrid').innerHTML = ph;
        document.querySelectorAll('#profilePostsFeed video').forEach(v => window.videoObserver.observe(v));
    }).catch(() => {
        // fallback من الكاش المحلي
        let userPosts = Object.values(window.postCache || {}).filter(p => p.author === u);
        userPosts.sort((a,b) => b.timestamp - a.timestamp);
        userPosts.forEach(p => { 
            if(!p.isReel) { 
                let lc = p.likes ? Object.keys(p.likes).length : 0, it = lc >= 10; 
                h += createPostHTML(p, 'profile', it, false); 
            } 
        });
        $('profilePostsFeed').innerHTML = h || '<p style="text-align:center;color:#666;font-size:13px;">لا مقالات.</p>';
    }); // جلب ريلز المستخدم من allPosts + postCache
    let rh = '';
    let allCached = [...(window.allPosts || []), ...Object.values(window.postCache || {})];
    let seen = new Set();
    let userReels = allCached.filter(p => { if(p.author === u && p.video && !seen.has(p.id)) { seen.add(p.id); return true; } return false; });
    if(userReels.length > 0) {
        userReels.forEach((r, idx) => {
            let globalIdx = window.allReels.findIndex(x => x.id === r.id);
            if(globalIdx === -1) { window.allReels.push(r); globalIdx = window.allReels.length - 1; }
            let vc = r.views ? Object.keys(r.views).length : 0;
            rh += `<div class="reel-thumb" style="width:100%; height:180px;" onclick="window.openReelsViewer(${globalIdx})"><video src="${r.video}" autoplay loop muted playsinline preload="auto" style="pointer-events:none; background:#1e293b; object-fit:cover;"></video><span class="r-views"><i class="fas fa-play"></i> ${vc}</span></div>`;
        });
    }
    $('profileReelsGrid').innerHTML = rh || '<p style="text-align:center;color:#666;grid-column:span 3;">لا يوجد ريلز لهذا الحساب.</p>'; get(ref(db, `friends/${u}`)).then(s => { let fh = ''; if(s.exists()) { Object.keys(s.val()).forEach(f => { let pic = window.allUsersData[f]?.profilePic || dA, dn = window.getDisplayName(f), mc = 0; if(f !== window.currentUser) { let tf = window.allFriendsData[f] ? Object.keys(window.allFriendsData[f]) : []; mc = tf.filter(x => window.myFriends.includes(x)).length; } let mt = f === window.currentUser ? '' : (mc > 0 ? `<span class="f-mutual"><i class="fas fa-user-friends"></i> ${mc} مشتركون</span>` : `<span class="f-mutual">لا مشتركون</span>`); fh += `<a href="#/@${f}" class="friend-card" style="color:inherit; text-decoration:none;"><img src="${pic}"><div style="display:flex;flex-direction:column;justify-content:center;"><span class="f-name">${dn}</span>${mt}</div></a>`; }); } $('profileFriendsList').innerHTML = fh || '<p style="text-align:center;color:#666;font-size:13px;grid-column:span 2;">لا أصدقاء.</p>'; }); }

window.sendFriendRequestToFromFeed = (t, b) => { if(!window.currentUser) { window.showRegisterModal(); return; } if(t === window.currentUser) return; window.sentRequests[t] = true; document.querySelectorAll(`button[data-action="add"][data-target="${t}"]`).forEach(x => { x.innerHTML = `<i class="fas fa-clock"></i> أرسل`; x.style.background = "#e2e8f0"; x.style.color = "#0f172a"; x.disabled = true; }); if(b && !b.hasAttribute('data-target')) { b.innerHTML = `<i class="fas fa-clock"></i> أرسل`; b.style.background = "#e2e8f0"; b.style.color = "#0f172a"; b.disabled = true; } set(ref(db, `friendRequests/${t}/${window.currentUser}`), Date.now()).then(() => push(ref(db, `users/${t}/notifications`), {type:'friend_req', from:window.currentUser, timestamp:Date.now(), read:false})); };
window.cancelFriendRequest = (t) => { if(!window.currentUser) return; delete window.sentRequests[t]; remove(ref(db, `friendRequests/${t}/${window.currentUser}`)).then(() => window.openProfile(t)); };
window.acceptRequestFromProfile = (t, b) => { if(!window.currentUser) return; if(b) { b.innerHTML = `<i class="fas fa-user-friends"></i> تم القبول`; b.style.background = "#e2e8f0"; b.style.color = "#0f172a"; b.disabled = true; } let up = {}; up[`friends/${window.currentUser}/${t}`] = true; up[`friends/${t}/${window.currentUser}`] = true; update(ref(db), up).then(() => { remove(ref(db, `friendRequests/${window.currentUser}/${t}`)); push(ref(db, `users/${t}/notifications`), {type:'accept_req', from:window.currentUser, timestamp:Date.now(), read:false}); }); };
window.acceptRequestFromFeed = (t) => { if(!window.currentUser) return; let up = {}; up[`friends/${window.currentUser}/${t}`] = true; up[`friends/${t}/${window.currentUser}`] = true; update(ref(db), up).then(() => { remove(ref(db, `friendRequests/${window.currentUser}/${t}`)); push(ref(db, `users/${t}/notifications`), {type:'accept_req', from:window.currentUser, timestamp:Date.now(), read:false}); }); };
window.acceptRequest = (s) => { if(!window.currentUser) return; let up = {}; up[`friends/${window.currentUser}/${s}`] = true; up[`friends/${s}/${window.currentUser}`] = true; update(ref(db), up).then(() => { remove(ref(db, `friendRequests/${window.currentUser}/${s}`)); push(ref(db, `users/${s}/notifications`), {type:'accept_req', from:window.currentUser, timestamp:Date.now(), read:false}); }); };
window.rejectRequest = (s) => { if(!window.currentUser) return; remove(ref(db, `friendRequests/${window.currentUser}/${s}`)); };
window.unfriend = (t) => { if(!window.currentUser) return; window.dlgDanger("هل تريد حذف هذه الصداقة؟", "حذف الصداقة").then(ok => { if(ok) { let up = {}; up[`friends/${window.currentUser}/${t}`] = null; up[`friends/${t}/${window.currentUser}`] = null; update(ref(db), up).then(() => window.openProfile(t)); } }); };

window.openRequestsLogic = () => { window.renderSuggestedUsersModal(); $('requestsModal').classList.add('show'); document.body.style.overflow = 'hidden'; };
window.openStatsLogic = () => { $('statsModal').classList.add('show'); document.body.style.overflow = 'hidden'; get(ref(db, 'users')).then(us => { let r=0, o=0; if(us.exists()) { let v = us.val(); for(let k in v) { r++; if(v[k].online) o++; } } $('statReal').innerText = r; let sb = document.getElementById('statBots'); if(sb) sb.innerText = 0; $('statOnline').innerText = o; }); get(ref(db, 'posts')).then(ps => { $('statPosts').innerText = ps.exists() ? Object.keys(ps.val()).length : 0; }); };

function renderRequests() { let c = 0, h = ''; let reqArr = Object.entries(window.currentRequests||{}).map(([k,v]) => ({id:k, time: v===true ? 0 : v})).sort((a,b) => b.time - a.time); for(let req of reqArr) { let s = req.id; c++; h += `<div class="req-row"><a href="#/@${s}" style="display:flex;align-items:center;gap:8px;color:inherit;text-decoration:none;"><img src="${window.allUsersData[s]?.profilePic || dA}" class="avatar-small"><strong>${window.getDisplayName(s)}</strong></a><div class="req-actions"><button class="btn-accept" onclick="window.acceptRequest('${s}')"><i class="fas fa-check"></i></button><button class="btn-reject" onclick="window.rejectRequest('${s}')"><i class="fas fa-times"></i></button></div></div>`; } let b1 = $('reqBadge'), b2 = $('reqBadgeMobile'); if(c > 0) { b1.style.display = 'inline-block'; b1.innerText = c; b2.style.display = 'inline-block'; b2.innerText = c; } else { b1.style.display = 'none'; b2.style.display = 'none'; h = '<p style="color:#666;text-align:center;">لا طلبات.</p>'; } $('requestsList').innerHTML = h; window.renderSidebarTop(); }
function listenToFriendRequests() { onValue(ref(db, `friendRequests/${window.currentUser}`), s => { window.currentRequests = s.exists() ? s.val() : {}; renderRequests(); }); }

function renderSidebarUsers() { let fh = '', fa = [], rh = '', ra = []; window.myFriends.forEach(f => { if(window.allUsersData[f]) fa.push({name:f, time:window.recentChatsData[f] || 0, uc:window.unreadChatsData[f] || 0, d:window.allUsersData[f]}); }); let cu = new Set([...Object.keys(window.recentChatsData || {}), ...Object.keys(window.unreadChatsData || {})]); cu.forEach(c => { if(!window.myFriends.includes(c) && c !== window.currentUser && window.allUsersData[c]) ra.push({name:c, time:window.recentChatsData[c] || 0, uc:window.unreadChatsData[c] || 0, d:window.allUsersData[c]}); }); fa.sort((a,b) => b.time - a.time); fa.forEach(f => { fh += `<div class="user-row"><a href="#/@${f.name}" class="user-info" style="color:inherit; text-decoration:none;"><img src="${f.d.profilePic||dA}" class="avatar-small"><span>${window.getDisplayName(f.name)}</span></a><div style="display:flex;align-items:center;gap:10px;">${f.uc>0?`<span class="unread-msg-badge">${f.uc}</span>`:''}<button class="btn-primary" style="padding:4px 10px;font-size:12px;border-radius:4px;" onclick="event.stopPropagation();window.openChat('${f.name}')"><i class="fas fa-comment-dots"></i></button><span class="status-dot ${f.d.online?'online':'offline'}"></span></div></div>`; }); $('friendsList').innerHTML = fh || '<span style="color:#888;font-size:13px;">لا أصدقاء</span>'; ra.sort((a,b) => b.time - a.time); ra.forEach(r => { rh += `<div class="user-row" style="background:#fffbeb;border:1px solid #fde68a;"><a href="#/@${r.name}" class="user-info" style="color:inherit; text-decoration:none;"><img src="${r.d.profilePic||dA}" class="avatar-small"><span>${window.getDisplayName(r.name)}</span></a><div style="display:flex;align-items:center;gap:10px;">${r.uc>0?`<span class="unread-msg-badge">${r.uc}</span>`:''}<button class="btn-primary" style="background:#f59e0b;padding:4px 10px;font-size:12px;border-radius:4px;" onclick="event.stopPropagation();window.openChat('${r.name}')"><i class="fas fa-comment-dots"></i></button></div></div>`; }); let h = $('msgRequestsHeader'); if(ra.length > 0) { h.style.display = 'block'; $('msgRequestsList').innerHTML = rh; } else { h.style.display = 'none'; $('msgRequestsList').innerHTML = ''; } }

window.getSuggestions = () => { let ml = window.currentUser ? (window.allUsersData[window.currentUser]?.location || "غير محدد") : "غير محدد", sg = []; for(let u in window.allUsersData) { if(u === window.currentUser || window.myFriends.includes(u)) continue; let d = window.allUsersData[u];  let tf = Object.keys(window.allFriendsData[u] || {}), mc = tf.filter(f => window.myFriends.includes(f)).length, isl = (d.location && d.location === ml && ml !== "غير محدد"); if(mc > 0 || isl) { sg.push({name:u, data:d, mutualCount:mc, isSameLocation:isl}); } } sg.sort((a,b) => { if(b.mutualCount !== a.mutualCount) return b.mutualCount - a.mutualCount; if(b.isSameLocation && !a.isSameLocation) return 1; if(!b.isSameLocation && a.isSameLocation) return -1; return 0; }); return sg; };
function createSuggestedFriendsWidget() { let s = window.getSuggestions().slice(0,10); if(s.length === 0) return ''; let ch = ''; s.forEach(x => { let rr = window.currentRequests && window.currentRequests[x.name], b = ''; if(window.sentRequests && window.sentRequests[x.name]) b = `<button disabled style="background:#e2e8f0;color:#0f172a;"><i class="fas fa-clock"></i> أرسل</button>`; else if(rr) b = `<button style="background:#10b981;color:white;" onclick="event.stopPropagation();window.acceptRequestFromFeed('${x.name}')"><i class="fas fa-check"></i> قبول</button>`; else b = `<button data-action="add" data-target="${x.name}" onclick="event.stopPropagation();window.sendFriendRequestToFromFeed('${x.name}',this)"><i class="fas fa-user-plus"></i> إضافة</button>`; ch += `<div class="suggested-card"><a href="#/@${x.name}" style="color:inherit; text-decoration:none;"><img src="${x.data.profilePic||dA}"><span class="s-name" style="display:block;">${window.getDisplayName(x.name)}</span><span class="s-mutual" style="display:block;margin-bottom:5px;"><i class="fas ${x.mutualCount > 0 ? 'fa-user-friends' : 'fa-map-marker-alt'}"></i> ${x.mutualCount > 0 ? `مشتركون: ${x.mutualCount}` : 'من منطقتك'}</span></a>${b}</div>`; }); return `<div class="suggested-widget"><h4><i class="fas fa-users"></i> مقترحات</h4><div class="suggested-carousel">${ch}</div></div>`; }

function listenToUsers(){ onValue(ref(db,'users'), s => { if(s.exists()){ window.allUsersData = s.val(); if(window.isInitialLoad){ listenToPosts(); } if(window.currentUser){ renderSidebarUsers(); renderRequests(); window.renderSidebarTop(); } } }); }
function listenToAllFriends(){ onValue(ref(db,'friends'), s => { window.allFriendsData = s.exists() ? s.val() : {}; window.myFriends = window.allFriendsData[window.currentUser] ? Object.keys(window.allFriendsData[window.currentUser]) : []; renderSidebarUsers(); if(!window.isInitialLoad){ window.feedLim=5; renderFeed(); } }); }
function listenToUnreadChats(){ onValue(ref(db,`users/${window.currentUser}/unreadChats`), s => { window.unreadChatsData = s.exists() ? s.val() : {}; let t=0; if(window.currentChatTarget && window.isChatBoxVisible && window.unreadChatsData[window.currentChatTarget]){ remove(ref(db,`users/${window.currentUser}/unreadChats/${window.currentChatTarget}`)); delete window.unreadChatsData[window.currentChatTarget]; } for(let x in window.unreadChatsData){ let c = window.unreadChatsData[x], p = window.previousUnreadChats[x]||0; t+=c; if(c>p && x!==window.currentChatTarget) window.showToast("رسالة جديدة", `أرسل ${window.getDisplayName(x)} رسالة`, window.allUsersData[x]?.profilePic); } window.previousUnreadChats = {...window.unreadChatsData}; let b1=$('chatBadge'), b2=$('chatBadgeMobile'); if(t>0){ b1.style.display='inline-block'; b1.innerText=t; b2.style.display='inline-block'; b2.innerText=t; } else { b1.style.display='none'; b2.style.display='none'; } renderSidebarUsers(); }); }
function listenToRecentChats(){ onValue(ref(db,`users/${window.currentUser}/recentChats`), s => { window.recentChatsData = s.exists() ? s.val() : {}; renderSidebarUsers(); }); }
function listenToCommunities() { onValue(ref(db, 'communities'), s => { window.allCommunities = s.exists() ? s.val() : {}; if($('communitiesModal') && $('communitiesModal').classList.contains('show')) { window.renderCommunitiesList(); } }); }

window.startPrivateListeners = () => { if(window.privateListenersStarted) return; window.privateListenersStarted = true; listenToAllFriends(); listenToFriendRequests(); listenToNotifications(); listenToUnreadChats(); listenToRecentChats(); listenToCommunities(); setTimeout(window.checkFriendsBirthdays, 3000); };

window.showBanScreen = function(d) {
    let now = Date.now();
    let perm = !d.banUntil || d.banUntil === 0;
    let remaining = '';
    if (!perm) {
        let ms = d.banUntil - now;
        let days = Math.floor(ms / 86400000);
        let hours = Math.floor((ms % 86400000) / 3600000);
        remaining = days > 0 ? `متبقي ${days} يوم و${hours} ساعة` : `متبقي ${hours} ساعة`;
    }
    let reason = d.banReason || 'مخالفة سياسة المنصة';
    document.body.innerHTML = `
        <div style="min-height:100vh;background:#0f172a;display:flex;align-items:center;justify-content:center;font-family:Cairo,sans-serif;padding:20px;">
            <div style="background:#1e293b;border-radius:24px;padding:40px 35px;max-width:480px;width:100%;text-align:center;border:1px solid #334155;">
                <div style="width:90px;height:90px;background:#ef444420;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 25px;">
                    <i class="fas fa-ban" style="font-size:40px;color:#ef4444;"></i>
                </div>
                <h2 style="color:#f1f5f9;font-size:22px;font-weight:800;margin-bottom:10px;">تم إيقاف حسابك</h2>
                <p style="color:#94a3b8;font-size:14px;margin-bottom:25px;line-height:1.7;">
                    ${perm ? 'تم إيقاف حسابك بشكل دائم.' : `تم إيقاف حسابك مؤقتاً.<br><strong style="color:#f59e0b;">${remaining}</strong>`}
                </p>
                <div style="background:#0f172a;border-radius:14px;padding:18px;margin-bottom:25px;border:1px solid #334155;text-align:right;">
                    <div style="font-size:12px;color:#64748b;margin-bottom:6px;font-weight:700;">سبب الإيقاف</div>
                    <div style="color:#e2e8f0;font-size:15px;font-weight:600;">${reason}</div>
                </div>
                ${perm ? '' : `<div style="background:#f59e0b15;border:1px solid #f59e0b40;border-radius:12px;padding:14px;margin-bottom:20px;color:#fbbf24;font-size:13px;">
                    <i class="fas fa-clock"></i> سيُرفع الإيقاف تلقائياً عند انتهاء المدة
                </div>`}
                <button onclick="localStorage.removeItem('savedUser');location.reload();" 
                    style="background:#334155;color:#94a3b8;border:none;padding:12px 30px;border-radius:12px;font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;">
                    <i class="fas fa-sign-out-alt"></i> تسجيل الخروج
                </button>
            </div>
        </div>`;
    // إضافة font-awesome إن لم تكن موجودة
    if (!document.querySelector('link[href*="font-awesome"]')) {
        let fa = document.createElement('link');
        fa.rel = 'stylesheet';
        fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fa);
    }
};

window.fL = function(u, d) {
    // فحص الإيقاف أولاً
    if (d.banned) {
        let now = Date.now();
        let perm = !d.banUntil || d.banUntil === 0;
        let expired = !perm && d.banUntil < now;
        if (!expired) {
            localStorage.removeItem('savedUser');
            window.showBanScreen(d);
            return;
        } else {
            // انتهت مدة الإيقاف — ارفعه تلقائياً
            import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js").then(({update, ref}) => {
                update(ref(db, `users/${u}`), { banned: false, banUntil: null, banReason: null });
            });
        }
    }
    window.isInitialNotifLoad = true; window.alertedNotifs = new Set(); window.currentUser = u; localStorage.setItem('savedUser', u); 
    let il = $('initialLoader'); if(il){ il.classList.add('hidden'); setTimeout(()=>il.style.display='none', 400); } 
    let lw = $('loginModal'); if(lw){ lw.style.opacity='0'; lw.style.pointerEvents='none'; setTimeout(()=>lw.style.display='none', 400); } 
    let guestNav = $('guestNav'); if(guestNav) guestNav.style.display = 'none'; let loggedInNav = $('loggedInNav'); if(loggedInNav) loggedInNav.style.display = 'flex';
    let cb = $('composerBox'); if(cb) cb.style.display = 'block'; let sidebarAreaContainer = $('sidebarAreaContainer'); if(sidebarAreaContainer) sidebarAreaContainer.style.display = 'block';
    let bottomNav = $('bottomNav'); if(bottomNav) bottomNav.style.display = '';
    let n = d.displayName || u; $('currentUserDisplay').innerText = n; let p = d.profilePic || dA; 
    ['myNavAvatar','composerAvatar','myShareAvatar','mobileNavAvatar','modalMyPic'].forEach(x=>{ if($(x)) $(x).src=p; }); 
    let ab = $('adminBtn'); if(ab){ ab.style.display = (u.toLowerCase()==='admin21') ? 'flex' : 'none'; } 
    let oRef = ref(db, `users/${u}/online`); set(oRef, true); onDisconnect(oRef).set(false);
    // مراقبة حالة الإيقاف في الوقت الفعلي
    onValue(ref(db, `users/${u}/banned`), (snap) => {
        if (snap.val() === true) {
            get(ref(db, `users/${u}`)).then(s => {
                if (!s.exists()) return;
                let ud = s.val();
                let now = Date.now();
                let perm = !ud.banUntil || ud.banUntil === 0;
                let expired = !perm && ud.banUntil < now;
                if (!expired) {
                    set(ref(db, `users/${u}/online`), false);
                    localStorage.removeItem('savedUser');
                    window.showBanScreen(ud);
                }
            });
        }
    }); 
    if(!d.interests || d.interests.length === 0) { setTimeout(window.renderInterestsModal, 1000); }
    if(!window.usersListenerActive) { window.usersListenerActive = true; listenToUsers(); }
    window.startPrivateListeners();
    // تحميل قنوات الأخبار
    let nca = document.getElementById('newsChannelsArea');
    if(nca) { nca.style.display='block'; window.renderNewsChannels(); }
    if(!window.isInitialLoad) { window.renderedPostIds = new Set(window.allPosts.map(p=>p.id)); window.feedLim = 5; renderFeed(); handleRouting(); }
};

window.rU = function() { 
    window.isInitialNotifLoad=true; window.alertedNotifs=new Set(); localStorage.removeItem('savedUser'); window.currentUser=null; 
    let b=$('loginBtn'); if(b){ b.innerText="دخول"; b.disabled=false; } 
    let hash = window.location.hash; let isPublicPage = hash.startsWith('#/post/') || hash.startsWith('#/@');
    if(!isPublicPage) { let s=$('hideLoginStyle'); if(s) s.remove(); }
    let l=$('initialLoader'); if(l) l.style.display='none'; let ab=$('adminBtn'); if(ab) ab.style.display='none'; 
    let lw = $('loginModal'); if(lw && isPublicPage) { lw.style.opacity = '0'; lw.style.pointerEvents = 'none'; lw.style.display = 'none'; }
    let guestNav = $('guestNav'); if(guestNav) guestNav.style.display = 'flex'; let loggedInNav = $('loggedInNav'); if(loggedInNav) loggedInNav.style.display = 'none';
    let cb = $('composerBox'); if(cb) cb.style.display = 'none'; let sidebarAreaContainer = $('sidebarAreaContainer'); if(sidebarAreaContainer) sidebarAreaContainer.style.display = 'none';
    let bottomNav = $('bottomNav'); if(bottomNav) bottomNav.style.display = 'none';
    if(hash === '' || hash === '#/') { window.location.replace('#/login'); }
    if(!window.usersListenerActive) { window.usersListenerActive = true; listenToUsers(); }
};

// --- دوال الريلز والمشاركة والإدارة (مفقودة بعد التقسيم) ---

window.generateReelsWidgetHTML = () => {
    if(!window.allReels || window.allReels.length === 0) return '';
    let h = '<div class="reels-widget" style="background:#fff;border:1px solid var(--border-color);border-radius:16px;padding:15px;margin-bottom:20px;overflow:hidden;"><div style="font-weight:800;font-size:15px;color:var(--primary);margin-bottom:12px;display:flex;align-items:center;gap:8px;"><i class="fas fa-film"></i> ريلز</div><div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:5px;">';
    window.allReels.slice(0, 6).forEach((r, idx) => {
        let globalIdx = window.allReels.findIndex(x => x.id === r.id);
        let vc = r.views ? Object.keys(r.views).length : 0;
        let ap = window.allUsersData[r.author]?.profilePic || dA;
        h += `<div class="reel-thumb" style="flex-shrink:0;width:100px;height:160px;position:relative;cursor:pointer;border-radius:12px;overflow:hidden;" onclick="window.openReelsViewer(${globalIdx})"><video src="${r.video}" autoplay loop muted playsinline preload="auto" style="width:100%;height:100%;object-fit:cover;pointer-events:none;background:#1e293b;"></video><div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.7));padding:8px 6px;"><img src="${ap}" style="width:24px;height:24px;border-radius:50%;border:1px solid #fff;"><span style="color:#fff;font-size:10px;margin-right:4px;"><i class="fas fa-play"></i> ${vc}</span></div></div>`;
    });
    h += `</div></div>`;
    return h;
};

window.renderReelsTopBar = () => {
    let c = document.getElementById('reelsTopBar');
    if (!c) return;
    // استخدام allReels المحدّث من listenToPosts — لا نعيد تعريفه هنا
    let reels = window.allReels && window.allReels.length > 0 
        ? window.allReels 
        : (window.allPosts || []).filter(p => p.video && !p.isNewsBot);
    if (reels.length === 0) { c.style.display = 'none'; return; }
    c.style.removeProperty('display');
    let h = `<div class="reel-add-btn" onclick="window.scrollTo({top:0,behavior:'smooth'})"><i class="fas fa-plus"></i><span>أضف ريلز</span></div>`;
    reels.slice(0, 10).forEach((r, idx) => {
        let globalIdx = window.allReels.findIndex(x => x.id === r.id);
        if (globalIdx === -1) globalIdx = idx;
        let ap = (window.allUsersData[r.author] && window.allUsersData[r.author].profilePic) ? window.allUsersData[r.author].profilePic : dA;
        let dn = window.getDisplayName(r.author);
        let vc = r.views ? Object.keys(r.views).length : 0;
        h += `<div class="reel-thumb" onclick="window.openReelsViewer(${globalIdx})"><video src="${r.video}" autoplay loop muted playsinline preload="auto"></video><img src="${ap}" class="r-author-pic"><span class="r-views"><i class="fas fa-play"></i> ${vc}</span><span class="r-author-name">${dn}</span></div>`;
    });
    c.innerHTML = h;
};

window.openReelsLogic = (startIdx) => {
    let area = document.getElementById('reelsScrollArea');
    let modal = document.getElementById('reelsViewerModal');
    if (!area || !modal) return;
    area.innerHTML = '';
    let reels = (window.allReels && window.allReels.length > 0) ? window.allReels : (window.allPosts || []).filter(p => p.video);
    if (reels.length === 0) {
        area.innerHTML = '<p style="text-align:center;color:#fff;padding:40px;font-size:16px;">لا يوجد ريلز حالياً.</p>';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        return;
    }
    reels.forEach((r) => {
        let ap = (window.allUsersData[r.author] && window.allUsersData[r.author].profilePic) ? window.allUsersData[r.author].profilePic : dA;
        let dn = window.getDisplayName(r.author);
        let vc = r.views ? Object.keys(r.views).length : 0;
        let lc = r.likes ? Object.keys(r.likes).length : 0;
        let hl = window.currentUser && r.likes && r.likes[window.currentUser];
        let div = document.createElement('div');
        div.className = 'reel-screen';
        div.setAttribute('data-id', r.id);
        div.innerHTML = `<video src="${r.video}" loop playsinline preload="auto"></video><div class="reel-overlay"></div><div class="reel-side-actions"><button class="reel-action-btn" onclick="window.toggleReelLike('${r.id}',this)"><i class="${hl ? 'fas' : 'far'} fa-heart" style="${hl ? 'color:#ef4444;' : ''}"></i><span>${lc}</span></button><div class="reel-action-btn"><i class="fas fa-eye"></i><span>${vc}</span></div></div><div class="reel-info"><div class="r-author-hdr" onclick="window.history.back();setTimeout(()=>window.openProfile('${r.author}'),200)"><img src="${ap}"><h4>${dn}</h4></div><p>${r.text || ''}</p></div>`;
        area.appendChild(div);
        if (reelsObserver) reelsObserver.observe(div);
    });
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
        let items = area.querySelectorAll('.reel-screen');
        let idx = Math.min(startIdx || 0, items.length - 1);
        if (items[idx]) items[idx].scrollIntoView({ behavior: 'instant' });
        let firstVid = items[idx] ? items[idx].querySelector('video') : null;
        if (firstVid) { firstVid.muted = false; firstVid.play().catch(() => { firstVid.muted = true; firstVid.play().catch(() => {}); }); }
    }, 150);
};

window.toggleReelLike = (id, btn) => {
    if(!window.currentUser) return window.showRegisterModal();
    let r = ref(db, `posts/${id}/likes/${window.currentUser}`);
    get(r).then(s => {
        if(s.exists()) { remove(r); if(btn){ let i=btn.querySelector('i'); if(i){i.className='far fa-heart';i.style.color='';} let sp=btn.querySelector('span'); if(sp&&!isNaN(parseInt(sp.innerText))) sp.innerText=parseInt(sp.innerText)-1; } }
        else { set(r, true); if(btn){ let i=btn.querySelector('i'); if(i){i.className='fas fa-heart';i.style.color='#ef4444';} let sp=btn.querySelector('span'); if(sp&&!isNaN(parseInt(sp.innerText))) sp.innerText=parseInt(sp.innerText)+1; } }
    });
};

window.openShareLogic = (id) => {
    if(!window.currentUser) return window.showRegisterModal();
    let p = window.postCache[id] || window.allPosts.find(x => x.id === id);
    let sharePostIdEl = document.getElementById('sharePostId');
    if(sharePostIdEl) sharePostIdEl.value = id;
    if(p) { window.executeShare(); } else {
        get(ref(db, `posts/${id}`)).then(s => { if(s.exists()){ let post=s.val(); post.id=id; window.postCache[id]=post; window.allPosts.push(post); window.executeShare(); } });
    }
};

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

window.warnUser = (uid) => {
    if(!window.currentUser || window.currentUser.toLowerCase() !== 'admin21') return;
    window.dlgPrompt(`رسالة تحذير لـ ${window.getDisplayName(uid)}:`, '', 'اكتب رسالة التحذير...').then(msg => {
    if(msg) push(ref(db, `users/${uid}/notifications`), {type:'system', text:'⚠️ تحذير من الإدارة: ' + msg, timestamp:Date.now(), read:false}); });
};

window.adminDeletePost = (id) => {
    if(!window.currentUser || window.currentUser.toLowerCase() !== 'admin21') return;
    window.dlgDanger('حذف هذا المنشور إدارياً؟', 'حذف إداري').then(ok => { if(ok) remove(ref(db, `posts/${id}`)); });
};

// --- نهاية الدوال المضافة ---

if(window.currentUser){ 
    let b=$('loginBtn'); if(b){ b.innerText="جاري..."; b.disabled=true; } 
    get(ref(db, `users/${window.currentUser}`)).then(s => { if(s.exists()){ window.fL(window.currentUser, s.val()); } else window.rU(); }).catch(window.rU); 
} else {
    window.rU();
}
