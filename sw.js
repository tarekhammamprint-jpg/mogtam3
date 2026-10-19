// ============================================================
//  Service Worker — sw.js
//  يستقبل Push Notifications ويعرضها حتى لو المتصفح مغلق
//  ضعه في جذر المشروع (نفس مجلد index.html)
// ============================================================

self.addEventListener('install', e => {
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(clients.claim());
});

// استقبال Push من الخادم
self.addEventListener('push', e => {
    let data = {};
    try { data = e.data.json(); } catch(_) { data = { title: 'مجتمعنا', body: e.data?.text() || 'رسالة جديدة' }; }

    e.waitUntil(
        self.registration.showNotification(data.title || 'مجتمعنا 💬', {
            body   : data.body  || 'لديك رسالة جديدة',
            icon   : data.icon  || '/mogtam3/icon-192.png',
            badge  : data.badge || '/mogtam3/icon-192.png',
            image  : data.image || null,
            tag    : data.tag   || 'chat-msg',
            renotify: true,
            vibrate: [200, 100, 200],
            data   : { url: data.url || '/mogtam3/' }
        })
    );
});

// النقر على الإشعار يفتح التطبيق
self.addEventListener('notificationclick', e => {
    e.notification.close();
    const url = e.notification.data?.url || '/mogtam3/';
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes('mogtam3') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

// رسائل من الصفحة الرئيسية
self.addEventListener('message', e => {
    if (e.data?.type === 'SHOW_NOTIFICATION') {
        self.registration.showNotification(e.data.title, {
            body   : e.data.body,
            icon   : e.data.icon || '/mogtam3/icon-192.png',
            tag    : 'chat-' + Date.now(),
            renotify: true,
            vibrate: [150, 50, 150],
            data   : { url: '/mogtam3/' }
        });
    }
});
