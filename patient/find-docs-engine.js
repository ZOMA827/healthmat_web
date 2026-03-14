// ============================================================================
// محرك البحث عن الأطباء الأسطوري (Find Doctors Engine) 🔍
// ============================================================================

window.findDocsEngine = {
    allDoctors: [], 
    currentDoctorSelected: null, 

  // 1. تشغيل المحرك الصاروخي (بدون لوب التجميد)
    init: async function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const listDiv = document.getElementById('doctors-list');
        
        // التحقق المباشر والسريع من المستخدم بدون onAuthStateChanged
        const user = firebase.auth().currentUser;
        if (!user) {
            if(listDiv) listDiv.innerHTML = `<p style="text-align:center; color:var(--orange); font-weight:bold; margin-top:30px;"><ion-icon name="lock-closed" style="font-size: 40px;"></ion-icon><br>${dict.login_req_docs || 'عذراً، يجب تسجيل الدخول لرؤية الأطباء 🔒'}</p>`;
            return;
        }

        // إذا كانت القائمة ممتلئة مسبقاً، لا داعي لجلبها من الإنترنت مرة أخرى (هذا ما كان يجمد الهاتف!)
        if (this.allDoctors.length > 0) {
            this.renderDoctors(this.allDoctors);
            return;
        }

        listDiv.innerHTML = `<div style="text-align:center; width:100%; color:#888; margin-top:30px;"><ion-icon name="sync" style="font-size:40px; animation: spin 1s linear infinite; color:var(--blue);"></ion-icon><p>${dict.loading_doctors || 'جاري جلب الأطباء...'}</p></div>`;
        
        try {
            // 🔥 السلاح السري للسرعة في الأوفلاين: نجبره على قراءة الذاكرة إذا كان النت مقطوعاً
            const fetchOptions = navigator.onLine ? 'default' : 'cache';
            let snapshot;
            try {
                snapshot = await firebase.firestore().collection("users").where("role", "==", "doctor").get({ source: fetchOptions });
            } catch(e) {
                // إذا فشل (مثلاً النت ضعيف جداً وليس مقطوعاً)، اقرأ من الكاش بالقوة لمنع التجميد!
                snapshot = await firebase.firestore().collection("users").where("role", "==", "doctor").get({ source: 'cache' });
            }

            this.allDoctors = []; 
            snapshot.forEach(doc => {
                const data = doc.data();
                this.allDoctors.push({
                    id: doc.id,
                    name: data.name || (dict.unknown_doctor || "طبيب غير معروف"),
                    specialty: data.specialty || (dict.general_spec || "عام"),
                    bio: data.bio || (dict.default_doc_bio || "طبيب مسجل في منصة هيلث ميت."),
                    photoURL: data.photoURL || "https://cdn-icons-png.flaticon.com/512/3774/3774299.png",
                    latitude: data.latitude, // تمت الإضافة للرادار
                    longitude: data.longitude
                });
            });
            this.renderDoctors(this.allDoctors); 
        } catch (error) {
            if(listDiv) listDiv.innerHTML = `<p style="text-align:center; color:var(--red); font-weight:bold;">${dict.error_fetch_docs || 'حدث خطأ في جلب البيانات! 🚫'}</p>`;
        }
    },

    // 2. عرض الأطباء في الشاشة
    renderDoctors: function(doctorsArray) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const listDiv = document.getElementById('doctors-list');
        if(!listDiv) return;

        listDiv.innerHTML = ''; 

        if(doctorsArray.length === 0) {
            listDiv.innerHTML = `<p style="text-align:center; color:#888; margin-top:30px;">${dict.no_docs_match || 'لم نجد أطباء يطابقون بحثك 🕵️‍♂️'}</p>`;
            return;
        }

        doctorsArray.forEach(doc => {
            listDiv.innerHTML += `
                <div class="doc-card" onclick="window.findDocsEngine.openProfile('${doc.id}')">
                    <img src="${doc.photoURL}" class="doc-avatar" loading="lazy">
                    <div class="doc-info" style="flex: 1;">
                        <h4>${doc.name}</h4>
                        <span class="spec-badge">${doc.specialty}</span>
                    </div>
                    <ion-icon name="chevron-back-outline" style="color: #666;"></ion-icon>
                </div>
            `;
        });
    },

    // 3. فلتر التخصصات
    filterSpec: function(specName, btnElement) {
        document.querySelectorAll('.spec-pill').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');

        document.getElementById('doc-search-input').value = '';
        document.getElementById('search-autocomplete').style.display = 'none';

        if (specName === 'all') {
            this.renderDoctors(this.allDoctors);
        } else {
            const filtered = this.allDoctors.filter(doc => doc.specialty && doc.specialty.includes(specName));
            this.renderDoctors(filtered);
        }
    },

    // 4. محرك البحث الذكي والتخمين (Auto-complete)
    handleSearch: function() {
        const query = document.getElementById('doc-search-input').value.trim().toLowerCase();
        const autoBox = document.getElementById('search-autocomplete');
        
        document.querySelectorAll('.spec-pill').forEach(b => b.classList.remove('active'));
        document.querySelector('.spec-pill').classList.add('active'); 

        if (query === '') {
            autoBox.style.display = 'none';
            this.renderDoctors(this.allDoctors);
            return;
        }

        // تصفية الأطباء بناءً على الاسم أو التخصص
        const filtered = this.allDoctors.filter(doc => 
            (doc.name && doc.name.toLowerCase().includes(query)) || 
            (doc.specialty && doc.specialty.toLowerCase().includes(query))
        );

        this.renderDoctors(filtered);

        // بناء صندوق التخمين الأسطوري
        if (filtered.length > 0) {
            autoBox.innerHTML = '';
            filtered.slice(0, 4).forEach(doc => {
                autoBox.innerHTML += `
                    <div class="auto-item" onclick="window.findDocsEngine.selectFromAuto('${doc.id}')">
                        <img src="${doc.photoURL}">
                        <div>
                            <div style="color: white; font-size: 14px;">${doc.name}</div>
                            <div style="color: var(--blue); font-size: 11px;">${doc.specialty}</div>
                        </div>
                    </div>
                `;
            });
            autoBox.style.display = 'block';
        } else {
            autoBox.style.display = 'none';
        }
    },

    selectFromAuto: function(docId) {
        document.getElementById('search-autocomplete').style.display = 'none';
        this.openProfile(docId); 
    },

    // 5. قسم البروفايل الخاص بالطبيب
    openProfile: async function(docId) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const docData = this.allDoctors.find(d => d.id === docId);
        if(!docData) return;

        this.currentDoctorSelected = docData; 

        document.getElementById('dp-img').src = docData.photoURL || '../assets/img/profile.png';
        document.getElementById('dp-name').innerText = docData.name;
        document.getElementById('dp-spec').innerText = docData.specialty;
        document.getElementById('dp-bio').innerText = docData.bio || (dict.fetching_clinic_details || 'جاري جلب تفاصيل العيادة...');

        document.getElementById('doctor-profile-modal').style.display = 'flex';

        try {
            const docRef = await firebase.firestore().collection('users').doc(docId).get();
            if(docRef.exists) {
                const liveData = docRef.data();
                if(liveData.bio) document.getElementById('dp-bio').innerText = liveData.bio;
                const infoCard = document.getElementById('patient-view-doc-info');
                if(infoCard) infoCard.style.display = 'block';

                if(document.getElementById('v-doc-phone')) {
                    document.getElementById('v-doc-phone').innerText = liveData.phone || (dict.not_available || "غير متوفر");
                }
                if(document.getElementById('v-doc-hours')) {
                    document.getElementById('v-doc-hours').innerText = liveData.workingHours || (dict.unspecified || "غير محدد");
                }
                if(document.getElementById('v-doc-location')) {
                    document.getElementById('v-doc-location').innerText = liveData.locationLink || liveData.location || (dict.no_address_written || "لم يتم كتابة العنوان");
                }

                const mapBtn = document.getElementById('v-doc-map-btn');
                if (mapBtn) {
                    if (liveData.latitude && liveData.longitude) {
                        mapBtn.style.display = "flex"; 
                        mapBtn.onclick = () => {
                            document.getElementById('doctor-profile-modal').style.display = 'none';
                            window.radarEngine.flyToProvider(liveData.latitude, liveData.longitude);
                        };
                    } else {
                        mapBtn.style.display = "none";
                    }
                }
            }
        } catch (error) {
            console.error("خطأ في جلب تفاصيل العيادة:", error);
        }

        const postsDiv = document.getElementById('dp-posts-list');
        postsDiv.innerHTML = `<p style="text-align:center; color:#888;">${dict.fetching_posts || 'جاري جلب المنشورات'} <ion-icon name="sync" style="animation: spin 1s linear infinite;"></ion-icon></p>`;

        try {
            const postsSnap = await firebase.firestore().collection('posts')
                                .where('authorId', '==', docId)
                                .orderBy('timestamp', 'desc')
                                .limit(5)
                                .get();

            if (postsSnap.empty) {
                postsDiv.innerHTML = `<p style="text-align: center; color: #666; font-size: 13px;">${dict.no_posts_doc || 'هذا الطبيب لم يقم بنشر أي شيء في المجتمع بعد.'}</p>`;
            } else {
                postsDiv.innerHTML = '';
                postsSnap.forEach(postDoc => {
                    const post = postDoc.data();
                    const date = post.timestamp ? post.timestamp.toDate().toLocaleDateString('ar-EG') : (dict.recently || 'حديثاً');
                    const imgUrl = post.imageURL || post.imageUrl || post.postImg || post.image;
                    let imageHtml = imgUrl ? `<div style="margin-top:10px; border-radius:10px; overflow:hidden; border:1px solid rgba(255,255,255,0.1);"><img src="${imgUrl}" style="width:100%; max-height:200px; object-fit:cover; display:block;"></div>` : '';

                    postsDiv.innerHTML += `
                        <div class="dp-post" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); padding:15px; border-radius:12px; margin-bottom:12px; text-align:right;">
                            <p style="color:white; margin:0; font-size:14px; line-height:1.6;">${post.content || ''}</p>
                            ${imageHtml}
                            <div style="margin-top:10px; color:#888; font-size:11px; display:flex; align-items:center; gap:5px;">
                                <ion-icon name="time-outline"></ion-icon> <span>${date}</span>
                            </div>
                        </div>`;
                });
            }
        } catch(err) {
            console.error(err);
            postsDiv.innerHTML = `<p style="text-align:center; color:var(--orange); font-size:12px;">${dict.error_fetch_posts || 'خطأ في جلب المنشورات.'}</p>`;
        }
    },


    // 7. تفعيل زر المراسلة (النسخة المتصلة بالمحرك الجديد) 🚀
    startChat: function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        if (!this.currentDoctorSelected) return;

        const user = firebase.auth().currentUser;
        if (!user) {
            window.showToast(dict.login_req_msg || "عذراً، يجب تسجيل الدخول أولاً 🔒");
            return;
        }

        const doctorUid = this.currentDoctorSelected.id;
        const doctorName = this.currentDoctorSelected.name;
        const doctorImg = this.currentDoctorSelected.photoURL;

        // إغلاق نافذة البروفايل الحالية
        document.getElementById('doctor-profile-modal').style.display = 'none';

        // 🚨 إطلاق محرك الشات الخاص بالمريض 🚨
        window.PatientChatSystem.openRoom(doctorUid, doctorName, doctorImg);
    },

    // 8. فتح نافذة الحجز
    openBookingModal: function() {
        if(!this.currentDoctorSelected) return;
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('book-date').setAttribute('min', today);
        document.getElementById('book-doc-name').innerText = this.currentDoctorSelected.name;
        document.getElementById('booking-modal').style.display = 'flex';
    },

    // 9. إرسال الطلب إلى فايربيس
    submitBooking: async function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const date = document.getElementById('book-date').value;
        const time = document.getElementById('book-time').value;
        const notes = document.getElementById('book-notes').value.trim();
        const patient = firebase.auth().currentUser;

        if(!patient || !date || !time) {
            window.showToast(dict.warn_select_date_time || "⚠️ يرجى تحديد التاريخ والوقت!");
            return;
        }

        const btn = document.getElementById('submit-booking-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<ion-icon name="sync" style="animation: spin 1s linear infinite;"></ion-icon> ${dict.sending_request || 'جاري الإرسال...'}`;
        btn.disabled = true;

        try {
            const patientDoc = await firebase.firestore().collection('users').doc(patient.uid).get();
            const patientName = patientDoc.exists ? patientDoc.data().name : (dict.unknown_patient || "مريض مجهول");

            await firebase.firestore().collection('appointments').add({
                doctorId: this.currentDoctorSelected.id,
                doctorName: this.currentDoctorSelected.name,
                patientId: patient.uid,
                patientName: patientName,
                date: date,
                time: time,
                notes: notes,
                status: 'pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            document.getElementById('booking-modal').style.display = 'none';
            window.royalAlert(dict.req_sent_title || "تم إرسال الطلب! 🚀", dict.req_sent_msg || "تم إرسال طلب الموعد بنجاح.", "checkmark-circle", "var(--green)");
            
        } catch (error) {
            console.error("خطأ في الحجز:", error);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
};

// ============================================================================
// 📱 محرك تواصل المريض الأسطوري (Patient Chat System PRO)
// ============================================================================

window.PatientChatSystem = {
    activeChatId: null,
    listener: null,
    accessListener: null,

    // 1. فتح الغرفة (تُستدعى من زر "مراسلة" في بروفايل الطبيب)
    openRoom: async function(doctorUid, doctorName, doctorImg) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const myUid = firebase.auth().currentUser.uid;
        this.activeChatId = myUid < doctorUid ? `${myUid}_${doctorUid}` : `${doctorUid}_${myUid}`;

        // تجهيز الواجهة
        document.getElementById('p-chat-name').innerText = doctorName;
        document.getElementById('p-chat-avatar').src = doctorImg || '../assets/img/profile.png';
        
        // فتح الصفحة برمجياً
        window.openSPA('patient-chat-room');

        // تجهيز الوثيقة في الفايربيس إذا لم تكن موجودة
        const chatRef = firebase.firestore().collection("chats").doc(this.activeChatId);
        const doc = await chatRef.get();
        if (!doc.exists) {
            await chatRef.set({
                participants: [myUid, doctorUid],
                medicalAccess: false,
                lastMessage: dict.start_new_chat || "بدء محادثة جديدة...",
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // تشغيل المراقبين
        this.listenToMessages(myUid);
        this.watchPrivacyToggle();
    },

    // 2. إغلاق الغرفة (الزر الذي كان لا يعمل)
    closeChat: function() {
        if(this.listener) this.listener(); // إيقاف مراقب الرسائل
        if(this.accessListener) this.accessListener(); // إيقاف مراقب الأمان
        this.activeChatId = null;
        window.closeSPA('patient-chat-room');
    },

    // 3. إرسال رسالة نصية (الزر الذي كان لا يعمل)
    sendMessage: async function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        if(!this.activeChatId) return;
        const input = document.getElementById('p-chat-input');
        const text = input.value.trim();
        if(text === "") return;

        input.value = ""; // تفريغ الحقل فوراً

        const msgData = {
            senderId: firebase.auth().currentUser.uid,
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            // إرسال الرسالة للمجموعة الفرعية
            await firebase.firestore().collection("chats").doc(this.activeChatId).collection("messages").add(msgData);
            // تحديث آخر رسالة في الواجهة الخارجية (الإنبوكس)
            await firebase.firestore().collection("chats").doc(this.activeChatId).update({
                lastMessage: text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error("خطأ في الإرسال:", error);
            window.showToast(dict.send_failed || "لم يتم الإرسال ❌");
        }
    },

    // 6. رفع المرفقات (الصور والملفات) 📁 - بنظام Base64 المدمج
    uploadMedia: async function(event) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        if(!this.activeChatId) return;
        
        const file = event.target.files[0];
        if (!file) return;

        window.showToast(dict.encrypting_uploading || "جاري تشفير ورفع الصورة... 🚀");
        
        // 1. تحويل الصورة إلى نص مشفر (Base64) لرفعها مباشرة
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = async (e) => {
            const base64Img = e.target.result;
            
            try {
                // 2. تجهيز الطرد السري
                const msgData = {
                    senderId: firebase.auth().currentUser.uid,
                    text: "", // لا يوجد نص، فقط صورة
                    mediaUrl: base64Img, // الصورة المشفرة
                    mediaType: file.type.startsWith('image') ? 'image' : 'document',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };

                // 3. الإرسال إلى الفايربيس (قاعدة بيانات الشات)
                await firebase.firestore().collection("chats").doc(this.activeChatId).collection("messages").add(msgData);
                
                // 4. تحديث آخر رسالة ليراها الطبيب من الخارج
                await firebase.firestore().collection("chats").doc(this.activeChatId).update({
                    lastMessage: dict.img_attachment || "صورة / مرفق 📁",
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                window.showToast(dict.img_sent_success || "تم إرسال الصورة بنجاح! ✅");

            } catch (error) {
                console.error("خطأ في الرفع:", error);
                window.showToast(dict.upload_failed_size || "فشل الرفع، ربما الصورة كبيرة جداً ❌");
            }
            
            // 5. تصفير الحقل استعداداً لرفع صورة أخرى
            event.target.value = ''; 
        };

        // في حال فشلت قراءة الملف
        reader.onerror = () => {
            window.showToast(dict.file_read_err || "حدث خطأ أثناء قراءة الملف ⚠️");
            event.target.value = '';
        };
    },
  // 4. استماع ورسم الرسائل (مع دعم الصور والملفات وفتحها داخل التطبيق 🔍)
    listenToMessages: function(myUid) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const area = document.getElementById('p-chat-messages');
        area.innerHTML = `<p style="text-align:center; color:#888;">${dict.loading_chat || 'جاري تحميل المحادثة...'}</p>`;

        this.listener = firebase.firestore().collection("chats").doc(this.activeChatId).collection("messages")
            .orderBy("timestamp", "asc")
            .onSnapshot(snap => {
                area.innerHTML = "";
                snap.forEach(doc => {
                    const msg = doc.data();
                    const isMe = msg.senderId === myUid;
                    const time = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : (dict.time_now || 'الآن');

                    // 🚨 التعديل السحري هنا: ربط الصورة بالعارض الخاص بتطبيقك 🚨
                    let mediaHtml = '';
                    if(msg.mediaUrl) {
                        // استخدام window.openMediaViewer بدلاً من window.open لفتحها داخل التطبيق!
                        mediaHtml = `<img src="${msg.mediaUrl}" style="max-width:100%; border-radius:10px; margin-bottom:5px; cursor:pointer; border: 1px solid rgba(255,255,255,0.1);" onclick="window.openMediaViewer('${msg.mediaUrl}')" title="${dict.click_to_view || 'اضغط للتكبير والمشاهدة'}">`;
                    }

                    area.innerHTML += `
                        <div style="align-self: ${isMe ? 'flex-end' : 'flex-start'}; max-width: 75%; background: ${isMe ? 'var(--blue)' : '#222'}; color: ${isMe ? '#000' : '#fff'}; padding: 10px 15px; border-radius: ${isMe ? '15px 15px 0 15px' : '15px 15px 15px 0'}; position: relative;">
                            ${mediaHtml}
                            <div style="font-size: 14px; line-height: 1.5; word-wrap: break-word;">${msg.text || ''}</div>
                            <div style="font-size: 10px; text-align: ${isMe ? 'left' : 'right'}; opacity: 0.7; margin-top: 5px;">${time}</div>
                        </div>
                    `;
                });
                // التمرير للأسفل تلقائياً لرؤية الرسالة الجديدة
                setTimeout(() => { area.scrollTop = area.scrollHeight; }, 100);
            });
    },

    // 5. زر الأمان: مراقبة وتغيير حالة الملف الطبي
    watchPrivacyToggle: function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const btn = document.getElementById('p-chat-access-btn');
        const icon = document.getElementById('p-access-icon');
        const text = document.getElementById('p-access-text');

        this.accessListener = firebase.firestore().collection("chats").doc(this.activeChatId).onSnapshot(doc => {
            if(!doc.exists) return;
            const hasAccess = doc.data().medicalAccess === true;
            
            if(hasAccess) {
                btn.style.background = "var(--red)";
                icon.name = "lock-open";
                text.innerText = dict.unshare_file || "إلغاء مشاركة الملف";
            } else {
                btn.style.background = "var(--purple)";
                icon.name = "lock-closed";
                text.innerText = dict.share_file || "مشاركة ملفي";
            }
        });
    },

    toggleMedicalAccess: async function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        if(!this.activeChatId) return;
        const chatRef = firebase.firestore().collection("chats").doc(this.activeChatId);
        const doc = await chatRef.get();
        const current = doc.data().medicalAccess === true;
        
        await chatRef.update({ medicalAccess: !current });
        window.showToast(!current ? (dict.access_granted || "تم منح الطبيب صلاحية الدخول لملفك ✅") : (dict.access_revoked || "تم سحب الصلاحية 🔒"));
    }
};