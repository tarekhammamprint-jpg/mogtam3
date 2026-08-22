import { ref, get, set, update, push, remove, onValue, query, limitToLast, orderByChild } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const defCover = "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80";

const uploadImg = async (file) => {
    let fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', 'mogtam3_unsigned');
    let r = await fetch('https://api.cloudinary.com/v1_1/dkqxnmdhq/image/upload', { method:'POST', body:fd });
    return (await r.json()).secure_url;
};

const gN = (u) => window.getDisplayName ? window.getDisplayName(u) : (window.allUsersData?.[u]?.displayName || u);
const tA = (t) => window.timeAgo ? window.timeAgo(t) : '';
const notif = (to, type, extra={}) => {
    if(!to || to === window.currentUser) return;
    push(ref(db,`users/${to}/notifications`), {type, from:window.currentUser, timestamp:Date.now(), read:false, ...extra});
};

/* ─── فتح قائمة المجتمعات ─── */
window.openCommunitiesModal = () => {
    if(!window.currentUser) return window.showRegisterModal();
    $('communitiesModal').classList.add('show');
    document.body.style.overflow = 'hidden';
    renderCommList();
};

/* ─── إنشاء مجتمع ─── */
window.createCommunity = async () => {
    let name = $('communityNameInput')?.value.trim();
    let desc = $('communityDescInput')?.value.trim();
    if(!name) return window.dlgAlert('أدخل اسم المجتمع','warning');
    let btn = $('createCommunityBtn');
    btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> جاري...';
    await set(push(ref(db,'communities')), {
        name, description:desc||'', admin:window.currentUser,
        timestamp:Date.now(), members:{[window.currentUser]:true}, coverPhoto:'', avatar:''
    });
    $('communityNameInput').value=''; $('communityDescInput').value='';
    btn.disabled=false; btn.innerHTML='<i class="fas fa-plus"></i> إنشاء المجتمع';
    window.dlgAlert('تم إنشاء المجتمع! 🎉','success');
};

/* ─── قائمة المجتمعات ─── */
function renderCommList() {
    let area = $('communitiesListArea'); if(!area) return;
    let comms = window.allCommunities || {};
    let html = '';
    Object.entries(comms).forEach(([id,c]) => {
        let isMem = c.members?.[window.currentUser];
        let isPend = c.requests?.[window.currentUser];
        let isAdm = c.admin === window.currentUser;
        let mc = c.members ? Object.keys(c.members).length : 0;
        let cover = c.coverPhoto || defCover;
        let ava = c.avatar ? `<img src="${c.avatar}" style="width:54px;height:54px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.15);" onerror="this.style.display='none'">` : `<div style="width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#2a5298);border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;font-weight:900;">${c.name?.charAt(0)||'م'}</div>`;
        let btn = isMem
            ? `<button onclick="window.openCommunityView('${id}')" style="background:linear-gradient(135deg,#6366f1,#2a5298);color:#fff;border:none;padding:8px 18px;border-radius:999px;font-family:Cairo,sans-serif;font-weight:700;font-size:13px;cursor:pointer;"><i class="fas fa-door-open"></i> فتح</button>`
            : isPend
            ? `<button disabled style="background:#f1f5f9;color:#94a3b8;border:none;padding:8px 16px;border-radius:999px;font-family:Cairo,sans-serif;font-weight:700;font-size:13px;"><i class="fas fa-clock"></i> قيد الانتظار</button>`
            : `<button onclick="window.requestJoinCommunity('${id}')" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:8px 18px;border-radius:999px;font-family:Cairo,sans-serif;font-weight:700;font-size:13px;cursor:pointer;"><i class="fas fa-user-plus"></i> انضمام</button>`;
        html += `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;margin-bottom:14px;box-shadow:0 2px 8px rgba(15,23,42,.05);">
            <div style="height:85px;background:url('${cover}') center/cover no-repeat;position:relative;">
                <div style="position:absolute;bottom:-26px;right:14px;">${ava}</div>
                ${isAdm ? '<div style="position:absolute;top:8px;left:8px;background:rgba(99,102,241,.9);color:#fff;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;"><i class="fas fa-crown"></i> مسئول</div>' : isMem ? '<div style="position:absolute;top:8px;left:8px;background:rgba(16,185,129,.85);color:#fff;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;"><i class="fas fa-check"></i> مشترك</div>' : ''}
            </div>
            <div style="padding:34px 14px 14px;">
                <div style="font-size:15px;font-weight:900;color:#0f172a;margin-bottom:3px;">${c.name}</div>
                <div style="font-size:13px;color:#64748b;margin-bottom:10px;">${c.description||''}</div>
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <span style="font-size:12px;color:#94a3b8;"><i class="fas fa-users" style="color:#6366f1;"></i> ${mc} عضو</span>
                    ${btn}
                </div>
            </div>
        </div>`;
    });
    area.innerHTML = html || '<div style="text-align:center;padding:30px;color:#94a3b8;"><i class="fas fa-users" style="font-size:36px;display:block;margin-bottom:10px;"></i>لا توجد مجتمعات</div>';
}
window.renderCommunitiesList = renderCommList;

