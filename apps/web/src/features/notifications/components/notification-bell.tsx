"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMarkNotificationReadMutation, useMyNotificationsQuery } from "../hooks";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data } = useMyNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell className="size-4" />
      </Button>
      {unreadCount > 0 && (
        <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg">
          <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Notifications</p>
          {!data || data.items.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <ul className="mt-1 max-h-80 space-y-1 overflow-y-auto">
              {data.items.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => !notification.readAt && markRead.mutate(notification.id)}
                    className={`w-full rounded-lg p-2 text-left text-sm transition-colors hover:bg-muted ${
                      notification.readAt ? "text-muted-foreground" : "font-medium"
                    }`}
                  >
                    <p>{notification.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{notification.body}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
