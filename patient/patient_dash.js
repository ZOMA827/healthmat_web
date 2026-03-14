

// إعداد فايربيس (تأكد من وجود هذا الكود لكي لا يظهر خطأ undefined)
        const firebaseConfig = {
            apiKey: "AIzaSyDF6MRRmzfXJBW07Xb_rXVK2hJY_Xtcm6A",
            authDomain: "healthmate-web-3d983.firebaseapp.com",
            projectId: "healthmate-web-3d983",
            storageBucket: "healthmate-web-3d983.firebasestorage.app",
            appId: "1:1005719156245:web:7478909058de336f1b801c"
        };
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        // --- دالة سحرية صغيرة لجلب النصوص بناءً على اللغة (لا تحذفها) ---
        window.getLangText = function(key) {
            const lang = localStorage.getItem('app_lang') || 'ar';
            if(window.translations && window.translations[lang] && window.translations[lang][key]) {
                return window.translations[lang][key];
            }
            return key; // في حال لم يجد الكلمة يرجع المفتاح
        };

        // --- 0. دالة تغيير اللغة (تمت إضافتها هنا 🌍) ---
        window.setAppLang = function(lang) {
            localStorage.setItem('app_lang', lang);
            window.showToast(lang === 'ar' ? "جاري تغيير اللغة للعربية 🌍" : lang === 'fr' ? "Changement de langue 🌍" : "Changing language 🌍");
            setTimeout(() => { location.reload(); }, 1000); // تحديث لتطبيق اللغة
        };
    
// --- 1. نظام الـ SPA المطور (يدعم الوصفات، الأطباء، المواعيد، والخريطة) ---
function openSPA(slideId) {
    document.getElementById(slideId).classList.add('active');
    
    // 📄 إذا فتح سلايد الوصفات: اجلب الصور من الذاكرة المحلية
    if(slideId === 'prescriptions-slide') {
        loadPrescriptionsLocal();
    }
    
    // 🔍 إذا فتح سلايد الأطباء: شغل محرك البحث واجلب الأطباء من Firebase
    if(slideId === 'find-docs-slide') {
        window.findDocsEngine.init();
    }

    // 📅 إذا فتح سلايد المواعيد: شغل محرك المواعيد فوراً
    if(slideId === 'appointments-slide') {
        window.appointmentsEngine.init();
    }

    // 🗺️ السطر الجديد: إذا فتح سلايد الرادار الصحي (الخريطة)
    if(slideId === 'radar-slide') {
        // ننتظر 400 جزء من الثانية حتى تنتهي حركة فتح الشاشة (Slide Animation)
        // لكي تعرف الخريطة حجم الشاشة الحقيقي وتُرسم بشكل صحيح بدون تشوه
        setTimeout(() => { 
            if (window.radarEngine) window.radarEngine.init(); 
        }, 400);
    }

    // 🩸 السطر الجديد: إذا فتح سلايد نداء الدم
    if(slideId === 'blood-slide') {
        window.bloodEngine.init();
    }
    // 📁 السطر الجديد: إذا فتح سلايد الملف السحابي
    if(slideId === 'folder-slide') {
        window.cloudFolderEngine.init();
    }
    // 🌙💊 السطر الجديد: إذا فتح سلايد طوارئ الصيدليات
    if(slideId === 'pharmacy-slide') {
        window.pharmacyEngine.init();
    }
}

