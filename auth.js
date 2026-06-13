import { ref, get, set, update, onDisconnect, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
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

function tr(a) { 
    let w = a.trim().split(" "), r = []; 
    for(let x of w) { 
        if(cN[x]) r.push(cN[x]); 
        else { 
            let e = ""; 
            for(let i=0; i<x.length; i++) e += a2e[x[i]] || x[i]; 
            e = e.replace(/aa+/g,'a').replace(/ee+/g,'e').replace(/uu+/g,'u').replace(/oo+/g,'o').replace(/yy+/g,'y'); 
            r.push(e); 
        } 
    } 
    return r.join("_").replace(/[^a-zA-Z0-9_]/g,'').toLowerCase() || "user"; 
}

// =============== دوال واجهة تسجيل الدخول ===============

window.toggleLoginMode = (m) => { 
    $('loginFormContent').style.display = m === 'register' ? 'none' : 'block'; 
    $('registerFormContent').style.display = m === 'register' ? 'block' : 'none'; 
};

window.generateHandles = (n) => { 
    let c = $('handleSuggestions'); 
    if(!n.trim()) { 
        c.innerHTML = ""; 
        return; 
    } 
    let b = tr(n.trim().split(" ")[0]), 
        h = '<div style="font-size:13px;margin-bottom:5px;">اختر المعرف:</div>', 
        o = [b + Math.floor(Math.random()*99+10), b + "_" + Math.floor(Math.random()*999+100), b + new Date().getFullYear()]; 
    o.forEach((x, i) => { 
        h += `<label class="handle-radio-label"><input type="radio" name="selectedHandle" value="${x}" ${i===0?"checked":""}> @${x}</label>`; 
    }); 
    c.innerHTML = h; 
};

window.showRegisterModal = () => { 
    let s = document.getElementById('hideLoginStyle'); 
    if(s) s.remove();
    let lw = document.getElementById('loginModal');
    if(lw) { 
        lw.style.display = 'flex'; 
        setTimeout(() => { 
            lw.style.opacity = '1'; 
            lw.style.pointerEvents = 'auto'; 
        }, 10); 
    }
    let closeBtn = document.getElementById('loginModalCloseBtn'); 
    if(closeBtn) closeBtn.style.display = 'flex'; 
    let guestBtn = document.getElementById('guestBrowseBtn'); 
    if(guestBtn) guestBtn.style.display = 'block';
    window.toggleLoginMode('register'); 
};

window.closeRegisterModal = () => { 
    let lw = $('loginModal'); 
    if(lw) { 
        lw.style.opacity = '0'; 
        lw.style.pointerEvents = 'none'; 
        setTimeout(() => { 
            lw.style.display = 'none'; 
        }, 400); 
    } 
};

// =============== دالة تسجيل الدخول العلوية (في النافبار) ===============

window.topLogin = () => {
    let u = $('topLoginUser').value.trim(); 
    if(u.startsWith('@')) u = u.substring(1); 
    let p = $('topLoginPass').value.trim();
    if(!u || !p) return window.dlgAlert("الرجاء إدخال اسم المستخدم وكلمة المرور.", "warning", "بيانات ناقصة");
    
    let btn = $('topLoginBtn');
    let originalText = btn ? btn.innerHTML : '';
    if(btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }
    
    let timeoutId = setTimeout(() => {
        if(btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        window.dlgAlert("انتهى وقت الاتصال، يرجى المحاولة مجدداً.", "warning", "انتهى الوقت");
    }, 15000);
    
    get(ref(db, `users/${u}`)).then(s => {
        clearTimeout(timeoutId);
        if(btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        if(s.exists()){ 
            if(s.val().password === p) { 
                window.fL(u, s.val()); 
            } else { 
                window.dlgAlert("كلمة المرور غير صحيحة.", "danger", "خطأ في الدخول"); 
            }
        } else { 
            window.dlgAlert("هذا الحساب غير موجود.", "warning", "غير موجود"); 
        }
    }).catch((err) => {
        clearTimeout(timeoutId);
        if(btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        console.error("TopLogin error:", err);
        window.dlgAlert("فشل الاتصال بالخادم، يرجى المحاولة لاحقاً.", "danger", "خطأ في الاتصال");
    });
};

// =============== دالة تسجيل الدخول الرئيسية ===============

window.login = () => { 
    if("Notification" in window && Notification.permission === "default") Notification.requestPermission(); 
    
    let u = $('usernameInput').value.trim(); 
    if(u.startsWith('@')) u = u.substring(1); 
    let p = $('passwordInput').value.trim(); 
    
    if(!u || !p) return window.dlgAlert("الرجاء إدخال اسم المستخدم وكلمة المرور.", "warning", "بيانات ناقصة"); 
    
    let b = $('loginBtn'), ot = b.innerText; 
    b.innerText = "جاري..."; 
    b.disabled = true; 
    
    let timeoutId = setTimeout(() => { 
        b.innerText = ot; 
        b.disabled = false; 
        window.dlgAlert("انتهى وقت الاتصال، يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.", "warning", "انتهى الوقت"); 
    }, 15000); 
    
    try {
        get(ref(db, `users/${u}`)).then(s => { 
            clearTimeout(timeoutId); 
            if(s.exists()){ 
                if(s.val().password === p) {
                    window.fL(u, s.val()); 
                } else { 
                    window.dlgAlert("كلمة المرور غير صحيحة.", "danger", "خطأ في الدخول"); 
                    b.innerText = ot; 
                    b.disabled = false; 
                } 
            } else { 
                window.dlgAlert("هذا الحساب غير موجود.", "warning", "غير موجود"); 
                b.innerText = ot; 
                b.disabled = false; 
            } 
        }).catch((err) => { 
            clearTimeout(timeoutId); 
            console.error("Login error:", err);
            window.dlgAlert("فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.", "danger", "خطأ"); 
            b.innerText = ot; 
            b.disabled = false; 
        });
    } catch(err) {
        clearTimeout(timeoutId);
        console.error("Login exception:", err);
        window.dlgAlert("حدث خطأ غير متوقع، يرجى المحاولة مجدداً.", "danger", "خطأ");
        b.innerText = ot;
        b.disabled = false;
    }
};

// =============== دالة تسجيل مستخدم جديد ===============

window.registerUser = () => {
    let d = $('regDisplayName').value.trim();
    let dbv = $('regDob').value;
    let p = $('regPassword').value.trim();
    let r = document.getElementsByName('selectedHandle'), sh = null;
    
    for(let i=0; i<r.length; i++) { 
        if(r[i].checked) { 
            sh = r[i].value; 
            break; 
        } 
    }
    
    if(!d || !dbv || !p || !sh) return window.dlgAlert("الرجاء إكمال جميع البيانات المطلوبة.", "warning", "بيانات ناقصة"); 
    if(p.length < 6) return window.dlgAlert("كلمة المرور يجب أن تكون 6 أحرف على الأقل.", "warning", "كلمة مرور ضعيفة");
    
    let btn = $('regBtn'), ot = btn.innerText; 
    btn.innerText = "جاري..."; 
    btn.disabled = true;
    
    async function getLoc() {
        return new Promise(resolve => {
            let isResolved = false; 
            let finish = (loc) => { 
                if(!isResolved){ 
                    isResolved=true; 
                    resolve(loc || "غير محدد");
                }
            }; 
            setTimeout(() => finish("غير محدد"), 6000); 
            
            async function fallback() { 
                try { 
                    let res = await fetch('https://ipapi.co/json/'); 
                    let data = await res.json(); 
                    finish(data.country_name ? (data.country_name + (data.city ? " - "+data.city : "")) : "غير محدد"); 
                } catch(e) { 
                    finish("غير محدد"); 
                } 
            }
            
            if(navigator.geolocation) { 
                navigator.geolocation.getCurrentPosition(async pos => { 
                    try { 
                        let res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=ar`); 
                        let l = await res.json(); 
                        let c = l.address.city || l.address.town || l.address.state || ""; 
                        finish((l.address.country||"") + (c ? " - "+c : "")); 
                    } catch(e) { 
                        fallback(); 
                    } 
                }, fallback, {timeout:4000}); 
            } else fallback();
        });
    }
    
    getLoc().then(loc => { 
        get(ref(db,`users/${sh}`)).then(s => { 
            if(s.exists()) { 
                window.dlgAlert("هذا المعرف محجوز، يرجى اختيار معرف آخر.", "warning", "المعرف محجوز"); 
                btn.innerText = ot; 
                btn.disabled = false; 
            } else { 
                const joinDate = Date.now();
                set(ref(db,`users/${sh}`), { 
                    displayName: d, 
                    birthdate: dbv, 
                    password: p, 
                    online: true, 
                    profilePic: dA, 
                    bio: "مستخدم جديد", 
                    isBot: false, 
                    location: loc, 
                    job: "", 
                    education: "", 
                    hobbies: "", 
                    interests: [],
                    joinDate: joinDate
                }).then(() => { 
                    $('usernameInput').value = sh; 
                    $('passwordInput').value = p; 
                    window.login(); 
                }).catch(err => {
                    window.dlgAlert("حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة مجدداً.", "danger", "خطأ");
                    btn.innerText = ot;
                    btn.disabled = false;
                });
            } 
        }).catch((err) => { 
            console.error("Register error:", err);
            window.dlgAlert("حدث خطأ، يرجى المحاولة مجدداً.", "danger", "خطأ"); 
            btn.innerText = ot; 
            btn.disabled = false; 
        }); 
    }).catch(err => {
        console.error("Location error:", err);
        window.dlgAlert("حدث خطأ في تحديد الموقع، يرجى المحاولة مجدداً.", "danger", "خطأ");
        btn.innerText = ot;
        btn.disabled = false;
    });
};

// =============== دالة تسجيل الخروج ===============

window.logoutUser = () => { 
    if(window.currentUser) { 
        window.dlgConfirm("هل تريد تسجيل الخروج؟", "تسجيل الخروج", "question", "خروج").then(ok => { 
            if(!ok) return; 
            let user = window.currentUser;
            
            // محاولة تحديث الحالة اونلاين إلى false
            set(ref(db, `users/${user}/online`), false).then(() => { 
                localStorage.removeItem('savedUser'); 
                window.location.replace(window.location.pathname + '#/login'); 
                setTimeout(() => window.location.reload(), 100);
            }).catch(() => { 
                localStorage.removeItem('savedUser'); 
                window.location.replace(window.location.pathname + '#/login'); 
                setTimeout(() => window.location.reload(), 100);
            }); 
        }); 
    } 
};

// =============== الدالة الرئيسية لتسجيل الدخول وإعداد الجلسة ===============

window.fL = function(u, d) {
    // التحقق من الحظر أولاً
    if (d.banned) {
        let now = Date.now();
        let perm = !d.banUntil || d.banUntil === 0;
        let expired = !perm && d.banUntil < now;
        if (!expired) {
            localStorage.removeItem('savedUser');
            window.showBanScreen(d);
            return;
        } else {
            // رفع الحظر إذا انتهت المدة
            import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js").then(({update, ref}) => {
                update(ref(db, `users/${u}`), { banned: false, banUntil: null, banReason: null });
            });
        }
    }
    
    // حفظ المستخدم في localStorage
    window.currentUser = u;
    localStorage.setItem('savedUser', u);
    window.isInitialNotifLoad = true;
    window.alertedNotifs = new Set();
    
    // إخفاء شاشة التحميل
    let il = $('initialLoader'); 
    if(il){ 
        il.classList.add('hidden'); 
        setTimeout(() => il.style.display = 'none', 400); 
    } 
    
    // إخفاء نافذة تسجيل الدخول
    let lw = $('loginModal'); 
    if(lw){ 
        lw.style.opacity = '0'; 
        lw.style.pointerEvents = 'none'; 
        setTimeout(() => lw.style.display = 'none', 400); 
    } 
    
    // تبديل واجهات المستخدم
    let guestNav = $('guestNav'); 
    if(guestNav) guestNav.style.display = 'none'; 
    
    let loggedInNav = $('loggedInNav'); 
    if(loggedInNav) loggedInNav.style.display = 'flex';
    
    let cb = $('composerBox'); 
    if(cb) cb.style.display = 'block'; 
    
    let sidebarAreaContainer = $('sidebarAreaContainer'); 
    if(sidebarAreaContainer) sidebarAreaContainer.style.display = 'block';
    
    let bottomNav = $('bottomNav'); 
    if(bottomNav) bottomNav.style.display = '';
    
    // تحديث الصورة والاسم
    let n = d.displayName || u; 
    $('currentUserDisplay').innerText = n; 
    let p = d.profilePic || dA; 
    
    ['myNavAvatar','composerAvatar','myShareAvatar','mobileNavAvatar','modalMyPic'].forEach(x => { 
        let el = $(x); 
        if(el) el.src = p; 
    }); 
    
    // زر الأدمن
    let ab = $('adminBtn'); 
    if(ab){ 
        ab.style.display = (u.toLowerCase() === 'admin21') ? 'flex' : 'none'; 
    } 
    
    // تعيين الحالة اونلاين
    try {
        let oRef = ref(db, `users/${u}/online`); 
        set(oRef, true); 
        onDisconnect(oRef).set(false);
        
        // الاستماع لحالة الحظر
        onValue(ref(db, `users/${u}/banned`), (snap) => {
            if (snap.val() === true) {
                get(ref(db, `users/${u}`)).then(s => {
                    if (!s.exists()) return;
                    let ud = s.val();
                    let now = Date.now();
                    let perm = !ud.banUntil || ud.banUntil === 0;
                    let expired = !perm && ud.banUntil < now;
                    if (!expired) {
                        set(ref(db, `users/${u}/online`), false);
                        localStorage.removeItem('savedUser');
                        window.showBanScreen(ud);
                    }
                });
            }
        });
    } catch(e) {
        console.error("Error setting online status:", e);
    }
    
    // عرض نافذة الاهتمامات إذا لزم الأمر
    if(!d.interests || d.interests.length === 0) { 
        setTimeout(() => {
            if(window.renderInterestsModal) window.renderInterestsModal();
        }, 1000); 
    }
    
    // بدء المستمعين - نستخدم setTimeout للتأكد من تحميل كل شيء
    setTimeout(() => {
        if(!window.usersListenerActive) { 
            window.usersListenerActive = true; 
            // استدعاء listenToUsers من app.js
            if(typeof window._listenToUsers === 'function') {
                window._listenToUsers();
            }
        }
        
        if(typeof window.startPrivateListeners === 'function') {
            window.startPrivateListeners();
        }
        
        if(typeof window._listenToReels === 'function') window._listenToReels();
        if(typeof window._listenToNewsBotPosts === 'function') window._listenToNewsBotPosts();
    }, 100);
    
    // تأخير التحميلات الثانوية
    setTimeout(() => { 
        if(typeof window.initRightSidebar === 'function') window.initRightSidebar();
    }, 1500);
    
    setTimeout(() => { 
        let nca = document.getElementById('newsChannelsArea'); 
        if(nca && typeof window.renderNewsChannels === 'function') window.renderNewsChannels(); 
    }, 1500);
    
    setTimeout(() => { 
        if (typeof window.initCallNotifications === 'function') window.initCallNotifications(); 
    }, 2000);
    
    // تحميل المحتوى
    if(!window.isInitialLoad) { 
        window.renderedPostIds = new Set((window.allPosts || []).map(p => p.id)); 
        window.feedLim = 5; 
        if(typeof window._renderFeed === 'function') window._renderFeed(); 
        if(typeof window._handleRouting === 'function') window._handleRouting();
    }
    
    // إخفاء أي رسائل خطأ متبقية
    setTimeout(() => {
        const errorOverlay = document.getElementById('dlg-overlay');
        if(errorOverlay && errorOverlay.classList.contains('dlg-show')) {
            // نتحقق إذا كانت رسالة الخطأ لا تزال ظاهرة بشكل غير صحيح
            const errorTitle = document.getElementById('dlg-title');
            if(errorTitle && errorTitle.innerText === 'خطأ في الاتصال') {
                errorOverlay.classList.remove('dlg-show');
            }
        }
    }, 500);
};

// =============== دالة تسجيل الخروج وإعادة تعيين الحالة ===============

window.rU = function() { 
    window.isInitialNotifLoad = true; 
    window.alertedNotifs = new Set(); 
    localStorage.removeItem('savedUser'); 
    window.currentUser = null; 
    
    let b = $('loginBtn'); 
    if(b){ 
        b.innerText = "دخول"; 
        b.disabled = false; 
    } 
    
    let hash = window.location.hash; 
    let isPublicPage = hash.startsWith('#/post/') || hash.startsWith('#/@');
    
    if(!isPublicPage) { 
        let s = $('hideLoginStyle'); 
        if(s) s.remove(); 
    }
    
    let l = $('initialLoader'); 
    if(l) l.style.display = 'none'; 
    
    let ab = $('adminBtn'); 
    if(ab) ab.style.display = 'none'; 
    
    let lw = $('loginModal'); 
    if(lw && isPublicPage) { 
        lw.style.opacity = '0'; 
        lw.style.pointerEvents = 'none'; 
        lw.style.display = 'none'; 
    } else if(lw) {
        lw.style.display = 'flex';
        lw.style.opacity = '1';
        lw.style.pointerEvents = 'auto';
    }
    
    let guestNav = $('guestNav'); 
    if(guestNav) guestNav.style.display = 'flex'; 
    
    let loggedInNav = $('loggedInNav'); 
    if(loggedInNav) loggedInNav.style.display = 'none';
    
    let cb = $('composerBox'); 
    if(cb) cb.style.display = 'none'; 
    
    let sidebarAreaContainer = $('sidebarAreaContainer'); 
    if(sidebarAreaContainer) sidebarAreaContainer.style.display = 'none';
    
    let bottomNav = $('bottomNav'); 
    if(bottomNav) bottomNav.style.display = 'none';
    
    if(hash === '' || hash === '#/') { 
        window.location.replace('#/login'); 
    }
    
    if(!window.usersListenerActive) { 
        window.usersListenerActive = true; 
        if(typeof window._listenToUsers === 'function') window._listenToUsers();
    }
};

// =============== دوال إضافية لشاشة الحظر ===============

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

// =============== ربط الدوال بالنافذة ===============
// التأكد من أن جميع الدوال متاحة بشكل عام
window.tr = tr;
window.cN = cN;
window.a2e = a2e;
