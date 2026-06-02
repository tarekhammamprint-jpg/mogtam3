import { ref, get, set } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const dA = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const PLATFORM_INTERESTS = [
    "أخبار وسياسة", "رياضة وكرة قدم", "طبخ ووصفات", "دين وإسلاميات", 
    "تكنولوجيا وتقنية", "سيارات ومحركات", "كوميديا ومقالب", "صحة وطب", 
    "فنون وتصميم", "تعليم وثقافة", "موضة وتجميل", "سفر وسياحة", 
    "ألعاب فيديو", "تاريخ وحضارات", "علوم وطبيعة", "اقتصاد وأعمال", 
    "عقارات واستثمار", "أدب وشعر", "تنمية بشرية", "حيوانات أليفة"
];
window.PLATFORM_INTERESTS = PLATFORM_INTERESTS;



const cN = {"اسلام":"eslam","إسلام":"eslam","همام":"hammam","ابو":"abu","أبو":"abu","عاطف":"atef","محمد":"mohamed","محمود":"mahmoud","احمد":"ahmed","أحمد":"ahmed","مصطفى":"mostafa","علي":"ali","خالد":"khaled","يوسف":"yousef","ابراهيم":"ibrahim","حسن":"hassan","حسين":"hussein","عبد":"abdel","طارق":"tareq","فهد":"fahad","ياسين":"yassin","سيف":"saif","ماجد":"majed","حازم":"hazem","وليد":"waleed","سامر":"samer","رامي":"rami","كريم":"karim","زياد":"ziad","بهاء":"bahaa","صالح":"saleh","عادل":"adel","سعد":"saad","فيصل":"faisal","سليمان":"soliman","هشام":"hesham","عصام":"essam"};
const a2e = {"أ":"a","إ":"e","ا":"a","آ":"a","ب":"b","ت":"t","ث":"th","ج":"j","ح":"h","خ":"kh","د":"d","ذ":"z","ر":"r","ز":"z","س":"s","ش":"sh","ص":"s","ض":"d","ط":"t","ظ":"z","ع":"a","غ":"gh","ف":"f","ق":"q","ك":"k","ل":"l","م":"m","ن":"n","ه":"h","و":"w","ي":"y","ى":"a","ة":"a"," ":"_"};
function tr(a) { let w = a.trim().split(" "), r = []; for(let x of w) { if(cN[x]) r.push(cN[x]); else { let e = ""; for(let i=0; i<x.length; i++) e += a2e[x[i]] || x[i]; e = e.replace(/aa+/g,'a').replace(/ee+/g,'e').replace(/uu+/g,'u').replace(/oo+/g,'o').replace(/yy+/g,'y'); r.push(e); } } return r.join("_").replace(/[^a-zA-Z0-9_]/g,'').toLowerCase() || "user"; }

window.toggleLoginMode = (m) => { $('loginFormContent').style.display = m==='register' ? 'none' : 'block'; $('registerFormContent').style.display = m==='register' ? 'block' : 'none'; };
window.generateHandles = (n) => { let c = $('handleSuggestions'); if(!n.trim()) { c.innerHTML = ""; return; } let b = tr(n.trim().split(" ")[0]), h = '<div style="font-size:13px;margin-bottom:5px;">اختر المعرف:</div>', o = [b + Math.floor(Math.random()*99+10), b + "_" + Math.floor(Math.random()*999+100), b + new Date().getFullYear()]; o.forEach((x, i) => { h += `<label class="handle-radio-label"><input type="radio" name="selectedHandle" value="${x}" ${i===0?"checked":""}> @${x}</label>`; }); c.innerHTML = h; };

window.showRegisterModal = () => { 
    let s = document.getElementById('hideLoginStyle'); if(s) s.remove();
    let lw = document.getElementById('loginModal');
    if(lw) { lw.style.display = 'flex'; setTimeout(() => { lw.style.opacity = '1'; lw.style.pointerEvents = 'auto'; }, 10); }
    let closeBtn = document.getElementById('loginModalCloseBtn'); if(closeBtn) closeBtn.style.display = 'flex'; 
    let guestBtn = document.getElementById('guestBrowseBtn'); if(guestBtn) guestBtn.style.display = 'block';
    window.toggleLoginMode('register'); 
};
window.closeRegisterModal = () => { let lw = $('loginModal'); if(lw) { lw.style.opacity = '0'; lw.style.pointerEvents = 'none'; setTimeout(() => { lw.style.display = 'none'; }, 400); } };

window.topLogin = () => {
    let u = $('topLoginUser').value.trim(); if(u.startsWith('@')) u = u.substring(1); let p = $('topLoginPass').value.trim();
    if(!u || !p) return window.dlgAlert("الرجاء إدخال اسم المستخدم وكلمة المرور.", "warning", "بيانات ناقصة");
    get(ref(db, `users/${u}`)).then(s => {
        if(s.exists()){ if(s.val().password === p) { window.fL(u, s.val()); } else window.dlgAlert("كلمة المرور غير صحيحة.", "danger", "خطأ في الدخول"); } else window.dlgAlert("هذا الحساب غير موجود.", "warning", "غير موجود");
    }).catch(() => window.dlgAlert("فشل الاتصال بالخادم، يرجى المحاولة لاحقاً.", "danger", "خطأ في الاتصال"));
};

