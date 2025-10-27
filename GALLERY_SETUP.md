# 📸 إعداد نظام معرض الصور

## ✅ ما تم إنجازه في Backend (server.js)

1. ✅ إضافة bin جديد للمعرض: `GALLERY_BIN_ID`
2. ✅ حذف تلقائي للصور بعد 24 ساعة
3. ✅ API endpoints جاهزة:
   - `GET /api/gallery` - عرض الصور
   - `POST /api/gallery` - إضافة صورة
   - `DELETE /api/gallery/:id` - حذف صورة

## ⚠️ خطوات التنفيذ المتبقية

### 1️⃣ إنشاء Bin جديد في JSONBin

1. افتح https://jsonbin.io
2. سجل دخول بحسابك
3. انشئ bin جديد باسم "Gallery Images"  
4. محتوى Bin الأولي:
```json
{
  "images": []
}
```
5. انسخ الـ Bin ID
6. الصقه في `server.js` السطر 22:
```javascript
GALLERY_BIN_ID: 'الصق_البن_ID_هنا',
```

### 2️⃣ تحديث app.js - إضافة API Gallery

أضف في بداية ملف `app.js` داخل object `API` (بعد السطر 16):

```javascript
// معرض الصور
galleryList: async () => (await fetch('/api/gallery')).json(),
galleryPost: async (payload) => (await fetch('/api/gallery', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })).json(),
galleryDelete: async (id, code, token) => (await fetch(`/api/gallery/${encodeURIComponent(id)}?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`, { method: 'DELETE' })).json(),
```

### 3️⃣ تحديث دالة initGallery في app.js

استبدل الدالة الموجودة في السطر 757-765 بهذه:

```javascript
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
```

### 4️⃣ تحديث رفع الصور في app.js

استبدل الكود في السطور 954-993 بهذا:

```javascript
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
      await initGallery(); // إعادة تحميل المعرض
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
    await initGallery(); // إعادة تحميل المعرض
    showSuccess('تم إضافة الصورة بنجاح 🎉');
  }catch(err){
    showError('فشل إضافة الصورة: ' + (err.message || err));
  }
}
```

## 🎯 الميزات المطبقة

✅ **حذف تلقائي بعد 24 ساعة** - يتم تشغيله كل ساعة  
✅ **رفع صور محلية** - عبر Data URL (حتى 5MB)  
✅ **رفع صور بالرابط** - من أي URL خارجي  
✅ **حماية كاملة** - فقط المسؤولون يمكنهم إضافة/حذف الصور  
✅ **صور التبليغات دائمة** - لا يتم حذفها أبداً (موجودة في `announ cements`)  

## 📝 ملاحظات مهمة

1. **صور المعرض**: تحذف تلقائياً بعد 24 ساعة
2. **صور التبليغات**: مع خاصية `imageUrl` في التبليغ - لا تحذف أبداً
3. **حجم الصور**: أقصى حد 5MB للصورة المحلية
4. **تنسيقات مدعومة**: JPG, PNG, GIF, WEBP

## 🚀 التشغيل

```bash
node server.js
```

---
**تم بنجاح إضافة نظام معرض الصور الكامل! 🎉**
