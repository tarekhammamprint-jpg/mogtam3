import { ref, set, get, update, push, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const reelPoster = "https://placehold.co/300x500/1e293b/ffffff?text=Reel+Video";

window.openEditProfileModal = () => { window.location.hash = '#/edit-profile'; };
window.switchProfileTab = (t) => { ['posts','reels','photos','friends','about'].forEach(x => { let e = $('tab-'+x), b = $('btnTab'+x.charAt(0).toUpperCase()+x.slice(1)); if(e) e.style.display = 'none'; if(b) b.classList.remove('active'); }); $('tab-'+t).style.display = 'block'; $('btnTab'+t.charAt(0).toUpperCase()+t.slice(1)).classList.add('active'); };
window.renderInterestsModal = () => { let c = $('interestsContainer'), h = ''; if(c) { window.PLATFORM_INTERESTS?.forEach(cat => { h += `<div class="interest-chip" onclick="window.toggleInterest(this, '${cat}')">${cat}</div>`; }); c.innerHTML = h; $('interestsModal').classList.add('show'); document.body.style.overflow = 'hidden'; } };
window.toggleInterest = (el, cat) => { if(window.selectedInterests.has(cat)) { window.selectedInterests.delete(cat); el.classList.remove('selected'); } else { window.selectedInterests.add(cat); el.classList.add('selected'); } };
window.saveUserInterests = () => { if(window.selectedInterests.size < 3) return window.dlgAlert("الرجاء اختيار 3 اهتمامات على الأقل ليتم تخصيص المنصة لك.", "warning", "تنبيه"); let arr = Array.from(window.selectedInterests); let btn = $('saveInterestsBtn'), ot = btn.innerText; btn.innerText = "جاري الحفظ..."; btn.disabled = true; update(ref(db, `users/${window.currentUser}`), { interests: arr }).then(() => { $('interestsModal').classList.remove('show'); document.body.style.overflow = 'auto'; btn.innerText = ot; btn.disabled = false; window.dlgAlert("تم تخصيص تجربتك بنجاح! ✨", "success", "تم الحفظ"); }).catch(e => { window.dlgAlert("حدث خطأ، يرجى المحاولة مجدداً.", "danger", "خطأ"); btn.innerText = ot; btn.disabled = false; }); };
window.openEditProfileLogic = () => { let d = window.allUsersData[window.currentUser] || {}; $('editModalPicPreview').src = d.profilePic || dA; $('editPicBase64').value = d.profilePic || ''; $('editBio').value = d.bio || ''; $('editLocation').value = d.location || ''; $('editJob').value = d.job || ''; $('editEducation').value = d.education || ''; $('editHobbies').value = d.hobbies || ''; $('editDobProfile').value = d.birthdate || ''; $('editProfileModal').classList.add('show'); document.body.style.overflow = 'hidden'; };
window.openProfileLogic = (u) => {
    if (!window.allUsersData[u]) {
        get(ref(db, `users/${u}`)).then(async s => {
            if (s.exists()) {
                window.allUsersData[u] = s.val();
                const friendsSnap = await get(ref(db, `friends/${u}`));
                if (friendsSnap.exists()) {
                    window.allFriendsData[u] = friendsSnap.val();
                }
                window.renderProfileData(u, window.allUsersData[u]);
            } else {
                window.dlgAlert("الحساب غير موجود.", "warning", "غير موجود");
                window.goHome();
            }
        });
    } else {
        window.renderProfileData(u, window.allUsersData[u]);
    }
};
window.renderProfileData = (u, d) => {
    const oldModal = document.getElementById('profileModal');
    if (oldModal) oldModal.classList.remove('show');
    
    let modal = document.getElementById('profileModalEnhanced');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'profileModalEnhanced';
    modal.className = 'modal';
    
    const isOwnProfile = (u === window.currentUser);
    const isFriend = window.currentUser ? window.myFriends.includes(u) : false;
    const hasRequest = window.currentRequests && window.currentRequests[u];
    const sentRequest = window.sentRequests && window.sentRequests[u];
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1100px; padding: 20px;">
            <span onclick="window.closeModal('profileModalEnhanced')" class="close-btn"><em class="fas fa-times"></em></span>
            
            <div class="profile-two-columns">
                <div class="profile-right-col">
                    <div class="profile-card-enhanced">
                        <div class="profile-cover-enhanced" id="profCoverEnhanced">
                            ${d.coverPic ? `<img src="${d.coverPic}" id="profCoverImgEnhanced">` : '<div style="height:100%;"></div>'}
                            ${isOwnProfile ? `<label class="cover-edit-btn-enhanced"><i class="fas fa-camera"></i> تغيير الغلاف<input type="file" accept="image/*" style="display:none" onchange="window.previewCoverImageEnhanced(event)"></label>` : ''}
                        </div>
                        
                        <div class="profile-avatar-enhanced">
                            <img src="${d.profilePic || dA}" id="profPicEnhanced">
                            ${isOwnProfile ? `<label class="avatar-edit-btn"><i class="fas fa-camera"></i><input type="file" accept="image/*" style="display:none" onchange="window.previewAvatarEnhanced(event)"></label>` : ''}
                        </div>
                        
                        <div class="profile-info-enhanced">
                            <h1 class="profile-name-enhanced">${window.getDisplayName(u)}</h1>
                            <div class="profile-handle-enhanced">@${u}</div>
                            <p class="profile-bio-enhanced">${d.bio || "لا توجد نبذة تعريفية بعد."}</p>
                            <div class="profile-location-enhanced">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${d.location || "لم يتم تحديد الموقع"}</span>
                            </div>
                        </div>
                        
                        <div class="profile-stats-enhanced">
                            <div class="stat-item-enhanced">
                                <span class="stat-number-enhanced" id="profStatPostsEnhanced">0</span>
                                <span class="stat-label-enhanced">منشورات</span>
                            </div>
                            <div class="stat-item-enhanced">
                                <span class="stat-number-enhanced" id="profStatPhotosEnhanced">0</span>
                                <span class="stat-label-enhanced">ميديا</span>
                            </div>
                            <div class="stat-item-enhanced">
                                <span class="stat-number-enhanced" id="profStatFriendsEnhanced">0</span>
                                <span class="stat-label-enhanced">أصدقاء</span>
                            </div>
                        </div>
                        
                        <div class="profile-actions-enhanced" id="profActionsEnhanced">
                            ${window.generateProfileActions(u, isOwnProfile, isFriend, hasRequest, sentRequest)}
                        </div>
                        
                        ${d.interests && d.interests.length > 0 ? `
                        <div class="interests-section-enhanced">
                            <div class="interests-title-enhanced">
                                <i class="fas fa-tag"></i> الاهتمامات
                            </div>
                            <div class="interests-list-enhanced">
                                ${d.interests.map(i => `<span class="interest-tag-enhanced">${i}</span>`).join('')}
                            </div>
                        </div>
                        ` : ''}
                        
                        <div class="additional-info-enhanced">
                            ${d.job ? `
                            <div class="info-row-enhanced">
                                <div class="info-icon-enhanced"><i class="fas fa-briefcase"></i></div>
                                <div class="info-content-enhanced">
                                    <div class="info-label-enhanced">المهنة</div>
                                    <div class="info-value-enhanced">${d.job}</div>
                                </div>
                            </div>
                            ` : ''}
                            ${d.education ? `
                            <div class="info-row-enhanced">
                                <div class="info-icon-enhanced"><i class="fas fa-graduation-cap"></i></div>
                                <div class="info-content-enhanced">
                                    <div class="info-label-enhanced">التعليم</div>
                                    <div class="info-value-enhanced">${d.education}</div>
                                </div>
                            </div>
                            ` : ''}
                            ${d.birthdate ? `
                            <div class="info-row-enhanced">
                                <div class="info-icon-enhanced"><i class="fas fa-cake-candles"></i></div>
                                <div class="info-content-enhanced">
                                    <div class="info-label-enhanced">تاريخ الميلاد</div>
                                    <div class="info-value-enhanced">${d.birthdate}</div>
                                </div>
                            </div>
                            ` : ''}
                            ${d.hobbies ? `
                            <div class="info-row-enhanced">
                                <div class="info-icon-enhanced"><i class="fas fa-heart"></i></div>
                                <div class="info-content-enhanced">
                                    <div class="info-label-enhanced">الهوايات</div>
                                    <div class="info-value-enhanced">${d.hobbies}</div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="profile-left-col">
                    <div class="profile-tabs-enhanced">
                        <button class="tab-btn-enhanced active" data-tab="posts">
                            <i class="fas fa-newspaper"></i> المنشورات
                        </button>
                        <button class="tab-btn-enhanced" data-tab="reels">
                            <i class="fas fa-film"></i> الريلز
                        </button>
                        <button class="tab-btn-enhanced" data-tab="media">
                            <i class="fas fa-images"></i> الميديا
                        </button>
                        <button class="tab-btn-enhanced" data-tab="friends">
                            <i class="fas fa-users"></i> الأصدقاء
                        </button>
                        <button class="tab-btn-enhanced" data-tab="about">
                            <i class="fas fa-info-circle"></i> حول
                        </button>
                    </div>
                    
                    <div id="profileTabContentEnhanced">
                        <div style="text-align:center; padding:40px;">
                            <i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i>
                            <p>جاري التحميل...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }, 10);
    
    window.currentProfileUser = u;
    window.currentProfileData = d;
    
    window.loadProfileTabContent('posts', u);
    
    const tabs = modal.querySelectorAll('.tab-btn-enhanced');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.getAttribute('data-tab');
            window.loadProfileTabContent(tabName, u);
        });
    });
    
    window.updateProfileStats(u);
};
window.generateProfileActions = (u, isOwnProfile, isFriend, hasRequest, sentRequest) => {
    if (!window.currentUser) {
        return `<button class="btn-primary" onclick="window.showRegisterModal()"><i class="fas fa-sign-in-alt"></i> تسجيل الدخول للتفاعل</button>`;
    }
    
    if (isOwnProfile) {
        return `
            <button class="btn-primary" onclick="window.openEditProfileModal()"><i class="fas fa-edit"></i> تعديل الملف الشخصي</button>
            <a href="ads.html" target="_blank" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;padding:8px 18px;border-radius:30px;font-weight:700;font-size:14px;background:#fff;border:2px solid #f59e0b;color:#92400e;font-family:Cairo,sans-serif;cursor:pointer;"><i class="fas fa-bullhorn" style="color:#f59e0b;"></i> إعلان ممول</a>
            <button class="btn-secondary" onclick="window.shareProfile('${u}')"><i class="fas fa-share-alt"></i> مشاركة</button>
        `;
    }
    
    if (isFriend) {
        return `
            <button class="btn-primary" onclick="window.openChat('${u}')"><i class="fas fa-comment-dots"></i> رسالة</button>
            <button class="btn-secondary" onclick="window.unfriend('${u}')" style="background:#ef4444; color:#fff;"><i class="fas fa-user-minus"></i> إلغاء الصداقة</button>
            <button class="btn-secondary" onclick="window.shareProfile('${u}')"><i class="fas fa-share-alt"></i> مشاركة</button>
        `;
    }
    
    if (hasRequest) {
        return `
            <button class="btn-primary" style="background:#10b981;" onclick="window.acceptRequestFromProfile('${u}',this)"><i class="fas fa-check"></i> قبول طلب الصداقة</button>
            <button class="btn-secondary" onclick="window.shareProfile('${u}')"><i class="fas fa-share-alt"></i> مشاركة</button>
        `;
    }
    
    if (sentRequest) {
        return `
            <button class="btn-secondary" onclick="window.cancelFriendRequest('${u}')"><i class="fas fa-user-times"></i> إلغاء الطلب</button>
            <button class="btn-secondary" onclick="window.shareProfile('${u}')"><i class="fas fa-share-alt"></i> مشاركة</button>
        `;
    }
    
    return `
        <button class="btn-primary" onclick="window.sendFriendRequestToFromFeed('${u}',this)"><i class="fas fa-user-plus"></i> إضافة صديق</button>
        <button class="btn-secondary" onclick="window.shareProfile('${u}')"><i class="fas fa-share-alt"></i> مشاركة</button>
    `;
};
window.loadProfileTabContent = async (tab, userId) => {
    const container = document.getElementById('profileTabContentEnhanced');
    if (!container) return;
    
    const userData = window.allUsersData[userId] || {};
    
    switch(tab) {
        case 'posts':
            await window.renderProfilePostsEnhanced(userId, container);
            break;
        case 'reels':
            await window.renderProfileReelsEnhanced(userId, container);
            break;
        case 'media':
            await window.renderProfileMediaEnhanced(userId, container);
            break;
        case 'friends':
            await window.renderProfileFriendsEnhanced(userId, container);
            break;
        case 'about':
            window.renderProfileAboutEnhanced(userData, container);
            break;
        default:
            await window.renderProfilePostsEnhanced(userId, container);
    }
};
window.renderProfilePostsEnhanced = async (userId, container) => {
    container.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i><p>جاري تحميل المنشورات...</p></div>';
    
    const isNewsBot = window.allUsersData[userId]?.isNewsBot;
    const snapshot = await get(ref(db, isNewsBot ? 'newsPosts' : 'posts'));
    const posts = [];
    
    if (snapshot.exists()) {
        snapshot.forEach(child => {
            const post = child.val();
            post.id = child.key;
            window.postCache[post.id] = post;
            // إظهار المنشورات العادية والمشتركة معاً، بدون الريلز
            if (post.author === userId && !post.isReel) posts.push(post);
        });
        posts.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    if (posts.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:60px 20px; background:var(--card-bg); border-radius:var(--radius-md); border:1px solid var(--border-color);">
                <i class="fas fa-newspaper" style="font-size:48px; color:var(--text-muted); margin-bottom:15px; display:block;"></i>
                <p style="color:var(--text-muted);">لا توجد منشورات بعد</p>
                ${userId === window.currentUser ? '<button class="btn-primary" onclick="document.getElementById(\'postContent\')?.focus(); window.closeModal(\'profileModalEnhanced\');"><i class="fas fa-plus"></i> أنشئ منشوراً الآن</button>' : ''}
            </div>`;
        return;
    }

    const dA = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    let html = '<div class="posts-grid">';

    posts.forEach(post => {
        const isLiked = post.likes && post.likes[window.currentUser];
        const likesCount = post.likes ? Object.keys(post.likes).length : 0;
        const commentsCount = post.comments ? Object.keys(post.comments).length : 0;
        const sharesCount = post.shares || 0;
        const authorData = window.allUsersData[post.author] || {};
        const authorPic = authorData.profilePic || dA;
        const authorName = window.getDisplayName(post.author);

        // بناء محتوى المنشور المشترك إن وجد
        let sharedBox = '';
        if (post.isShare && post.sharedData) {
            const sd = post.sharedData;
            const sdPic = window.allUsersData[sd.author]?.profilePic || dA;
            const sdName = window.getDisplayName(sd.author);
            sharedBox = `
                <div class="shared-post-box" onclick="event.stopPropagation()" style="border:1px solid var(--border-color);border-radius:12px;padding:12px;margin:10px 0;background:var(--bg-color);cursor:default;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <img src="${sdPic}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">
                        <strong style="font-size:13px;">${sdName}</strong>
                    </div>
                    ${sd.text ? `<div style="font-size:14px;margin-bottom:8px;color:var(--text-color);">${window.formatMentions(sd.text)}</div>` : ''}
                    ${sd.image ? `<img src="${sd.image}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;">` : ''}
                    ${sd.video ? `<video src="${sd.video}" controls style="width:100%;max-height:200px;border-radius:8px;background:#000;"></video>` : ''}
                </div>`;
        }

        html += `
            <div class="post" style="cursor:pointer;" onclick="window.openPostModal('${post.id}')">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                    <a href="#/@${post.author}" onclick="event.stopPropagation()">
                        <img src="${authorPic}" class="avatar-small" style="width:38px;height:38px;">
                    </a>
                    <div style="flex:1;">
                        <div style="font-weight:700;font-size:14px;">${authorName}</div>
                        <div style="font-size:11px;color:var(--text-muted);" title="${window.fullDateTime(post.timestamp)}">${window.timeAgo(post.timestamp)}${post.isShare ? ' · <i class="fas fa-share" style="color:var(--primary);font-size:10px;"></i> شارك منشوراً' : ''}</div>
                    </div>
                    <div class="post-options-wrap" onclick="event.stopPropagation();"><button class="post-options-btn" onclick="event.stopPropagation();window.togglePostOptionsMenu('${post.id}')"><i class="fas fa-ellipsis-h"></i></button><div class="post-options-menu" id="postOptMenu_${post.id}">${post.author === window.currentUser ? `<div onclick="event.stopPropagation();window.closeAllPostOptMenus();window.editPost('${post.id}')"><i class="fas fa-edit"></i> تعديل المنشور</div><div onclick="event.stopPropagation();window.closeAllPostOptMenus();window.deletePost('${post.id}')"><i class="fas fa-trash"></i> حذف المنشور</div><div onclick="event.stopPropagation();window.closeAllPostOptMenus();window.copyPostLink('${post.id}')"><i class="fas fa-link"></i> نسخ رابط المنشور</div>` : `<div onclick="event.stopPropagation();window.closeAllPostOptMenus();window.reportPost('${post.id}','${post.author}')"><i class="fas fa-flag"></i> الإبلاغ عن المنشور</div>`}</div></div>
                </div>
                ${post.text ? `<div class="post-content" style="margin-bottom:10px;">${window.formatMentions(post.text)}</div>` : ''}
                ${!post.isShare ? window.renderMediaGallery(post) : ''}
                ${sharedBox}
                <div class="post-actions-bar" style="margin-top:10px;" onclick="event.stopPropagation()">
                    <button class="action-btn" data-count="${likesCount || 0}" onclick="window.toggleLike('${post.id}','${post.author}',this)">
                        <i class="${isLiked ? 'fas' : 'far'} fa-heart" style="${isLiked ? 'color:#ef4444;' : ''}"></i>
                        <span class="lc-count">${likesCount || 'إعجاب'}</span>
                    </button>
                    <button class="action-btn" onclick="window.openPostModal('${post.id}')">
                        <i class="far fa-comment-alt"></i> ${commentsCount || 'تعليق'}
                    </button>
                    <button class="action-btn" onclick="window.openShareModal('${post.id}')">
                        <i class="fas fa-share"></i> ${sharesCount || 'مشاركة'}
                    </button>
                </div>
            </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
    container.querySelectorAll('video').forEach(v => window.videoObserver?.observe(v));
};
window.renderProfileReelsEnhanced = async (userId, container) => {
    container.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i><p>جاري تحميل الريلز...</p></div>';
    
    const postsRef = ref(db, 'posts');
    const snapshot = await get(postsRef);
    const reels = [];
    
    if (snapshot.exists()) {
        snapshot.forEach(child => {
            const post = child.val();
            post.id = child.key;
            if (post.author === userId && post.video && post.isReel) {
                reels.push(post);
            }
        });
        reels.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    if (reels.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:60px 20px; background:var(--card-bg); border-radius:var(--radius-md); border:1px solid var(--border-color);">
                <i class="fas fa-film" style="font-size:48px; color:var(--text-muted); margin-bottom:15px; display:block;"></i>
                <p style="color:var(--text-muted);">لا توجد ريلز بعد</p>
                ${userId === window.currentUser ? '<label class="btn-primary" style="cursor:pointer;"><i class="fas fa-plus"></i> رفع ريلز<input type="file" accept="video/*" style="display:none" onchange="window.uploadReelFromProfile(this)"></label>' : ''}
            </div>
        `;
        return;
    }
    
    let html = '<div class="reels-grid-enhanced">';
    reels.forEach((reel, idx) => {
        const viewsCount = reel.views ? Object.keys(reel.views).length : 0;
        const globalIdx = window.allReels.findIndex(r => r.id === reel.id);
        html += `
            <div class="reel-card-enhanced" onclick="window.openReelsViewer(${globalIdx !== -1 ? globalIdx : idx})">
                <video src="${reel.video}" muted loop playsinline preload="metadata"></video>
                <div class="reel-overlay-enhanced">
                    <div class="reel-stats-enhanced">
                        <span><i class="fas fa-play"></i> ${viewsCount}</span>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (video) {
                if (entry.isIntersecting) {
                    video.play().catch(() => {});
                } else {
                    video.pause();
                }
            }
        });
    }, { threshold: 0.3 });
    
    container.querySelectorAll('.reel-card-enhanced').forEach(card => observer.observe(card));
};
window.renderProfileMediaEnhanced = async (userId, container) => {
    container.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i><p>جاري تحميل الوسائط...</p></div>';
    
    const postsRef = ref(db, 'posts');
    const snapshot = await get(postsRef);
    const media = [];
    
    if (snapshot.exists()) {
        snapshot.forEach(child => {
            const post = child.val();
            post.id = child.key;
            if (post.author === userId && (post.image || (post.video && !post.isReel))) {
                media.push(post);
            }
        });
        media.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    if (media.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:60px 20px; background:var(--card-bg); border-radius:var(--radius-md); border:1px solid var(--border-color);">
                <i class="fas fa-images" style="font-size:48px; color:var(--text-muted); margin-bottom:15px; display:block;"></i>
                <p style="color:var(--text-muted);">لا توجد صور أو فيديوهات بعد</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="media-grid-enhanced">';
    media.forEach(item => {
        window.postCache[item.id] = item;
        let imgs = (item.images && item.images.length) ? item.images : (item.image ? [item.image] : []);
        let vids = (item.videos && item.videos.length) ? item.videos : (item.video ? [item.video] : []);
        let allItems = [...imgs.map(u => ({type:'image',u})), ...vids.map(u => ({type:'video',u}))];
        let firstItem = allItems[0]; if (!firstItem) return;
        let extraBadge = allItems.length > 1 ? `<div style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,.6);color:#fff;border-radius:10px;padding:2px 8px;font-size:12px;font-weight:700;">+${allItems.length}</div>` : '';
        html += `
            <div class="media-item-enhanced" onclick="window.openMediaViewerFor('${item.id}',0)">
                ${firstItem.type === 'image' ?
                    `<img src="${firstItem.u}" loading="lazy">` :
                    `<video src="${firstItem.u}" muted playsinline preload="metadata"></video>`
                }
                <div class="media-type-badge"><i class="fas ${firstItem.type === 'image' ? 'fa-image' : 'fa-video'}"></i></div>
                ${extraBadge}
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
};
window.renderProfileFriendsEnhanced = async (userId, container) => {
    container.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i><p>جاري تحميل الأصدقاء...</p></div>';
    
    const friendsRef = ref(db, `friends/${userId}`);
    const snapshot = await get(friendsRef);
    const friends = [];
    
    if (snapshot.exists()) {
        const friendIds = Object.keys(snapshot.val());
        // جلب بيانات الأصدقاء الغير موجودة في allUsersData
        const missingIds = friendIds.filter(id => !window.allUsersData[id]);
        if (missingIds.length > 0) {
            await Promise.all(missingIds.map(async id => {
                try {
                    const s = await get(ref(db, `users/${id}`));
                    if (s.exists()) window.allUsersData[id] = s.val();
                } catch(e) {}
            }));
        }
        friendIds.forEach(friendId => {
            const data = window.allUsersData[friendId] || {};
            friends.push({ id: friendId, data });
        });
    }
    
    if (friends.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:60px 20px; background:var(--card-bg); border-radius:var(--radius-md); border:1px solid var(--border-color);">
                <i class="fas fa-users" style="font-size:48px; color:var(--text-muted); margin-bottom:15px; display:block;"></i>
                <p style="color:var(--text-muted);">لا يوجد أصدقاء بعد</p>
                ${userId === window.currentUser ? '<button class="btn-primary" onclick="window.openRequestsModal()"><i class="fas fa-user-plus"></i> ابحث عن أصدقاء</button>' : ''}
            </div>
        `;
        return;
    }
    
    let html = '<div class="friends-grid-enhanced">';
    friends.forEach(friend => {
        const mutualCount = window.calculateMutualFriends(userId, friend.id);
        const name = (friend.data && friend.data.displayName) ? friend.data.displayName : friend.id;
        const pic = (friend.data && friend.data.profilePic) ? friend.data.profilePic : dA;
        html += `
            <div class="friend-card-enhanced" onclick="window.openProfile('${friend.id}')">
                <img src="${pic}" loading="lazy">
                <div class="friend-name-enhanced">${name}</div>
                <div class="friend-handle-enhanced">@${friend.id}</div>
                ${mutualCount > 0 ? `<div class="friend-mutual-enhanced"><i class="fas fa-user-friends"></i> ${mutualCount} مشترك</div>` : ''}
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
};
window.calculateMutualFriends = (userId, otherId) => {
    if (!window.currentUser) return 0;
    const userFriends = window.allFriendsData[userId] ? Object.keys(window.allFriendsData[userId]) : [];
    const otherFriends = window.allFriendsData[otherId] ? Object.keys(window.allFriendsData[otherId]) : [];
    return userFriends.filter(f => otherFriends.includes(f) && f !== userId && f !== otherId).length;
};
window.renderProfileAboutEnhanced = (userData, container) => {
    const infoItems = [
        { icon: 'fas fa-briefcase', label: 'المهنة', value: userData.job, default: 'غير محدد' },
        { icon: 'fas fa-graduation-cap', label: 'التعليم', value: userData.education, default: 'غير محدد' },
        { icon: 'fas fa-heart', label: 'الهوايات', value: userData.hobbies, default: 'غير محدد' },
        { icon: 'fas fa-cake-candles', label: 'تاريخ الميلاد', value: userData.birthdate, default: 'غير محدد' },
        { icon: 'fas fa-map-marker-alt', label: 'الموقع', value: userData.location, default: 'غير محدد' },
        { icon: 'fas fa-calendar-alt', label: 'تاريخ الانضمام', value: userData.joinDate ? new Date(userData.joinDate).toLocaleDateString('ar-EG') : null, default: 'غير محدد' }
    ];
    
    const hasInfo = infoItems.some(item => item.value);
    
    if (!hasInfo) {
        container.innerHTML = `
            <div class="about-section-enhanced">
                <div style="text-align:center; padding:40px;">
                    <i class="fas fa-user-circle" style="font-size:48px; color:var(--text-muted); margin-bottom:15px; display:block;"></i>
                    <p style="color:var(--text-muted);">لا توجد معلومات إضافية</p>
                    ${userData.id === window.currentUser ? '<button class="btn-primary" onclick="window.openEditProfileModal()"><i class="fas fa-edit"></i> أضف معلومات عنك</button>' : ''}
                </div>
            </div>
        `;
        return;
    }
    
    let html = '<div class="about-section-enhanced">';
    infoItems.forEach(item => {
        const value = item.value || item.default;
        html += `
            <div class="about-item-enhanced">
                <div class="about-icon-enhanced"><i class="${item.icon}"></i></div>
                <div class="about-content-enhanced">
                    <div class="about-label-enhanced">${item.label}</div>
                    <div class="about-value-enhanced">${value}</div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
};
window.updateProfileStats = async (userId) => {
    const postsRef = ref(db, 'posts');
    const snapshot = await get(postsRef);
    let postsCount = 0;
    let mediaCount = 0;
    
    if (snapshot.exists()) {
        snapshot.forEach(child => {
            const post = child.val();
            if (post.author === userId) {
                if (!post.isReel) postsCount++;
                if (post.image || (post.video && !post.isReel)) mediaCount++;
            }
        });
    }
    
    const friendsCount = window.allFriendsData[userId] ? Object.keys(window.allFriendsData[userId]).length : 0;
    
    const postsEl = document.getElementById('profStatPostsEnhanced');
    const mediaEl = document.getElementById('profStatPhotosEnhanced');
    const friendsEl = document.getElementById('profStatFriendsEnhanced');
    
    if (postsEl) postsEl.innerText = postsCount;
    if (mediaEl) mediaEl.innerText = mediaCount;
    if (friendsEl) friendsEl.innerText = friendsCount;
};
window.previewCoverImageEnhanced = async (event) => {
    const file = event.target.files[0];
    if (!file || !window.currentUser) return;
    
    try {
        const url = await window.uploadToCloudinary(file, 'image');
        await update(ref(db, `users/${window.currentUser}`), { coverPic: url });
        const coverImg = document.getElementById('profCoverImgEnhanced');
        if (coverImg) coverImg.src = url;
    } catch(e) {
        console.error('Error uploading cover:', e);
    }
};
window.previewAvatarEnhanced = async (event) => {
    const file = event.target.files[0];
    if (!file || !window.currentUser) return;
    
    try {
        const url = await window.uploadToCloudinary(file, 'image');
        await update(ref(db, `users/${window.currentUser}`), { profilePic: url });
        const avatarImg = document.getElementById('profPicEnhanced');
        if (avatarImg) avatarImg.src = url;
        ['myNavAvatar', 'composerAvatar', 'myShareAvatar', 'mobileNavAvatar'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.src = url;
        });
    } catch(e) {
        console.error('Error uploading avatar:', e);
    }
};
window.shareProfile = (userId) => {
    const url = window.location.origin + window.location.pathname + '#/@' + userId;
    navigator.clipboard.writeText(url).then(() => {
        window.showToast('تم نسخ الرابط', 'يمكنك مشاركة رابط الملف الشخصي الآن', '');
    }).catch(() => {
        window.dlgAlert('رابط الملف الشخصي: ' + url, 'info', 'شارك الرابط');
    });
};
window.uploadReelFromProfile = async (event) => {
    const file = event.target.files[0];
    if (!file || !window.currentUser) return;
    
    if (file.size > 50 * 1024 * 1024) {
        window.dlgAlert('الفيديو كبير جداً! الحد الأقصى 50 ميجا.', 'warning', 'تنبيه');
        return;
    }
    
    try {
        const url = await window.uploadToCloudinary(file, 'video');
        const newPostRef = push(ref(db, 'posts'));
        await set(newPostRef, {
            author: window.currentUser,
            video: url,
            isReel: true,
            timestamp: Date.now(),
            text: ''
        });
        window.dlgAlert('تم رفع الريلز بنجاح! 🎬', 'success', 'تم الرفع');
        if (window.currentProfileUser) {
            window.loadProfileTabContent('reels', window.currentProfileUser);
        }
    } catch(e) {
        window.dlgAlert('حدث خطأ أثناء الرفع، حاول مجدداً.', 'danger', 'خطأ');
    }
};
function renderProfileData(u, d) { $('profPic').src = d.profilePic || dA; $('profName').innerText = window.getDisplayName(u); $('profHandle').innerText = '@' + u; $('profBio').innerText = d.bio || "لا نبذة."; $('profLocText').innerText = d.location || "غير محدد"; $('profileAboutArea').innerHTML = `<div style="background:#fff;border-radius:12px;padding:20px;border:1px solid var(--border-color);text-align:right;"><h4 style="margin-top:0;color:var(--primary);border-bottom:1px solid #e2e8f0;padding-bottom:10px;">معلومات</h4><div><strong>المدينة:</strong> <br>${d.location||'غير محدد'}</div><div><strong>تاريخ الميلاد:</strong> <br>${d.birthdate||'غير محدد'}</div><div><strong>المهنة:</strong> <br>${d.job||'غير محدد'}</div><div><strong>الدراسة:</strong> <br>${d.education||'غير محدد'}</div><div><strong>الهوايات:</strong> <br>${d.hobbies||'غير محدد'}</div></div>`; let intArea = $('profInterestsArea'); if(d.interests && d.interests.length > 0) { intArea.style.display = 'flex'; intArea.innerHTML = d.interests.map(i => `<span style="background:#eef2ff; color:var(--primary); padding:4px 10px; border-radius:12px; font-size:12px; font-weight:700;">${i}</span>`).join(''); } else { intArea.style.display = 'none'; } let ce = $('profCoverImg'); if(d.coverPic) { ce.src = d.coverPic; ce.style.display = 'block'; } else ce.style.display = 'none'; $('statPosts').innerText = window.allPosts.filter(p => p.author === u && !p.isReel).length; $('statPhotos').innerText = window.allPosts.filter(p => p.author === u && (p.image || p.video) && !p.isReel).length; $('statFriends').innerText = Object.keys(window.allFriendsData[u] || {}).length; let ac = $('profActions'); let ism = (u === window.currentUser), isf = window.currentUser ? window.myFriends.includes(u) : false, rr = window.currentRequests && window.currentRequests[u]; if(!window.currentUser) { $('coverEditBtn').style.display = 'none'; ac.innerHTML = `<button class="btn-primary" onclick="window.showRegisterModal()"><i class="fas fa-user-plus"></i> تسجيل الدخول للتفاعل</button>`; } else if(ism) { $('coverEditBtn').style.display = 'flex'; ac.innerHTML = `<button class="btn-primary" onclick="window.openEditProfileModal()"><i class="fas fa-edit"></i> تعديل</button><a href="ads.html" target="_blank" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;padding:8px 16px;border-radius:20px;border:1px solid #e2e8f0;font-weight:700;font-size:14px;font-family:Cairo,sans-serif;background:#fff;color:#0f172a;"><i class="fas fa-bullhorn" style="color:#f59e0b;"></i> إعلان ممول</a><button class="btn-secondary" onclick="window.location.hash=''; window.scrollTo({top:0, behavior:'smooth'}); let c = $('postContent'); c.value = 'حساب رائع: @${u} ✨'; c.focus();"><i class="fas fa-share"></i> مشاركة</button>`; } else { $('coverEditBtn').style.display = 'none'; let sb = `<button class="btn-secondary" onclick="window.location.hash=''; window.scrollTo({top:0, behavior:'smooth'}); let c = $('postContent'); c.value = 'حساب رائع: @${u} ✨'; c.focus();"><i class="fas fa-share"></i> مشاركة</button>`; if(isf) ac.innerHTML = `<button class="btn-secondary" style="background:#ef4444;color:#fff;" onclick="window.unfriend('${u}')"><i class="fas fa-user-minus"></i></button><button class="btn-primary" onclick="window.location.hash=''; setTimeout(()=>window.openChat('${u}'),300)"><i class="fas fa-comment-dots"></i> رسالة</button> ${sb}`; else if(rr) ac.innerHTML = `<button class="btn-primary" style="background:#10b981;" onclick="window.acceptRequestFromProfile('${u}',this)"><i class="fas fa-check"></i> قبول</button> ${sb}`; else if(window.sentRequests && window.sentRequests[u]) ac.innerHTML = `<button class="btn-secondary" onclick="window.cancelFriendRequest('${u}')"><i class="fas fa-user-times"></i> إلغاء</button> ${sb}`; else { ac.innerHTML = `<button class="btn-secondary" disabled>جاري...</button>`; get(ref(db, `friendRequests/${u}/${window.currentUser}`)).then(s => { if($('profHandle').innerText.replace('@', '') === u) { if(s.exists()) { window.sentRequests[u] = true; ac.innerHTML = `<button class="btn-secondary" onclick="window.cancelFriendRequest('${u}')"><i class="fas fa-user-times"></i> إلغاء</button> ${sb}`; } else ac.innerHTML = `<button class="btn-primary" data-action="add" data-target="${u}" onclick="window.sendFriendRequestToFromFeed('${u}',this)"><i class="fas fa-user-plus"></i> إضافة</button> ${sb}`; } }).catch(e => console.log(e)); } } $('profileModal').classList.add('show'); document.body.style.overflow = 'hidden'; try { window.renderProfilePosts(u) } catch(e) {} }
window.previewCoverImage = async (e) => { let f = e.target.files[0]; if(!f) return; let bt = $('coverEditBtn'), ot = bt.innerHTML; bt.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; try { let url = await window.uploadToCloudinary(f, 'image'); $('profCoverImg').src = url; $('profCoverImg').style.display = 'block'; await update(ref(db, `users/${window.currentUser}`), {coverPic:url}); } catch(err) { window.dlgAlert('فشل رفع الصورة، حاول مجدداً.', 'danger', 'خطأ'); } bt.innerHTML = ot; };
window.saveProfile = async () => { let p = $('editPicBase64').value; if(p && p.startsWith('data:')) { let b = $('saveProfileBtn'), ot = b.innerHTML; b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...'; b.disabled = true; try { p = await window.uploadToCloudinary(p, 'image'); } catch(e) { window.dlgAlert('فشل رفع الصورة، حاول مجدداً.', 'danger', 'خطأ'); b.innerHTML = ot; b.disabled = false; return; } b.innerHTML = ot; b.disabled = false; } let up = {bio:$('editBio').value.trim(), location:$('editLocation').value.trim(), job:$('editJob').value.trim(), education:$('editEducation').value.trim(), hobbies:$('editHobbies').value.trim(), birthdate:$('editDobProfile').value}; if(p) up.profilePic = p; await update(ref(db, `users/${window.currentUser}`), up); if(p) { $('myNavAvatar').src = p; $('mobileNavAvatar').src = p; } window.location.hash = '#/@' + window.currentUser; };
function renderProfilePosts(u) { 
    let pp = window.allUsersData[u]?.profilePic || dA; 
    $('profilePostsFeed').innerHTML = '<div style="text-align:center;padding:20px;color:var(--primary);"><i class="fas fa-spinner fa-spin fa-2x"></i><br>جاري جلب المنشورات...</div>';
    let isNewsBot = window.allUsersData[u]?.isNewsBot;
    let postsRef = isNewsBot ? ref(db, 'newsPosts') : ref(db, 'posts');
    get(postsRef).then(s => { let h = '', ph = ''; ph += `<a href="#/@${u}"><img src="${pp}" style="cursor:pointer;"></a>`; if(s.exists()) { let userPosts = []; s.forEach(c => { let p = c.val(); p.id = c.key; if(p.author === u) { userPosts.push(p); window.postCache[p.id] = p; } }); userPosts.sort((a,b) => b.timestamp - a.timestamp); userPosts.forEach(p => { if(!p.isReel) { let lc = p.likes ? Object.keys(p.likes).length : 0, it = lc >= 10; h += window.createPostHTML(p, 'profile', it, false); if(p.image || p.images) { let imgs2 = (p.images&&p.images.length)?p.images:(p.image?[p.image]:[]); ph += `<div style="cursor:pointer;" onclick="window.openMediaViewerFor('${p.id}',0)"><img src="${imgs2[0]}" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:6px;"></div>`; } if(p.video&&!p.isReel) ph += `<div style="cursor:pointer;" onclick="window.openMediaViewerFor('${p.id}',0)"><video src="${p.video}" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:6px;" muted playsinline></video></div>`; } }); } $('profilePostsFeed').innerHTML = h || '<p style="text-align:center;color:#666;font-size:13px;">لا مقالات.</p>'; $('profilePhotosGrid').innerHTML = ph; document.querySelectorAll('#profilePostsFeed video').forEach(v => window.videoObserver.observe(v)); }).catch(e => { $('profilePostsFeed').innerHTML = '<p style="text-align:center;color:#ef4444;">حدث خطأ في جلب المنشورات.</p>'; }); let rh = ''; let userReels = window.allReels.filter(r => r.author === u); if(userReels.length > 0) { userReels.forEach(r => { let globalIdx = window.allReels.findIndex(x => x.id === r.id); let vc = r.views ? Object.keys(r.views).length : 0; rh += `<div class="reel-thumb" style="width:100%; height:180px;" onclick="window.openReelsViewer(${globalIdx})"><video src="${r.video}" autoplay loop muted playsinline preload="auto" poster="${reelPoster}" style="pointer-events:none; background:#1e293b; object-fit:cover;"></video><span class="r-views"><i class="fas fa-play"></i> ${vc}</span></div>`; }); } $('profileReelsGrid').innerHTML = rh || '<p style="text-align:center;color:#666;grid-column:span 3;">لا يوجد ريلز لهذا الحساب.</p>'; get(ref(db, `friends/${u}`)).then(s => { let fh = ''; if(s.exists()) { Object.keys(s.val()).forEach(f => { let pic = window.allUsersData[f]?.profilePic || dA, dn = window.getDisplayName(f), mc = 0; if(f !== window.currentUser) { let tf = window.allFriendsData[f] ? Object.keys(window.allFriendsData[f]) : []; mc = tf.filter(x => window.myFriends.includes(x)).length; } let mt = f === window.currentUser ? '' : (mc > 0 ? `<span class="f-mutual"><i class="fas fa-user-friends"></i> ${mc} مشتركون</span>` : `<span class="f-mutual">لا مشتركون</span>`); fh += `<a href="#/@${f}" class="friend-card" style="color:inherit; text-decoration:none;"><img src="${pic}"><div style="display:flex;flex-direction:column;justify-content:center;"><span class="f-name">${dn}</span>${mt}</div></a>`; }); } $('profileFriendsList').innerHTML = fh || '<p style="text-align:center;color:#666;font-size:13px;grid-column:span 2;">لا أصدقاء.</p>'; }); }
window.renderProfilePosts = renderProfilePosts;
