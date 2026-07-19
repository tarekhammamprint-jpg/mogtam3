import { ref, set, get, update, push, remove, onValue, query, orderByChild, limitToLast, equalTo, onDisconnect } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";
import "./auth.js";
import "./communities.js";
import "./chat.js";
import "./video-call.js";
import "./feed.js";
import "./composer.js";
import "./notifications.js";
import "./profile.js";
import "./sidebar.js";
import "./reels.js";
import "./admin.js";

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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDialogSystem);
} else {
  initDialogSystem();
}
window.CLOUDINARY_CLOUD_NAME = "diwaqfsap";
window.CLOUDINARY_UPLOAD_PRESET = "ml_default";
window.currentUser = localStorage.getItem('savedUser') || null;
window.currentChatTarget = null;
window.allUsersData = {};
window.allFriendsData = {};
window.myFriends = [];
window.allPosts = [];
window.postCache = {};
window.renderedPostIds = new Set();
window.activeAds = [];
window.isInitialLoad = true;
window.currentRequests = {};
window.sentRequests = {};
window.feedLim = 5;
window.usersListenerActive = false;
window.privateListenersStarted = false;
window.allCommunities = {};
window.currentCommunityId = null;
window.currentCommunitySearchQuery = "";
window.activeMentionInput = null;
window.previousUnreadChats = {};
window.isChatBoxVisible = false;
window.getDisplayName = (id) => window.allUsersData[id]?.displayName || id;
window.getDisplayHandle = (id) => '@' + id;
const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const videoPoster = "https://placehold.co/600x400/1e293b/ffffff?text=Video+Loading...";
const $ = (id) => document.getElementById(id);
window.addEventListener('load', () => { setTimeout(() => { let il = $('initialLoader'); if (il && il.style.display !== 'none') { il.classList.add('hidden'); setTimeout(() => il.style.display = 'none', 400); } }, 4000); });
window.addEventListener('hashchange', window.handleRouting);
window.lastNonCommunityHash = '';
window.generateCommunitySlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^\u0621-\u064A\u0660-\u0669a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
};
window.findCommunityBySlug = (slug) => {
    for (let [id, comm] of Object.entries(window.allCommunities || {})) {
        let commSlug = window.generateCommunitySlug(comm.name);
        if (commSlug === slug) {
            return { id, ...comm };
        }
    }
    return null;
};
window.shareCommunityLink = (commId) => {
    let comm = window.allCommunities[commId];
    if (!comm) return;
    let slug = window.generateCommunitySlug(comm.name);
    let url = window.location.origin + window.location.pathname + '#/community/' + slug;
    
    navigator.clipboard.writeText(url).then(() => {
        if (window.showToast) window.showToast('تم نسخ الرابط', 'يمكنك مشاركة رابط المجتمع الآن', '');
    }).catch(() => {
        if (window.dlgAlert) window.dlgAlert('رابط المجتمع: ' + url, 'info', 'شارك الرابط');
    });
};
window.openCommunitiesModalDirect = () => {
    let modal = document.getElementById('communitiesModal');
    if (!modal) return;
    
    document.querySelectorAll('.modal').forEach(m => {
        m.classList.remove('show');
    });
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    if (typeof window.renderCommunitiesList === 'function') {
        window.renderCommunitiesList();
    }
};
window.openCommunityViewDirect = (commId) => {
    let comm = window.allCommunities[commId];
    if (!comm) return;
    
    let modal = document.getElementById('communityViewModal');
    if (!modal) return;
    
    document.getElementById('communityViewTitle').innerText = comm.name;
    document.getElementById('communityViewDesc').innerText = comm.description || '';
    
    let isAdmin = comm.admin === window.currentUser;
    let actionsHtml = `<button class="btn-secondary" onclick="window.viewCommunityMembers('${commId}')" style="margin-left:8px;"><i class="fas fa-users"></i> الأعضاء</button>`;
    if (isAdmin) {
        actionsHtml += `<button class="btn-primary" onclick="window.manageCommunityRequests('${commId}')" style="background:#f59e0b; border-color:#f59e0b; margin-left:8px;"><i class="fas fa-user-plus"></i> الطلبات</button>`;
    }
    actionsHtml += `<button class="btn-secondary" style="background:#10b981; color:#fff;" onclick="window.shareCommunityLink('${commId}')"><i class="fas fa-share-alt"></i> مشاركة</button>`;
    
    let actCont = document.getElementById('communityHeaderActions');
    if (actCont) actCont.innerHTML = actionsHtml;
    
    let communitiesModal = document.getElementById('communitiesModal');
    if (communitiesModal) communitiesModal.classList.remove('show');
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    if (typeof window.renderCommunityFeed === 'function') {
        window.renderCommunityFeed(commId);
    }
};
function handleRouting() {
    let hash = window.location.hash;

    // إغلاق نافذة البروفايل المحسّنة قبل أي توجيه آخر لمنع تعارض الطبقات (z-index)
    // هذا يحل مشكلة عدم عمل اللايك/التعليق/أزرار النافبار عند فتح صفحة أخرى من داخل البروفايل
    if (!hash.startsWith('#/@')) {
        let pme = document.getElementById('profileModalEnhanced');
        if (pme) {
            pme.classList.remove('show');
            pme.remove();
            if (!hash.startsWith('#/post/')) document.body.style.overflow = 'auto';
        }
    }
    
    // تتبع آخر صفحة ليست مجتمع
    if (!hash.startsWith('#/community/') && hash !== '#/communities') {
        window.lastNonCommunityHash = hash;
    }
    
    // معالج صفحة المجتمع
    if (hash.startsWith('#/community/')) {
        let slug = decodeURIComponent(hash.replace('#/community/', ''));
        let community = window.findCommunityBySlug(slug);
        if (community) {
            document.querySelectorAll('.modal').forEach(m => {
                m.classList.remove('show');
            });
            document.body.style.overflow = 'hidden';
            window.currentCommunityId = community.id;
            window.openCommunityViewDirect(community.id);
            return;
        } else {
            if (window.dlgAlert) window.dlgAlert('المجتمع غير موجود', 'warning', 'عذراً');
            window.location.hash = '#/communities';
            return;
        }
    }
    
    // معالج صفحة قائمة المجتمعات
    if (hash === '#/communities') {
        window.openCommunitiesModalDirect();
        return;
    }
    
    // معالج صفحة تسجيل الدخول
    let lw = $('loginModal');
    let isPublicPage = hash.startsWith('#/post/') || hash.startsWith('#/@');
    if (window.currentUser && hash === '#/login') {
        window.location.replace('#/');
        return;
    }
    if (hash === '#/login' || (!window.currentUser && (hash === '' || hash === '#'))) { 
        if(lw) { 
            let s = $('hideLoginStyle'); 
            if(s) s.remove(); 
            lw.style.display = 'flex'; 
            setTimeout(() => { 
                lw.style.opacity = '1'; 
                lw.style.pointerEvents = 'auto'; 
            }, 10); 
        } 
        let cb = $('loginModalCloseBtn'); 
        if(cb) cb.style.display = 'none'; 
        let gb = $('guestBrowseBtn'); 
        if(gb) gb.style.display = 'none'; 
        window.toggleLoginMode('login'); 
    } else { 
        if(lw) { 
            lw.style.opacity = '0'; 
            lw.style.pointerEvents = 'none'; 
            if (isPublicPage) lw.style.display = 'none'; 
            setTimeout(() => { 
                if(window.location.hash !== '#/login' && window.location.hash !== '') 
                    lw.style.display = 'none'; 
            }, 400); 
        } 
    }
    
    if(hash === '' || hash === '#/') { 
        if(!window.currentUser) return window.location.replace('#/login'); 
        window.scrollTo({top:0, behavior:'smooth'}); 
    } 
    else if(hash.startsWith('#/@')) {
        let user = decodeURIComponent(hash.replace('#/@', ''));
        if (window.openProfileLogic) window.openProfileLogic(user);
    }
    else if(hash.startsWith('#/post/')) {
        let postId = decodeURIComponent(hash.replace('#/post/', ''));
        if (window.openPostLogic) window.openPostLogic(postId);
    }
    // share يُعالج الآن مباشرة بدون hash
    else if(hash === '#/requests') {
        if (window.openRequestsLogic) window.openRequestsLogic();
    }
    else if(hash === '#/stats') {
        if (window.openStatsLogic) window.openStatsLogic();
    }
    else if(hash === '#/edit-profile') {
        if (window.openEditProfileLogic) window.openEditProfileLogic();
    }
    else if(hash === '#/reels') {
        if (window.openReelsLogic) window.openReelsLogic(window.currentReelIdx || 0);
    }
}
window.handleRouting = handleRouting;
window.openCommunityView = (commId) => {
    let comm = window.allCommunities[commId];
    if (comm) {
        let slug = window.generateCommunitySlug(comm.name);
        if (window.location.hash !== '#/community/' + slug) {
            window.location.hash = '#/community/' + slug;
        } else {
            window.openCommunityViewDirect(commId);
        }
    }
};
window.openCommunitiesModal = () => {
    if (window.location.hash !== '#/communities') {
        window.location.hash = '#/communities';
    } else {
        window.openCommunitiesModalDirect();
    }
};
const originalCloseModal = window.closeModal;
window.closeModal = (id) => {
    let modal = document.getElementById(id);
    if (!modal) return;
    
    if (id === 'communityViewModal') {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        if (window.lastNonCommunityHash && window.lastNonCommunityHash !== '#/community/') {
            window.location.hash = window.lastNonCommunityHash;
            window.lastNonCommunityHash = '';
        } else {
            window.location.hash = '#/communities';
        }
    } 
    else if (id === 'communitiesModal') {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        if (window.lastNonCommunityHash && window.lastNonCommunityHash !== '#/communities') {
            window.location.hash = window.lastNonCommunityHash;
            window.lastNonCommunityHash = '';
        } else if (window.currentUser) {
            window.location.hash = '';
        } else {
            window.location.hash = '#/login';
        }
    }
    else if (id === 'profileModalEnhanced') {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        setTimeout(() => modal.remove(), 300);
        if (window.history.length > 2 && window.location.hash !== '') {
            window.history.back();
        } else {
            window.location.hash = '';
        }
        return;
    }
    else {
        if (originalCloseModal) {
            originalCloseModal(id);
        } else {
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
            if (window.history.length > 2 && window.location.hash !== '') {
                window.history.back();
            } else {
                window.location.hash = '';
            }
        }
    }
};
window.addEventListener('popstate', () => {
    // لو شاشة عرض الصورة/الفيديو مفتوحة، زر الرجوع من الهاتف يقفلها فقط ويرجع لنفس المنشور
    if (document.getElementById('fbMediaViewer')) {
        window.closeMediaViewer(true);
        return;
    }
    let hash = window.location.hash;
    
    if (!hash || hash === '#/' || hash === '') {
        document.querySelectorAll('.modal').forEach(m => {
            m.classList.remove('show');
        });
        document.body.style.overflow = 'auto';
        if (window.currentUser && window.goHome) {
            window.goHome();
        }
    }
    else if (hash.startsWith('#/community/') && !document.getElementById('communityViewModal')?.classList.contains('show')) {
        window.handleRouting();
    }
    else if (hash === '#/communities' && !document.getElementById('communitiesModal')?.classList.contains('show')) {
        window.handleRouting();
    }
});
window.openProfile = (u) => { window.location.hash = '#/@' + u; };
window.openPostModal = (id) => { window.location.hash = '#/post/' + id; };
window.goHome = () => {
    if(!window.currentUser) { window.location.replace('#/login'); return; }
    window.location.hash = ''; window.scrollTo({top:0, behavior:'smooth'}); $('chatBox').classList.remove('show'); $('floatingChat').style.display='none';
    if(window.chatUnsubscribe){ window.chatUnsubscribe(); window.chatUnsubscribe=null; }
    window.currentChatTarget = null; window.isChatBoxVisible = false;
    window.closeNotifPanel(); ['userMenuDropdown','mobileUserMenuDropdown'].forEach(x => { let e=$(x); if(e) e.style.display='none'; });
    let sb = $('sidebarArea'); if(sb) sb.classList.remove('mobile-show');
    $('globalSearch').value=''; $('searchResults').style.display='none'; $('chatSearchInput').value=''; $('chatSearchBox').style.display='none'; $('friendsList').style.display='block';
    let rl=$('msgRequestsList'); if(rl&&rl.innerHTML!=='') { $('msgRequestsHeader').style.display='block'; rl.style.display='block'; }
    window.renderedPostIds = new Set(window.allPosts.map(p => p.id)); $('newPostsBtn').style.display='none'; window.feedLim=5; window.renderFeed();
};
window.uploadToCloudinary = (file, type, onProgress) => { return new Promise((resolve, reject) => { let fd = new FormData(); fd.append('file', file); fd.append('upload_preset', window.CLOUDINARY_UPLOAD_PRESET); let xhr = new XMLHttpRequest(); xhr.open('POST', `https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD_NAME}/${type}/upload`); xhr.upload.onprogress = (e) => { if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); }; xhr.onload = () => { try { let data = JSON.parse(xhr.responseText); if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) resolve(data.secure_url); else reject(new Error(data.error?.message || 'فشل الرفع')); } catch (e) { reject(e); } }; xhr.onerror = () => reject(new Error('فشل الاتصال بالخادم')); xhr.send(fd); }); };
window.videoObserver = new IntersectionObserver((entries) => { entries.forEach(entry => { if(entry.isIntersecting) { try { entry.target.muted = true; let playPromise = entry.target.play(); if(playPromise !== undefined) { playPromise.catch(error => {}); } } catch(e){} } else { try { if(!entry.target.paused) entry.target.pause(); } catch(e){} } }); }, {threshold: 0.5});
window.toastTimeout = null;
window.showToast = (t, x, i) => { try { $('toastTitle').innerText = t; $('toastBody').innerText = x; $('toastImg').src = i || dA; let o = $('toastNotification'); o.classList.add('show'); if(window.toastTimeout) clearTimeout(window.toastTimeout); window.toastTimeout = setTimeout(() => o.classList.remove('show'), 5000); window.playNotifSound(); if("Notification" in window && Notification.permission === "granted") { try { let s = new Notification(t, {body:x, icon:i||dA}); setTimeout(() => s.close(), 5000); } catch(e) {} } } catch(err) {} };
window.fullDateTime = (ts) => { if(!ts) return ''; let dt = new Date(ts); if(isNaN(dt)) return ''; return dt.toLocaleString('ar-EG', {day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'}); };
window.timeAgo = (ts) => {
    if(!ts) return "منذ فترة";
    let s = Math.floor((Date.now()-ts)/1000); if(s<0) s = 0;
    const unit = (n, one, two, plural) => n === 1 ? one : n === 2 ? two : `منذ ${n} ${plural}`;
    if(s<60) return "الآن";
    let m = Math.floor(s/60);
    if(m<60) return unit(m, "منذ دقيقة", "منذ دقيقتين", "دقائق");
    let h = Math.floor(m/60);
    if(h<24) return unit(h, "منذ ساعة", "منذ ساعتين", "ساعات");
    let d = Math.floor(h/24);
    if(d<7) return unit(d, "منذ يوم", "منذ يومين", "أيام");
    let w = Math.floor(d/7);
    if(w<4) return unit(w, "منذ أسبوع", "منذ أسبوعين", "أسابيع");
    let mo = Math.floor(d/30);
    if(mo<12) return unit(mo, "منذ شهر", "منذ شهرين", "أشهر");
    let y = Math.floor(d/365);
    return unit(y, "منذ عام", "منذ عامين", "أعوام");
};
const eRE = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
window.formatMentions = (t) => { if(!t) return ''; let s = t.replace(/</g, "&lt;").replace(/>/g, "&gt;"); if(window.myFriends) { window.myFriends.forEach(f => { s = s.replace(new RegExp('@'+eRE(f)+'(?=\\s|$)', 'g'), `<a href="#/@${f}" style="color:var(--primary);cursor:pointer;background:#eef2ff;padding:2px 5px;border-radius:4px;text-decoration:none;" onclick="event.stopPropagation();">@${f}</a>`); }); } return s; };
window.handleMentionInput = (e) => { window.activeMentionInput = e; let v = e.value, c = e.selectionStart, tb = v.substring(0,c), la = tb.lastIndexOf('@'), mb = $('globalMentionBox'); if(la !== -1 && (la === 0 || tb[la-1] === ' ')) { let q = tb.substring(la+1), m = window.myFriends.filter(f => f.toLowerCase().includes(q.toLowerCase()) || window.getDisplayName(f).toLowerCase().includes(q.toLowerCase())); if(m.length > 0) { let h = ''; m.forEach(x => { h += `<div class="mention-item" onclick="window.insertMention('${x}')"><img src="${window.allUsersData[x]?.profilePic||dA}"> <span>${window.getDisplayName(x)} (@${x})</span></div>`; }); mb.innerHTML = h; mb.style.display = 'block'; let r = e.getBoundingClientRect(); mb.style.left = r.left + 'px'; mb.style.top = (r.top - mb.offsetHeight - 5) + 'px'; if(r.top < mb.offsetHeight) mb.style.top = (r.bottom + 5) + 'px'; } else mb.style.display = 'none'; } else mb.style.display = 'none'; };
window.insertMention = (f) => { let e = window.activeMentionInput; if(!e) return; let v = e.value, c = e.selectionStart, tb = v.substring(0,c), la = tb.lastIndexOf('@'), ta = v.substring(c); if(la !== -1) { let n = v.substring(0,la) + '@' + f + ' '; e.value = n + ta; e.focus(); e.selectionStart = e.selectionEnd = n.length; } $('globalMentionBox').style.display = 'none'; };
document.addEventListener('click', (e) => { if(!e.target || typeof e.target.closest !== 'function') return; if(!e.target.closest('#globalMentionBox') && !e.target.classList.contains('comment-input') && !e.target.classList.contains('composer-input')) { $('globalMentionBox').style.display = 'none'; } if(!e.target.closest('.search-container')) { $('searchResults').style.display = 'none'; } if(!e.target.closest('.notif-container')) { window.closeNotifPanel(); } if(!e.target.closest('.nav-user-container') && !e.target.closest('.b-nav-item')) { let u = $('userMenuDropdown'), m = $('mobileUserMenuDropdown'); if(u) u.style.display = 'none'; if(m) m.style.display = 'none'; } });
window.openFullMenu = () => {
    let ov = document.getElementById('fullMenuOverlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'fullMenuOverlay';
        ov.innerHTML = `
        <style>
        #fullMenuOverlay{position:fixed;inset:0;background:#f1f5f9;z-index:2147483100;direction:rtl;overflow-y:auto;font-family:Cairo,sans-serif;}
        .fmenu-header{background:#fff;border-bottom:1px solid #e2e8f0;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;box-shadow:0 2px 10px rgba(0,0,0,.06)}
        .fmenu-logo{font-size:20px;font-weight:900;background:linear-gradient(135deg,#2563eb,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .fmenu-close{background:#f1f5f9;border:none;font-size:18px;cursor:pointer;color:#64748b;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center}
        .fmenu-hero{padding:20px;background:linear-gradient(135deg,#2563eb,#7c3aed);display:flex;align-items:center;gap:14px}
        .fmenu-hero-av{width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.4);flex-shrink:0}
        .fmenu-hero-name{font-size:18px;font-weight:900;color:#fff}
        .fmenu-hero-handle{font-size:13px;color:rgba(255,255,255,.75);margin-top:2px}
        .fmenu-body{padding:16px;max-width:620px;margin:0 auto}
        .fmenu-section-title{font-size:11px;font-weight:800;color:#94a3b8;letter-spacing:1px;margin:20px 0 8px}
        .fmenu-card{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;margin-bottom:10px;cursor:pointer;transition:.2s;text-decoration:none;color:inherit}
        .fmenu-card:hover{border-color:#2563eb;background:#f8faff;transform:translateX(-2px)}
        .fmenu-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
        .fmenu-txt{flex:1}
        .fmenu-title{font-size:14px;font-weight:800;color:#0f172a}
        .fmenu-desc{font-size:12px;color:#64748b;margin-top:2px}
        .fmenu-badge{font-size:10px;padding:2px 7px;border-radius:10px;font-weight:800;margin-right:4px;color:#fff;vertical-align:middle}
        .fmenu-chevron{color:#cbd5e1;font-size:12px}
        </style>
        <div class="fmenu-header">
            <div class="fmenu-logo">مجتمعنا</div>
            <button class="fmenu-close" onclick="window.closeFullMenu()"><i class="fas fa-times"></i></button>
        </div>
        <div class="fmenu-hero">
            <img class="fmenu-hero-av" id="fullMenuAvatar" src="https://cdn-icons-png.flaticon.com/512/149/149071.png">
            <div>
                <div class="fmenu-hero-name" id="fullMenuName"></div>
                <div class="fmenu-hero-handle" id="fullMenuHandle"></div>
            </div>
        </div>
        <div class="fmenu-body">
            <div class="fmenu-section-title">الحساب</div>
            <div class="fmenu-card" onclick="window.closeFullMenu();window.openProfile(window.currentUser)">
                <div class="fmenu-icon" style="background:#eff6ff"><i class="fas fa-user-edit" style="color:#2563eb"></i></div>
                <div class="fmenu-txt"><div class="fmenu-title">تعديل البيانات الشخصية</div><div class="fmenu-desc">غيّر اسمك وصورتك وبياناتك</div></div>
                <i class="fas fa-chevron-left fmenu-chevron"></i>
            </div>
            <div class="fmenu-card" onclick="window.closeFullMenu();window.location.hash='#/stats'">
                <div class="fmenu-icon" style="background:#f0fdf4"><i class="fas fa-chart-bar" style="color:#10b981"></i></div>
                <div class="fmenu-txt"><div class="fmenu-title">إحصائيات المنصة</div><div class="fmenu-desc">أعداد المستخدمين والمنشورات</div></div>
                <i class="fas fa-chevron-left fmenu-chevron"></i>
            </div>

            <div class="fmenu-section-title">النمو والإيرادات</div>
            <a href="ads.html" target="_blank" class="fmenu-card">
                <div class="fmenu-icon" style="background:#fffbeb"><i class="fas fa-bullhorn" style="color:#f59e0b"></i></div>
                <div class="fmenu-txt">
                    <div class="fmenu-title" style="color:#92400e">إنشاء إعلان ممول <span class="fmenu-badge" style="background:#f59e0b">جديد</span></div>
                    <div class="fmenu-desc">روّج لمنتجاتك وخدماتك على المنصة</div>
                </div>
                <i class="fas fa-chevron-left fmenu-chevron"></i>
            </a>
            <div class="fmenu-card" onclick="window.closeFullMenu();window.dlgAlert('ميزة الربح من المنشورات قريباً! 🚀','info','قريباً')">
                <div class="fmenu-icon" style="background:#f5f3ff"><i class="fas fa-money-bill-wave" style="color:#7c3aed"></i></div>
                <div class="fmenu-txt">
                    <div class="fmenu-title">الربح من المنشورات <span class="fmenu-badge" style="background:#7c3aed">قريباً</span></div>
                    <div class="fmenu-desc">اكسب من محتواك ومتابعيك</div>
                </div>
                <i class="fas fa-chevron-left fmenu-chevron"></i>
            </div>
            <div class="fmenu-card" onclick="window.closeFullMenu();window.dlgAlert('برنامج الإحالات قريباً! 🚀','info','قريباً')">
                <div class="fmenu-icon" style="background:#fff1f2"><i class="fas fa-gift" style="color:#ef4444"></i></div>
                <div class="fmenu-txt">
                    <div class="fmenu-title">برنامج الإحالات <span class="fmenu-badge" style="background:#ef4444">قريباً</span></div>
                    <div class="fmenu-desc">ادعُ أصدقاءك واكسب مكافآت</div>
                </div>
                <i class="fas fa-chevron-left fmenu-chevron"></i>
            </div>

            <div class="fmenu-section-title">المجتمع</div>
            <div class="fmenu-card" onclick="window.closeFullMenu();window.openCommunitiesModal()">
                <div class="fmenu-icon" style="background:#f0f9ff"><i class="fas fa-users-cog" style="color:#0891b2"></i></div>
                <div class="fmenu-txt"><div class="fmenu-title">مجتمعاتي</div><div class="fmenu-desc">تصفّح وإدارة مجتمعاتك</div></div>
                <i class="fas fa-chevron-left fmenu-chevron"></i>
            </div>

            <div style="margin-top:24px">
                <div class="fmenu-card" onclick="window.closeFullMenu();window.logoutUser()" style="border-color:#fecaca">
                    <div class="fmenu-icon" style="background:#fef2f2"><i class="fas fa-sign-out-alt" style="color:#ef4444"></i></div>
                    <div class="fmenu-txt"><div class="fmenu-title" style="color:#ef4444">تسجيل الخروج</div><div class="fmenu-desc">الخروج من حسابك</div></div>
                </div>
            </div>
            <div style="text-align:center;color:#94a3b8;font-size:11px;margin-top:24px;padding-bottom:30px">مجتمعنا © 2025</div>
        </div>`;
        document.body.appendChild(ov);
    }
    // تحديث بيانات المستخدم
    const u = window.currentUser;
    if (u) {
        const d = window.allUsersData?.[u] || {};
        const nm = document.getElementById('fullMenuName');
        const hd = document.getElementById('fullMenuHandle');
        const av = document.getElementById('fullMenuAvatar');
        if (nm) nm.innerText = d.displayName || d.name || u;
        if (hd) hd.innerText = '@' + u;
        if (av && d.profilePic) av.src = d.profilePic;
    }
    ov.style.display = 'block';
    document.body.style.overflow = 'hidden';
};
window.closeFullMenu = () => {
    const ov = document.getElementById('fullMenuOverlay');
    if (ov) ov.style.display = 'none';
    document.body.style.overflow = '';
};
window.toggleDropdown = (id) => {
    if (id === 'userMenuDropdown' || id === 'mobileUserMenuDropdown') {
        window.openFullMenu();
        return;
    }
    let e = $(id); if(!e) return;
    if (id === 'notifDropdown') {
        let isOpen = e.style.display === 'flex';
        window.closeNotifPanel();
        ['userMenuDropdown','mobileUserMenuDropdown'].forEach(x => { let el=$(x); if(el) el.style.display='none'; });
        if (!isOpen) {
            e.style.display = 'flex';
            if (window.innerWidth <= 768) document.body.style.overflow = 'hidden';
            if (window.rerenderNotifications) window.rerenderNotifications();
        }
        return;
    }
    let d = e.style.display === 'block';
    window.closeNotifPanel();
    ['userMenuDropdown','mobileUserMenuDropdown'].forEach(x => { let el=$(x); if(el) el.style.display='none'; });
    if(!d) e.style.display = 'block';
};
window.toggleSidebar = () => { let s = $('sidebarArea'); window.innerWidth <= 768 ? s.classList.toggle('mobile-show') : s.classList.toggle('hidden'); };
window.handleGlobalSearch = (q) => { let r = $('searchResults'); if(!q.trim()){ r.style.display='none'; return; } let h=''; for(let u in window.allUsersData) { let d = window.getDisplayName(u); if(d.toLowerCase().includes(q.toLowerCase()) || u.toLowerCase().includes(q.toLowerCase())) { h += `<a href="#/@${u}" class="search-result-item" onclick="$('searchResults').style.display='none'; $('globalSearch').value='';" style="text-decoration:none; color:inherit;"><img src="${window.allUsersData[u].profilePic||dA}" class="avatar-small"> <div style="display:flex;flex-direction:column;line-height:1.2;"><span>${d}</span><span style="font-size:11px;color:#64748b;">@${u}</span></div></a>`; } } r.innerHTML = h || '<div style="padding:10px;text-align:center;color:#666;">لا توجد نتائج</div>'; r.style.display='block'; };
window.searchChatUsers = (q) => { let r=$('chatSearchBox'), f=$('friendsList'), rh=$('msgRequestsHeader'), rl=$('msgRequestsList'); if(!q.trim()){ r.style.display='none'; f.style.display='block'; if(rl&&rl.innerHTML!==''){ rh.style.display='block'; rl.style.display='block'; } return; } f.style.display='none'; rh.style.display='none'; rl.style.display='none'; let h=''; for(let u in window.allUsersData){ if(u===window.currentUser) continue; let d = window.getDisplayName(u); if(d.toLowerCase().includes(q.toLowerCase()) || u.toLowerCase().includes(q.toLowerCase())){ h += `<div class="user-row" onclick="window.openChat('${u}')"><div class="user-info"><img src="${window.allUsersData[u].profilePic||dA}" class="avatar-small"><span>${d}</span></div><button class="btn-primary" style="padding:4px 10px;font-size:12px;border-radius:4px;"><i class="fas fa-comment-dots"></i></button></div>`; } } r.innerHTML = h || '<div style="padding:10px;text-align:center;color:#64748b;font-size:14px;">لا توجد نتائج</div>'; r.style.display='block'; };
window.addEventListener('scroll', () => { if((window.innerHeight+window.scrollY) >= document.body.offsetHeight-800){ if(window.feedLim < window.allPosts.length){ window.feedLim += 5; window.renderFeed(); } } });
window.openMediaViewerFor = (postId, idx) => {
    let post = window.postCache[postId] || (window.allNewsPosts || []).find(x => x.id === postId) || (window.allPosts || []).find(x => x.id === postId);
    if (!post) return;
    let imgs = (post.images && post.images.length) ? post.images : (post.image ? [post.image] : []);
    let vids = (post.videos && post.videos.length) ? post.videos : (post.video ? [post.video] : []);
    let items = [...imgs.map(u => ({ type: 'image', u })), ...vids.map(u => ({ type: 'video', u }))];
    window.openMediaViewer(items, idx, post);
};
window.openMediaViewer = (items, startIdx, post) => {
    document.body.style.overflow = 'hidden';
    // نبني HTML التعليقات مباشرة من بيانات المنشور (مشتركة لكل الصور)
    let commentsHTML = '';
    if (post.comments && typeof post.comments === 'object') {
        Object.entries(post.comments).map(([id,val]) => ({id,...val})).sort((a,b) => a.timestamp - b.timestamp).forEach(c => {
            let cPic = window.allUsersData[c.author]?.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            let cD = window.getDisplayName(c.author);
            let cLikes = c.likes ? Object.keys(c.likes).length : 0;
            let cLiked = window.currentUser && c.likes && !!c.likes[window.currentUser];
            let repliesHTML = '';
            if (c.replies && typeof c.replies === 'object') {
                Object.entries(c.replies).map(([rid,rv]) => ({rid,...rv})).sort((a,b) => a.timestamp - b.timestamp).forEach(r => {
                    let rPic = window.allUsersData[r.author]?.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                    let rD = window.getDisplayName(r.author);
                    let rLikes = r.likes ? Object.keys(r.likes).length : 0;
                    let rLiked = window.currentUser && r.likes && !!r.likes[window.currentUser];
                    repliesHTML += `<div style="display:flex;gap:7px;margin-top:8px;margin-right:20px;">
                        <img src="${rPic}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;flex-shrink:0;">
                        <div style="flex:1;">
                            <div style="background:#e2e8f0;border-radius:10px;padding:7px 10px;">
                                <div style="font-weight:700;font-size:12px;">${rD}</div>
                                <div style="font-size:12px;">${r.text||''}</div>
                            </div>
                            <div style="display:flex;gap:12px;margin-top:3px;padding-right:6px;">
                                <span onclick="window.toggleCommentLike('${post.id}','${c.id}','${r.rid}',this)" style="font-size:11px;cursor:pointer;font-weight:700;color:${rLiked?'#ef4444':'#64748b'};">إعجاب${rLikes>0?' '+rLikes:''}</span>
                            </div>
                        </div>
                    </div>`;
                });
            }
            commentsHTML += `<div style="display:flex;gap:8px;margin-bottom:14px;" data-cid="${c.id}">
                <img src="${cPic}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">
                <div style="flex:1;">
                    <div style="background:#f1f5f9;border-radius:12px;padding:8px 12px;">
                        <div style="font-weight:700;font-size:13px;">${cD}</div>
                        <div style="font-size:13px;">${c.text||''}</div>
                    </div>
                    <div style="display:flex;gap:12px;margin-top:4px;padding-right:6px;">
                        <span onclick="window.toggleCommentLike('${post.id}','${c.id}',null,this)" style="font-size:12px;cursor:pointer;font-weight:700;color:${cLiked?'#ef4444':'#64748b'};">إعجاب${cLikes>0?' '+cLikes:''}</span>
                        ${window.currentUser?`<span onclick="window.mvStartReply('${c.id}','${c.author}','${cD}')" style="font-size:12px;cursor:pointer;font-weight:700;color:#2563eb;">رد</span>`:''}
                    </div>
                    ${repliesHTML}
                </div>
            </div>`;
        });
    }
    let likeCount = post.likes ? Object.keys(post.likes).length : 0;
    let isLiked = window.currentUser && post.likes && !!post.likes[window.currentUser];
    let commentInput = window.currentUser ? `
        <div style="display:flex;gap:8px;align-items:center;padding:10px 14px;border-top:1px solid #e2e8f0;">
            <img src="${window.allUsersData[window.currentUser]?.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">
            <input type="text" id="_mvInpDesktop" placeholder="اكتب تعليقاً..." style="flex:1;border:1px solid #e2e8f0;border-radius:20px;padding:8px 14px;font-family:Cairo,sans-serif;font-size:13px;outline:none;" onkeypress="if(event.key==='Enter')window.mvAddComment('${post.id}','${post.author}')">
            <button onclick="window.mvAddComment('${post.id}','${post.author}')" style="background:var(--primary);color:#fff;border:none;border-radius:50%;width:34px;height:34px;cursor:pointer;"><i class="fas fa-paper-plane"></i></button>
        </div>` : '';
    let actionBar = `
        <div style="display:flex;border-top:1px solid #e2e8f0;padding:4px 0;">
            <button class="action-btn" data-count="${likeCount}" onclick="window.toggleLike('${post.id}','${post.author}',this);setTimeout(()=>window.mvRefreshLikeCount('${post.id}'),300)" style="flex:1;">
                <i class="${isLiked?'fas':'far'} fa-heart" style="${isLiked?'color:#ef4444;':''}"></i>
                <span class="lc-count">${likeCount || 'إعجاب'}</span>
            </button>
            <button class="action-btn" style="flex:1;" onclick="document.getElementById('mvCommentInput')?.focus()">
                <i class="far fa-comment-alt"></i> تعليق
            </button>
        </div>`;

    let ov = document.createElement('div');
    ov.id = 'fbMediaViewer';
    ov.style.cssText = 'position:fixed;inset:0;background:#000;z-index:2147483200;display:flex;direction:ltr;';
    ov.innerHTML = `
        <div class="fb-comments-panel">
            <div class="fb-panel-header">
                <img src="${window.allUsersData[post.author]?.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">
                <div>
                    <div style="font-weight:700;font-size:14px;">${window.getDisplayName(post.author)}</div>
                    <div style="font-size:11px;color:#64748b;">${window.timeAgo(post.timestamp)}</div>
                </div>
            </div>
            ${post.text ? `<div style="padding:10px 14px;font-size:14px;color:#334155;border-bottom:1px solid #e2e8f0;">${post.text}</div>` : ''}
            ${actionBar}
            <div style="flex:1;overflow-y:auto;padding:14px;" id="_mvListDesktop">
                ${commentsHTML || '<div style="text-align:center;color:#94a3b8;font-size:13px;padding:20px;">لا توجد تعليقات بعد</div>'}
            </div>
            ${commentInput}
        </div>
        <div class="fb-media-main">
            <button class="fb-media-close" onclick="window.closeMediaViewer()"><i class="fas fa-times"></i></button>
            ${items.length > 1 ? `<button class="fb-media-nav fb-media-prev" onclick="window.mediaViewerNav(-1)"><i class="fas fa-chevron-right"></i></button>` : ''}
            <div id="fbMediaContent"></div>
            ${items.length > 1 ? `<button class="fb-media-nav fb-media-next" onclick="window.mediaViewerNav(1)"><i class="fas fa-chevron-left"></i></button>` : ''}
            ${items.length > 1 ? `<div class="fb-media-counter" id="fbMediaCounter"></div>` : ''}
            <!-- شريط الأكشن للموبايل فقط (مخفي على الكمبيوتر بالـCSS) -->
            <div id="fbMobileBar">
                <button onclick="window.toggleLike('${post.id}','${post.author}',this)" data-count="${likeCount}" style="color:${isLiked?'#ef4444':'#fff'}">
                    <i class="${isLiked?'fas':'far'} fa-heart"></i>
                    <span class="lc-count">${likeCount||''}</span>
                </button>
            <button onclick="window.openMvCommentsSheet(true)">
                <i class="far fa-comment"></i>
                <span>${post.comments ? Object.keys(post.comments).length : 0} تعليق</span>
            </button>
            </div>
        </div>

        <!-- Bottom Sheet التعليقات للموبايل -->
        <div id="fbCommentsSheet">
            <div id="fbCommentsSheetBg" onclick="window.closeMvCommentsSheet()"></div>
            <div id="fbCommentsSheetInner">
                <div id="fbCommentsSheetHandle"></div>
                <div id="fbCommentsSheetTitle">التعليقات</div>
                <div id="mvCommentsList" style="flex:1;overflow-y:auto;padding:16px;">
                    ${commentsHTML || '<div style="text-align:center;color:#94a3b8;font-size:14px;padding:30px;">لا توجد تعليقات بعد</div>'}
                </div>
                ${window.currentUser ? `
                <div id="fbCommentsSheetInput">
                    <img src="${window.allUsersData[window.currentUser]?.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;">
                    <input type="text" id="mvCommentInput" placeholder="اكتب تعليقاً..." onkeypress="if(event.key==='Enter')window.mvAddComment('${post.id}','${post.author}')">
                    <button onclick="window.mvAddComment('${post.id}','${post.author}')"><i class="fas fa-paper-plane"></i></button>
                </div>` : ''}
            </div>
        </div>`;
    document.body.appendChild(ov);
    window._mvItems = items; window._mvIdx = startIdx || 0; window._mvPost = post;
    window._renderMVContent();

    // نضيف سجل تاريخ وهمي حتى يقوم زر الرجوع (خصوصاً على الهاتف) بإغلاق الشاشة فقط والبقاء في نفس المنشور
    window._mvHistoryPushed = true;
    try { history.pushState({ mediaViewer: true }, '', location.href); } catch (e) {}

    // سحب اللمس للتنقل على الموبايل
    let mc = document.getElementById('fbMediaContent');
    let ts = 0;
    mc.addEventListener('touchstart', e => { ts = e.touches[0].clientX; }, { passive: true });
    mc.addEventListener('touchend', e => {
        let diff = ts - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) window.mediaViewerNav(diff > 0 ? 1 : -1);
    }, { passive: true });
};
window._renderMVContent = () => {
    let items = window._mvItems, idx = window._mvIdx, it = items[idx];
    let c = document.getElementById('fbMediaContent'), counter = document.getElementById('fbMediaCounter');
    if (!c) return;
    c.innerHTML = it.type === 'image'
        ? `<img src="${it.u}" style="max-width:100%;max-height:100%;object-fit:contain;display:block;">`
        : `<video src="${it.u}" controls autoplay playsinline style="max-width:100%;max-height:100%;object-fit:contain;display:block;background:#000;"></video>`;
    if (counter) {
        if (items.length <= 8) {
            // نقاط دائرية للتنقل (مناسب للموبايل والكمبيوتر)
            counter.innerHTML = items.map((_, i) =>
                `<span onclick="window._mvGoTo(${i})" style="display:inline-block;width:${i===idx?'20px':'8px'};height:8px;border-radius:10px;background:${i===idx?'#fff':'rgba(255,255,255,.45)'};margin:0 3px;cursor:pointer;transition:all .25s;"></span>`
            ).join('');
        } else {
            counter.innerText = `${idx + 1} / ${items.length}`;
        }
    }
};
window._mvGoTo = (idx) => { window._mvIdx = idx; window._renderMVContent(); };
window.mediaViewerNav = (dir) => {
    window._mvIdx = (window._mvIdx + dir + window._mvItems.length) % window._mvItems.length;
    window._renderMVContent();
};
window.mvStartReply = (commentId, commentAuthor, commentAuthorName) => {
    window.openMvCommentsSheet(false);
    setTimeout(() => {
        let inp = document.getElementById('mvCommentInput'); if (!inp) return;
        inp.dataset.replyTo = commentId;
        inp.dataset.replyAuthor = commentAuthor;
        inp.placeholder = `الرد على ${commentAuthorName}...`;
        inp.value = `@${commentAuthor} `;
        inp.focus();
    }, 350);
};
window.mvAddComment = (postId, postAuthor) => {
    let inp = document.getElementById('mvCommentInput'); if (!inp) return;
    let txt = inp.value.trim(); if (!txt) return;
    let replyTo = inp.dataset.replyTo;
    inp.value = ''; inp.disabled = true;
    inp.placeholder = 'اكتب تعليقاً...'; delete inp.dataset.replyTo; delete inp.dataset.replyAuthor;
    let dbPath = replyTo
        ? `posts/${postId}/comments/${replyTo}/replies`
        : `posts/${postId}/comments`;
    push(ref(db, dbPath), { author: window.currentUser, text: txt, timestamp: Date.now() }).then((ref2) => {
        inp.disabled = false; inp.focus();
        if (postAuthor !== window.currentUser) push(ref(db, `users/${postAuthor}/notifications`), { type: replyTo ? 'reply' : 'comment', from: window.currentUser, postId, timestamp: Date.now(), read: false });
        let list = document.getElementById('mvCommentsList'); if (!list) return;
        let pic = window.allUsersData[window.currentUser]?.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        let name = window.getDisplayName(window.currentUser);
        if (replyTo) {
            // أضف الرد تحت التعليق الأصلي
            let cDiv = list.querySelector(`[data-cid="${replyTo}"]`);
            if (cDiv) {
                let el = document.createElement('div');
                el.style.cssText = 'display:flex;gap:7px;margin-top:8px;margin-right:20px;';
                el.innerHTML = `<img src="${pic}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;flex-shrink:0;"><div style="flex:1;"><div style="background:#e2e8f0;border-radius:10px;padding:7px 10px;"><div style="font-weight:700;font-size:12px;">${name}</div><div style="font-size:12px;">${txt}</div></div></div>`;
                cDiv.appendChild(el);
            }
        } else {
            let el = document.createElement('div');
            el.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;'; el.dataset.cid = ref2.key;
            el.innerHTML = `<img src="${pic}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;"><div style="flex:1;"><div style="background:#f1f5f9;border-radius:12px;padding:8px 12px;"><div style="font-weight:700;font-size:13px;">${name}</div><div style="font-size:13px;">${txt}</div></div><div style="display:flex;gap:12px;margin-top:4px;padding-right:6px;"><span style="font-size:12px;cursor:pointer;font-weight:700;color:#64748b;">إعجاب</span><span onclick="window.mvStartReply('${ref2.key}','${window.currentUser}','${name}')" style="font-size:12px;cursor:pointer;font-weight:700;color:#2563eb;">رد</span></div></div>`;
            if (list.querySelector('[style*="لا توجد تعليقات"]')) list.innerHTML = '';
            list.appendChild(el);
        }
        list.scrollTop = list.scrollHeight;
    }).catch(() => { inp.disabled = false; });
};
window.mvRefreshLikeCount = (postId) => {};
window.openMvCommentsSheet = (focusInput) => {
    document.getElementById('fbCommentsSheet')?.classList.add('open');
    if (focusInput) setTimeout(() => document.getElementById('mvCommentInput')?.focus(), 350);
};
window.closeMvCommentsSheet = () => {
    document.getElementById('fbCommentsSheet')?.classList.remove('open');
};
window.closeMediaViewer = (fromPopState) => {
    document.getElementById('fbMediaViewer')?.remove();
    document.body.style.overflow = '';
    if (window._mvHistoryPushed) {
        window._mvHistoryPushed = false;
        if (!fromPopState) { try { history.back(); } catch (e) {} }
    }
};
document.addEventListener('keydown', (e) => {
    if (!document.getElementById('fbMediaViewer')) return;
    if (e.key === 'Escape') window.closeMediaViewer();
    else if (e.key === 'ArrowLeft') window.mediaViewerNav(-1);
    else if (e.key === 'ArrowRight') window.mediaViewerNav(1);
});
document.addEventListener('DOMContentLoaded', () => setTimeout(window.injectUploadUI, 800));
window.addEventListener('load', () => setTimeout(window.injectUploadUI, 1200));
function listenToUsers(){ onValue(ref(db,'users'), s => { if(s.exists()){ window.allUsersData = s.val(); if(window.isInitialLoad){ window.listenToPosts(); } if(window.currentUser){ window.renderSidebarUsers(); window.renderRequests(); window.renderSidebarTop(); window.initRightSidebar && window.initRightSidebar(); window.rerenderNotifications && window.rerenderNotifications(); } } }); }
function listenToCommunities() { onValue(ref(db, 'communities'), s => { window.allCommunities = s.exists() ? s.val() : {}; if($('communitiesModal') && $('communitiesModal').classList.contains('show')) { window.renderCommunitiesList(); } window.renderRightSidebarCommunities && window.renderRightSidebarCommunities(); if (window.currentUser && typeof window.startCallListener === "function") window.startCallListener(); }); }
window.startPrivateListeners = () => { if(window.privateListenersStarted) return; window.privateListenersStarted = true; window.listenToAllFriends(); window.listenToFriendRequests(); window.listenToNotifications(); window.listenToUnreadChats(); window.listenToRecentChats(); listenToCommunities(); setTimeout(window.checkFriendsBirthdays, 3000); };
window.fL = function(u, d) {
    if (d.banned) {
        let now = Date.now();
        let perm = !d.banUntil || d.banUntil === 0;
        let expired = !perm && d.banUntil < now;
        if (!expired) {
            localStorage.removeItem('savedUser');
            window.showBanScreen(d);
            return;
        } else {
            import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js").then(({update, ref}) => {
                update(ref(db, `users/${u}`), { banned: false, banUntil: null, banReason: null });
            });
        }
    }
    
    window.isInitialNotifLoad = true;
    window.alertedNotifs = new Set();
    window.currentUser = u;
    localStorage.setItem('savedUser', u);
    
    let il = $('initialLoader'); 
    if(il){ 
        il.classList.add('hidden'); 
        setTimeout(() => il.style.display = 'none', 400); 
    } 
    
    let lw = $('loginModal'); 
    if(lw){ 
        lw.style.opacity = '0'; 
        lw.style.pointerEvents = 'none'; 
        setTimeout(() => lw.style.display = 'none', 400); 
    } 
    
    let guestNav = $('guestNav'); 
    if(guestNav) guestNav.style.display = 'none'; 
    
    let loggedInNav = $('loggedInNav'); 
    if(loggedInNav) loggedInNav.style.display = 'flex';

    let navSearch = $('navSearchContainer');
    if(navSearch) navSearch.style.display = 'flex';
    
    let cb = $('composerBox'); 
    if(cb) cb.style.display = 'block'; 
    
    let sidebarAreaContainer = $('sidebarAreaContainer'); 
    if(sidebarAreaContainer) sidebarAreaContainer.style.display = 'block';
    
    let bottomNav = $('bottomNav'); 
    if(bottomNav) bottomNav.style.display = '';
    
    let n = d.displayName || u; 
    $('currentUserDisplay').innerText = n; 
    let p = d.profilePic || dA; 
    
    ['myNavAvatar','composerAvatar','myShareAvatar','mobileNavAvatar','modalMyPic'].forEach(x => { 
        let el = $(x); 
        if(el) el.src = p; 
    }); 
    
    let ab = $('adminBtn'); 
    if(ab){ 
        ab.style.display = (u.toLowerCase() === 'admin21') ? 'flex' : 'none'; 
    } 
    
    try {
        let oRef = ref(db, `users/${u}/online`);
        // نمط الحضور الرسمي من Firebase: نعيد تسجيل onDisconnect كل مرة يُعاد الاتصال،
        // لأن الإشارة القديمة تضيع لو انقطع الاتصال وأعيد الاتصال (شائع في الموبايل)
        onValue(ref(db, '.info/connected'), (snap) => {
            if (snap.val() === true) {
                onDisconnect(oRef).set(false).then(() => {
                    set(oRef, true);
                });
            }
        });
        
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
    } catch(e) {
        console.error("Error setting online status:", e);
    }
    
    if(!d.interests || d.interests.length === 0) { 
        setTimeout(() => {
            if(window.renderInterestsModal) window.renderInterestsModal();
        }, 1000); 
    }
    
    if(!window.usersListenerActive) { 
        window.usersListenerActive = true; 
        if(typeof listenToUsers === 'function') listenToUsers();
    }
    
    if(typeof window.startPrivateListeners === 'function') {
        window.startPrivateListeners();
    }
    
    if(typeof window.listenToReels === 'function') window.listenToReels();
    if(typeof window.listenToNewsBotPosts === 'function') window.listenToNewsBotPosts();
    window.listenToAds();
    
    setTimeout(() => { 
        if(typeof window.initRightSidebar === 'function') window.initRightSidebar();
    }, 1500);
    
    setTimeout(() => { 
        let nca = document.getElementById('newsChannelsArea'); 
        if(nca && typeof window.renderNewsChannels === 'function') window.renderNewsChannels(); 
    }, 1500);
    
    setTimeout(() => { 
        if (typeof window.initCallNotifications === 'function') window.initCallNotifications(); 
    }, 2000);
    
    if(!window.isInitialLoad) { 
        window.renderedPostIds = new Set((window.allPosts || []).map(p => p.id)); 
        window.feedLim = 5; 
        if(typeof window.renderFeed === 'function') window.renderFeed(); 
        if(typeof window.handleRouting === 'function') window.handleRouting();
    }
    
    setTimeout(() => {
        const errorOverlay = document.getElementById('dlg-overlay');
        if(errorOverlay && errorOverlay.classList.contains('dlg-show')) {
            const errorTitle = document.getElementById('dlg-title');
            if(errorTitle && errorTitle.innerText === 'خطأ في الاتصال') {
                errorOverlay.classList.remove('dlg-show');
            }
        }
    }, 500);
};
window.rU = function() { 
    window.isInitialNotifLoad = true; 
    window.alertedNotifs = new Set(); 
    localStorage.removeItem('savedUser'); 
    window.currentUser = null; 
    
    let b = $('loginBtn'); 
    if(b){ 
        b.innerText = "دخول"; 
        b.disabled = false; 
    } 
    
    let hash = window.location.hash; 
    let isPublicPage = hash.startsWith('#/post/') || hash.startsWith('#/@');
    
    if(!isPublicPage) { 
        let s = $('hideLoginStyle'); 
        if(s) s.remove(); 
    }
    
    let l = $('initialLoader'); 
    if(l) l.style.display = 'none'; 
    
    let ab = $('adminBtn'); 
    if(ab) ab.style.display = 'none'; 
    
    let lw = $('loginModal'); 
    if(lw && isPublicPage) { 
        lw.style.opacity = '0'; 
        lw.style.pointerEvents = 'none'; 
        lw.style.display = 'none'; 
    } else if(lw) {
        lw.style.display = 'flex';
        lw.style.opacity = '1';
        lw.style.pointerEvents = 'auto';
    }
    
    let guestNav = $('guestNav'); 
    if(guestNav) guestNav.style.display = 'flex'; 
    
    let loggedInNav = $('loggedInNav'); 
    if(loggedInNav) loggedInNav.style.display = 'none';
    
    let cb = $('composerBox'); 
    if(cb) cb.style.display = 'none'; 
    
    let sidebarAreaContainer = $('sidebarAreaContainer'); 
    if(sidebarAreaContainer) sidebarAreaContainer.style.display = 'none';
    
    let bottomNav = $('bottomNav'); 
    if(bottomNav) bottomNav.style.display = 'none';
    
    if(hash === '' || hash === '#/') { 
        window.location.replace('#/login'); 
    }
    
    if(!window.usersListenerActive) { 
        window.usersListenerActive = true; 
        if(typeof listenToUsers === 'function') listenToUsers();
    }
};
window._listenToUsers = listenToUsers;
window._listenToReels = window.listenToReels;
window._handleRouting = window.handleRouting;
if(window.currentUser){ 
    let b = $('loginBtn'); 
    if(b){ 
        b.innerText = "جاري..."; 
        b.disabled = true; 
    } 
    get(ref(db, `users/${window.currentUser}`)).then(s => { 
        if(s.exists()){ 
            window.fL(window.currentUser, s.val()); 
        } else { 
            window.rU(); 
        } 
    }).catch((err) => { 
        console.error("Startup error:", err);
        window.rU(); 
    }); 
} else {
    window.rU();
}
