import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Track a visitor on the public storefront.
 * Call this in the storefront page to register the visitor's presence.
 */
export function useTrackVisitor(storeSlug: string | undefined) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!storeSlug) return;

    const channel = supabase.channel(`store-presence-${storeSlug}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [storeSlug]);
}

/**
 * Get the count of visitors currently viewing a store.
 * Call this in the admin dashboard.
 */
export function useVisitorCount(storeSlug: string | undefined) {
  const [count, setCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!storeSlug) return;

    const channel = supabase.channel(`store-presence-${storeSlug}`);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const total = Object.keys(state).length;
        setCount(total);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [storeSlug]);

  return count;
}