window.login = () => { 
    if("Notification" in window && Notification.permission === "default") Notification.requestPermission(); 
    let u = $('usernameInput').value.trim(); if(u.startsWith('@')) u = u.substring(1); let p = $('passwordInput').value.trim(); 
    if(!u || !p) return window.dlgAlert("الرجاء إدخال اسم المستخدم وكلمة المرور.", "warning", "بيانات ناقصة"); let b = $('loginBtn'), ot = b.innerText; b.innerText="جاري..."; b.disabled = true; 
    let tc = setTimeout(() => { window.dlgAlert("انتهى وقت الاتصال، يرجى المحاولة مجدداً.", "warning", "انتهى الوقت"); b.innerText=ot; b.disabled = false; }, 10000); 
    get(ref(db, `users/${u}`)).then(s => { clearTimeout(tc); if(s.exists()){ if(s.val().password === p) window.fL(u, s.val()); else { window.dlgAlert("كلمة المرور غير صحيحة.", "danger", "خطأ في الدخول"); b.innerText=ot; b.disabled=false; } } else { window.dlgAlert("هذا الحساب غير موجود.", "warning", "غير موجود"); b.innerText=ot; b.disabled=false; } }).catch(() => { clearTimeout(tc); window.dlgAlert("فشل الاتصال بالخادم.", "danger", "خطأ"); b.innerText=ot; b.disabled=false; }); 
};

window.registerUser = () => {
    let d = $('regDisplayName').value.trim(), dbv = $('regDob').value, p = $('regPassword').value.trim(), r = document.getElementsByName('selectedHandle'), sh = null;
    for(let i=0; i<r.length; i++) { if(r[i].checked) { sh = r[i].value; break; } }
    if(!d || !dbv || !p || !sh) return window.dlgAlert("الرجاء إكمال جميع البيانات المطلوبة.", "warning", "بيانات ناقصة"); if(p.length < 6) return window.dlgAlert("كلمة المرور يجب أن تكون 6 أحرف على الأقل.", "warning", "كلمة مرور ضعيفة");
    let btn = $('regBtn'), ot = btn.innerText; btn.innerText = "جاري..."; btn.disabled = true;
    async function getLoc() {
        return new Promise(resolve => {
            let isResolved = false; let finish = (loc) => { if(!isResolved){ isResolved=true; resolve(loc || "غير محدد"); }}; setTimeout(() => finish("غير محدد"), 6000); 
            async function fallback() { try { let res = await fetch('https://ipapi.co/json/'); let data = await res.json(); finish(data.country_name ? (data.country_name + (data.city ? " - "+data.city : "")) : "غير محدد"); } catch(e) { finish("غير محدد"); } }
            if(navigator.geolocation) { navigator.geolocation.getCurrentPosition(async pos => { try { let res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=ar`); let l = await res.json(); let c = l.address.city || l.address.town || l.address.state || ""; finish((l.address.country||"") + (c ? " - "+c : "")); } catch(e) { fallback(); } }, fallback, {timeout:4000}); } else fallback();
        });
    }
    getLoc().then(loc => { 
        get(ref(db,`users/${sh}`)).then(s => { 
            if(s.exists()) { window.dlgAlert("هذا المعرف محجوز، يرجى اختيار معرف آخر.", "warning", "المعرف محجوز"); btn.innerText = ot; btn.disabled = false; } 
            else { set(ref(db,`users/${sh}`), { displayName: d, birthdate: dbv, password: p, online: true, profilePic: dA, bio: "مستخدم جديد", isBot: false, location: loc, job: "", education: "", hobbies: "", interests: [] }).then(() => { $('usernameInput').value = sh; $('passwordInput').value = p; window.login(); }); } 
        }).catch(() => { window.dlgAlert("حدث خطأ، يرجى المحاولة مجدداً.", "danger", "خطأ"); btn.innerText = ot; btn.disabled = false; }); 
    });
};

window.logoutUser = () => { 
    if(window.currentUser) { window.dlgConfirm("هل تريد تسجيل الخروج؟", "تسجيل الخروج", "question", "خروج").then(ok => { if(!ok) return; 
        let user = window.currentUser;
        set(ref(db, `users/${user}/online`), false).then(() => { 
            localStorage.removeItem('savedUser'); window.location.replace(window.location.pathname + '#/login'); window.location.reload(); 
        }).catch(() => { localStorage.removeItem('savedUser'); window.location.replace(window.location.pathname + '#/login'); window.location.reload(); }); }); } 
};