/* ─── طلب الانضمام ─── */
window.requestJoinCommunity = (id) => {
    let c = window.allCommunities[id];
    update(ref(db,`communities/${id}/requests`), {[window.currentUser]:Date.now()}).then(() => {
        if(c?.admin) notif(c.admin,'community_join_request',{communityId:id,communityName:c.name});
        renderCommList();
    });
};

/* ─── فتح صفحة المجتمع ─── */
window.openCommunityView = (id) => {
    window.currentCommunityId = id;
    $('communitiesModal')?.classList.remove('show');
    // استخدم modal موجود بدل فتح صفحة جديدة
    let vm = $('communityViewModal');
    if(!vm) return;
    vm.classList.add('show');
    document.body.style.overflow = 'hidden';
    buildCommPage(id);
};

function buildCommPage(id) {
    let c = window.allCommunities[id]; if(!c) return;
    let isAdm = c.admin === window.currentUser;
    let mc2 = c.members ? Object.keys(c.members).length : 0;
    let rc = c.requests ? Object.keys(c.requests).length : 0;
    let cover = c.coverPhoto || defCover;
    let ava = c.avatar ? `<img src="${c.avatar}" style="width:76px;height:76px;border-radius:50%;object-fit:cover;border:4px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.2);" onerror="this.style.display='none'">` : `<div style="width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#2a5298);border:4px solid #fff;display:flex;align-items:center;justify-content:center;font-size:28px;color:#fff;font-weight:900;">${c.name?.charAt(0)||'م'}</div>`;
    let myPic = window.allUsersData?.[window.currentUser]?.profilePic || dA;

    let container = $('communityViewModal')?.querySelector('.modal-content');
    if(!container) return;
    container.style.cssText = 'padding:0;max-width:800px;';
    container.innerHTML = `
        <!-- إغلاق -->
        <button onclick="window.closeModal('communityViewModal')" style="position:fixed;top:80px;right:18px;width:40px;height:40px;background:#fff;border:1px solid #e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:300;box-shadow:0 2px 8px rgba(0,0,0,.12);"><i class="fas fa-times" style="color:#64748b;font-size:14px;"></i></button>
        <!-- غلاف -->
        <div style="height:190px;background:url('${cover}') center/cover no-repeat;position:relative;flex-shrink:0;">
            <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.05),rgba(0,0,0,.4));"></div>
            ${isAdm?`<label style="position:absolute;bottom:12px;left:12px;background:rgba(0,0,0,.6);color:#fff;padding:6px 13px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;z-index:2;"><i class="fas fa-camera"></i>تغيير الغلاف<input type="file" accept="image/*" style="display:none;" onchange="window.uploadCommCover('${id}',this)"></label>`:''}
            <div style="position:absolute;bottom:-38px;right:18px;z-index:2;">
                <div style="position:relative;display:inline-block;">${ava}${isAdm?`<label style="position:absolute;bottom:0;left:0;width:26px;height:26px;background:#6366f1;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;border:2px solid #fff;"><i class="fas fa-camera" style="color:#fff;font-size:10px;"></i><input type="file" accept="image/*" style="display:none;" onchange="window.uploadCommAvatar('${id}',this)"></label>`:''}</div>
            </div>
        </div>
        <!-- معلومات -->
        <div style="padding:48px 20px 16px;border-bottom:1px solid #e2e8f0;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div>
                    <div style="font-size:20px;font-weight:900;color:#0f172a;margin-bottom:3px;">${c.name}</div>
                    <div style="font-size:13px;color:#64748b;margin-bottom:7px;">${c.description||''}</div>
                    <div style="font-size:12px;color:#94a3b8;"><i class="fas fa-users" style="color:#6366f1;"></i> ${mc2} عضو &nbsp;·&nbsp;<i class="fas fa-crown" style="color:#f59e0b;"></i> ${gN(c.admin)}</div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button onclick="window.commManageMembers('${id}')" style="background:#f1f5f9;border:1.5px solid #e2e8f0;color:#334155;padding:8px 16px;border-radius:999px;font-family:Cairo,sans-serif;font-weight:700;font-size:13px;cursor:pointer;"><i class="fas fa-users"></i> الأعضاء</button>
                    ${isAdm?`<button onclick="window.commManageRequests('${id}')" style="background:${rc>0?'#fef3c7':'#f1f5f9'};border:1.5px solid ${rc>0?'#fde68a':'#e2e8f0'};color:${rc>0?'#92400e':'#334155'};padding:8px 16px;border-radius:999px;font-family:Cairo,sans-serif;font-weight:700;font-size:13px;cursor:pointer;"><i class="fas fa-user-plus"></i> الطلبات ${rc>0?`<span style="background:#f59e0b;color:#fff;border-radius:999px;padding:1px 7px;font-size:11px;">${rc}</span>`:''}</button>`:''}
                </div>
            </div>
        </div>
        <!-- صندوق النشر -->
        <div style="padding:14px 18px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:13px;">
                <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:11px;">
                    <img src="${myPic}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.src='${dA}'">
                    <textarea id="communityPostContent" placeholder="شارك شيئاً مع أعضاء ${c.name}..." rows="2" style="flex:1;border:1.5px solid #e2e8f0;border-radius:11px;padding:9px 13px;font-family:Cairo,sans-serif;font-size:14px;resize:none;outline:none;direction:rtl;box-sizing:border-box;width:100%;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e2e8f0'"></textarea>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;padding-top:9px;border-top:1px solid #f1f5f9;">
                    <div style="display:flex;gap:7px;">
                        <label style="display:inline-flex;align-items:center;gap:5px;color:#6366f1;background:#eef2ff;border:1.5px solid #c7d2fe;border-radius:999px;padding:6px 12px;cursor:pointer;font-family:Cairo,sans-serif;font-weight:700;font-size:12px;"><i class="fas fa-image"></i> صورة<input type="file" accept="image/*" style="display:none;" onchange="window.commSelectMedia(event,'image')"></label>
                        <label style="display:inline-flex;align-items:center;gap:5px;color:#ca8a04;background:#fefce8;border:1.5px solid #fde68a;border-radius:999px;padding:6px 12px;cursor:pointer;font-family:Cairo,sans-serif;font-weight:700;font-size:12px;"><i class="fas fa-video"></i> فيديو<input type="file" accept="video/*" style="display:none;" onchange="window.commSelectMedia(event,'video')"></label>
                    </div>
                    <button id="publishCommBtn" onclick="window.publishCommunityPost()" style="background:linear-gradient(135deg,#6366f1,#2a5298);color:#fff;border:none;padding:8px 20px;border-radius:999px;font-family:Cairo,sans-serif;font-weight:800;font-size:14px;cursor:pointer;"><i class="fas fa-paper-plane"></i> نشر</button>
                </div>
                <div id="commMediaPreview" style="display:none;margin-top:9px;position:relative;border-radius:10px;overflow:hidden;">
                    <div id="commMediaPreviewInner"></div>
                    <button onclick="window.commClearMedia()" style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,.6);border:none;color:#fff;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:11px;"><i class="fas fa-times"></i></button>
                </div>
                <div id="commUploadProgress" style="display:none;margin-top:7px;">
                    <div style="background:#e2e8f0;border-radius:999px;height:5px;overflow:hidden;"><div id="commProgressBar" style="height:100%;background:linear-gradient(135deg,#6366f1,#0ea5e9);width:0%;transition:width .2s;border-radius:999px;"></div></div>
                    <div id="commProgressText" style="font-size:11px;color:#64748b;margin-top:3px;text-align:center;font-weight:700;"></div>
                </div>
            </div>
        </div>
        <!-- الفيد -->
        <div id="communityFeedArea"><div style="text-align:center;padding:30px;color:#94a3b8;"><i class="fas fa-spinner fa-spin" style="font-size:20px;"></i></div></div>
    `;
    loadCommFeed(id);
}

