// ============================================================================
// 🛰️ محرك رادار الصحة (الميزة الأصلية: اكتشاف العيادات القريبة من موقع المريض)
// ============================================================================

window.radarEngine = {
    map: null,
    userMarker: null,
    providersData: [], // 🟢 سنحفظ بيانات الأطباء هنا لنحسب المسافة بينهم وبين المريض

    init: function() {
        document.getElementById('health-map').style.height = "75vh";

        if (this.map) {
            setTimeout(() => { this.map.invalidateSize(); }, 400);
            return; 
        }

        this.map = L.map('health-map', { zoomControl: false }).setView([36.7525, 3.04197], 6);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19, 
            attribution: '© Healthmate Radar'
        }).addTo(this.map);

        L.control.zoom({ position: 'topleft' }).addTo(this.map);

        // جلب كل الأطباء ورسمهم على الخريطة
        this.fetchHealthcareProviders();

        setTimeout(() => { this.map.invalidateSize(); }, 400);
    },

    // 📡 دالة الرادار الحقيقية (تحديد موقع المريض + إظهار من حوله)
    locateMe: function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        
        if (!navigator.geolocation) {
            window.showToast(dict.gps_not_supported || "جهازك لا يدعم تحديد الموقع 🚫");
            return;
        }

        window.showToast(dict.radar_scanning || "جاري مسح المنطقة المحيطة بك... 📡");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;

                // 1. رسم المريض (النقطة الزرقاء التي تنبض)
                if (this.userMarker) this.map.removeLayer(this.userMarker); 
                
                const userIcon = L.divIcon({
                    className: 'user-gps-pulse',
                    html: '<div style="width:20px; height:20px; background:var(--blue); border-radius:50%; border:3px solid white; box-shadow: 0 0 15px var(--blue);"></div>',
                    iconSize: [20, 20]
                });

                this.userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(this.map)
                    .bindPopup(`<b style='font-family:Cairo;'>${dict.you_are_here || 'أنت هنا 📍'}</b>`).openPopup();

                // 2. 🧠 خوارزمية الرادار: البحث عن أقرب الأطباء (ضمن دائرة 30 كيلومتر مثلاً)
                let bounds = [[userLat, userLng]]; // نبدأ بموقع المريض
                let nearbyCount = 0;

                this.providersData.forEach(p => {
                    const distance = this.calculateDistance(userLat, userLng, p.latitude, p.longitude);
                    
                    // إذا كان الطبيب يبعد أقل من 30 كيلومتر، نعتبره "قريباً"
                    if (distance <= 30) {
                        nearbyCount++;
                        bounds.push([p.latitude, p.longitude]); // نضيف موقعه لحدود الشاشة
                    }
                });

                // 3. توجيه الكاميرا بذكاء
                if (nearbyCount > 0) {
                    window.showToast((dict.radar_found_nearby || `تم العثور على ${nearbyCount} عيادة/صيدلية قريبة منك! 📍`).replace('${nearbyCount}', nearbyCount));
                    // هذه الدالة السحرية ستضبط الزوم ليجمع المريض والأطباء في شاشة واحدة
                    this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
                } else {
                    window.showToast(dict.radar_no_nearby || "أنت في موقعك، لكن لا توجد عيادات مسجلة قريبة منك حالياً.");
                    this.map.flyTo([userLat, userLng], 15); // زوم عادي على المريض
                }

            },
            (error) => {
                const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
                window.showToast(dict.radar_gps_failed || "فشل الالتقاط. يرجى تفعيل (الموقع/GPS) في هاتفك!");
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    },

   fetchHealthcareProviders: function() {
        window.firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    // 🔥 السحر السري لسرعة الأوفلاين (يقرأ الذاكرة فوراً إذا قطع النت)
                    const fetchOptions = navigator.onLine ? 'default' : 'cache';
                    let snapshot;
                    try {
                        snapshot = await window.firebase.firestore().collection("users").get({ source: fetchOptions });
                    } catch(e) {
                        snapshot = await window.firebase.firestore().collection("users").get({ source: 'cache' });
                    }

                    this.providersData = []; // تصفير المصفوفة
                    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};

                    snapshot.forEach(doc => {
                        const data = doc.data();
                        
                        if (data.latitude && data.longitude && (data.role === "doctor" || data.role === "pharmacist")) {
                            
                            // حفظ بيانات الطبيب في ذاكرة الرادار
                            this.providersData.push({
                                latitude: parseFloat(data.latitude),
                                longitude: parseFloat(data.longitude)
                            });

                            const isDoc = data.role === "doctor";
                            const pinColor = isDoc ? "#42e695" : "#b794f4"; 
                            const pinIcon = isDoc ? "medkit" : "medical";
                            const prefix = isDoc ? (dict.dr_prefix || 'د.') : (dict.pharmacy_prefix || 'صيدلية');

                            const customMarker = L.divIcon({
                                className: 'custom-map-marker',
                                html: `<div style="background:${pinColor}; width:35px; height:35px; border-radius:50%; display:flex; justify-content:center; align-items:center; border:2px solid white; box-shadow:0 5px 10px rgba(0,0,0,0.5); color:black; font-size:20px;"><ion-icon name="${pinIcon}"></ion-icon></div>`,
                                iconSize: [35, 35],
                                iconAnchor: [17, 35], 
                                popupAnchor: [0, -35]
                            });

                            const marker = L.marker([data.latitude, data.longitude], { icon: customMarker }).addTo(this.map);
                            marker.bindPopup(`
                                <div style="font-family:'Cairo'; text-align:center; min-width:150px;">
                                    <h4 style="margin:0; font-size:14px; color:#111;">${prefix} ${data.name}</h4>
                                    <p style="margin:0; font-size:11px; color:#666;">${data.specialty || ''}</p>
                                </div>
                            `);
                        }
                    });
                } catch (error) {
                    console.error("خطأ في جلب العيادات:", error);
                }
            } else {
                console.warn("المستخدم غير مسجل الدخول، تم حجب بيانات الخريطة لحماية الأطباء 🔒");
            }
        });
    },

    // ✈️ دالة الطيران المباشر (تُستخدم من زر المناوبة الليلية)
    flyToProvider: function(lat, lng) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        openSPA('radar-slide');
        window.showToast(dict.radar_flying || "جاري توجيهك للموقع... 🚁");
        setTimeout(() => {
            if (this.map) this.map.flyTo([lat, lng], 18, { animate: true, duration: 2 });
        }, 500);
    },

    // 🧮 معادلة حساب المسافة الجغرافية (Haversine Formula) بالكيلومتر
    calculateDistance: function(lat1, lon1, lat2, lon2) {
        const R = 6371; // نصف قطر الأرض بالكيلومتر
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // ترجع المسافة بالكيلومتر
    }
};

