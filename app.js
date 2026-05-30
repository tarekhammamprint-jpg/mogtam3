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

// -- متغيرات منع التكرار --
window.usersListenerActive = false;
window.privateListenersStarted = false;

window.activeMentionInput = null;
window.previousUnreadChats = {};
window.isChatBoxVisible = false;
window.selectedMediaFile = null;
window.selectedMediaType = null;
window.getDisplayName = (id) => window.allUsersData[id]?.displayName || id;
window.getDisplayHandle = (id) => '@' + id;
window.allReels = [];
let reelsObserver = null;

const PLATFORM_INTERESTS = [
    "أخبار وسياسة", "رياضة وكرة قدم", "طبخ ووصفات", "دين وإسلاميات", 
    "تكنولوجيا وتقنية", "سيارات ومحركات", "كوميديا ومقالب", "صحة وطب", 
    "فنون وتصميم", "تعليم وثقافة", "موضة وتجميل", "سفر وسياحة", 
    "ألعاب فيديو", "تاريخ وحضارات", "علوم وطبيعة", "اقتصاد وأعمال", 
    "عقارات واستثمار", "أدب وشعر", "تنمية بشرية", "حيوانات أليفة"
];
window.selectedInterests = new Set();

const arabNames = ["أحمد", "محمد", "محمود", "خالد", "علي", "حسن", "عمر", "طارق", "يوسف", "كريم", "سارة", "ندى", "منى", "نور", "مريم", "ياسين", "مصطفى", "وليد", "ماجد", "رامي"];
const engNames = ["ahmed", "mohamed", "mahmoud", "khaled", "ali", "hassan", "omar", "tarek", "yousef", "kareem", "sara", "nada", "mona", "nour", "mariam", "yassin", "mostafa", "waleed", "majed", "rami"];

if(!window.botAccounts || window.botAccounts.length === 0) {
    window.botAccounts = [];
    for(let i=1; i<=60; i++) {
        let cat = PLATFORM_INTERESTS[i % PLATFORM_INTERESTS.length];
        let n1 = i % arabNames.length;
        let n2 = (i + 5) % arabNames.length;
        let dName = arabNames[n1] + " " + arabNames[n2]; 
        let hName = engNames[n1] + "_" + Math.floor(Math.random()*999+100); 
        
        window.botAccounts.push({
            name: hName,
            displayName: dName,
            pic: `https://ui-avatars.com/api/?name=${encodeURIComponent(dName)}&background=random&color=fff&size=150`,
            cover: "",
            location: "مصر",
            category: cat,
            type: "user"
        });
    }
}

// دالة التحميل مضاف إليها زر المجتمع
window.addEventListener('load', () => {
    const communityBtn = document.getElementById("openCommunityBtn");
    if(communityBtn){
        communityBtn.onclick = function(){
            alert("زر المجتمع يعمل الآن!");
            // يمكنك إضافة كود فتح نافذة المجتمع هنا مستقبلاً
        };
    }
    
    setTimeout(() => {
        let il = document.getElementById('initialLoader');
        if (il && il.style.display !== 'none') {
            il.classList.add('hidden');
            setTimeout(() => il.style.display = 'none', 400);
        }
    }, 4000);
});

window.addEventListener('hashchange', handleRouting);

