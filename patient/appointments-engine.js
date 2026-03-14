// ============================================================================
// 📅 محرك إدارة المواعيد (Appointments Engine - PRO & FAST)
// تم القضاء على التكرار وإضافة التيربو (Unsubscribe) لسرعة الهاتف
// ============================================================================

window.appointmentsEngine = {
    unsubscribe: null, // 🛑 السلاح السري لمنع التكرار واللاغ (Memory Leak)

    init: function() {
        const listDiv = document.getElementById('appointments-list');
        const user = window.firebase ? window.firebase.auth().currentUser : null;
        if (!user) return;
        
        // 🛑 قتل المراقب القديم قبل فتح واحد جديد لتخفيف الضغط على المعالج
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        listDiv.innerHTML = `<div style="text-align:center; padding:40px; color:#666;"><ion-icon name="sync" style="font-size:40px; animation: spin 1s linear infinite;"></ion-icon></div>`;

        // تشغيل مراقب واحد فقط وحفظه في المتغير
        this.unsubscribe = firebase.firestore().collection('appointments')
            .where('patientId', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .onSnapshot((snapshot) => {
                this.render(snapshot, listDiv);
            }, (error) => {
                console.error("🔥 خطأ في جلب المواعيد:", error);
                const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
                listDiv.innerHTML = `<p style="text-align:center; color:var(--red);">${dict.err_fetch_app || 'فشل في جلب المواعيد. تحقق من اتصالك.'}</p>`;
            });
    },

    // 1. رسم البطاقات مع إضافة زر الإلغاء
    render: function(snapshot, container) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div style="text-align:center; padding:50px; color:#888;">
                    <ion-icon name="calendar-clear-outline" style="font-size:50px; opacity:0.3;"></ion-icon>
                    <p>${dict.no_appointments_yet || 'ليس لديك أي مواعيد محجوزة بعد.'}</p>
                </div>`;
            return;
        }

        container.innerHTML = '';
        snapshot.forEach(doc => {
            const app = doc.data();
            const appId = doc.id;
            
            let statusClass = 'status-pending';
            let statusText = dict.status_pending || 'قيد الانتظار ⏳';

            if (app.status === 'accepted') { statusClass = 'status-accepted'; statusText = dict.status_accepted || 'تم القبول ✅'; }
            if (app.status === 'rejected') { statusClass = 'status-rejected'; statusText = dict.status_rejected || 'تم الرفض ❌'; }

            container.innerHTML += `
                <div class="app-card" id="app-${appId}">
                    <div style="flex: 1;">
                        <h4 style="color:white; margin:0 0 5px 0; font-size:16px;">${dict.dr_prefix || 'د. '}${app.doctorName}</h4>
                        <p style="color:#aaa; font-size:12px; margin:0;">
                            <ion-icon name="time-outline" style="vertical-align:middle;"></ion-icon> ${app.date} | ${app.time}
                        </p>
                        <span class="status-badge ${statusClass}" style="margin-top:8px; display:inline-block;">${statusText}</span>
                    </div>
                    
                    <button class="cancel-app-btn" onclick="window.appointmentsEngine.cancelAppointment('${appId}')" title="${dict.cancel_appointment || 'إلغاء الموعد'}">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                </div>
            `;
        });
    },

    // 2. دالة إلغاء الموعد (مع تنبيه ملكي 👑)
    cancelAppointment: async function(appId) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        
        const confirmed = await window.royalConfirm(
            dict.cancel_booking_title || "تراجع عن الحجز", 
            dict.cancel_booking_msg || "هل أنت متأكد أنك تريد إلغاء طلب الموعد هذا؟ لا يمكن التراجع عن هذا الإجراء.", 
            "alert-circle", 
            "#ff4b2b"
        );

        if (confirmed) {
            try {
                window.showToast(dict.deleting_request || "جاري حذف الطلب... ⏳");
                await firebase.firestore().collection('appointments').doc(appId).delete();
                window.showToast(dict.cancel_success || "تم إلغاء الموعد بنجاح 🗑️");
            } catch (error) {
                console.error("خطأ أثناء الحذف:", error);
                window.royalAlert(dict.sorry_title || "عذراً!", dict.cancel_failed || "فشل إلغاء الموعد، حاول مرة أخرى.", "close-circle", "var(--red)");
            }
        }
    }
};

window.openGoogleScannerHub = function() {
    const oldHub = document.getElementById('google-scanner-hub');
    if(oldHub) oldHub.remove();

    // روابط الأندرويد العميقة (تفتح التطبيقات الأصلية مباشرة)
    // رابط يفتح Google Lens مباشرة (الكاميرا)
    const lensIntent = "intent:#Intent;action=com.google.android.googlequicksearchbox.LENS_MAIN_TARGET;package=com.google.android.googlequicksearchbox;end";
    
    // رابط يفتح تطبيق المترجم
    const translateIntent = "intent://translate.google.com/#Intent;package=com.google.android.apps.translate;scheme=https;end";

    const hubHtml = `
        <div id="google-scanner-hub" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:999999; display:flex; justify-content:center; align-items:flex-end; backdrop-filter:blur(5px);">
            <div style="background:var(--card-bg, #1e1e1e); width:100%; border-radius:25px 25px 0 0; padding:25px; text-align:center; box-shadow: 0 -5px 20px rgba(0,0,0,0.5); animation: slideUp 0.3s ease-out;">
                <style>@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }</style>
                
                <h3 style="color:var(--text-main, white); margin-top:0; font-family:'Cairo';">ماسح الأدوية 🔍</h3>
                <p style="color:var(--text-sub, #888); font-size:13px; font-family:'Cairo'; margin-bottom:20px;">اختر الأداة المناسبة لفتح الكاميرا فوراً:</p>
                
                <a href="${lensIntent}" onclick="document.getElementById('google-scanner-hub').remove();" style="width:100%; background:#ffffff; color:#4285F4; border:2px solid #4285F4; border-radius:12px; padding:15px; font-weight:bold; font-size:16px; margin-bottom:12px; display:flex; justify-content:center; align-items:center; gap:10px; text-decoration:none; font-family:'Cairo'; box-sizing:border-box;">
                    <ion-icon name="scan-circle" style="color:#EA4335; font-size:24px;"></ion-icon> جوجل لانس (للتعرف على الدواء)
                </a>

                <a href="${translateIntent}" onclick="document.getElementById('google-scanner-hub').remove();" style="width:100%; background:#ffffff; color:#34A853; border:2px solid #34A853; border-radius:12px; padding:15px; font-weight:bold; font-size:16px; margin-bottom:20px; display:flex; justify-content:center; align-items:center; gap:10px; text-decoration:none; font-family:'Cairo'; box-sizing:border-box;">
                    <ion-icon name="language" style="color:#34A853; font-size:24px;"></ion-icon> المترجم (لقراءة النشرة)
                </a>

                <button onclick="document.getElementById('google-scanner-hub').remove();" style="background:transparent; border:none; color:var(--red, #ff4b2b); font-size:16px; font-weight:bold; cursor:pointer; font-family:'Cairo'; padding:10px;">إلغاء</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', hubHtml);
};