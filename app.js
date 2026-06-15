import { ref, set, get, update, push, remove, onValue, query, orderByChild, limitToLast, equalTo, onDisconnect } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";
import "./auth.js";
import "./communities.js";
import "./chat.js";
import "./video-call.js";

// =============== المتغيرات العامة ===============
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
window.selectedMediaFile = null;
window.selectedMediaType = null;
window.selectedInterests = new Set();
window.allReels = [];
window.currentOpenPostId = null;

const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

// =============== دوال مساعدة ===============
window.getDisplayName = (id) => window.allUsersData[id]?.displayName || id;
window.getDisplayHandle = (id) => '@' + id;

window.timeAgo = (ts) => {
    if(!ts) return "منذ فترة";
    let s = Math.floor((Date.now()-ts)/1000);
    if(s<0) s = 0;
    if(s<60) return "الآن";
    let m = Math.floor(s/60);
    if(m<60) return "منذ "+m+" دقيقة";
    let h = Math.floor(m/60);
    if(h<24) return "منذ "+h+" ساعة";
    let d = Math.floor(h/24);
    if(d<7) return "منذ "+d+" أيام";
    let dt = new Date(ts);
    return isNaN(dt) ? "منذ فترة" : dt.toLocaleDateString('ar-EG');
};

window.showToast = (t, x, i) => {
    try {
        document.getElementById('toastTitle').innerText = t;
        document.getElementById('toastBody').innerText = x;
        document.getElementById('toastImg').src = i || dA;
        let o = document.getElementById('toastNotification');
        o.classList.add('show');
        if(window.toastTimeout) clearTimeout(window.toastTimeout);
        window.toastTimeout = setTimeout(() => o.classList.remove('show'), 5000);
    } catch(err) {}
};

window.uploadToCloudinary = async (file, type) => {
    let fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', window.CLOUDINARY_UPLOAD_PRESET);
    let res = await fetch(`https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD_NAME}/${type}/upload`, {method:'POST', body:fd});
    let data = await res.json();
    return data.secure_url;
};

window.formatMentions = (t) => {
    if(!t) return '';
    let s = t.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if(window.myFriends) {
        window.myFriends.forEach(f => {
            const escaped = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            s = s.replace(new RegExp('@'+escaped+'(?=\\s|$)', 'g'), `<a href="#/@${f}" style="color:var(--primary);cursor:pointer;background:#eef2ff;padding:2px 5px;border-radius:4px;text-decoration:none;" onclick="event.stopPropagation();">@${f}</a>`);
        });
    }
    return s;
};

// =============== نظام النوافذ المخصص (Dialog) ===============
function initDialogSystem() {
    if(document.getElementById('dlg-overlay')) return;
    
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
            const inp = document.getElementById('dlg-inp');
            document.getElementById('dlg-ic').className = 'dlg-ic ' + type;
            document.getElementById('dlg-ic').innerHTML = ICONS[type] || ICONS.info;
            document.getElementById('dlg-title').innerHTML = opts.title || '';
            document.getElementById('dlg-msg').innerHTML = opts.message || '';

            if (opts.isPrompt) {
                inp.style.display = 'block';
                inp.value = opts.defaultVal || '';
                inp.placeholder = opts.placeholder || '';
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
                btn.onclick = () => { dlgClose(); resolve(opts.isPrompt ? (b.val ? inp.value : null) : b.val); };
                footer.appendChild(btn);
            });

            ov.classList.add('dlg-show');

            function onKey(e) {
                if (e.key === 'Escape') {
                    dlgClose();
                    document.removeEventListener('keydown', onKey);
                    resolve(opts.isPrompt ? null : false);
                }
                if (e.key === 'Enter' && opts.isPrompt && document.activeElement === inp) {
                    dlgClose();
                    document.removeEventListener('keydown', onKey);
                    resolve(inp.value);
                }
            }
            document.addEventListener('keydown', onKey);
        });
    }

    function dlgClose() {
        document.getElementById('dlg-overlay').classList.remove('dlg-show');
    }

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

// تشغيل نظام النوافذ
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDialogSystem);
} else {
    initDialogSystem();
}
// =============== نظام التعليقات المتكامل ===============

