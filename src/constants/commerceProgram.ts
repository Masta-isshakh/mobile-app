import type { LoyaltyTier, ProductCategoryValue } from '../types';

export const LOYALTY_EARN_DIVISOR_QAR = 5;
export const LOYALTY_REDEMPTION_BLOCK_POINTS = 100;
export const LOYALTY_REDEMPTION_BLOCK_VALUE_QAR = 10;

export const WARRANTY_MONTHS_BY_CATEGORY: Record<ProductCategoryValue, number> = {
  SURVEILLANCE: 24,
  ACCESS_CONTROL: 18,
  SAFETY: 12,
  POWER: 12,
  OTHER: 6,
};

export const CATEGORY_LABELS: Record<ProductCategoryValue, string> = {
  SURVEILLANCE: 'Surveillance',
  ACCESS_CONTROL: 'Access Control',
  SAFETY: 'Safety',
  POWER: 'Power',
  OTHER: 'Other',
};

export function getProductCategoryLabel(category: ProductCategoryValue | null | undefined): string {
  return CATEGORY_LABELS[category ?? 'OTHER'];
}

export function getWarrantyMonths(category: ProductCategoryValue | null | undefined): number {
  return WARRANTY_MONTHS_BY_CATEGORY[category ?? 'OTHER'];
}

export function getWarrantyCoverageSummary(category: ProductCategoryValue | null | undefined): string {
  switch (category ?? 'OTHER') {
    case 'SURVEILLANCE':
      return 'Covers surveillance hardware defects and internal component failure under standard installation conditions.';
    case 'ACCESS_CONTROL':
      return 'Covers access-control hardware defects, reader faults, and electronic lock manufacturing issues.';
    case 'SAFETY':
      return 'Covers manufacturer defects on safety hardware and approved protective equipment components.';
    case 'POWER':
      return 'Covers power-system component defects, adapter faults, and approved electrical accessory failures.';
    default:
      return 'Covers manufacturing defects under normal commercial use and approved installation conditions.';
  }
}

export function calculateEarnedPoints(subtotalQar: number): number {
  return Math.max(0, Math.floor(subtotalQar / LOYALTY_EARN_DIVISOR_QAR));
}

export function calculateRedeemableDiscount(points: number): number {
  return Math.floor(points / LOYALTY_REDEMPTION_BLOCK_POINTS) * LOYALTY_REDEMPTION_BLOCK_VALUE_QAR;
}

export function getRedeemablePointOptions(pointsBalance: number, subtotalQar: number): number[] {
  const maxByBalance = Math.floor(pointsBalance / LOYALTY_REDEMPTION_BLOCK_POINTS) * LOYALTY_REDEMPTION_BLOCK_POINTS;
  const maxBySubtotal = Math.floor(subtotalQar / LOYALTY_REDEMPTION_BLOCK_VALUE_QAR) * LOYALTY_REDEMPTION_BLOCK_POINTS;
  const maxPoints = Math.max(0, Math.min(maxByBalance, maxBySubtotal));
  const options = [0];

  for (let points = LOYALTY_REDEMPTION_BLOCK_POINTS; points <= maxPoints; points += LOYALTY_REDEMPTION_BLOCK_POINTS) {
    options.push(points);
  }

  return options;
}

export function determineLoyaltyTier(lifetimeSpendQar: number): LoyaltyTier {
  if (lifetimeSpendQar >= 15000) {
    return 'PLATINUM';
  }
  if (lifetimeSpendQar >= 7000) {
    return 'GOLD';
  }
  if (lifetimeSpendQar >= 2000) {
    return 'SILVER';
  }
  return 'MEMBER';
}

export function getTierBenefits(tier: LoyaltyTier): string {
  switch (tier) {
    case 'PLATINUM':
      return 'Priority support, premium service handling, and top loyalty recognition.';
    case 'GOLD':
      return 'Faster service priority, strong loyalty rewards, and preferred customer status.';
    case 'SILVER':
      return 'Enhanced member recognition and better long-term reward acceleration.';
    default:
      return 'Earn points on every completed purchase and start building your membership value.';
  }
}

export function buildOrderNumber(): string {
  const stamp = Date.now().toString().slice(-8);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `JGO-${stamp}-${suffix}`;
}

export function buildDeliveryNoteNumber(): string {
  const stamp = Date.now().toString().slice(-7);
  return `DN-${stamp}`;
}

export function buildWarrantyCardNumber(): string {
  const stamp = Date.now().toString().slice(-7);
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `WC-${stamp}-${suffix}`;
}

export function addMonths(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}
