import { ref, get, set, update, push, remove, onValue, query, limitToLast, orderByChild } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const defaultCover = "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80";

/* ══════════════════════════════════════════
   الوحدات المساعدة
══════════════════════════════════════════ */
const uploadToCloudinary = async (file) => {
    let fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', 'mogtam3_unsigned');
    let res = await fetch('https://api.cloudinary.com/v1_1/dkqxnmdhq/image/upload', { method: 'POST', body: fd });
    let data = await res.json();
    return data.secure_url;
};

const timeAgo = (ts) => window.timeAgo ? window.timeAgo(ts) : new Date(ts).toLocaleString('ar-EG');
const getDisplayName = (uid) => window.getDisplayName ? window.getDisplayName(uid) : (window.allUsersData?.[uid]?.displayName || uid);

const sendNotif = (toUid, type, extra = {}) => {
    if (!toUid || toUid === window.currentUser) return;
    push(ref(db, `users/${toUid}/notifications`), {
        type, from: window.currentUser, timestamp: Date.now(), read: false, ...extra
    });
};

/* ══════════════════════════════════════════
   فتح / إغلاق قائمة المجتمعات
══════════════════════════════════════════ */
window.openCommunitiesModal = () => {
    if (!window.currentUser) return window.showRegisterModal();
    $('communitiesModal').classList.add('show');
    document.body.style.overflow = 'hidden';
    renderCommList();
};

