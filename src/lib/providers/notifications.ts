import type {
  NotificationMessage,
  NotificationProvider,
  NotificationResult,
} from "./types";

const sentNotificationsLog: Array<
  NotificationMessage & { id: string; sentAt: string }
> = [];

export function getRecentMockNotifications() {
  return [...sentNotificationsLog].slice(-50).reverse();
}

export class BeninNotificationProvider implements NotificationProvider {
  async send(msg: NotificationMessage): Promise<NotificationResult> {
    const mode = process.env.NOTIFICATION_PROVIDER ?? "mock";
    const messageId = `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Si une passerelle SMS/WhatsApp Bénin est configurée (FasterMessage, Termii, InfoBip, WhatsApp Cloud API)
    if (mode === "webhook" && process.env.SMS_WEBHOOK_URL) {
      try {
        const res = await fetch(process.env.SMS_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(process.env.SMS_API_KEY
              ? { Authorization: `Bearer ${process.env.SMS_API_KEY}` }
              : {}),
          },
          body: JSON.stringify({
            to: msg.to,
            channel: msg.channel,
            sender: process.env.SMS_SENDER_ID || "LoyerClair",
            text: msg.message,
            metadata: msg.metadata,
          }),
        });

        if (res.ok) {
          return {
            delivered: true,
            provider: "benin-gateway",
            messageId,
            channel: msg.channel,
          };
        }
      } catch (err) {
        console.warn("[LoyerClair Notifications] Fallback console après erreur passerelle:", err);
      }
    }

    // Mode Mock / Console (fonctionne sans aucune clé externe)
    sentNotificationsLog.push({
      ...msg,
      id: messageId,
      sentAt: new Date().toISOString(),
    });

    console.info(
      `[LoyerClair ${msg.channel.toUpperCase()}] -> ${msg.to} : ${msg.message}`
    );

    return {
      delivered: true,
      provider: "mock-console",
      messageId,
      channel: msg.channel,
    };
  }
}
