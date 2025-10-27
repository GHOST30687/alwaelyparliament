const axios = require('axios');
const crypto = require('crypto');

// ضع بيانات JSONBin الجديدة هنا
const API_KEY = '$2a$10$NACq08Rx64mjDPX6vFDq0uuBecWecp8vaadu.oEPhQWNjz0P8KlsS';
const MEMBERS_BIN = '68f25866ae596e708f18f0bb';     // بن البرلمانيين
const ADMINS_BIN = '68f2582ed0ea881f40a8281e';       // بن المسؤولين
const ANNOUNCEMENTS_BIN = '68e83d64d0ea881f409bb543'; // بن التبليغات
const MESSAGES_BIN = '68ff7c36d0ea881f40bfb081';        // بن رسائل الطلاب
const GALLERY_BIN = '68ff88d943b1c97be984d4a9';        // بن معرض الصور

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  const path = event.path.replace('/.netlify/functions/api', '');
  
  try {
    // تسجيل الدخول
    if (event.httpMethod === 'POST' && path === '/api/auth/login') {
      const { code } = JSON.parse(event.body);
      if (!code) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'الكود مطلوب' }) };
      }

      const c = String(code).trim();

      // تحقق من بن البرلمانيين
      let isMember = false;
      try {
        const memberResponse = await axios.get(`https://api.jsonbin.io/v3/b/${MEMBERS_BIN}/latest`, {
          headers: { 'X-Master-Key': API_KEY }
        });
        const memberData = memberResponse.data.record;
        // البيانات يجب أن تكون object يحتوي على members array
        isMember = memberData.members && Array.isArray(memberData.members) && memberData.members.includes(c);
      } catch (e) {}

      // تحقق من بن المسؤولين
      let isAdmin = false;
      try {
        const adminResponse = await axios.get(`https://api.jsonbin.io/v3/b/${ADMINS_BIN}/latest`, {
          headers: { 'X-Master-Key': API_KEY }
        });
        const adminData = adminResponse.data.record;
        // البيانات يجب أن تكون object يحتوي على admins array
        isAdmin = adminData.admins && Array.isArray(adminData.admins) && adminData.admins.includes(c);
      } catch (e) {}
      
      if (!isMember && !isAdmin) {
        return { statusCode: 404, headers, body: JSON.stringify({ ok: false, error: 'الكود غير معروف' }) };
      }

      const token = crypto.randomBytes(16).toString('hex').toUpperCase();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          ok: true, 
          token, 
          isMember,
          isPublisher: isAdmin,
          isAdmin,
          member: { code: c }
        })
      };
    }

    // التحقق من الناشر
    if (event.httpMethod === 'POST' && path === '/api/auth/check') {
      const { code } = JSON.parse(event.body);
      const c = String(code).trim();
      const response = await axios.get(`https://api.jsonbin.io/v3/b/${ADMINS_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      const data = response.data.record;
      // البيانات يجب أن تكون object يحتوي على admins array
      const isAdmin = data.admins && Array.isArray(data.admins) && data.admins.includes(c);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, isPublisher: isAdmin, isAdmin })
      };
    }

    // عرض الأعضاء
    if (event.httpMethod === 'GET' && path === '/api/members') {
      const query = event.queryStringParameters || {};
      const { authCode, authToken } = query;
      
      if (!authCode || !authToken) {
        return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'يتطلب تسجيل دخول' }) };
      }

      const response = await axios.get(`https://api.jsonbin.io/v3/b/${MEMBERS_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      const data = response.data.record;
      // البيانات يجب أن تكون object يحتوي على members array
      const members = (data.members && Array.isArray(data.members)) ? data.members : [];
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, data: members })
      };
    }

    // عرض التبليغات
    if (event.httpMethod === 'GET' && path === '/api/announcements') {
      const response = await axios.get(`https://api.jsonbin.io/v3/b/${ANNOUNCEMENTS_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      const data = response.data.record;
      const list = (data.announcements || []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, data: list })
      };
    }

    // نشر تبليغ
    if (event.httpMethod === 'POST' && path === '/api/announcements') {
      const { code, title, content, imageUrl, imageData } = JSON.parse(event.body);
      const c = String(code).trim();
      
      const adminResponse = await axios.get(`https://api.jsonbin.io/v3/b/${ADMINS_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      const adminData = adminResponse.data.record;
      // البيانات يجب أن تكون object يحتوي على admins array
      const isAdmin = adminData.admins && Array.isArray(adminData.admins) && adminData.admins.includes(c);
      
      if (!isAdmin) {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'غير مخول للنشر' }) };
      }

      const annResponse = await axios.get(`https://api.jsonbin.io/v3/b/${ANNOUNCEMENTS_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      const annData = annResponse.data.record;
      const newAnn = {
        id: 'ANN-' + Date.now(),
        title,
        content,
        createdAt: new Date().toISOString()
      };
      
      // دعم رفع صور من رابط أو ملف
      if(imageUrl) newAnn.imageUrl = imageUrl;
      if(imageData) newAnn.imageUrl = imageData;
      
      annData.announcements = annData.announcements || [];
      annData.announcements.push(newAnn);
      
      await axios.put(`https://api.jsonbin.io/v3/b/${ANNOUNCEMENTS_BIN}`, annData, {
        headers: { 'X-Master-Key': API_KEY, 'Content-Type': 'application/json' }
      });
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ ok: true, data: newAnn })
      };
    }

    // حذف تبليغ
    if (event.httpMethod === 'DELETE' && path.startsWith('/api/announcements/')) {
      const query = event.queryStringParameters || {};
      const { code, token } = query;
      const id = path.replace('/api/announcements/', '');
      
      if (!code || !token) {
        return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'يتطلب تسجيل دخول' }) };
      }
      
      const c = String(code).trim();
      
      // التحقق من أن المستخدم مسؤول
      const adminResponse = await axios.get(`https://api.jsonbin.io/v3/b/${ADMINS_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      const adminData = adminResponse.data.record;
      const isAdmin = adminData.admins && Array.isArray(adminData.admins) && adminData.admins.includes(c);
      
      if (!isAdmin) {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'غير مخول للحذف' }) };
      }
      
      // جلب التبليغات
      const annResponse = await axios.get(`https://api.jsonbin.io/v3/b/${ANNOUNCEMENTS_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      const annData = annResponse.data.record;
      
      // حذف التبليغ
      const originalLength = (annData.announcements || []).length;
      annData.announcements = (annData.announcements || []).filter(a => a.id !== id);
      
      if (annData.announcements.length === originalLength) {
        return { statusCode: 404, headers, body: JSON.stringify({ ok: false, error: 'التبليغ غير موجود' }) };
      }
      
      // تحديث البيانات
      await axios.put(`https://api.jsonbin.io/v3/b/${ANNOUNCEMENTS_BIN}`, annData, {
        headers: { 'X-Master-Key': API_KEY, 'Content-Type': 'application/json' }
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true })
      };
    }

    // إرسال رسالة طالب
    if (event.httpMethod === 'POST' && path === '/api/messages') {
      const { name, grade, section, message } = JSON.parse(event.body);
      
      if (!grade || !section || !message) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'يرجى إدخال جميع الحقول المطلوبة' }) };
      }
      
      const msgResponse = await axios.get(`https://api.jsonbin.io/v3/b/${MESSAGES_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      const msgData = msgResponse.data.record;
      
      const newMessage = {
        id: 'MSG-' + Date.now(),
        name: name || 'غير معرف',
        grade,
        section,
        message,
        createdAt: new Date().toISOString()
      };
      
      msgData.messages = msgData.messages || [];
      msgData.messages.push(newMessage);
      
      await axios.put(`https://api.jsonbin.io/v3/b/${MESSAGES_BIN}`, msgData, {
        headers: { 'X-Master-Key': API_KEY, 'Content-Type': 'application/json' }
      });
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ ok: true, data: newMessage })
      };
    }

    // عرض رسائل الطلاب (للمسؤولين فقط)
    if (event.httpMethod === 'GET' && path === '/api/messages') {
      const query = event.queryStringParameters || {};
      const { code, token } = query;
      
      if (!code || !token) {
        return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'يتطلب تسجيل دخول' }) };
      }
      
      const c = String(code).trim();
      
      // التحقق من أن المستخدم مسؤول
      const adminResponse = await axios.get(`https://api.jsonbin.io/v3/b/${ADMINS_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      const adminData = adminResponse.data.record;
      const isAdmin = adminData.admins && Array.isArray(adminData.admins) && adminData.admins.includes(c);
      
      if (!isAdmin) {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'غير مخول' }) };
      }
      
      const msgResponse = await axios.get(`https://api.jsonbin.io/v3/b/${MESSAGES_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      const msgData = msgResponse.data.record;
      const list = (msgData.messages || []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, data: list })
      };
    }

    // ==== معرض الصور ====
    
    // عرض صور المعرض
    if (event.httpMethod === 'GET' && path === '/api/gallery') {
      if(!GALLERY_BIN) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: [] }) };
      }
      
      try {
        const response = await axios.get(`https://api.jsonbin.io/v3/b/${GALLERY_BIN}/latest`, {
          headers: { 'X-Master-Key': API_KEY }
        });
        const data = response.data.record;
        
        // تصفية الصور القديمة (أكثر من 24 ساعة)
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const validImages = (data.images || []).filter(img => {
          const createdTime = new Date(img.createdAt).getTime();
          const age = now - createdTime;
          return age < oneDayMs;
        });
        
        const sorted = validImages.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: sorted }) };
      } catch (e) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: [] }) };
      }
    }
    
    // إضافة صورة للمعرض (للمسؤولين فقط)
    if (event.httpMethod === 'POST' && path === '/api/gallery') {
      if(!GALLERY_BIN) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'معرض الصور غير مفعل' }) };
      }
      
      const { code, token, imageUrl, imageData } = JSON.parse(event.body);
      
      if (!code || !token) {
        return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'يتطلب تسجيل الدخول' }) };
      }
      
      if (!imageUrl && !imageData) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'يجب توفير رابط صورة أو بيانات الصورة' }) };
      }
      
      const c = String(code).trim();
      
      // التحقق من أن المستخدم مسؤول
      const adminResponse = await axios.get(`https://api.jsonbin.io/v3/b/${ADMINS_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      const adminData = adminResponse.data.record;
      const isAdmin = adminData.admins && Array.isArray(adminData.admins) && adminData.admins.includes(c);
      
      if (!isAdmin) {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'فقط المسؤولون يمكنهم إضافة الصور' }) };
      }
      
      const image = {
        id: 'IMG-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        url: imageUrl || imageData,
        createdAt: new Date().toISOString()
      };
      
      const galleryResponse = await axios.get(`https://api.jsonbin.io/v3/b/${GALLERY_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      const galleryData = galleryResponse.data.record;
      galleryData.images = galleryData.images || [];
      galleryData.images.push(image);
      
      await axios.put(`https://api.jsonbin.io/v3/b/${GALLERY_BIN}`, galleryData, {
        headers: { 'X-Master-Key': API_KEY, 'Content-Type': 'application/json' }
      });
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ ok: true, data: image })
      };
    }
    
    // حذف صورة من المعرض (للمسؤولين فقط)
    if (event.httpMethod === 'DELETE' && path.startsWith('/api/gallery/')) {
      if(!GALLERY_BIN) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'معرض الصور غير مفعل' }) };
      }
      
      const query = event.queryStringParameters || {};
      const { code, token } = query;
      const id = path.replace('/api/gallery/', '');
      
      if (!code || !token) {
        return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'يتطلب الحذف تسجيل الدخول' }) };
      }
      
      const c = String(code).trim();
      
      const adminResponse = await axios.get(`https://api.jsonbin.io/v3/b/${ADMINS_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      const adminData = adminResponse.data.record;
      const isAdmin = adminData.admins && Array.isArray(adminData.admins) && adminData.admins.includes(c);
      
      if (!isAdmin) {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'فقط المسؤولون يمكنهم حذف الصور' }) };
      }
      
      const galleryResponse = await axios.get(`https://api.jsonbin.io/v3/b/${GALLERY_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      const galleryData = galleryResponse.data.record;
      const before = (galleryData.images || []).length;
      galleryData.images = (galleryData.images || []).filter(img => img.id !== id);
      
      if (galleryData.images.length === before) {
        return { statusCode: 404, headers, body: JSON.stringify({ ok: false, error: 'الصورة غير موجودة' }) };
      }
      
      await axios.put(`https://api.jsonbin.io/v3/b/${GALLERY_BIN}`, galleryData, {
        headers: { 'X-Master-Key': API_KEY, 'Content-Type': 'application/json' }
      });
      
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };

  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: error.message || 'خطأ في الخادم' })
    };
  }
};
