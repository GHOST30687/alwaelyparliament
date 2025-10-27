const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// Define server port (fallback to 3000)
const PORT = process.env.PORT || 3000;

// ====== إعدادات JSONBin ======
const JSONBIN_CONFIG = {
  // X-Main-Key (مطلوب): الصقه هنا
  X_MAIN_KEY: '$2a$10$NACq08Rx64mjDPX6vFDq0uuBecWecp8vaadu.oEPhQWNjz0P8KlsS',
  // Bin IDs (مطلوب): الصقها هنا
  MEMBERS_BIN_ID: '68f25866ae596e708f18f0bb',      // bin البرلمانيين - ضع ID الجديد هنا
  ADMINS_BIN_ID: '68f2582ed0ea881f40a8281e',       // bin المسؤولين/الناشرين - استخدم الـ bin الحالي
  ANNOUNCEMENTS_BIN_ID: '68e83d64d0ea881f409bb543', // bin التبليغات
  MESSAGES_BIN_ID: '',                             // bin رسائل الطلاب - أضف ID جديد هنا
  BASE_URL: 'https://api.jsonbin.io/v3'
};

// أولوية القراءة: ما يتم لصقه في هذا الملف أولاً، ثم متغيرات البيئة
const BINJSON_BASE_URL = JSONBIN_CONFIG.BASE_URL;
const BINJSON_API_KEY = JSONBIN_CONFIG.X_MAIN_KEY;
const BINJSON_MEMBERS_BIN_ID = JSONBIN_CONFIG.MEMBERS_BIN_ID;
const BINJSON_ADMINS_BIN_ID = JSONBIN_CONFIG.ADMINS_BIN_ID;
const BINJSON_ANNOUNCEMENTS_BIN_ID = JSONBIN_CONFIG.ANNOUNCEMENTS_BIN_ID;
const BINJSON_MESSAGES_BIN_ID = JSONBIN_CONFIG.MESSAGES_BIN_ID;

// ترويسات الاعتماد
const MAIN_KEY_HEADER = 'X-Main-Key';

const api = axios.create({ baseURL: BINJSON_BASE_URL });

// ====== وظائف مساعدة ======
function initialMembersRecord() {
  return { members: [], bindings: {} };
}

function initialAdminsRecord() {
  return { admins: [], bindings: {} };
}

function initialAnnouncementsRecord() {
  return { announcements: [] };
}

function initialMessagesRecord() {
  return { messages: [] };
}

function normalizeMembersRecord(rec) {
  if (!rec || typeof rec !== 'object') return initialMembersRecord();
  if (!Array.isArray(rec.members)) rec.members = [];
  if (!rec.bindings || typeof rec.bindings !== 'object') rec.bindings = {};
  return rec;
}

function normalizeAdminsRecord(rec) {
  if (!rec || typeof rec !== 'object') return initialAdminsRecord();
  if (!Array.isArray(rec.admins)) rec.admins = [];
  if (!rec.bindings || typeof rec.bindings !== 'object') rec.bindings = {};
  return rec;
}

function normalizeAnnouncementsRecord(rec) {
  if (!rec || typeof rec !== 'object') return initialAnnouncementsRecord();
  if (!Array.isArray(rec.announcements)) rec.announcements = [];
  return rec;
}

function normalizeMessagesRecord(rec) {
  if (!rec || typeof rec !== 'object') return initialMessagesRecord();
  if (!Array.isArray(rec.messages)) rec.messages = [];
  return rec;
}

// ====== وظائف Bins ======
async function ensureBin(binId, name) {
  if (!BINJSON_API_KEY) {
    throw new Error('لم يتم ضبط قاعدة البيانات بعد. يرجى مراسلة المطور.');
  }
  if (!binId) {
    throw new Error(`قاعدة بيانات ${name} غير متوفرة. يرجى مراسلة المطور.`);
  }
  try {
    await api.get(`/b/${binId}/latest`, {
      headers: { [MAIN_KEY_HEADER]: BINJSON_API_KEY }
    });
    return binId;
  } catch (err) {
    throw new Error(`لا يمكن الوصول لقاعدة بيانات ${name}. يرجى مراسلة المطور.`);
  }
}

async function loadMembersRecord() {
  const binId = await ensureBin(BINJSON_MEMBERS_BIN_ID, 'البرلمانيين');
  const { data } = await api.get(`/b/${binId}/latest`, {
    headers: { [MAIN_KEY_HEADER]: BINJSON_API_KEY }
  });
  return normalizeMembersRecord(data?.record || data);
}

