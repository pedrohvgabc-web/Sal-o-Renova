import webpush from "web-push";
import { deletePushSubscription, getPushSubscriptions } from "./db";

export const PUSH_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "BFUusNUn0ShPcNO3zGVtzqEemT-jY2DYBP9NIH6aDHh1uJIDRERWUd5ACoxcDYK0cfb_ujoMrWac6gQyOx7rG2M";
const PUSH_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "14X-PI4BK8O2PDUJuWQGBd1ASm3OEv9Af8SIxWGb2Vc";
webpush.setVapidDetails("mailto:renova.salao@example.com", PUSH_PUBLIC_KEY, PUSH_PRIVATE_KEY);

export async function sendPushToAll(payload: { title: string; body: string; url?: string }) {
  const subscriptions = await getPushSubscriptions();
  await Promise.allSettled(subscriptions.map(async subscription => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload));
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) await deletePushSubscription(subscription.endpoint);
      else console.warn("[Push] Falha ao enviar notificação:", error?.message ?? error);
    }
  }));
}
