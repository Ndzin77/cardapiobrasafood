import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface UsePushNotificationsOptions {
  storeId: string | undefined;
  userId: string | undefined;
  enabled?: boolean;
}

export function usePushNotifications({ storeId, userId, enabled = true }: UsePushNotificationsOptions) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!storeId || !userId || !enabled) return;
    if (!VAPID_PUBLIC_KEY) {
      console.warn("[PushNotifications] VITE_VAPID_PUBLIC_KEY not set, skipping push registration");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("[PushNotifications] Push not supported in this browser");
      return;
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        // @ts-ignore - pushManager exists at runtime when PushManager is supported
        let subscription = await registration.pushManager.getSubscription();

        // Se não existir ou expirou, cria nova
        if (!subscription) {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            console.log("[PushNotifications] Permission denied");
            return;
          }

          // @ts-ignore - pushManager exists at runtime when PushManager is supported
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
          });
        }

        const subJson = subscription.toJSON();

        // Salva/atualiza subscription no Supabase
        // @ts-ignore - push_subscriptions table exists in Supabase
        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            store_id: storeId,
            user_id: userId,
            endpoint: subJson.endpoint,
            keys_p256dh: subJson.keys?.p256dh || "",
            keys_auth: subJson.keys?.auth || "",
          },
          { onConflict: "endpoint" }
        );

        if (error) {
          console.error("[PushNotifications] Failed to save subscription:", error);
        } else {
          console.log("[PushNotifications] Subscription registered successfully");
          registeredRef.current = true;
        }
      } catch (err) {
        console.error("[PushNotifications] Registration failed:", err);
      }
    };

    register();

    // Verifica a cada 24h se precisa re-subscrever
    const interval = setInterval(async () => {
      if (!registeredRef.current) return;
      try {
        const registration = await navigator.serviceWorker.ready;
        // @ts-ignore - pushManager exists at runtime
        const sub = await registration.pushManager.getSubscription();
        if (!sub) {
          console.log("[PushNotifications] Subscription expired, re-subscribing...");
          registeredRef.current = false;
          register();
        }
      } catch {}
    }, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [storeId, userId, enabled]);
}