function closeSPA(slideId) {
    document.getElementById(slideId).classList.remove('active');
}

        // --- 2. محرك الوصفات الطبية (أوفلاين - LocalStorage) ---
        function savePrescriptionLocal(event) {
            const file = event.target.files[0];
            if(!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Image = e.target.result; // تحويل الصورة لنص مشفر طويل
                
                // جلب المصفوفة القديمة من ذاكرة الهاتف
                let savedMeds = JSON.parse(localStorage.getItem('my_prescriptions') || '[]');
                
                // إضافة الصورة الجديدة للمصفوفة
                savedMeds.unshift({ id: Date.now(), img: base64Image });
                
                // حفظ المصفوفة مجدداً في الهاتف
                try {
                    localStorage.setItem('my_prescriptions', JSON.stringify(savedMeds));
                    loadPrescriptionsLocal(); // تحديث العرض
                    window.showToast(window.getLangText('msg_presc_saved'));
                } catch(err) {
                    // استبدال الـ alert بالنافذة الملكية
                    window.royalAlert(window.getLangText('alert_storage_full_title'), window.getLangText('alert_storage_full_msg'), "warning-outline", "#ff4b2b");
                }
            };
            reader.readAsDataURL(file); // بدء التحويل
        }

        // نظام التنبيهات الطائر
        window.showToast = function(msg) {
            const toast = document.getElementById('toast-msg');
            const text = document.getElementById('toast-text');
            text.innerText = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3500);
        };

        // ==========================================
        // 👑 محرك النوافذ الملكي (اغتيال تنبيهات المتصفح)
        // ==========================================
        
        // 1. نافذة التنبيه العادية (بديل alert)
        window.royalAlert = function(title, message, icon = 'information-circle', color = '#00d2ff') {
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:999999; display:flex; justify-content:center; align-items:center; opacity:0; transition:0.3s;";
                overlay.innerHTML = `
                    <div style="background:var(--card-bg); border:1px solid var(--border-color); padding:30px; border-radius:25px; width:85%; max-width:350px; text-align:center; color:var(--text-main); font-family:'Cairo'; box-shadow: 0 20px 50px rgba(0,0,0,0.5); transform:scale(0.8); transition:0.3s;" id="royal-alert-box">
                        <ion-icon name="${icon}" style="font-size:60px; color:${color}; margin-bottom:15px; filter:drop-shadow(0 0 10px ${color}88);"></ion-icon>
                        <h2 style="margin:0 0 10px 0; font-size:20px;">${title}</h2>
                        <p style="color:var(--text-sub); font-size:14px; line-height:1.6; margin-bottom:25px;">${message}</p>
                        <button id="r-ok-btn" style="width:100%; padding:15px; border-radius:15px; border:none; background:${color}; color:#000; font-weight:bold; font-family:'Cairo'; font-size:16px; cursor:pointer;">${window.getLangText('btn_ok')}</button>
                    </div>`;
                document.body.appendChild(overlay);
                
                // أنيميشن الدخول
                setTimeout(() => { overlay.style.opacity = '1'; document.getElementById('royal-alert-box').style.transform = 'scale(1)'; }, 10);
                
                document.getElementById('r-ok-btn').onclick = () => {
                    overlay.style.opacity = '0'; document.getElementById('royal-alert-box').style.transform = 'scale(0.8)';
                    setTimeout(() => { overlay.remove(); resolve(true); }, 300);
                };
            });
        };

        // 2. نافذة التأكيد (بديل confirm)
        window.royalConfirm = function(title, message, icon = 'help-circle', color = '#ff4b2b') {
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:999999; display:flex; justify-content:center; align-items:center; opacity:0; transition:0.3s;";
                overlay.innerHTML = `
                    <div style="background:var(--card-bg); border:1px solid var(--border-color); padding:30px; border-radius:25px; width:85%; max-width:350px; text-align:center; color:var(--text-main); font-family:'Cairo'; box-shadow: 0 20px 50px rgba(0,0,0,0.5); transform:scale(0.8); transition:0.3s;" id="royal-confirm-box">
                        <ion-icon name="${icon}" style="font-size:60px; color:${color}; margin-bottom:15px; filter:drop-shadow(0 0 10px ${color}88);"></ion-icon>
                        <h2 style="margin:0 0 10px 0; font-size:20px;">${title}</h2>
                        <p style="color:var(--text-sub); font-size:14px; line-height:1.6; margin-bottom:25px;">${message}</p>
                        <div style="display:flex; gap:10px;">
                            <button id="r-yes-btn" style="flex:1; padding:15px; border-radius:15px; border:none; background:${color}; color:#fff; font-weight:bold; font-family:'Cairo'; font-size:16px; cursor:pointer;">${window.getLangText('btn_yes_sure')}</button>
                            <button id="r-no-btn" style="flex:1; padding:15px; border-radius:15px; border:1px solid #444; background:transparent; color:var(--text-main); font-weight:bold; font-family:'Cairo'; font-size:16px; cursor:pointer;">${window.getLangText('btn_cancel')}</button>
                        </div>
                    </div>`;
                document.body.appendChild(overlay);
                
                setTimeout(() => { overlay.style.opacity = '1'; document.getElementById('royal-confirm-box').style.transform = 'scale(1)'; }, 10);
                
                document.getElementById('r-yes-btn').onclick = () => {
                    overlay.style.opacity = '0'; document.getElementById('royal-confirm-box').style.transform = 'scale(0.8)';
                    setTimeout(() => { overlay.remove(); resolve(true); }, 300);
                };
                document.getElementById('r-no-btn').onclick = () => {
                    overlay.style.opacity = '0'; document.getElementById('royal-confirm-box').style.transform = 'scale(0.8)';
                    setTimeout(() => { overlay.remove(); resolve(false); }, 300);
                };
            });
        };
         

        function loadPrescriptionsLocal() {
            const gallery = document.getElementById('presc-gallery');
            let savedMeds = JSON.parse(localStorage.getItem('my_prescriptions') || '[]');
            
            if(savedMeds.length === 0) {
                gallery.innerHTML = `<p style="grid-column: span 2; text-align:center; color: var(--text-sub); margin-top:30px;">${window.getLangText('msg_no_presc_yet')}</p>`;
                return;
            }

            gallery.innerHTML = '';
            savedMeds.forEach(item => {
                gallery.innerHTML += `
                    <div class="presc-item">
                        <img src="${item.img}" onclick="viewFullImage('${item.img}')">
                        <ion-icon name="trash" class="presc-delete" onclick="deletePrescription(${item.id})"></ion-icon>
                    </div>
                `;
            });
        }

        // تحويل الدالة إلى async واستخدام النافذة الملكية
        async function deletePrescription(id) {
            const confirmed = await window.royalConfirm(window.getLangText('confirm_delete_presc_title'), window.getLangText('confirm_delete_presc_msg'), "trash-bin-outline", "#ff4b2b");
            if(confirmed) {
                let savedMeds = JSON.parse(localStorage.getItem('my_prescriptions') || '[]');
                savedMeds = savedMeds.filter(item => item.id !== id); // تصفية الصورة المحذوفة
                localStorage.setItem('my_prescriptions', JSON.stringify(savedMeds));
                loadPrescriptionsLocal();
                window.showToast(window.getLangText('msg_presc_deleted'));
            }
        }

        function viewFullImage(src) {
            document.getElementById('full-image').src = src;
            document.getElementById('image-viewer').style.display = 'flex';
        }

        // --- 3. الكشف عن وضعية الأوفلاين ---
        function checkAppMode() {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('mode') === 'offline') {
                document.getElementById('offline-indicator').style.display = 'flex';
                document.getElementById('patient-name').innerText = window.getLangText('offline_visitor');
                document.getElementById('greeting-text').innerText = window.getLangText('offline_limited_mode');

                document.querySelectorAll('.online-only').forEach(card => {
                    card.classList.add('disabled-offline');
                    card.onclick = (e) => {
                        e.preventDefault();
                        // استبدال الـ alert بالنافذة الملكية
                        window.royalAlert(window.getLangText('alert_offline_title'), window.getLangText('alert_offline_msg'), "wifi-outline", "#ffcc00");
                    };
                });
            } else {
                document.getElementById('patient-name').innerText = window.getLangText('online_patient');
            }
        }

        window.onload = checkAppMode;
        
        // ==========================================
        // ⚙️ محرك الإعدادات الذكي
        // ==========================================

        // 1. فتح/إغلاق النافذة
        window.toggleSettings = function() {
            const modal = document.getElementById('settings-modal');
            modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
        };

        // 2. المظهر (Dark / Light)
        window.toggleTheme = function() {
            const current = document.documentElement.getAttribute('data-theme');
            const target = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', target);
            localStorage.setItem('hm_theme', target);
            window.showToast(target === 'dark' ? window.getLangText('msg_theme_dark') : window.getLangText('msg_theme_light'));
        };
        // تطبيق الثيم المحفوظ عند فتح الصفحة
        document.documentElement.setAttribute('data-theme', localStorage.getItem('hm_theme') || 'dark');

        // 3. تسجيل الخروج (تم الإصلاح 🔧)
        window.patientLogout = async function() {
            const confirm = await window.royalConfirm(window.getLangText('logout_title'), window.getLangText('logout_confirm_msg'), "log-out-outline", "var(--red)");
            if(confirm) {
                firebase.auth().signOut().then(() => {
                    window.location.href = "../index.html";
                });
            }
        }

        // 4. الذكاء الاصطناعي لوضع الأونلاين 🌐 (تم الإصلاح 🔧)
        window.goOnlineMode = async function() {
            window.toggleSettings(); // إغلاق الإعدادات ليرى التنبيه بوضوح
            
            // استخدمنا firebase.auth() مباشرة
            const user = firebase.auth().currentUser;

            if (!user) {
                // المستخدم دخل كـ "زائر طوارئ" (OF)
                const confirm = await window.royalConfirm(
                    window.getLangText('login_required_title'), 
                    window.getLangText('login_required_msg'), 
                    "person-circle", 
                    "#00d2ff" // أزرق لأنها خطوة إيجابية وليست خطيرة
                );
                if (confirm) {
                    window.location.href = "../index.html"; // إرساله للاندكس بكل فخامة
                }
            } else {
                // المستخدم مسجل ولديه حساب، لكنه ربما فتح الرابط بـ ?mode=offline بالخطأ
                const url = new URL(window.location.href);
                if(url.searchParams.get('mode') === 'offline') {
                    // نزيل الأوفلاين من الرابط ونعيد تحميل الصفحة ليتصل بالإنترنت
                    window.showToast(window.getLangText('msg_connecting_cloud'));
                    setTimeout(() => {
                        window.location.href = "patient_dash.html"; 
                    }, 1000);
                } else {
                    window.showToast(window.getLangText('msg_already_online'));
                }
            }
        };

        // ==========================================