// دالة إضافة تعليق جديد
window.addComment = async (postId, postAuthor, source) => {
    if(!window.currentUser) return window.showRegisterModal();
    
    const inputId = source === 'feed' ? `commentInp_feed_${postId}` : `commentInp_modal_${postId}`;
    const input = document.getElementById(inputId);
    if(!input) return;
    
    const text = input.value.trim();
    if(!text) return;
    
    try {
        const commentRef = push(ref(db, `posts/${postId}/comments`));
        await set(commentRef, {
            author: window.currentUser,
            text: text,
            timestamp: Date.now(),
            likes: {}
        });
        
        // إضافة الإشعار لصاحب المنشور
        if(postAuthor !== window.currentUser) {
            await push(ref(db, `users/${postAuthor}/notifications`), {
                type: 'comment',
                from: window.currentUser,
                postId: postId,
                timestamp: Date.now(),
                read: false
            });
        }
        
        // إشعارات للمذكورين
        const mentions = text.match(/@([a-zA-Z0-9_]+)/g);
        if(mentions) {
            mentions.forEach(mention => {
                const mentionedUser = mention.substring(1);
                if(mentionedUser !== window.currentUser && mentionedUser !== postAuthor) {
                    push(ref(db, `users/${mentionedUser}/notifications`), {
                        type: 'mention',
                        from: window.currentUser,
                        postId: postId,
                        timestamp: Date.now(),
                        read: false
                    });
                }
            });
        }
        
        input.value = '';
        
        // تحديث عرض المنشور إذا كان مفتوحاً
        if(window.currentOpenPostId === postId) {
            await window.refreshPostComments(postId);
        }
        
        window.showToast('تم إضافة التعليق', '', '');
        
    } catch(error) {
        console.error('Error adding comment:', error);
        window.dlgAlert('حدث خطأ أثناء إضافة التعليق', 'danger', 'خطأ');
    }
};

// دالة إضافة رد على تعليق
window.addReply = async (postId, commentId, commentAuthor) => {
    if(!window.currentUser) return window.showRegisterModal();
    
    const inputId = `replyText_${commentId}`;
    const input = document.getElementById(inputId);
    if(!input) return;
    
    const text = input.value.trim();
    if(!text) return;
    
    try {
        const replyRef = push(ref(db, `posts/${postId}/comments/${commentId}/replies`));
        await set(replyRef, {
            author: window.currentUser,
            text: text,
            timestamp: Date.now(),
            likes: {}
        });
        
        // إشعار لصاحب التعليق الأصلي
        if(commentAuthor !== window.currentUser) {
            await push(ref(db, `users/${commentAuthor}/notifications`), {
                type: 'reply',
                from: window.currentUser,
                postId: postId,
                commentId: commentId,
                timestamp: Date.now(),
                read: false
            });
        }
        
        input.value = '';
        
        if(window.currentOpenPostId === postId) {
            await window.refreshPostComments(postId);
        }
        
        window.showToast('تم إضافة الرد', '', '');
        
    } catch(error) {
        console.error('Error adding reply:', error);
    }
};

// دالة إظهار حقل الرد
window.showReplyInput = (commentId) => {
    const container = document.getElementById(`replyInput_${commentId}`);
    if(container) {
        const isVisible = container.style.display === 'flex';
        container.style.display = isVisible ? 'none' : 'flex';
        if(!isVisible) {
            const input = container.querySelector('input');
            if(input) input.focus();
        }
    }
};

// دالة إعجاب بتعليق
window.toggleCommentLike = async (postId, commentId, isReply = false, replyId = null) => {
    if(!window.currentUser) return;
    
    let likePath;
    if(isReply && replyId) {
        likePath = `posts/${postId}/comments/${commentId}/replies/${replyId}/likes/${window.currentUser}`;
    } else {
        likePath = `posts/${postId}/comments/${commentId}/likes/${window.currentUser}`;
    }
    
    const likeRef = ref(db, likePath);
    const snapshot = await get(likeRef);
    
    if(snapshot.exists()) {
        await remove(likeRef);
    } else {
        await set(likeRef, true);
    }
    
    // تحديث العرض
    if(window.currentOpenPostId === postId) {
        await window.refreshPostComments(postId);
    } else {
        // تحديث معاينة التعليقات في الخلاصة
        const postElement = document.querySelector(`.post-card[data-post-id="${postId}"]`);
        if(postElement) {
            const previewDiv = document.getElementById(`commentsPreview_${postId}`);
            if(previewDiv) {
                const snapshot = await get(ref(db, `posts/${postId}`));
                if(snapshot.exists()) {
                    const post = snapshot.val();
                    previewDiv.innerHTML = window.getCommentsPreview(postId, post.comments);
                }
            }
        }
    }
};

// دالة تحديث التعليقات
window.refreshPostComments = async (postId) => {
    const commentsContainer = document.getElementById('postCommentsContainer');
    if(!commentsContainer) return;
    
    const snapshot = await get(ref(db, `posts/${postId}/comments`));
    const comments = [];
    
    if(snapshot.exists()) {
        snapshot.forEach(child => {
            const comment = child.val();
            comment.id = child.key;
            comments.push(comment);
        });
        comments.sort((a, b) => a.timestamp - b.timestamp);
    }
    
    commentsContainer.innerHTML = window.renderCommentsHTML(postId, comments);
    
    // إعادة ربط الأحداث
    commentsContainer.querySelectorAll('.comment-like-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const commentId = btn.dataset.commentId;
            window.toggleCommentLike(postId, commentId);
        };
    });
    
    commentsContainer.querySelectorAll('.reply-like-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const commentId = btn.dataset.commentId;
            const replyId = btn.dataset.replyId;
            window.toggleCommentLike(postId, commentId, true, replyId);
        };
    });
    
    commentsContainer.querySelectorAll('.comment-reply-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const commentId = btn.dataset.commentId;
            window.showReplyInput(commentId);
        };
    });
};