// النظام الذكي لروابط المنشورات وتسجيل الدخول
function handleRouting() {
    let hash = window.location.hash;
    document.querySelectorAll('.modal').forEach(m => {
        if(m.id !== 'interestsModal') m.classList.remove('show');
    });
    document.querySelectorAll('#reelsScrollArea video').forEach(v => { v.pause(); });
    document.body.style.overflow = 'auto'; 
    
    let lw = $('loginModal');
    let isPublicPage = hash.startsWith('#/post/') || hash.startsWith('#/@');
    
    // التحكم الذكي في شاشة الدخول وأزرار الإغلاق للزوار
    if (hash === '#/login' || (!window.currentUser && (hash === '' || hash === '#/'))) {
        if(lw) {
            let s = document.getElementById('hideLoginStyle'); if(s) s.remove();
            lw.style.display = 'flex';
            setTimeout(() => { lw.style.opacity = '1'; lw.style.pointerEvents = 'auto'; }, 10);
        }
        let closeBtn = document.getElementById('loginModalCloseBtn');
        if(closeBtn) closeBtn.style.display = 'none'; // إخفاء الـ X في الصفحة الرئيسية
        let guestBtn = document.getElementById('guestBrowseBtn');
        if(guestBtn) guestBtn.style.display = 'none';
        
        window.toggleLoginMode('login');
    } else {
        if(lw) {
            lw.style.opacity = '0';
            lw.style.pointerEvents = 'none';
            if (isPublicPage) lw.style.display = 'none'; // إخفاء فوري للبروفايل لمنع وميض شاشة الدخول
            setTimeout(() => { if(window.location.hash !== '#/login' && window.location.hash !== '') lw.style.display = 'none'; }, 400);
        }
    }

    // منع الزوار من دخول اليوميات تماماً وتوجيههم لصفحة الدخول
    if(hash === '' || hash === '#/') { 
        if(!window.currentUser) {
            window.location.replace('#/login');
            return;
        }
        window.scrollTo({top:0, behavior:'smooth'}); 
    } 
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

// توجيهات الزوار الآمنة
window.openRequestsModal = () => { if(!window.currentUser) return window.showRegisterModal(); window.location.hash = '#/requests'; };
window.openAdminStats = () => { window.location.hash = '#/stats'; };
window.openEditProfileModal = () => { window.location.hash = '#/edit-profile'; };
window.openReelsViewer = (idx) => { if(!window.currentUser) return window.showRegisterModal(); window.currentReelIdx = idx; window.location.hash = '#/reels'; };

window.closeModal = (id) => { 
    if(window.history.length > 2) { window.history.back(); } 
    else { window.location.hash = ''; }
};
window.closeReelsViewer = window.closeModal;

window.goHome = () => {
    if(!window.currentUser) {
        window.location.replace('#/login');
        return;
    }
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

// دالة إظهار نافذة التسجيل عند تفاعل الزوار مع المنشورات
window.showRegisterModal = () => { 
    let s = document.getElementById('hideLoginStyle'); if(s) s.remove();
    let lw = document.getElementById('loginModal');
    if(lw) {
        lw.style.display = 'flex';
        setTimeout(() => { lw.style.opacity = '1'; lw.style.pointerEvents = 'auto'; }, 10);
    }
    let closeBtn = document.getElementById('loginModalCloseBtn');
    if(closeBtn) closeBtn.style.display = 'flex'; // إظهار الـ X لأنه فوق منشور
    let guestBtn = document.getElementById('guestBrowseBtn');
    if(guestBtn) guestBtn.style.display = 'block';
    
    window.toggleLoginMode('register'); 
};

// الإغلاق الذكي لشاشة الدخول دون تصفير الرابط (يرجعك مكان ما كنت)
window.closeRegisterModal = () => { 
    let lw = $('loginModal');
    if(lw) {
        lw.style.opacity = '0';
        lw.style.pointerEvents = 'none';
        setTimeout(() => { lw.style.display = 'none'; }, 400);
    }
};

window.topLogin = () => {
    let u = $('topLoginUser').value.trim(); if(u.startsWith('@')) u = u.substring(1);
    let p = $('topLoginPass').value.trim();
    if(!u || !p) return alert("أدخل البيانات!");
    get(ref(db, `users/${u}`)).then(s => {
        if(s.exists()){ if(s.val().password === p) { fL(u, s.val()); } else alert("خطأ بالمرور!"); } else alert("غير موجود.");
    }).catch(() => alert("رُفض الاتصال."));
};

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
            h += `<div class="user-row"><a href="#/@${s}" class="user-info" style="color:inherit; text-decoration:none;"><img src="${p}" class="avatar-small"><span>${d}</span></a><div style="display:flex;gap:5px;"><button class="btn-primary" style="background:#10b981;padding:4px 10px;border-radius:6px;" onclick="window.acceptRequest('${s}')"><i class="fas fa-check"></i></button><button class="btn-secondary" style="padding:4px 10px;border-radius:6px;" onclick="window.rejectRequest('${s}')"><i class="fas fa-times"></i></button></div></div>`; 
        } 
    } else { 
        let sg = window.getSuggestions ? window.getSuggestions().filter(x => !window.sentRequests[x.name]) : [], t3 = sg.slice(0,3); 
        if(t3.length > 0) { 
            h += `<div class="sidebar-title" style="color:var(--secondary);"><em class="fas fa-user-plus"></em> مقترحون</div>`; 
            t3.forEach(s => { 
                let p = s.data.profilePic || dA, d = window.getDisplayName(s.name); 
                h += `<div class="user-row"><a href="#/@${s.name}" class="user-info" style="color:inherit; text-decoration:none;"><img src="${p}" class="avatar-small"><span>${d}</span></a><button class="btn-primary" style="padding:4px 10px;font-size:12px;border-radius:6px;" onclick="event.stopPropagation();window.sendFriendRequestToFromFeed('${s.name}',this)"><i class="fas fa-user-plus"></i></button></div>`; 
            }); 
        } 
    } 
    let c = $('sidebarTopSection'); if(c) c.innerHTML = h; 
};
window.renderSidebarTop = renderSidebarTop;