// 🎬 محرك عارض الوسائط السينمائي
// ==========================================
window.openMediaViewer = function(mediaUrl, isVideo = false) {
    const modal = document.getElementById('media-viewer-modal');
    const img = document.getElementById('viewer-img');
    const vid = document.getElementById('viewer-video');
    
    if(!modal) return;
    
    // الذكاء الاصطناعي البسيط: إذا كان الرابط ينتهي بصيغة فيديو أو طلبنا تشغيل فيديو
    if(isVideo || mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i) || mediaUrl.includes('video/upload')) {
        img.style.display = 'none';
        vid.src = mediaUrl;
        vid.style.display = 'block';
        vid.play(); // تشغيل الفيديو تلقائياً
    } else {
        vid.style.display = 'none';
        vid.pause();
        img.src = mediaUrl;
        img.style.display = 'block';
    }
    
    modal.style.display = 'flex';
};

window.closeMediaViewer = function() {
    const modal = document.getElementById('media-viewer-modal');
    if(modal) modal.style.display = 'none';
    
    // إيقاف الفيديو وتفريغ الروابط لتوفير الإنترنت
    const vid = document.getElementById('viewer-video');
    if(vid) {
        vid.pause();
        vid.src = ""; 
    }
    const img = document.getElementById('viewer-img');
    if(img) img.src = "";
};