// دالة عرض التعليقات
window.renderCommentsHTML = (postId, comments) => {
    if(!comments || comments.length === 0) {
        return `<div class="no-comments">لا توجد تعليقات بعد. كن أول من يعلق!</div>`;
    }
    
    let html = '';
    for(const comment of comments) {
        const commentAuthorData = window.allUsersData[comment.author] || {};
        const commentAuthorName = commentAuthorData.displayName || comment.author;
        const commentAuthorPic = commentAuthorData.profilePic || dA;
        const commentLikesCount = comment.likes ? Object.keys(comment.likes).length : 0;
        const isCommentLiked = comment.likes && comment.likes[window.currentUser];
        
        html += `
            <div class="comment-full" data-comment-id="${comment.id}">
                <div class="comment-avatar">
                    <img src="${commentAuthorPic}" onclick="window.openProfile('${comment.author}')">
                </div>
                <div class="comment-content-full">
                    <div class="comment-header-full">
                        <span class="comment-author-full" onclick="window.openProfile('${comment.author}')">${commentAuthorName}</span>
                        <span class="comment-time-full">${window.timeAgo(comment.timestamp)}</span>
                    </div>
                    <div class="comment-text-full">${window.formatMentions(comment.text)}</div>
                    <div class="comment-actions-full">
                        <button class="comment-like-btn-full ${isCommentLiked ? 'liked' : ''}" data-comment-id="${comment.id}" onclick="window.toggleCommentLike('${postId}', '${comment.id}')">
                            <i class="fas fa-heart"></i> ${commentLikesCount || 'إعجاب'}
                        </button>
                        <button class="comment-reply-btn-full" data-comment-id="${comment.id}" onclick="window.showReplyInput('${comment.id}')">
                            <i class="fas fa-reply"></i> رد
                        </button>
                    </div>
                    <div class="reply-input-container" id="replyInput_${comment.id}" style="display: none;">
                        <input type="text" placeholder="اكتب رداً..." id="replyText_${comment.id}" class="reply-input">
                        <button onclick="window.addReply('${postId}', '${comment.id}', '${comment.author}')" class="btn-primary btn-sm">إرسال</button>
                    </div>
        `;
        
        // عرض الردود
        if(comment.replies) {
            const replies = Object.entries(comment.replies).map(([id, val]) => ({ id, ...val }));
            replies.sort((a, b) => a.timestamp - b.timestamp);
            
            html += `<div class="replies-container-full">`;
            for(const reply of replies) {
                const replyAuthorData = window.allUsersData[reply.author] || {};
                const replyAuthorName = replyAuthorData.displayName || reply.author;
                const replyAuthorPic = replyAuthorData.profilePic || dA;
                const replyLikesCount = reply.likes ? Object.keys(reply.likes).length : 0;
                const isReplyLiked = reply.likes && reply.likes[window.currentUser];
                
                html += `
                    <div class="reply-full">
                        <div class="reply-avatar">
                            <img src="${replyAuthorPic}" onclick="window.openProfile('${reply.author}')">
                        </div>
                        <div class="reply-content-full">
                            <div class="reply-header-full">
                                <span class="reply-author-full" onclick="window.openProfile('${reply.author}')">${replyAuthorName}</span>
                                <span class="reply-time-full">${window.timeAgo(reply.timestamp)}</span>
                            </div>
                            <div class="reply-text-full">${window.formatMentions(reply.text)}</div>
                            <button class="reply-like-btn-full ${isReplyLiked ? 'liked' : ''}" data-comment-id="${comment.id}" data-reply-id="${reply.id}" onclick="window.toggleCommentLike('${postId}', '${comment.id}', true, '${reply.id}')">
                                <i class="fas fa-heart"></i> ${replyLikesCount || 'إعجاب'}
                            </button>
                        </div>
                    </div>
                `;
            }
            html += `</div>`;
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    return html;
};

// دالة عرض معاينة التعليقات
window.getCommentsPreview = (postId, comments) => {
    if(!comments) return '';
    
    const commentsList = Object.entries(comments).map(([id, val]) => ({ id, ...val }));
    commentsList.sort((a, b) => b.timestamp - a.timestamp);
    
    if(commentsList.length === 0) return '';
    
    const latestComments = commentsList.slice(0, 2);
    let html = '';
    
    for(const comment of latestComments) {
        const commentAuthor = window.allUsersData[comment.author] || {};
        const commentName = commentAuthor.displayName || comment.author;
        
        html += `
            <div class="comment-preview" onclick="window.openPostModal('${postId}')">
                <strong>${commentName}</strong>
                <span>${comment.text.substring(0, 60)}${comment.text.length > 60 ? '...' : ''}</span>
            </div>
        `;
    }
    
    if(commentsList.length > 2) {
        html += `<div class="view-all-comments" onclick="window.openPostModal('${postId}')">عرض جميع التعليقات (${commentsList.length})</div>`;
    }
    
    return html;
};

// =============== نظام مشاركة المنشورات ===============

// دالة مشاركة منشور
window.sharePost = async (postId) => {
    if(!window.currentUser) return window.showRegisterModal();
    
    const post = window.postCache[postId] || window.allPosts.find(p => p.id === postId);
    if(!post) {
        window.dlgAlert('المنشور غير موجود', 'warning', 'خطأ');
        return;
    }
    
    // فتح نافذة المشاركة
    const shareCaption = await window.dlgPrompt('أضف تعليقاً على المشاركة (اختياري):', '', 'اكتب شيئاً...');
    if(shareCaption === null) return;
    
    try {
        const sharedPostData = {
            originalPostId: post.id,
            author: post.author,
            text: post.text,
            image: post.image || null,
            video: post.video || null,
            timestamp: post.timestamp
        };
        
        const newPostRef = push(ref(db, 'posts'));
        await set(newPostRef, {
            author: window.currentUser,
            text: shareCaption || '',
            timestamp: Date.now(),
            isShare: true,
            sharedData: sharedPostData
        });
        
        window.showToast('تمت المشاركة', 'تم نشر المنشور في صفحتك', '');
        
        // إشعار لصاحب المنشور الأصلي
        if(post.author !== window.currentUser) {
            await push(ref(db, `users/${post.author}/notifications`), {
                type: 'share',
                from: window.currentUser,
                postId: post.id,
                timestamp: Date.now(),
                read: false
            });
        }
        
        // تحديث الخلاصة
        window.renderedPostIds = new Set(window.allPosts.map(p => p.id));
        window.feedLim = 5;
        window.renderFeed();
        
    } catch(error) {
        console.error('Error sharing post:', error);
        window.dlgAlert('حدث خطأ أثناء المشاركة', 'danger', 'خطأ');
    }
};

// دالة تنفيذ المشاركة (للمودال)
window.executeShare = async () => {
    const postId = document.getElementById('sharePostId')?.value;
    if(!postId) return;
    await window.sharePost(postId);
    window.closeModal('shareModal');
};
// =============== دالة عرض المنشورات المحسنة ===============

window.renderPostEnhanced = (post, isModal = false) => {
    const authorData = window.allUsersData[post.author] || {};
    const authorName = authorData.displayName || post.author;
    const authorPic = authorData.profilePic || dA;
    const isOwnPost = post.author === window.currentUser;
    const isLiked = post.likes && post.likes[window.currentUser];
    const likesCount = post.likes ? Object.keys(post.likes).length : 0;
    const commentsCount = post.comments ? Object.keys(post.comments || {}).length : 0;
    
    let postContent = '';
    
    if(post.isShare && post.sharedData) {
        const originalAuthorData = window.allUsersData[post.sharedData.author] || {};
        const originalAuthorName = originalAuthorData.displayName || post.sharedData.author;
        const originalAuthorPic = originalAuthorData.profilePic || dA;
        
        postContent = `
            <div class="shared-post-container">
                <div class="shared-post-header" onclick="window.openProfile('${post.sharedData.author}')">
                    <img src="${originalAuthorPic}" class="shared-post-avatar">
                    <div class="shared-post-info">
                        <span class="shared-post-author">${originalAuthorName}</span>
                        <span class="shared-post-time">${window.timeAgo(post.sharedData.timestamp)}</span>
                    </div>
                </div>
                <div class="shared-post-content">${window.formatMentions(post.sharedData.text || '')}</div>
                ${post.sharedData.image ? `<img src="${post.sharedData.image}" class="shared-post-media" onclick="window.openImageModal('${post.sharedData.image}')">` : ''}
                ${post.sharedData.video ? `<video src="${post.sharedData.video}" class="shared-post-media" controls></video>` : ''}
            </div>
        `;
    } else {
        postContent = `
            <div class="post-text">${window.formatMentions(post.text || '')}</div>
            ${post.image ? `<img src="${post.image}" class="post-image" onclick="window.openImageModal('${post.image}')">` : ''}
            ${post.video ? `<video src="${post.video}" class="post-video" controls></video>` : ''}
        `;
    }
    
    return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-author-info" onclick="window.openProfile('${post.author}')">
                    <img src="${authorPic}" class="post-author-avatar">
                    <div class="post-author-details">
                        <span class="post-author-name">${authorName}</span>
                        <span class="post-author-handle">@${post.author}</span>
                    </div>
                </div>
                <div class="post-header-actions">
                    ${isOwnPost ? `
                        <button class="post-edit-btn" onclick="window.editPost('${post.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="post-delete-btn" onclick="window.deletePost('${post.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="post-body">
                ${postContent}
            </div>
            <div class="post-stats">
                <div class="post-likes" onclick="window.toggleLike('${post.id}', '${post.author}', this)">
                    <i class="fas fa-heart ${isLiked ? 'liked' : ''}"></i>
                    <span>${likesCount} ${likesCount === 1 ? 'إعجاب' : 'إعجابات'}</span>
                </div>
                <div class="post-comments-count" onclick="window.openPostModal('${post.id}')">
                    <i class="fas fa-comment"></i>
                    <span>${commentsCount} ${commentsCount === 1 ? 'تعليق' : 'تعليقات'}</span>
                </div>
            </div>
            <div class="post-actions">
                <button class="post-like-btn ${isLiked ? 'liked' : ''}" onclick="window.toggleLike('${post.id}', '${post.author}', this)">
                    <i class="fas fa-heart"></i>
                    <span>${isLiked ? 'أعجبني' : 'إعجاب'}</span>
                </button>
                <button class="post-comment-btn" onclick="window.openPostModal('${post.id}')">
                    <i class="fas fa-comment"></i>
                    <span>تعليق</span>
                </button>
                <button class="post-share-btn" onclick="window.sharePost('${post.id}')">
                    <i class="fas fa-share-alt"></i>
                    <span>مشاركة</span>
                </button>
            </div>
            ${!isModal ? `
                <div class="post-comment-input">
                    <img src="${window.allUsersData[window.currentUser]?.profilePic || dA}" class="comment-input-avatar">
                    <input type="text" id="commentInp_feed_${post.id}" placeholder="اكتب تعليقاً..." class="comment-input-field" onkeypress="if(event.key==='Enter') window.addComment('${post.id}', '${post.author}', 'feed')">
                    <button onclick="window.addComment('${post.id}', '${post.author}', 'feed')" class="comment-send-btn">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="post-comments-preview" id="commentsPreview_${post.id}">
                    ${window.getCommentsPreview(post.id, post.comments)}
                </div>
            ` : `
                <div class="post-comments-section" id="postCommentsContainer">
                    ${window.renderCommentsHTML(post.id, post.comments ? Object.values(post.comments) : [])}
                </div>
                <div class="post-comment-input">
                    <img src="${window.allUsersData[window.currentUser]?.profilePic || dA}" class="comment-input-avatar">
                    <input type="text" id="commentInp_modal_${post.id}" placeholder="اكتب تعليقاً..." class="comment-input-field" onkeypress="if(event.key==='Enter') window.addComment('${post.id}', '${post.author}', 'modal')">
                    <button onclick="window.addComment('${post.id}', '${post.author}', 'modal')" class="comment-send-btn">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            `}
        </div>
    `;
};

// دالة عرض الخلاصة
window.renderFeed = () => {
    if(!window.currentUser) {
        const feedContainer = document.getElementById('postsFeed');
        if(feedContainer) feedContainer.innerHTML = '';
        return;
    }
    
    const feedContainer = document.getElementById('postsFeed');
    if(!feedContainer) return;
    
    let postsToShow = [...window.allPosts];
    postsToShow.sort((a, b) => b.timestamp - a.timestamp);
    postsToShow = postsToShow.slice(0, window.feedLim);
    
    if(postsToShow.length === 0) {
        feedContainer.innerHTML = '<div class="empty-feed">لا توجد منشورات حالياً. ابدأ بمشاركة شيء جديد!</div>';
        return;
    }
    
    let html = '';
    for(const post of postsToShow) {
        if(window.renderedPostIds.has(post.id)) continue;
        html += window.renderPostEnhanced(post, false);
        window.renderedPostIds.add(post.id);
    }
    
    feedContainer.innerHTML = html + feedContainer.innerHTML;
    
    // إضافة الأنماط إذا لم تكن موجودة
    window.addPostStyles();
};

// إضافة أنماط CSS للمنشورات المحسنة
window.addPostStyles = () => {
    if(document.getElementById('post-enhanced-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'post-enhanced-styles';
    style.textContent = `
        .post-card {
            background: var(--card-bg);
            border-radius: 16px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
            transition: all 0.2s ease;
        }
        .post-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .post-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid var(--border-color);
        }
        .post-author-info {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
        }
        .post-author-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            object-fit: cover;
        }
        .post-author-details {
            display: flex;
            flex-direction: column;
        }
        .post-author-name {
            font-weight: 700;
            font-size: 15px;
            color: var(--text-main);
        }
        .post-author-handle {
            font-size: 12px;
            color: var(--text-muted);
        }
        .post-header-actions {
            display: flex;
            gap: 8px;
        }
        .post-edit-btn, .post-delete-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            transition: all 0.2s;
            color: var(--text-muted);
        }
        .post-edit-btn:hover, .post-delete-btn:hover {
            background: var(--bg-color);
        }
        .post-delete-btn:hover { color: #ef4444; }
        .post-body { padding: 20px; }
        .post-text {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 15px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .post-image {
            width: 100%;
            max-height: 500px;
            object-fit: contain;
            border-radius: 12px;
            cursor: pointer;
        }
        .post-video {
            width: 100%;
            max-height: 500px;
            border-radius: 12px;
        }
        .shared-post-container {
            background: var(--bg-color);
            border-radius: 12px;
            padding: 15px;
            border: 1px solid var(--border-color);
        }
        .shared-post-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            cursor: pointer;
        }
        .shared-post-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            object-fit: cover;
        }
        .shared-post-info {
            display: flex;
            flex-direction: column;
        }
        .shared-post-author { font-weight: 600; font-size: 13px; }
        .shared-post-time { font-size: 11px; color: var(--text-muted); }
        .shared-post-content { font-size: 14px; margin-bottom: 10px; }
        .shared-post-media {
            width: 100%;
            max-height: 300px;
            object-fit: contain;
            border-radius: 8px;
        }
        .post-stats {
            display: flex;
            gap: 20px;
            padding: 12px 20px;
            border-top: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
            color: var(--text-muted);
            font-size: 13px;
            cursor: pointer;
        }
        .post-stats i { margin-left: 5px; }
        .post-stats .fa-heart.liked { color: #ef4444; }
        .post-actions {
            display: flex;
            justify-content: space-around;
            padding: 10px 20px;
            border-bottom: 1px solid var(--border-color);
        }
        .post-like-btn, .post-comment-btn, .post-share-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: none;
            border: none;
            padding: 10px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-muted);
            transition: all 0.2s;
        }
        .post-like-btn:hover, .post-comment-btn:hover, .post-share-btn:hover {
            background: var(--bg-color);
        }
        .post-like-btn.liked { color: #ef4444; }
        .post-like-btn.liked i { animation: heartBeat 0.3s ease; }
        @keyframes heartBeat {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
        }
        .post-comment-input {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px 20px;
            background: var(--bg-color);
        }
        .comment-input-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            object-fit: cover;
        }
        .comment-input-field {
            flex: 1;
            padding: 10px 15px;
            border: 1px solid var(--border-color);
            border-radius: 20px;
            background: var(--card-bg);
            font-size: 14px;
            outline: none;
        }
        .comment-input-field:focus { border-color: var(--primary); }
        .comment-send-btn {
            background: var(--primary);
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            color: white;
            cursor: pointer;
        }
        .comment-send-btn:hover {
            background: var(--primary-hover);
            transform: scale(1.05);
        }
        .post-comments-preview { padding: 0 20px 15px 20px; }
        .comment-preview {
            padding: 8px 0;
            font-size: 13px;
            cursor: pointer;
            border-bottom: 1px solid var(--border-color);
        }
        .comment-preview strong { color: var(--primary); margin-left: 8px; }
        .view-all-comments {
            padding: 8px 0;
            font-size: 13px;
            color: var(--primary);
            cursor: pointer;
            font-weight: 500;
        }
        .comment-full, .reply-full {
            display: flex;
            gap: 12px;
            padding: 15px;
            background: var(--bg-color);
            border-radius: 12px;
            margin-bottom: 12px;
        }
        .comment-avatar img, .reply-avatar img {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            object-fit: cover;
            cursor: pointer;
        }
        .comment-content-full, .reply-content-full { flex: 1; }
        .comment-header-full, .reply-header-full {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 5px;
        }
        .comment-author-full, .reply-author-full {
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
        }
        .comment-time-full, .reply-time-full {
            font-size: 11px;
            color: var(--text-muted);
        }
        .comment-text-full, .reply-text-full {
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 8px;
        }
        .comment-actions-full {
            display: flex;
            gap: 15px;
        }
        .comment-like-btn-full, .comment-reply-btn-full, .reply-like-btn-full {
            background: none;
            border: none;
            font-size: 12px;
            color: var(--text-muted);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
        }
        .comment-like-btn-full:hover, .comment-reply-btn-full:hover, .reply-like-btn-full:hover {
            background: var(--card-bg);
        }
        .comment-like-btn-full.liked, .reply-like-btn-full.liked { color: #ef4444; }
        .reply-input-container {
            display: flex;
            gap: 8px;
            margin-top: 10px;
        }
        .reply-input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            border-radius: 20px;
            font-size: 13px;
            outline: none;
        }
        .btn-sm {
            padding: 6px 15px;
            font-size: 12px;
        }
        .replies-container-full {
            margin-top: 12px;
            margin-right: 20px;
            padding-right: 15px;
            border-right: 2px solid var(--border-color);
        }
        .empty-feed {
            text-align: center;
            padding: 50px;
            color: var(--text-muted);
            background: var(--card-bg);
            border-radius: 16px;
        }
        .no-comments {
            text-align: center;
            padding: 30px;
            color: var(--text-muted);
        }
    `;
    document.head.appendChild(style);
};
// =============== دوال الإعجابات ===============
window.toggleLike = async (postId, postAuthor, element) => {
    if(!window.currentUser) return window.showRegisterModal();
    
    const likeRef = ref(db, `posts/${postId}/likes/${window.currentUser}`);
    const snapshot = await get(likeRef);
    
    if(snapshot.exists()) {
        await remove(likeRef);
        // تحديث واجهة المستخدم
        if(element) {
            const icon = element.querySelector('.fa-heart');
            if(icon) icon.classList.remove('liked');
            const btn = element.closest('.post-like-btn');
            if(btn) btn.classList.remove('liked');
        }
    } else {
        await set(likeRef, true);
        // تحديث واجهة المستخدم
        if(element) {
            const icon = element.querySelector('.fa-heart');
            if(icon) icon.classList.add('liked');
            const btn = element.closest('.post-like-btn');
            if(btn) btn.classList.add('liked');
        }
        // إرسال إشعار
        if(postAuthor !== window.currentUser) {
            await push(ref(db, `users/${postAuthor}/notifications`), {
                type: 'like',
                from: window.currentUser,
                postId: postId,
                timestamp: Date.now(),
                read: false
            });
        }
    }
    
    // تحديث عدد الإعجابات
    const postSnapshot = await get(ref(db, `posts/${postId}`));
    if(postSnapshot.exists()) {
        const post = postSnapshot.val();
        const likesCount = post.likes ? Object.keys(post.likes).length : 0;
        const statsDiv = element?.closest('.post-card')?.querySelector('.post-stats .post-likes span');
        if(statsDiv) statsDiv.innerText = `${likesCount} ${likesCount === 1 ? 'إعجاب' : 'إعجابات'}`;
    }
};

// =============== دوال المنشورات ===============
window.publishPost = async () => {
    const content = document.getElementById('postContent')?.value.trim();
    const file = window.selectedMediaFile;
    const type = window.selectedMediaType;
    
    if(!content && !file) return;
    
    const btn = document.getElementById('publishBtn');
    const originalText = btn?.innerHTML;
    if(btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري...';
        btn.disabled = true;
    }
    
    try {
        let url = null;
        if(file) {
            url = await window.uploadToCloudinary(file, type === 'reel' ? 'video' : type);
        }
        
        const postData = {
            author: window.currentUser,
            timestamp: Date.now()
        };
        
        if(content) postData.text = content;
        if(type === 'image' && url) postData.image = url;
        if((type === 'video' || type === 'reel') && url) postData.video = url;
        if(type === 'reel') postData.isReel = true;
        
        const newPostRef = push(ref(db, 'posts'));
        await set(newPostRef, postData);
        
        // إشعارات للمذكورين
        if(content) {
            const mentions = content.match(/@([a-zA-Z0-9_]+)/g);
            if(mentions) {
                mentions.forEach(mention => {
                    const mentionedUser = mention.substring(1);
                    if(mentionedUser !== window.currentUser) {
                        push(ref(db, `users/${mentionedUser}/notifications`), {
                            type: 'mention',
                            from: window.currentUser,
                            postId: newPostRef.key,
                            timestamp: Date.now(),
                            read: false
                        });
                    }
                });
            }
        }
        
        // إعادة تعيين الحقول
        document.getElementById('postContent').value = '';
        window.removeMediaPreview();
        
        window.showToast('تم النشر', 'تم نشر منشورك بنجاح', '');
        
        // تحديث الخلاصة
        window.renderedPostIds = new Set(window.allPosts.map(p => p.id));
        window.feedLim = 5;
        window.renderFeed();
        
    } catch(error) {
        console.error('Error publishing post:', error);
        window.dlgAlert('حدث خطأ أثناء النشر', 'danger', 'خطأ');
    } finally {
        if(btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
};

window.deletePost = async (postId) => {
    const confirmed = await window.dlgDanger('هل تريد حذف هذا المنشور نهائياً؟', 'حذف المنشور');
    if(confirmed) {
        await remove(ref(db, `posts/${postId}`));
        window.showToast('تم الحذف', 'تم حذف المنشور بنجاح', '');
        if(window.location.hash === '#/post/' + postId) {
            window.goHome();
        }
        window.renderFeed();
    }
};

window.editPost = async (postId) => {
    const post = window.postCache[postId];
    if(!post) return;
    
    const newText = await window.dlgPrompt('تعديل المنشور:', post.text || '', 'اكتب النص الجديد...');
    if(newText !== null && newText !== post.text) {
        await update(ref(db, `posts/${postId}`), { text: newText.trim() });
        window.showToast('تم التعديل', 'تم تعديل المنشور بنجاح', '');
        window.renderFeed();
    }
};

// =============== دوال الملف الشخصي المتقدمة ===============
window.openProfile = (userId) => {
    window.location.hash = '#/@' + userId;
};

window.openPostModal = (postId) => {
    window.currentOpenPostId = postId;
    window.location.hash = '#/post/' + postId;
};

window.openPostLogic = async (postId) => {
    let post = window.postCache[postId];
    
    if(!post) {
        const snapshot = await get(ref(db, `posts/${postId}`));
        if(snapshot.exists()) {
            post = snapshot.val();
            post.id = postId;
            window.postCache[postId] = post;
        }
    }
    
    if(!post) {
        window.dlgAlert('المنشور غير موجود', 'warning', 'خطأ');
        window.goHome();
        return;
    }
    
    const modal = document.getElementById('postModal');
    const body = document.getElementById('postModalBody');
    
    if(modal && body) {
        body.innerHTML = window.renderPostEnhanced(post, true);
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
};

// =============== دوال إدارة المحتوى ===============
window.showNewPosts = () => {
    window.renderedPostIds = new Set(window.allPosts.map(p => p.id));
    window.feedLim = 5;
    window.renderFeed();
    document.getElementById('newPostsBtn').style.display = 'none';
};

window.goHome = () => {
    if(!window.currentUser) {
        window.location.replace('#/login');
        return;
    }
    window.location.hash = '';
    window.scrollTo({top: 0, behavior: 'smooth'});
    window.renderedPostIds = new Set();
    window.feedLim = 5;
    window.renderFeed();
    document.getElementById('newPostsBtn').style.display = 'none';
};

// =============== مستمعي Firebase ===============
function listenToPosts() {
    onValue(query(ref(db, 'posts'), orderByChild('timestamp'), limitToLast(500)), (snapshot) => {
        const posts = [];
        if(snapshot.exists()) {
            snapshot.forEach(child => {
                const post = child.val();
                post.id = child.key;
                window.postCache[post.id] = post;
                if(!post.isNewsBot) posts.push(post);
            });
            posts.sort((a, b) => b.timestamp - a.timestamp);
        }
        
        const oldLength = window.allPosts.length;
        window.allPosts = posts;
        
        if(window.isInitialLoad) {
            window.isInitialLoad = false;
            if(window.currentUser) window.renderFeed();
        } else {
            const newPosts = posts.slice(0, oldLength);
            if(newPosts.length > 0) {
                document.getElementById('newPostsBtn').style.display = 'block';
                document.getElementById('newPostsBtn').innerHTML = `<i class='fas fa-arrow-up'></i> ${newPosts.length} منشور جديد — انقر للتحديث`;
            }
        }
        
        if(window.location.hash.startsWith('#/@')) {
            const userId = decodeURIComponent(window.location.hash.replace('#/@', ''));
            // تحديث ملف المستخدم
        }
    });
}

function listenToUsers() {
    onValue(ref(db, 'users'), (snapshot) => {
        if(snapshot.exists()) {
            window.allUsersData = snapshot.val();
            if(window.isInitialLoad) {
                listenToPosts();
            }
            if(window.currentUser) {
                window.renderSidebarUsers?.();
                window.renderRequests?.();
                window.renderSidebarTop?.();
                window.initRightSidebar?.();
            }
        }
    });
}

// =============== بدء التشغيل ===============
if(window.currentUser) {
    const loginBtn = document.getElementById('loginBtn');
    if(loginBtn) {
        loginBtn.innerText = "جاري...";
        loginBtn.disabled = true;
    }
    get(ref(db, `users/${window.currentUser}`)).then(snapshot => {
        if(snapshot.exists()) {
            window.fL(window.currentUser, snapshot.val());
        } else {
            window.rU();
        }
    }).catch(() => window.rU());
} else {
    window.rU();
}

// تصدير الدوال للنافذة
window._listenToUsers = listenToUsers;
window._listenToPosts = listenToPosts;
window._renderFeed = window.renderFeed;
