"use client";

import React, { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  side?: "top" | "bottom";
  delay?: number;
}

export function Tooltip({
  content,
  children,
  className,
  side = "top",
  delay = 50,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    actualSide: "top" | "bottom";
  } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    let actualSide = side;
    // Flip to bottom if there isn't enough clearance above
    if (side === "top" && rect.top < 50) {
      actualSide = "bottom";
    }

    setCoords({
      top: actualSide === "top" ? rect.top - 7 : rect.bottom + 7,
      left: rect.left,
      actualSide,
    });
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsOpen(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => setIsOpen(false);
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, [isOpen]);

  if (!content) return <>{children}</>;

  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const tooltipLeft = coords ? Math.max(12, Math.min(coords.left, windowWidth - 300)) : 12;
  const arrowLeft = coords ? Math.max(10, Math.min(coords.left - tooltipLeft + 16, 260)) : 16;

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("block max-w-full min-w-0", className)}
      title={typeof content === "string" ? content : undefined}
    >
      {children}
      {mounted &&
        isOpen &&
        coords &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: coords.top,
              left: tooltipLeft,
              transform: coords.actualSide === "top" ? "translateY(-100%)" : "translateY(0)",
            }}
            className="pointer-events-none z-[99999] w-max max-w-[280px] sm:max-w-xs rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-xl transition-opacity duration-150 animate-in fade-in"
          >
            <div className="relative break-words leading-snug">{content}</div>
            <span
              style={{ left: arrowLeft }}
              className={cn(
                "absolute h-0 w-0 border-4 border-transparent",
                coords.actualSide === "top"
                  ? "top-full -mt-0.5 border-t-slate-900"
                  : "bottom-full -mb-0.5 border-b-slate-900"
              )}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