async function saveMembersRecord(record) {
  const binId = await ensureBin(BINJSON_MEMBERS_BIN_ID, 'البرلمانيين');
  await api.put(`/b/${binId}`, { record }, {
    headers: { [MAIN_KEY_HEADER]: BINJSON_API_KEY, 'Content-Type': 'application/json' }
  });
  return record;
}

async function loadAdminsRecord() {
  const binId = await ensureBin(BINJSON_ADMINS_BIN_ID, 'المسؤولين');
  const { data } = await api.get(`/b/${binId}/latest`, {
    headers: { [MAIN_KEY_HEADER]: BINJSON_API_KEY }
  });
  return normalizeAdminsRecord(data?.record || data);
}

async function saveAdminsRecord(record) {
  const binId = await ensureBin(BINJSON_ADMINS_BIN_ID, 'المسؤولين');
  await api.put(`/b/${binId}`, { record }, {
    headers: { [MAIN_KEY_HEADER]: BINJSON_API_KEY, 'Content-Type': 'application/json' }
  });
  return record;
}

async function loadAnnouncementsRecord() {
  const binId = await ensureBin(BINJSON_ANNOUNCEMENTS_BIN_ID, 'التبليغات');
  const { data } = await api.get(`/b/${binId}/latest`, {
    headers: { [MAIN_KEY_HEADER]: BINJSON_API_KEY }
  });
  return normalizeAnnouncementsRecord(data?.record || data);
}

async function saveAnnouncementsRecord(record) {
  const binId = await ensureBin(BINJSON_ANNOUNCEMENTS_BIN_ID, 'التبليغات');
  await api.put(`/b/${binId}`, { record }, {
    headers: { [MAIN_KEY_HEADER]: BINJSON_API_KEY, 'Content-Type': 'application/json' }
  });
  return record;
}

async function loadMessagesRecord() {
  if(!BINJSON_MESSAGES_BIN_ID) return initialMessagesRecord();
  try{
    const binId = await ensureBin(BINJSON_MESSAGES_BIN_ID, 'رسائل الطلاب');
    const { data } = await api.get(`/b/${binId}/latest`, {
      headers: { [MAIN_KEY_HEADER]: BINJSON_API_KEY }
    });
    return normalizeMessagesRecord(data?.record || data);
  }catch{
    return initialMessagesRecord();
  }
}

async function saveMessagesRecord(record) {
  if(!BINJSON_MESSAGES_BIN_ID) throw new Error('لم يتم ضبط Bin رسائل الطلاب');
  const binId = await ensureBin(BINJSON_MESSAGES_BIN_ID, 'رسائل الطلاب');
  await api.put(`/b/${binId}`, { record }, {
    headers: { [MAIN_KEY_HEADER]: BINJSON_API_KEY, 'Content-Type': 'application/json' }
  });
  return record;
}

// ====== إعدادات الخادم ======
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ====== API Endpoints ======

// عرض قائمة الأعضاء
app.get('/api/members', async (req, res) => {
  try {
    const { authCode, authToken } = req.query || {};
    if (!authCode || !authToken) {
      return res.status(401).json({ ok: false, error: 'يتطلب الاطلاع تسجيل الدخول' });
    }

    const c = String(authCode).trim();

    // التحقق من البرلمانيين
    const membersRec = await loadMembersRecord();
    const memberBinding = membersRec.bindings[c];
    const isMember = membersRec.members.includes(c);

    // التحقق من المسؤولين
    const adminsRec = await loadAdminsRecord();
    const adminBinding = adminsRec.bindings[c];
    const isAdmin = adminsRec.admins.includes(c);

    // التحقق من صحة الجلسة
    let validSession = false;
    if (isMember && memberBinding && memberBinding.token === authToken) {
      validSession = true;
    } else if (isAdmin && adminBinding && adminBinding.token === authToken) {
      validSession = true;
    }

    if (!validSession) {
      return res.status(401).json({ ok: false, error: 'جلسة غير صالحة' });
    }

    // إرجاع قائمة البرلمانيين
    res.json({ ok: true, data: membersRec.members });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'خطأ غير متوقع' });
  }
});

