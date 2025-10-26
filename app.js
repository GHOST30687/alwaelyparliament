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
    annPost: async (payload) => (await fetch('/api/announcements', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })).json()
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
    galleryImages: []
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

  function renderAnnouncements(list){
    els.annList.innerHTML = '';
    if(!list || !list.length){
      // إخفاء قسم التبليغات وإظهار رسالة "لا توجد تبليغات" في القائمة الرئيسية
      els.announcementsCard && els.announcementsCard.classList.add('hidden');
      els.noAnnouncementsMessage && els.noAnnouncementsMessage.classList.remove('hidden');
      return;
    }
    // إظهار قسم التبليغات وإخفاء رسالة "لا توجد"
    els.announcementsCard && els.announcementsCard.classList.remove('hidden');
    els.noAnnouncementsMessage && els.noAnnouncementsMessage.classList.add('hidden');
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
        <button class="expand-ann-btn" data-ann-idx="${idx}">
          <span>عرض التبليغ</span>
          <span>→</span>
        </button>
      `;
      els.annList.appendChild(card);
    });
    // Add expand functionality
    document.querySelectorAll('.expand-ann-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-ann-idx'));
        if(list[idx]) showAnnouncementModal(list[idx]);
      });
    });
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
    }
  }

  async function refreshAll(){
    await Promise.all([
      refreshAnnouncements()
    ]);
    updateStats();
  }



  // نشر تبليغ
  els.annForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!state.isAdmin){ showError('فقط المسؤولون يمكنهم نشر التبليغات'); return; }
    const title = (els.annTitle.value || '').trim();
    const content = (els.annContent.value || '').trim();
    const imageUrl = (els.annImageUrl.value || '').trim();
    if(!title || !content){ showError('يرجى إدخال العنوان والمحتوى'); return; }
    const payload = { code: state.code, token: state.token, title, content };
    if(imageUrl) payload.imageUrl = imageUrl;
    const { ok, data, error } = await API.annPost(payload);
    if(!ok){ showError('تعذر النشر: ' + (error || '')); return; }
    els.annTitle.value = '';
    els.annContent.value = '';
    els.annImageUrl.value = '';
    await refreshAnnouncements();
    showSuccess('تم نشر التبليغ 🎉');
  });

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
      els.siteFooter && els.siteFooter.classList.remove('hidden');
      els.menuToggle && els.menuToggle.classList.add('hidden');
      
      // فقط المسؤولون يمكنهم رؤية الإحصائيات ونشر التبليغات
      if(state.isAdmin){
        els.statsSection && els.statsSection.classList.remove('hidden');
        els.annFormCard && els.annFormCard.classList.remove('hidden');
        els.galleryUploadForm && els.galleryUploadForm.classList.remove('hidden');
      } else {
        // البرلمانيون ليس لديهم صلاحيات - مثل الطلاب
        els.statsSection && els.statsSection.classList.add('hidden');
        els.annFormCard && els.annFormCard.classList.add('hidden');
        els.galleryUploadForm && els.galleryUploadForm.classList.add('hidden');
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
      document.getElementById('loginCode').placeholder = 'مثال: MP001';
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
    els.siteFooter && els.siteFooter.classList.remove('hidden');
    const main = document.getElementById('main');
    if(main){ main.classList.remove('main-login'); main.classList.remove('main-landing'); }
    els.annForm.classList.add('hidden');
    els.menuToggle && els.menuToggle.classList.add('hidden');
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
      document.getElementById('loginCode').placeholder = 'مثال: ADM001';
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
      els.siteFooter && els.siteFooter.classList.add('hidden');
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

  // Navigation Links - simplified since we only have announcements now
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // Update active state
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      closeSideNav();
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // ===== Image Gallery/Slider =====
  function initGallery(){
    // Load demo images or from storage
    state.galleryImages = [
      'https://via.placeholder.com/800x500/0d1b2a/c9a227?text=صورة+توضيحية+1',
      'https://via.placeholder.com/800x500/1b263b/c9a227?text=صورة+توضيحية+2',
      'https://via.placeholder.com/800x500/0d1b2a/c9a227?text=صورة+توضيحية+3'
    ];
    renderGallery();
  }

  function renderGallery(){
    if(!els.sliderTrack) return;
    els.sliderTrack.innerHTML = '';
    if(!state.galleryImages || state.galleryImages.length === 0){
      els.sliderTrack.innerHTML = '<div class="empty-gallery">📷 لا توجد صور حالياً</div>';
      updateSliderControls();
      return;
    }
    state.galleryImages.forEach((imgUrl, idx) => {
      const item = document.createElement('div');
      item.className = 'slider-item';
      item.innerHTML = `<img src="${escapeHtml(imgUrl)}" alt="صورة ${idx + 1}" loading="lazy" />`;
      els.sliderTrack.appendChild(item);
    });
    renderDots();
    updateSliderPosition();
    updateSliderControls();
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

  els.sliderNext && els.sliderNext.addEventListener('click', nextSlide);
  els.sliderPrev && els.sliderPrev.addEventListener('click', prevSlide);

  // Gallery upload (for admins only)
  els.galleryUploadForm && els.galleryUploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if(!state.isAdmin){
      showError('فقط المسؤولون يمكنهم إضافة الصور');
      return;
    }
    const url = (els.galleryImageUrl.value || '').trim();
    if(!url){
      showError('يرجى إدخال رابط الصورة');
      return;
    }
    state.galleryImages.push(url);
    els.galleryImageUrl.value = '';
    renderGallery();
    showSuccess('تم إضافة الصورة بنجاح');
    // TODO: Save to backend
  });

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
        els.siteFooter && els.siteFooter.classList.remove('hidden');
        els.menuToggle && els.menuToggle.classList.add('hidden');
        // فقط المسؤولون يمكنهم النشر
        if(state.isAdmin){
          els.annFormCard && els.annFormCard.classList.remove('hidden');
          els.statsSection && els.statsSection.classList.remove('hidden');
          els.galleryUploadForm && els.galleryUploadForm.classList.remove('hidden');
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
      els.annForm.classList.add('hidden');
      els.statsSection && els.statsSection.classList.add('hidden');
      els.siteFooter && els.siteFooter.classList.remove('hidden');
      els.menuToggle && els.menuToggle.classList.add('hidden');
      const main = document.getElementById('main');
      if(main){ main.classList.remove('main-login'); main.classList.remove('main-landing'); }
      await refreshAll();
      initGallery();
    }
  }catch{}

})();
