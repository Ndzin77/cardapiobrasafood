// Service Worker for Web Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  let data = {
    title: '🛒 Novo Pedido!',
    body: 'Você recebeu um novo pedido.',
    url: '/admin/orders',
    image: null,
    orderId: null,
  };

  try {
    if (event.data) {
      try {
        data = { ...data, ...event.data.json() };
      } catch {
        data.body = event.data.text();
      }
    }
  } catch (e) {
    console.warn('[SW] Could not parse push data:', e);
  }

  // Use unique tag per order to avoid grouping/spam behavior
  const tag = data.orderId ? `order-${data.orderId}` : `order-${Date.now()}`;

  const options = {
    body: data.body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    silent: false,
    data: { url: data.url || '/admin/orders' },
    actions: [
      { action: 'open', title: '📋 Ver Pedido' },
    ],
    ...(data.image ? { image: data.image } : {}),
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const url = event.notification.data?.url || '/admin/orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Try to focus existing admin tab
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