const eRE = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
window.formatMentions = (t) => { if(!t) return ''; let s = t.replace(/</g, "&lt;").replace(/>/g, "&gt;"); if(window.myFriends) { window.myFriends.forEach(f => { s = s.replace(new RegExp('@'+eRE(f)+'(?=\\s|$)', 'g'), `<a href="#/@${f}" style="color:var(--primary);cursor:pointer;background:#eef2ff;padding:2px 5px;border-radius:4px;text-decoration:none;" onclick="event.stopPropagation();">@${f}</a>`); }); } return s; };
window.handleMentionInput = (e) => { window.activeMentionInput = e; let v = e.value, c = e.selectionStart, tb = v.substring(0,c), la = tb.lastIndexOf('@'), mb = $('globalMentionBox'); if(la !== -1 && (la === 0 || tb[la-1] === ' ')) { let q = tb.substring(la+1), m = window.myFriends.filter(f => f.toLowerCase().includes(q.toLowerCase()) || window.getDisplayName(f).toLowerCase().includes(q.toLowerCase())); if(m.length > 0) { let h = ''; m.forEach(x => { h += `<div class="mention-item" onclick="window.insertMention('${x}')"><img src="${window.allUsersData[x]?.profilePic||dA}"> <span>${window.getDisplayName(x)} (@${x})</span></div>`; }); mb.innerHTML = h; mb.style.display = 'block'; let r = e.getBoundingClientRect(); mb.style.left = r.left + 'px'; mb.style.top = (r.top - mb.offsetHeight - 5) + 'px'; if(r.top < mb.offsetHeight) mb.style.top = (r.bottom + 5) + 'px'; } else mb.style.display = 'none'; } else mb.style.display = 'none'; };
window.insertMention = (f) => { let e = window.activeMentionInput; if(!e) return; let v = e.value, c = e.selectionStart, tb = v.substring(0,c), la = tb.lastIndexOf('@'), ta = v.substring(c); if(la !== -1) { let n = v.substring(0,la) + '@' + f + ' '; e.value = n + ta; e.focus(); e.selectionStart = e.selectionEnd = n.length; } $('globalMentionBox').style.display = 'none'; };

document.addEventListener('click', (e) => { if(!e.target || typeof e.target.closest !== 'function') return; if(!e.target.closest('#globalMentionBox') && !e.target.classList.contains('comment-input') && !e.target.classList.contains('composer-input')) { $('globalMentionBox').style.display = 'none'; } if(!e.target.closest('.search-container')) { $('searchResults').style.display = 'none'; } if(!e.target.closest('.notif-container')) { $('notifDropdown').style.display = 'none'; } if(!e.target.closest('.nav-user-container') && !e.target.closest('.b-nav-item')) { let u = $('userMenuDropdown'), m = $('mobileUserMenuDropdown'); if(u) u.style.display = 'none'; if(m) m.style.display = 'none'; } });
window.toggleDropdown = (id) => { let e = $(id); if(!e) return; let d = e.style.display === 'block'; ['notifDropdown','userMenuDropdown','mobileUserMenuDropdown'].forEach(x => { let el=$(x); if(el) el.style.display='none'; }); if(!d) e.style.display = 'block'; };
window.toggleSidebar = () => { let s = $('sidebarArea'); window.innerWidth <= 768 ? s.classList.toggle('mobile-show') : s.classList.toggle('hidden'); };
window.switchProfileTab = (t) => { ['posts','reels','photos','friends','about'].forEach(x => { let e = $('tab-'+x), b = $('btnTab'+x.charAt(0).toUpperCase()+x.slice(1)); if(e) e.style.display = 'none'; if(b) b.classList.remove('active'); }); $('tab-'+t).style.display = 'block'; $('btnTab'+t.charAt(0).toUpperCase()+t.slice(1)).classList.add('active'); };
window.handleGlobalSearch = (q) => { let r = $('searchResults'); if(!q.trim()){ r.style.display='none'; return; } let h=''; for(let u in window.allUsersData) { let d = window.getDisplayName(u); if(d.toLowerCase().includes(q.toLowerCase()) || u.toLowerCase().includes(q.toLowerCase())) { h += `<a href="#/@${u}" class="search-result-item" onclick="$('searchResults').style.display='none'; $('globalSearch').value='';" style="text-decoration:none; color:inherit;"><img src="${window.allUsersData[u].profilePic||dA}" class="avatar-small"> <div style="display:flex;flex-direction:column;line-height:1.2;"><span>${d}</span><span style="font-size:11px;color:#64748b;">@${u}</span></div></a>`; } } r.innerHTML = h || '<div style="padding:10px;text-align:center;color:#666;">لا توجد نتائج</div>'; r.style.display='block'; };
window.searchChatUsers = (q) => { let r=$('chatSearchBox'), f=$('friendsList'), rh=$('msgRequestsHeader'), rl=$('msgRequestsList'); if(!q.trim()){ r.style.display='none'; f.style.display='block'; if(rl&&rl.innerHTML!==''){ rh.style.display='block'; rl.style.display='block'; } return; } f.style.display='none'; rh.style.display='none'; rl.style.display='none'; let h=''; for(let u in window.allUsersData){ if(u===window.currentUser) continue; let d = window.getDisplayName(u); if(d.toLowerCase().includes(q.toLowerCase()) || u.toLowerCase().includes(q.toLowerCase())){ h += `<div class="user-row" onclick="window.openChat('${u}')"><div class="user-info"><img src="${window.allUsersData[u].profilePic||dA}" class="avatar-small"><span>${d}</span></div><button class="btn-primary" style="padding:4px 10px;font-size:12px;border-radius:4px;"><i class="fas fa-comment-dots"></i></button></div>`; } } r.innerHTML = h || '<div style="padding:10px;text-align:center;color:#64748b;font-size:14px;">لا توجد نتائج</div>'; r.style.display='block'; };

