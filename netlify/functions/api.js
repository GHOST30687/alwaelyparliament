const axios = require('axios');
const crypto = require('crypto');

const API_KEY = '$2a$10$fla1BI8qDkOGpARIa8t3au.4.u5oSazuv41Fip1LQNuHLqt8GmFWi';
const ADMINS_BIN = '68e83d25d0ea881f409bb525';
const ANNOUNCEMENTS_BIN = '68e83d64d0ea881f409bb543';

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

      const response = await axios.get(`https://api.jsonbin.io/v3/b/${ADMINS_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      
      const data = response.data.record;
      const isMember = data.members && data.members.includes(code);
      const isAdmin = data.settings && data.settings.publisherCodes && data.settings.publisherCodes.includes(code);
      
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
          member: { code }
        })
      };
    }

    // التحقق من الناشر
    if (event.httpMethod === 'POST' && path === '/api/auth/check') {
      const { code } = JSON.parse(event.body);
      const response = await axios.get(`https://api.jsonbin.io/v3/b/${ADMINS_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      
      const data = response.data.record;
      const isAdmin = data.settings && data.settings.publisherCodes && data.settings.publisherCodes.includes(code);
      
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

      const response = await axios.get(`https://api.jsonbin.io/v3/b/${ADMINS_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      
      const data = response.data.record;
      const members = data.members || [];
      
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
      const { code, title, content } = JSON.parse(event.body);
      
      const response = await axios.get(`https://api.jsonbin.io/v3/b/${ADMINS_BIN}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      
      const adminData = response.data.record;
      const isAdmin = adminData.settings && adminData.settings.publisherCodes && adminData.settings.publisherCodes.includes(code);
      
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

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'خطأ في الخادم' })
    };
  }
};