/* ─── رفع غلاف / أفاتار ─── */
window.uploadCommCover = async (id, inp) => {
    let f = inp.files[0]; if(!f) return;
    let url = await uploadImg(f);
    await update(ref(db,`communities/${id}`), {coverPhoto:url});
    buildCommPage(id);
};
window.uploadCommAvatar = async (id, inp) => {
    let f = inp.files[0]; if(!f) return;
    let url = await uploadImg(f);
    await update(ref(db,`communities/${id}`), {avatar:url});
    buildCommPage(id);
};

/* ─── ميديا المنشور ─── */
window._commMedia = null;
window.commSelectMedia = (e, type) => {
    let f = e.target.files[0]; if(!f) return;
    window._commMedia = {file:f, type};
    let url = URL.createObjectURL(f);
    let prev = $('commMediaPreview'), inner = $('commMediaPreviewInner');
    if(inner) inner.innerHTML = type==='image' ? `<img src="${url}" style="width:100%;max-height:260px;object-fit:contain;">` : `<video src="${url}" controls style="width:100%;max-height:260px;"></video>`;
    if(prev) prev.style.display='block';
};
window.commClearMedia = () => {
    window._commMedia = null;
    let p = $('commMediaPreview'); if(p) p.style.display='none';
};

/* ─── نشر منشور ─── */
window.publishCommunityPost = async () => {
    if(!window.currentUser) return;
    let id = window.currentCommunityId; if(!id) return;
    let txt = $('communityPostContent')?.value.trim();
    let media = window._commMedia;
    if(!txt && !media) return window.dlgAlert('اكتب شيئاً أو اختر صورة','warning');
    let btn = $('publishCommBtn');
    btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i>';
    let data = {author:window.currentUser, text:txt||'', timestamp:Date.now()};
    if(media) {
        let prog=$('commUploadProgress'), bar=$('commProgressBar');
        if(prog) prog.style.display='block';
        if(bar) bar.style.width='40%';
        let url = await uploadImg(media.file);
        if(bar) bar.style.width='100%';
        if(media.type==='image') data.image=url; else data.video=url;
        if(prog) prog.style.display='none';
    }
    await push(ref(db,`communityPosts/${id}`), data);
    let c = window.allCommunities[id];
    if(c?.members) Object.keys(c.members).forEach(u => notif(u,'community_new_post',{communityId:id,communityName:c.name}));
    $('communityPostContent').value='';
    window.commClearMedia();
    btn.disabled=false; btn.innerHTML='<i class="fas fa-paper-plane"></i> نشر';
};