// -- الحل الجذري لتسجيل الخروج لمنع تداخل الجلسات والتهنيج --
window.logoutUser = () => { 
    if(window.currentUser && confirm("تسجيل الخروج؟")) { 
        let user = window.currentUser;
        set(ref(db, `users/${user}/online`), false).then(() => { 
            localStorage.removeItem('savedUser'); 
            window.location.replace(window.location.pathname + '#/login'); 
            window.location.reload(); 
        }).catch(() => {
            localStorage.removeItem('savedUser'); 
            window.location.replace(window.location.pathname + '#/login'); 
            window.location.reload(); 
        }); 
    } 
};

window.renderSuggestedUsersModal = () => { 
    let s = window.getSuggestions ? window.getSuggestions().slice(0,15) : [], h=''; 
    if(s.length===0) h='<p style="text-align:center;color:#666;font-size:14px;padding:20px;">لا يوجد مقترحات حالياً (تظهر فقط للأصدقاء المشتركين أو المقربين).</p>'; 
    else s.forEach(x => { 
        let p=x.data.profilePic||dA, d=window.getDisplayName(x.name), st=x.mutualCount>0?`مشتركون: ${x.mutualCount}`:'من منطقتك', rr = window.currentRequests && window.currentRequests[x.name], b=''; 
        if(window.sentRequests && window.sentRequests[x.name]) b=`<button class="btn-secondary" disabled style="padding:6px 12px;font-size:13px;"><i class="fas fa-clock"></i> أرسل</button>`; 
        else if(rr) b=`<button class="btn-primary" style="background:#10b981;padding:6px 12px;font-size:13px;" onclick="event.stopPropagation();window.acceptRequestFromFeed('${x.name}')"><i class="fas fa-check"></i> قبول</button>`; 
        else b=`<button class="btn-primary" data-action="add" data-target="${x.name}" style="padding:6px 12px;font-size:13px;" onclick="event.stopPropagation();window.sendFriendRequestToFromFeed('${x.name}',this)"><i class="fas fa-user-plus"></i> إضافة</button>`; 
        h += `<div class="req-row"><a href="#/@${x.name}" style="display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;"><img src="${p}" class="avatar-small"><div style="display:flex;flex-direction:column;cursor:pointer;"><strong style="font-size:15px;color:var(--text-main);text-align:right;">${d}</strong><span style="font-size:12px;color:var(--text-muted);text-align:right;">${st}</span></div></a><div class="req-actions">${b}</div></div>`; 
    }); 
    let u = $('usersList'); if(u) u.innerHTML=h; 
};

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

// تم إيقاف المكنسة
function wipeAllBotVideosForever() {}

function fL(u, d) { 
    window.isInitialNotifLoad = true; window.alertedNotifs = new Set(); window.currentUser = u; localStorage.setItem('savedUser', u); 
    let il = $('initialLoader'); if(il){ il.classList.add('hidden'); setTimeout(()=>il.style.display='none', 400); } 
    let lw = $('loginModal'); if(lw){ lw.style.opacity='0'; lw.style.pointerEvents='none'; setTimeout(()=>lw.style.display='none', 400); } 
    
    let guestNav = $('guestNav'); if(guestNav) guestNav.style.display = 'none';
    let loggedInNav = $('loggedInNav'); if(loggedInNav) loggedInNav.style.display = 'flex';
    let cb = $('composerBox'); if(cb) cb.style.display = 'block';
    let sidebarAreaContainer = $('sidebarAreaContainer'); if(sidebarAreaContainer) sidebarAreaContainer.style.display = 'block';
    let bottomNav = $('bottomNav'); if(bottomNav) bottomNav.style.display = '';

    let n = d.displayName || u; $('currentUserDisplay').innerText = n; let p = d.profilePic || dA; 
    ['myNavAvatar','composerAvatar','myShareAvatar','mobileNavAvatar','modalMyPic'].forEach(x=>{ if($(x)) $(x).src=p; }); 
    let ab = $('adminBtn'); if(ab){ ab.style.display = (u.toLowerCase()==='admin21') ? 'flex' : 'none'; } 
    let oRef = ref(db, `users/${u}/online`); set(oRef, true); onDisconnect(oRef).set(false); 
    if(!d.interests || d.interests.length === 0) { setTimeout(window.renderInterestsModal, 1000); }
    
    // تشغيل مستمعي النظام بأمان تام
    if(!window.usersListenerActive) {
        window.usersListenerActive = true;
        listenToUsers();
    }
    window.startPrivateListeners();

    // إجبار إعادة تحديث الواجهة واليوميات في حال تسجيل دخول حساب ثاني
    if(!window.isInitialLoad) {
        window.renderedPostIds = new Set(window.allPosts.map(p=>p.id));
        window.feedLim = 5;
        renderFeed();
        handleRouting();
    }
}

