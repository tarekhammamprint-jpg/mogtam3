import { ref, set, get, push, remove, onValue, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

window.openShareModal = (id) => {
    if(!window.currentUser) return window.showRegisterModal();
    let p = window.postCache[id] || window.allPosts.find(x => x.id === id);
    if(p) {
        window._showSharePopup(id, p);
    } else {
        get(ref(db, `posts/${id}`)).then(s => {
            if(s.exists()) { let post=s.val(); post.id=id; window.postCache[id]=post; window.allPosts.push(post); window._showSharePopup(id, post); }
        });
    }
};
window._showSharePopup = (id, p) => {
    const dA = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    // تحديث avatar
    let av = document.getElementById('myShareAvatar');
    if(av) av.src = window.allUsersData[window.currentUser]?.profilePic || dA;
    // تحديث hidden input
    let pi = document.getElementById('sharePostId');
    if(pi) pi.value = id;
    // تفريغ caption
    let cap = document.getElementById('shareCaption');
    if(cap) cap.value = '';
    // بناء المعاينة
    let oa = p.isShare ? p.sharedData?.author : p.author;
    let ot = p.isShare ? p.sharedData?.text : p.text;
    let oi = p.isShare ? p.sharedData?.image : p.image;
    let ov = p.isShare ? p.sharedData?.video : p.video;
    let ap = window.allUsersData[oa]?.profilePic || dA;
    let dn = window.getDisplayName(oa);
    let prev = document.getElementById('sharePreview');
    if(prev) prev.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <img src="${ap}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">
            <strong style="font-size:13px;color:#0f172a;">${dn}</strong>
        </div>
        ${ot ? `<div style="font-size:14px;color:#374151;margin-bottom:8px;line-height:1.6;">${window.formatMentions(ot)}</div>` : ''}
        ${oi ? `<img src="${oi}" style="width:100%;max-height:160px;object-fit:cover;border-radius:8px;">` : ''}
        ${ov ? `<video src="${ov}" style="width:100%;max-height:160px;border-radius:8px;background:#000;" controls></video>` : ''}`;
    // إظهار الـ overlay
    let overlay = document.getElementById('shareOverlay');
    let box = document.getElementById('sharePopupBox');
    if(overlay) { overlay.style.display = 'flex'; setTimeout(() => { if(box) box.style.transform = 'scale(1) translateY(0)'; }, 10); }
    document.body.style.overflow = 'hidden';
    setTimeout(() => { if(cap) cap.focus(); }, 300);
};
window.closeSharePopup = () => {
    let overlay = document.getElementById('shareOverlay');
    let box = document.getElementById('sharePopupBox');
    if(box) box.style.transform = 'scale(0.9) translateY(20px)';
    setTimeout(() => { if(overlay) overlay.style.display = 'none'; document.body.style.overflow = 'auto'; }, 220);
};
function listenToPosts() { onValue(query(ref(db,'posts'), orderByChild('timestamp'), limitToLast(500)), s => { let l = []; if(s.exists()){ s.forEach(c => { let p=c.val(); p.id=c.key; window.postCache[p.id]=p; if(!p.isNewsBot) l.push(p); }); l.sort((a,b) => b.timestamp - a.timestamp); } window.allPosts = l; window.renderReelsTopBar(); if(window.isInitialLoad){ window.renderedPostIds = new Set(l.map(p=>p.id)); if(window.currentUser) window.renderFeed(); window.isInitialLoad=false; window.handleRouting(); } else { let hash = window.location.hash; if(hash.startsWith('#/post/')){ let up = window.postCache[decodeURIComponent(hash.replace('#/post/', ''))]; if(up) window.openPostLogic(up.id); } let nc = l.filter(p=>!window.renderedPostIds.has(p.id)).length, mp = l.some(p=>p.author===window.currentUser&&!window.renderedPostIds.has(p.id)); if(mp){ window.renderedPostIds = new Set(l.map(p=>p.id)); if(window.currentUser) window.renderFeed(); $('newPostsBtn').style.display='none'; } else if(nc>=1){ $('newPostsBtn').style.display='block'; $('newPostsBtn').innerHTML=`<i class='fas fa-arrow-up'></i> ${nc} منشور جديد — انقر للتحديث`; $('newPostsBtn').style.display='flex'; } else { let ci=new Set(l.map(p=>p.id)); for(let id of window.renderedPostIds) if(!ci.has(id)) window.renderedPostIds.delete(id); } } if(window.location.hash.startsWith('#/@')) try { window.renderProfilePosts(decodeURIComponent(window.location.hash.replace('#/@', ''))) } catch(e){} }); }
window.listenToPosts = listenToPosts;
window.showNewPosts = () => { window.renderedPostIds = new Set(window.allPosts.map(p=>p.id)); window.feedLim=5; window.renderFeed(); $('newPostsBtn').style.display='none'; window.scrollTo({top:0, behavior:'smooth'}); };
window.toggleVideoMute = (btn) => {
    let wrap = btn.closest('.smart-video-wrap'); if (!wrap) return;
    let vid = wrap.querySelector('video'); if (!vid) return;
    vid.muted = !vid.muted;
    btn.innerHTML = vid.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
};
document.addEventListener('click', e => {
    let wrap = e.target.closest('.smart-video-wrap');
    if (!wrap) return;
    // لو ضغط على الـ mute button أو overlay، لا تفتح المودال
    if (e.target.closest('.sv-mute-btn')) return;
    let vid = wrap.querySelector('video');
    if (!vid) return;
    if (vid.paused) {
        vid.play();
        wrap.classList.add('playing');
    } else {
        vid.pause();
        wrap.classList.remove('playing');
    }
});
if ('IntersectionObserver' in window) {
    let vidObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            let vid = entry.target;
            if (!entry.isIntersecting && !vid.paused) {
                vid.pause();
                vid.closest('.smart-video-wrap')?.classList.remove('playing');
            }
        });
    }, { threshold: 0.3 });
    let observeVideos = () => {
        document.querySelectorAll('.smart-video').forEach(v => {
            if (!v.dataset.observed) { vidObserver.observe(v); v.dataset.observed = '1'; }
        });
    };
    // راقب إضافة فيديوهات جديدة للصفحة
    new MutationObserver(observeVideos).observe(document.body, { childList: true, subtree: true });
}
window.renderMediaGallery = (p) => {
    let imgs = (p.images && p.images.length) ? p.images : (p.image ? [p.image] : []);
    let vids = (p.videos && p.videos.length) ? p.videos : (p.video ? [p.video] : []);
    let total = imgs.length + vids.length;
    if (total === 0) return '';
    if (total === 1) {
        if (imgs.length) return `<img src="${imgs[0]}" class="post-media" style="cursor:pointer;" onclick="event.stopPropagation();window.openMediaViewerFor('${p.id}',0)">`;
        return `<div class="smart-video-wrap" onclick="event.stopPropagation();window.openMediaViewerFor('${p.id}',0)"><video src="${vids[0]}" class="post-media smart-video" muted playsinline preload="metadata" style="background:#1e293b;cursor:pointer;"></video><div class="sv-overlay"><i class="fas fa-play sv-play-icon"></i></div><button class="sv-mute-btn" onclick="event.stopPropagation();window.toggleVideoMute(this)"><i class="fas fa-volume-mute"></i></button></div>`;
    }
    let items = [...imgs.map(u => ({ type: 'image', u })), ...vids.map(u => ({ type: 'video', u }))];
    let cls = items.length === 2 ? 'g2' : items.length === 3 ? 'g3' : 'g4';
    let shown = items.slice(0, 4), extra = items.length - 4;
    let html = `<div class="media-gallery ${cls}">` + shown.map((it, i) => {
        let overlay = (i === 3 && extra > 0) ? `<div class="media-gallery-more">+${extra}</div>` : '';
        return it.type === 'image'
            ? `<div class="media-gallery-item" onclick="event.stopPropagation();window.openMediaViewerFor('${p.id||p.postId}',${i})"><img src="${it.u}">${overlay}</div>`
            : `<div class="media-gallery-item" onclick="event.stopPropagation();window.openMediaViewerFor('${p.id||p.postId}',${i})"><video src="${it.u}" muted playsinline preload="metadata"></video><i class="fas fa-play media-gallery-play"></i>${overlay}</div>`;
    }).join('') + `</div>`;
    return html;
};
function createPostHTML(p, cp, it=false, im=false) {
    let dt = window.timeAgo(p.timestamp), dtFull = window.fullDateTime(p.timestamp), ap = window.allUsersData[p.author]?.profilePic || dA, ism = p.author === window.currentUser, ad = window.getDisplayName(p.author), ah = `<span style="font-size:12px;color:var(--text-muted);font-weight:normal;">@${p.author}</span>`, af = '';
    let abg = p.author.toLowerCase() === 'admin21' ? '<span style="background:#7c3aed;color:#fff;padding:2px 6px;border-radius:6px;font-size:10px;margin-right:5px;font-weight:bold;">إدارة</span>' : '';
    if(window.currentUser && !ism && !window.myFriends.includes(p.author)) { let rr = window.currentRequests && window.currentRequests[p.author]; if(window.sentRequests && window.sentRequests[p.author]) af = `<button class="btn-primary" style="padding:2px 10px;font-size:11px;border-radius:6px;margin-right:10px;background:#e2e8f0;color:#0f172a;" disabled><i class="fas fa-clock"></i> تم</button>`; else if(rr) af = `<button class="btn-primary" style="padding:2px 10px;font-size:11px;border-radius:6px;margin-right:10px;background:#10b981;" onclick="event.stopPropagation();window.acceptRequestFromFeed('${p.author}')"><i class="fas fa-check"></i> قبول</button>`; else af = `<button class="btn-primary" data-action="add" data-target="${p.author}" style="padding:2px 10px;font-size:11px;border-radius:6px;margin-right:10px;" onclick="event.stopPropagation();window.sendFriendRequestToFromFeed('${p.author}',this)"><i class="fas fa-user-plus"></i> إضافة</button>`; }
    let tbg = it ? `<span style="background:#ff9800;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;margin-right:10px;font-weight:bold;"><i class="fas fa-fire"></i> رائج</span>` : '', ch = `<div class="post-options-wrap"><button class="post-options-btn" onclick="event.stopPropagation();window.togglePostOptionsMenu('${p.id}')"><i class="fas fa-ellipsis-h"></i></button><div class="post-options-menu" id="postOptMenu_${p.id}">${ism ? `<div onclick="event.stopPropagation();window.closeAllPostOptMenus();window.editPost('${p.id}')"><i class="fas fa-edit"></i> تعديل المنشور</div><div onclick="event.stopPropagation();window.closeAllPostOptMenus();window.deletePost('${p.id}')"><i class="fas fa-trash"></i> حذف المنشور</div><div onclick="event.stopPropagation();window.closeAllPostOptMenus();window.copyPostLink('${p.id}')"><i class="fas fa-link"></i> نسخ رابط المنشور</div>` : `<div onclick="event.stopPropagation();window.closeAllPostOptMenus();window.reportPost('${p.id}','${p.author}')"><i class="fas fa-flag"></i> الإبلاغ عن المنشور</div>`}</div></div>`;
    let hl = window.currentUser ? (p.likes && p.likes[window.currentUser]) : false, hi = hl ? '<i class="fas fa-heart" style="color:#ef4444;"></i>' : '<i class="far fa-heart" style="color:#64748b;"></i>', lc = p.likes ? Object.keys(p.likes).length : 0, lt = lc > 0 ? `<span style="font-size:14px;margin-right:5px;color:#64748b;">${lc}</span>` : `<span style="font-size:14px;margin-right:5px;color:#64748b;">إعجاب</span>`;
    let st = window.formatMentions(p.text), pb = '', ca = im ? '' : `onclick="window.openPostModal('${p.id}')"`; let isLongP = p.text && (p.text.length > 200 || p.text.split('\n').length > 3); let pTxt = `<div class="post-content ${isLongP && !im ? 'collapsed' : ''}" id="ptxt_${p.id}">${st}</div>`; if(isLongP && !im) pTxt += `<div class="show-more-btn" onclick="document.getElementById('ptxt_${p.id}').classList.remove('collapsed'); this.style.display='none'; event.stopPropagation();">عرض المزيد</div>`;
    let headerLeft = `<div style="display:flex; gap:10px; align-items:center;"><a href="#/@${p.author}"><img src="${ap}" class="avatar-small"></a><div style="display:flex; flex-direction:column; line-height:1.2;"><div style="display:flex; align-items:center; flex-wrap:wrap; gap:5px;"><a href="#/@${p.author}" class="post-author" style="color:inherit; text-decoration:none;">${ad}</a>${ah} ${abg} ${af} ${tbg}</div><a href="#/post/${p.id}" class="post-time" title="${dtFull}" style="color:inherit; text-decoration:none; margin-top:3px;">${dt}</a></div></div>`;
    if(p.isShare && p.sharedData) { let sap = window.allUsersData[p.sharedData.author]?.profilePic || dA, sst = window.formatMentions(p.sharedData.text), sd = window.getDisplayName(p.sharedData.author); let isLongS = p.sharedData.text && (p.sharedData.text.length > 200 || p.sharedData.text.split('\n').length > 3); let sTxt = `<div class="post-content ${isLongS && !im ? 'collapsed' : ''}" id="stxt_${p.id}" style="font-size:14px;">${sst}</div>`; if(isLongS && !im) sTxt += `<div class="show-more-btn" onclick="document.getElementById('stxt_${p.id}').classList.remove('collapsed'); this.style.display='none'; event.stopPropagation();">عرض المزيد</div>`; pb = `<div class="post-clickable" ${ca}>${pTxt}<div class="shared-post-box" onclick="event.stopPropagation();window.openProfile('${p.sharedData.author}')"><div class="post-header" style="margin-bottom:8px;"><a href="#/@${p.sharedData.author}"><img src="${sap}" class="avatar-small"></a><div style="display:flex; flex-direction:column; line-height:1.2; margin-right:8px;"><a href="#/@${p.sharedData.author}" class="post-author" style="color:inherit; text-decoration:none;">${sd} <span style="font-size:11px;color:#64748b;">@${p.sharedData.author}</span></a><span class="post-time" title="${window.fullDateTime(p.sharedData.timestamp)}">${window.timeAgo(p.sharedData.timestamp)}</span></div></div>${sTxt}${p.sharedData.image || p.sharedData.video ? window.renderMediaGallery(p.sharedData) : ''}</div></div>`; } else { pb = `<div class="post-clickable" ${ca}>${pTxt}${window.renderMediaGallery(p)}</div>`; }
    let cmh = ''; if(p.comments && typeof p.comments === 'object') { let ca = Object.entries(p.comments).map(([id,val]) => ({id,...val})).sort((a,b) => a.timestamp - b.timestamp), cs = im ? ca : ca.slice(-2); cs.forEach(c => { let cPic = window.allUsersData[c.author]?.profilePic || dA, cD = window.getDisplayName(c.author), sct = window.formatMentions(c.text), rh = ''; let cLikes = c.likes && typeof c.likes === 'object' ? c.likes : {}, cLc = Object.keys(cLikes).length, cLiked = window.currentUser && !!cLikes[window.currentUser]; let cLb = window.currentUser ? `<span class="reply-btn" onclick="window.toggleCommentLike('${p.id}','${c.id}',null,this)" style="margin-right:5px;color:${cLiked?'#ef4444':'inherit'};font-weight:${cLiked?'800':'inherit'};">إعجاب${cLc>0?` <span class="lc-count">${cLc}</span>`:''}</span>` : ''; if(c.replies && typeof c.replies === 'object') { Object.entries(c.replies).map(([rid,val]) => ({rid,...val})).sort((a,b) => a.timestamp - b.timestamp).forEach(r => { let rPic = window.allUsersData[r.author]?.profilePic || dA, rD = window.getDisplayName(r.author), srt = window.formatMentions(r.text), srb = im ? `<span class="reply-btn" onclick="window.prepareReply('${c.id}','${r.author}')" style="margin-top:4px;display:inline-block;margin-right:5px;">رد</span>` : ''; let rLikes = r.likes && typeof r.likes === 'object' ? r.likes : {}, rLc = Object.keys(rLikes).length, rLiked = window.currentUser && !!rLikes[window.currentUser]; let rLb = window.currentUser ? `<span class="reply-btn" onclick="window.toggleCommentLike('${p.id}','${c.id}','${r.rid}',this)" style="margin-top:4px;display:inline-block;margin-right:5px;color:${rLiked?'#ef4444':'inherit'};font-weight:${rLiked?'800':'inherit'};">إعجاب${rLc>0?` <span class="lc-count">${rLc}</span>`:''}</span>` : ''; rh += `<div class="comment reply-block" style="margin-bottom:8px;"><a href="#/@${r.author}"><img src="${rPic}" class="avatar-small" style="width:24px;height:24px;"></a><div style="flex:1;"><div class="comment-text-box" style="background:#fff;border:1px solid #e2e8f0;margin-bottom:2px;padding:8px 12px;"><a href="#/@${r.author}" class="comment-author" style="color:inherit; text-decoration:none; display:block;">${rD}</a><div>${srt}</div></div>${rLb}${srb}</div></div>`; }); } let rb = im ? `<span class="reply-btn" onclick="window.prepareReply('${c.id}','${c.author}')">رد</span>` : ''; cmh += `<div class="comment"><a href="#/@${c.author}"><img src="${cPic}" class="avatar-small" style="width:28px;height:28px;"></a><div style="flex:1;"><div class="comment-text-box"><a href="#/@${c.author}" class="comment-author" style="color:inherit; text-decoration:none; display:block;">${cD}</a><div>${sct}</div></div>${cLb}${rb}<div id="replies_${c.id}">${rh}</div></div></div>`; }); if(!im && ca.length > 2) cmh += `<div style="font-size:13px;color:#64748b;cursor:pointer;font-weight:700;margin-top:5px;text-align:center;padding:5px;background:#f1f5f9;border-radius:8px;" onclick="window.openPostModal('${p.id}')">عرض كل التعليقات (${ca.length})</div>`; }
    let cia = (!window.currentUser || cp === 'modal') ? '' : `<div class="comment-input-area"><img src="${window.allUsersData[window.currentUser]?.profilePic || dA}" class="avatar-small" style="width:32px;height:32px;"><input type="text" oninput="window.handleMentionInput(this)" id="commentInp_${cp}_${p.id}" class="comment-input" placeholder="اكتب تعليقاً..." onkeypress="if(event.key==='Enter') window.addComment('${p.id}','${p.author}','${cp}')"><button class="btn-primary" style="padding:8px 15px;border-radius:20px;" onclick="window.addComment('${p.id}','${p.author}','${cp}')"><i class="fas fa-paper-plane"></i></button></div>`;
    let admC = (window.currentUser && window.currentUser.toLowerCase() === 'admin21') ? `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #cbd5e1;display:flex;gap:10px;justify-content:flex-end;"><button onclick="window.warnUser('${p.author}')" style="background:#f59e0b;color:#fff;border:0;padding:5px 12px;border-radius:6px;cursor:pointer;font-weight:bold;font-family:inherit;font-size:12px;"><i class="fas fa-exclamation-triangle"></i> تحذير</button><button onclick="window.adminDeletePost('${p.id}')" style="background:#ef4444;color:#fff;border:0;padding:5px 12px;border-radius:6px;cursor:pointer;font-weight:bold;font-family:inherit;font-size:12px;"><i class="fas fa-trash"></i> حذف إداري</button></div>` : '';
    return `<div class="post"><div class="post-header">${headerLeft}${ch}</div>${pb}<div class="post-actions-bar"><button class="action-btn" data-count="${lc}" onclick="window.toggleLike('${p.id}','${p.author}',this)"><i class="${hl?'fas':'far'} fa-heart" style="${hl ? 'color:#ef4444;' : 'color:#64748b;'}"></i> <span class="lc-count">${lt}</span></button><button class="action-btn" onclick="${im ? `$('modalCommentInput').focus()` : `window.openPostModal('${p.id}')`}"><i class="far fa-comment-alt"></i> تعليق</button><button class="action-btn" onclick="window.openShareModal('${p.id}')"><i class="fas fa-share"></i> مشاركة</button></div><div class="comments-section" id="modalCommentsSection">${cmh}${cia}</div>${admC}</div>`;
}
window.createPostHTML = createPostHTML;
function renderFeed() {
    let pf = document.getElementById('postsFeed'); if(!window.currentUser) { if(pf) pf.innerHTML = ''; return; }
    let h='', sg=window.getSuggestions?window.getSuggestions():[], iN=window.currentUser?window.myFriends.length===0:true, vp=[], reg=[], tr=[];
    let myFollowing = (window.allUsersData[window.currentUser]?.following) || {};
    (window.allNewsPosts || []).filter(p => myFollowing[p.author]).forEach(p => vp.push({p:p, it:false}));
    window.allPosts.forEach(p => {
        if(!window.renderedPostIds.has(p.id)) return;
        let im = p.author === window.currentUser;
        let ifR = window.myFriends.includes(p.author);
        let lc = p.likes ? Object.keys(p.likes).length : 0;
        let it = lc >= 10;
        if(im || ifR) vp.push({p:p, it:it});
        else if(it) tr.push({p:p, it:true});
    });
    let t_i = 0;
    let final = [...vp];
    if(!iN) {
        for(let i=0; i<vp.length; i++) {
            if((i+1)%10===0 && t_i<tr.length) { final.splice(i+1, 0, tr[t_i]); t_i++; }
        }
    } else {
        final = [...vp, ...tr];
    }
    final.sort((a,b) => (b.p.timestamp||0) - (a.p.timestamp||0));
    final.slice(0, window.feedLim || 5).forEach((v,i) => {
        h += window.createPostHTML(v.p, 'feed', v.it, false);
        if(window.currentUser && (i+1)%4===0 && sg.length>0) h += window.createSuggestedFriendsWidget();
        if(window.currentUser && i>0 && i%5===0) h += window.generateReelsWidgetHTML();
        // إعلان ممول كل 7 منشورات
        if(window.activeAds && window.activeAds.length > 0 && (i+1) % 7 === 0) h += window.getActiveAdHTML();
    });
    if(pf) { pf.innerHTML = h || '<p style="text-align:center;color:#666;padding:20px;">المنشورات تظهر هنا.</p>'; document.querySelectorAll('#postsFeed video').forEach(v => window.videoObserver.observe(v)); }
}
window.renderFeed = renderFeed;
window.toggleLike = (id, htmlAuthor, btn) => {
    if(!window.currentUser) return window.showRegisterModal();
    let cachedPost = window.postCache[id] || (window.allNewsPosts || []).find(x => x.id === id);
    let isNewsBotPost = cachedPost ? !!cachedPost.isNewsBot : !!(window.allUsersData[htmlAuthor]?.isNewsBot);
    let r = ref(db, `${isNewsBotPost ? 'newsPosts' : 'posts'}/${id}/likes/${window.currentUser}`);
    let i = btn ? btn.querySelector('i') : null, sp = btn ? btn.querySelector('.lc-count') : null;
    let wasLiked = i ? i.classList.contains('fas') : false;
    // تحديث فوري للواجهة (متفائل) قبل تأكيد الخادم — يجعل التفاعل سريعًا وحيويًا
    if (btn) {
        let count = parseInt(btn.dataset.count, 10); if (isNaN(count)) count = 0;
        if (wasLiked) {
            if (i) { i.className = 'far fa-heart'; i.style.color = '#64748b'; }
            count = Math.max(0, count - 1);
        } else {
            if (i) { i.className = 'fas fa-heart'; i.style.color = '#ef4444'; i.style.animation = 'likePopAnim .45s ease'; setTimeout(() => { if (i) i.style.animation = ''; }, 450); }
            count = count + 1;
            window.playLikeSound();
        }
        btn.dataset.count = count;
        if (sp) sp.innerText = count > 0 ? count : 'إعجاب';
    }
    get(r).then(s => {
        if (s.exists()) { remove(r); }
        else { set(r, true).then(() => { let p = cachedPost || window.allPosts.find(x => x.id === id), tg = p ? p.author : htmlAuthor; if (tg && tg !== window.currentUser) push(ref(db, `users/${tg}/notifications`), {type:'like', from:window.currentUser, postId:id, timestamp:Date.now(), read:false}); }); }
    });
};
window.playLikeSound = () => {
    try {
        const ctx = window._likeAudioCtx || (window._likeAudioCtx = new (window.AudioContext || window.webkitAudioContext)());
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(740, now);
        o.frequency.exponentialRampToValueAtTime(1180, now + 0.09);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        o.connect(g); g.connect(ctx.destination);
        o.start(now); o.stop(now + 0.35);
    } catch(e) {}
};
window.toggleCommentLike = (postId, commentId, replyId, btn) => {
    if(!window.currentUser) return window.showRegisterModal();
    let base = replyId ? `posts/${postId}/comments/${commentId}/replies/${replyId}` : `posts/${postId}/comments/${commentId}`;
    let r = ref(db, `${base}/likes/${window.currentUser}`);
    get(r).then(s => {
        if(s.exists()) {
            remove(r);
            if(btn) { btn.style.color = 'inherit'; btn.style.fontWeight = 'inherit'; let sp = btn.querySelector('.lc-count'); if(sp) { let nv = parseInt(sp.innerText) - 1; if(nv > 0) sp.innerText = nv; else sp.remove(); } }
        } else {
            set(r, true).then(() => {
                if(btn) { btn.style.color = '#ef4444'; btn.style.fontWeight = '800'; let sp = btn.querySelector('.lc-count'); if(sp) sp.innerText = parseInt(sp.innerText) + 1; else btn.insertAdjacentHTML('beforeend', ' <span class="lc-count">1</span>'); }
                window.playLikeSound();
                get(ref(db, base)).then(cs => {
                    if(cs.exists()) {
                        let cv = cs.val(), targetAuthor = cv.author;
                        if(targetAuthor && targetAuthor !== window.currentUser) {
                            push(ref(db, `users/${targetAuthor}/notifications`), {type:'comment_like', from:window.currentUser, postId:postId, timestamp:Date.now(), read:false});
                        }
                    }
                });
            });
        }
    });
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
window.renderPostModalLogic = (p) => { $('modalPostId').value = p.id; $('modalPostAuthor').value = p.author; $('modalReplyToId').value = ""; $('modalCommentInput').placeholder = "تعليق..."; let lc = p.likes ? Object.keys(p.likes).length : 0, it = lc >= 10; $('postModalBody').innerHTML = window.createPostHTML(p, 'modal', it, true); let pf = $('postModalFooter'); if(pf) pf.style.display = window.currentUser ? 'flex' : 'none'; let closeBtn = $('postModalCloseBtn'); if(closeBtn) closeBtn.style.display = 'flex'; $('postModal').classList.add('show'); document.body.style.overflow = 'hidden'; document.querySelectorAll('#postModalBody video').forEach(v => window.videoObserver.observe(v)); };
window.prepareReply = (id, a) => { if(!window.currentUser) return window.showRegisterModal(); $('modalReplyToId').value = id; let i = $('modalCommentInput'); if(!i.value.includes(`@${a}`)) i.value = `@${a} ` + i.value; i.focus(); };
window.submitModalComment = () => { if(!window.currentUser) return window.showRegisterModal(); let pid = $('modalPostId').value, pAuthor = $('modalPostAuthor').value, rid = $('modalReplyToId').value, i = $('modalCommentInput'), t = i.value.trim(); if(!t) return; let rp = rid ? `posts/${pid}/comments/${rid}/replies` : `posts/${pid}/comments`; push(ref(db, rp), {author:window.currentUser, text:t, timestamp:Date.now()}).then(() => { let p = window.postCache[pid] || window.allPosts.find(x => x.id === pid); if(rid) { if(p && p.comments && p.comments[rid]) { let ca = p.comments[rid].author; if(ca && ca !== window.currentUser) push(ref(db, `users/${ca}/notifications`), {type:'reply', from:window.currentUser, postId:pid, timestamp:Date.now(), read:false}); } } else { let tg = p ? p.author : pAuthor; if(tg && tg !== window.currentUser) push(ref(db, `users/${tg}/notifications`), {type:'comment', from:window.currentUser, postId:pid, timestamp:Date.now(), read:false}); } window.myFriends.forEach(f => { if(t.includes('@'+f)) push(ref(db, `users/${f}/notifications`), {type:'mention', from:window.currentUser, postId:pid, timestamp:Date.now(), read:false}); }); }); i.value = ''; $('modalReplyToId').value = ''; i.placeholder = "تعليق..."; let mb = $('postModalBody'); setTimeout(() => mb.scrollTop = mb.scrollHeight, 100); $('globalMentionBox').style.display = 'none'; };
window.executeShare = () => {
    if(!window.currentUser) return window.showRegisterModal();
    let id = $('sharePostId').value, c = $('shareCaption').value.trim(),
        p = window.postCache[id] || window.allPosts.find(x => x.id === id);
    if(!p) return;
    let oa = p.isShare ? p.sharedData.author : p.author,
        ot = p.isShare ? p.sharedData.text : p.text,
        oi = p.isShare ? p.sharedData.image : p.image,
        ov = p.isShare ? p.sharedData.video : p.video,
        ap = window.allUsersData[oa]?.profilePic || dA,
        st = window.formatMentions(ot), dn = window.getDisplayName(oa);
    $('sharePreview').innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><img src="${ap}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;"><strong style="font-size:14px;">${dn}</strong></div><div style="font-size:14px;margin-bottom:8px;">${st}</div>${oi ? `<img src="${oi}" style="width:100%;max-height:150px;object-fit:cover;border-radius:8px;">` : ''}${ov ? `<video src="${ov}" style="width:100%;max-height:150px;background:#000;border-radius:8px;"></video>` : ''}`;
    $('shareModal').classList.add('show');
    document.body.style.overflow = 'hidden';
};
window.publishShare = () => {
    if(!window.currentUser) return window.showRegisterModal();
    let id = $('sharePostId').value, c = $('shareCaption').value.trim(),
        p = window.postCache[id] || window.allPosts.find(x => x.id === id);
    if(!p) return;
    let btn = document.querySelector('#shareModal .btn-primary'), ot = btn ? btn.innerHTML : '';
    if(btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري النشر...'; btn.disabled = true; }
    let oa = p.isShare ? p.sharedData.author : p.author,
        sd = { author: oa, text: p.isShare ? p.sharedData.text : p.text,
               image: p.isShare ? p.sharedData.image : (p.image || null),
               video: p.isShare ? p.sharedData.video : (p.video || null),
               timestamp: p.isShare ? p.sharedData.timestamp : p.timestamp };
    push(ref(db, 'posts'), { author: window.currentUser, text: c, isShare: true, sharedData: sd, timestamp: Date.now() })
    .then(nr => {
        window.myFriends.forEach(f => { if(c.includes('@'+f)) push(ref(db, `users/${f}/notifications`), {type:'mention', from:window.currentUser, postId:nr.key, timestamp:Date.now(), read:false}); });
        if(oa !== window.currentUser) push(ref(db, `users/${oa}/notifications`), {type:'share', from:window.currentUser, postId:id, timestamp:Date.now(), read:false});
        window.closeSharePopup();
        $('shareCaption').value = '';
        window.location.hash = '';
        if(btn) { btn.innerHTML = ot; btn.disabled = false; }
    }).catch(() => { if(btn) { btn.innerHTML = ot; btn.disabled = false; } });
};
window.togglePostOptionsMenu = (id) => {
    let m = document.getElementById(`postOptMenu_${id}`); if(!m) return;
    let isOpen = m.classList.contains('show');
    window.closeAllPostOptMenus();
    if (!isOpen) m.classList.add('show');
};
window.closeAllPostOptMenus = () => { document.querySelectorAll('.post-options-menu.show').forEach(m => m.classList.remove('show')); };
document.addEventListener('click', () => window.closeAllPostOptMenus());
const OG_WORKER = 'https://red-snowflake-1dad.tarek-hammam-print.workers.dev';
window.getShareLink = (id) => `${OG_WORKER}/og?post=${id}`;
window.copyPostLink = (id) => {
    let link = window.getShareLink(id);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => window.dlgAlert('تم نسخ رابط المنشور ✅\nعند مشاركته على فيسبوك/واتساب سيظهر العنوان والصورة تلقائياً.', 'success', 'تم النسخ')).catch(() => window.dlgAlert(link, 'info', 'رابط المنشور'));
    } else {
        window.dlgAlert(link, 'info', 'رابط المنشور');
    }
};
window.reportPost = (postId, postAuthor) => {
    if (!window.currentUser) return window.showRegisterModal();
    if (postAuthor === window.currentUser) return;
    window.dlgPrompt('سبب الإبلاغ (اختياري):', '', 'مثال: محتوى مخالف، تنمر، إزعاج...').then(reason => {
        if (reason === null) return; // المستخدم ألغى
        push(ref(db, 'reports'), {
            postId: postId,
            postAuthor: postAuthor,
            reportedBy: window.currentUser,
            reason: (reason || '').trim() || 'بدون سبب محدد',
            timestamp: Date.now(),
            status: 'pending'
        }).then(() => {
            window.dlgAlert('تم استلام بلاغك، شكراً لمساعدتك في الحفاظ على المنصة 🙏', 'success', 'تم الإبلاغ');
        }).catch(() => window.dlgAlert('حدث خطأ، حاول مرة أخرى.', 'danger', 'خطأ'));
    });
};
function listenToNewsBotPosts() {
    onValue(query(ref(db, 'newsPosts'), orderByChild('timestamp'), limitToLast(50)), s => {
        window.allNewsPosts = [];
        if (s.exists()) {
            s.forEach(c => { let p = c.val(); p.id = c.key; window.allNewsPosts.push(p); window.postCache[p.id] = p; });
            window.allNewsPosts.sort((a, b) => b.timestamp - a.timestamp);
        }
        if (window.currentUser && !window.isInitialLoad) { window.feedLim = 5; window.renderFeed(); }
    });
}
window.listenToNewsBotPosts = listenToNewsBotPosts;
window._listenToNewsBotPosts = window.listenToNewsBotPosts;
window._renderFeed = window.renderFeed;
