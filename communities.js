import { ref, get, set, update, push, remove, onValue, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

window.openCommunitiesModal = () => {
    if(!window.currentUser) return window.showRegisterModal();
    $('communitiesModal').classList.add('show'); document.body.style.overflow = 'hidden';
    window.renderCommunitiesList();
};

window.createCommunity = async () => {
    let name = $('communityNameInput').value.trim(), desc = $('communityDescInput').value.trim();
    if(!name) return window.dlgAlert("الرجاء إدخال اسم المجتمع.", "warning", "بيانات ناقصة");
    let btn = $('createCommunityBtn'), ot = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري...'; btn.disabled = true;
    let newCommRef = push(ref(db, 'communities'));
    let data = { name: name, description: desc, admin: window.currentUser, timestamp: Date.now(), members: {} };
    data.members[window.currentUser] = true; 
    await set(newCommRef, data);
    $('communityNameInput').value = ''; $('communityDescInput').value = ''; btn.innerHTML = ot; btn.disabled = false;
    window.dlgAlert("تم إنشاء المجتمع بنجاح! 🎉", "success", "تم الإنشاء");
};

window.requestJoinCommunity = (commId) => {
    if(!window.currentUser) return;
    update(ref(db, `communities/${commId}/requests`), { [window.currentUser]: true }).then(() => {
        window.showToast("تم إرسال الطلب", "في انتظار موافقة المسئول", window.allUsersData[window.currentUser]?.profilePic || dA);
        window.renderCommunitiesList();
    });
};

window.searchCommunities = (q) => { window.currentCommunitySearchQuery = q.trim(); window.renderCommunitiesList(); };

window.renderCommunitiesList = () => {
    let list = $('communitiesListArea'); if(!list) return;
    let searchBarHtml = `<div style="margin-bottom: 15px;"><input type="text" id="commSearchInput" oninput="window.searchCommunities(this.value)" placeholder="ابحث عن مجتمعات للاتحاق بها..." style="width:100%; border:1px solid var(--border-color); padding:10px; border-radius:8px; font-family:inherit;" value="${window.currentCommunitySearchQuery || ''}"></div>`;
    let h = '', q = window.currentCommunitySearchQuery || '';
    Object.keys(window.allCommunities).forEach(id => {
        let comm = window.allCommunities[id];
        let memCount = comm.members ? Object.keys(comm.members).length : 0;
        let isMember = comm.members && comm.members[window.currentUser];
        let hasRequested = comm.requests && comm.requests[window.currentUser];
        if (!isMember && (!q || !comm.name.toLowerCase().includes(q.toLowerCase()))) return;
        let btnHtml = isMember ? `<button class="btn-secondary" onclick="window.openCommunityView('${id}')">فتح المجتمع</button>` : (hasRequested ? `<button class="btn-secondary" disabled style="background:#e2e8f0; color:#64748b;">قيد الانتظار</button>` : `<button class="btn-primary" onclick="window.requestJoinCommunity('${id}')">طلب انضمام</button>`);
        h += `<div style="background:#f8fafc; border:1px solid var(--border-color); padding:15px; border-radius:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;"><div><h4 style="margin:0 0 5px 0; color:var(--primary); font-size:16px;">${comm.name} ${isMember ? '<span style="font-size:11px; background:#eef2ff; color:var(--primary); padding:2px 6px; border-radius:4px; margin-right:5px;">مشترك</span>' : ''}</h4><div style="font-size:13px; color:var(--text-muted);">${comm.description || ''}</div><div style="font-size:12px; font-weight:bold; margin-top:5px;"><i class="fas fa-users"></i> ${memCount} أعضاء</div></div><div>${btnHtml}</div></div>`;
    });
    list.innerHTML = searchBarHtml + (h || '<p style="text-align:center; color:#666; padding:10px;">لا توجد مجتمعات لعرضها حالياً.</p>');
};

window.openCommunityView = (commId) => {
    let comm = window.allCommunities[commId]; if(!comm) return;
    window.currentCommunityId = commId;
    $('communityViewTitle').innerText = comm.name; $('communityViewDesc').innerText = comm.description || '';
    let isAdmin = comm.admin === window.currentUser;
    let actionsHtml = `<button class="btn-secondary" onclick="window.viewCommunityMembers('${commId}')" style="margin-left:8px;"><i class="fas fa-users"></i> الأعضاء</button>`;
    if (isAdmin) actionsHtml += `<button class="btn-primary" onclick="window.manageCommunityRequests('${commId}')" style="background:#f59e0b; border-color:#f59e0b;"><i class="fas fa-user-plus"></i> الطلبات</button>`;
    let actCont = $('communityHeaderActions'); if(actCont) actCont.innerHTML = actionsHtml;
    $('communitiesModal').classList.remove('show'); $('communityViewModal').classList.add('show');
    window.renderCommunityFeed(commId);
    // تحديث أزرار المكالمة وبادج المكالمة النشطة
    setTimeout(() => { if (typeof window.updateCommunityCallUI === 'function') window.updateCommunityCallUI(commId); }, 150);
};

window.viewCommunityMembers = (commId) => {
    let comm = window.allCommunities[commId]; if (!comm) return;
    let isAdmin = comm.admin === window.currentUser;
    let h = '<div style="padding:10px; background:#fff; border-radius:8px;"><h4 style="margin-bottom:15px; color:var(--primary);">أعضاء المجتمع</h4>';
    Object.keys(comm.members || {}).forEach(uid => {
        let d = window.allUsersData[uid], name = d ? d.displayName : uid, pic = d ? (d.profilePic || dA) : dA;
        h += `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9;"><div style="display:flex; align-items:center; gap:8px;"><img src="${pic}" class="avatar-small" style="width:30px; height:30px;"><span style="font-size:14px; font-weight:bold;">${name} ${comm.admin === uid ? '<span style="color:#10b981; font-size:11px;">(مسئول)</span>' : ''}</span></div>`;
        if (isAdmin && uid !== window.currentUser) h += `<button class="btn-secondary" style="background:#ef4444; color:#fff; padding:4px 8px; font-size:12px; border:none; border-radius:6px;" onclick="window.removeCommunityMember('${commId}', '${uid}')">إزالة</button>`;
        h += `</div>`;
    });
    h += `<button class="btn-primary" style="margin-top:15px; width:100%;" onclick="window.renderCommunityFeed('${commId}')">العودة للمنشورات</button></div>`;
    $('communityFeedArea').innerHTML = h;
};

window.removeCommunityMember = (commId, uid) => { window.dlgDanger("هل أنت متأكد من إزالة هذا العضو؟", "إزالة العضو").then(ok => { if(ok) remove(ref(db, `communities/${commId}/members/${uid}`)).then(() => { window.dlgAlert("تم إزالة العضو بنجاح.", "success", "تم"); window.viewCommunityMembers(commId); }); }); };

window.manageCommunityRequests = (commId) => {
    let comm = window.allCommunities[commId]; if (!comm) return;
    let h = '<div style="padding:10px; background:#fff; border-radius:8px;"><h4 style="margin-bottom:15px; color:var(--primary);">طلبات الانضمام المعلقة</h4>';
    if (!comm.requests || Object.keys(comm.requests).length === 0) h += '<p style="text-align:center; color:#64748b; font-size:14px;">لا توجد طلبات معلقة.</p>';
    else {
        Object.keys(comm.requests).forEach(uid => {
            let d = window.allUsersData[uid], name = d ? d.displayName : uid, pic = d ? (d.profilePic || dA) : dA;
            h += `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9;"><div style="display:flex; align-items:center; gap:8px;"><img src="${pic}" class="avatar-small" style="width:30px; height:30px;"><span style="font-size:14px; font-weight:bold;">${name}</span></div><div style="display:flex; gap:5px;"><button class="btn-primary" style="background:#10b981; border-color:#10b981; padding:4px 8px; font-size:12px;" onclick="window.approveCommRequest('${commId}', '${uid}')">قبول</button><button class="btn-secondary" style="padding:4px 8px; font-size:12px;" onclick="window.rejectCommRequest('${commId}', '${uid}')">رفض</button></div></div>`;
        });
    }
    h += `<button class="btn-primary" style="margin-top:15px; width:100%;" onclick="window.renderCommunityFeed('${commId}')">العودة للمنشورات</button></div>`;
    $('communityFeedArea').innerHTML = h;
};

window.approveCommRequest = (commId, uid) => { let updates = {}; updates[`communities/${commId}/members/${uid}`] = true; updates[`communities/${commId}/requests/${uid}`] = null; update(ref(db), updates).then(() => window.manageCommunityRequests(commId)); };
window.rejectCommRequest = (commId, uid) => { remove(ref(db, `communities/${commId}/requests/${uid}`)).then(() => window.manageCommunityRequests(commId)); };

// startCommunityCall مُعرَّفة بشكل كامل في jitsi-call.js

window.publishCommunityPost = () => {
    let txt = $('communityPostContent').value.trim(); if(!txt || !window.currentCommunityId) return;
    let btn = $('publishCommBtn'); let ot = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;
    push(ref(db, `communityPosts/${window.currentCommunityId}`), { author: window.currentUser, text: txt, timestamp: Date.now() }).then(() => { $('communityPostContent').value = ''; btn.innerHTML = ot; btn.disabled = false; });
};

window.toggleCommPostLike = (commId, postId) => { let r = ref(db, `communityPosts/${commId}/${postId}/likes/${window.currentUser}`); get(r).then(s => { if(s.exists()) remove(r); else set(r, true); }); };
window.addCommPostComment = (commId, postId) => { let inp = document.getElementById(`commComment_${postId}`); let txt = inp.value.trim(); if(!txt) return; push(ref(db, `communityPosts/${commId}/${postId}/comments`), { author: window.currentUser, text: txt, timestamp: Date.now() }).then(() => { inp.value = ''; }); };
window.deleteCommPost = (commId, postId) => { window.dlgDanger("هل تريد حذف هذا المنشور؟").then(ok => { if(ok) remove(ref(db, `communityPosts/${commId}/${postId}`)); }); };

window.renderCommunityFeed = (commId) => {
    let feedArea = $('communityFeedArea'); if(!feedArea) return;
    feedArea.innerHTML = '<div style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';
    let comm = window.allCommunities[commId]; let isAdmin = comm && comm.admin === window.currentUser;
    if(window.currentCommListener) window.currentCommListener();
    window.currentCommListener = onValue(query(ref(db, `communityPosts/${commId}`), limitToLast(30)), s => {
        let h = '';
        if(s.exists()){
            let posts = []; s.forEach(c => { posts.push({...c.val(), id: c.key}); }); posts.sort((a,b) => b.timestamp - a.timestamp);
            posts.forEach(p => {
                let dt = new Date(p.timestamp).toLocaleString('ar-EG'), ap = window.allUsersData[p.author]?.profilePic || dA, ad = window.getDisplayName(p.author);
                let lc = p.likes ? Object.keys(p.likes).length : 0, hl = p.likes && p.likes[window.currentUser];
                let adminDeleteBtn = isAdmin ? `<button onclick="window.deleteCommPost('${commId}', '${p.id}')" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:13px;"><i class="fas fa-trash"></i> حذف</button>` : '';
                let commentsHtml = '';
                if(p.comments) Object.keys(p.comments).forEach(cid => { let c = p.comments[cid], cName = window.getDisplayName(c.author); commentsHtml += `<div style="background:#f1f5f9; padding:6px 10px; border-radius:8px; margin-top:5px; font-size:13px; text-align:right;"><strong style="color:var(--primary);">${cName}:</strong> ${c.text}</div>`; });
                h += `<div class="post" style="box-shadow:none; border:1px solid #e2e8f0; margin-bottom:15px; padding:15px; border-radius:12px; background:#fff;"><div class="post-header" style="margin-bottom:10px; display:flex; justify-content:between; align-items:center; width:100%;"><div style="display:flex; gap:10px; align-items:center; flex:1;"><img src="${ap}" class="avatar-small"><div style="display:flex; flex-direction:column; line-height:1.2; text-align:right;"><strong style="color:var(--text-main);">${ad}</strong><span style="font-size:12px; color:var(--text-muted);">${dt}</span></div></div><div>${adminDeleteBtn}</div></div><div class="post-content" style="font-size:15px; text-align:right; margin-bottom:10px;">${window.formatMentions(p.text)}</div><div class="post-actions-bar" style="border-top:1px solid #f1f5f9; padding-top:8px; display:flex; gap:15px; justify-content:flex-start;"><button class="action-btn" onclick="window.toggleCommPostLike('${commId}', '${p.id}')" style="border:none; background:none; cursor:pointer; display:flex; align-items:center; gap:5px;"><i class="${hl?'fas':'far'} fa-heart" style="${hl?'color:#ef4444;':'color:#64748b;'}"></i><span style="color:#64748b; font-size:13px;">${lc > 0 ? lc : 'إعجاب'}</span></button></div><div class="comments-section" style="margin-top:10px; border-top:1px dashed #f1f5f9; padding-top:8px;">${commentsHtml}<div style="display:flex; gap:8px; margin-top:8px;"><input type="text" id="commComment_${p.id}" placeholder="اكتب تعليقاً..." style="flex:1; border:1px solid #cbd5e1; border-radius:20px; padding:6px 12px; font-size:13px; font-family:inherit;"><button class="btn-primary" style="border-radius:20px; padding:6px 12px; font-size:13px;" onclick="window.addCommPostComment('${commId}', '${p.id}')"><i class="fas fa-paper-plane"></i></button></div></div></div>`;
            });
        }
        feedArea.innerHTML = h || '<p style="text-align:center; color:#666;">لا توجد نقاشات بعد.</p>';
    });
};



// إضافة زر مشاركة في واجهة المجتمع
const originalRenderCommunityFeed = window.renderCommunityFeed;
window.renderCommunityFeed = (commId) => {
    if (originalRenderCommunityFeed) {
        originalRenderCommunityFeed(commId);
    }
    setTimeout(() => {
        let actionsDiv = document.getElementById('communityHeaderActions');
        if (actionsDiv && !document.getElementById('shareCommunityBtn')) {
            let shareBtn = document.createElement('button');
            shareBtn.id = 'shareCommunityBtn';
            shareBtn.className = 'btn-secondary';
            shareBtn.style.cssText = 'background:#10b981; color:#fff; margin-right:8px;';
            shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> مشاركة الرابط';
            shareBtn.onclick = () => window.shareCommunityLink(commId);
            actionsDiv.insertBefore(shareBtn, actionsDiv.firstChild);
        }
    }, 100);
};

// تحديث عرض قائمة المجتمعات
const originalRenderCommunitiesList = window.renderCommunitiesList;
window.renderCommunitiesList = () => {
    if (originalRenderCommunitiesList) {
        originalRenderCommunitiesList();
    }
    setTimeout(() => {
        document.querySelectorAll('.community-card .community-link-item').forEach(el => {
            let commId = el.getAttribute('data-comm-id');
            let comm = window.allCommunities[commId];
            if (comm) {
                let slug = window.generateCommunitySlug(comm.name);
                el.setAttribute('href', '#/community/' + slug);
            }
        });
    }, 100);
};


// دالة لتحميل بيانات مستخدم معين إذا لم تكن موجودة
window.ensureUserData = async (uid) => {
    if (!uid) return null;
    if (window.allUsersData[uid] && window.allUsersData[uid].displayName) {
        return window.allUsersData[uid];
    }
    try {
        const snapshot = await get(ref(db, `users/${uid}`));
        if (snapshot.exists()) {
            window.allUsersData[uid] = snapshot.val();
            return window.allUsersData[uid];
        }
    } catch(e) {
        console.error('Error loading user data:', e);
    }
    return { displayName: uid, profilePic: dA };
};

// دالة لعرض اسم المستخدم بشكل آمن
window.getSafeDisplayName = (uid) => {
    if (!uid) return 'مستخدم';
    return window.allUsersData[uid]?.displayName || uid;
};

// بدء الاستماع لإشعارات المكالمات بمجرد جاهزية البيانات
// (يُستدعى من app.js بعد تحميل window.allCommunities وwindow.currentUser)
window.initCallNotifications = () => {
    if (typeof window.startListeningForCalls === 'function') {
        window.startListeningForCalls();
    }
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
};