if(window.currentUser){ 
    let b=$('loginBtn'); if(b){ b.innerText="جاري..."; b.disabled=true; } 
    get(ref(db, `users/${window.currentUser}`)).then(s => { 
        if(s.exists()){ fL(window.currentUser, s.val()); } else rU(); 
    }).catch(rU); 
} else {
    rU();
}

function rU(){ 
    window.isInitialNotifLoad=true; window.alertedNotifs=new Set(); localStorage.removeItem('savedUser'); window.currentUser=null; 
    let b=$('loginBtn'); if(b){ b.innerText="دخول"; b.disabled=false; } 
    
    let hash = window.location.hash;
    let isPublicPage = hash.startsWith('#/post/') || hash.startsWith('#/@');

    // لا تقم بإزالة الستايل المخفي إذا كنا في صفحة عامة (بروفايل أو منشور) لمنع وميض شاشة الدخول
    if(!isPublicPage) {
        let s=$('hideLoginStyle'); if(s) s.remove();
    }
    
    let l=$('initialLoader'); if(l) l.style.display='none'; 
    let ab=$('adminBtn'); if(ab) ab.style.display='none'; 
    
    let lw = $('loginModal');
    // إخفاء تام وسريع لشاشة الدخول إذا كان الرابط بروفايل أو منشور
    if(lw && isPublicPage) { 
        lw.style.opacity = '0'; 
        lw.style.pointerEvents = 'none'; 
        lw.style.display = 'none'; 
    }

    let guestNav = $('guestNav'); if(guestNav) guestNav.style.display = 'flex';
    let loggedInNav = $('loggedInNav'); if(loggedInNav) loggedInNav.style.display = 'none';
    let cb = $('composerBox'); if(cb) cb.style.display = 'none';
    let sidebarAreaContainer = $('sidebarAreaContainer'); if(sidebarAreaContainer) sidebarAreaContainer.style.display = 'none';
    let bottomNav = $('bottomNav'); if(bottomNav) bottomNav.style.display = 'none';

    // توجيه إجباري للزوار لصفحة الدخول فقط في الصفحة الرئيسية
    if(hash === '' || hash === '#/') {
        window.location.replace('#/login');
    }

    if(!window.usersListenerActive) {
        window.usersListenerActive = true;
        listenToUsers();
    }
}

// -- فصل الاستماع لبيانات المستخدمين ليكون أكثر أماناً --
function listenToUsers(){ 
    onValue(ref(db,'users'), s => { 
        if(s.exists()){ 
            window.allUsersData = s.val(); 
            if(window.isInitialLoad){ 
                listenToPosts(); 
            }
            if(window.currentUser){ 
                renderSidebarUsers(); renderRequests(); window.renderSidebarTop(); 
            } 
        } 
    }); 
}

// -- إطلاق المستمعات الخاصة للمستخدم فقط حين تسجيل الدخول --
window.startPrivateListeners = () => {
    if(window.privateListenersStarted) return;
    window.privateListenersStarted = true;
    listenToAllFriends();
    listenToFriendRequests();
    listenToNotifications();
    listenToUnreadChats();
    listenToRecentChats();
    initAndRunBots();
    setTimeout(window.checkFriendsBirthdays, 3000);
};

