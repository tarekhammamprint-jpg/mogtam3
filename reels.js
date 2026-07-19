import { ref, set, get, push, remove, onValue, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

window.allReels = [];
let reelsObserver = null;
const reelPoster = "https://placehold.co/300x500/1e293b/ffffff?text=Reel+Video";
window.openReelsViewer = (idx) => { if(!window.currentUser) return window.showRegisterModal(); window.currentReelIdx = idx; window.location.hash = '#/reels'; };
window.closeReelsViewer = () => { window.location.hash = ''; let m = $('reelsViewerModal'); if(m) m.classList.remove('show'); document.body.style.overflow = 'auto'; };
reelsObserver = new IntersectionObserver((entries) => { entries.forEach(entry => { let video = entry.target.querySelector('video'); if(!video) return; if(entry.isIntersecting) { try { video.muted = false; video.currentTime = 0; let p = video.play(); if(p !== undefined) p.catch(e => {}); } catch(e) {} let rid = entry.target.getAttribute('data-id'); if(rid && window.currentUser) { let vRef = ref(db, `posts/${rid}/views/${window.currentUser}`); get(vRef).then(s => { if(!s.exists()) set(vRef, true); }); } } else { try { if(!video.paused) video.pause(); } catch(e) {} } }); }, {threshold: 0.7});
function listenToReels() {
    onValue(query(ref(db, 'posts'), orderByChild('timestamp'), limitToLast(200)), s => {
        if (s.exists()) {
            let reels = [];
            s.forEach(c => { let p = c.val(); p.id = c.key; if (p.video && !p.isNewsBot) reels.push(p); });
            reels.sort((a, b) => b.timestamp - a.timestamp);
            window.allReels = reels;
            window.renderReelsTopBar();
        }
    });
}
window.listenToReels = listenToReels;
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
    let reels = (window.allPosts || []).filter(p => p.video);
    if (reels.length === 0) { c.style.display = 'none'; return; }
    window.allReels = reels;
    c.style.removeProperty('display');
    let h = `<div class="reel-add-btn" onclick="window.scrollTo({top:0,behavior:'smooth'})"><i class="fas fa-plus"></i><span>أضف ريلز</span></div>`;
    reels.slice(0, 10).forEach((r, idx) => {
        let ap = (window.allUsersData[r.author] && window.allUsersData[r.author].profilePic) ? window.allUsersData[r.author].profilePic : dA;
        let dn = window.getDisplayName(r.author);
        let vc = r.views ? Object.keys(r.views).length : 0;
        h += `<div class="reel-thumb" onclick="window.openReelsViewer(${idx})"><video src="${r.video}" autoplay loop muted playsinline preload="auto"></video><img src="${ap}" class="r-author-pic"><span class="r-views"><i class="fas fa-play"></i> ${vc}</span><span class="r-author-name">${dn}</span></div>`;
    });
    c.innerHTML = h;
};
window.shuffleArray = (arr) => { let a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let reelsSwipeBound = false;
function attachReelsSwipeHandlers(area) {
    if (reelsSwipeBound) return;
    reelsSwipeBound = true;
    let startY = 0, transitioning = false;

    function getItems() { return area.querySelectorAll('.reel-screen'); }
    function currentIndex() {
        let idx = Math.round(area.scrollTop / area.clientHeight);
        return Math.max(0, Math.min(idx, getItems().length - 1));
    }
    function goTo(idx) {
        let items = getItems();
        idx = Math.max(0, Math.min(idx, items.length - 1));
        if (!items[idx]) return;
        transitioning = true;
        items[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.currentReelIdx = idx;
        setTimeout(() => { transitioning = false; }, 450);
    }
    area.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    area.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
    area.addEventListener('touchend', (e) => {
        if (transitioning) return;
        let endY = e.changedTouches[0].clientY, delta = startY - endY;
        if (Math.abs(delta) < 40) return; // حركة بسيطة جدًا، تجاهلها
        goTo(currentIndex() + (delta > 0 ? 1 : -1)); // حركة واحدة = فيديو واحد فقط، بغض النظر عن قوة السحب
    });
    area.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (transitioning) return;
        goTo(currentIndex() + (e.deltaY > 0 ? 1 : -1));
    }, { passive: false });
}
window.openReelsLogic = (startIdx) => {
    let area = document.getElementById('reelsScrollArea');
    let modal = document.getElementById('reelsViewerModal');
    if (!area || !modal) return;
    area.innerHTML = '';
    let baseReels = (window.allReels && window.allReels.length > 0) ? window.allReels : (window.allPosts || []).filter(p => p.video);
    if (baseReels.length === 0) {
        area.innerHTML = '<p style="text-align:center;color:#fff;padding:40px;font-size:16px;">لا يوجد ريلز حالياً.</p>';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        return;
    }
    // ترتيب عشوائي لظهور الريلز، مع ضمان أن الريلز المضغوط عليه يظهر أولًا
    let clickedReel = baseReels[startIdx || 0];
    let reels = window.shuffleArray(baseReels);
    let realStartIdx = clickedReel ? reels.findIndex(r => r.id === clickedReel.id) : 0;
    if (realStartIdx === -1) realStartIdx = 0;
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
    attachReelsSwipeHandlers(area);
    setTimeout(() => {
        let items = area.querySelectorAll('.reel-screen');
        let idx = Math.min(realStartIdx || 0, items.length - 1);
        if (items[idx]) items[idx].scrollIntoView({ behavior: 'instant' });
        window.currentReelIdx = idx;
        let firstVid = items[idx] ? items[idx].querySelector('video') : null;
        if (firstVid) { firstVid.muted = false; firstVid.play().catch(() => { firstVid.muted = true; firstVid.play().catch(() => {}); }); }
    }, 150);
};
window.toggleReelLike = (id, btn) => {
    if(!window.currentUser) return window.showRegisterModal();
    let r = ref(db, `posts/${id}/likes/${window.currentUser}`);
    get(r).then(s => {
        if(s.exists()) { remove(r); if(btn){ let i=btn.querySelector('i'); if(i){i.className='far fa-heart';i.style.color='';} let sp=btn.querySelector('span'); if(sp&&!isNaN(parseInt(sp.innerText))) sp.innerText=parseInt(sp.innerText)-1; } }
        else { set(r, true); window.playLikeSound(); if(btn){ let i=btn.querySelector('i'); if(i){i.className='fas fa-heart';i.style.color='#ef4444'; i.style.animation='likePopAnim .45s ease'; setTimeout(()=>{if(i)i.style.animation='';},450);} let sp=btn.querySelector('span'); if(sp&&!isNaN(parseInt(sp.innerText))) sp.innerText=parseInt(sp.innerText)+1; } }
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