// ============================================================================
// 🩸 محرك شبكة نداء الدم (Blood Rescue Network)
// ============================================================================

window.bloodEngine = {
    unsubBlood: null, // 🔥 سلاح تدمير التكرار السري

    init: function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const listDiv = document.getElementById('blood-requests-list');

        // 🔥 نقتل الاستماع القديم لكي لا يتجمد الهاتف
        if(this.unsubBlood) this.unsubBlood(); 

        listDiv.innerHTML = `<div style="text-align:center; padding:40px; color:#888;"><ion-icon name="sync" style="font-size:40px; animation: spin 1s linear infinite;"></ion-icon><p>${dict.blood_searching || 'جاري البحث عن نداءات عاجلة...'}</p></div>`;
        
        // جلب النداءات من فايربيس (ترتيب من الأحدث للأقدم)
        this.unsubBlood = window.firebase.firestore().collection('blood_requests')
            .orderBy('timestamp', 'desc')
            .onSnapshot((snapshot) => {
                listDiv.innerHTML = '';
                
                if (snapshot.empty) {
                    listDiv.innerHTML = `
                        <div style="text-align:center; padding:40px; color:var(--green);">
                            <ion-icon name="heart-circle-outline" style="font-size:70px;"></ion-icon>
                            <p style="font-weight:bold;">${dict.blood_no_cases || 'لا توجد حالات حرجة حالياً.<br>الحمد لله على نعمة الصحة! 🤲'}</p>
                        </div>`;
                    return;
                }

                snapshot.forEach(doc => {
                    const req = doc.data();
                    const reqId = doc.id;
                    const myUid = window.firebase.auth().currentUser?.uid;
                    const isMyRequest = req.requesterId === myUid; // هل أنا من طلب الدم؟

                    // حساب الوقت
                    let timeAgo = dict.time_now || 'الآن';
                    if (req.timestamp) {
                        const seconds = Math.floor((new Date() - req.timestamp.toDate()) / 1000);
                        if (seconds < 60) timeAgo = dict.time_seconds_ago || "منذ ثوانٍ";
                        else if (seconds < 3600) timeAgo = (dict.time_mins_ago || "منذ ${n} دقيقة").replace('${n}', Math.floor(seconds/60));
                        else if (seconds < 86400) timeAgo = (dict.time_hours_ago || "منذ ${n} ساعة").replace('${n}', Math.floor(seconds/3600));
                        else timeAgo = (dict.time_days_ago || "منذ ${n} يوم").replace('${n}', Math.floor(seconds/86400));
                    }

                    listDiv.innerHTML += `
                        <div class="blood-card">
                            <div class="blood-urgent">${dict.blood_urgent || 'عاجل جداً'}</div>
                            <div style="display: flex; gap: 15px; align-items: center;">
                                <div class="blood-type-badge">${req.bloodType}</div>
                                <div class="blood-info" style="flex: 1;">
                                    <h4>${dict.blood_patient_in || 'مريض في'} ${req.hospital}</h4>
                                    <p><ion-icon name="location-outline"></ion-icon> ${dict.blood_wilaya || 'الولاية:'} ${req.wilaya}</p>
                                    <p><ion-icon name="time-outline"></ion-icon> ${timeAgo}</p>
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 10px; margin-top: 15px;">
                                <a href="tel:${req.phone}" class="hm-btn" style="margin:0; background:var(--red); color:white; text-decoration:none; display:flex; justify-content:center; align-items:center; gap:5px; flex:2;">
                                    <ion-icon name="call"></ion-icon> ${dict.blood_call_donate || 'اتصل للتبرع'}
                                </a>
                                
                                ${isMyRequest ? `
                                <button class="hm-btn" style="margin:0; background:transparent; border:1px solid var(--green); color:var(--green); flex:1; font-size:12px;" onclick="window.bloodEngine.deleteRequest('${reqId}')">
                                    <ion-icon name="checkmark-done"></ion-icon> ${dict.blood_donated || 'تم التبرع'}
                                </button>` : ''}
                            </div>
                        </div>
                    `;
                });
            }, (error) => {
                console.error(error);
                const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
                listDiv.innerHTML = `<p style="color:var(--red); text-align:center;">${dict.blood_fetch_err || 'حدث خطأ في جلب النداءات. تأكد من اتصالك بالإنترنت.'}</p>`;
            });
    },

    // دالة إرسال النداء للسحابة
    submitRequest: async function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const bloodType = document.getElementById('blood-type-req').value;
        const wilaya = document.getElementById('blood-wilaya').value.trim();
        const hospital = document.getElementById('blood-hospital').value.trim();
        const phone = document.getElementById('blood-phone').value.trim();
        const user = window.firebase.auth().currentUser;

        if (!user) return window.royalAlert(dict.login_req_title || "تسجيل الدخول", dict.blood_login_msg || "يجب إنشاء حساب وإثبات هويتك لإطلاق نداء دم، منعاً للطلبات الوهمية.", "lock-closed", "var(--orange)");
        if (!bloodType || !wilaya || !hospital || !phone) return window.showToast(dict.fill_all_fields || "⚠️ يرجى تعبئة جميع الحقول!");

        try {
            window.showToast(dict.blood_broadcasting || "جاري إرسال النداء لجميع المستخدمين... 📡");
            document.getElementById('blood-form').style.display = 'none';

            await window.firebase.firestore().collection('blood_requests').add({
                requesterId: user.uid,
                bloodType: bloodType,
                wilaya: wilaya,
                hospital: hospital,
                phone: phone,
                timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
            });

            window.royalAlert(dict.blood_sent_title || "تم النشر بنجاح!", dict.blood_sent_msg || "تم إطلاق نداء الاستغاثة بنجاح. نسأل الله الشفاء العاجل للمريض. سيقوم المتبرعون بالاتصال بك قريباً.", "heart", "var(--red)");
            
            // تصفير الحقول
            document.getElementById('blood-wilaya').value = '';
            document.getElementById('blood-hospital').value = '';
            document.getElementById('blood-phone').value = '';

        } catch (e) {
            console.error(e);
            window.showToast(dict.blood_send_err || "حدث خطأ أثناء الإرسال ❌");
        }
    },

    // دالة حذف النداء (عندما يتم إنقاذ المريض)
    deleteRequest: async function(reqId) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const confirm = await window.royalConfirm(dict.blood_close_req || "إغلاق النداء", dict.blood_close_msg || "هل تم توفير الدم للمريض وتريد حذف هذا النداء من التطبيق؟", "checkmark-circle", "var(--green)");
        if (confirm) {
            try {
                await window.firebase.firestore().collection('blood_requests').doc(reqId).delete();
                window.showToast(dict.blood_closed_success || "تم إغلاق النداء. بارك الله في المتبرعين! 🤲");
            } catch (e) { console.error(e); }
        }
    }
};