// ============================================================================
// 🔋 محرك ميزات الأوفلاين الأربعة (Offline Super Engine)
// ============================================================================

window.offlineEngine = {
    // --- 1. جهات الاتصال المخصصة ---
    saveContact: function() {
        const name = document.getElementById('contact-name').value;
        const phone = document.getElementById('contact-phone').value;
        if(!name || !phone) return window.showToast(window.getLangText('msg_enter_name_phone'));
        
        let contacts = JSON.parse(localStorage.getItem('hm_contacts') || '[]');
        contacts.push({ id: Date.now(), name, phone });
        localStorage.setItem('hm_contacts', JSON.stringify(contacts));
        
        document.getElementById('contact-name').value = '';
        document.getElementById('contact-phone').value = '';
        this.renderContacts();
        window.showToast(window.getLangText('msg_saved_success'));
    },
    renderContacts: function() {
        const list = document.getElementById('custom-contacts-list');
        if(!list) return;
        let contacts = JSON.parse(localStorage.getItem('hm_contacts') || '[]');
        list.innerHTML = contacts.map(c => `
            <div class="hm-list-item">
                <div><h4 style="margin:0;">${c.name}</h4><p style="margin:0; font-size:12px; color:var(--text-sub);">${c.phone}</p></div>
                <a href="tel:${c.phone}" class="hm-btn" style="width:auto; padding:8px 15px; background:var(--green); color:#000; text-decoration:none;"><ion-icon name="call"></ion-icon></a>
                <ion-icon name="trash" style="color:var(--red); font-size:20px; margin-inline-end:10px; cursor:pointer;" onclick="window.offlineEngine.deleteContact(${c.id})"></ion-icon>
            </div>
        `).join('');
    },
    deleteContact: function(id) {
        let contacts = JSON.parse(localStorage.getItem('hm_contacts') || '[]');
        contacts = contacts.filter(c => c.id !== id);
        localStorage.setItem('hm_contacts', JSON.stringify(contacts));
        this.renderContacts();
    },

    // --- 2. حاسبة BMI ---
    calculateBMI: function() {
        const w = parseFloat(document.getElementById('bmi-weight').value);
        const h = parseFloat(document.getElementById('bmi-height').value) / 100;
        const resDiv = document.getElementById('bmi-result');
        
        if(!w || !h) return window.showToast(window.getLangText('msg_enter_weight_height'));
        
        const bmi = (w / (h * h)).toFixed(1);
        let status = "", color = "";
        
        if(bmi < 18.5) { status = window.getLangText('bmi_underweight'); color = "var(--orange)"; }
        else if(bmi < 24.9) { status = window.getLangText('bmi_normal'); color = "var(--green)"; }
        else if(bmi < 29.9) { status = window.getLangText('bmi_overweight'); color = "var(--gold)"; }
        else { status = window.getLangText('bmi_obese'); color = "var(--red)"; }
        
        resDiv.innerHTML = `${window.getLangText('bmi_result_lbl')} ${bmi} <br><span style="color:${color}; font-size:18px;">(${status})</span>`;
    },

    // --- 3. متعقب الماء ---
    drinkWater: function() {
        let count = parseInt(localStorage.getItem('hm_water') || '0');
        if(count >= 8) return window.showToast(window.getLangText('msg_water_goal_reached'));
        
        count++;
        localStorage.setItem('hm_water', count.toString());
        this.renderWater();
        window.showToast(window.getLangText('msg_water_logged'));
    },
    resetWater: function() {
        localStorage.setItem('hm_water', '0');
        this.renderWater();
    },
    renderWater: function() {
        const count = parseInt(localStorage.getItem('hm_water') || '0');
        const fillElem = document.getElementById('water-fill-level');
        const countElem = document.getElementById('water-count');
        if(fillElem && countElem) {
            countElem.innerText = count;
            fillElem.style.height = `${(count / 8) * 100}%`;
        }
    },

    // --- 4. سجل القياسات ---
    saveVital: function() {
        const type = document.getElementById('vital-type');
        const val = document.getElementById('vital-value').value;
        if(!val) return window.showToast(window.getLangText('msg_enter_value'));
        
        const typeText = type.options[type.selectedIndex].text;
        let vitals = JSON.parse(localStorage.getItem('hm_vitals') || '[]');
        
        const date = new Date();
        const dateString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        vitals.unshift({ id: Date.now(), type: typeText, val, date: dateString });
        if(vitals.length > 20) vitals.pop(); // نحتفظ بآخر 20 قراءة فقط
        
        localStorage.setItem('hm_vitals', JSON.stringify(vitals));
        document.getElementById('vital-value').value = '';
        this.renderVitals();
        window.showToast(window.getLangText('msg_vital_logged'));
    },
    renderVitals: function() {
        const list = document.getElementById('vitals-list');
        if(!list) return;
        let vitals = JSON.parse(localStorage.getItem('hm_vitals') || '[]');
        list.innerHTML = vitals.map(v => `
            <div class="hm-list-item" style="padding:10px 15px;">
                <div>
                    <h4 style="margin:0; font-size:14px; color:var(--orange);">${v.type}</h4>
                    <p style="margin:0; font-size:11px; color:var(--text-sub);"><ion-icon name="time-outline"></ion-icon> ${v.date}</p>
                </div>
                <strong style="font-size:16px;">${v.val}</strong>
            </div>
        `).join('');
    }
};

