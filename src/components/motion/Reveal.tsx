"use client";

import type { ReactNode } from "react";

/**
 * Lightweight wrappers — no Framer Motion / scroll observers.
 * Keeps markup stable without janky scroll animations.
 */
export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  return <div className={className}>{children}</div>;
}

export function RevealStagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  return <div className={className}>{children}</div>;
}

export function RevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
