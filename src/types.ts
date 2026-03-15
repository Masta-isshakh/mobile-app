export type Role = {
  id: string;
  name: string;
  description?: string | null;
  departmentId?: string | null;
};
export type Department = { id: string; name: string; description?: string | null };
export type Policy = {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string | null;
};
export type AppUser = {
  id: string;
  username: string;
  email: string;
  cognitoUsername?: string | null;
  displayName?: string | null;
  status?: string | null;
  departmentId?: string | null;
  ownerSub?: string | null;
};
export type UserRole = { id: string; userId: string; roleId: string };
export type RolePolicy = {
  id: string;
  roleId: string;
  policyId: string;
  effect?: 'ALLOW' | 'DENY' | null;
};

export type ProductCategoryValue =
  | 'SURVEILLANCE'
  | 'ACCESS_CONTROL'
  | 'SAFETY'
  | 'POWER'
  | 'OTHER';

export type LoyaltyTier = 'MEMBER' | 'SILVER' | 'GOLD' | 'PLATINUM';

export type LoyaltyEntryType = 'EARN' | 'REDEEM' | 'ADJUST';

export type DeliveryMode = 'DELIVERY' | 'SELF_PICKUP';

export type DeliveryStatus = 'DRAFT' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COLLECTED';

export type OrderFulfillmentStatus =
  | 'PAID'
  | 'PACKED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COLLECTED'
  | 'CANCELLED';

export type PaymentMethodValue = 'STRIPE' | 'PAYPAL';

export type WarrantyStatus = 'ACTIVE' | 'EXPIRED' | 'VOID';

export type Product = {
  id: string;
  name: string;
  category?: ProductCategoryValue | null;
  price?: number | null;
  description?: string | null;
  imageDataUrl?: string | null;
  creatorSub: string;
  creatorUsername: string;
  createdAt?: string | null;
};

export type StoreProduct = {
  id: string;
  productId: string;
  ownerSub: string;
  ownerUsername: string;
};

export type ProductRating = {
  id: string;
  productId: string;
  userSub: string;
  score: number;
  comment?: string | null;
};

export type CartItem = {
  id: string;
  productId: string;
  productName: string;
  productPrice?: number | null;
  productImageUrl?: string | null;
  creatorUsername?: string | null;
  quantity: number;
  ownerSub: string;
  ownerUsername: string;
};

export type LoyaltyAccount = {
  id: string;
  ownerSub: string;
  ownerUsername: string;
  pointsBalance?: number | null;
  tier?: LoyaltyTier | null;
  lifetimeSpendQar?: number | null;
  lifetimeOrders?: number | null;
  lastEarnedAt?: string | null;
  lastRedeemedAt?: string | null;
  createdAt?: string | null;
};

export type LoyaltyLedger = {
  id: string;
  ownerSub: string;
  ownerUsername: string;
  orderId?: string | null;
  entryType: LoyaltyEntryType;
  pointsDelta: number;
  description: string;
  tierSnapshot?: LoyaltyTier | null;
  createdAt?: string | null;
};

export type SalesOrder = {
  id: string;
  orderNumber: string;
  ownerSub: string;
  ownerUsername: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  companyName?: string | null;
  qidReference?: string | null;
  deliveryAddress?: string | null;
  deliveryMode: DeliveryMode;
  fulfillmentStatus: OrderFulfillmentStatus;
  paymentMethod: PaymentMethodValue;
  paymentStatus: 'PAID' | 'REFUNDED';
  subtotalQar: number;
  deliveryFeeQar?: number | null;
  loyaltyDiscountQar?: number | null;
  totalQar: number;
  loyaltyPointsEarned?: number | null;
  loyaltyPointsRedeemed?: number | null;
  warrantyCardsIssued?: number | null;
  note?: string | null;
  createdAt?: string | null;
};

export type SalesOrderItem = {
  id: string;
  orderId: string;
  ownerSub: string;
  productId: string;
  productName: string;
  productCategory?: ProductCategoryValue | null;
  creatorUsername?: string | null;
  quantity: number;
  unitPriceQar: number;
  lineTotalQar: number;
  createdAt?: string | null;
};

export type DeliveryNote = {
  id: string;
  orderId: string;
  orderNumber: string;
  ownerSub: string;
  ownerUsername: string;
  noteNumber: string;
  deliveryMode: DeliveryMode;
  status: DeliveryStatus;
  recipientName: string;
  customerPhone: string;
  customerEmail?: string | null;
  deliveryAddress?: string | null;
  companyName?: string | null;
  qidReference?: string | null;
  signatureName?: string | null;
  signedAt?: string | null;
  noteText?: string | null;
  createdAt?: string | null;
};

export type WarrantyCard = {
  id: string;
  orderId: string;
  orderItemId: string;
  ownerSub: string;
  ownerUsername: string;
  cardNumber: string;
  productId: string;
  productName: string;
  productCategory?: ProductCategoryValue | null;
  warrantyMonths: number;
  warrantyStartDate: string;
  warrantyEndDate: string;
  status: WarrantyStatus;
  coverageSummary: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  companyName?: string | null;
  qidReference?: string | null;
  createdAt?: string | null;
};

export type AuthUserContext = {
  sub: string;
  username: string;
  email?: string;
  cognitoUsername?: string;
};

export type PermissionCheck = (resource: string, action: string) => boolean;

export type BottomTabItem = {
  key: string;
  label: string;
  icon?: string;
  subtitle?: string;
};
