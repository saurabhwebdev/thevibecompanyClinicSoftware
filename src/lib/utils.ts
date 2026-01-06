import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format an ID with a prefix and padded number
 * @param prefix - The prefix for the ID (e.g., "INV", "PAY")
 * @param number - The number to pad
 * @param padding - The number of digits to pad to (default: 4)
 * @returns Formatted ID string (e.g., "INV-0001")
 */
export function formatId(prefix: string, number: number, padding: number = 4): string {
  return `${prefix}-${String(number).padStart(padding, "0")}`;
}