function listenToAllFriends(){ onValue(ref(db,'friends'), s => { window.allFriendsData = s.exists() ? s.val() : {}; window.myFriends = window.allFriendsData[window.currentUser] ? Object.keys(window.allFriendsData[window.currentUser]) : []; renderSidebarUsers(); if(!window.isInitialLoad){ window.feedLim=5; renderFeed(); } }); }
function listenToUnreadChats(){ onValue(ref(db,`users/${window.currentUser}/unreadChats`), s => { window.unreadChatsData = s.exists() ? s.val() : {}; let t=0; if(window.currentChatTarget && window.isChatBoxVisible && window.unreadChatsData[window.currentChatTarget]){ remove(ref(db,`users/${window.currentUser}/unreadChats/${window.currentChatTarget}`)); delete window.unreadChatsData[window.currentChatTarget]; } for(let x in window.unreadChatsData){ let c = window.unreadChatsData[x], p = window.previousUnreadChats[x]||0; t+=c; if(c>p && x!==window.currentChatTarget) window.showToast("رسالة جديدة", `أرسل ${window.getDisplayName(x)} رسالة`, window.allUsersData[x]?.profilePic); } window.previousUnreadChats = {...window.unreadChatsData}; let b1=$('chatBadge'), b2=$('chatBadgeMobile'); if(t>0){ b1.style.display='inline-block'; b1.innerText=t; b2.style.display='inline-block'; b2.innerText=t; } else { b1.style.display='none'; b2.style.display='none'; } renderSidebarUsers(); }); }
function listenToRecentChats(){ onValue(ref(db,`users/${window.currentUser}/recentChats`), s => { window.recentChatsData = s.exists() ? s.val() : {}; renderSidebarUsers(); }); }

window.renderReelsTopBar = () => { 
    let topBar = $('reelsTopBar'); if(!topBar) return; 
    if(!window.currentUser) { topBar.style.display = 'none'; return; }
    let h = `<label class="reel-add-btn" style="margin:0;"><i class="fas fa-plus"></i> إنشاء ريل<input type="file" style="display:none;" accept="video/*" onchange="window.previewMedia(event, 'reel'); window.scrollTo({top:0, behavior:'smooth'});"></label>`; 
    let visibleReels = window.allReels.filter(r => window.currentUser ? (r.author === window.currentUser || window.myFriends.includes(r.author) || (window.allUsersData[r.author] && !window.allUsersData[r.author].isBot)) : false); 
    visibleReels.forEach((r) => { 
        let ap = window.allUsersData[r.author]?.profilePic || dA, an = window.getDisplayName(r.author); 
        let vc = r.views ? Object.keys(r.views).length : 0; 
        let globalIdx = window.allReels.findIndex(x => x.id === r.id); 
        h += `<div class="reel-thumb" onclick="window.openReelsViewer(${globalIdx})"><video src="${r.video}" autoplay loop muted playsinline preload="auto" poster="${reelPoster}" style="pointer-events:none; background:#1e293b; object-fit:cover;"></video><img src="${ap}" class="r-author-pic"><span class="r-author-name">${an}</span><span class="r-views"><i class="fas fa-play"></i> ${vc}</span></div>`; 
    }); 
    topBar.innerHTML = h; topBar.style.display = 'flex'; 
};

window.generateReelsWidgetHTML = () => { 
    if(!window.currentUser) return '';
    let visibleReels = window.allReels.filter(r => window.currentUser ? (r.author === window.currentUser || window.myFriends.includes(r.author) || (window.allUsersData[r.author] && !window.allUsersData[r.author].isBot)) : false).slice(0,10); 
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
    if(!window.currentUser) {
        window.location.replace('#/login'); return;
    }
    let modal = $('reelsViewerModal'), scrollArea = $('reelsScrollArea'), h = ''; 
    window.allReels.forEach(r => { 
        let ap = window.allUsersData[r.author]?.profilePic || dA, an = window.getDisplayName(r.author); 
        let lc = r.likes ? Object.keys(r.likes).length : 0; 
        let myLike = window.currentUser && r.likes && r.likes[window.currentUser] ? 'color:#ef4444;' : 'color:#fff;'; 
        h += `<div class="reel-screen" data-id="${r.id}"><video src="${r.video}" loop playsinline preload="auto" poster="${reelPoster}" style="background:#1e293b;"></video><div class="reel-overlay"></div><div class="reel-side-actions"><button class="reel-action-btn" onclick="window.toggleLike('${r.id}', '${r.author}', this)"><i class="fas fa-heart" style="${myLike}"></i><span class="lc-count">${lc}</span></button><button class="reel-action-btn" onclick="window.closeReelsViewer(); window.openPostModal('${r.id}')"><i class="fas fa-comment-dots"></i><span>تعليق</span></button><button class="reel-action-btn" onclick="window.closeReelsViewer(); window.openShareModal('${r.id}')"><i class="fas fa-share"></i><span>مشاركة</span></button></div><div class="reel-info"><a href="#/@${r.author}" class="r-author-hdr" style="color:inherit; text-decoration:none;"><img src="${ap}"><h4>${an}</h4></a><p>${r.text||'ريلز مجتمعنا'}</p></div></div>`; 
    }); 
    scrollArea.innerHTML = h; modal.classList.add('show'); document.body.style.overflow = 'hidden'; scrollArea.querySelectorAll('.reel-screen').forEach(scr => reelsObserver.observe(scr)); setTimeout(() => { let target = scrollArea.children[startIndex]; if(target) target.scrollIntoView({behavior:'auto'}); }, 100); 
};