// تشغيل الوظائف عند فتح الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.offlineEngine.renderContacts();
    window.offlineEngine.renderWater();
    window.offlineEngine.renderVitals();
});
// ============================================================================
// 🧠 محرك رسائل المريض المصحح (Patient Messaging Router - Fixed)
// ============================================================================
// ==========================================
// 🚀 المحرك المركزي لفتح النوافذ (نسخة التيربو المضادة للثقل)
// ==========================================
window.openSPA = function(pageId) {
    // 1. الجزء الحركي: إظهار الصفحة المطلوبة وإخفاء الباقي
    document.querySelectorAll('.slide-page, .modal').forEach(el => {
        el.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // 2. 🧠 ذكاء التحميل (لا تشغيل للمحركات إلا عند الحاجة)
    // هذا الجزء سيجعل تطبيق المريض يطير لأنه يوزع الجهد على المعالج
    
    switch(pageId) {
        case 'chat-slide':
            // تشغيل صندوق الوارد (الاستشارات)
            if(window.patientInboxManager) window.patientInboxManager.loadConsultations();
            break;
            
        case 'radar-slide':
            // تشغيل الخريطة والرادار فقط عند فتحها
            if(window.radarEngine) window.radarEngine.init();
            break;
            
        case 'doctors-slide':
            // جلب قائمة الأطباء فقط عند الحاجة
            if(window.findDocsEngine) window.findDocsEngine.init();
            break;
            
        case 'blood-slide':
            // جلب نداءات الدم
            if(window.bloodEngine) window.bloodEngine.init();
            break;
            
        case 'pharmacy-slide':
            // جلب الصيدليات والمناوبات
            if(window.pharmacyEngine) window.pharmacyEngine.init();
            break;
            
        case 'cloud-slide':
            // فتح الملف الطبي السحابي
            if(window.cloudFolderEngine) window.cloudFolderEngine.init();
            break;
    }
};

window.patientInboxManager = {
  unsubscribeInbox: null, // متغير لقتل اللوب
    loadConsultations: function() {
        const user = window.firebase ? window.firebase.auth().currentUser : null;
        if (!user) return;

        const container = document.getElementById('patient-inbox-container');
        if(!container) return;

        // 🛑 قتل المراقب القديم
        if (this.unsubscribeInbox) {
            this.unsubscribeInbox();
        }

        container.innerHTML = `<div style="text-align:center; padding:30px;"><ion-icon name="sync" style="animation: spin 1s infinite; font-size:25px; color:var(--purple);"></ion-icon></div>`;

        this.unsubscribeInbox = window.firebase.firestore().collection("chats")
            .where("participants", "array-contains", user.uid)
            .onSnapshot(snap => {
                // ... (اترك باقي الكود الداخلي هنا كما هو الخاص بترتيب وعرض الرسائل) ...
                container.innerHTML = "";
                if (snap.empty) {
                    container.innerHTML = `<p style="text-align:center; color:#666; margin-top:20px;">${window.getLangText('msg_empty_inbox')}</p>`;
                    return;
                }
                let chatsArray = [];
                snap.forEach(doc => { let data = doc.data(); data.docId = doc.id; chatsArray.push(data); });
                chatsArray.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

                chatsArray.forEach(chat => {
                    const otherId = chat.participants.find(id => id !== user.uid);
                    const otherData = (chat.usersData && chat.usersData[otherId]) ? chat.usersData[otherId] : { name: window.getLangText('role_doctor') };
                    const avatarImg = otherData.photoURL || '../assets/img/profile.png';

                    container.innerHTML += `
                        <div class="inbox-card" onclick="window.PatientChatSystem.openRoom('${otherId}', '${otherData.name}', '${avatarImg}')">
                            <img src="${avatarImg}" class="inbox-avatar">
                            <div class="inbox-info">
                                <div class="inbox-header">
                                    <strong>${window.getLangText('dr_prefix')} ${otherData.name}</strong>
                                    <span class="inbox-time" style="font-size:12px;">${chat.medicalAccess === true ? '🔓' : '🔒'}</span>
                                </div>
                                <p class="inbox-last-msg">${chat.lastMessage || ''}</p>
                            </div>
                        </div>
                    `;
                });
            });
    }
};