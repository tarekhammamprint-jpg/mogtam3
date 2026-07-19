import { ref, get, push, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);

window.openAdminStats = () => { window.location.hash = '#/stats'; };
window.openStatsLogic = () => { $('statsModal').classList.add('show'); document.body.style.overflow = 'hidden'; get(ref(db, 'users')).then(us => { let r=0, o=0; if(us.exists()) { let v = us.val(); for(let k in v) { r++; if(v[k].online) o++; } } $('statReal').innerText = r; let sb = document.getElementById('statBots'); if(sb) sb.innerText = 0; $('statOnline').innerText = o; }); get(ref(db, 'posts')).then(ps => { $('statPosts').innerText = ps.exists() ? Object.keys(ps.val()).length : 0; }); };
window.showBanScreen = function(d) {
    let now = Date.now();
    let perm = !d.banUntil || d.banUntil === 0;
    let remaining = '';
    if (!perm) {
        let ms = d.banUntil - now;
        let days = Math.floor(ms / 86400000);
        let hours = Math.floor((ms % 86400000) / 3600000);
        remaining = days > 0 ? `متبقي ${days} يوم و${hours} ساعة` : `متبقي ${hours} ساعة`;
    }
    let reason = d.banReason || 'مخالفة سياسة المنصة';
    document.body.innerHTML = `
        <div style="min-height:100vh;background:#0f172a;display:flex;align-items:center;justify-content:center;font-family:Cairo,sans-serif;padding:20px;">
            <div style="background:#1e293b;border-radius:24px;padding:40px 35px;max-width:480px;width:100%;text-align:center;border:1px solid #334155;">
                <div style="width:90px;height:90px;background:#ef444420;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 25px;">
                    <i class="fas fa-ban" style="font-size:40px;color:#ef4444;"></i>
                </div>
                <h2 style="color:#f1f5f9;font-size:22px;font-weight:800;margin-bottom:10px;">تم إيقاف حسابك</h2>
                <p style="color:#94a3b8;font-size:14px;margin-bottom:25px;line-height:1.7;">
                    ${perm ? 'تم إيقاف حسابك بشكل دائم.' : `تم إيقاف حسابك مؤقتاً.<br><strong style="color:#f59e0b;">${remaining}</strong>`}
                </p>
                <div style="background:#0f172a;border-radius:14px;padding:18px;margin-bottom:25px;border:1px solid #334155;text-align:right;">
                    <div style="font-size:12px;color:#64748b;margin-bottom:6px;font-weight:700;">سبب الإيقاف</div>
                    <div style="color:#e2e8f0;font-size:15px;font-weight:600;">${reason}</div>
                </div>
                ${perm ? '' : `<div style="background:#f59e0b15;border:1px solid #f59e0b40;border-radius:12px;padding:14px;margin-bottom:20px;color:#fbbf24;font-size:13px;">
                    <i class="fas fa-clock"></i> سيُرفع الإيقاف تلقائياً عند انتهاء المدة
                </div>`}
                <button onclick="localStorage.removeItem('savedUser');location.reload();" 
                    style="background:#334155;color:#94a3b8;border:none;padding:12px 30px;border-radius:12px;font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;">
                    <i class="fas fa-sign-out-alt"></i> تسجيل الخروج
                </button>
            </div>
        </div>`;
    if (!document.querySelector('link[href*="font-awesome"]')) {
        let fa = document.createElement('link');
        fa.rel = 'stylesheet';
        fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fa);
    }
};
window.warnUser = (uid) => {
    if(!window.currentUser || window.currentUser.toLowerCase() !== 'admin21') return;
    window.dlgPrompt(`رسالة تحذير لـ ${window.getDisplayName(uid)}:`, '', 'اكتب رسالة التحذير...').then(msg => {
    if(msg) push(ref(db, `users/${uid}/notifications`), {type:'system', text:'⚠️ تحذير من الإدارة: ' + msg, timestamp:Date.now(), read:false}); });
};
window.adminDeletePost = (id) => {
    if(!window.currentUser || window.currentUser.toLowerCase() !== 'admin21') return;
    window.dlgDanger('حذف هذا المنشور إدارياً؟', 'حذف إداري').then(ok => { if(ok) remove(ref(db, `posts/${id}`)); });
};
