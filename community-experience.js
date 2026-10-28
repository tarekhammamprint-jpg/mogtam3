import { ref, get, set, push, onValue, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const getComm = id => window.allCommunities?.[id] || {};
const member = c => !!(c.members && c.members[window.currentUser]) || c.admin === window.currentUser;
const priceLabel = c => Number(c.price || 0) > 0 ? `${Number(c.price).toLocaleString('ar-EG')} ${esc(c.currency || 'USD')} / ${c.billingCycle === 'yearly' ? 'سنة' : 'شهر'}` : 'مجتمع مجاني';

function styles() {
  if ($('communityExperienceStyle')) return;
  const s = document.createElement('style'); s.id = 'communityExperienceStyle';
  s.textContent = `
  .ce-shell{display:flex;flex-direction:column;gap:14px}.ce-cover{min-height:190px;border-radius:20px;padding:24px;display:flex;align-items:flex-end;color:#fff;position:relative;overflow:hidden;background:linear-gradient(135deg,#312e81,#7c3aed 52%,#0ea5e9)}.ce-cover:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 15% 20%,rgba(255,255,255,.22),transparent 30%),linear-gradient(transparent,rgba(0,0,0,.38))}.ce-cover>*{position:relative;z-index:1}.ce-title{font-size:27px;font-weight:900;margin:0 0 6px}.ce-desc{margin:0;opacity:.9;line-height:1.8;font-size:14px}.ce-stat-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.ce-stat{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:7px 11px;font-size:12px}.ce-section{background:var(--card-bg,#fff);border:1px solid var(--border,#e2e8f0);border-radius:16px;padding:17px}.ce-section h3{margin:0 0 5px;font-size:17px}.ce-sub{color:var(--text-muted,#64748b);font-size:12px;margin:0 0 13px}.ce-video-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.ce-video-card{border:1px solid var(--border,#e2e8f0);border-radius:14px;overflow:hidden;background:var(--card-bg,#fff)}.ce-video-card video{width:100%;height:125px;display:block;object-fit:cover;background:#0f172a}.ce-video-body{padding:11px}.ce-video-title{font-weight:800;font-size:14px;margin-bottom:4px}.ce-video-meta{font-size:11px;color:#64748b;line-height:1.6}.ce-lock{height:125px;background:linear-gradient(135deg,#111827,#334155);display:flex;align-items:center;justify-content:center;color:#fff;font-size:29px;position:relative}.ce-lock span{position:absolute;bottom:10px;font-size:11px;background:rgba(0,0,0,.5);padding:4px 8px;border-radius:99px}.ce-cta{display:flex;align-items:center;justify-content:space-between;gap:12px;background:linear-gradient(135deg,#fff7ed,#fffbeb);border:1px solid #fed7aa;border-radius:14px;padding:14px;color:#7c2d12}.ce-empty{padding:20px;text-align:center;color:#64748b;border:1px dashed #cbd5e1;border-radius:12px}.ce-admin-form{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ce-admin-form textarea,.ce-admin-form input,.ce-admin-form select{width:100%;box-sizing:border-box}.ce-admin-form .full{grid-column:1/-1}.ce-post-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px}.ce-tool{border:1px solid var(--border,#e2e8f0);background:var(--card-bg,#fff);color:var(--text-main,#0f172a);border-radius:10px;padding:8px 10px;font-family:inherit;cursor:pointer;font-size:12px;font-weight:700}.ce-tool:hover{border-color:#6366f1;color:#6366f1}.ce-media-preview{display:none;margin-top:10px;padding:8px;border-radius:12px;background:#f8fafc;font-size:12px}.ce-media-preview video,.ce-media-preview img{max-height:130px;max-width:100%;border-radius:9px;display:block;margin-top:6px}.ce-post-type{font-size:12px;font-weight:700;color:#64748b;border:1px solid #e2e8f0;border-radius:9px;padding:7px;font-family:inherit}
  @media(max-width:600px){.ce-title{font-size:22px}.ce-cover{min-height:175px;padding:17px}.ce-admin-form{grid-template-columns:1fr}.ce-admin-form .full{grid-column:auto}}
  `; document.head.appendChild(s);
}

function addHeader(id) {
  const c = getComm(id), title = $('communityViewTitle'), desc = $('communityViewDesc');
  if (!title || !desc) return;
  title.textContent = c.name || 'المجتمع'; desc.textContent = c.description || 'مساحة خاصة للتعلم والتواصل والمشاركة.';
  const old = document.getElementById('ceHeaderPrice'); if (old) old.remove();
  const node = document.createElement('div'); node.id='ceHeaderPrice'; node.style.cssText='position:relative;margin:8px 0 0;font-weight:800;font-size:13px;';
  node.innerHTML = `<i class="fas fa-${Number(c.price||0)>0?'crown':'users'}"></i> ${priceLabel(c)}`;
  desc.insertAdjacentElement('afterend', node);
}

function adminVideoForm(id) {
  const c = getComm(id); if (c.admin !== window.currentUser) return '';
  return `<details class="ce-section" style="margin-top:12px"><summary style="cursor:pointer;font-weight:900;color:var(--primary)"><i class="fas fa-video"></i> إدارة فيديوهات المجتمع</summary><div class="ce-admin-form" style="margin-top:14px"><input id="ceVideoTitle" class="modal-input" placeholder="عنوان الفيديو" /><select id="ceVideoAccess" class="modal-input"><option value="free">فيديو مجاني للمعاينة</option><option value="paid">فيديو احترافي للأعضاء المدفوعين</option></select><input id="ceVideoUrl" class="modal-input full" placeholder="رابط فيديو اختياري (أو ارفع ملفًا)" /><label class="ce-tool full" style="text-align:center"><i class="fas fa-upload"></i> رفع فيديو من الجهاز<input id="ceVideoFile" type="file" accept="video/*" style="display:none" onchange="window.previewCommunityVideo(event)"></label><button class="btn-primary full" onclick="window.addCommunityVideo('${esc(id)}')"><i class="fas fa-plus"></i> إضافة الفيديو</button></div><div style="font-size:11px;color:#64748b;margin-top:9px;line-height:1.6">الفيديو المجاني يظهر قبل الاشتراك لجذب الأعضاء، والفيديو المدفوع يظهر بعد العضوية. احرص على ضبط قواعد Storage في الإنتاج.</div></details>`;
}

function renderVideos(id, target) {
  const c = getComm(id), canWatch = member(c), videosRef = query(ref(db, `communityVideos/${id}`), limitToLast(30));
  onValue(videosRef, snap => {
    const videos=[]; if(snap.exists()) snap.forEach(x => videos.push({id:x.key,...x.val()})); videos.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    const free = videos.filter(v => v.access !== 'paid'), paid = videos.filter(v => v.access === 'paid');
    const card = v => canWatch || v.access !== 'paid' ? `<article class="ce-video-card"><video controls preload="metadata" src="${esc(v.url)}"></video><div class="ce-video-body"><div class="ce-video-title">${esc(v.title || 'درس جديد')}</div><div class="ce-video-meta"><i class="fas fa-${v.access==='paid'?'lock':'gift'}"></i> ${v.access==='paid'?'محتوى احترافي للأعضاء':'معاينة مجانية'}</div></div></article>` : `<article class="ce-video-card"><div class="ce-lock"><i class="fas fa-lock"></i><span>متاح بعد الاشتراك</span></div><div class="ce-video-body"><div class="ce-video-title">${esc(v.title || 'محتوى احترافي')}</div><button class="btn-primary" style="width:100%;margin-top:7px" onclick="window.openPaidJoinModal('${esc(id)}')"><i class="fas fa-crown"></i> اشترك للمشاهدة</button></div></article>`;
    const group = (label, arr) => `<div style="margin-top:14px"><h4 style="margin:0 0 9px;font-size:14px">${label}</h4><div class="ce-video-grid">${arr.length ? arr.map(card).join('') : '<div class="ce-empty">سيتم نشر الفيديوهات قريبًا.</div>'}</div></div>`;
    target.innerHTML = `<section class="ce-section"><h3><i class="fas fa-play-circle" style="color:#ea580c"></i> تعرّف على المجتمع</h3><p class="ce-sub">شاهد عينات مجانية قبل الاشتراك، ثم افتح المكتبة الاحترافية بعد انضمامك.</p>${group('فيديوهات مجانية للمعاينة',free)}${group(canWatch?'المكتبة الاحترافية':'ماذا ستحصل عليه بعد الاشتراك',paid)}</section>${adminVideoForm(id)}`;
    if (c.admin === window.currentUser) renderAdminPanel(id, target);
  });
}

function renderAdminPanel(id, target) {
  if (target.querySelector('.ce-admin-post-panel')) return;
  const p = document.createElement('section'); p.className='ce-section ce-admin-post-panel'; p.innerHTML=`<h3><i class="fas fa-chart-line" style="color:#6366f1"></i> نظرة سريعة لصاحب المجتمع</h3><p class="ce-sub">استخدم المنشورات والفيديوهات المجانية لبناء الثقة قبل طلب الاشتراك.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="free-badge"><i class="fas fa-user-friends"></i> ${Object.keys(getComm(id).members||{}).length} أعضاء</span><span class="paid-badge"><i class="fas fa-crown"></i> ${Number(getComm(id).price||0)>0?'اشتراك مدفوع':'مجاني'}</span></div>`; target.appendChild(p);
}

window.previewCommunityVideo = e => { const f=e.target.files?.[0]; if(f) { window._communityVideoFile=f; e.target.closest('label').lastChild.textContent=' '+f.name; } };
window.addCommunityVideo = async id => {
  const title=$('ceVideoTitle')?.value.trim(), url=$('ceVideoUrl')?.value.trim(), access=$('ceVideoAccess')?.value||'free', file=window._communityVideoFile;
  if(!title || (!url && !file)) return window.dlgAlert?.('أدخل عنوان الفيديو وارفع ملفًا أو ضع رابطًا.', 'warning', 'بيانات ناقصة');
  const btn=document.querySelector('.ce-admin-form button'); if(btn){btn.disabled=true;btn.dataset.old=btn.innerHTML;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> جاري الرفع...';}
  try { const finalUrl=file ? await window.uploadToCloudinary(file,'video') : url; await set(push(ref(db,`communityVideos/${id}`)),{title,url:finalUrl,access,createdAt:Date.now(),author:window.currentUser}); window._communityVideoFile=null; $('ceVideoTitle').value=''; $('ceVideoUrl').value=''; window.showToast?.('تمت إضافة الفيديو','سيظهر ضمن مكتبة المجتمع',''); }
  catch(e){console.error(e);window.dlgAlert?.('فشل إضافة الفيديو. تحقق من خدمة الرفع أو الرابط.','danger','خطأ');}
  finally{if(btn){btn.disabled=false;btn.innerHTML=btn.dataset.old||'إضافة الفيديو';}}
};

function publicPreview(id) {
  const c=getComm(id), area=$('communityFeedArea'); if(!area)return;
  const intro = `<div class="ce-shell"><div class="ce-cover"><div><h1 class="ce-title">${esc(c.name||'المجتمع')}</h1><p class="ce-desc">${esc(c.description||'مجتمع متخصص يجمع أصحاب الهدف الواحد.')}</p><div class="ce-stat-row"><span class="ce-stat"><i class="fas fa-users"></i> ${Object.keys(c.members||{}).length} عضو</span><span class="ce-stat"><i class="fas fa-video"></i> معاينات مجانية</span><span class="ce-stat"><i class="fas fa-shield-alt"></i> محتوى منظم</span></div></div></div><div class="ce-cta"><div><strong>جاهز للتعلم مع المجتمع؟</strong><div style="font-size:12px;margin-top:3px">افتح الفيديوهات الاحترافية واللقاءات والمحتوى الكامل.</div></div><button class="btn-primary" onclick="window.openPaidJoinModal('${esc(id)}')"><i class="fas fa-crown"></i> ${Number(c.price||0)>0?'اشترك الآن':'انضم الآن'}</button></div><div id="ceVideoArea"></div></div>`;
  area.innerHTML=intro; addHeader(id); renderVideos(id,$('ceVideoArea'));
}

function enhanceComposer(id) {
  const c=getComm(id); if(!member(c)) return;
  const box=$('communityPostContent'); if(!box || box.dataset.ceReady==='1') return;
  box.dataset.ceReady='1'; box.placeholder='اكتب درسًا أو سؤالًا أو إعلانًا للمجتمع...';
  const parent=box.parentElement; const tools=document.createElement('div'); tools.className='ce-post-tools'; tools.innerHTML=`<select id="communityPostType" class="ce-post-type"><option value="discussion">نقاش</option><option value="announcement">إعلان مهم</option><option value="lesson">درس أو نصيحة</option></select><label class="ce-tool"><i class="fas fa-image"></i> صورة<input type="file" accept="image/*" style="display:none" onchange="window.selectCommunityPostMedia(event,'image')"></label><label class="ce-tool"><i class="fas fa-video"></i> فيديو<input type="file" accept="video/*" style="display:none" onchange="window.selectCommunityPostMedia(event,'video')"></label><button class="ce-tool" type="button" onclick="window.clearCommunityPostMedia()"><i class="fas fa-times"></i> مسح المرفق</button></div><div id="cePostMediaPreview" class="ce-media-preview"></div>`; parent.appendChild(tools);
}
window.selectCommunityPostMedia=(e,type)=>{const f=e.target.files?.[0];if(!f)return;window._communityPostMedia={file:f,type};const p=$('cePostMediaPreview');p.style.display='block';p.innerHTML=`<strong>${type==='video'?'فيديو':'صورة'}:</strong> ${esc(f.name)}`;if(type==='image')p.innerHTML+=`<img src="${URL.createObjectURL(f)}">`;else p.innerHTML+=`<video muted controls src="${URL.createObjectURL(f)}"></video>`;};
window.clearCommunityPostMedia=()=>{window._communityPostMedia=null;const p=$('cePostMediaPreview');if(p){p.style.display='none';p.innerHTML='';}};

const originalPublish=window.publishCommunityPost;
window.publishCommunityPost=async()=>{const id=window.currentCommunityId,c=getComm(id);if(!id||!member(c))return window.openPaidJoinModal?.(id);const txt=$('communityPostContent')?.value.trim(),media=window._communityPostMedia,type=$('communityPostType')?.value||'discussion';if(!txt&&!media)return;const btn=$('publishCommBtn');const old=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> جاري النشر...';try{const prefix=type==='announcement'?'📢 إعلان مهم\n':type==='lesson'?'🎓 درس ونصيحة\n':'';let data={author:window.currentUser,text:prefix+(txt||''),timestamp:Date.now(),postType:type};if(media)data[media.type]=await window.uploadToCloudinary(media.file,media.type);await set(push(ref(db,`communityPosts/${id}`)),data);$('communityPostContent').value='';window.clearCommunityPostMedia();window.showToast?.('تم نشر المحتوى','ظهر المنشور لأعضاء المجتمع','');}catch(e){console.error(e);window.dlgAlert?.('تعذر نشر المحتوى أو رفع المرفق.','danger','خطأ');}finally{btn.disabled=false;btn.innerHTML=old;}};

const originalRender=window.renderCommunityFeed;
window.renderCommunityFeed=(id)=>{const c=getComm(id);if(Number(c.price||0)>0&&!member(c)){publicPreview(id);return;}if(originalRender)originalRender(id);setTimeout(()=>{addHeader(id);enhanceComposer(id);},80);};
const originalDirect=window.openCommunityViewDirect;
if(originalDirect){window.openCommunityViewDirect=(id)=>{const r=originalDirect(id);setTimeout(()=>{if(Number(getComm(id).price||0)>0&&!member(getComm(id)))publicPreview(id);else{addHeader(id);enhanceComposer(id);}},120);return r;};}
styles();
