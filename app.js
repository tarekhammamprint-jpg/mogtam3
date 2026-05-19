import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, get, onValue, push, update, remove, onDisconnect, query, orderByChild, limitToLast, equalTo } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// -- المتغيرات والإعدادات العامة --
window.CLOUDINARY_CLOUD_NAME = "diwaqfsap";
window.CLOUDINARY_UPLOAD_PRESET = "ml_default";

const app = initializeApp({
    apiKey: "AIzaSyAD5-oCqWmvrjKD24uSRNqqxoijQnsnqA4",
    authDomain: "mogtam3-1b98f.firebaseapp.com",
    projectId: "mogtam3-1b98f",
    storageBucket: "mogtam3-1b98f.firebasestorage.app",
    messagingSenderId: "948636671408",
    appId: "1:948636671408:web:501b87559ed12ff09a8a75",
    databaseURL: "https://mogtam3-1b98f-default-rtdb.firebaseio.com"
});
const db = getDatabase(app);

window.currentUser = localStorage.getItem('savedUser') || null;
window.currentChatTarget = null;
window.allUsersData = {};
window.allFriendsData = {};
window.myFriends = [];
window.allPosts = [];
window.postCache = {};
window.renderedPostIds = new Set();
window.isInitialLoad = true;
window.currentRequests = {};
window.sentRequests = {};
window.feedLim = 5; 
const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const videoPoster = "https://placehold.co/600x400/1e293b/ffffff?text=Video+Loading...";
const reelPoster = "https://placehold.co/300x500/1e293b/ffffff?text=Reel+Video";

window.activeMentionInput = null;
window.previousUnreadChats = {};
window.isChatBoxVisible = false;
window.selectedMediaFile = null;
window.selectedMediaType = null;
window.getDisplayName = (id) => window.allUsersData[id]?.displayName || id;
window.getDisplayHandle = (id) => '@' + id;
window.allReels = [];
let reelsObserver = null;

// ================= قائمة المجالات الـ 20 =================
const PLATFORM_INTERESTS = [
    "أخبار وسياسة", "رياضة وكرة قدم", "طبخ ووصفات", "دين وإسلاميات", 
    "تكنولوجيا وتقنية", "سيارات ومحركات", "كوميديا ومقالب", "صحة وطب", 
    "فنون وتصميم", "تعليم وثقافة", "موضة وتجميل", "سفر وسياحة", 
    "ألعاب فيديو", "تاريخ وحضارات", "علوم وطبيعة", "اقتصاد وأعمال", 
    "عقارات واستثمار", "أدب وشعر", "تنمية بشرية", "حيوانات أليفة"
];
window.selectedInterests = new Set();

if(!window.botAccounts || window.botAccounts.length === 0) {
    window.botAccounts = [];
    for(let i=1; i<=60; i++) {
        let cat = PLATFORM_INTERESTS[i % PLATFORM_INTERESTS.length];
        window.botAccounts.push({
            name: "bot_expert_" + i,
            displayName: "خبير " + cat + " " + i,
            pic: `https://ui-avatars.com/api/?name=${encodeURIComponent(cat)}&background=random&color=fff&size=150`,
            cover: "",
            location: "مصر",
            category: cat,
            type: "user"
        });
    }
}

window.addEventListener('load', () => {
    setTimeout(() => {
        let il = document.getElementById('initialLoader');
        if (il && il.style.display !== 'none') {
            il.classList.add('hidden');
            setTimeout(() => il.style.display = 'none', 400);
        }
    }, 4000);
});

window.addEventListener('hashchange', handleRouting);

function handleRouting() {
    if(!window.currentUser) return; 
    let hash = window.location.hash;
    document.querySelectorAll('.modal').forEach(m => {
        if(m.id !== 'interestsModal') m.classList.remove('show');
    });
    document.querySelectorAll('#reelsScrollArea video').forEach(v => { v.pause(); });
    document.body.style.overflow = 'auto'; 
    if(hash === '' || hash === '#/') { } 
    else if(hash.startsWith('#/@')) { let u = decodeURIComponent(hash.replace('#/@', '')); openProfileLogic(u); }
    else if(hash.startsWith('#/post/')) { let id = decodeURIComponent(hash.replace('#/post/', '')); openPostLogic(id); }
    else if(hash.startsWith('#/share/')) { let id = decodeURIComponent(hash.replace('#/share/', '')); openShareLogic(id); }
    else if(hash === '#/requests') { openRequestsLogic(); }
    else if(hash === '#/stats') { openStatsLogic(); }
    else if(hash === '#/edit-profile') { openEditProfileLogic(); }
    else if(hash === '#/reels') { openReelsLogic(window.currentReelIdx || 0); }
}

window.openProfile = (u) => { window.location.hash = '#/@' + u; };
window.openPostModal = (id) => { window.location.hash = '#/post/' + id; };
window.openShareModal = (id) => { window.location.hash = '#/share/' + id; };
window.openRequestsModal = () => { window.location.hash = '#/requests'; };
window.openAdminStats = () => { window.location.hash = '#/stats'; };
window.openEditProfileModal = () => { window.location.hash = '#/edit-profile'; };
window.openReelsViewer = (idx) => { window.currentReelIdx = idx; window.location.hash = '#/reels'; };
window.closeModal = (id) => { window.location.hash = ''; };
window.closeReelsViewer = () => { window.location.hash = ''; };

window.goHome = () => {
    window.location.hash = ''; window.scrollTo({top:0, behavior:'smooth'});
    $('chatBox').classList.remove('show'); $('floatingChat').style.display='none';
    if(window.chatUnsubscribe){ window.chatUnsubscribe(); window.chatUnsubscribe=null; }
    window.currentChatTarget = null; window.isChatBoxVisible = false;
    ['notifDropdown','userMenuDropdown','mobileUserMenuDropdown'].forEach(x => { let e=$(x); if(e) e.style.display='none'; });
    let sb = $('sidebarArea'); if(sb) sb.classList.remove('mobile-show');
    $('globalSearch').value=''; $('searchResults').style.display='none';
    $('chatSearchInput').value=''; $('chatSearchBox').style.display='none'; $('friendsList').style.display='block';
    let rl=$('msgRequestsList'); if(rl&&rl.innerHTML!=='') { $('msgRequestsHeader').style.display='block'; rl.style.display='block'; }
    window.renderedPostIds = new Set(window.allPosts.map(p => p.id));
    $('newPostsBtn').style.display='none'; window.feedLim=5; renderFeed();
};

window.uploadToCloudinary = async (file, type) => { let fd = new FormData(); fd.append('file', file); fd.append('upload_preset', window.CLOUDINARY_UPLOAD_PRESET); let res = await fetch(`https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD_NAME}/${type}/upload`, {method:'POST', body:fd}); let data = await res.json(); return data.secure_url; };
const cN = {"اسلام":"eslam","إسلام":"eslam","همام":"hammam","ابو":"abu","أبو":"abu","عاطف":"atef","محمد":"mohamed","محمود":"mahmoud","احمد":"ahmed","أحمد":"ahmed","مصطفى":"mostafa","علي":"ali","خالد":"khaled","يوسف":"yousef","ابراهيم":"ibrahim","حسن":"hassan","حسين":"hussein","عبد":"abdel","طارق":"tareq","فهد":"fahad","ياسين":"yassin","سيف":"saif","ماجد":"majed","حازم":"hazem","وليد":"waleed","سامر":"samer","رامي":"rami","كريم":"karim","زياد":"ziad","بهاء":"bahaa","صالح":"saleh","عادل":"adel","سعد":"saad","فيصل":"faisal","سليمان":"soliman","هشام":"hesham","عصام":"essam"};
const a2e = {"أ":"a","إ":"e","ا":"a","آ":"a","ب":"b","ت":"t","ث":"th","ج":"j","ح":"h","خ":"kh","د":"d","ذ":"z","ر":"r","ز":"z","س":"s","ش":"sh","ص":"s","ض":"d","ط":"t","ظ":"z","ع":"a","غ":"gh","ف":"f","ق":"q","ك":"k","ل":"l","م":"m","ن":"n","ه":"h","و":"w","ي":"y","ى":"a","ة":"a"," ":"_"};
function tr(a) { let w = a.trim().split(" "), r = []; for(let x of w) { if(cN[x]) r.push(cN[x]); else { let e = ""; for(let i=0; i<x.length; i++) e += a2e[x[i]] || x[i]; e = e.replace(/aa+/g,'a').replace(/ee+/g,'e').replace(/uu+/g,'u').replace(/oo+/g,'o').replace(/yy+/g,'y'); r.push(e); } } return r.join("_").replace(/[^a-zA-Z0-9_]/g,'').toLowerCase() || "user"; }
const $ = (id) => document.getElementById(id);

window.toggleLoginMode = (m) => { $('loginFormContent').style.display = m==='register' ? 'none' : 'block'; $('registerFormContent').style.display = m==='register' ? 'block' : 'none'; };
window.generateHandles = (n) => { let c = $('handleSuggestions'); if(!n.trim()) { c.innerHTML = ""; return; } let b = tr(n.trim().split(" ")[0]), h = '<div style="font-size:13px;margin-bottom:5px;">اختر المعرف:</div>', o = [b + Math.floor(Math.random()*99+10), b + "_" + Math.floor(Math.random()*999+100), b + new Date().getFullYear()]; o.forEach((x, i) => { h += `<label class="handle-radio-label"><input type="radio" name="selectedHandle" value="${x}" ${i===0?"checked":""}> @${x}</label>`; }); c.innerHTML = h; };

