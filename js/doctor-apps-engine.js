window.doctorAppsEngine = {
    init: function() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // استدعاء القاموس الحالي
                const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};

                firebase.firestore().collection('appointments')
                    .where('doctorId', '==', user.uid)
                    .orderBy('timestamp', 'desc')
                    .onSnapshot((snapshot) => {
                        const listDiv = document.getElementById('doctor-apps-list');
                        const badge = document.getElementById('doc-app-badge');
                        let pendingCount = 0;
                        
                        if (snapshot.empty) {
                            if(listDiv) {
                                // دمج النص المترجم مع الـ data-i18n للحفاظ على استقرار محركك
                                listDiv.innerHTML = `
                                    <div style="text-align:center; color:var(--text-sub); padding:50px;">
                                        <ion-icon name="calendar-clear-outline" style="font-size:50px; opacity:0.5;"></ion-icon>
                                        <br>
                                        <span data-i18n="doc_no_appointments">${dict.doc_no_appointments || 'لا توجد طلبات حجز حالياً.'}</span>
                                    </div>`;
                            }
                            if(badge) badge.style.display = 'none';
                            
                            if(typeof window.applyLanguage === 'function') window.applyLanguage();
                            return;
                        }

                        if(listDiv) listDiv.innerHTML = '';
                        
                        snapshot.forEach(doc => {
                            const app = doc.data();
                            if(app.status === 'pending') pendingCount++;
                            // الكسر مقدس: استدعاء renderCard كما هو
                            if(listDiv) this.renderCard(doc, listDiv);
                        });

                        // تطبيق الترجمة فوراً بعد رسم البطاقات
                        if(typeof window.applyLanguage === 'function') window.applyLanguage();

                        if(badge) {
                            if(pendingCount > 0) {
                                badge.innerText = pendingCount;
                                badge.style.display = 'flex';
                            } else {
                                badge.style.display = 'none';
                            }
                        }
                    }, (error) => {
                        console.error(dict.error_fetching_apps || "خطأ في جلب المواعيد:", error);
                    });
            }
        });
    },renderCard: function(doc, container) {
        const app = doc.data();
        const id = doc.id;
        let actionsHTML = '';

        // جلب الترجمة الحالية كقيمة احتياطية فورية
        const currentLang = localStorage.getItem('app_lang') || 'ar';
        const dict = (window.translations && window.translations[currentLang]) ? window.translations[currentLang] : {};

        // الأزرار والحالات مع معرفات الترجمة (الكسر مقدس)
        if(app.status === 'pending') {
            actionsHTML = `
                <div style="display:flex; gap:10px; margin-top:15px;">
                    <button onclick="window.doctorAppsEngine.updateStatus('${id}', 'accepted')" style="flex:1; padding:10px; border-radius:12px; border:none; background:var(--green); color:black; font-weight:bold; cursor:pointer;" data-i18n="doc_app_accept">${dict.doc_app_accept || 'قبول ✅'}</button>
                    <button onclick="window.doctorAppsEngine.updateStatus('${id}', 'rejected')" style="flex:1; padding:10px; border-radius:12px; border:1px solid var(--danger); background:transparent; color:var(--danger); font-weight:bold; cursor:pointer;" data-i18n="doc_app_reject">${dict.doc_app_reject || 'رفض ❌'}</button>
                </div>`;
        } else {
            const isAccepted = app.status === 'accepted';
            const statusText = isAccepted ? (dict.doc_app_accepted || 'تم القبول ✅') : (dict.doc_app_rejected || 'تم الرفض ❌');
            const statusColor = isAccepted ? 'var(--green)' : 'var(--danger)';
            const i18nKey = isAccepted ? 'doc_app_accepted' : 'doc_app_rejected';
            
            actionsHTML = `<div style="margin-top:10px; padding:8px; border-radius:8px; background:rgba(255,255,255,0.05); text-align:center; color:${statusColor}; font-weight:bold; font-size:13px;" data-i18n="${i18nKey}">${statusText}</div>`;
        }

        const cardHTML = `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 15px; padding: 15px; position: relative; margin-bottom: 15px;">
                
                <button onclick="window.doctorAppsEngine.customConfirmDelete('${id}')" style="position: absolute; top: 15px; left: 15px; background: rgba(255, 75, 43, 0.1); border: none; color: var(--danger); width: 35px; height: 35px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.3s;" title="${dict.delete_request || 'حذف الطلب'}">
                    <ion-icon name="trash-outline" style="font-size: 18px;"></ion-icon>
                </button>

                <h4 style="margin:0 0 5px 0; color:white; font-size:16px;"><span data-i18n="doc_app_patient">${dict.doc_app_patient || 'المريض:'}</span> ${app.patientName || 'مجهول'}</h4>
                <p style="margin:0 0 10px 0; color:var(--text-sub); font-size:13px;">
                    <ion-icon name="time-outline" style="vertical-align:middle;"></ion-icon> ${app.date} | ${app.time}
                </p>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 10px; font-size: 13px; color: #ddd; margin-right: 40px;">
                    <strong data-i18n="doc_app_notes">${dict.doc_app_notes || 'ملاحظات:'}</strong> ${app.notes || `<span data-i18n="doc_app_no_notes">${dict.doc_app_no_notes || 'لا توجد ملاحظات.'}</span>`}
                </div>
                ${actionsHTML}
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
    },
updateStatus: async function(id, newStatus) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        try {
            await firebase.firestore().collection('appointments').doc(id).update({ status: newStatus });
            
            // تحديث رسالة الإشعار بناءً على اللغة
            const msg = newStatus === 'accepted' 
                ? (dict.app_accept_success || 'تم قبول الموعد بنجاح ✅') 
                : (dict.app_reject_success || 'تم رفض الموعد ❌');
            
            window.showToast(msg);
        } catch(error) {
            console.error("خطأ في تحديث الحالة:", error);
            window.showToast(dict.update_error || "حدث خطأ أثناء التحديث");
        }
    },

    // 🔥 دالة الحذف بالنافذة الزجاجية الفخمة بدلاً من المتصفح الغبي!
    customConfirmDelete: function(id) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        
        // إذا لم تكن النافذة موجودة في الـ HTML، نصنعها برمجياً
        if(!document.getElementById('doc-delete-modal')) {
            const modalHTML = `
                <div id="doc-delete-modal" class="glass-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:99999; justify-content:center; align-items:center;">
                    <div style="background:#111; border:1px solid var(--danger); border-radius:20px; padding:30px; width:85%; max-width:350px; text-align:center; animation: scaleUp 0.3s ease; box-shadow: 0 10px 30px rgba(255,75,43,0.3);">
                        <ion-icon name="trash-outline" style="font-size:50px; color:var(--danger); margin-bottom:15px;"></ion-icon>
                        <h3 style="color:white; margin:0 0 10px 0;" data-i18n="confirm_del_app_title">${dict.confirm_del_app_title || 'تأكيد الحذف'}</h3>
                        <p style="color:var(--text-sub); font-size:14px; margin-bottom:25px;" data-i18n="confirm_del_app_desc">${dict.confirm_del_app_desc || 'هل أنت متأكد من حذف هذا الموعد نهائياً من قائمتك؟'}</p>
                        <div style="display:flex; gap:10px;">
                            <button id="doc-del-yes" style="flex:1; padding:12px; background:var(--danger); color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold;" data-i18n="btn_yes_delete">${dict.btn_yes_delete || 'نعم، احذف'}</button>
                            <button id="doc-del-no" style="flex:1; padding:12px; background:transparent; border:1px solid #555; color:#ccc; border-radius:10px; cursor:pointer; font-weight:bold;" data-i18n="btn_cancel">${dict.btn_cancel || 'إلغاء'}</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        const modal = document.getElementById('doc-delete-modal');
        modal.style.display = 'flex'; // إظهار النافذة

        // تطبيق الترجمة على النافذة (الكسر مقدس)
        if(typeof window.applyLanguage === 'function') window.applyLanguage();

        // حدث زر الموافقة
        document.getElementById('doc-del-yes').onclick = async () => {
            modal.style.display = 'none';
            try {
                await firebase.firestore().collection('appointments').doc(id).delete();
                window.showToast(dict.delete_success || "تم حذف الموعد من قائمتك 🗑️");
            } catch(error) {
                console.error("خطأ في الحذف:", error);
                window.showToast(dict.delete_error || "حدث خطأ أثناء محاولة الحذف ⚠️");
            }
        };

        // حدث زر الإلغاء
        document.getElementById('doc-del-no').onclick = () => {
            modal.style.display = 'none';
        };
    }
};

// تشغيل المحرك فور تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    if(window.doctorAppsEngine) {
        window.doctorAppsEngine.init();
    }
});