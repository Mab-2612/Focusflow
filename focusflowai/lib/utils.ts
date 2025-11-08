// lib/util.ts
import { type ClassValue, clsx } from "clsx"
// Removed import: import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  // Simplify to only use clsx, removing the broken twMerge dependency
  return clsx(inputs)
}