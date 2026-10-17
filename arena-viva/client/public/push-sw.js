self.addEventListener("push", event => {
  let data = { title: "Renova", body: "Você tem uma nova atualização.", url: "/" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/manus-storage/renova-favicon-source_54f0a92b.png", badge: "/manus-storage/renova-favicon-source_54f0a92b.png", data: { url: data.url }, tag: "renova-agendamento" }));
});
self.addEventListener("notificationclick", event => { event.notification.close(); event.waitUntil(clients.openWindow(event.notification.data?.url || "/")); });