window.registerUser = () => {
    let d = $('regDisplayName').value.trim(), dbv = $('regDob').value, p = $('regPassword').value.trim(), r = document.getElementsByName('selectedHandle'), sh = null;
    for(let i=0; i<r.length; i++) { if(r[i].checked) { sh = r[i].value; break; } }
    if(!d || !dbv || !p || !sh) return alert("أكمل البيانات"); if(p.length < 6) return alert("كلمة المرور 6 أحرف على الأقل");
    let btn = $('regBtn'), ot = btn.innerText; btn.innerText = "جاري..."; btn.disabled = true;
    
    async function getLoc() {
        return new Promise(resolve => {
            let isResolved = false;
            let finish = (loc) => { if(!isResolved){ isResolved=true; resolve(loc || "غير محدد"); }};
            setTimeout(() => finish("غير محدد"), 6000); 
            async function fallback() {
                try { let res = await fetch('https://ipapi.co/json/'); let data = await res.json(); finish(data.country_name ? (data.country_name + (data.city ? " - "+data.city : "")) : "غير محدد"); } catch(e) { finish("غير محدد"); }
            }
            if(navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async pos => {
                    try { let res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=ar`); let l = await res.json(); let c = l.address.city || l.address.town || l.address.state || ""; finish((l.address.country||"") + (c ? " - "+c : "")); } catch(e) { fallback(); }
                }, fallback, {timeout:4000});
            } else fallback();
        });
    }

    getLoc().then(loc => { 
        get(ref(db,`users/${sh}`)).then(s => { 
            if(s.exists()) { alert("المعرف محجوز"); btn.innerText = ot; btn.disabled = false; } 
            else { set(ref(db,`users/${sh}`), { displayName: d, birthdate: dbv, password: p, online: true, profilePic: dA, bio: "مستخدم جديد", isBot: false, location: loc, job: "", education: "", hobbies: "", interests: [] }).then(() => { $('usernameInput').value = sh; $('passwordInput').value = p; window.login(); }); } 
        }).catch(() => { alert("خطأ"); btn.innerText = ot; btn.disabled = false; }); 
    });
};

document.body.addEventListener('click', () => { if("Notification" in window && Notification.permission === "default") Notification.requestPermission(); }, {once:true});

window.videoObserver = new IntersectionObserver((entries) => { entries.forEach(entry => { if(entry.isIntersecting) { try { entry.target.muted = true; let playPromise = entry.target.play(); if(playPromise !== undefined) { playPromise.catch(error => {}); } } catch(e){} } else { try { if(!entry.target.paused) entry.target.pause(); } catch(e){} } }); }, {threshold: 0.5});
reelsObserver = new IntersectionObserver((entries) => { entries.forEach(entry => { let video = entry.target.querySelector('video'); if(!video) return; if(entry.isIntersecting) { try { video.muted = false; video.currentTime = 0; let p = video.play(); if(p !== undefined) p.catch(e => {}); } catch(e) {} let rid = entry.target.getAttribute('data-id'); if(rid && window.currentUser) { let vRef = ref(db, `posts/${rid}/views/${window.currentUser}`); get(vRef).then(s => { if(!s.exists()) set(vRef, true); }); } } else { try { if(!video.paused) video.pause(); } catch(e) {} } }); }, {threshold: 0.7});

window.playNotifSound = () => { try { let audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); audio.volume = 0.5; audio.play().catch(e => {}); } catch(err) {} };

window.toastTimeout = null;
window.showToast = (t, x, i) => { try { $('toastTitle').innerText = t; $('toastBody').innerText = x; $('toastImg').src = i || dA; let o = $('toastNotification'); o.classList.add('show'); if(window.toastTimeout) clearTimeout(window.toastTimeout); window.toastTimeout = setTimeout(() => o.classList.remove('show'), 5000); window.playNotifSound(); if("Notification" in window && Notification.permission === "granted") { try { let s = new Notification(t, {body:x, icon:i||dA}); setTimeout(() => s.close(), 5000); } catch(e) {} } } catch(err) {} };
window.timeAgo = (ts) => { if(!ts) return "منذ فترة"; let s = Math.floor((Date.now()-ts)/1000); if(s<0) s = 0; if(s<60) return "الآن"; let m = Math.floor(s/60); if(m<60) return "منذ "+m+" دقيقة"; let h = Math.floor(m/60); if(h<24) return "منذ "+h+" ساعة"; let d = Math.floor(h/24); if(d<7) return "منذ "+d+" أيام"; let dt = new Date(ts); return isNaN(dt) ? "منذ فترة" : dt.toLocaleDateString('ar-EG'); };

window.isInitialNotifLoad = true; window.alertedNotifs = new Set();
function listenToNotifications() { onValue(ref(db, `users/${window.currentUser}/notifications`), s => { let c = 0, h = ''; if(s.exists()) { let n = []; s.forEach(x => { let v = x.val(); if(v && typeof v === 'object' && v.type) n.push({...v, id: x.key}); }); n.sort((a,b) => (b.timestamp||0) - (a.timestamp||0)); n = n.slice(0,50); n.forEach(x => { try { if(x.read === false) c++; let d = window.getDisplayName(x.from), pic = window.allUsersData[x.from]?.profilePic || dA, tH = '', tP = '', icon = ''; if(x.type==='system'){tH=x.text; tP=x.text; icon='<i class="fas fa-bell" style="color:#64748b;"></i>'} else if(x.type==='comment'){tH=`<strong>${d}</strong> علق على منشورك`; tP=`علق ${d} على منشورك`; icon='<i class="fas fa-comment" style="color:#10b981;"></i>'} else if(x.type==='like'){tH=`<strong>${d}</strong> تفاعل مع منشورك`; tP=`تفاعل ${d} مع منشورك`; icon='<i class="fas fa-heart" style="color:#ef4444;"></i>'} else if(x.type==='friend_req'){tH=`<strong>${d}</strong> أرسل طلب صداقة`; tP=`أرسل ${d} طلب صداقة`; icon='<i class="fas fa-user-plus" style="color:#3b82f6;"></i>'} else if(x.type==='accept_req'){tH=`<strong>${d}</strong> وافق على طلب الصداقة`; tP=`وافق ${d} على طلب الصداقة`; icon='<i class="fas fa-user-check" style="color:#10b981;"></i>'} else if(x.type==='share'){tH=`<strong>${d}</strong> شارك منشورك`; tP=`شارك ${d} منشورك`; icon='<i class="fas fa-share" style="color:#8b5cf6;"></i>'} else if(x.type==='reply'){tH=`<strong>${d}</strong> رد على تعليقك`; tP=`رد ${d} على تعليقك`; icon='<i class="fas fa-reply" style="color:#64748b;"></i>'} else if(x.type==='mention'){tH=`<strong>${d}</strong> ذكرك في تعليق`; tP=`ذكرك ${d} في تعليق`; icon='<i class="fas fa-at" style="color:#d946ef;"></i>'} if(!window.isInitialNotifLoad && x.read===false && x.from!==window.currentUser && !window.alertedNotifs.has(x.id)){ window.showToast("إشعار جديد", tP||"تفاعل جديد", pic); } window.alertedNotifs.add(x.id); let uS = x.read === false ? 'background:#eef2ff;' : 'background:#fff;', uD = x.read === false ? `<div style="width:10px;height:10px;background:var(--primary);border-radius:50%;flex-shrink:0;box-shadow:0 0 5px rgba(37,99,235,0.4);"></div>` : '', tm = window.timeAgo(x.timestamp); h += `<div class="notif-item" onclick="window.handleNotifClick('${x.id}','${x.type}','${x.from}','${x.postId}')" style="display:flex; align-items:center; gap:12px; padding:12px 15px; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:all 0.2s; ${uS}"><div style="position:relative; flex-shrink:0;"><img src="${pic}" style="width:45px;height:45px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;"><div style="position:absolute; bottom:-4px; right:-4px; background:#fff; border-radius:50%; padding:3px; font-size:11px; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(0,0,0,0.15);">${icon}</div></div><div style="flex:1; line-height:1.4; text-align:right;"><div style="font-size:14px; color:var(--text-main);">${tH||"إشعار جديد"}</div><div style="font-size:12px; color:${x.read===false?'var(--primary)':'#64748b'}; font-weight:700; margin-top:4px;">${tm}</div></div>${uD}</div>`; } catch(err) {} }); } window.isInitialNotifLoad = false; let b = $('notifBadge'); if(c > 0) { b.style.display='inline-block'; b.innerText=c; } else b.style.display='none'; let head = `<div style="padding:15px; border-bottom:1px solid #e2e8f0; font-weight:800; font-size:16px; display:flex; justify-content:space-between; align-items:center;"><span>الإشعارات</span><span style="font-size:12px; color:var(--primary); cursor:pointer;" onclick="event.stopPropagation();window.markNotifsAsRead()">تحديد كـ مقروء</span></div>`; $('notifDropdown').innerHTML = head + (h ? `<div style="max-height:350px;overflow-y:auto;overscroll-behavior:contain;">${h}</div>` : '<div style="padding:20px;text-align:center;color:#64748b;font-weight:bold;">لا توجد إشعارات</div>'); }); }
window.handleNotifClick = (id, t, f, p) => { update(ref(db, `users/${window.currentUser}/notifications/${id}`), {read:true}); $('notifDropdown').style.display='none'; if(t==='friend_req') window.openRequestsModal(); else if(t==='accept_req' || t==='system') window.openProfile(f); else if(['comment','like','share','reply','mention'].includes(t) && p && p!=='undefined') window.openPostModal(p); };
window.markNotifsAsRead = () => { get(ref(db, `users/${window.currentUser}/notifications`)).then(s => { if(s.exists()) { let updates = {}; s.forEach(c => { if(c.val().read === false) updates[`${c.key}/read`] = true; }); if(Object.keys(updates).length > 0) update(ref(db, `users/${window.currentUser}/notifications`), updates); } }); };

function renderSidebarTop() { 
    let h=''; 
    let reqArr = Object.entries(window.currentRequests||{}).map(([k,v]) => ({id:k, time: v===true ? 0 : v})).sort((a,b) => b.time - a.time);
    let rc = reqArr.length; 
    if(rc > 0) { 
        h += `<div class="sidebar-title" style="color:var(--primary);"><em class="fas fa-user-friends"></em> طلبات الصداقة (${rc})</div>`; 
        let maxReq = Math.min(rc, 3); 
        for(let i=0; i<maxReq; i++) { 
            let s = reqArr[i].id, p = window.allUsersData[s]?.profilePic || dA, d = window.getDisplayName(s); 
            h += `<div class="user-row"><div class="user-info" onclick="window.openProfile('${s}')"><img src="${p}" class="avatar-small"><span>${d}</span></div><div style="display:flex;gap:5px;"><button class="btn-primary" style="background:#10b981;padding:4px 10px;border-radius:6px;" onclick="window.acceptRequest('${s}')"><i class="fas fa-check"></i></button><button class="btn-secondary" style="padding:4px 10px;border-radius:6px;" onclick="window.rejectRequest('${s}')"><i class="fas fa-times"></i></button></div></div>`; 
        } 
    } else { 
        let sg = window.getSuggestions ? window.getSuggestions().filter(x => !x.isPage && !window.sentRequests[x.name]) : [], t3 = sg.slice(0,3); 
        if(t3.length > 0) { 
            h += `<div class="sidebar-title" style="color:var(--secondary);"><em class="fas fa-user-plus"></em> مقترحون</div>`; 
            t3.forEach(s => { 
                let p = s.data.profilePic || dA, d = window.getDisplayName(s.name); 
                h += `<div class="user-row"><div class="user-info" onclick="window.openProfile('${s.name}')"><img src="${p}" class="avatar-small"><span>${d}</span></div><button class="btn-primary" style="padding:4px 10px;font-size:12px;border-radius:6px;" onclick="event.stopPropagation();window.sendFriendRequestToFromFeed('${s.name}',this)"><i class="fas fa-user-plus"></i></button></div>`; 
            }); 
        } 
    } 
    let c = $('sidebarTopSection'); if(c) c.innerHTML = h; 
};
window.renderSidebarTop = renderSidebarTop;

const eRE = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
window.formatMentions = (t) => { if(!t) return ''; let s = t.replace(/</g, "&lt;").replace(/>/g, "&gt;"); if(window.myFriends) { window.myFriends.forEach(f => { s = s.replace(new RegExp('@'+eRE(f)+'(?=\\s|$)', 'g'), `<strong style="color:var(--primary);cursor:pointer;background:#eef2ff;padding:2px 5px;border-radius:4px;" onclick="event.stopPropagation();window.openProfile('${f}')">@${f}</strong>`); }); } return s; };
window.handleMentionInput = (e) => { window.activeMentionInput = e; let v = e.value, c = e.selectionStart, tb = v.substring(0,c), la = tb.lastIndexOf('@'), mb = $('globalMentionBox'); if(la !== -1 && (la === 0 || tb[la-1] === ' ')) { let q = tb.substring(la+1), m = window.myFriends.filter(f => f.toLowerCase().includes(q.toLowerCase()) || window.getDisplayName(f).toLowerCase().includes(q.toLowerCase())); if(m.length > 0) { let h = ''; m.forEach(x => { h += `<div class="mention-item" onclick="window.insertMention('${x}')"><img src="${window.allUsersData[x]?.profilePic||dA}"> <span>${window.getDisplayName(x)} (@${x})</span></div>`; }); mb.innerHTML = h; mb.style.display = 'block'; let r = e.getBoundingClientRect(); mb.style.left = r.left + 'px'; mb.style.top = (r.top - mb.offsetHeight - 5) + 'px'; if(r.top < mb.offsetHeight) mb.style.top = (r.bottom + 5) + 'px'; } else mb.style.display = 'none'; } else mb.style.display = 'none'; };
window.insertMention = (f) => { let e = window.activeMentionInput; if(!e) return; let v = e.value, c = e.selectionStart, tb = v.substring(0,c), la = tb.lastIndexOf('@'), ta = v.substring(c); if(la !== -1) { let n = v.substring(0,la) + '@' + f + ' '; e.value = n + ta; e.focus(); e.selectionStart = e.selectionEnd = n.length; } $('globalMentionBox').style.display = 'none'; };

document.addEventListener('click', (e) => { if(!e.target || typeof e.target.closest !== 'function') return; if(!e.target.closest('#globalMentionBox') && !e.target.classList.contains('comment-input') && !e.target.classList.contains('composer-input')) { $('globalMentionBox').style.display = 'none'; } if(!e.target.closest('.search-container')) { $('searchResults').style.display = 'none'; } if(!e.target.closest('.notif-container')) { $('notifDropdown').style.display = 'none'; } if(!e.target.closest('.nav-user-container') && !e.target.closest('.b-nav-item')) { let u = $('userMenuDropdown'), m = $('mobileUserMenuDropdown'); if(u) u.style.display = 'none'; if(m) m.style.display = 'none'; } });
window.toggleDropdown = (id) => { let e = $(id); if(!e) return; let d = e.style.display === 'block'; ['notifDropdown','userMenuDropdown','mobileUserMenuDropdown'].forEach(x => { let el=$(x); if(el) el.style.display='none'; }); if(!d) e.style.display = 'block'; };
window.toggleSidebar = () => { let s = $('sidebarArea'); window.innerWidth <= 768 ? s.classList.toggle('mobile-show') : s.classList.toggle('hidden'); };
window.switchProfileTab = (t) => { ['posts','reels','photos','friends','about'].forEach(x => { let e = $('tab-'+x), b = $('btnTab'+x.charAt(0).toUpperCase()+x.slice(1)); if(e) e.style.display = 'none'; if(b) b.classList.remove('active'); }); $('tab-'+t).style.display = 'block'; $('btnTab'+t.charAt(0).toUpperCase()+t.slice(1)).classList.add('active'); };
window.handleGlobalSearch = (q) => { let r = $('searchResults'); if(!q.trim()){ r.style.display='none'; return; } let h=''; for(let u in window.allUsersData) { let d = window.getDisplayName(u); if(d.toLowerCase().includes(q.toLowerCase()) || u.toLowerCase().includes(q.toLowerCase())) { h += `<div class="search-result-item" onclick="window.executeProfileSearch('${u}')"><img src="${window.allUsersData[u].profilePic||dA}" class="avatar-small"> <div style="display:flex;flex-direction:column;line-height:1.2;"><span>${d}</span><span style="font-size:11px;color:#64748b;">@${u}</span></div></div>`; } } r.innerHTML = h || '<div style="padding:10px;text-align:center;color:#666;">لا توجد نتائج</div>'; r.style.display='block'; };
window.searchChatUsers = (q) => { let r=$('chatSearchBox'), f=$('friendsList'), rh=$('msgRequestsHeader'), rl=$('msgRequestsList'); if(!q.trim()){ r.style.display='none'; f.style.display='block'; if(rl&&rl.innerHTML!==''){ rh.style.display='block'; rl.style.display='block'; } return; } f.style.display='none'; rh.style.display='none'; rl.style.display='none'; let h=''; for(let u in window.allUsersData){ if(u===window.currentUser) continue; let d = window.getDisplayName(u); if(d.toLowerCase().includes(q.toLowerCase()) || u.toLowerCase().includes(q.toLowerCase())){ h += `<div class="user-row" onclick="window.openChat('${u}')"><div class="user-info"><img src="${window.allUsersData[u].profilePic||dA}" class="avatar-small"><span>${d}</span></div><button class="btn-primary" style="padding:4px 10px;font-size:12px;border-radius:4px;"><i class="fas fa-comment-dots"></i></button></div>`; } } r.innerHTML = h || '<div style="padding:10px;text-align:center;color:#64748b;font-size:14px;">لا توجد نتائج</div>'; r.style.display='block'; };
window.executeProfileSearch = (u) => { $('searchResults').style.display='none'; $('globalSearch').value=''; window.openProfile(u); };
window.logoutUser = () => { if(window.currentUser && confirm("خروج؟")) { set(ref(db, `users/${window.currentUser}/online`), false).then(() => { localStorage.removeItem('savedUser'); location.reload(); }); } };
window.renderSuggestedUsersModal = () => { let s = window.getSuggestions ? window.getSuggestions().slice(0,15) : [], h=''; if(s.length===0) h='<p style="text-align:center;color:#666;font-size:14px;">لا مقترحات.</p>'; else s.forEach(x => { let p=x.data.profilePic||dA, d=window.getDisplayName(x.name), st=x.isPage?'صفحة رسمية':(x.mutualCount>0?`مشتركون: ${x.mutualCount}`:(x.isSameLocation?'من منطقتك':'عضو جديد')), rr = window.currentRequests && window.currentRequests[x.name], b=''; if(window.sentRequests && window.sentRequests[x.name]) b=`<button class="btn-secondary" disabled style="padding:6px 12px;font-size:13px;"><i class="fas fa-clock"></i> أرسل</button>`; else if(rr) b=`<button class="btn-primary" style="background:#10b981;padding:6px 12px;font-size:13px;" onclick="event.stopPropagation();window.acceptRequestFromFeed('${x.name}')"><i class="fas fa-check"></i> قبول</button>`; else b=`<button class="btn-primary" data-action="add" data-target="${x.name}" style="padding:6px 12px;font-size:13px;" onclick="event.stopPropagation();window.sendFriendRequestToFromFeed('${x.name}',this)"><i class="fas fa-user-plus"></i> إضافة</button>`; h += `<div class="req-row"><div style="display:flex;align-items:center;gap:10px;" onclick="window.openProfile('${x.name}')"><img src="${p}" class="avatar-small"><div style="display:flex;flex-direction:column;cursor:pointer;"><strong style="font-size:15px;color:var(--text-main);text-align:right;">${d}</strong><span style="font-size:12px;color:var(--text-muted);text-align:right;">${st}</span></div></div><div class="req-actions">${b}</div></div>`; }); let u = $('usersList'); if(u) u.innerHTML=h; };

window.login = () => { if("Notification" in window && Notification.permission === "default") Notification.requestPermission(); let u = $('usernameInput').value.trim(); if(u.startsWith('@')) u = u.substring(1); let p = $('passwordInput').value.trim(); if(!u || !p) return alert("أدخل البيانات!"); let b = $('loginBtn'), ot = b.innerText; b.innerText="جاري..."; b.disabled = true; let tc = setTimeout(() => { alert("انتهى الوقت!"); b.innerText=ot; b.disabled = false; }, 10000); get(ref(db, `users/${u}`)).then(s => { clearTimeout(tc); if(s.exists()){ if(s.val().password === p) fL(u, s.val()); else { alert("خطأ بالمرور!"); b.innerText=ot; b.disabled=false; } } else { alert("غير موجود."); b.innerText=ot; b.disabled=false; } }).catch(() => { clearTimeout(tc); alert("رُفض الاتصال."); b.innerText=ot; b.disabled=false; }); };
window.checkFriendsBirthdays = () => { let t = new Date(), m = String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'), y = t.getFullYear(); window.myFriends.forEach(f => { let d = window.allUsersData[f]; if(d && d.birthdate) { let p = d.birthdate.split('-'); if(p.length===3 && p[1]+'-'+p[2]===m) { let nk = `bday_${f}_${y}`, rp = `users/${window.currentUser}/birthdayNotifs/${nk}`; get(ref(db, rp)).then(s => { if(!s.exists()){ set(ref(db, rp), true); push(ref(db, `users/${window.currentUser}/notifications`), {type:'system', text:`اليوم عيد ميلاد ${window.getDisplayName(f)} 🎂`, from:f, timestamp:Date.now(), read:false}); } }); } } }); };

// ======================== نظام الاهتمامات ========================
window.renderInterestsModal = () => {
    let c = $('interestsContainer'), h = '';
    if(c) {
        PLATFORM_INTERESTS.forEach(cat => {
            h += `<div class="interest-chip" onclick="window.toggleInterest(this, '${cat}')">${cat}</div>`;
        });
        c.innerHTML = h;
        $('interestsModal').classList.add('show');
        document.body.style.overflow = 'hidden';
    }
};

window.toggleInterest = (el, cat) => {
    if(window.selectedInterests.has(cat)) { window.selectedInterests.delete(cat); el.classList.remove('selected'); }
    else { window.selectedInterests.add(cat); el.classList.add('selected'); }
};

window.saveUserInterests = () => {
    if(window.selectedInterests.size < 3) return alert("الرجاء اختيار 3 اهتمامات على الأقل ليتم تخصيص المنصة لك.");
    let arr = Array.from(window.selectedInterests);
    let btn = $('saveInterestsBtn'), ot = btn.innerText; btn.innerText = "جاري الحفظ..."; btn.disabled = true;
    update(ref(db, `users/${window.currentUser}`), { interests: arr }).then(() => {
        $('interestsModal').classList.remove('show');
        document.body.style.overflow = 'auto';
        btn.innerText = ot; btn.disabled = false;
        alert("تم تخصيص تجربتك بنجاح! ✨");
    }).catch(e => { alert("حدث خطأ"); btn.innerText = ot; btn.disabled = false; });
};

function fL(u, d) { 
    window.isInitialNotifLoad = true; window.alertedNotifs = new Set(); window.currentUser = u; localStorage.setItem('savedUser', u); 
    let il = $('initialLoader'); if(il){ il.classList.add('hidden'); setTimeout(()=>il.style.display='none', 400); } 
    let lw = $('loginModal'); if(lw){ lw.style.opacity='0'; lw.style.pointerEvents='none'; setTimeout(()=>lw.style.display='none', 400); } 
    let n = d.displayName || u; $('currentUserDisplay').innerText = n; let p = d.profilePic || dA; 
    ['myNavAvatar','composerAvatar','myShareAvatar','mobileNavAvatar','modalMyPic'].forEach(x=>{ if($(x)) $(x).src=p; }); 
    let ab = $('adminBtn'); if(ab){ ab.style.display = (u.toLowerCase()==='admin21') ? 'flex' : 'none'; } 
    let oRef = ref(db, `users/${u}/online`); set(oRef, true); onDisconnect(oRef).set(false); 
    if(!d.interests || d.interests.length === 0) { setTimeout(window.renderInterestsModal, 1000); }
    listenToUsers(); 
}

if(window.currentUser){ 
    let b=$('loginBtn'); if(b){ b.innerText="جاري..."; b.disabled=true; } 
    get(ref(db, `users/${window.currentUser}`)).then(s => { 
        if(s.exists()){ fL(window.currentUser, s.val()); } else rU(); 
    }).catch(rU); 
}

function rU(){ 
    window.isInitialNotifLoad=true; window.alertedNotifs=new Set(); localStorage.removeItem('savedUser'); window.currentUser=null; 
    let b=$('loginBtn'); if(b){ b.innerText="دخول"; b.disabled=false; } 
    let s=$('hideLoginStyle'), l=$('initialLoader'); if(s) s.remove(); if(l) l.style.display='none'; 
    let ab=$('adminBtn'); if(ab) ab.style.display='none'; 
}

function listenToUsers(){ onValue(ref(db,'users'), s => { if(s.exists()){ window.allUsersData = s.val(); if(window.isInitialLoad){ listenToAllFriends(); listenToFriendRequests(); listenToPosts(); listenToNotifications(); listenToUnreadChats(); listenToRecentChats(); initAndRunBots(); setTimeout(window.checkFriendsBirthdays, 3000); } else { renderSidebarUsers(); renderRequests(); window.renderSidebarTop(); } } }); }
function listenToAllFriends(){ onValue(ref(db,'friends'), s => { window.allFriendsData = s.exists() ? s.val() : {}; window.myFriends = window.allFriendsData[window.currentUser] ? Object.keys(window.allFriendsData[window.currentUser]) : []; renderSidebarUsers(); if(!window.isInitialLoad){ window.feedLim=5; renderFeed(); } }); }
function listenToUnreadChats(){ onValue(ref(db,`users/${window.currentUser}/unreadChats`), s => { window.unreadChatsData = s.exists() ? s.val() : {}; let t=0; if(window.currentChatTarget && window.isChatBoxVisible && window.unreadChatsData[window.currentChatTarget]){ remove(ref(db,`users/${window.currentUser}/unreadChats/${window.currentChatTarget}`)); delete window.unreadChatsData[window.currentChatTarget]; } for(let x in window.unreadChatsData){ let c = window.unreadChatsData[x], p = window.previousUnreadChats[x]||0; t+=c; if(c>p && x!==window.currentChatTarget) window.showToast("رسالة جديدة", `أرسل ${window.getDisplayName(x)} رسالة`, window.allUsersData[x]?.profilePic); } window.previousUnreadChats = {...window.unreadChatsData}; let b1=$('chatBadge'), b2=$('chatBadgeMobile'); if(t>0){ b1.style.display='inline-block'; b1.innerText=t; b2.style.display='inline-block'; b2.innerText=t; } else { b1.style.display='none'; b2.style.display='none'; } renderSidebarUsers(); }); }
function listenToRecentChats(){ onValue(ref(db,`users/${window.currentUser}/recentChats`), s => { window.recentChatsData = s.exists() ? s.val() : {}; renderSidebarUsers(); }); }

window.renderReelsTopBar = () => { 
    let topBar = $('reelsTopBar'); if(!topBar) return; 
    let h = `<label class="reel-add-btn" style="margin:0;"><i class="fas fa-plus"></i> إنشاء ريل<input type="file" style="display:none;" accept="video/*" onchange="window.previewMedia(event, 'reel'); window.scrollTo({top:0, behavior:'smooth'});"></label>`; 
    let visibleReels = window.allReels.filter(r => r.author === window.currentUser || window.myFriends.includes(r.author) || (window.allUsersData[r.author] && !window.allUsersData[r.author].isBot)); 
    visibleReels.forEach((r) => { 
        let ap = window.allUsersData[r.author]?.profilePic || dA, an = window.getDisplayName(r.author); 
        let vc = r.views ? Object.keys(r.views).length : 0; 
        let globalIdx = window.allReels.findIndex(x => x.id === r.id); 
        h += `<div class="reel-thumb" onclick="window.openReelsViewer(${globalIdx})"><video src="${r.video}" autoplay loop muted playsinline preload="auto" poster="${reelPoster}" style="pointer-events:none; background:#1e293b; object-fit:cover;"></video><img src="${ap}" class="r-author-pic"><span class="r-author-name">${an}</span><span class="r-views"><i class="fas fa-play"></i> ${vc}</span></div>`; 
    }); 
    topBar.innerHTML = h; topBar.style.display = 'flex'; 
};

window.generateReelsWidgetHTML = () => { 
    let visibleReels = window.allReels.filter(r => r.author === window.currentUser || window.myFriends.includes(r.author) || (window.allUsersData[r.author] && !window.allUsersData[r.author].isBot)).slice(0,10); 
    if(visibleReels.length === 0) return ''; 
    let h = `<div class="reels-container" style="margin-top: 15px;">`; 
    visibleReels.forEach(r => { 
        let ap = window.allUsersData[r.author]?.profilePic || dA, an = window.getDisplayName(r.author); 
        let vc = r.views ? Object.keys(r.views).length : 0; 
        let globalIdx = window.allReels.findIndex(x => x.id === r.id); 
        h += `<div class="reel-thumb" onclick="window.openReelsViewer(${globalIdx})"><video src="${r.video}" autoplay loop muted playsinline preload="auto" poster="${reelPoster}" style="pointer-events:none; background:#1e293b; object-fit:cover;"></video><img src="${ap}" class="r-author-pic"><span class="r-author-name">${an}</span><span class="r-views"><i class="fas fa-play"></i> ${vc}</span></div>`; 
    }); 
    h += `</div>`; return h; 
};

window.openReelsLogic = (startIndex) => { 
    let modal = $('reelsViewerModal'), scrollArea = $('reelsScrollArea'), h = ''; 
    window.allReels.forEach(r => { 
        let ap = window.allUsersData[r.author]?.profilePic || dA, an = window.getDisplayName(r.author); 
        let lc = r.likes ? Object.keys(r.likes).length : 0; 
        let myLike = r.likes && r.likes[window.currentUser] ? 'color:#ef4444;' : 'color:#fff;'; 
        h += `<div class="reel-screen" data-id="${r.id}"><video src="${r.video}" loop playsinline preload="auto" poster="${reelPoster}" style="background:#1e293b;"></video><div class="reel-overlay"></div><div class="reel-side-actions"><button class="reel-action-btn" onclick="window.toggleLike('${r.id}', '${r.author}', this)"><i class="fas fa-heart" style="${myLike}"></i><span class="lc-count">${lc}</span></button><button class="reel-action-btn" onclick="window.closeReelsViewer(); window.openPostModal('${r.id}')"><i class="fas fa-comment-dots"></i><span>تعليق</span></button><button class="reel-action-btn" onclick="window.closeReelsViewer(); window.openShareModal('${r.id}')"><i class="fas fa-share"></i><span>مشاركة</span></button></div><div class="reel-info"><div class="r-author-hdr" onclick="window.openProfile('${r.author}')"><img src="${ap}"><h4>${an}</h4></div><p>${r.text||'ريلز مجتمعنا'}</p></div></div>`; 
    }); 
    scrollArea.innerHTML = h; modal.classList.add('show'); document.body.style.overflow = 'hidden'; scrollArea.querySelectorAll('.reel-screen').forEach(scr => reelsObserver.observe(scr)); setTimeout(() => { let target = scrollArea.children[startIndex]; if(target) target.scrollIntoView({behavior:'auto'}); }, 100); 
};

window.openChatFromProfile = () => { let t = $('profHandle').innerText.replace('@', ''); window.location.hash=''; setTimeout(() => window.openChat(t), 300); };

window.openChat = (t) => {
    window.location.hash = ''; 
    document.querySelectorAll('.modal').forEach(m => { if(m.id!=='interestsModal') m.classList.remove('show'); }); 
    document.body.style.overflow = 'auto';
    $('sidebarArea').classList.remove('mobile-show'); 
    $('floatingChat').style.display = 'none';
    
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
                let ci = '';
                if(mc === 'me') { if(m.read) ci = '<i class="fas fa-check-double" style="color:#38bdf8;opacity:1;margin-right:4px;"></i>'; else if(to) ci = '<i class="fas fa-check-double" style="color:#cbd5e1;opacity:0.9;margin-right:4px;"></i>'; else ci = '<i class="fas fa-check" style="color:#cbd5e1;opacity:0.9;margin-right:4px;"></i>'; }
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
        let d = {sender:window.currentUser, timestamp:n, read:false};
        if(type === 'image') d.image = url; else d.video = url;
        push(ref(db, `chats/${rid}`), d).then(() => { update(ref(db, `users/${window.currentUser}/recentChats`), {[t]:n}); update(ref(db, `users/${t}/recentChats`), {[window.currentUser]:n}); let ur = ref(db, `users/${t}/unreadChats/${window.currentUser}`); get(ur).then(s => set(ur, (s.exists() ? s.val() : 0) + 1)); });
    } catch(err) { alert('فشل الرفع'); }
};

let tT = null;
window.handleChatInput = () => { if(!window.currentChatTarget) return; let r = [window.currentUser, window.currentChatTarget].sort().join('_'); set(ref(db, `chats_typing/${r}/${window.currentUser}`), true); clearTimeout(tT); tT = setTimeout(() => set(ref(db, `chats_typing/${r}/${window.currentUser}`), false), 1500); };
window.sendMessage = () => {
    let t = $('chatInput').value.trim(); if(!t || !window.currentChatTarget) return;
    let tg = window.currentChatTarget, r = [window.currentUser, tg].sort().join('_'), n = Date.now();
    set(ref(db, `chats_typing/${r}/${window.currentUser}`), false); clearTimeout(tT);
    push(ref(db, `chats/${r}`), {sender:window.currentUser, text:t, timestamp:n, read:false}).then(() => { $('chatInput').value = ''; update(ref(db, `users/${window.currentUser}/recentChats`), {[tg]:n}); update(ref(db, `users/${tg}/recentChats`), {[window.currentUser]:n}); let ur = ref(db, `users/${tg}/unreadChats/${window.currentUser}`); get(ur).then(s => set(ur, (s.exists() ? s.val() : 0) + 1)); });
};

function listenToPosts() { 
    onValue(query(ref(db,'posts'), orderByChild('timestamp'), limitToLast(100)), s => { 
        let l = []; 
        if(s.exists()){ 
            s.forEach(c => { let p=c.val(); p.id=c.key; l.push(p); window.postCache[p.id]=p; }); 
            l.sort((a,b) => b.timestamp - a.timestamp); 
        } 
        window.allPosts = l; 
        
        window.allReels = l.filter(p => p.video != null && window.allUsersData[p.author] && !window.allUsersData[p.author].isBot); 
        window.renderReelsTopBar();

        if(window.isInitialLoad){ 
            window.renderedPostIds = new Set(l.map(p=>p.id)); renderFeed(); window.isInitialLoad=false; 
        } else { 
            let hash = window.location.hash; 
            if(hash.startsWith('#/post/')){ let up = window.postCache[decodeURIComponent(hash.replace('#/post/', ''))]; if(up) window.openPostLogic(up.id); } 
            let nc = l.filter(p=>!window.renderedPostIds.has(p.id)).length, mp = l.some(p=>p.author===window.currentUser&&!window.renderedPostIds.has(p.id)); 
            if(mp){ window.renderedPostIds = new Set(l.map(p=>p.id)); renderFeed(); $('newPostsBtn').style.display='none'; } 
            else if(nc>=3){ $('newPostsBtn').style.display='block'; $('newPostsBtn').innerText=`عرض الجديدة (${nc}) ⬆️`; } 
            else { let ci=new Set(l.map(p=>p.id)); for(let id of window.renderedPostIds) if(!ci.has(id)) window.renderedPostIds.delete(id); } 
        } 
        if(window.location.hash.startsWith('#/@')) try { renderProfilePosts(decodeURIComponent(window.location.hash.replace('#/@', ''))) } catch(e){} 
    }); 
}

window.showNewPosts = () => { window.renderedPostIds = new Set(window.allPosts.map(p=>p.id)); window.feedLim=5; renderFeed(); $('newPostsBtn').style.display='none'; window.scrollTo({top:0, behavior:'smooth'}); };

window.addEventListener('scroll', () => { 
    if((window.innerHeight+window.scrollY) >= document.body.offsetHeight-800){ 
        if(window.feedLim < window.allPosts.length){ 
            window.feedLim += 5; 
            renderFeed(); 
        } 
    } 
});

function createPostHTML(p, cp, it=false, im=false) {
    let dt = new Date(p.timestamp).toLocaleString('ar-EG'), ap = window.allUsersData[p.author]?.profilePic || dA, ism = p.author === window.currentUser, ad = window.getDisplayName(p.author), ah = `<span style="font-size:12px;color:var(--text-muted);font-weight:normal;">@${p.author}</span>`, af = '';
    let abg = p.author.toLowerCase() === 'admin21' ? '<span style="background:#7c3aed;color:#fff;padding:2px 6px;border-radius:6px;font-size:10px;margin-right:5px;font-weight:bold;">إدارة</span>' : '';
    if(!ism && !window.myFriends.includes(p.author)) { let rr = window.currentRequests && window.currentRequests[p.author]; if(window.sentRequests && window.sentRequests[p.author]) af = `<button class="btn-primary" style="padding:2px 10px;font-size:11px;border-radius:6px;margin-right:10px;background:#e2e8f0;color:#0f172a;" disabled><i class="fas fa-clock"></i> تم</button>`; else if(rr) af = `<button class="btn-primary" style="padding:2px 10px;font-size:11px;border-radius:6px;margin-right:10px;background:#10b981;" onclick="event.stopPropagation();window.acceptRequestFromFeed('${p.author}')"><i class="fas fa-check"></i> قبول</button>`; else af = `<button class="btn-primary" data-action="add" data-target="${p.author}" style="padding:2px 10px;font-size:11px;border-radius:6px;margin-right:10px;" onclick="event.stopPropagation();window.sendFriendRequestToFromFeed('${p.author}',this)"><i class="fas fa-user-plus"></i> إضافة</button>`; }
    let tbg = it ? `<span style="background:#ff9800;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;margin-right:10px;font-weight:bold;"><i class="fas fa-fire"></i> رائج</span>` : '', ch = ism ? `<div class="post-controls"><button onclick="event.stopPropagation();window.editPost('${p.id}')"><i class="fas fa-edit"></i></button><button onclick="event.stopPropagation();window.deletePost('${p.id}')"><i class="fas fa-trash"></i></button></div>` : '';
    let hl = p.likes && p.likes[window.currentUser], hi = hl ? '<i class="fas fa-heart" style="color:#ef4444;"></i>' : '<i class="far fa-heart" style="color:#64748b;"></i>', lc = p.likes ? Object.keys(p.likes).length : 0, lt = lc > 0 ? `<span style="font-size:14px;margin-right:5px;color:#64748b;">${lc}</span>` : `<span style="font-size:14px;margin-right:5px;color:#64748b;">إعجاب</span>`;
    let st = window.formatMentions(p.text), pb = '', ca = im ? '' : `onclick="window.openPostModal('${p.id}')"`;
    let isLongP = p.text && (p.text.length > 200 || p.text.split('\n').length > 3);
    let pTxt = `<div class="post-content ${isLongP && !im ? 'collapsed' : ''}" id="ptxt_${p.id}">${st}</div>`; if(isLongP && !im) pTxt += `<div class="show-more-btn" onclick="document.getElementById('ptxt_${p.id}').classList.remove('collapsed'); this.style.display='none'; event.stopPropagation();">عرض المزيد</div>`;
    if(p.isShare && p.sharedData) { let sap = window.allUsersData[p.sharedData.author]?.profilePic || dA, sst = window.formatMentions(p.sharedData.text), sd = window.getDisplayName(p.sharedData.author); let isLongS = p.sharedData.text && (p.sharedData.text.length > 200 || p.sharedData.text.split('\n').length > 3); let sTxt = `<div class="post-content ${isLongS && !im ? 'collapsed' : ''}" id="stxt_${p.id}" style="font-size:14px;">${sst}</div>`; if(isLongS && !im) sTxt += `<div class="show-more-btn" onclick="document.getElementById('stxt_${p.id}').classList.remove('collapsed'); this.style.display='none'; event.stopPropagation();">عرض المزيد</div>`; pb = `<div class="post-clickable" ${ca}>${pTxt}<div class="shared-post-box" onclick="event.stopPropagation();window.openProfile('${p.sharedData.author}')"><div class="post-user-info" style="margin-bottom:8px;"><img src="${sap}" class="avatar-small"><span class="post-author">${sd} <span style="font-size:11px;color:#64748b;">@${p.sharedData.author}</span></span><span class="post-time" style="margin-right:auto;">${new Date(p.sharedData.timestamp).toLocaleString('ar-EG')}</span></div>${sTxt}${p.sharedData.image ? `<img src="${p.sharedData.image}" class="post-media">` : ''}${p.sharedData.video ? `<video src="${p.sharedData.video}" class="post-media" controls poster="${videoPoster}" style="background:#1e293b;"></video>` : ''}</div></div>`; } else { pb = `<div class="post-clickable" ${ca}>${pTxt}${p.image ? `<img src="${p.image}" class="post-media">` : ''}${p.video ? `<video src="${p.video}" class="post-media" controls playsinline poster="${videoPoster}" style="background:#1e293b;"></video>` : ''}</div>`; }
    
    let cmh = '';
    if(p.comments && typeof p.comments === 'object') {
        let ca = Object.entries(p.comments).map(([id,val]) => ({id,...val})).sort((a,b) => a.timestamp - b.timestamp), cs = im ? ca : ca.slice(-2);
        cs.forEach(c => { let cPic = window.allUsersData[c.author]?.profilePic || dA, cD = window.getDisplayName(c.author), sct = window.formatMentions(c.text), rh = ''; if(c.replies && typeof c.replies === 'object') { Object.values(c.replies).sort((a,b) => a.timestamp - b.timestamp).forEach(r => { let rPic = window.allUsersData[r.author]?.profilePic || dA, rD = window.getDisplayName(r.author), srt = window.formatMentions(r.text), srb = im ? `<span class="reply-btn" onclick="window.prepareReply('${c.id}','${r.author}')" style="margin-top:4px;display:inline-block;margin-right:5px;">رد</span>` : ''; rh += `<div class="comment reply-block" style="margin-bottom:8px;"><img src="${rPic}" class="avatar-small" style="width:24px;height:24px;cursor:pointer;" onclick="event.stopPropagation();window.openProfile('${r.author}')"><div style="flex:1;"><div class="comment-text-box" style="background:#fff;border:1px solid #e2e8f0;margin-bottom:2px;padding:8px 12px;"><div class="comment-author" onclick="event.stopPropagation();window.openProfile('${r.author}')">${rD}</div><div>${srt}</div></div>${srb}</div></div>`; }); } let rb = im ? `<span class="reply-btn" onclick="window.prepareReply('${c.id}','${c.author}')">رد</span>` : ''; cmh += `<div class="comment"><img src="${cPic}" class="avatar-small" style="width:28px;height:28px;cursor:pointer;" onclick="event.stopPropagation();window.openProfile('${c.author}')"><div style="flex:1;"><div class="comment-text-box"><div class="comment-author" onclick="event.stopPropagation();window.openProfile('${c.author}')">${cD}</div><div>${sct}</div></div>${rb}<div id="replies_${c.id}">${rh}</div></div></div>`; });
        if(!im && ca.length > 2) cmh += `<div style="font-size:13px;color:#64748b;cursor:pointer;font-weight:700;margin-top:5px;text-align:center;padding:5px;background:#f1f5f9;border-radius:8px;" onclick="window.openPostModal('${p.id}')">عرض كل التعليقات (${ca.length})</div>`;
    }
    let cia = im ? '' : `<div class="comment-input-area"><img src="${window.allUsersData[window.currentUser]?.profilePic || dA}" class="avatar-small" style="width:32px;height:32px;"><input type="text" oninput="window.handleMentionInput(this)" id="commentInp_${cp}_${p.id}" class="comment-input" placeholder="اكتب تعليقاً..." onkeypress="if(event.key==='Enter') window.addComment('${p.id}','${p.author}','${cp}')"><button class="btn-primary" style="padding:8px 15px;border-radius:20px;" onclick="window.addComment('${p.id}','${p.author}','${cp}')"><i class="fas fa-paper-plane"></i></button></div>`;
    let admC = (window.currentUser && window.currentUser.toLowerCase() === 'admin21') ? `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #cbd5e1;display:flex;gap:10px;justify-content:flex-end;"><button onclick="window.warnUser('${p.author}')" style="background:#f59e0b;color:#fff;border:0;padding:5px 12px;border-radius:6px;cursor:pointer;font-weight:bold;font-family:inherit;font-size:12px;"><i class="fas fa-exclamation-triangle"></i> تحذير</button><button onclick="window.adminDeletePost('${p.id}')" style="background:#ef4444;color:#fff;border:0;padding:5px 12px;border-radius:6px;cursor:pointer;font-weight:bold;font-family:inherit;font-size:12px;"><i class="fas fa-trash"></i> حذف إداري</button></div>` : '';
    return `<div class="post"><div class="post-header"><div class="post-user-info" onclick="window.openProfile('${p.author}')"><img src="${ap}" class="avatar-small"><div style="display:flex;align-items:center;flex-wrap:wrap;"><span class="post-author">${ad} ${ah} ${abg}</span>${af}${tbg}<span class="post-time" style="width:100%;margin-top:3px;">${dt}</span></div></div>${ch}</div>${pb}<div class="post-actions-bar"><button class="action-btn" onclick="window.toggleLike('${p.id}','${p.author}',this)"><i class="${hl?'fas':'far'} fa-heart" style="${hl ? 'color:#ef4444;' : 'color:#64748b;'}"></i> <span class="lc-count">${lt}</span></button><button class="action-btn" onclick="${im ? `$('modalCommentInput').focus()` : `window.openPostModal('${p.id}')`}"><i class="far fa-comment-alt"></i> تعليق</button><button class="action-btn" onclick="window.openShareModal('${p.id}')"><i class="fas fa-share"></i> مشاركة</button></div><div class="comments-section" id="modalCommentsSection">${cmh}${cia}</div>${admC}</div>`;
}

function renderFeed() {
    let h='', sg=window.getSuggestions?window.getSuggestions():[], iN=window.myFriends.length===0, vp=[], reg=[], tr=[];
    let myInterests = window.allUsersData[window.currentUser]?.interests || [];

    window.allPosts.forEach(p => { 
        if(!window.renderedPostIds.has(p.id)) return; 
        let im = p.author === window.currentUser;
        let ifR = window.myFriends.includes(p.author);
        let lc = p.likes ? Object.keys(p.likes).length : 0;
        let it = lc >= 10; 
        let isBot = window.allUsersData[p.author]?.isBot;
        let authorCat = window.allUsersData[p.author]?.category;
        
        let isMatch = true;
        if (myInterests.length > 0 && isBot) {
            if (authorCat && !myInterests.includes(authorCat)) {
                isMatch = false;
            }
        }

        if(iN){ 
            if(im || (it && isMatch)) vp.push({p:p, it:it}); 
        } else { 
            if(im || ifR) reg.push({p:p, it:it}); 
            else if(it && isMatch) tr.push({p:p, it:true}); 
        } 
    });
    
    if(!iN){ let t_i = 0; for(let i=0; i<reg.length; i++){ vp.push(reg[i]); if((i+1)%10===0 && t_i<tr.length){ vp.push(tr[t_i]); t_i++; } } }
    vp.slice(0, window.feedLim || 5).forEach((v,i) => { 
        h += createPostHTML(v.p, 'feed', v.it, false); 
        if((i+1)%4===0 && sg.length>0) h += createSuggestedFriendsWidget(); 
        if(i>0 && i%5===0) h += window.generateReelsWidgetHTML(); 
    });
    let pf = document.getElementById('postsFeed');
    if(pf) {
        pf.innerHTML = h || '<p style="text-align:center;color:#666;padding:20px;">قم بإضافة أصدقاء أو انتظر المنشورات الرائجة.</p>'; 
        document.querySelectorAll('#postsFeed video').forEach(v => window.videoObserver.observe(v));
    }
}

window.toggleLike = (id, htmlAuthor, btn) => {
    let r = ref(db, `posts/${id}/likes/${window.currentUser}`); 
    get(r).then(s => { 
        if(s.exists()){ 
            remove(r); 
            if(btn){ let i=btn.querySelector('i'); if(i) { i.className='far fa-heart'; i.style.color='#64748b'; } let sp=btn.querySelector('.lc-count'); if(sp && !isNaN(parseInt(sp.innerText))) sp.innerText = parseInt(sp.innerText)-1; }
        } else { 
            set(r, true).then(() => { 
                if(btn){ let i=btn.querySelector('i'); if(i) { i.className='fas fa-heart'; i.style.color='#ef4444'; } let sp=btn.querySelector('.lc-count'); if(sp && !isNaN(parseInt(sp.innerText))) sp.innerText = parseInt(sp.innerText)+1; }
                let p = window.postCache[id] || window.allPosts.find(x => x.id === id), tg = p ? p.author : htmlAuthor; 
                if(tg && tg !== window.currentUser) push(ref(db, `users/${tg}/notifications`), {type:'like', from:window.currentUser, postId:id, timestamp:Date.now(), read:false}); 
            }); 
        } 
    });
};

window.addComment = async (id, htmlAuthor, px) => {
    let i = $(`commentInp_${px}_${id}`), t = i.value.trim(); if(!t) return;
    let mp = window.allUsersData[window.currentUser]?.profilePic || dA, md = window.getDisplayName(window.currentUser), st = window.formatMentions(t);
    let nh = `<div class="comment"><img src="${mp}" class="avatar-small" style="width:28px;height:28px;"><div class="comment-text-box"><div class="comment-author">${md}</div><div>${st}</div></div></div>`, ia = i.closest('.comment-input-area');
    if(ia) ia.insertAdjacentHTML('beforebegin', nh); i.value = ''; await push(ref(db, `posts/${id}/comments`), {author:window.currentUser, text:t, timestamp:Date.now()});
    let p = window.postCache[id] || window.allPosts.find(x => x.id === id), tg = p ? p.author : htmlAuthor; if(tg && tg !== window.currentUser) push(ref(db, `users/${tg}/notifications`), {type:'comment', from:window.currentUser, postId:id, timestamp:Date.now(), read:false});
    window.myFriends.forEach(f => { if(t.includes('@'+f)) push(ref(db, `users/${f}/notifications`), {type:'mention', from:window.currentUser, postId:id, timestamp:Date.now(), read:false}); }); $('globalMentionBox').style.display = 'none';
};

window.openPostLogic = (id) => {
    let p = window.postCache[id] || window.allPosts.find(x => x.id === id);
    if(p) { window.renderPostModalLogic(p); } else { get(ref(db, `posts/${id}`)).then(s => { if(s.exists()) { let post = s.val(); post.id = id; window.postCache[id] = post; window.renderPostModalLogic(post); } else { alert("عذراً، هذا المنشور غير موجود."); window.history.back(); } }); }
};

window.renderPostModalLogic = (p) => {
    $('modalPostId').value = p.id; $('modalPostAuthor').value = p.author; $('modalReplyToId').value = ""; $('modalCommentInput').placeholder = "تعليق...";
    let lc = p.likes ? Object.keys(p.likes).length : 0, it = lc >= 10;
    $('postModalBody').innerHTML = createPostHTML(p, 'modal', it, true);
    $('postModal').classList.add('show'); document.body.style.overflow = 'hidden';
    document.querySelectorAll('#postModalBody video').forEach(v => window.videoObserver.observe(v));
};

window.prepareReply = (id, a) => { $('modalReplyToId').value = id; let i = $('modalCommentInput'); if(!i.value.includes(`@${a}`)) i.value = `@${a} ` + i.value; i.focus(); };

window.submitModalComment = () => {
    let pid = $('modalPostId').value, pAuthor = $('modalPostAuthor').value, rid = $('modalReplyToId').value, i = $('modalCommentInput'), t = i.value.trim(); if(!t) return;
    let rp = rid ? `posts/${pid}/comments/${rid}/replies` : `posts/${pid}/comments`;
    push(ref(db, rp), {author:window.currentUser, text:t, timestamp:Date.now()}).then(() => { let p = window.postCache[pid] || window.allPosts.find(x => x.id === pid); if(rid) { if(p && p.comments && p.comments[rid]) { let ca = p.comments[rid].author; if(ca && ca !== window.currentUser) push(ref(db, `users/${ca}/notifications`), {type:'reply', from:window.currentUser, postId:pid, timestamp:Date.now(), read:false}); } } else { let tg = p ? p.author : pAuthor; if(tg && tg !== window.currentUser) push(ref(db, `users/${tg}/notifications`), {type:'comment', from:window.currentUser, postId:pid, timestamp:Date.now(), read:false}); } window.myFriends.forEach(f => { if(t.includes('@'+f)) push(ref(db, `users/${f}/notifications`), {type:'mention', from:window.currentUser, postId:pid, timestamp:Date.now(), read:false}); }); });
    i.value = ''; $('modalReplyToId').value = ''; i.placeholder = "تعليق..."; let mb = $('postModalBody'); setTimeout(() => mb.scrollTop = mb.scrollHeight, 100); $('globalMentionBox').style.display = 'none';
};

window.executeShare = () => {
    let id = $('sharePostId').value, c = $('shareCaption').value.trim(), p = window.postCache[id] || window.allPosts.find(x => x.id === id); if(!p) return;
    let oa = p.isShare ? p.sharedData.author : p.author, sd = {author:oa, text:p.isShare?(p.sharedData.text||""):(p.text||""), timestamp:p.isShare?p.sharedData.timestamp:p.timestamp}, ti = p.isShare ? p.sharedData.image : p.image, tv = p.isShare ? p.sharedData.video : p.video; if(ti) sd.image = ti; if(tv) sd.video = tv;
    let nr = push(ref(db, 'posts')); set(nr, {author:window.currentUser, text:c, isShare:true, sharedData:sd, timestamp:Date.now()}).then(() => { if(oa && oa !== window.currentUser) push(ref(db, `users/${oa}/notifications`), {type:'share', from:window.currentUser, postId:nr.key, timestamp:Date.now(), read:false}); window.myFriends.forEach(f => { if(c.includes('@'+f)) push(ref(db, `users/${f}/notifications`), {type:'mention', from:window.currentUser, postId:nr.key, timestamp:Date.now(), read:false}); }); window.location.hash=''; window.goHome(); });
};

window.previewImage = (e) => {
    let f = e.target.files[0];
    if(!f) return;
    let reader = new FileReader();
    reader.onload = (ev) => {
        let preview = document.getElementById('editModalPicPreview');
        let base64Input = document.getElementById('editPicBase64');
        if(preview) preview.src = ev.target.result;
        if(base64Input) base64Input.value = ev.target.result;
    };
    reader.readAsDataURL(f);
};

window.previewMedia = (e, type) => { let f = e.target.files[0]; if(!f) return; if(type === 'video' || type === 'reel') { if(f.size > 50*1024*1024) { alert("الفيديو كبير جداً! الحد الأقصى 50 ميجا."); return; } } window.selectedMediaFile = f; window.selectedMediaType = type; let u = URL.createObjectURL(f), img = $('postImagePreview'), vid = $('postVideoPreview'), cont = $('postMediaPreviewContainer'); cont.style.display = 'block'; if(type === 'image') { img.src = u; img.style.display = 'block'; vid.style.display = 'none'; vid.pause(); } else { vid.src = u; vid.style.display = 'block'; img.style.display = 'none'; } };
window.removeMediaPreview = () => { window.selectedMediaFile = null; window.selectedMediaType = null; $('postMediaPreviewContainer').style.display = 'none'; $('postImagePreview').src = ''; $('postVideoPreview').src = ''; $('postVideoPreview').pause(); };

window.publishPost = async () => {
    let c = $('postContent').value.trim(), f = window.selectedMediaFile, type = window.selectedMediaType; if(!c && f == null) return;
    let bt = $('publishBtn'), ot = bt.innerHTML; bt.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...'; bt.disabled = true;
    try { 
        let url = null; 
        if(f) url = await window.uploadToCloudinary(f, type === 'reel' ? 'video' : type); 
        
        let d = {author:window.currentUser, text:c || (type==='reel'?'ريلز جديد 🎦':''), timestamp:Date.now()}; 
        if(type === 'image') d.image = url; else if(type === 'video' || type === 'reel') d.video = url; 
        if(type === 'reel') d.isReel = true; 
        
        let nr = push(ref(db, 'posts')); await set(nr, d); 
        window.myFriends.forEach(f => { if(c.includes('@'+f)) push(ref(db, `users/${f}/notifications`), {type:'mention', from:window.currentUser, postId:nr.key, timestamp:Date.now(), read:false}); }); 
        
        bt.innerHTML = ot; bt.disabled = false; $('postContent').value = ''; window.removeMediaPreview(); $('globalMentionBox').style.display = 'none'; 
        if(type === 'reel' || type === 'video') alert('تم نشر الفيديو بنجاح وإضافته للريلز!');
    } catch(e) { alert("حدث خطأ أثناء الرفع."); bt.innerHTML = ot; bt.disabled = false; }
};

window.deletePost = (id) => { if(confirm("حذف؟")) { remove(ref(db, `posts/${id}`)); window.location.hash=''; } };
window.editPost = (id) => { let p = window.postCache[id]; if(!p) return; let nt = prompt("تعديل:", p.text || ''); if(nt !== null) update(ref(db, `posts/${id}`), {text:nt.trim()}); };

window.openShareLogic = (id) => {
    let p = window.postCache[id] || window.allPosts.find(x => x.id === id); if(!p) { window.history.back(); return; }
    $('sharePostId').value = id; $('shareCaption').value = '';
    let oa = p.isShare ? p.sharedData.author : p.author, ot = p.isShare ? p.sharedData.text : p.text, oi = p.isShare ? p.sharedData.image : p.image, ov = p.isShare ? p.sharedData.video : p.video, ap = window.allUsersData[oa]?.profilePic || dA, st = window.formatMentions(ot), dn = window.getDisplayName(oa);
    $('sharePreview').innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><img src="${ap}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;"><strong style="font-size:14px;">${dn}</strong></div><div style="font-size:14px;margin-bottom:8px;">${st}</div>${oi ? `<img src="${oi}" style="width:100%;max-height:150px;object-fit:cover;border-radius:8px;">` : ''}${ov ? `<video src="${ov}" style="width:100%;max-height:150px;background:#000;border-radius:8px;"></video>` : ''}`;
    $('shareModal').classList.add('show'); document.body.style.overflow = 'hidden';
};

window.openEditProfileLogic = () => {
    let d = window.allUsersData[window.currentUser] || {};
    $('editModalPicPreview').src = d.profilePic || dA; $('editPicBase64').value = d.profilePic || ''; $('editBio').value = d.bio || ''; $('editLocation').value = d.location || ''; $('editJob').value = d.job || ''; $('editEducation').value = d.education || ''; $('editHobbies').value = d.hobbies || ''; $('editDobProfile').value = d.birthdate || '';
    $('editProfileModal').classList.add('show'); document.body.style.overflow = 'hidden';
};

window.openProfileLogic = (u) => {
    if(!u) { window.history.back(); return; }
    window.switchProfileTab('posts'); let d = window.allUsersData[u] || {};
    $('profPic').src = d.profilePic || dA; $('profName').innerText = window.getDisplayName(u); $('profHandle').innerText = '@' + u; $('profBio').innerText = d.bio || "لا نبذة."; $('profLocText').innerText = d.location || "غير محدد";
    $('profileAboutArea').innerHTML = `<div style="background:#fff;border-radius:12px;padding:20px;border:1px solid var(--border-color);text-align:right;"><h4 style="margin-top:0;color:var(--primary);border-bottom:1px solid #e2e8f0;padding-bottom:10px;">معلومات</h4><div><strong>المدينة:</strong> <br>${d.location||'غير محدد'}</div><div><strong>تاريخ الميلاد:</strong> <br>${d.birthdate||'غير محدد'}</div><div><strong>المهنة:</strong> <br>${d.job||'غير محدد'}</div><div><strong>الدراسة:</strong> <br>${d.education||'غير محدد'}</div><div><strong>الهوايات:</strong> <br>${d.hobbies||'غير محدد'}</div></div>`;
    
    let intArea = $('profInterestsArea');
    if(d.interests && d.interests.length > 0) {
        intArea.style.display = 'flex';
        intArea.innerHTML = d.interests.map(i => `<span style="background:#eef2ff; color:var(--primary); padding:4px 10px; border-radius:12px; font-size:12px; font-weight:700;">${i}</span>`).join('');
    } else { intArea.style.display = 'none'; }

    let ce = $('profCoverImg'); if(d.coverPic) { ce.src = d.coverPic; ce.style.display = 'block'; } else ce.style.display = 'none';
    $('statPosts').innerText = window.allPosts.filter(p => p.author === u && !p.isReel).length; $('statPhotos').innerText = window.allPosts.filter(p => p.author === u && (p.image || p.video) && !p.isReel).length; $('statFriends').innerText = Object.keys(window.allFriendsData[u] || {}).length;
    let ism = (u === window.currentUser), isf = window.myFriends.includes(u), rr = window.currentRequests && window.currentRequests[u], ac = $('profActions');
    if(ism) { $('coverEditBtn').style.display = 'flex'; ac.innerHTML = `<button class="btn-primary" onclick="window.openEditProfileModal()"><i class="fas fa-edit"></i> تعديل</button><button class="btn-secondary" onclick="window.location.hash=''; window.scrollTo({top:0, behavior:'smooth'}); let c = $('postContent'); c.value = 'حساب رائع: @${u} ✨'; c.focus();"><i class="fas fa-share"></i> مشاركة</button>`; }
    else {
        $('coverEditBtn').style.display = 'none'; let sb = `<button class="btn-secondary" onclick="window.location.hash=''; window.scrollTo({top:0, behavior:'smooth'}); let c = $('postContent'); c.value = 'حساب رائع: @${u} ✨'; c.focus();"><i class="fas fa-share"></i> مشاركة</button>`;
        if(isf) ac.innerHTML = `<button class="btn-secondary" style="background:#ef4444;color:#fff;" onclick="window.unfriend('${u}')"><i class="fas fa-user-minus"></i></button><button class="btn-primary" onclick="window.location.hash=''; setTimeout(()=>window.openChat('${u}'),300)"><i class="fas fa-comment-dots"></i> رسالة</button> ${sb}`;
        else if(rr) ac.innerHTML = `<button class="btn-primary" style="background:#10b981;" onclick="window.acceptRequestFromProfile('${u}',this)"><i class="fas fa-check"></i> قبول</button> ${sb}`;
        else if(window.sentRequests && window.sentRequests[u]) ac.innerHTML = `<button class="btn-secondary" onclick="window.cancelFriendRequest('${u}')"><i class="fas fa-user-times"></i> إلغاء</button> ${sb}`;
        else {
            ac.innerHTML = `<button class="btn-secondary" disabled>جاري...</button>`;
            get(ref(db, `friendRequests/${u}/${window.currentUser}`)).then(s => { if($('profHandle').innerText.replace('@', '') === u) { if(s.exists()) { window.sentRequests[u] = true; ac.innerHTML = `<button class="btn-secondary" onclick="window.cancelFriendRequest('${u}')"><i class="fas fa-user-times"></i> إلغاء</button> ${sb}`; } else ac.innerHTML = `<button class="btn-primary" data-action="add" data-target="${u}" onclick="window.sendFriendRequestToFromFeed('${u}',this)"><i class="fas fa-user-plus"></i> إضافة</button> ${sb}`; } }).catch(e => console.log(e));
        }
    }
    $('profileModal').classList.add('show'); document.body.style.overflow = 'hidden'; try { renderProfilePosts(u) } catch(e) {}
};

window.previewCoverImage = async (e) => { let f = e.target.files[0]; if(!f) return; let bt = $('coverEditBtn'), ot = bt.innerHTML; bt.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; try { let url = await window.uploadToCloudinary(f, 'image'); $('profCoverImg').src = url; $('profCoverImg').style.display = 'block'; await update(ref(db, `users/${window.currentUser}`), {coverPic:url}); } catch(err) { alert('فشل الرفع'); } bt.innerHTML = ot; };
window.saveProfile = async () => { let p = $('editPicBase64').value; if(p && p.startsWith('data:')) { let b = $('saveProfileBtn'), ot = b.innerHTML; b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...'; b.disabled = true; try { p = await window.uploadToCloudinary(p, 'image'); } catch(e) { alert('فشل رفع الصورة'); b.innerHTML = ot; b.disabled = false; return; } b.innerHTML = ot; b.disabled = false; } let up = {bio:$('editBio').value.trim(), location:$('editLocation').value.trim(), job:$('editJob').value.trim(), education:$('editEducation').value.trim(), hobbies:$('editHobbies').value.trim(), birthdate:$('editDobProfile').value}; if(p) up.profilePic = p; await update(ref(db, `users/${window.currentUser}`), up); if(p) { $('myNavAvatar').src = p; $('mobileNavAvatar').src = p; } window.location.hash = '#/@' + window.currentUser; };

function renderProfilePosts(u) { 
    let pp = window.allUsersData[u]?.profilePic || dA; 
    $('profilePostsFeed').innerHTML = '<div style="text-align:center;padding:20px;color:var(--primary);"><i class="fas fa-spinner fa-spin fa-2x"></i><br>جاري جلب المنشورات...</div>'; 
    get(query(ref(db, 'posts'), orderByChild('author'), equalTo(u))).then(s => { 
        let h = '', ph = ''; ph += `<img src="${pp}" style="cursor:pointer;" onclick="window.open('${pp}','_blank')">`; 
        if(s.exists()) { 
            let userPosts = []; s.forEach(c => { let p = c.val(); p.id = c.key; userPosts.push(p); window.postCache[p.id] = p; }); 
            userPosts.sort((a,b) => b.timestamp - a.timestamp); 
            userPosts.forEach(p => { 
                if(!p.isReel) {
                    let lc = p.likes ? Object.keys(p.likes).length : 0, it = lc >= 10; 
                    h += createPostHTML(p, 'profile', it, false); 
                    if(p.image) ph += `<img src="${p.image}" style="cursor:pointer;" onclick="window.open('${p.image}','_blank')">`; 
                    if(p.video) ph += `<video src="${p.video}" style="cursor:pointer;" onclick="window.open('${p.video}','_blank')"></video>`;
                }
            }); 
        } 
        $('profilePostsFeed').innerHTML = h || '<p style="text-align:center;color:#666;font-size:13px;">لا مقالات.</p>'; 
        $('profilePhotosGrid').innerHTML = ph; document.querySelectorAll('#profilePostsFeed video').forEach(v => window.videoObserver.observe(v)); 
    }).catch(e => { $('profilePostsFeed').innerHTML = '<p style="text-align:center;color:#ef4444;">حدث خطأ في جلب المنشورات.</p>'; }); 
    
    let rh = ''; let userReels = window.allReels.filter(r => r.author === u);
    if(userReels.length > 0) {
        userReels.forEach(r => {
            let globalIdx = window.allReels.findIndex(x => x.id === r.id);
            let vc = r.views ? Object.keys(r.views).length : 0;
            rh += `<div class="reel-thumb" style="width:100%; height:180px;" onclick="window.openReelsViewer(${globalIdx})"><video src="${r.video}" autoplay loop muted playsinline preload="auto" poster="${reelPoster}" style="pointer-events:none; background:#1e293b; object-fit:cover;"></video><span class="r-views"><i class="fas fa-play"></i> ${vc}</span></div>`;
        });
    }
    $('profileReelsGrid').innerHTML = rh || '<p style="text-align:center;color:#666;grid-column:span 3;">لا يوجد ريلز لهذا الحساب.</p>';

    get(ref(db, `friends/${u}`)).then(s => { let fh = ''; if(s.exists()) { Object.keys(s.val()).forEach(f => { let pic = window.allUsersData[f]?.profilePic || dA, dn = window.getDisplayName(f), mc = 0; if(f !== window.currentUser) { let tf = window.allFriendsData[f] ? Object.keys(window.allFriendsData[f]) : []; mc = tf.filter(x => window.myFriends.includes(x)).length; } let mt = f === window.currentUser ? '' : (mc > 0 ? `<span class="f-mutual"><i class="fas fa-user-friends"></i> ${mc} مشتركون</span>` : `<span class="f-mutual">لا مشتركون</span>`); fh += `<div class="friend-card" onclick="window.openProfile('${f}')"><img src="${pic}"><div style="display:flex;flex-direction:column;justify-content:center;"><span class="f-name">${dn}</span>${mt}</div></div>`; }); } $('profileFriendsList').innerHTML = fh || '<p style="text-align:center;color:#666;font-size:13px;grid-column:span 2;">لا أصدقاء.</p>'; }); 
}

window.sendFriendRequestToFromFeed = (t, b) => { if(t === window.currentUser) return; window.sentRequests[t] = true; document.querySelectorAll(`button[data-action="add"][data-target="${t}"]`).forEach(x => { x.innerHTML = `<i class="fas fa-clock"></i> أرسل`; x.style.background = "#e2e8f0"; x.style.color = "#0f172a"; x.disabled = true; }); if(b && !b.hasAttribute('data-target')) { b.innerHTML = `<i class="fas fa-clock"></i> أرسل`; b.style.background = "#e2e8f0"; b.style.color = "#0f172a"; b.disabled = true; } set(ref(db, `friendRequests/${t}/${window.currentUser}`), Date.now()).then(() => push(ref(db, `users/${t}/notifications`), {type:'friend_req', from:window.currentUser, timestamp:Date.now(), read:false})); };
window.cancelFriendRequest = (t) => { delete window.sentRequests[t]; remove(ref(db, `friendRequests/${t}/${window.currentUser}`)).then(() => window.openProfile(t)); };
window.acceptRequestFromProfile = (t, b) => { if(b) { b.innerHTML = `<i class="fas fa-user-friends"></i> تم القبول`; b.style.background = "#e2e8f0"; b.style.color = "#0f172a"; b.disabled = true; } let up = {}; up[`friends/${window.currentUser}/${t}`] = true; up[`friends/${t}/${window.currentUser}`] = true; update(ref(db), up).then(() => { remove(ref(db, `friendRequests/${window.currentUser}/${t}`)); push(ref(db, `users/${t}/notifications`), {type:'accept_req', from:window.currentUser, timestamp:Date.now(), read:false}); }); };
window.acceptRequestFromFeed = (t) => { let up = {}; up[`friends/${window.currentUser}/${t}`] = true; up[`friends/${t}/${window.currentUser}`] = true; update(ref(db), up).then(() => { remove(ref(db, `friendRequests/${window.currentUser}/${t}`)); push(ref(db, `users/${t}/notifications`), {type:'accept_req', from:window.currentUser, timestamp:Date.now(), read:false}); }); };
window.acceptRequest = (s) => { let up = {}; up[`friends/${window.currentUser}/${s}`] = true; up[`friends/${s}/${window.currentUser}`] = true; update(ref(db), up).then(() => { remove(ref(db, `friendRequests/${window.currentUser}/${s}`)); push(ref(db, `users/${s}/notifications`), {type:'accept_req', from:window.currentUser, timestamp:Date.now(), read:false}); }); };
window.rejectRequest = (s) => remove(ref(db, `friendRequests/${window.currentUser}/${s}`));
window.unfriend = (t) => { if(confirm(`حذف الصداقة؟`)) { let up = {}; up[`friends/${window.currentUser}/${t}`] = null; up[`friends/${t}/${window.currentUser}`] = null; update(ref(db), up).then(() => window.openProfile(t)); } };

window.openRequestsLogic = () => { window.renderSuggestedUsersModal(); $('requestsModal').classList.add('show'); document.body.style.overflow = 'hidden'; };
window.openStatsLogic = () => { $('statsModal').classList.add('show'); document.body.style.overflow = 'hidden'; get(ref(db, 'users')).then(us => { let r=0, b=0, o=0; if(us.exists()) { let v = us.val(); for(let k in v) { if(v[k].isBot) b++; else r++; if(v[k].online) o++; } } $('statReal').innerText = r; $('statBots').innerText = b; $('statOnline').innerText = o; }); get(ref(db, 'posts')).then(ps => { $('statPosts').innerText = ps.exists() ? Object.keys(ps.val()).length : 0; }); };

// ترتيب الطلبات
function renderRequests() { 
    let c = 0, h = ''; 
    let reqArr = Object.entries(window.currentRequests||{}).map(([k,v]) => ({id:k, time: v===true ? 0 : v})).sort((a,b) => b.time - a.time);
    
    for(let req of reqArr) { 
        let s = req.id;
        c++; 
        h += `<div class="req-row"><div style="display:flex;align-items:center;gap:8px;" onclick="window.openProfile('${s}')"><img src="${window.allUsersData[s]?.profilePic || dA}" class="avatar-small"><strong>${window.getDisplayName(s)}</strong></div><div class="req-actions"><button class="btn-accept" onclick="window.acceptRequest('${s}')"><i class="fas fa-check"></i></button><button class="btn-reject" onclick="window.rejectRequest('${s}')"><i class="fas fa-times"></i></button></div></div>`; 
    } 
    let b1 = $('reqBadge'), b2 = $('reqBadgeMobile'); if(c > 0) { b1.style.display = 'inline-block'; b1.innerText = c; b2.style.display = 'inline-block'; b2.innerText = c; } else { b1.style.display = 'none'; b2.style.display = 'none'; h = '<p style="color:#666;text-align:center;">لا طلبات.</p>'; } $('requestsList').innerHTML = h; window.renderSidebarTop(); 
}
function listenToFriendRequests() { onValue(ref(db, `friendRequests/${window.currentUser}`), s => { window.currentRequests = s.exists() ? s.val() : {}; renderRequests(); }); }

function renderSidebarUsers() { let fh = '', fa = [], rh = '', ra = []; window.myFriends.forEach(f => { if(window.allUsersData[f]) fa.push({name:f, time:window.recentChatsData[f] || 0, uc:window.unreadChatsData[f] || 0, d:window.allUsersData[f]}); }); let cu = new Set([...Object.keys(window.recentChatsData || {}), ...Object.keys(window.unreadChatsData || {})]); cu.forEach(c => { if(!window.myFriends.includes(c) && c !== window.currentUser && window.allUsersData[c]) ra.push({name:c, time:window.recentChatsData[c] || 0, uc:window.unreadChatsData[c] || 0, d:window.allUsersData[c]}); }); fa.sort((a,b) => b.time - a.time); fa.forEach(f => { fh += `<div class="user-row"><div class="user-info" onclick="window.openProfile('${f.name}')"><img src="${f.d.profilePic||dA}" class="avatar-small"><span>${window.getDisplayName(f.name)}</span></div><div style="display:flex;align-items:center;gap:10px;">${f.uc>0?`<span class="unread-msg-badge">${f.uc}</span>`:''}<button class="btn-primary" style="padding:4px 10px;font-size:12px;border-radius:4px;" onclick="event.stopPropagation();window.openChat('${f.name}')"><i class="fas fa-comment-dots"></i></button><span class="status-dot ${f.d.online?'online':'offline'}"></span></div></div>`; }); $('friendsList').innerHTML = fh || '<span style="color:#888;font-size:13px;">لا أصدقاء</span>'; ra.sort((a,b) => b.time - a.time); ra.forEach(r => { rh += `<div class="user-row" style="background:#fffbeb;border:1px solid #fde68a;"><div class="user-info" onclick="window.openProfile('${r.name}')"><img src="${r.d.profilePic||dA}" class="avatar-small"><span>${window.getDisplayName(r.name)}</span></div><div style="display:flex;align-items:center;gap:10px;">${r.uc>0?`<span class="unread-msg-badge">${r.uc}</span>`:''}<button class="btn-primary" style="background:#f59e0b;padding:4px 10px;font-size:12px;border-radius:4px;" onclick="event.stopPropagation();window.openChat('${r.name}')"><i class="fas fa-comment-dots"></i></button></div></div>`; }); let h = $('msgRequestsHeader'); if(ra.length > 0) { h.style.display = 'block'; $('msgRequestsList').innerHTML = rh; } else { h.style.display = 'none'; $('msgRequestsList').innerHTML = ''; } }

window.getSuggestions = () => { 
    let myInterests = window.allUsersData[window.currentUser]?.interests || [];
    let ml = window.allUsersData[window.currentUser]?.location || "غير محدد", sg = []; 
    for(let u in window.allUsersData) { 
        if(u === window.currentUser || window.myFriends.includes(u)) continue; 
        let d = window.allUsersData[u]; 
        
        let matchingInterests = 0;
        if (d.category && myInterests.includes(d.category)) matchingInterests += 5; 
        if (d.interests) { d.interests.forEach(i => { if(myInterests.includes(i)) matchingInterests++; }); }
        
        if(d.type && d.type !== 'user') { sg.push({name:u, data:d, mutualCount:matchingInterests, isSameLocation:false, isPage:true}); continue; } 
        let tf = Object.keys(window.allFriendsData[u] || {}), mc = tf.filter(f => window.myFriends.includes(f)).length, isl = (d.location && d.location === ml && ml !== "غير محدد"); 
        
        sg.push({name:u, data:d, mutualCount:(mc + matchingInterests), isSameLocation:isl, isPage:false, matchesInt: matchingInterests>0}); 
    } 
    sg.sort((a,b) => { 
        if(b.mutualCount !== a.mutualCount) return b.mutualCount - a.mutualCount; 
        if(b.isSameLocation && !a.isSameLocation) return 1; if(!b.isSameLocation && a.isSameLocation) return -1; 
        if(a.isPage && !b.isPage) return 1; if(!a.isPage && b.isPage) return -1; return 0; 
    }); 
    return sg; 
};
function createSuggestedFriendsWidget() { let s = window.getSuggestions().slice(0,10); if(s.length === 0) return ''; let ch = ''; s.forEach(x => { let rr = window.currentRequests && window.currentRequests[x.name], b = ''; if(window.sentRequests && window.sentRequests[x.name]) b = `<button disabled style="background:#e2e8f0;color:#0f172a;"><i class="fas fa-clock"></i> أرسل</button>`; else if(rr) b = `<button style="background:#10b981;color:white;" onclick="event.stopPropagation();window.acceptRequestFromFeed('${x.name}')"><i class="fas fa-check"></i> قبول</button>`; else b = `<button data-action="add" data-target="${x.name}" onclick="event.stopPropagation();window.sendFriendRequestToFromFeed('${x.name}',this)"><i class="fas fa-user-plus"></i> إضافة</button>`; ch += `<div class="suggested-card" onclick="window.openProfile('${x.name}')"><img src="${x.data.profilePic||dA}"><span class="s-name">${window.getDisplayName(x.name)}</span><span class="s-mutual"><i class="fas ${x.matchesInt ? 'fa-magic' : (x.isPage?'fa-check-circle':'fa-user-friends')}"></i> ${x.matchesInt ? 'نفس اهتماماتك' : (x.isPage?'صفحة رسمية':(x.mutualCount>0?`مشتركون: ${x.mutualCount}`:(x.isSameLocation?'من منطقتك':'عضو جديد')))}</span>${b}</div>`; }); return `<div class="suggested-widget"><h4><i class="fas fa-users"></i> مقترحات</h4><div class="suggested-carousel">${ch}</div></div>`; }

// ======================== الخوارزمية وتفاعل البوتات ========================
function initAndRunBots() {
    get(ref(db, 'botsInitialized_v135')).then(s => {
        if(!s.exists()) {
            get(ref(db, 'users')).then(us => {
                let u = {};
                window.botAccounts.forEach((b) => { 
                    u[`users/${b.name}/displayName`] = b.displayName; 
                    u[`users/${b.name}/profilePic`] = b.pic; 
                    u[`users/${b.name}/coverPic`] = b.cover; 
                    u[`users/${b.name}/bio`] = `خبير ومهتم بمجال: ${b.category} ✨`; 
                    u[`users/${b.name}/password`] = "bot_password"; 
                    u[`users/${b.name}/online`] = true; 
                    u[`users/${b.name}/isBot`] = true; 
                    u[`users/${b.name}/type`] = "user"; 
                    u[`users/${b.name}/category`] = b.category; 
                    u[`users/${b.name}/location`] = b.location; 
                });
                u['botsInitialized_v135'] = true; update(ref(db), u);
            });
        }
    });
    
    // خوارزمية طلبات الصداقة الذكية (كل دقيقتين)
    setInterval(() => {
        if(!window.currentUser || !window.allUsersData[window.currentUser]) return;
        let myInterests = window.allUsersData[window.currentUser].interests || [];
        if(myInterests.length === 0) return;

        let matchingBots = [];
        for (let key in window.allUsersData) {
            let u = window.allUsersData[key];
            if (u.isBot && u.category && myInterests.includes(u.category)) {
                matchingBots.push(key);
            }
        }
        if (matchingBots.length === 0) return;
        
        let randomBotId = matchingBots[Math.floor(Math.random() * matchingBots.length)];

        if(!window.myFriends.includes(randomBotId) && (!window.currentRequests || !window.currentRequests[randomBotId]) && (!window.sentRequests || !window.sentRequests[randomBotId])) { 
            set(ref(db, `friendRequests/${window.currentUser}/${randomBotId}`), Date.now()).then(() => { 
                push(ref(db, `users/${window.currentUser}/notifications`), {type:'friend_req', from:randomBotId, timestamp:Date.now(), read:false}); 
            }); 
        }
    }, 120000); 

    // جلب أخبار حقيقية 100% من وكالة أخبار سكاي نيوز (كل دقيقتين)
    setInterval(() => {
        if(!window.currentUser || !window.allUsersData[window.currentUser]) return;
        let lastRunRef = ref(db, 'botStats/lastTextPostRun');
        get(lastRunRef).then(s => {
            let lastTime = s.exists() ? s.val() : 0, now = Date.now();
            if(now - lastTime > 120000) {  // نشر كل دقيقتين
                set(lastRunRef, now); 
                
                let myInterests = window.allUsersData[window.currentUser].interests || PLATFORM_INTERESTS;
                let activeBots = [];
                for (let key in window.allUsersData) {
                    let u = window.allUsersData[key];
                    if (u.isBot && u.category && myInterests.includes(u.category)) activeBots.push(key);
                }
                
                if(activeBots.length > 0) {
                    let randomBotId = activeBots[Math.floor(Math.random()*activeBots.length)];
                    let botCat = window.allUsersData[randomBotId].category;
                    
                    // روابط وكالات الأخبار الحقيقية الموزعة حسب المجال
                    let rssFeeds = {
                        "أخبار وسياسة": "https://www.skynewsarabia.com/rss.xml",
                        "رياضة وكرة قدم": "https://www.skynewsarabia.com/rss.xml?category=sport",
                        "تكنولوجيا وتقنية": "https://www.skynewsarabia.com/rss.xml?category=technology",
                        "صحة وطب": "https://www.skynewsarabia.com/rss.xml?category=health",
                        "اقتصاد وأعمال": "https://www.skynewsarabia.com/rss.xml?category=business",
                        "سفر وسياحة": "https://www.skynewsarabia.com/rss.xml?category=lifestyle",
                        "فنون وتصميم": "https://www.skynewsarabia.com/rss.xml?category=arts"
                    };
                    
                    let feedUrl = rssFeeds[botCat] || "https://www.skynewsarabia.com/rss.xml";
                    
                    // جلب الأخبار بالصور الحقيقية
                    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`)
                    .then(r => r.json())
                    .then(data => {
                        if(data && data.items && data.items.length > 0) {
                            let item = data.items[Math.floor(Math.random() * Math.min(10, data.items.length))];
                            let cleanDesc = item.description.replace(/(<([^>]+)>)/gi, "").substring(0, 180) + "...";
                            let text = `🔴 أخبار عاجلة: ${item.title}\n\n${cleanDesc}\n\nللمزيد من الأخبار، تابعوني!`;
                            let imgUrl = item.enclosure?.link || item.thumbnail || `https://source.unsplash.com/600x400/?${encodeURIComponent(botCat.split(' ')[0])}`;
                            
                            push(ref(db, 'posts'), {author:randomBotId, text:text, image:imgUrl, timestamp:Date.now()});
                        }
                    }).catch(e => { console.log("RSS Fetch Error"); });
                }
            }
        });
    }, 120000);

    // تفاعل البوتات على المنشورات لضمان حيوية المنصة
    setInterval(() => {
        if(!window.currentUser) return;
        let botAccountsList = [];
        for (let key in window.allUsersData) {
            if (window.allUsersData[key].isBot) botAccountsList.push(key);
        }
        if(botAccountsList.length === 0) return;
        let randomBot = botAccountsList[Math.floor(Math.random()*botAccountsList.length)];
        
        if(window.allPosts && window.allPosts.length > 0) {
            let mediaPosts = window.allPosts.filter(p => p.video || p.isReel);
            let pool = mediaPosts.length > 0 && Math.random() > 0.3 ? mediaPosts : window.allPosts;
            let randomPost = pool[Math.floor(Math.random() * pool.length)];
            
            set(ref(db, `posts/${randomPost.id}/likes/${randomBot}`), true);
            if(randomPost.video || randomPost.isReel) { set(ref(db, `posts/${randomPost.id}/views/${randomBot}`), true); }
            
            if(Math.random() < 0.20) {
                let comments = [];
                if(randomPost.video || randomPost.isReel) comments = ["فيديو عظمة 🔥", "تصوير رائع 👏", "استمر في الإبداع", "ريلز جامد جداً ✨"];
                else if (randomPost.image) comments = ["صورة جميلة جداً 😍", "اللقطة دي روعة", "إبداع متواصل 🎨"];
                else comments = ["كلام سليم 100%", "أتفق معك تماماً 👍", "مقال مفيد جداً، شكراً للمشاركة!"];
                
                let cText = comments[Math.floor(Math.random()*comments.length)];
                push(ref(db, `posts/${randomPost.id}/comments`), {author:randomBot, text:cText, timestamp:Date.now()});
            }
        }
    }, 45000); 
}