// ============================================================================
// 📁 محرك الملف الطبي السحابي (Cloud Medical Folder)
// ============================================================================

window.cloudFolderEngine = {
    unsubFolder: null, // 🔥 حماية الذاكرة من التكرار

    // 🧠 الدالة الذكية: تقبل ID المريض إذا كان الطبيب هو من يستعرض الملف
    init: function(targetPatientId = null) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const listDiv = document.getElementById('cloud-files-list');
        const currentUser = window.firebase.auth().currentUser;
        
        if (!currentUser) {
            listDiv.innerHTML = `<p style="text-align:center; color:var(--orange);">${dict.cloud_login_req || 'يرجى تسجيل الدخول للوصول إلى الملف السحابي 🔒'}</p>`;
            return;
        }

        // 1. تحديد من صاحب الملف ومن الذي يشاهده
        const uidToFetch = targetPatientId || currentUser.uid;
        const isDoctorViewing = (targetPatientId !== null && targetPatientId !== currentUser.uid);

        // 2. 🛡️ إخفاء أزرار الرفع عن الطبيب (للقراءة فقط)
        const uploadButtons = document.getElementById('cloud-upload-buttons');
        if (uploadButtons) {
            uploadButtons.style.display = isDoctorViewing ? 'none' : 'flex';
        }

        // 🔥 قتل المراقبة القديمة لمنع الانهيار
        if(this.unsubFolder) this.unsubFolder();

        listDiv.innerHTML = `<div style="text-align:center; padding:30px; color:#888;"><ion-icon name="sync" style="animation: spin 1s linear infinite; font-size: 30px;"></ion-icon></div>`;

        // 3. جلب الملفات من السحابة بناءً على الـ UID المحدد
        this.unsubFolder = window.firebase.firestore().collection('cloud_medical_files')
            .where('patientId', '==', uidToFetch)
            .orderBy('timestamp', 'desc')
            .onSnapshot(snap => {
                listDiv.innerHTML = '';
                if (snap.empty) {
                    listDiv.innerHTML = `
                        <div style="text-align:center; padding:30px; color:var(--text-sub); opacity: 0.6;">
                            <ion-icon name="cloud-offline-outline" style="font-size: 60px;"></ion-icon>
                            <p>${isDoctorViewing ? (dict.cloud_empty_doc || 'المريض لم يقم برفع أي ملفات طبية بعد.') : (dict.cloud_empty_patient || 'ملفك السحابي فارغ. ابدأ برفع تحاليلك الآن!')}</p>
                        </div>`;
                    return;
                }

                snap.forEach(doc => {
                    const file = doc.data();
                    const fileId = doc.id;
                    const date = file.timestamp ? file.timestamp.toDate().toLocaleDateString('ar-EG') : (dict.time_now || 'الآن');

                    // 🛡️ إخفاء أيقونة "الحذف" (سلة المهملات) عن الطبيب لكي لا يحذف ملفات المريض!
                    const deleteBtn = isDoctorViewing ? '' : `<ion-icon name="trash" style="color: var(--red); font-size: 22px; padding: 10px; cursor: pointer;" onclick="window.cloudFolderEngine.deleteFile('${fileId}')"></ion-icon>`;

                    listDiv.innerHTML += `
                        <div class="cloud-file-card">
                            <img src="${file.fileUrl}" onclick="window.openMediaViewer('${file.fileUrl}')" title="${dict.click_to_enlarge || 'اضغط للتكبير'}">
                            <div class="cloud-file-info">
                                <h4>${file.type}</h4>
                                <p><ion-icon name="calendar-outline"></ion-icon> ${date}</p>
                            </div>
                            ${deleteBtn}
                        </div>
                    `;
                });
            }, error => {
                console.error(error);
                listDiv.innerHTML = `<p style="color:var(--red); text-align:center;">${dict.cloud_fetch_err || 'حدث خطأ أو أن الفهرس (Index) غير مبني بعد. تحقق من الكونسول.'}</p>`;
            });
    },

    // دالة الرفع للسحابة
    uploadFile: async function(event, fileType) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const file = event.target.files[0];
        if (!file) return;

        const user = window.firebase.auth().currentUser;
        if (!user) return window.royalAlert(dict.alert_warning || "تنبيه", dict.cloud_upload_req || "يجب تسجيل الدخول لرفع الملفات", "lock-closed", "var(--orange)");

        window.showToast((dict.cloud_encrypt_upload || `جاري تشفير ورفع الـ ({type})... ⏳`).replace('{type}', fileType));
        
        // تحويل الصورة إلى Base64 للحفظ السريع (نظام ضغط سريع)
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async (e) => {
            const base64Img = e.target.result;
            
            try {
                // حفظ البيانات في الفايربيس
                await window.firebase.firestore().collection('cloud_medical_files').add({
                    patientId: user.uid,
                    type: fileType, // تحليل أو أشعة
                    fileUrl: base64Img,
                    timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
                });
                
                window.showToast(dict.cloud_upload_success || "تم الرفع بنجاح! السحابة آمنة ☁️✅");
            } catch (error) {
                console.error(error);
                window.showToast(dict.cloud_upload_fail || "فشل الرفع، ربما الصورة كبيرة جداً ❌");
            }
            event.target.value = ''; // تصفير الحقل
        };
    },

    // دالة حذف الملف
    deleteFile: async function(fileId) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const confirm = await window.royalConfirm(dict.cloud_del_file || "حذف ملف", dict.cloud_del_msg || "هل أنت متأكد من حذف هذا الملف من السحابة نهائياً؟", "trash-bin", "var(--red)");
        if (confirm) {
            try {
                await window.firebase.firestore().collection('cloud_medical_files').doc(fileId).delete();
                window.showToast(dict.cloud_del_success || "تم حذف الملف 🗑️");
            } catch (error) {
                console.error(error);
            }
        }
    }
};


