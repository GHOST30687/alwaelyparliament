(async () => {
  const API = {
    // أعضاء
    list: async (authCode, authToken) => (await fetch(`/api/members?authCode=${encodeURIComponent(authCode)}&authToken=${encodeURIComponent(authToken)}`)).json(),
    add: async (payload) => (await fetch('/api/members', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })).json(),
    remove: async (memberCode, authCode, authToken) => (await fetch(`/api/members/${encodeURIComponent(memberCode)}?authCode=${encodeURIComponent(authCode)}&authToken=${encodeURIComponent(authToken)}`, { method: 'DELETE' })).json(),
    // مصادقة
    login: async (code, token) => (await fetch('/api/auth/login', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ code, token }) })).json(),
    checkPublisher: async (code) => (await fetch('/api/auth/check', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ code }) })).json(),
    // تبليغات
    annList: async () => (await fetch('/api/announcements')).json(),
    annPost: async (payload) => (await fetch('/api/announcements', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })).json(),
    annDelete: async (id, code, token) => (await fetch(`/api/announcements/${encodeURIComponent(id)}?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`, { method: 'DELETE' })).json(),
    // رسائل الطلاب
    messagePost: async (payload) => (await fetch('/api/messages', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })).json(),
    messagesList: async (code, token) => (await fetch(`/api/messages?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`)).json(),
    // معرض الصور
    galleryList: async () => (await fetch('/api/gallery')).json(),
    galleryPost: async (payload) => (await fetch('/api/gallery', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })).json(),
    galleryDelete: async (id, code, token) => (await fetch(`/api/gallery/${encodeURIComponent(id)}?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`, { method: 'DELETE' })).json()
  };

  // معلومات محفوظة للاستخدام المستقبلي (غير مستخدمة الآن)
  const RESERVED = Object.freeze({
    grades: [ 'اول متوسط', 'ثاني متوسط', 'ثالث متوسط', 'رابع اعدادي', 'خامس اعدادي', 'سادس اعدادي' ],
    sectionsCount: 4
  });

  const els = {
    backBtn: document.getElementById('backBtn'),
    // صفحة البداية
    landingView: document.getElementById('landingView'),
    mpBtn: document.getElementById('mpBtn'),
    studentBtn: document.getElementById('studentBtn'),
    adminBtn: document.getElementById('adminBtn'),
    // دخول
    loginView: document.getElementById('loginView'),
    loginForm: document.getElementById('loginForm'),
    loginCode: document.getElementById('loginCode'),
    // تبليغات
    annFormCard: document.getElementById('annFormCard'),
    annForm: document.getElementById('annForm'),
    annTitle: document.getElementById('annTitle'),
    annContent: document.getElementById('annContent'),
    annImageUrl: document.getElementById('annImageUrl'),
    annList: document.getElementById('annList'),
    announcementsCard: document.getElementById('announcementsCard'),
    noAnnouncementsMessage: document.getElementById('noAnnouncementsMessage'),
    // إحصائيات
    statsSection: document.getElementById('statsSection'),
    statsAnnouncements: document.getElementById('statsAnnouncements'),
    statsImages: document.getElementById('statsImages'),
    statsVisitors: document.getElementById('statsVisitors'),
    // قائمة التنقل
    menuToggle: document.getElementById('menuToggle'),
    sideNav: document.getElementById('sideNav'),
    sideNavOverlay: document.getElementById('sideNavOverlay'),
    // معرض الصور
    galleryUploadForm: document.getElementById('galleryUploadForm'),
    galleryImageUrl: document.getElementById('galleryImageUrl'),
    sliderTrack: document.getElementById('sliderTrack'),
    sliderPrev: document.getElementById('sliderPrev'),
    sliderNext: document.getElementById('sliderNext'),
    sliderDots: document.getElementById('sliderDots'),
    // القسم الرئيسي
    mainContentSection: document.getElementById('mainContentSection'),
    siteFooter: document.getElementById('siteFooter')
  };

  const state = {
    loggedIn: false,
    isPublisher: false,
    isAdmin: false,
    code: null,
    token: null,
    memberName: null,
    userType: null, // 'member', 'admin', 'student'
    currentSlide: 0,
    galleryImages: [],
    autoSlideInterval: null
  };

  // إلغاء الوضع الداكن وجعل الخلفية بيضاء دائماً
  try{
    document.documentElement.dataset.theme = '';
    localStorage.removeItem('theme');
  }catch{}


  function formatHijriDate(date){
    try{
      const d = new Date(date);
      return d.toLocaleDateString('ar-SA-u-ca-islamic', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return 'غير متوفر';
    }
  }

  function formatTime(date){
    try{
      const d = new Date(date);
      return d.toLocaleTimeString('ar-IQ', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  }

  // فصل التبليغات الجديدة والقديمة (أكثر من 24 ساعة)
  function separateAnnouncements(list){
    if(!list || !list.length) return { recent: [], archived: [] };
    
    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000; // 24 ساعة
    
    const recent = [];
    const archived = [];
    
    list.forEach(ann => {
      const createdTime = new Date(ann.createdAt).getTime();
      const age = now - createdTime;
      
      if(age > oneDayMs){
        archived.push(ann);
      } else {
        recent.push(ann);
      }
    });
    
    return { recent, archived };
  }

  function renderAnnouncements(list){
    els.annList.innerHTML = '';
    const archivedAnnList = document.getElementById('archivedAnnList');
    const noAnnInList = document.getElementById('noAnnouncementsInList');
    const noArchivedAnn = document.getElementById('noArchivedAnnouncements');
    
    // فصل التبليغات
    const { recent, archived } = separateAnnouncements(list);
    
    // عرض التبليغات الجديدة
    if(!recent || !recent.length){
      noAnnInList && noAnnInList.classList.remove('hidden');
    } else {
      noAnnInList && noAnnInList.classList.add('hidden');
      renderAnnouncementList(recent, els.annList);
    }
    
    // عرض التبليغات القديمة
    if(archivedAnnList){
      archivedAnnList.innerHTML = '';
      if(!archived || !archived.length){
        noArchivedAnn && noArchivedAnn.classList.remove('hidden');
      } else {
        noArchivedAnn && noArchivedAnn.classList.add('hidden');
        renderAnnouncementList(archived, archivedAnnList);
      }
    }
  }
  
  function renderAnnouncementList(list, container){
    if(!list || !container) return;
    list.forEach((a, idx) => {
      const card = document.createElement('div');
      card.className = 'announcement-card';
      const hijriDate = formatHijriDate(a.createdAt);
      card.innerHTML = `
        <div class="announcement-info">
          <h3 class="announcement-title">${escapeHtml(a.title)}</h3>
          <div class="announcement-date">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z"/>
            </svg>
            <span>${hijriDate}</span>
          </div>
        </div>
        <div class="announcement-actions">
          <button class="expand-ann-btn" data-ann-idx="${idx}">
            <span>عرض التبليغ</span>
            <span>→</span>
          </button>
          ${state.isAdmin ? `<button class="delete-ann-btn" data-ann-id="${escapeHtml(a.id)}" title="حذف التبليغ">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>` : ''}
        </div>
      `;
      container.appendChild(card);
    });
    // Add expand functionality
    const expandButtons = container.querySelectorAll('.expand-ann-btn');
    expandButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-ann-idx'));
        if(list[idx]) showAnnouncementModal(list[idx]);
      });
    });
    // Add delete functionality for admins
    if(state.isAdmin){
      const deleteButtons = container.querySelectorAll('.delete-ann-btn');
      deleteButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-ann-id');
          const confirmed = await confirmDialog('هل أنت متأكد من حذف هذا التبليغ؟', { okText: 'حذف', cancelText: 'إلغاء' });
          if(!confirmed) return;
          try{
            const { ok, error } = await API.annDelete(id, state.code, state.token);
            if(!ok) throw new Error(error || 'فشل الحذف');
            showSuccess('تم حذف التبليغ بنجاح');
            await refreshAnnouncements();
          }catch(err){
            showError('تعذر حذف التبليغ: ' + (err.message || err));
          }
        });
      });
    }
  }

  function showAnnouncementModal(announcement){
    const hijriDate = formatHijriDate(announcement.createdAt);
    const time = formatTime(announcement.createdAt);
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal announcement-modal" role="dialog" aria-modal="true">
        <div class="announcement-modal-header">
          <button class="modal-close-btn" aria-label="إغلاق">X</button>
        </div>
        ${announcement.imageUrl ? `<img src="${escapeHtml(announcement.imageUrl)}" alt="صورة التبليغ" class="announcement-modal-image" loading="lazy" />` : ''}
        <div class="announcement-modal-body">
          <h2 class="announcement-modal-title">${escapeHtml(announcement.title)}</h2>
          <div class="announcement-modal-content">${escapeHtml(announcement.content)}</div>
          <div class="announcement-modal-footer">
            <div class="announcement-modal-date">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z"/>
              </svg>
              <span>${hijriDate}</span>
            </div>
            <div class="announcement-modal-time">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
              </svg>
              <span>${time}</span>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    const cleanup = () => backdrop.remove();
    backdrop.addEventListener('click', (e) => { if(e.target === backdrop) cleanup(); });
    backdrop.querySelector('.modal-close-btn').addEventListener('click', cleanup);
  }

  function formatDate(iso){
    if(!iso) return '-';
    try{ const d = new Date(iso); return d.toLocaleString('ar-IQ'); } catch { return iso; }
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>\"']/g, function(ch){
      switch(ch){
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return ch;
      }
    });
  }

  // ===== نظام الرسائل (Toast) وحوار التأكيد =====
  const toastRoot = document.getElementById('toastRoot');

  function showToast(message, type = 'error', opts = {}){
    const { duration = 3000 } = opts;
    const root = toastRoot || document.body;
    const el = document.createElement('div');
    el.className = 'toast ' + (type === 'success' ? 'toast--success' : 'toast--error');
    el.setAttribute('role', 'status');
    el.innerHTML = `
      <span class="toast__icon"></span>
      <div class="toast__msg">${escapeHtml(message)}</div>
      <button class="toast__close" aria-label="إغلاق">&times;</button>`;
    root.appendChild(el);
    const remove = () => {
      el.style.animation = 'toast-out .2s ease forwards';
      el.addEventListener('animationend', () => el.remove(), { once: true });
    };
    const t = setTimeout(remove, duration);
    const closeBtn = el.querySelector('.toast__close');
    if(closeBtn){
      closeBtn.addEventListener('click', () => { clearTimeout(t); remove(); });
    }
    return el;
  }
  function showSuccess(msg, opts){ return showToast(msg, 'success', opts); }
  function showError(msg, opts){ return showToast(msg, 'error', opts); }

  async function confirmDialog(message, { okText = 'تأكيد', cancelText = 'إلغاء' } = {}){
    return new Promise(resolve => {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal__message">${escapeHtml(message)}</div>
          <div class="modal__actions">
            <button class="btn" data-cancel>${cancelText}</button>
            <button class="btn primary" data-ok>${okText}</button>
          </div>
        </div>`;
      document.body.appendChild(backdrop);
      const cleanup = () => backdrop.remove();
      backdrop.addEventListener('click', (e)=>{ if(e.target === backdrop){ cleanup(); resolve(false); } });
      backdrop.querySelector('[data-cancel]').addEventListener('click', ()=>{ cleanup(); resolve(false); });
      backdrop.querySelector('[data-ok]').addEventListener('click', ()=>{ cleanup(); resolve(true); });
    });
  }

  function updateStats(){
    if(!els.statsAnnouncements || !els.statsImages) return;
    // Update announcement count
    const annCount = state.galleryImages ? state.galleryImages.length : 0;
    // This is a simple demo - in real app would fetch from API
    els.statsImages.textContent = annCount;
    // We'll update announcements count when they're loaded
  }

  async function refreshAnnouncements(){
    try{
      const { ok, data, error } = await API.annList();
      if(!ok) throw new Error(error || 'فشل جلب التبليغات');
      renderAnnouncements(data);
      // Update stats
      if(els.statsAnnouncements && data){
        els.statsAnnouncements.textContent = data.length;
      }
    }catch(err){
      showError('تعذر تحميل التبليغات: ' + (err.message || err));
      // إظهار رسالة عدم وجود تبليغات حتى عند حدوث خطأ
      renderAnnouncements([]);
    }
  }

  async function refreshMessages(){
    if(!state.isAdmin) return; // فقط للمسؤولين
    try{
      const { ok, data, error } = await API.messagesList(state.code, state.token);
      if(!ok) throw new Error(error || 'فشل جلب الرسائل');
      renderMessages(data);
    }catch(err){
      showError('تعذر تحميل رسائل الطلاب: ' + (err.message || err));
      renderMessages([]);
    }
  }

  function renderMessages(list){
    const messagesList = document.getElementById('studentMessagesList');
    const noMessages = document.getElementById('noStudentMessages');
    if(!messagesList) return;
    
    messagesList.innerHTML = '';
    
    if(!list || !list.length){
      noMessages && noMessages.classList.remove('hidden');
      return;
    }
    
    noMessages && noMessages.classList.add('hidden');
    
    list.forEach((msg, idx) => {
      const card = document.createElement('div');
      card.className = 'announcement-card';
      const hijriDate = formatHijriDate(msg.createdAt);
      card.innerHTML = `
        <div class="announcement-info">
          <h3 class="announcement-title">👤 ${escapeHtml(msg.name)}</h3>
          <div class="announcement-date">
            <span>🏫 ${escapeHtml(msg.grade)} - شعبة ${escapeHtml(msg.section)}</span>
          </div>
          <div class="announcement-date">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z"/>
            </svg>
            <span>${hijriDate}</span>
          </div>
        </div>
        <div class="announcement-actions">
          <button class="expand-msg-btn" data-msg-idx="${idx}">
            <span>عرض الرسالة</span>
            <span>→</span>
          </button>
        </div>
      `;
      messagesList.appendChild(card);
    });
    
    // إضافة وظيفة التكبير
    const expandButtons = messagesList.querySelectorAll('.expand-msg-btn');
    expandButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-msg-idx'));
        if(list[idx]) showMessageModal(list[idx]);
      });
    });
  }

  function showMessageModal(message){
    const hijriDate = formatHijriDate(message.createdAt);
    const time = formatTime(message.createdAt);
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal announcement-modal" role="dialog" aria-modal="true">
        <div class="announcement-modal-header">
          <button class="modal-close-btn" aria-label="إغلاق">X</button>
        </div>
        <div class="announcement-modal-body">
          <h2 class="announcement-modal-title">📨 رسالة من ${escapeHtml(message.name)}</h2>
          <div style="color: var(--muted); margin-bottom: 16px;">
            <strong>🏫 الصف:</strong> ${escapeHtml(message.grade)} - شعبة ${escapeHtml(message.section)}
          </div>
          <div class="announcement-modal-content">${escapeHtml(message.message)}</div>
          <div class="announcement-modal-footer">
            <div class="announcement-modal-date">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z"/>
              </svg>
              <span>${hijriDate}</span>
            </div>
            <div class="announcement-modal-time">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
              </svg>
              <span>${time}</span>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    const cleanup = () => backdrop.remove();
    backdrop.addEventListener('click', (e) => { if(e.target === backdrop) cleanup(); });
    backdrop.querySelector('.modal-close-btn').addEventListener('click', cleanup);
  }

  async function refreshAll(){
    await Promise.all([
      refreshAnnouncements(),
      state.isAdmin ? refreshMessages() : Promise.resolve()
    ]);
    updateStats();
  }



  // تبديل أزرار التبليغات
  const annOptionTabs = document.querySelectorAll('.option-tab-ann');
  annOptionTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const option = tab.getAttribute('data-option');
      annOptionTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.upload-option-content-ann').forEach(c => c.classList.add('hidden'));
      if(option === 'file'){
        document.getElementById('annUploadOptionFile')?.classList.remove('hidden');
      } else if(option === 'url'){
        document.getElementById('annUploadOptionUrl')?.classList.remove('hidden');
      }
    });
  });

  // نشر تبليغ
  els.annForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!state.isAdmin){ showError('فقط المسؤولون يمكنهم نشر التبليغات'); return; }
    
    const title = (els.annTitle.value || '').trim();
    const content = (els.annContent.value || '').trim();
    if(!title || !content){ showError('يرجى إدخال العنوان والمحتوى'); return; }
    
    const submitBtn = els.annForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري النشر...';
    
    try{
      // تحديد أي خيار نشط
      const activeAnnTab = document.querySelector('.option-tab-ann.active');
      const annOption = activeAnnTab?.getAttribute('data-option');
      
      const payload = { code: state.code, token: state.token, title, content };
      
      if(annOption === 'file'){
        // رفع ملف محلي
        const fileInput = document.getElementById('annImageFile');
        const file = fileInput?.files[0];
        if(file){
          // فحص حجم الملف (5MB كحد أقصى)
          if(file.size > 5 * 1024 * 1024){
            showError('حجم الصورة يجب ألا يتجاوز 5MB');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
          }
          // تحويل الصورة إلى Data URL
          const reader = new FileReader();
          await new Promise((resolve, reject) => {
            reader.onload = (ev) => {
              payload.imageData = ev.target.result;
              resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }
      } else if(annOption === 'url'){
        // إضافة رابط
        const url = (els.annImageUrl.value || '').trim();
        if(url) payload.imageUrl = url;
      }
      
      const { ok, data, error } = await API.annPost(payload);
      if(!ok) throw new Error(error || 'فشل النشر');
      
      // إعادة تعيين النموذج
      els.annTitle.value = '';
      els.annContent.value = '';
      els.annImageUrl.value = '';
      const annImageFile = document.getElementById('annImageFile');
      if(annImageFile) annImageFile.value = '';
      
      // إعادة تعيين التبويب للخيار الافتراضي
      annOptionTabs.forEach(t => t.classList.remove('active'));
      document.querySelector('.option-tab-ann[data-option="none"]')?.classList.add('active');
      document.querySelectorAll('.upload-option-content-ann').forEach(c => c.classList.add('hidden'));
      
      await refreshAnnouncements();
      showSuccess('تم نشر التبليغ 🎉');
    }catch(err){
      showError('تعذر النشر: ' + (err.message || err));
    }finally{
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // إرسال رسالة طالب
  const contactForm = document.getElementById('contactForm');
  if(contactForm){
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (document.getElementById('studentName').value || '').trim();
      const grade = (document.getElementById('studentGrade').value || '').trim();
      const section = (document.getElementById('studentSection').value || '').trim();
      const message = (document.getElementById('studentMessage').value || '').trim();
      
      if(!grade || !section || !message){
        showError('يرجى إدخال جميع الحقول المطلوبة');
        return;
      }
      
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري الإرسال...';
      
      try{
        const payload = { name: name || 'غير معرف', grade, section, message };
        const { ok, error } = await API.messagePost(payload);
        if(!ok) throw new Error(error || 'فشل الإرسال');
        
        // إعادة تعيين النموذج
        contactForm.reset();
        showSuccess('تم إرسال رسالتك بنجاح 🚀');
      }catch(err){
        showError('تعذر إرسال الرسالة: ' + (err.message || err));
      }finally{
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // تسجيل الدخول
  els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = (els.loginCode.value || '').trim();
    if(!code){ 
      const userTypeText = state.userType === 'admin' ? 'المسؤول' : 'البرلماني';
      showError(`يرجى إدخال كود ${userTypeText}`);
      return; 
    }
    
    // مؤشر تحميل
    const submitBtn = els.loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري تسجيل الدخول...';
    
    const resetButton = () => {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    };
    try{
      const loginRes = await API.login(code);
      if(!loginRes.ok){
        resetButton();
        if(loginRes.error && loginRes.error.includes('مرتبط مسبقاً')){
          showError('هذا الكود مرتبط بجهاز آخر. اطلب من المطور إعادة تعيين الكود.');
        } else if(loginRes.error && loginRes.error.includes('غير معروف')){
          const userTypeText = state.userType === 'admin' ? 'مسؤول' : 'برلماني';
          showError(`هذا الكود غير موجود في قائمة ال${userTypeText}ين. تأكد من الكود أو اراسل المطور.`);
        } else {
          showError('حدث خطأ. الرجاء المحاولة مرة أخرى أو مراسلة المطور.');
        }
        return;
      }
      // التحقق من نوع المستخدم المناسب
      if(state.userType === 'admin' && !loginRes.isAdmin && !loginRes.isPublisher){
        resetButton();
        showError('هذا الكود ليس لمسؤول. اراسل المطور للحصول على صلاحيات مسؤول.');
        return;
      }
      if(state.userType === 'member' && !loginRes.isMember){
        resetButton();
        showError('هذا الكود ليس لبرلماني. تأكد من الكود أو اراسل المطور.');
        return;
      }
      const pubRes = await API.checkPublisher(code);
      state.loggedIn = true;
      state.isPublisher = !!(pubRes && pubRes.ok && pubRes.isPublisher);
      state.isAdmin = !!(pubRes && pubRes.ok && pubRes.isAdmin);
      state.code = code;
      state.token = loginRes.token;
      state.memberName = loginRes.member?.name || null;
      try{ localStorage.setItem('auth', JSON.stringify({ code: state.code, token: state.token })); }catch{}
      try{ localStorage.setItem('userType', 'member'); }catch{}
      // إظهار الأقسام
      els.landingView.classList.add('hidden');
      els.loginView.classList.add('hidden');
      els.mainContentSection && els.mainContentSection.classList.remove('hidden');
      els.menuToggle && els.menuToggle.classList.remove('hidden');
      
      // إخفاء أقسام النشر والرسائل افتراضياً عن الجميع
      document.getElementById('section-publish')?.classList.add('hidden');
      document.getElementById('section-messages')?.classList.add('hidden');
      
      // فقط المسؤولون يمكنهم رؤية الإحصائيات ونشر التبليغات
      if(state.isAdmin){
        els.statsSection && els.statsSection.classList.remove('hidden');
        // إظهار قسم المسؤولين وإخفاء قسم الطلاب
        document.querySelectorAll('.nav-link-admin').forEach(l => l.classList.remove('hidden'));
        document.querySelectorAll('.nav-link-student').forEach(l => l.classList.add('hidden'));
        // إظهار أقسام النشر والرسائل للمسؤولين فقط
        document.getElementById('section-publish')?.classList.remove('hidden');
        document.getElementById('section-messages')?.classList.remove('hidden');
      } else {
        // البرلمانيون والطلاب ليس لديهم صلاحيات النشر
        els.statsSection && els.statsSection.classList.add('hidden');
        document.querySelectorAll('.nav-link-admin').forEach(l => l.classList.add('hidden'));
        document.querySelectorAll('.nav-link-student').forEach(l => l.classList.remove('hidden'));
        // التأكد من إخفاء أقسام النشر والرسائل
        document.getElementById('section-publish')?.classList.add('hidden');
        document.getElementById('section-messages')?.classList.add('hidden');
      }
      // إزالة تمركز الدخول بعد تسجيل الدخول
      document.getElementById('main').classList.remove('main-login');
      await refreshAll();
      initGallery();
    }catch(err){ 
      resetButton();
      console.error('Login error:', err);
      if(err.message && err.message.includes('قاعدة البيانات')){
        showError('لا يمكن الاتصال بقاعدة البيانات. يرجى مراسلة المطور.');
      } else {
        showError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      }
    }
  });

  // صفحة البداية: أنا برلماني -> إظهار نموذج الدخول
  if(els.mpBtn){
    els.mpBtn.addEventListener('click', () => {
      state.userType = 'member';
      document.getElementById('loginTitle').textContent = 'تسجيل الدخول للبرلماني';
      document.getElementById('loginHint').textContent = 'أدخل كود البرلماني الخاص بك';
      document.getElementById('loginLabel').textContent = 'كود البرلماني';
      document.getElementById('loginCode').placeholder = 'اكتب الكود المعطى لك من الإدارة';
      els.landingView && els.landingView.classList.add('hidden');
      els.loginView && els.loginView.classList.remove('hidden');
      const main = document.getElementById('main');
      if(main){ main.classList.remove('main-landing'); main.classList.add('main-login'); }
      setTimeout(() => els.loginCode && els.loginCode.focus(), 0);
    });
  }

  // صفحة البداية: أنا طالب -> دخول كزائر
  if(els.studentBtn){ els.studentBtn.addEventListener('click', async () => {
    state.loggedIn = false; state.isPublisher = false; state.isAdmin = false; state.code = null; state.memberName = null; state.token = null;
    state.userType = 'student';
    els.landingView.classList.add('hidden');
    els.loginView.classList.add('hidden');
    els.mainContentSection && els.mainContentSection.classList.remove('hidden');
    els.statsSection && els.statsSection.classList.add('hidden');
    // إظهار روابط الطلاب وإخفاء روابط المسؤولين
    document.querySelectorAll('.nav-link-student').forEach(l => l.classList.remove('hidden'));
    document.querySelectorAll('.nav-link-admin').forEach(l => l.classList.add('hidden'));
    // إخفاء أقسام النشر والرسائل عن الطلاب
    document.getElementById('section-publish')?.classList.add('hidden');
    document.getElementById('section-messages')?.classList.add('hidden');
    const main = document.getElementById('main');
    if(main){ main.classList.remove('main-login'); main.classList.remove('main-landing'); }
    els.menuToggle && els.menuToggle.classList.remove('hidden');
    try{ localStorage.setItem('userType', 'student'); }catch{}
    await refreshAll();
    initGallery();
  }); }

  // صفحة البداية: أنا مسؤول -> إظهار نموذج الدخول
  if(els.adminBtn){
    els.adminBtn.addEventListener('click', () => {
      state.userType = 'admin';
      document.getElementById('loginTitle').textContent = 'تسجيل الدخول للمسؤول';
      document.getElementById('loginHint').textContent = 'أدخل كود المسؤول الخاص بك';
      document.getElementById('loginLabel').textContent = 'كود المسؤول';
      document.getElementById('loginCode').placeholder = 'اكتب الكود المعطى لك من الإدارة';
      els.landingView && els.landingView.classList.add('hidden');
      els.loginView && els.loginView.classList.remove('hidden');
      const main = document.getElementById('main');
      if(main){ main.classList.remove('main-landing'); main.classList.add('main-login'); }
      setTimeout(() => els.loginCode && els.loginCode.focus(), 0);
    });
  }

  // زر الرجوع - تسجيل خروج كامل
  if(els.backBtn){
    els.backBtn.addEventListener('click', async () => {
      // مسح كافة البيانات المحفوظة وإعادة تعيين الحالة
      try{ localStorage.removeItem('auth'); localStorage.removeItem('userType'); }catch{}
      state.loggedIn = false; state.isPublisher = false; state.isAdmin = false; state.code = null; state.token = null; state.memberName = null; state.userType = null;
      els.landingView && els.landingView.classList.remove('hidden');
      els.loginView && els.loginView.classList.add('hidden');
      els.mainContentSection && els.mainContentSection.classList.add('hidden');
      els.statsSection && els.statsSection.classList.add('hidden');
      els.menuToggle && els.menuToggle.classList.add('hidden');
      closeSideNav();
      const main = document.getElementById('main');
      if(main){ main.classList.remove('main-login'); main.classList.add('main-landing'); }
    });
  }


  // إضافة تمركز الهبوط افتراضياً
  (document.getElementById('main')||{}).classList?.add('main-landing');

  // ===== Side Navigation =====
  function openSideNav(){
    els.sideNav && els.sideNav.classList.add('active');
    els.sideNavOverlay && els.sideNavOverlay.classList.add('active');
    els.menuToggle && els.menuToggle.classList.add('active');
  }
  function closeSideNav(){
    els.sideNav && els.sideNav.classList.remove('active');
    els.sideNavOverlay && els.sideNavOverlay.classList.remove('active');
    els.menuToggle && els.menuToggle.classList.remove('active');
  }
  els.menuToggle && els.menuToggle.addEventListener('click', () => {
    if(els.sideNav && els.sideNav.classList.contains('active')){
      closeSideNav();
    } else {
      openSideNav();
    }
  });
  els.sideNavOverlay && els.sideNavOverlay.addEventListener('click', closeSideNav);

  // Navigation Links - إضافة التنقل بين الأقسام
  function navigateToSection(sectionName){
    // Update active state
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll(`.nav-link[data-section="${sectionName}"]`).forEach(l => l.classList.add('active'));
    
    closeSideNav();
    
    // Smooth scroll to section
    if(sectionName === 'stats'){
      // Scroll to stats section
      const statsSection = document.getElementById('statsSection');
      if(statsSection){
        statsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if(sectionName === 'contact'){
      // Scroll to contact form
      const contactCard = document.getElementById('contactFormCard');
      if(contactCard){
        contactCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if(sectionName === 'archivedAnnouncements'){
      // Scroll to archived announcements
      const archivedCard = document.getElementById('archivedAnnouncementsCard');
      if(archivedCard){
        archivedCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      const targetSection = document.getElementById(`section-${sectionName}`);
      if(targetSection){
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
  
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      if(section) navigateToSection(section);
    });
  });

  // ===== Image Gallery/Slider =====
  async function initGallery(){
    try{
      const { ok, data, error } = await API.galleryList();
      if(!ok) throw new Error(error || 'فشل جلب الصور');
      state.galleryImages = (data || []).map(img => img.url);
      renderGallery();
    }catch(err){
      console.error('خطأ في تحميل المعرض:', err);
      state.galleryImages = [];
      renderGallery();
    }
  }

  function showEmptyGalleryScreen(){
    // إيقاف جميع عمليات التصفح
    stopAutoSlide();
    state.currentSlide = 0;
    
    // إخفاء جميع أزرار التحكم والنقاط
    if(els.sliderPrev) els.sliderPrev.style.display = 'none';
    if(els.sliderNext) els.sliderNext.style.display = 'none';
    if(els.sliderDots) els.sliderDots.style.display = 'none';
    
    // عرض شاشة فارغة ثابتة تملأ القسم بالكامل
    if(els.sliderTrack){
      els.sliderTrack.innerHTML = `
        <div class="empty-gallery-screen">
          <div class="empty-gallery-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
          </div>
          <h3 class="empty-gallery-title">لا توجد صور متاحة حالياً</h3>
          <p class="empty-gallery-subtitle">سيتم إضافة الصور قريباً</p>
        </div>
      `;
      // إزالة أي حركة transform
      els.sliderTrack.style.transform = 'none';
    }
  }

  function renderGallery(){
    if(!els.sliderTrack) return;
    
    // فحص حالة عدم وجود صور أو قائمة فارغة
    if(!state.galleryImages || state.galleryImages.length === 0){
      showEmptyGalleryScreen();
      return;
    }
    
    // مسح المحتوى السابق
    els.sliderTrack.innerHTML = '';
    els.sliderTrack.style.transform = '';
    
    // إظهار أزرار التحكم فقط إذا كان هناك أكثر من صورة
    if(state.galleryImages.length > 1){
      if(els.sliderPrev) els.sliderPrev.style.display = '';
      if(els.sliderNext) els.sliderNext.style.display = '';
      if(els.sliderDots) els.sliderDots.style.display = '';
    } else {
      // إخفاء الأزرار إذا كانت صورة واحدة فقط
      if(els.sliderPrev) els.sliderPrev.style.display = 'none';
      if(els.sliderNext) els.sliderNext.style.display = 'none';
      if(els.sliderDots) els.sliderDots.style.display = 'none';
    }
    
    // إضافة الصور
    state.galleryImages.forEach((imgUrl, idx) => {
      const item = document.createElement('div');
      item.className = 'slider-item';
      const img = document.createElement('img');
      img.src = escapeHtml(imgUrl);
      img.alt = `صورة ${idx + 1}`;
      img.loading = 'lazy';
      
      item.appendChild(img);
      els.sliderTrack.appendChild(item);
    });
    
    // ترتيب عرض الصور
    renderDots();
    updateSliderPosition();
    updateSliderControls();
    startAutoSlide();
  }

  function renderDots(){
    if(!els.sliderDots) return;
    els.sliderDots.innerHTML = '';
    state.galleryImages.forEach((_, idx) => {
      const dot = document.createElement('span');
      dot.className = 'slider-dot' + (idx === state.currentSlide ? ' active' : '');
      dot.addEventListener('click', () => goToSlide(idx));
      els.sliderDots.appendChild(dot);
    });
  }

  function updateSliderPosition(){
    if(!els.sliderTrack) return;
    els.sliderTrack.style.transform = `translateX(${state.currentSlide * 100}%)`;
    // Update dots
    if(els.sliderDots){
      els.sliderDots.querySelectorAll('.slider-dot').forEach((dot, idx) => {
        dot.classList.toggle('active', idx === state.currentSlide);
      });
    }
  }

  function updateSliderControls(){
    if(els.sliderPrev) els.sliderPrev.disabled = state.currentSlide === 0;
    if(els.sliderNext) els.sliderNext.disabled = state.currentSlide >= state.galleryImages.length - 1;
  }

  function nextSlide(){
    if(state.currentSlide < state.galleryImages.length - 1){
      state.currentSlide++;
      updateSliderPosition();
      updateSliderControls();
    }
  }

  function prevSlide(){
    if(state.currentSlide > 0){
      state.currentSlide--;
      updateSliderPosition();
      updateSliderControls();
    }
  }

  function goToSlide(idx){
    state.currentSlide = idx;
    updateSliderPosition();
    updateSliderControls();
  }

  // التقليب التلقائي للصور
  function startAutoSlide(){
    stopAutoSlide();
    if(!state.galleryImages || state.galleryImages.length <= 1) return;
    state.autoSlideInterval = setInterval(() => {
      if(state.currentSlide >= state.galleryImages.length - 1){
        state.currentSlide = 0;
      } else {
        state.currentSlide++;
      }
      updateSliderPosition();
      updateSliderControls();
    }, 4000);
  }

  function stopAutoSlide(){
    if(state.autoSlideInterval){
      clearInterval(state.autoSlideInterval);
      state.autoSlideInterval = null;
    }
  }

  els.sliderNext && els.sliderNext.addEventListener('click', () => {
    stopAutoSlide();
    nextSlide();
    setTimeout(() => startAutoSlide(), 8000);
  });
  els.sliderPrev && els.sliderPrev.addEventListener('click', () => {
    stopAutoSlide();
    prevSlide();
    setTimeout(() => startAutoSlide(), 8000);
  });

  // Upload option tabs
  const optionTabs = document.querySelectorAll('.option-tab');
  optionTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const option = tab.getAttribute('data-option');
      // Update active tab
      optionTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // Show/hide content
      document.querySelectorAll('.upload-option-content').forEach(c => c.classList.add('hidden'));
      if(option === 'file'){
        document.getElementById('uploadOptionFile')?.classList.remove('hidden');
      } else if(option === 'url'){
        document.getElementById('uploadOptionUrl')?.classList.remove('hidden');
      }
    });
  });

  // Gallery upload (for admins only)
  const galleryForm = document.getElementById('galleryForm');
  if(galleryForm){
    galleryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if(!state.isAdmin){
        showError('فقط المسؤولون يمكنهم إضافة الصور');
        return;
      }
      
      // تحديد أي خيار نشط
      const activeTab = document.querySelector('.option-tab.active');
      const option = activeTab?.getAttribute('data-option');
      
      if(option === 'file'){
        // رفع ملف محلي
        const fileInput = document.getElementById('galleryImageFile');
        const file = fileInput?.files[0];
        if(!file){
          showError('يرجى اختيار صورة');
          return;
        }
        // فحص حجم الملف (5MB كحد أقصى)
        if(file.size > 5 * 1024 * 1024){
          showError('حجم الصورة يجب ألا يتجاوز 5MB');
          return;
        }
        // تحويل الصورة إلى Data URL
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = ev.target.result;
          try{
            const { ok, error } = await API.galleryPost({
              code: state.code,
              token: state.token,
              imageData: dataUrl
            });
            if(!ok) throw new Error(error);
            fileInput.value = '';
            await initGallery();
            showSuccess('تم إضافة الصورة بنجاح 🎉');
          }catch(err){
            showError('فشل رفع الصورة: ' + (err.message || err));
          }
        };
        reader.onerror = () => {
          showError('فشل قراءة الصورة');
        };
        reader.readAsDataURL(file);
      } else if(option === 'url'){
        // إضافة رابط
        const url = (els.galleryImageUrl.value || '').trim();
        if(!url){
          showError('يرجى إدخال رابط الصورة');
          return;
        }
        try{
          const { ok, error } = await API.galleryPost({
            code: state.code,
            token: state.token,
            imageUrl: url
          });
          if(!ok) throw new Error(error);
          els.galleryImageUrl.value = '';
          await initGallery();
          showSuccess('تم إضافة الصورة بنجاح 🎉');
        }catch(err){
          showError('فشل إضافة الصورة: ' + (err.message || err));
        }
      }
    });
  }

  // محاولة استعادة جلسة محفوظة أو حالة الطالب
  try{
    const saved = JSON.parse(localStorage.getItem('auth') || 'null');
    const userType = localStorage.getItem('userType');
    
    if(saved && saved.code && saved.token){
      const r = await API.login(saved.code, saved.token);
      if(r && r.ok){
        const pubRes = await API.checkPublisher(saved.code);
        state.loggedIn = true;
        state.isPublisher = !!(pubRes && pubRes.ok && pubRes.isPublisher);
        state.isAdmin = !!(pubRes && pubRes.ok && pubRes.isAdmin);
        state.code = saved.code;
        state.token = saved.token;
        state.memberName = r.member?.name || null;
        els.landingView.classList.add('hidden');
        els.loginView.classList.add('hidden');
        els.mainContentSection && els.mainContentSection.classList.remove('hidden');
        els.menuToggle && els.menuToggle.classList.remove('hidden');
      // إخفاء أقسام النشر والرسائل افتراضياً
        document.getElementById('section-publish')?.classList.add('hidden');
        document.getElementById('section-messages')?.classList.add('hidden');
        
        // فقط المسؤولون يمكنهم النشر
        if(state.isAdmin){
          els.statsSection && els.statsSection.classList.remove('hidden');
          document.querySelectorAll('.nav-link-admin').forEach(l => l.classList.remove('hidden'));
          document.querySelectorAll('.nav-link-student').forEach(l => l.classList.add('hidden'));
          // إظهار أقسام النشر والرسائل للمسؤولين فقط
          document.getElementById('section-publish')?.classList.remove('hidden');
          document.getElementById('section-messages')?.classList.remove('hidden');
        }
        const main = document.getElementById('main');
        if(main){ main.classList.remove('main-login'); main.classList.remove('main-landing'); }
        await refreshAll();
        initGallery();
      }
    } else if(userType === 'student'){
      // استعادة حالة الطالب
      state.loggedIn = false; state.isPublisher = false; state.isAdmin = false;
      state.userType = 'student';
      els.landingView.classList.add('hidden');
      els.loginView.classList.add('hidden');
      els.mainContentSection && els.mainContentSection.classList.remove('hidden');
      els.statsSection && els.statsSection.classList.add('hidden');
      // إظهار روابط الطلاب وإخفاء روابط المسؤولين
      document.querySelectorAll('.nav-link-student').forEach(l => l.classList.remove('hidden'));
      document.querySelectorAll('.nav-link-admin').forEach(l => l.classList.add('hidden'));
      // إخفاء أقسام النشر والرسائل عن الطلاب
      document.getElementById('section-publish')?.classList.add('hidden');
      document.getElementById('section-messages')?.classList.add('hidden');
      els.menuToggle && els.menuToggle.classList.remove('hidden');
      const main = document.getElementById('main');
      if(main){ main.classList.remove('main-login'); main.classList.remove('main-landing'); }
      await refreshAll();
      initGallery();
    }
  }catch{}

})();
