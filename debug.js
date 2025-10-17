// ملف تصحيح الأخطاء - يمكن حذفه لاحقاً

// فحص الـ API endpoints
async function checkNetlifyHealth() {
  try {
    console.log('🔍 فحص اتصال Netlify Functions...');
    const response = await fetch('/api/health');
    const data = await response.json();
    console.log('✅ صحة API:', data);
    return true;
  } catch (error) {
    console.error('❌ خطأ في API:', error);
    return false;
  }
}

// فحص تحميل التبليغات
async function checkAnnouncements() {
  try {
    console.log('🔍 فحص تحميل التبليغات...');
    const response = await fetch('/api/announcements');
    const data = await response.json();
    console.log('✅ التبليغات:', data);
    return true;
  } catch (error) {
    console.error('❌ خطأ في التبليغات:', error);
    return false;
  }
}

// فحص الأنيميشن
function checkAnimation() {
  console.log('🔍 فحص الأنيميشن...');
  const shapes = document.querySelectorAll('.shape');
  if (shapes.length > 0) {
    console.log(`✅ وجد ${shapes.length} أشكال متحركة`);
    
    // فحص تطبيق الأنيميشن
    shapes.forEach((shape, index) => {
      const computedStyle = window.getComputedStyle(shape);
      const animation = computedStyle.animationName;
      console.log(`شكل ${index + 1}: ${animation}`);
    });
    return true;
  } else {
    console.error('❌ لم يتم العثور على أشكال متحركة');
    return false;
  }
}

// تشغيل جميع الفحوصات
async function runAllChecks() {
  console.log('🚀 بدء فحص شامل للموقع...');
  
  const healthCheck = await checkNetlifyHealth();
  const announcementsCheck = await checkAnnouncements(); 
  const animationCheck = checkAnimation();
  
  console.log('📊 نتائج الفحص:');
  console.log(`- صحة API: ${healthCheck ? '✅' : '❌'}`);
  console.log(`- التبليغات: ${announcementsCheck ? '✅' : '❌'}`);
  console.log(`- الأنيميشن: ${animationCheck ? '✅' : '❌'}`);
  
  if (!healthCheck) {
    console.log('💡 حل مشكلة API: تأكد من رفع netlify/functions/api.js');
  }
  
  if (!announcementsCheck) {
    console.log('💡 حل مشكلة التبليغات: فحص API key و Bin IDs');
  }
  
  if (!animationCheck) {
    console.log('💡 حل مشكلة الأنيميشن: فحص تحميل CSS و .bg-shapes elements');
  }
}

// تشغيل عند تحميل الصفحة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAllChecks);
} else {
  runAllChecks();
}