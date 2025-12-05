import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  pending: 'Ожидает подтверждения',
  accepted: 'Принят в работу',
  ready: 'Готов к выдаче',
  completed: 'Выдан',
  cancelled: 'Отменён'
};

export const useOrderNotifications = (telegramUserId?: string | number) => {
  const { toast } = useToast();

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.log("Browser doesn't support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }, []);

  // Show notification
  const showNotification = useCallback((title: string, body: string, icon?: string) => {
    // In-app toast
    toast({
      title,
      description: body,
    });

    // Browser notification if permitted
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: icon || "/favicon.svg",
          tag: "order-status",
        });
      } catch (e) {
        console.log("Notification failed:", e);
      }
    }

    // Vibration for mobile
    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }, [toast]);

  // Subscribe to order updates
  useEffect(() => {
    if (!telegramUserId) return;

    // Request permission on mount
    requestPermission();

    const channel = supabase
      .channel(`order-notifications-${telegramUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `telegram_user_id=eq.${telegramUserId}`
        },
        (payload) => {
          const newOrder = payload.new as any;
          const oldOrder = payload.old as any;

          // Only notify if status changed
          if (newOrder.status !== oldOrder.status) {
            const statusLabel = statusLabels[newOrder.status] || newOrder.status;
            showNotification(
              "Статус заказа обновлён",
              `Ваш заказ: ${statusLabel}`,
              "/favicon.svg"
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [telegramUserId, requestPermission, showNotification]);

  return {
    requestPermission,
    showNotification,
  };
};
