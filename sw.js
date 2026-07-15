// ══════════════════════════════════════════
//  Service Worker — كاشير محل أسواق الموسكي
//  الهدف: تخزين شكل الصفحة (HTML/CSS/JS) عشان تفتح حتى من غير نت خالص.
//  البيانات نفسها (المنتجات، الفواتير..) بتتزامن عن طريق Firestore
//  offline persistence، مش عن طريق الملف ده.
// ══════════════════════════════════════════

// غيّري الرقم ده (v2, v3, ...) كل مرة تعدّلي فيها index.html
// عشان تجبري المتصفح يحمّل النسخة الجديدة بدل القديمة المحفوظة
const CACHE_NAME = 'moskey-cashier-v1';

const APP_SHELL = [
  './index.html',
  './manifest.json',
];

// عند التثبيت: نزّل ونخزّن ملفات الصفحة الأساسية
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// عند التفعيل: امسح أي نسخ كاش قديمة من إصدارات سابقة
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// إستراتيجية الجلب: جرّب النت الأول (عشان تاخدي آخر نسخة لو متاحة)،
// ولو فشل (مفيش نت) ارجع للنسخة المحفوظة في الكاش.
self.addEventListener('fetch', event => {
  // بس اطلبات GET (زي تحميل الصفحة والخطوط)، سيب طلبات Firestore/API لحالها
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // خزّن نسخة جديدة من أي ملف نجح تحميله (الصفحة، الخطوط، ملفات فايربيز)
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          // بعض الطلبات (زي فونتس جوجل) بترجع opaque، وده طبيعي ومسموح تخزينه
          cache.put(event.request, copy);
        });
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => {
        if (cached) return cached;
        // لو الصفحة الرئيسية مطلوبة ومفيش كاش، رجّع index.html كحل أخير
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      }))
  );
});