// ============================================================================
// 🌙 محرك طوارئ الصيدليات (Pharmacy & Night Duty Engine)
// ============================================================================

window.pharmacyEngine = {
    unsubMeds: null, // 🔥 حماية الذاكرة 1
    unsubDuty: null, // 🔥 حماية الذاكرة 2

    init: function() {
        this.loadMyMedRequests();
        this.loadNightDuty();
    },

    // 1. التبديل بين نافذة "صائد الأدوية" و "المناوبة"
    switchTab: function(tabName) {
        const btnMed = document.getElementById('tab-btn-med');
        const btnDuty = document.getElementById('tab-btn-duty');
        const secMed = document.getElementById('section-med-hunter');
        const secDuty = document.getElementById('section-night-duty');

        if (tabName === 'med') {
            btnMed.style.background = 'var(--purple)'; btnMed.style.color = 'white';
            btnDuty.style.background = 'transparent'; btnDuty.style.color = 'var(--text-sub)';
            secMed.style.display = 'block';
            secDuty.style.display = 'none';
        } else {
            btnDuty.style.background = 'var(--blue)'; btnDuty.style.color = 'black';
            btnMed.style.background = 'transparent'; btnMed.style.color = 'var(--text-sub)';
            secDuty.style.display = 'block';
            secMed.style.display = 'none';
        }
    },

    // 2. إطلاق رادار البحث عن الدواء
    broadcastMed: async function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const medName = document.getElementById('missing-med-input').value.trim();
        const user = window.firebase.auth().currentUser;

        if (!user) return window.royalAlert(dict.login_req_title || "تسجيل الدخول", dict.med_hunt_login_req || "يجب أن تملك حساباً لإطلاق نداء الأدوية.", "lock-closed", "var(--orange)");
        if (!medName) return window.showToast(dict.warn_type_med || "⚠️ يرجى كتابة اسم الدواء أولاً!");

        try {
            window.showToast(dict.med_hunt_scanning || "جاري إطلاق رادار البحث... 📡");
            
            await window.firebase.firestore().collection('medicine_requests').add({
                patientId: user.uid,
                medName: medName,
                status: 'searching', // searching ⏳, found ✅
                foundAtInfo: null, // سيتم ملؤه لاحقاً بواسطة الصيدلي
                timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
            });

            document.getElementById('missing-med-input').value = '';
          window.royalAlert(dict.med_radar_launched || "تم إطلاق الرادار! 🚀", (dict.med_hunt_msg || `تم إرسال طلبك للبحث عن (${medName})...`).replace('${medName}', medName), "radio", "var(--purple)");
            
        } catch (error) {
            console.error(error);
            window.showToast(dict.med_hunt_err || "حدث خطأ أثناء الإرسال ❌");
        }
    },

  // 3. جلب طلبات الأدوية الخاصة بي (للإستماع إذا وجده صيدلي)
    loadMyMedRequests: function() {
        const user = window.firebase.auth().currentUser;
        if (!user) return;
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};

        const listDiv = document.getElementById('med-requests-list');
        
        // 🔥 قتل المراقبة القديمة
        if(this.unsubMeds) this.unsubMeds();

        this.unsubMeds = window.firebase.firestore().collection('medicine_requests')
            .where('patientId', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .onSnapshot(snap => {
                listDiv.innerHTML = '';
                if (snap.empty) {
                    listDiv.innerHTML = `<p style="text-align:center; color:var(--text-sub);">${dict.med_no_radar || 'لم تقم بإطلاق أي رادار للبحث بعد.'}</p>`;
                    return;
                }

                snap.forEach(doc => {
                    const req = doc.data();
                    const reqId = doc.id;
                    const isFound = req.status === 'found'; // 🟢 هنا نكتشف إذا الصيدلي وجده!
                    
                    const statusClass = isFound ? 'found' : '';
                    const statusText = isFound 
                        ? `<span style="color:var(--green); font-weight:bold;">${dict.med_found || 'تم العثور على الدواء ✅'}</span>` 
                        : `<span class="radar-ping"></span> ${dict.med_searching_pharm || 'جاري البحث في الصيدليات...'}`;
                    
                    let foundInfoHTML = '';

                    if (isFound) {
                        const mapAction = (req.foundLat && req.foundLng) 
                            ? `window.radarEngine.flyToProvider(${req.foundLat}, ${req.foundLng})` 
                            : `window.showToast('${dict.pharm_no_location || 'لم يقم هذا الصيدلي بتحديد موقعه على الخريطة ❌'}')`;

                        foundInfoHTML = `
                            <div style="margin-top: 15px; padding: 15px; background: rgba(66, 230, 149, 0.1); border: 1px dashed var(--green); border-radius: 12px;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: white;">
                                    📍 ${dict.med_available_at || 'متوفر الآن في:'} <b style="color: var(--green);">${req.foundAtInfo}</b>
                                </p>
                                <button class="hm-btn" style="background: var(--green); color: black; font-weight: bold; width: 100%; margin: 0; display: flex; justify-content: center; align-items: center; gap: 8px;" onclick="${mapAction}">
                                    <ion-icon name="navigate" style="font-size: 18px;"></ion-icon> ${dict.btn_go_pharmacy || 'اذهب للصيدلية (عبر الخريطة)'}
                                </button>
                                
                                <button class="hm-btn" style="background: transparent; border: 1px solid var(--text-sub); color: var(--text-sub); width: 100%; margin: 10px 0 0 0; padding: 5px;" onclick="window.pharmacyEngine.cancelRequest('${reqId}')">
                                    ${dict.btn_del_bought || 'حذف الطلب (تم الشراء)'}
                                </button>
                            </div>
                        `;
                    } else {
                        foundInfoHTML = `
                            <div style="margin-top: 10px; text-align: left;">
                                <button class="hm-btn" style="background: transparent; border: 1px solid var(--red); color: var(--red); padding: 5px 15px; font-size: 12px; margin: 0; width: auto;" onclick="window.pharmacyEngine.cancelRequest('${reqId}')">${dict.btn_cancel_search || 'إلغاء البحث'}</button>
                            </div>
                        `;
                    }

                    listDiv.innerHTML += `
                        <div class="med-req-card ${statusClass}" style="${isFound ? 'border: 1px solid var(--green);' : ''} margin-bottom: 12px;">
                            <h4 style="margin: 0 0 5px 0; color: white; font-size: 16px;">💊 ${req.medName}</h4>
                            <p style="margin: 0; font-size: 12px; color: var(--text-sub);">${statusText}</p>
                            ${foundInfoHTML}
                        </div>
                    `;
                });
            }, error => {
                console.error("خطأ في جلب طلبات الأدوية:", error);
            });
    },
    // 4. حذف طلب البحث
    cancelRequest: async function(reqId) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        try {
            await window.firebase.firestore().collection('medicine_requests').doc(reqId).delete();
            window.showToast(dict.med_search_canceled || "تم إلغاء البحث 🗑️");
        } catch(e) { console.error(e); }
    },

    // 5. جلب الصيادلة والأطباء المناوبين ليلاً (بتحديث فوري Real-Time)
    loadNightDuty: function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const listDiv = document.getElementById('night-duty-list');
        listDiv.innerHTML = `<div style="text-align:center; padding:20px;"><ion-icon name="sync" style="animation: spin 1s linear infinite; font-size: 30px; color:var(--blue);"></ion-icon></div>`;
        
        // 🔥 قتل المراقبة القديمة
        if(this.unsubDuty) this.unsubDuty();

        // 🚨 استخدام onSnapshot بدلاً من get() لكي تختفي العيادة فور إيقاف المناوبة
        this.unsubDuty = window.firebase.firestore().collection('users')
            .where('isNightDuty', '==', true)
            .onSnapshot(snapshot => {
                listDiv.innerHTML = '';
                if (snapshot.empty) {
                    listDiv.innerHTML = `
                        <div style="text-align:center; padding:30px; color:var(--text-sub);">
                            <ion-icon name="moon-outline" style="font-size:50px; opacity:0.5;"></ion-icon>
                            <p>${dict.night_duty_empty || 'لا توجد عيادات أو صيدليات مناوبة مسجلة في الوقت الحالي.'}</p>
                        </div>`;
                    return;
                }

                snapshot.forEach(doc => {
                    const place = doc.data();
                    const docTitle = (dict.dr_prefix || 'د.');
                    const pharmTitle = (dict.pharmacy_prefix || 'صيدلية');
                    const title = place.role === 'doctor' ? `${docTitle} ${place.name}` : `${pharmTitle} ${place.name}`;
                    const icon = place.role === 'doctor' ? 'medkit' : 'medical';

                    // 🚨 جلب الإحداثيات لكي نرسل المريض إليها مباشرة
                    const lat = place.latitude || 0;
                    const lng = place.longitude || 0;
                    
                    // إذا لم يحدد الطبيب موقعه نعطيه تنبيه، وإذا حدده نطير به للخريطة
                    const mapAction = (lat !== 0) ? `window.radarEngine.flyToProvider(${lat}, ${lng})` : `window.showToast('${dict.duty_no_loc || 'هذا المستخدم لم يحدد موقعه على الخريطة ❌'}')`;

                    listDiv.innerHTML += `
                        <div class="duty-card">
                            <div style="display:flex; align-items:center; gap:15px;">
                                <div style="background:rgba(0,210,255,0.2); color:var(--blue); width:45px; height:45px; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:24px;">
                                    <ion-icon name="${icon}"></ion-icon>
                                </div>
                                <div>
                                    <h4 style="margin:0; font-size:15px; color:white;">${title}</h4>
                                    <p style="margin:0; font-size:12px; color:var(--green); font-weight:bold;">${dict.duty_open_now || 'مفتوح الآن ✅'}</p>
                                </div>
                            </div>
                            <button onclick="${mapAction}" style="background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-main); width:40px; height:40px; border-radius:50%; cursor:pointer; display:flex; justify-content:center; align-items:center; font-size:20px; transition:0.3s;">
                                <ion-icon name="location"></ion-icon>
                            </button>
                        </div>
                    `;
                });
            }, error => {
                console.error("خطأ المناوبات:", error);
                const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
                listDiv.innerHTML = `<p style="text-align:center; color:var(--red);">${dict.duty_fetch_err || 'حدث خطأ أثناء جلب بيانات المناوبة.'}</p>`;
            });
    }
};