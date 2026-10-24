export const IMAGE_IDENTIFICATION_WARNING: string;
export const UNVERIFIED_SAFETY_TEXT: string;
export const VERIFIED_SAFETY_TEXT: string;
export function safetyStatusText(safetyVerified: boolean): string;
export function summarySafetyAccessibilityLabel(fieldName: string, description: string, safetyVerified: boolean): string;