// حذف عضو
app.delete('/api/members/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { authCode, authToken } = req.query || {};
    
    if (!authCode || !authToken) {
      return res.status(401).json({ ok: false, error: 'يتطلب الحذف تسجيل الدخول' });
    }

    const c = String(authCode).trim();

    // التحقق من صلاحيات المسؤول
    const adminsRec = await loadAdminsRecord();
    const adminBinding = adminsRec.bindings[c];
    const isAdmin = adminsRec.admins.includes(c);

    if (!isAdmin || !adminBinding || adminBinding.token !== authToken) {
      return res.status(403).json({ ok: false, error: 'هذه العملية تتطلب صلاحيات مسؤول' });
    }

    // حذف العضو
    const membersRec = await loadMembersRecord();
    const before = membersRec.members.length;
    membersRec.members = membersRec.members.filter(m => m !== code);
    
    if (membersRec.members.length === before) {
      return res.status(404).json({ ok: false, error: 'العضو غير موجود' });
    }

    // حذف binding العضو إذا وجد
    if (membersRec.bindings[code]) {
      delete membersRec.bindings[code];
    }

    await saveMembersRecord(membersRec);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'خطأ غير متوقع' });
  }
});

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
  try {
    const { code, token } = req.body || {};
    if (!code) return res.status(400).json({ ok: false, error: 'الكود مطلوب' });

    const c = String(code).trim();

    // البحث في البرلمانيين
    const membersRec = await loadMembersRecord();
    const isMember = membersRec.members.includes(c);
    
    // البحث في المسؤولين
    const adminsRec = await loadAdminsRecord();
    const isAdmin = adminsRec.admins.includes(c);

    if (!isMember && !isAdmin) {
      return res.status(404).json({ ok: false, error: 'الكود غير معروف' });
    }

    // معالجة البرلمانيين
    if (isMember) {
      const binding = membersRec.bindings[c];
      if (binding) {
        if (token && token === binding.token) {
          return res.json({ ok: true, token, isMember: true, isPublisher: false, isAdmin: false, member: { code: c } });
        }
        return res.status(409).json({ ok: false, error: 'هذا الكود مرتبط مسبقاً بجهاز آخر. يتطلب الرمز الصحيح.' });
      }

      // ربط جديد للبرلماني
      const sessionToken = crypto.randomBytes(16).toString('hex').toUpperCase();
      membersRec.bindings[c] = { token: sessionToken, createdAt: new Date().toISOString() };
      await saveMembersRecord(membersRec);
      return res.json({ ok: true, token: sessionToken, isMember: true, isPublisher: false, isAdmin: false, member: { code: c } });
    }

    // معالجة المسؤولين
    if (isAdmin) {
      const binding = adminsRec.bindings[c];
      if (binding) {
        if (token && token === binding.token) {
          return res.json({ ok: true, token, isMember: false, isPublisher: true, isAdmin: true, member: { code: c } });
        }
        return res.status(409).json({ ok: false, error: 'هذا الكود مرتبط مسبقاً بجهاز آخر. يتطلب الرمز الصحيح.' });
      }

      // ربط جديد للمسؤول
      const sessionToken = crypto.randomBytes(16).toString('hex').toUpperCase();
      adminsRec.bindings[c] = { token: sessionToken, createdAt: new Date().toISOString() };
      await saveAdminsRecord(adminsRec);
      return res.json({ ok: true, token: sessionToken, isMember: false, isPublisher: true, isAdmin: true, member: { code: c } });
    }

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'خطأ غير متوقع' });
  }
});

// التحقق من أكواد النشر
app.post('/api/auth/check', async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ ok: false, error: 'الكود مطلوب' });

    const c = String(code).trim();
    const adminsRec = await loadAdminsRecord();
    const isAdmin = adminsRec.admins.includes(c);

    res.json({ ok: true, isPublisher: isAdmin, isAdmin });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'خطأ غير متوقع' });
  }
});

// عرض التبليغات
app.get('/api/announcements', async (req, res) => {
  try {
    const annRec = await loadAnnouncementsRecord();
    const list = Array.from(annRec.announcements || []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json({ ok: true, data: list });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'خطأ غير متوقع' });
  }
});

// نشر تبليغ
app.post('/api/announcements', async (req, res) => {
  try {
    const { code, token, title, content, imageUrl } = req.body || {};
    if (!code || !token || !title || !content) {
      return res.status(400).json({ ok: false, error: 'الكود والرمز والعنوان والمحتوى مطلوبة' });
    }

    const c = String(code).trim();
    const adminsRec = await loadAdminsRecord();
    const isAdmin = adminsRec.admins.includes(c);
    
    if (!isAdmin) {
      return res.status(403).json({ ok: false, error: 'كود غير مخوّل للنشر' });
    }

    const binding = adminsRec.bindings[c];
    if (!binding || binding.token !== token) {
      return res.status(401).json({ ok: false, error: 'جلسة غير صالحة لهذا الكود' });
    }

    const ann = {
      id: 'ANN-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
      title: String(title).trim(),
      content: String(content).trim(),
      createdAt: new Date().toISOString()
    };
    
    if(imageUrl) ann.imageUrl = String(imageUrl).trim();

    const annRec = await loadAnnouncementsRecord();
    annRec.announcements.push(ann);
    await saveAnnouncementsRecord(annRec);
    res.status(201).json({ ok: true, data: ann });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'خطأ غير متوقع' });
  }
});