/* ─── فيد المجتمع ─── */
function loadCommFeed(id) {
    let area = $('communityFeedArea'); if(!area) return;
    if(window._commListener) { window._commListener(); window._commListener=null; }
    let c = window.allCommunities[id];
    let isAdm = c?.admin === window.currentUser;
    window._commListener = onValue(
        query(ref(db,`communityPosts/${id}`), orderByChild('timestamp'), limitToLast(40)),
        s => {
            let posts=[];
            if(s.exists()) { s.forEach(x => posts.push({...x.val(),id:x.key})); posts.sort((a,b)=>b.timestamp-a.timestamp); }
            if(!posts.length) { area.innerHTML='<div style="text-align:center;padding:40px;color:#94a3b8;"><i class="fas fa-comments" style="font-size:36px;display:block;margin-bottom:10px;"></i>لا توجد منشورات</div>'; return; }
            area.innerHTML = posts.map(p=>buildPost(p,id,isAdm||p.author===window.currentUser)).join('');
        }
    );
}
window.renderCommunityFeed = loadCommFeed;

function buildPost(p, cid, canDel) {
    let ap = window.allUsersData?.[p.author]?.profilePic || dA;
    let ad = gN(p.author);
    let lc = p.likes ? Object.keys(p.likes).length : 0;
    let hl = p.likes?.[window.currentUser];
    let cc = p.comments ? Object.keys(p.comments).length : 0;
    let myPic = window.allUsersData?.[window.currentUser]?.profilePic || dA;

    let mediaHtml = '';
    if(p.image) mediaHtml=`<img src="${p.image}" style="width:100%;max-height:380px;object-fit:cover;border-radius:12px;margin-bottom:12px;cursor:pointer;" onerror="this.style.display='none'">`;
    else if(p.video) mediaHtml=`<video src="${p.video}" controls playsinline style="width:100%;max-height:380px;border-radius:12px;margin-bottom:12px;background:#000;"></video>`;

    let comHtml = '';
    if(p.comments) {
        Object.entries(p.comments).sort((a,b)=>a[1].timestamp-b[1].timestamp).slice(-3).forEach(([,cm])=>{
            let cp=window.allUsersData?.[cm.author]?.profilePic||dA;
            comHtml+=`<div style="display:flex;gap:7px;margin-bottom:7px;"><img src="${cp}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.src='${dA}'"><div style="background:#f1f5f9;border-radius:0 11px 11px 11px;padding:6px 10px;flex:1;"><div style="font-weight:800;font-size:12px;color:#334155;">${gN(cm.author)}</div><div style="font-size:13px;">${cm.text||''}</div></div></div>`;
        });
    }

    return `<div style="padding:18px 20px;border-bottom:8px solid #f0f4f8;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:11px;">
            <div style="display:flex;align-items:center;gap:9px;cursor:pointer;" onclick="window.openProfile('${p.author}')">
                <img src="${ap}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1.5px solid #e2e8f0;" onerror="this.src='${dA}'">
                <div><div style="font-weight:800;font-size:14px;color:#0f172a;">${ad}</div><div style="font-size:11px;color:#94a3b8;">${tA(p.timestamp)}</div></div>
            </div>
            ${canDel?`<button onclick="window.delCommPost('${cid}','${p.id}')" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:6px;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#fee2e2';this.style.color='#ef4444'" onmouseout="this.style.background='none';this.style.color='#94a3b8'"><i class="fas fa-trash-alt"></i></button>`:''}
        </div>
        ${p.text?`<div style="font-size:15px;line-height:1.8;color:#0f172a;margin-bottom:12px;text-align:right;">${p.text}</div>`:''}
        ${mediaHtml}
        <div style="display:flex;justify-content:space-around;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;padding:5px 0;margin-bottom:10px;">
            <button id="likeBtn_${p.id}" onclick="window.likeCommPost('${cid}','${p.id}',this)" style="flex:1;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;border-radius:10px;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;color:${hl?'#ef4444':'#64748b'};">
                <i class="${hl?'fas':'far'} fa-heart" style="font-size:16px;"></i> ${lc||'إعجاب'}
            </button>
            <button onclick="$('cInp_${p.id}')?.focus()" style="flex:1;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;border-radius:10px;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;color:#64748b;">
                <i class="far fa-comment-alt" style="font-size:16px;"></i> ${cc||'تعليق'}
            </button>
        </div>
        <div style="padding:0 2px;">
            ${comHtml}
            <div style="display:flex;gap:8px;align-items:center;margin-top:7px;">
                <img src="${myPic}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.src='${dA}'">
                <div style="flex:1;display:flex;gap:6px;align-items:center;">
                    <input type="text" id="cInp_${p.id}" placeholder="اكتب تعليقاً..."
                        style="flex:1;border:1.5px solid #e2e8f0;border-radius:999px;padding:8px 13px;font-family:Cairo,sans-serif;font-size:13px;outline:none;direction:rtl;"
                        onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e2e8f0'"
                        onkeypress="if(event.key==='Enter')window.addCommComment('${cid}','${p.id}')">
                    <button onclick="window.addCommComment('${cid}','${p.id}')" style="background:linear-gradient(135deg,#6366f1,#2a5298);color:#fff;border:none;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-paper-plane" style="font-size:12px;"></i></button>
                </div>
            </div>
        </div>
    </div>`;
}

/* ─── إعجاب ─── */
window.likeCommPost = (cid, pid, btn) => {
    if(!window.currentUser) return;
    let r = ref(db,`communityPosts/${cid}/${pid}/likes/${window.currentUser}`);
    get(r).then(s => {
        let liked = s.exists();
        if(liked) remove(r); else set(r, true);
        if(btn) {
            btn.style.color = liked ? '#64748b' : '#ef4444';
            let icon = btn.querySelector('i');
            if(icon) icon.className = liked ? 'far fa-heart' : 'fas fa-heart';
            let txt = btn.textContent.trim().replace(/[٠-٩0-9]+/,'').trim();
        }
    });
};

/* ─── تعليق ─── */
window.addCommComment = (cid, pid) => {
    if(!window.currentUser) return;
    let inp = $(`cInp_${pid}`); if(!inp) return;
    let txt = inp.value.trim(); if(!txt) return;
    let myPic = window.allUsersData?.[window.currentUser]?.profilePic || dA;
    let myName = gN(window.currentUser);
    // أضف في DOM فوراً
    let row = inp.closest('div[style*="padding:0 2px"]');
    if(row) {
        let el = document.createElement('div');
        el.style.cssText = 'display:flex;gap:7px;margin-bottom:7px;';
        el.innerHTML = `<img src="${myPic}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.src='${dA}'"><div style="background:#f1f5f9;border-radius:0 11px 11px 11px;padding:6px 10px;flex:1;"><div style="font-weight:800;font-size:12px;color:#334155;">${myName}</div><div style="font-size:13px;">${txt}</div></div>`;
        let inputRow = inp.closest('div[style*="display:flex;gap:8px"]');
        if(inputRow) row.insertBefore(el, inputRow);
    }
    inp.value = '';
    push(ref(db,`communityPosts/${cid}/${pid}/comments`), {author:window.currentUser, text:txt, timestamp:Date.now()});
};

/* ─── حذف منشور ─── */
window.delCommPost = (cid, pid) => {
    window.dlgDanger('هل تريد حذف هذا المنشور؟').then(ok => {
        if(ok) remove(ref(db,`communityPosts/${cid}/${pid}`));
    });
};

/* ─── إدارة الأعضاء ─── */
window.commManageMembers = (id) => {
    let c = window.allCommunities[id]; if(!c) return;
    let isAdm = c.admin === window.currentUser;
    let area = $('communityFeedArea'); if(!area) return;
    let html = `<div style="padding:18px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <button onclick="window.renderCommunityFeed('${id}')" style="background:#f1f5f9;border:none;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="fas fa-arrow-right" style="color:#64748b;"></i></button>
            <div style="font-size:16px;font-weight:900;color:#0f172a;">الأعضاء (${Object.keys(c.members||{}).length})</div>
        </div>`;
    Object.keys(c.members||{}).forEach(uid => {
        let d=window.allUsersData[uid], name=gN(uid), pic=d?.profilePic||dA;
        html+=`<div style="display:flex;align-items:center;justify-content:space-between;padding:11px;border-radius:13px;margin-bottom:7px;background:#f8fafc;border:1px solid #e2e8f0;">
            <div style="display:flex;align-items:center;gap:9px;cursor:pointer;" onclick="window.openProfile('${uid}')">
                <img src="${pic}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" onerror="this.src='${dA}'">
                <div><div style="font-weight:800;font-size:13px;">${name}</div><div style="font-size:11px;color:${c.admin===uid?'#6366f1':'#94a3b8'};">${c.admin===uid?'<i class="fas fa-crown"></i> مسئول':'عضو'}</div></div>
            </div>
            ${isAdm&&uid!==window.currentUser?`<button onclick="window.rmCommMember('${id}','${uid}')" style="background:#fee2e2;border:none;color:#ef4444;padding:6px 12px;border-radius:999px;cursor:pointer;font-family:Cairo,sans-serif;font-weight:700;font-size:12px;"><i class="fas fa-user-minus"></i></button>`:''}
        </div>`;
    });
    area.innerHTML = html+'</div>';
};

/* ─── إدارة الطلبات ─── */
window.commManageRequests = (id) => {
    let c = window.allCommunities[id]; if(!c) return;
    let area = $('communityFeedArea'); if(!area) return;
    let reqs = Object.keys(c.requests||{});
    let html = `<div style="padding:18px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <button onclick="window.renderCommunityFeed('${id}')" style="background:#f1f5f9;border:none;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="fas fa-arrow-right" style="color:#64748b;"></i></button>
            <div style="font-size:16px;font-weight:900;color:#0f172a;">طلبات الانضمام (${reqs.length})</div>
        </div>`;
    if(!reqs.length) html+='<div style="text-align:center;padding:30px;color:#94a3b8;">لا توجد طلبات</div>';
    else reqs.forEach(uid => {
        let d=window.allUsersData[uid], name=gN(uid), pic=d?.profilePic||dA;
        html+=`<div style="display:flex;align-items:center;justify-content:space-between;padding:11px;border-radius:13px;margin-bottom:7px;background:#f8fafc;border:1px solid #e2e8f0;">
            <div style="display:flex;align-items:center;gap:9px;"><img src="${pic}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" onerror="this.src='${dA}'"><div style="font-weight:800;font-size:13px;">${name}</div></div>
            <div style="display:flex;gap:7px;">
                <button onclick="window.approveCommReq('${id}','${uid}')" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:7px 14px;border-radius:999px;cursor:pointer;font-family:Cairo,sans-serif;font-weight:700;font-size:12px;"><i class="fas fa-check"></i> قبول</button>
                <button onclick="window.rejectCommReq('${id}','${uid}')" style="background:#f1f5f9;border:1.5px solid #e2e8f0;color:#64748b;padding:7px 12px;border-radius:999px;cursor:pointer;font-family:Cairo,sans-serif;font-weight:700;font-size:12px;"><i class="fas fa-times"></i></button>
            </div>
        </div>`;
    });
    area.innerHTML = html+'</div>';
};

window.approveCommReq = (id, uid) => {
    let c = window.allCommunities[id];
    update(ref(db), {[`communities/${id}/members/${uid}`]:true, [`communities/${id}/requests/${uid}`]:null})
        .then(() => { notif(uid,'community_request_approved',{communityId:id,communityName:c?.name||''}); window.commManageRequests(id); });
};
window.rejectCommReq = (id, uid) => {
    remove(ref(db,`communities/${id}/requests/${uid}`))
        .then(() => { notif(uid,'community_request_rejected',{communityId:id,communityName:window.allCommunities[id]?.name||''}); window.commManageRequests(id); });
};
window.rmCommMember = (id, uid) => {
    window.dlgDanger('إزالة هذا العضو؟').then(ok => {
        if(ok) remove(ref(db,`communities/${id}/members/${uid}`)).then(()=>window.commManageMembers(id));
    });
};

/* ─── توافق مع الأكواد القديمة ─── */
window.viewCommunityMembers = window.commManageMembers;
window.manageCommunityRequests = window.commManageRequests;
window.startCommunityCall = () => window.dlgAlert('ميزة الاجتماعات ستُضاف قريباً','info');

/* ─── نصوص الإشعارات ─── */
window.getCommNotifText = (n) => {
    let from = gN(n.from), cn = n.communityName||'المجتمع';
    if(n.type==='community_join_request') return `${from} طلب الانضمام إلى "${cn}"`;
    if(n.type==='community_request_approved') return `تمت الموافقة على انضمامك إلى "${cn}" 🎉`;
    if(n.type==='community_request_rejected') return `تم رفض طلب انضمامك إلى "${cn}"`;
    if(n.type==='community_new_post') return `منشور جديد في "${cn}" من ${from}`;
    if(n.type==='community_post_like') return `${from} أعجب بمنشورك في "${cn}"`;
    return null;
};