window.openChatFromProfile = () => { if(!window.currentUser) return window.showRegisterModal(); let t = $('profHandle').innerText.replace('@', ''); window.location.hash=''; setTimeout(() => window.openChat(t), 300); };

window.openChat = (t) => {
    if(!window.currentUser) return window.showRegisterModal();
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
            window.renderedPostIds = new Set(l.map(p=>p.id)); 
            if(window.currentUser) renderFeed(); 
            window.isInitialLoad=false; 
            handleRouting();
        } else { 
            let hash = window.location.hash; 
            if(hash.startsWith('#/post/')){ let up = window.postCache[decodeURIComponent(hash.replace('#/post/', ''))]; if(up) window.openPostLogic(up.id); } 
            let nc = l.filter(p=>!window.renderedPostIds.has(p.id)).length, mp = l.some(p=>p.author===window.currentUser&&!window.renderedPostIds.has(p.id)); 
            if(mp){ window.renderedPostIds = new Set(l.map(p=>p.id)); if(window.currentUser) renderFeed(); $('newPostsBtn').style.display='none'; } 
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
    if(window.currentUser && !ism && !window.myFriends.includes(p.author)) { let rr = window.currentRequests && window.currentRequests[p.author]; if(window.sentRequests && window.sentRequests[p.author]) af = `<button class="btn-primary" style="padding:2px 10px;font-size:11px;border-radius:6px;margin-right:10px;background:#e2e8f0;color:#0f172a;" disabled><i class="fas fa-clock"></i> تم</button>`; else if(rr) af = `<button class="btn-primary" style="padding:2px 10px;font-size:11px;border-radius:6px;margin-right:10px;background:#10b981;" onclick="event.stopPropagation();window.acceptRequestFromFeed('${p.author}')"><i class="fas fa-check"></i> قبول</button>`; else af = `<button class="btn-primary" data-action="add" data-target="${p.author}" style="padding:2px 10px;font-size:11px;border-radius:6px;margin-right:10px;" onclick="event.stopPropagation();window.sendFriendRequestToFromFeed('${p.author}',this)"><i class="fas fa-user-plus"></i> إضافة</button>`; }
    let tbg = it ? `<span style="background:#ff9800;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;margin-right:10px;font-weight:bold;"><i class="fas fa-fire"></i> رائج</span>` : '', ch = ism ? `<div class="post-controls"><button onclick="event.stopPropagation();window.editPost('${p.id}')"><i class="fas fa-edit"></i></button><button onclick="event.stopPropagation();window.deletePost('${p.id}')"><i class="fas fa-trash"></i></button></div>` : '';
    let hl = window.currentUser ? (p.likes && p.likes[window.currentUser]) : false, hi = hl ? '<i class="fas fa-heart" style="color:#ef4444;"></i>' : '<i class="far fa-heart" style="color:#64748b;"></i>', lc = p.likes ? Object.keys(p.likes).length : 0, lt = lc > 0 ? `<span style="font-size:14px;margin-right:5px;color:#64748b;">${lc}</span>` : `<span style="font-size:14px;margin-right:5px;color:#64748b;">إعجاب</span>`;
    let st = window.formatMentions(p.text), pb = '', ca = im ? '' : `onclick="window.openPostModal('${p.id}')"`;
    let isLongP = p.text && (p.text.length > 200 || p.text.split('\n').length > 3);
    let pTxt = `<div class="post-content ${isLongP && !im ? 'collapsed' : ''}" id="ptxt_${p.id}">${st}</div>`; if(isLongP && !im) pTxt += `<div class="show-more-btn" onclick="document.getElementById('ptxt_${p.id}').classList.remove('collapsed'); this.style.display='none'; event.stopPropagation();">عرض المزيد</div>`;
    
    let headerLeft = `
    <div style="display:flex; gap:10px; align-items:center;">
        <a href="#/@${p.author}"><img src="${ap}" class="avatar-small"></a>
        <div style="display:flex; flex-direction:column; line-height:1.2;">
            <div style="display:flex; align-items:center; flex-wrap:wrap; gap:5px;">
                <a href="#/@${p.author}" class="post-author" style="color:inherit; text-decoration:none;">${ad}</a>
                ${ah} ${abg} ${af} ${tbg}
            </div>
            <a href="#/post/${p.id}" class="post-time" style="color:inherit; text-decoration:none; margin-top:3px;">${dt}</a>
        </div>
    </div>`;

    if(p.isShare && p.sharedData) { let sap = window.allUsersData[p.sharedData.author]?.profilePic || dA, sst = window.formatMentions(p.sharedData.text), sd = window.getDisplayName(p.sharedData.author); let isLongS = p.sharedData.text && (p.sharedData.text.length > 200 || p.sharedData.text.split('\n').length > 3); let sTxt = `<div class="post-content ${isLongS && !im ? 'collapsed' : ''}" id="stxt_${p.id}" style="font-size:14px;">${sst}</div>`; if(isLongS && !im) sTxt += `<div class="show-more-btn" onclick="document.getElementById('stxt_${p.id}').classList.remove('collapsed'); this.style.display='none'; event.stopPropagation();">عرض المزيد</div>`; pb = `<div class="post-clickable" ${ca}>${pTxt}<div class="shared-post-box" onclick="event.stopPropagation();window.openProfile('${p.sharedData.author}')"><div class="post-header" style="margin-bottom:8px;"><a href="#/@${p.sharedData.author}"><img src="${sap}" class="avatar-small"></a><div style="display:flex; flex-direction:column; line-height:1.2; margin-right:8px;"><a href="#/@${p.sharedData.author}" class="post-author" style="color:inherit; text-decoration:none;">${sd} <span style="font-size:11px;color:#64748b;">@${p.sharedData.author}</span></a><span class="post-time">${new Date(p.sharedData.timestamp).toLocaleString('ar-EG')}</span></div></div>${sTxt}${p.sharedData.image ? `<img src="${p.sharedData.image}" class="post-media">` : ''}${p.sharedData.video ? `<video src="${p.sharedData.video}" class="post-media" controls poster="${videoPoster}" style="background:#1e293b;"></video>` : ''}</div></div>`; } else { pb = `<div class="post-clickable" ${ca}>${pTxt}${p.image ? `<img src="${p.image}" class="post-media">` : ''}${p.video ? `<video src="${p.video}" class="post-media" controls playsinline poster="${videoPoster}" style="background:#1e293b;"></video>` : ''}</div>`; }
    
    let cmh = '';
    if(p.comments && typeof p.comments === 'object') {
        let ca = Object.entries(p.comments).map(([id,val]) => ({id,...val})).sort((a,b) => a.timestamp - b.timestamp), cs = im ? ca : ca.slice(-2);
        cs.forEach(c => { let cPic = window.allUsersData[c.author]?.profilePic || dA, cD = window.getDisplayName(c.author), sct = window.formatMentions(c.text), rh = ''; if(c.replies && typeof c.replies === 'object') { Object.values(c.replies).sort((a,b) => a.timestamp - b.timestamp).forEach(r => { let rPic = window.allUsersData[r.author]?.profilePic || dA, rD = window.getDisplayName(r.author), srt = window.formatMentions(r.text), srb = im ? `<span class="reply-btn" onclick="window.prepareReply('${c.id}','${r.author}')" style="margin-top:4px;display:inline-block;margin-right:5px;">رد</span>` : ''; rh += `<div class="comment reply-block" style="margin-bottom:8px;"><a href="#/@${r.author}"><img src="${rPic}" class="avatar-small" style="width:24px;height:24px;"></a><div style="flex:1;"><div class="comment-text-box" style="background:#fff;border:1px solid #e2e8f0;margin-bottom:2px;padding:8px 12px;"><a href="#/@${r.author}" class="comment-author" style="color:inherit; text-decoration:none; display:block;">${rD}</a><div>${srt}</div></div>${srb}</div></div>`; }); } let rb = im ? `<span class="reply-btn" onclick="window.prepareReply('${c.id}','${c.author}')">رد</span>` : ''; cmh += `<div class="comment"><a href="#/@${c.author}"><img src="${cPic}" class="avatar-small" style="width:28px;height:28px;"></a><div style="flex:1;"><div class="comment-text-box"><a href="#/@${c.author}" class="comment-author" style="color:inherit; text-decoration:none; display:block;">${cD}</a><div>${sct}</div></div>${rb}<div id="replies_${c.id}">${rh}</div></div></div>`; });
        if(!im && ca.length > 2) cmh += `<div style="font-size:13px;color:#64748b;cursor:pointer;font-weight:700;margin-top:5px;text-align:center;padding:5px;background:#f1f5f9;border-radius:8px;" onclick="window.openPostModal('${p.id}')">عرض كل التعليقات (${ca.length})</div>`;
    }
    let cia = (!window.currentUser) ? '' : `<div class="comment-input-area"><img src="${window.allUsersData[window.currentUser]?.profilePic || dA}" class="avatar-small" style="width:32px;height:32px;"><input type="text" oninput="window.handleMentionInput(this)" id="commentInp_${cp}_${p.id}" class="comment-input" placeholder="اكتب تعليقاً..." onkeypress="if(event.key==='Enter') window.addComment('${p.id}','${p.author}','${cp}')"><button class="btn-primary" style="padding:8px 15px;border-radius:20px;"