// حذف تبليغ
app.delete('/api/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, token } = req.query || {};
    
    if (!code || !token) {
      return res.status(401).json({ ok: false, error: 'يتطلب الحذف تسجيل الدخول' });
    }

    const c = String(code).trim();
    const adminsRec = await loadAdminsRecord();
    const isAdmin = adminsRec.admins.includes(c);
    
    if (!isAdmin) {
      return res.status(403).json({ ok: false, error: 'فقط المسؤولون يمكنهم حذف التبليغات' });
    }

    const binding = adminsRec.bindings[c];
    if (!binding || binding.token !== token) {
      return res.status(401).json({ ok: false, error: 'جلسة غير صالحة' });
    }

    const annRec = await loadAnnouncementsRecord();
    const before = annRec.announcements.length;
    annRec.announcements = annRec.announcements.filter(a => a.id !== id);
    
    if (annRec.announcements.length === before) {
      return res.status(404).json({ ok: false, error: 'التبليغ غير موجود' });
    }

    await saveAnnouncementsRecord(annRec);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'خطأ غير متوقع' });
  }
});

// فحص صحي
app.get('/api/health', async (req, res) => {
  try {
    const configured = !!(BINJSON_API_KEY);
    const haveMembersId = !!BINJSON_MEMBERS_BIN_ID;
    const haveAdminsId = !!BINJSON_ADMINS_BIN_ID;
    const haveAnnId = !!BINJSON_ANNOUNCEMENTS_BIN_ID;

    let membersReachable = false, adminsReachable = false, announcementsReachable = false;
    
    if (configured && haveMembersId) {
      try {
        await api.get(`/b/${BINJSON_MEMBERS_BIN_ID}/latest`, { headers: { [MAIN_KEY_HEADER]: BINJSON_API_KEY } });
        membersReachable = true;
      } catch (err) {}
    }
    
    if (configured && haveAdminsId) {
      try {
        await api.get(`/b/${BINJSON_ADMINS_BIN_ID}/latest`, { headers: { [MAIN_KEY_HEADER]: BINJSON_API_KEY } });
        adminsReachable = true;
      } catch (err) {}
    }
    
    if (configured && haveAnnId) {
      try {
        await api.get(`/b/${BINJSON_ANNOUNCEMENTS_BIN_ID}/latest`, { headers: { [MAIN_KEY_HEADER]: BINJSON_API_KEY } });
        announcementsReachable = true;
      } catch (err) {}
    }

    res.json({
      ok: true,
      configured,
      baseUrl: BINJSON_BASE_URL,
      membersBinId: BINJSON_MEMBERS_BIN_ID || null,
      adminsBinId: BINJSON_ADMINS_BIN_ID || null,
      announcementsBinId: BINJSON_ANNOUNCEMENTS_BIN_ID || null,
      membersReachable,
      adminsReachable,
      announcementsReachable
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'خطأ غير متوقع' });
  }
});

// إرسال رسالة من طالب
app.post('/api/messages', async (req, res) => {
  try {
    const { name, grade, section, message } = req.body || {};
    if (!grade || !section || !message) {
      return res.status(400).json({ ok: false, error: 'الصف والشعبة والرسالة مطلوبة' });
    }

    const msg = {
      id: 'MSG-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
      name: name ? String(name).trim() : 'مجهول',
      grade: String(grade).trim(),
      section: String(section).trim(),
      message: String(message).trim(),
      createdAt: new Date().toISOString(),
      read: false
    };

    const msgRec = await loadMessagesRecord();
    msgRec.messages.push(msg);
    await saveMessagesRecord(msgRec);
    res.status(201).json({ ok: true, data: msg });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'خطأ غير متوقع' });
  }
});

// عرض رسائل الطلاب (للمسؤولين فقط)
app.get('/api/messages', async (req, res) => {
  try {
    const { code, token } = req.query || {};
    if (!code || !token) {
      return res.status(401).json({ ok: false, error: 'يتطلب تسجيل الدخول' });
    }

    const c = String(code).trim();
    const adminsRec = await loadAdminsRecord();
    const isAdmin = adminsRec.admins.includes(c);
    
    if (!isAdmin) {
      return res.status(403).json({ ok: false, error: 'فقط المسؤولون يمكنهم عرض الرسائل' });
    }

    const binding = adminsRec.bindings[c];
    if (!binding || binding.token !== token) {
      return res.status(401).json({ ok: false, error: 'جلسة غير صالحة' });
    }

    const msgRec = await loadMessagesRecord();
    const list = Array.from(msgRec.messages || []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json({ ok: true, data: list });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'خطأ غير متوقع' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
