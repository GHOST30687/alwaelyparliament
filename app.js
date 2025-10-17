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
    themeToggle: document.getElementById('themeToggle'),
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
    // أعضاء
    membersSection: document.getElementById('membersSection'),
    body: document.getElementById('membersBody'),
    // تبليغات
    annSection: document.getElementById('announcementsSection'),
    annForm: document.getElementById('annForm'),
    annTitle: document.getElementById('annTitle'),
    annContent: document.getElementById('annContent'),
    annList: document.getElementById('annList')
  };

  const state = {
    loggedIn: false,
    isPublisher: false,
    isAdmin: false,
    code: null,
    token: null,
    memberName: null,
    userType: null // 'member', 'admin', 'student'
  };

  // تطبيق الثيم المحفوظ (dark/light) عند التحميل
  try{
    const savedTheme = localStorage.getItem('theme');
    if(savedTheme === 'dark'){
      document.documentElement.dataset.theme = 'dark';
    } else if(savedTheme === 'light'){
      document.documentElement.dataset.theme = '';
    }
  }catch{}

  function row(code){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="code">${code}</td>
      <td>
        <div class="action-bar">
          <button class="btn small secondary" data-copy="${code}">نسخ الكود</button>
          ${state.loggedIn ? `<button class="btn small danger" data-del="${code}">حذف</button>` : ''}
        </div>
      </td>
    `;
    return tr;
  }

  function renderMembers(list){
    els.body.innerHTML = '';
    if(!list || !list.length){
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 2; td.style.textAlign = 'center';
      td.textContent = 'لا توجد بيانات بعد';
      tr.appendChild(td); els.body.appendChild(tr); return;
    }
    // list عبارة عن أكواد مباشرة
    list.forEach(code => els.body.appendChild(row(code)));
  }

  function renderAnnouncements(list){
    els.annList.innerHTML = '';
    if(!list || !list.length){
      const empty = document.createElement('div');
      empty.className = 'empty-state empty-state--big';
      empty.innerHTML = `
        <h3>لا توجد تبليغات الآن</h3>
        <div>سوف تظهر التبليغات هنا عند نشرها.</div>
      `;
      els.annList.appendChild(empty); return;
    }
    list.forEach(a => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <h3 style="margin:0;color:var(--navy)">${escapeHtml(a.title)}</h3>
          <span class="hint">${formatDate(a.createdAt)}</span>
        </div>
        <div style="margin-top:8px;white-space:pre-wrap;">${escapeHtml(a.content)}</div>
      `;
      els.annList.appendChild(card);
    });
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

  async function refreshMembers(){
    if(!state.loggedIn) return; // منع الجلب للمشاهد
    try{
      const { ok, data, error } = await API.list(state.code, state.token);
      if(!ok) throw new Error(error || 'فشل جلب الأعضاء');
      renderMembers(data);
    }catch(err){
      // لا نعرض الأعضاء للمشاهدين أو عند فشل التفويض
    }
  }

  async function refreshAnnouncements(){
    try{
      const { ok, data, error } = await API.annList();
      if(!ok) throw new Error(error || 'فشل جلب التبليغات');
      renderAnnouncements(data);
    }catch(err){
      showError('تعذر تحميل التبليغات: ' + (err.message || err));
    }
  }

  async function refreshAll(){
    await Promise.all([
      (state.loggedIn ? refreshMembers() : Promise.resolve()),
      refreshAnnouncements()
    ]);
  }


  // نسخ/حذف عضو
  document.addEventListener('click', async (e) => {
    const target = e.target;
    if(target.matches('[data-copy]')){
      const code = target.getAttribute('data-copy');
      try{ await navigator.clipboard.writeText(code); showSuccess('تم نسخ الكود'); }
      catch{ showError('تعذر نسخ الكود'); }
    }
    if(target.matches('[data-del]')){
      if(!state.loggedIn){ showError('الحذف يتطلب دخول البرلماني'); return; }
      const code = target.getAttribute('data-del');
      if(await confirmDialog('هل أنت متأكد من حذف هذا العضو؟')){
        const { ok, error } = await API.remove(code, state.code, state.token);
        if(!ok){ showError('تعذر الحذف: ' + (error || '')); return; } else { showSuccess('تم حذف العضو'); }
        await refreshMembers();
      }
    }
  });

  // نشر تبليغ
  els.annForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!state.isPublisher && !state.isAdmin){ showError('هذا الحساب غير مخوّل للنشر'); return; }
    const title = (els.annTitle.value || '').trim();
    const content = (els.annContent.value || '').trim();
    if(!title || !content){ showError('يرجى إدخال العنوان والمحتوى'); return; }
    const { ok, data, error } = await API.annPost({ code: state.code, token: state.token, title, content });
    if(!ok){ showError('تعذر النشر: ' + (error || '')); return; }
    els.annTitle.value = '';
    els.annContent.value = '';
    await refreshAnnouncements();
    showSuccess('تم نشر التبليغ');
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
      els.annSection.classList.remove('hidden');
      els.membersSection.classList.remove('hidden');
      // إزالة تمركز الدخول بعد تسجيل الدخول
      document.getElementById('main').classList.remove('main-login');
      // إظهار نموذج النشر للمخولين فقط (ناشرين أو مسؤولين)
      if(state.isPublisher || state.isAdmin){ els.annForm.classList.remove('hidden'); } else { els.annForm.classList.add('hidden'); }
      await refreshAll();
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
    els.landingView.classList.add('hidden');
    els.loginView.classList.add('hidden');
    els.annSection.classList.remove('hidden');
    els.membersSection.classList.add('hidden');
    const main = document.getElementById('main');
    if(main){ main.classList.remove('main-login'); main.classList.add('main-landing'); }
    els.annForm.classList.add('hidden');
    try{ localStorage.setItem('userType', 'student'); }catch{}
    await refreshAll();
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
      state.loggedIn = false; state.isPublisher = false; state.isAdmin = false; state.code = null; state.token = null; state.memberName = null;
      els.landingView && els.landingView.classList.remove('hidden');
      els.loginView && els.loginView.classList.add('hidden');
      els.annSection && els.annSection.classList.add('hidden');
      els.membersSection && els.membersSection.classList.add('hidden');
      const main = document.getElementById('main');
      if(main){ main.classList.remove('main-login'); main.classList.add('main-landing'); }
    });
  }

  // محول الوضع الداكن/الفاتح مع حفظ الاختيار محلياً
  els.themeToggle && els.themeToggle.addEventListener('click', () => {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? '' : 'dark';
    root.dataset.theme = next;
    try{ localStorage.setItem('theme', next || 'light'); }catch{}
  });

  // إضافة تمركز الهبوط افتراضياً
  (document.getElementById('main')||{}).classList?.add('main-landing');

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
        els.annSection.classList.remove('hidden');
        if(state.isPublisher || state.isAdmin){ els.annForm.classList.remove('hidden'); }
        // إظهار قائمة الأعضاء فقط للمسجّل
        els.membersSection.classList.remove('hidden');
        const main = document.getElementById('main');
        if(main){ main.classList.remove('main-login'); main.classList.remove('main-landing'); }
        await refreshAll();
      }
    } else if(userType === 'student'){
      // استعادة حالة الطالب
      state.loggedIn = false; state.isPublisher = false; state.isAdmin = false;
      els.landingView.classList.add('hidden');
      els.loginView.classList.add('hidden');
      els.annSection.classList.remove('hidden');
      els.membersSection.classList.add('hidden');
      els.annForm.classList.add('hidden');
      const main = document.getElementById('main');
      if(main){ main.classList.remove('main-login'); main.classList.remove('main-landing'); }
      await refreshAll();
    }
  }catch{}

})();