/* ══════════════════════════════════════════
   إنشاء مجتمع
══════════════════════════════════════════ */
window.createCommunity = async () => {
    let name = $('communityNameInput')?.value.trim();
    let desc = $('communityDescInput')?.value.trim();
    if (!name) return window.dlgAlert("أدخل اسم المجتمع", "warning");
    let btn = $('createCommunityBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري...';
    let data = {
        name, description: desc || '',
        admin: window.currentUser,
        timestamp: Date.now(),
        members: { [window.currentUser]: true },
        coverPhoto: '', avatar: ''
    };
    let newRef = push(ref(db, 'communities'));
    await set(newRef, data);
    $('communityNameInput').value = ''; $('communityDescInput').value = '';
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> إنشاء المجتمع';
    window.dlgAlert("تم إنشاء المجتمع! 🎉", "success");
};

/* ══════════════════════════════════════════
   قائمة المجتمعات
══════════════════════════════════════════ */
function renderCommList() {
    let area = $('communitiesListArea'); if (!area) return;
    let comms = window.allCommunities || {};
    let q = (window._commSearch || '').toLowerCase();

    let html = `
    <div style="position:relative;margin-bottom:16px;">
        <i class="fas fa-search" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#94a3b8;pointer-events:none;"></i>
        <input type="text" placeholder="ابحث عن مجتمع..." value="${window._commSearch||''}"
            oninput="window._commSearch=this.value;window.renderCommunitiesList()"
            style="width:100%;padding:11px 40px 11px 14px;border:1.5px solid #e2e8f0;border-radius:999px;font-family:Cairo,sans-serif;font-size:14px;outline:none;box-sizing:border-box;">
    </div>`;

    let cards = '';
    Object.entries(comms).forEach(([id, comm]) => {
        let isMember = comm.members?.[window.currentUser];
        let isPending = comm.requests?.[window.currentUser];
        let isAdmin = comm.admin === window.currentUser;
        let memCount = comm.members ? Object.keys(comm.members).length : 0;
        if (!isMember && q && !comm.name?.toLowerCase().includes(q)) return;

        let cover = comm.coverPhoto || defaultCover;
        let avatar = comm.avatar || '';
        let avatarHtml = avatar
            ? `<img src="${avatar}" style="width:58px;height:58px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.15);">`
            : `<div style="width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#2a5298);border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;font-weight:900;box-shadow:0 2px 8px rgba(0,0,0,.15);">${comm.name?.charAt(0)||'م'}</div>`;

        let btn = isMember
            ? `<button onclick="window.openCommunityView('${id}')" style="background:linear-gradient(135deg,#6366f1,#2a5298);color:#fff;border:none;padding:9px 20px;border-radius:999px;font-family:Cairo,sans-serif;font-weight:700;font-size:13px;cursor:pointer;"><i class="fas fa-door-open"></i> فتح</button>`
            : isPending
            ? `<button disabled style="background:#f1f5f9;color:#94a3b8;border:none;padding:9px 18px;border-radius:999px;font-family:Cairo,sans-serif;font-weight:700;font-size:13px;cursor:not-allowed;"><i class="fas fa-clock"></i> قيد الانتظار</button>`
            : `<button onclick="window.requestJoinCommunity('${id}')" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:9px 20px;border-radius:999px;font-family:Cairo,sans-serif;font-weight:700;font-size:13px;cursor:pointer;"><i class="fas fa-user-plus"></i> انضمام</button>`;

        cards += `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;margin-bottom:14px;box-shadow:0 2px 8px rgba(15,23,42,.05);">
            <div style="height:90px;background:url('${cover}') center/cover no-repeat;position:relative;">
                <div style="position:absolute;bottom:-28px;right:16px;">${avatarHtml}</div>
                ${isAdmin ? `<div style="position:absolute;top:10px;left:10px;background:rgba(99,102,241,.9);color:#fff;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;"><i class="fas fa-crown"></i> مسئول</div>` : ''}
                ${isMember && !isAdmin ? `<div style="position:absolute;top:10px;left:10px;background:rgba(16,185,129,.85);color:#fff;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;"><i class="fas fa-check"></i> مشترك</div>` : ''}
            </div>
            <div style="padding:36px 16px 16px;">
                <div style="font-size:16px;font-weight:900;color:#0f172a;margin-bottom:3px;">${comm.name}</div>
                <div style="font-size:13px;color:#64748b;margin-bottom:10px;min-height:16px;">${comm.description||''}</div>
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <span style="font-size:12px;color:#64748b;font-weight:600;"><i class="fas fa-users" style="color:#6366f1;"></i> ${memCount} عضو</span>
                    ${btn}
                </div>
            </div>
        </div>`;
    });

    area.innerHTML = html + (cards || '<div style="text-align:center;padding:30px;color:#94a3b8;"><i class="fas fa-users" style="font-size:36px;display:block;margin-bottom:10px;"></i>لا توجد مجتمعات</div>');
}
window.renderCommunitiesList = renderCommList;
window.searchCommunities = (q) => { window._commSearch = q; renderCommList(); };

/* ══════════════════════════════════════════
   طلب الانضمام
══════════════════════════════════════════ */
window.requestJoinCommunity = (commId) => {
    if (!window.currentUser) return;
    let comm = window.allCommunities[commId];
    update(ref(db, `communities/${commId}/requests`), { [window.currentUser]: Date.now() }).then(() => {
        // إشعار المسئول
        if (comm?.admin) sendNotif(comm.admin, 'community_join_request', { communityId: commId, communityName: comm.name });
        window.showToast?.("تم إرسال الطلب ✓", "في انتظار موافقة المسئول", window.allUsersData?.[window.currentUser]?.profilePic || dA);
        renderCommList();
    });
};

/* ══════════════════════════════════════════
   صفحة المجتمع الداخلية
══════════════════════════════════════════ */
window.openCommunityView = (commId) => {
    let comm = window.allCommunities[commId]; if (!comm) return;
    window.currentCommunityId = commId;
    window.currentCommunityName = comm.name;
    $('communitiesModal')?.classList.remove('show');
    $('communityViewModal')?.classList.add('show');
    renderCommunityPage(commId);
};

function renderCommunityPage(commId) {
    let comm = window.allCommunities[commId]; if (!comm) return;
    let isAdmin = comm.admin === window.currentUser;
    let memCount = comm.members ? Object.keys(comm.members).length : 0;
    let reqCount = comm.requests ? Object.keys(comm.requests).length : 0;
    let cover = comm.coverPhoto || defaultCover;
    let avatar = comm.avatar || '';

    // بناء رأس المجتمع
    let titleEl = $('communityViewTitle');
    let descEl = $('communityViewDesc');
    if (titleEl) titleEl.innerText = '';
    if (descEl) descEl.innerText = '';

    let actEl = $('communityHeaderActions');
    if (actEl) {
        actEl.innerHTML = '';
        // غلاف المجتمع داخل المودال
        actEl.closest('.modal-content').querySelector('.modal-content > div:first-child') && null;
    }

    // اعد بناء محتوى المودال كاملاً
    let mc = $('communityViewModal')?.querySelector('.modal-content');
    if (!mc) return;

    let avatarHtml = avatar
        ? `<img src="${avatar}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:4px solid #fff;box-shadow:0 4px 16px rgba(0,0,0,.2);">`
        : `<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#2a5298);border:4px solid #fff;display:flex;align-items:center;justify-content:center;font-size:30px;color:#fff;font-weight:900;box-shadow:0 4px 16px rgba(0,0,0,.2);">${comm.name?.charAt(0)||'م'}</div>`;

    mc.innerHTML = `
        <div onclick="window.closeModal('communityViewModal')" style="position:fixed;top:80px;right:20px;width:40px;height:40px;background:#fff;border:1px solid #e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:200;box-shadow:0 2px 8px rgba(0,0,0,.1);"><i class="fas fa-times" style="color:#64748b;"></i></div>

        <!-- الغلاف -->
        <div style="height:180px;background:url('${cover}') center/cover no-repeat;position:relative;border-radius:20px 20px 0 0;">
            ${isAdmin ? `<label style="position:absolute;bottom:12px;left:12px;background:rgba(0,0,0,.55);color:#fff;padding:7px 14px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="fas fa-camera"></i>تغيير الغلاف<input type="file" accept="image/*" style="display:none;" onchange="window.uploadCommCover('${commId}',this)"></label>` : ''}
            <div style="position:absolute;bottom:-36px;right:20px;">
                <div style="position:relative;display:inline-block;">
                    ${avatarHtml}
                    ${isAdmin ? `<label style="position:absolute;bottom:0;left:0;width:26px;height:26px;background:#6366f1;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;border:2px solid #fff;"><i class="fas fa-camera" style="color:#fff;font-size:10px;"></i><input type="file" accept="image/*" style="display:none;" onchange="window.uploadCommAvatar('${commId}',this)"></label>` : ''}
                </div>
            </div>
        </div>

        <!-- المعلومات -->
        <div style="padding:46px 22px 20px;border-bottom:1px solid #e2e8f0;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div>
                    <div style="font-size:22px;font-weight:900;color:#0f172a;margin-bottom:4px;">${comm.name}</div>
                    <div style="font-size:14px;color:#64748b;margin-bottom:10px;">${comm.description||''}</div>
                    <div style="font-size:13px;color:#64748b;"><i class="fas fa-users" style="color:#6366f1;"></i> ${memCount} عضو ${isAdmin?`· <i class="fas fa-user-clock" style="color:#f59e0b;"></i> ${reqCount} طلب`:''}
                    · <i class="fas fa-crown" style="color:#f59e0b;"></i> ${getDisplayName(comm.admin)}</div>
                </div>
                <!-- أزرار المسئول -->
                ${isAdmin ? `
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button onclick="window.commManageMembers('${commId}')" style="background:#f1f5f9;border:1.5px solid #e2e8f0;color:#334155;padding:8px 16px;border-radius:999px;font-family:Cairo,sans-serif;font-weight:700;font-size:13px;cursor:pointer;"><i class="fas fa-users"></i> الأعضاء</button>
                    <button onclick="window.commManageRequests('${commId}')" style="background:${reqCount>0?'#fef3c7':'#f1f5f9'};border:1.5px solid ${reqCount>0?'#fde68a':'#e2e8f0'};color:${reqCount>0?'#92400e':'#334155'};padding:8px 16px;border-radius:999px;font-family:Cairo,sans-serif;font-weight:700;font-size:13px;cursor:pointer;"><i class="fas fa-user-plus"></i> الطلبات ${reqCount>0?`<span style="background:#f59e0b;color:#fff;border-radius:999px;padding:1px 6px;font-size:11px;">${reqCount}</span>`:''}</button>
                </div>` : `
                <button onclick="window.viewCommunityMembers('${commId}')" style="background:#f1f5f9;border:1.5px solid #e2e8f0;color:#334155;padding:8px 16px;border-radius:999px;font-family:Cairo,sans-serif;font-weight:700;font-size:13px;cursor:pointer;"><i class="fas fa-users"></i> الأعضاء</button>
                `}
            </div>
        </div>

        <!-- صندوق النشر -->
        <div style="padding:18px 22px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;">
                <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
                    <img src="${window.allUsersData?.[window.currentUser]?.profilePic||dA}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid #e2e8f0;">
                    <textarea id="communityPostContent" placeholder="شارك شيئاً مع أعضاء ${comm.name}..." rows="2"
                        style="flex:1;border:1.5px solid #e2e8f0;border-radius:12px;padding:10px 14px;font-family:Cairo,sans-serif;font-size:14px;resize:none;outline:none;direction:rtl;"
                        onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e2e8f0'"></textarea>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid #f1f5f9;">
                    <div style="display:flex;gap:8px;">
                        <label style="display:inline-flex;align-items:center;gap:5px;color:#6366f1;background:#eef2ff;border:1.5px solid #c7d2fe;border-radius:999px;padding:6px 12px;cursor:pointer;font-family:Cairo,sans-serif;font-weight:700;font-size:12px;">
                            <i class="fas fa-image"></i> صورة
                            <input type="file" accept="image/*" style="display:none;" onchange="window.commSelectMedia(event,'image')">
                        </label>
                        <label style="display:inline-flex;align-items:center;gap:5px;color:#ca8a04;background:#fefce8;border:1.5px solid #fde68a;border-radius:999px;padding:6px 12px;cursor:pointer;font-family:Cairo,sans-serif;font-weight:700;font-size:12px;">
                            <i class="fas fa-video"></i> فيديو
                            <input type="file" accept="video/*" style="display:none;" onchange="window.commSelectMedia(event,'video')">
                        </label>
                    </div>
                    <button id="publishCommBtn" onclick="window.publishCommunityPost()" style="background:linear-gradient(135deg,#6366f1,#2a5298);color:#fff;border:none;padding:9px 22px;border-radius:999px;font-family:Cairo,sans-serif;font-weight:800;font-size:14px;cursor:pointer;"><i class="fas fa-paper-plane"></i> نشر</button>
                </div>
                <div id="commMediaPreview" style="display:none;margin-top:10px;position:relative;border-radius:12px;overflow:hidden;background:#000;">
                    <div id="commMediaPreviewInner"></div>
                    <button onclick="window.commClearMedia()" style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,.55);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:12px;"><i class="fas fa-times"></i></button>
                </div>
                <div id="commUploadProgress" style="display:none;margin-top:8px;">
                    <div style="background:#e2e8f0;border-radius:999px;height:6px;overflow:hidden;">
                        <div id="commProgressBar" style="height:100%;background:linear-gradient(135deg,#6366f1,#0ea5e9);width:0%;transition:width .2s;border-radius:999px;"></div>
                    </div>
                    <div id="commProgressText" style="font-size:11px;color:#64748b;margin-top:4px;text-align:center;font-weight:700;"></div>
                </div>
            </div>
        </div>

        <!-- الفيد -->
        <div id="communityFeedArea" style="padding:0;"></div>
    `;

    // تحميل المنشورات
    window.renderCommunityFeed(commId);
}

/* ══════════════════════════════════════════
   رفع غلاف وصورة المجتمع
══════════════════════════════════════════ */
window.uploadCommCover = async (commId, input) => {
    let file = input.files[0]; if (!file) return;
    try {
        window.dlgAlert('جاري الرفع...', 'info');
        let url = await uploadToCloudinary(file);
        await update(ref(db, `communities/${commId}`), { coverPhoto: url });
        renderCommunityPage(commId);
    } catch (e) { window.dlgAlert('فشل رفع الصورة', 'danger'); }
};

window.uploadCommAvatar = async (commId, input) => {
    let file = input.files[0]; if (!file) return;
    try {
        window.dlgAlert('جاري الرفع...', 'info');
        let url = await uploadToCloudinary(file);
        await update(ref(db, `communities/${commId}`), { avatar: url });
        renderCommunityPage(commId);
    } catch (e) { window.dlgAlert('فشل رفع الصورة', 'danger'); }
};

/* ══════════════════════════════════════════
   اختيار ميديا المنشور
══════════════════════════════════════════ */
window._commSelectedMedia = null;
window.commSelectMedia = (e, type) => {
    let file = e.target.files[0]; if (!file) return;
    window._commSelectedMedia = { file, type };
    let preview = $('commMediaPreview'), inner = $('commMediaPreviewInner');
    if (!preview || !inner) return;
    let url = URL.createObjectURL(file);
    inner.innerHTML = type === 'image'
        ? `<img src="${url}" style="width:100%;max-height:300px;object-fit:contain;">`
        : `<video src="${url}" controls style="width:100%;max-height:300px;"></video>`;
    preview.style.display = 'block';
};
window.commClearMedia = () => { window._commSelectedMedia = null; let p=$('commMediaPreview'); if(p) p.style.display='none'; };

/* ══════════════════════════════════════════
   نشر منشور في المجتمع
══════════════════════════════════════════ */
window.publishCommunityPost = async () => {
    if (!window.currentUser) return;
    let commId = window.currentCommunityId; if (!commId) return;
    let txt = $('communityPostContent')?.value.trim();
    let media = window._commSelectedMedia;
    if (!txt && !media) return window.dlgAlert('اكتب شيئاً أو اختر صورة/فيديو', 'warning');

    let btn = $('publishCommBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    let postData = { author: window.currentUser, text: txt || '', timestamp: Date.now() };

    // رفع الميديا إذا وجدت
    if (media) {
        let prog = $('commUploadProgress'), bar = $('commProgressBar'), pTxt = $('commProgressText');
        if (prog) prog.style.display = 'block';
        if (pTxt) pTxt.textContent = 'جاري الرفع...';
        if (bar) bar.style.width = '30%';
        try {
            let url = await uploadToCloudinary(media.file);
            if (bar) bar.style.width = '100%';
            if (media.type === 'image') postData.image = url;
            else postData.video = url;
        } catch (e) {
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> نشر';
            return window.dlgAlert('فشل رفع الميديا', 'danger');
        }
        if (prog) prog.style.display = 'none';
    }

    await push(ref(db, `communityPosts/${commId}`), postData);

    // إشعار أعضاء المجتمع
    let comm = window.allCommunities[commId];
    if (comm?.members) {
        Object.keys(comm.members).forEach(uid => {
            sendNotif(uid, 'community_new_post', { communityId: commId, communityName: comm.name });
        });
    }

    $('communityPostContent').value = '';
    window.commClearMedia();
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> نشر';
};

/* ══════════════════════════════════════════
   فيد منشورات المجتمع
══════════════════════════════════════════ */
window.renderCommunityFeed = (commId) => {
    let area = $('communityFeedArea'); if (!area) return;
    let comm = window.allCommunities[commId];
    let isAdmin = comm?.admin === window.currentUser;
    area.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;"><i class="fas fa-spinner fa-spin" style="font-size:20px;"></i></div>';
    if (window.currentCommListener) { window.currentCommListener(); window.currentCommListener = null; }

    window.currentCommListener = onValue(
        query(ref(db, `communityPosts/${commId}`), orderByChild('timestamp'), limitToLast(40)),
        s => {
            let posts = [];
            if (s.exists()) { s.forEach(c => posts.push({ ...c.val(), id: c.key })); posts.sort((a, b) => b.timestamp - a.timestamp); }

            if (!posts.length) { area.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;"><i class="fas fa-comments" style="font-size:36px;display:block;margin-bottom:10px;"></i>لا توجد منشورات بعد</div>'; return; }

            area.innerHTML = posts.map(p => buildCommPost(p, commId, isAdmin)).join('');
        }
    );
};

function buildCommPost(p, commId, isAdmin) {
    let ap = window.allUsersData?.[p.author]?.profilePic || dA;
    let ad = getDisplayName(p.author);
    let dt = timeAgo(p.timestamp);
    let lc = p.likes ? Object.keys(p.likes).length : 0;
    let hl = p.likes?.[window.currentUser];
    let canDelete = isAdmin || p.author === window.currentUser;

    let mediaHtml = '';
    if (p.images?.length) {
        mediaHtml = `<div style="display:grid;grid-template-columns:${p.images.length===1?'1fr':p.images.length===2?'1fr 1fr':'1fr 1fr'};gap:3px;border-radius:12px;overflow:hidden;margin-bottom:12px;max-height:320px;">
            ${p.images.slice(0,4).map((u,i) => `<div style="position:relative;overflow:hidden;${p.images.length===1?'max-height:320px;':'height:155px;'}${i===2&&p.images.length>=4?'position:relative;':''}">
                <img src="${u}" onclick="window.openCommMediaViewer('${commId}','${p.id}',${i})" style="width:100%;height:100%;object-fit:cover;cursor:pointer;">
                ${i===3&&p.images.length>4?`<div style="position:absolute;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:800;">+${p.images.length-4}</div>`:''}
            </div>`).join('')}
        </div>`;
    } else if (p.image) {
        mediaHtml = `<img src="${p.image}" onclick="window.openCommMediaViewer('${commId}','${p.id}',0)" style="width:100%;max-height:400px;object-fit:cover;border-radius:12px;margin-bottom:12px;cursor:pointer;">`;
    } else if (p.video) {
        mediaHtml = `<video src="${p.video}" controls playsinline style="width:100%;max-height:400px;border-radius:12px;margin-bottom:12px;background:#000;"></video>`;
    }

    let commentsHtml = '';
    if (p.comments) {
        Object.entries(p.comments).sort((a,b)=>a[1].timestamp-b[1].timestamp).slice(-3).forEach(([cid,c]) => {
            let cPic = window.allUsersData?.[c.author]?.profilePic||dA;
            let cName = getDisplayName(c.author);
            commentsHtml += `<div style="display:flex;gap:8px;margin-bottom:8px;align-items:flex-start;">
                <img src="${cPic}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;">
                <div style="background:#f1f5f9;border-radius:0 12px 12px 12px;padding:7px 11px;flex:1;">
                    <div style="font-weight:800;font-size:12px;color:#334155;margin-bottom:2px;">${cName}</div>
                    <div style="font-size:13px;color:#0f172a;">${c.text}</div>
                </div>
            </div>`;
        });
    }

    return `<div class="post" data-comm-post-id="${p.id}" style="border-radius:0;border:none;border-bottom:8px solid #f0f4f8;box-shadow:none;padding:18px 22px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="window.openProfile('${p.author}')">
                <img src="${ap}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1.5px solid #e2e8f0;">
                <div>
                    <div style="font-weight:800;font-size:14px;color:#0f172a;">${ad}</div>
                    <div style="font-size:11px;color:#94a3b8;">${dt}</div>
                </div>
            </div>
            ${canDelete?`<button onclick="window.deleteCommPost('${commId}','${p.id}')" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:6px;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#fee2e2';this.style.color='#ef4444'" onmouseout="this.style.background='none';this.style.color='#94a3b8'"><i class="fas fa-trash-alt"></i></button>`:''}
        </div>
        ${p.text?`<div style="font-size:15px;line-height:1.8;color:#0f172a;margin-bottom:12px;text-align:right;">${p.text}</div>`:''}
        ${mediaHtml}
        <div style="display:flex;justify-content:space-around;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;padding:6px 0;margin-bottom:10px;">
            <button onclick="window.toggleCommPostLike('${commId}','${p.id}',this)" style="flex:1;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;border-radius:10px;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;color:${hl?'#ef4444':'#64748b'};" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='none'">
                <i class="${hl?'fas':'far'} fa-heart" style="font-size:16px;"></i> ${lc||'إعجاب'}
            </button>
            <button onclick="document.getElementById('commInp_${p.id}')?.focus()" style="flex:1;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;border-radius:10px;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;color:#64748b;" onmouseover="this.style.background='#eef2ff'" onmouseout="this.style.background='none'">
                <i class="far fa-comment-alt" style="font-size:16px;"></i> ${p.comments?Object.keys(p.comments).length:''}  تعليق
            </button>
        </div>
        <div style="padding:0 2px;">
            ${commentsHtml}
            <div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
                <img src="${window.allUsersData?.[window.currentUser]?.profilePic||dA}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">
                <div style="flex:1;display:flex;gap:7px;align-items:center;">
                    <input type="text" id="commInp_${p.id}" placeholder="اكتب تعليقاً..."
                        style="flex:1;border:1.5px solid #e2e8f0;border-radius:999px;padding:9px 14px;font-family:Cairo,sans-serif;font-size:13px;outline:none;direction:rtl;"
                        onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e2e8f0'"
                        onkeypress="if(event.key==='Enter')window.addCommPostComment('${commId}','${p.id}')">
                    <button onclick="window.addCommPostComment('${commId}','${p.id}')" style="background:linear-gradient(135deg,#6366f1,#2a5298);color:#fff;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-paper-plane" style="font-size:13px;"></i></button>
                </div>
            </div>
        </div>
    </div>`;
}

/* ══════════════════════════════════════════
   تفاعلات المنشور
══════════════════════════════════════════ */
window.toggleCommPostLike = (commId, postId, btn) => {
    if (!window.currentUser) return;
    let r = ref(db, `communityPosts/${commId}/${postId}/likes/${window.currentUser}`);
    get(r).then(s => {
        if (s.exists()) remove(r);
        else {
            set(r, true);
            // إشعار صاحب المنشور
            let post = null;
            onValue(ref(db, `communityPosts/${commId}/${postId}`), snap => { post = snap.val(); }, { onlyOnce: true });
            if (post?.author) sendNotif(post.author, 'community_post_like', { communityId: commId });
        }
    });
};

window.addCommPostComment = (commId, postId) => {
    if (!window.currentUser) return;
    let inp = $(`commInp_${postId}`); if (!inp) return;
    let txt = inp.value.trim(); if (!txt) return;
    let myPic = window.allUsersData?.[window.currentUser]?.profilePic || dA;
    let myName = getDisplayName(window.currentUser);
    // أضف في DOM فوراً
    let commSection = inp.closest('.post')?.querySelector('[id^="commInp_"]')?.closest('div[style*="flex:1;display:flex"]')?.parentNode;
    if (commSection) {
        let el = document.createElement('div');
        el.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:flex-start;';
        el.innerHTML = `<img src="${myPic}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;"><div style="background:#f1f5f9;border-radius:0 12px 12px 12px;padding:7px 11px;flex:1;"><div style="font-weight:800;font-size:12px;color:#334155;margin-bottom:2px;">${myName}</div><div style="font-size:13px;color:#0f172a;">${txt}</div></div>`;
        commSection.insertBefore(el, commSection.querySelector('.post') || commSection.lastElementChild || null);
    }
    inp.value = '';
    push(ref(db, `communityPosts/${commId}/${postId}/comments`), {
        author: window.currentUser, text: txt, timestamp: Date.now()
    });
};

window.deleteCommPost = (commId, postId) => {
    window.dlgDanger("هل تريد حذف هذا المنشور؟").then(ok => {
        if (ok) remove(ref(db, `communityPosts/${commId}/${postId}`));
    });
};

/* ══════════════════════════════════════════
   إدارة الأعضاء والطلبات
══════════════════════════════════════════ */
window.commManageMembers = (commId) => {
    let comm = window.allCommunities[commId]; if (!comm) return;
    let isAdmin = comm.admin === window.currentUser;
    let area = $('communityFeedArea'); if (!area) return;
    let html = `<div style="padding:20px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
            <button onclick="window.renderCommunityFeed('${commId}')" style="background:#f1f5f9;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;"><i class="fas fa-arrow-right" style="color:#64748b;"></i></button>
            <div style="font-size:17px;font-weight:900;color:#0f172a;">أعضاء المجتمع</div>
        </div>`;
    Object.keys(comm.members || {}).forEach(uid => {
        let d = window.allUsersData[uid];
        let name = d?.displayName || uid, pic = d?.profilePic || dA;
        html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-radius:14px;margin-bottom:8px;background:#f8fafc;border:1px solid #e2e8f0;">
            <div style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="window.openProfile('${uid}')">
                <img src="${pic}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;">
                <div>
                    <div style="font-weight:800;font-size:14px;">${name}</div>
                    <div style="font-size:11px;color:${comm.admin===uid?'#6366f1':'#94a3b8'};">${comm.admin===uid?'<i class="fas fa-crown"></i> مسئول':'عضو'}</div>
                </div>
            </div>
            ${isAdmin && uid !== window.currentUser ? `<button onclick="window.removeCommunityMember('${commId}','${uid}')" style="background:#fee2e2;border:none;color:#ef4444;padding:7px 14px;border-radius:999px;cursor:pointer;font-family:Cairo,sans-serif;font-weight:700;font-size:12px;"><i class="fas fa-user-minus"></i> إزالة</button>` : ''}
        </div>`;
    });
    area.innerHTML = html + '</div>';
};

window.commManageRequests = (commId) => {
    let comm = window.allCommunities[commId]; if (!comm) return;
    let area = $('communityFeedArea'); if (!area) return;
    let reqs = comm.requests || {};
    let html = `<div style="padding:20px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
            <button onclick="window.renderCommunityFeed('${commId}')" style="background:#f1f5f9;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;"><i class="fas fa-arrow-right" style="color:#64748b;"></i></button>
            <div style="font-size:17px;font-weight:900;color:#0f172a;">طلبات الانضمام</div>
        </div>`;
    if (!Object.keys(reqs).length) { html += '<div style="text-align:center;padding:30px;color:#94a3b8;">لا توجد طلبات معلقة</div>'; }
    else Object.keys(reqs).forEach(uid => {
        let d = window.allUsersData[uid], name = d?.displayName||uid, pic = d?.profilePic||dA;
        html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-radius:14px;margin-bottom:8px;background:#f8fafc;border:1px solid #e2e8f0;">
            <div style="display:flex;align-items:center;gap:10px;">
                <img src="${pic}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;">
                <div style="font-weight:800;font-size:14px;">${name}</div>
            </div>
            <div style="display:flex;gap:8px;">
                <button onclick="window.approveCommRequest('${commId}','${uid}')" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:8px 16px;border-radius:999px;cursor:pointer;font-family:Cairo,sans-serif;font-weight:700;font-size:12px;"><i class="fas fa-check"></i> قبول</button>
                <button onclick="window.rejectCommRequest('${commId}','${uid}')" style="background:#f1f5f9;border:1.5px solid #e2e8f0;color:#64748b;padding:8px 14px;border-radius:999px;cursor:pointer;font-family:Cairo,sans-serif;font-weight:700;font-size:12px;"><i class="fas fa-times"></i> رفض</button>
            </div>
        </div>`;
    });
    area.innerHTML = html + '</div>';
};

window.approveCommRequest = (commId, uid) => {
    let comm = window.allCommunities[commId];
    let updates = {};
    updates[`communities/${commId}/members/${uid}`] = true;
    updates[`communities/${commId}/requests/${uid}`] = null;
    update(ref(db), updates).then(() => {
        // إشعار المستخدم بالقبول
        sendNotif(uid, 'community_request_approved', { communityId: commId, communityName: comm?.name || '' });
        window.commManageRequests(commId);
    });
};

window.rejectCommRequest = (commId, uid) => {
    remove(ref(db, `communities/${commId}/requests/${uid}`)).then(() => {
        sendNotif(uid, 'community_request_rejected', { communityId: commId, communityName: window.allCommunities[commId]?.name || '' });
        window.commManageRequests(commId);
    });
};

window.removeCommunityMember = (commId, uid) => {
    window.dlgDanger("هل أنت متأكد من إزالة هذا العضو؟").then(ok => {
        if (ok) remove(ref(db, `communities/${commId}/members/${uid}`)).then(() => {
            window.dlgAlert("تم إزالة العضو.", "success");
            window.commManageMembers(commId);
        });
    });
};

/* ══════════════════════════════════════════
   الإشعارات — عرض إشعارات المجتمع
══════════════════════════════════════════ */
window.getCommNotifText = (n) => {
    let from = getDisplayName(n.from);
    let comm = n.communityName || '';
    switch (n.type) {
        case 'community_join_request': return `${from} طلب الانضمام إلى "${comm}"`;
        case 'community_request_approved': return `تمت الموافقة على انضمامك إلى "${comm}" 🎉`;
        case 'community_request_rejected': return `تم رفض طلب انضمامك إلى "${comm}"`;
        case 'community_new_post': return `منشور جديد في "${comm}" من ${from}`;
        case 'community_post_like': return `${from} أعجب بمنشورك في "${comm}"`;
        default: return null;
    }
};

/* ══════════════════════════════════════════
   مشاهد ميديا منشور المجتمع
══════════════════════════════════════════ */
window.openCommMediaViewer = (commId, postId, idx) => {
    let post = null;
    onValue(ref(db, `communityPosts/${commId}/${postId}`), s => { post = s.val(); }, { onlyOnce: true });
    setTimeout(() => {
        if (!post) return;
        let items = [];
        if (post.images?.length) items = post.images.map(u => ({ type: 'image', u }));
        else if (post.image) items = [{ type: 'image', u: post.image }];
        else if (post.video) items = [{ type: 'video', u: post.video }];
        window._fbCurrentPost = { ...post, id: postId };
        window.openMediaViewer?.(items, idx, { ...post, id: postId });
    }, 200);
};

/* ══════════════════════════════════════════
   الدوال القديمة للتوافق
══════════════════════════════════════════ */
window.viewCommunityMembers = window.commManageMembers;
window.manageCommunityRequests = window.commManageRequests;
window.getSafeDisplayName = getDisplayName;
window.ensureUserData = async (uid) => {
    if (window.allUsersData?.[uid]?.displayName) return window.allUsersData[uid];
    try {
        let s = await get(ref(db, `users/${uid}`));
        if (s.exists()) { window.allUsersData[uid] = s.val(); return s.val(); }
    } catch(e) {}
    return { displayName: uid, profilePic: dA };
};
window.generateCommunitySlug = (name) => name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'community';
window.shareCommunityLink = (commId) => {
    let comm = window.allCommunities[commId];
    let url = `${location.origin}${location.pathname}#/community/${commId}`;
    if (navigator.share) navigator.share({ title: comm?.name, url });
    else { navigator.clipboard?.writeText(url); window.dlgAlert('تم نسخ الرابط!', 'success'); }
};
