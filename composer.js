import { ref, set, update, push, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);

window.selectedMediaFiles = [];
window.previewImage = (e) => { let f = e.target.files[0]; if(!f) return; let reader = new FileReader(); reader.onload = (ev) => { let preview = document.getElementById('editModalPicPreview'); let base64Input = document.getElementById('editPicBase64'); if(preview) preview.src = ev.target.result; if(base64Input) base64Input.value = ev.target.result; }; reader.readAsDataURL(f); };
window.compressImageIfNeeded = (file) => {
    const MAX_BYTES = 9.5 * 1024 * 1024; // هامش أمان تحت حد 10 ميجا في كلاودينري
    if (file.size <= MAX_BYTES) return Promise.resolve(file);
    return new Promise((resolve) => {
        let img = new Image(), url = URL.createObjectURL(file);
        img.onload = () => {
            let { width, height } = img;
            let maxDim = 2200;
            if (width > maxDim || height > maxDim) {
                if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
                else { width = Math.round(width * (maxDim / height)); height = maxDim; }
            }
            let canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            let tryQuality = (q) => {
                canvas.toBlob((blob) => {
                    if (!blob) return resolve(file);
                    if (blob.size > MAX_BYTES && q > 0.4) { tryQuality(q - 0.15); return; }
                    resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
                }, 'image/jpeg', q);
            };
            tryQuality(0.85);
        };
        img.onerror = () => resolve(file);
        img.src = url;
    });
};
window.previewMedia = (e, type) => {
    let files = Array.from(e.target.files || []); if (files.length === 0) return;
    if (type === 'video' || type === 'reel') {
        for (let f of files) { if (f.size > 50*1024*1024) { window.dlgAlert("الفيديو كبير جداً! الحد الأقصى 50 ميجا.", "warning", "تنبيه"); return; } }
    }
    if (type === 'reel') {
        // الريلز عنصر واحد فقط، ويستبدل أي تحديد سابق
        window.selectedMediaFiles = [{ file: files[0], type: 'reel', previewUrl: URL.createObjectURL(files[0]) }];
    } else {
        // إزالة أي ريلز محدد سابقًا عند اختيار صور/فيديوهات عادية
        window.selectedMediaFiles = window.selectedMediaFiles.filter(m => m.type !== 'reel');
        files.forEach(f => window.selectedMediaFiles.push({ file: f, type, previewUrl: URL.createObjectURL(f) }));
    }
    e.target.value = '';
    window.renderMediaPreviewGrid();
};
window.renderMediaPreviewGrid = () => {
    let cont = $('postMediaPreviewContainer'), grid = $('postMediaPreviewGrid');
    if (window.selectedMediaFiles.length === 0) { cont.style.display = 'none'; grid.innerHTML = ''; return; }
    cont.style.display = 'block';
    grid.innerHTML = window.selectedMediaFiles.map((m, i) => `
        <div style="position:relative;border-radius:10px;overflow:hidden;aspect-ratio:1/1;background:#000;">
            ${m.type === 'image' ? `<img src="${m.previewUrl}" style="width:100%;height:100%;object-fit:cover;">` : `<video src="${m.previewUrl}" style="width:100%;height:100%;object-fit:cover;" muted></video><i class="fas fa-play" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:20px;text-shadow:0 2px 6px rgba(0,0,0,.6);"></i>`}
            <span onclick="window.removeOneMediaItem(${i})" style="position:absolute;top:5px;left:5px;background:rgba(0,0,0,.7);color:#fff;cursor:pointer;border-radius:50%;width:24px;height:24px;text-align:center;line-height:24px;font-size:12px;"><i class="fas fa-times"></i></span>
        </div>`).join('');
};
window.removeOneMediaItem = (idx) => { window.selectedMediaFiles.splice(idx, 1); window.renderMediaPreviewGrid(); };
window.removeMediaPreview = () => { window.selectedMediaFiles = []; let pmc=$('postMediaPreviewContainer'),pmg=$('postMediaPreviewGrid'),ppw=$('postUploadProgressWrap'); if(pmc)pmc.style.display='none'; if(pmg)pmg.innerHTML=''; if(ppw)ppw.style.display='none'; };
window.publishPost = async () => {
    let c = $('postContent').value.trim(), items = window.selectedMediaFiles;
    if (!c && items.length === 0) return;
    let bt = $('publishBtn'), ot = bt.innerHTML;
    bt.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري النشر...'; bt.disabled = true;
    let progWrap = $('postUploadProgressWrap'), progBar = $('postUploadProgressBar'), progText = $('postUploadProgressText');
    const setProg = (w, t) => { if(progBar) progBar.style.width = w; if(progText) progText.innerText = t; };
    const showProg = (v) => { if(progWrap) progWrap.style.display = v; };
    let isReel = items.length === 1 && items[0].type === 'reel';
    try {
        let images = [], videos = [], total = items.length;
        if (total > 0) { showProg('block'); setProg('0%', 'جاري تحضير الملفات...'); }
        // تحضير كل الملفات أولاً (ضغط الصور الكبيرة) لمعرفة الحجم الحقيقي النهائي قبل حساب نسبة التحميل
        let finalFiles = [];
        for (let m of items) {
            let f = m.file;
            if (m.type === 'image') f = await window.compressImageIfNeeded(m.file);
            finalFiles.push(f);
        }
        let totalBytes = finalFiles.reduce((s, f) => s + (f.size || 0), 0) || 1;
        let loadedPerFile = new Array(total).fill(0);
        let updateOverall = () => {
            let loaded = loadedPerFile.reduce((s, v) => s + v, 0);
            let pct = Math.min(100, Math.round((loaded / totalBytes) * 100));
            setProg(pct + '%', `جاري رفع ${total > 1 ? total + ' ملفات' : 'الملف'}... ${pct}%`);
        };
        updateOverall();
        for (let i = 0; i < total; i++) {
            let m = items[i], fileToUpload = finalFiles[i];
            let cloudType = m.type === 'reel' ? 'video' : m.type;
            let url;
            try {
                url = await window.uploadToCloudinary(fileToUpload, cloudType, (pct) => {
                    loadedPerFile[i] = (fileToUpload.size || 0) * (pct / 100);
                    updateOverall();
                });
            } catch (errFirst) {
                // محاولة ثانية تلقائية في حال كان الخطأ مؤقتاً (انقطاع شبكة، حد طلبات)
                await new Promise(r => setTimeout(r, 800));
                url = await window.uploadToCloudinary(fileToUpload, cloudType, (pct) => {
                    loadedPerFile[i] = (fileToUpload.size || 0) * (pct / 100);
                    updateOverall();
                });
            }
            loadedPerFile[i] = fileToUpload.size || 0; updateOverall();
            if (m.type === 'image') images.push(url); else videos.push(url);
        }
        setProg('100%', total > 0 ? 'اكتمل الرفع ✅' : '');
        let d = { author: window.currentUser, text: c || (isReel ? 'ريلز جديد 🎦' : ''), timestamp: Date.now() };
        if (images.length === 1) d.image = images[0]; else if (images.length > 1) { d.images = images; d.image = images[0]; }
        if (videos.length === 1) d.video = videos[0]; else if (videos.length > 1) { d.videos = videos; d.video = videos[0]; }
        if (isReel) d.isReel = true;
        let nr = push(ref(db, 'posts')); await set(nr, d);
        window.myFriends.forEach(f => { if (c.includes('@' + f)) push(ref(db, `users/${f}/notifications`), { type: 'mention', from: window.currentUser, postId: nr.key, timestamp: Date.now(), read: false }); });
        bt.innerHTML = ot; bt.disabled = false;
        let pc = $('postContent'); if(pc) pc.value = '';
        window.removeMediaPreview();
        let gmb = $('globalMentionBox'); if(gmb) gmb.style.display = 'none';
        if (isReel) window.dlgAlert('تم نشر الفيديو بنجاح وإضافته للريلز! 🎬', 'success', 'تم النشر');
    } catch (e) {
        console.error('Publish post error:', e);
        window.dlgAlert("حدث خطأ أثناء الرفع: " + (e?.message || 'غير معروف') + " — يرجى المحاولة مجدداً.", "danger", "خطأ");
        bt.innerHTML = ot; bt.disabled = false; showProg('none');
    }
};
window.deletePost = (id) => { window.dlgDanger("هل تريد حذف هذا المنشور نهائياً؟").then(ok => { if(ok) { remove(ref(db, `posts/${id}`)); window.location.hash=''; } }); };
window.editMediaItems = [];
window.editingPostId = null;
window.editPost = (id) => {
    let p = window.postCache[id]; if (!p) return;
    if (p.author !== window.currentUser) return;
    window.editingPostId = id;
    $('editPostContent').value = p.text || '';
    window.editMediaItems = [];
    let imgs = (p.images && p.images.length) ? p.images : (p.image ? [p.image] : []);
    imgs.forEach(u => window.editMediaItems.push({ kind: 'existing', mediaType: 'image', url: u }));
    let vids = (p.videos && p.videos.length) ? p.videos : (p.video ? [p.video] : []);
    vids.forEach(u => window.editMediaItems.push({ kind: 'existing', mediaType: 'video', url: u }));
    window.renderEditMediaGrid();
    let epw = $('editPostUploadProgressWrap'); if (epw) epw.style.display = 'none';
    let bt = $('saveEditPostBtn'); if (bt) { bt.disabled = false; bt.innerHTML = '<em class="fas fa-save"></em> حفظ التعديلات'; }
    $('editPostModal').classList.add('show');
    document.body.style.overflow = 'hidden';
};
window.closeEditPostModal = () => {
    let m = $('editPostModal'); if (m) m.classList.remove('show');
    document.body.style.overflow = 'auto';
    window.editMediaItems = [];
    window.editingPostId = null;
};
window.previewEditMedia = (e, type) => {
    let files = Array.from(e.target.files || []); if (files.length === 0) return;
    if (type === 'video') { for (let f of files) { if (f.size > 50 * 1024 * 1024) { window.dlgAlert("الفيديو كبير جداً! الحد الأقصى 50 ميجا.", "warning", "تنبيه"); return; } } }
    files.forEach(f => window.editMediaItems.push({ kind: 'new', type, file: f, previewUrl: URL.createObjectURL(f) }));
    e.target.value = '';
    window.renderEditMediaGrid();
};
window.renderEditMediaGrid = () => {
    let cont = $('editPostMediaContainer'), grid = $('editPostMediaGrid');
    if (!cont || !grid) return;
    if (window.editMediaItems.length === 0) { cont.style.display = 'none'; grid.innerHTML = ''; return; }
    cont.style.display = 'block';
    grid.innerHTML = window.editMediaItems.map((m, i) => {
        let src = m.kind === 'existing' ? m.url : m.previewUrl;
        let mtype = m.kind === 'existing' ? m.mediaType : m.type;
        return `<div style="position:relative;border-radius:10px;overflow:hidden;aspect-ratio:1/1;background:#000;">
            ${mtype === 'image' ? `<img src="${src}" style="width:100%;height:100%;object-fit:cover;">` : `<video src="${src}" style="width:100%;height:100%;object-fit:cover;" muted></video><i class="fas fa-play" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:20px;text-shadow:0 2px 6px rgba(0,0,0,.6);"></i>`}
            <span onclick="window.removeEditMediaItem(${i})" style="position:absolute;top:5px;left:5px;background:rgba(0,0,0,.7);color:#fff;cursor:pointer;border-radius:50%;width:24px;height:24px;text-align:center;line-height:24px;font-size:12px;"><i class="fas fa-times"></i></span>
        </div>`;
    }).join('');
};
window.removeEditMediaItem = (idx) => { window.editMediaItems.splice(idx, 1); window.renderEditMediaGrid(); };
window.saveEditPost = async () => {
    let id = window.editingPostId; if (!id) return;
    let text = $('editPostContent').value.trim();
    let items = window.editMediaItems;
    if (!text && items.length === 0) return window.dlgAlert('لا يمكن أن يكون المنشور فارغاً تماماً.', 'warning', 'تنبيه');
    let bt = $('saveEditPostBtn'), ot = bt.innerHTML;
    bt.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...'; bt.disabled = true;
    let progWrap = $('editPostUploadProgressWrap'), progBar = $('editPostUploadProgressBar'), progText = $('editPostUploadProgressText');
    const setProg = (w, t) => { if (progBar) progBar.style.width = w; if (progText) progText.innerText = t; };
    const showProg = (v) => { if (progWrap) progWrap.style.display = v; };
    try {
        let newItems = items.filter(m => m.kind === 'new');
        if (newItems.length > 0) { showProg('block'); setProg('0%', 'جاري تحضير الملفات...'); }
        let finalFiles = [];
        for (let m of newItems) { let f = m.file; if (m.type === 'image') f = await window.compressImageIfNeeded(m.file); finalFiles.push(f); }
        let totalBytes = finalFiles.reduce((s, f) => s + (f.size || 0), 0) || 1;
        let loadedPerFile = new Array(newItems.length).fill(0);
        let updateOverall = () => { let loaded = loadedPerFile.reduce((s, v) => s + v, 0); let pct = Math.min(100, Math.round((loaded / totalBytes) * 100)); setProg(pct + '%', `جاري رفع ${newItems.length > 1 ? newItems.length + ' ملفات' : 'الملف'}... ${pct}%`); };
        if (newItems.length > 0) updateOverall();
        let newUrls = new Array(newItems.length);
        for (let i = 0; i < newItems.length; i++) {
            let m = newItems[i], fileToUpload = finalFiles[i], url;
            try { url = await window.uploadToCloudinary(fileToUpload, m.type, (pct) => { loadedPerFile[i] = (fileToUpload.size || 0) * (pct / 100); updateOverall(); }); }
            catch (errFirst) { await new Promise(r => setTimeout(r, 800)); url = await window.uploadToCloudinary(fileToUpload, m.type, (pct) => { loadedPerFile[i] = (fileToUpload.size || 0) * (pct / 100); updateOverall(); }); }
            loadedPerFile[i] = fileToUpload.size || 0; updateOverall();
            newUrls[i] = url;
        }
        if (newItems.length > 0) setProg('100%', 'اكتمل الرفع ✅');
        // إعادة بناء قوائم الصور والفيديوهات النهائية بنفس ترتيب العرض في نافذة التعديل
        let images = [], videos = [], newIdx = 0;
        items.forEach(m => {
            if (m.kind === 'existing') { if (m.mediaType === 'image') images.push(m.url); else videos.push(m.url); }
            else { let url = newUrls[newIdx++]; if (m.type === 'image') images.push(url); else videos.push(url); }
        });
        // null يحذف الحقل من Firebase في حال لم تعد هناك صور/فيديوهات
        let d = {
            text,
            image: images.length ? images[0] : null,
            images: images.length > 1 ? images : null,
            video: videos.length ? videos[0] : null,
            videos: videos.length > 1 ? videos : null
        };
        await update(ref(db, `posts/${id}`), d);
        bt.innerHTML = ot; bt.disabled = false;
        window.closeEditPostModal();
        window.dlgAlert('تم تعديل المنشور بنجاح ✅', 'success', 'تم الحفظ');
    } catch (e) {
        console.error('Edit post error:', e);
        window.dlgAlert("حدث خطأ أثناء حفظ التعديلات: " + (e?.message || 'غير معروف') + " — يرجى المحاولة مجدداً.", "danger", "خطأ");
        bt.innerHTML = ot; bt.disabled = false; showProg('none');
    }
};
function injectUploadUI() {
    const composer = document.getElementById('postContent');
    if (!composer || document.getElementById('postMediaPreviewContainer')) return;
    const wrap = composer.closest('.composer-box') || composer.parentElement;
    if (!wrap) return;

    // منطقة المعاينة
    const previewContainer = document.createElement('div');
    previewContainer.id = 'postMediaPreviewContainer';
    previewContainer.style.cssText = 'display:none;margin-bottom:10px;';
    previewContainer.innerHTML = `<div id="postMediaPreviewGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;"></div>`;

    // شريط التحميل
    const progressWrap = document.createElement('div');
    progressWrap.id = 'postUploadProgressWrap';
    progressWrap.style.cssText = 'display:none;margin-bottom:10px;';
    progressWrap.innerHTML = `
        <div style="background:#e2e8f0;border-radius:10px;overflow:hidden;height:10px;">
            <div id="postUploadProgressBar" style="background:var(--primary);height:100%;width:0%;transition:width .2s;border-radius:10px;"></div>
        </div>
        <div id="postUploadProgressText" style="font-size:12px;color:var(--text-muted);margin-top:5px;text-align:center;font-weight:700;"></div>`;

    // أدخل قبل الـ textarea
    wrap.insertBefore(progressWrap, composer);
    wrap.insertBefore(previewContainer, composer);

    // تحديث أزرار الملفات لتقبل أكثر من ملف
    const fileInputs = wrap.querySelectorAll('input[type="file"]');
    fileInputs.forEach(inp => {
        const accept = inp.accept || '';
        if (accept.includes('image')) {
            inp.multiple = true;
            if (!inp.dataset.upgraded) {
                inp.dataset.upgraded = '1';
                inp.addEventListener('change', (e) => window.previewMedia(e, 'image'));
            }
        } else if (accept.includes('video')) {
            inp.multiple = true;
            if (!inp.dataset.upgraded) {
                inp.dataset.upgraded = '1';
                inp.addEventListener('change', (e) => window.previewMedia(e, 'video'));
            }
        }
    });
}
window.injectUploadUI = injectUploadUI;
