/**
 * PrintDocumentScreen
 *
 * Provides helpers to generate branded PDFs for invoices, delivery notes, and
 * warranty cards, plus direct email and WhatsApp-oriented send actions.
 * render a branded HTML document, convert it to a PDF via expo-print, and then
 * open the system share sheet via expo-sharing so the user can save or forward
 * the file.
 *
 * Usage (call from CommerceCenterScreen):
 *   import { printDeliveryNote, printWarrantyCard } from './PrintDocumentScreen';
 *   await printDeliveryNote(note);
 *   await printWarrantyCard(card);
 */

import { Alert, Linking } from 'react-native';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { DeliveryNote, SalesOrder, SalesOrderItem, WarrantyCard } from '../../types';

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const BRAND_PRIMARY = '#1565C0';
const BRAND_ACCENT = '#F7941D';
const BRAND_TEXT = '#0F172A';
const BRAND_MUTED = '#475569';
const BRAND_SURFACE = '#F1F5F9';
const BRAND_BORDER = '#CBD5E1';

type GeneratedPdfDocument = {
  uri: string;
  html: string;
  title: string;
  fileName: string;
};

type InvoiceDocumentPayload = {
  order: SalesOrder;
  items: SalesOrderItem[];
};

// ─── Shared HTML shell ─────────────────────────────────────────────────────────
function wrapHtml(body: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      color: ${BRAND_TEXT};
      background: #ffffff;
      padding: 40px 48px;
      font-size: 13px;
      line-height: 1.55;
    }
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3px solid ${BRAND_PRIMARY};
      padding-bottom: 18px;
      margin-bottom: 28px;
    }
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .brand-name {
      font-size: 28px;
      font-weight: 900;
      color: ${BRAND_PRIMARY};
      letter-spacing: -0.5px;
    }
    .brand-pill {
      background: ${BRAND_ACCENT};
      color: #ffffff;
      font-size: 12px;
      font-weight: 900;
      border-radius: 999px;
      padding: 3px 9px;
    }
    .doc-type {
      text-align: right;
    }
    .doc-type-label {
      font-size: 18px;
      font-weight: 900;
      color: ${BRAND_PRIMARY};
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .doc-number {
      font-size: 13px;
      color: ${BRAND_MUTED};
      margin-top: 4px;
      font-weight: 700;
    }
    .section {
      margin-bottom: 22px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: ${BRAND_MUTED};
      border-bottom: 1px solid ${BRAND_BORDER};
      padding-bottom: 5px;
      margin-bottom: 12px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px 24px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 14px 24px;
    }
    .field label {
      display: block;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: ${BRAND_MUTED};
      margin-bottom: 3px;
    }
    .field span {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: ${BRAND_TEXT};
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-amber { background: #FEF3C7; color: #92400E; }
    .badge-green { background: #D1FAE5; color: #065F46; }
    .badge-blue  { background: #DBEAFE; color: #1E40AF; }
    .badge-red   { background: #FEE2E2; color: #991B1B; }
    .note-box {
      background: ${BRAND_SURFACE};
      border: 1px solid ${BRAND_BORDER};
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 13px;
      color: ${BRAND_TEXT};
      min-height: 50px;
    }
    .signature-line {
      display: flex;
      align-items: flex-end;
      gap: 24px;
      margin-top: 8px;
    }
    .signature-block {
      flex: 1;
      border-bottom: 1.5px solid ${BRAND_TEXT};
      padding-bottom: 6px;
    }
    .signature-block label {
      display: block;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: ${BRAND_MUTED};
      margin-top: 5px;
    }
    .coverage-box {
      background: #EFF6FF;
      border-left: 4px solid ${BRAND_PRIMARY};
      padding: 10px 14px;
      border-radius: 4px;
      font-size: 13px;
      color: ${BRAND_TEXT};
    }
    .footer {
      margin-top: 36px;
      border-top: 1px solid ${BRAND_BORDER};
      padding-top: 14px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: ${BRAND_MUTED};
      font-weight: 600;
    }
    @media print {
      body { padding: 24px 30px; }
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <div class="brand-logo">
      <span class="brand-name">JAMA</span>
      <span class="brand-pill">GO</span>
    </div>
    <div class="doc-type">
      ${body.includes('doc-type-label') ? '' : `<div class="doc-type-label">${title}</div>`}
    </div>
  </div>
  ${body}
  <div class="footer">
    <span>JAMA GO — Trusted Commerce Platform</span>
    <span>Generated ${new Date().toLocaleDateString('en-QA', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
  </div>
</body>
</html>`;
}

// ─── Date formatter ────────────────────────────────────────────────────────────
function fmtDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-QA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-QA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtQar(value?: number | null): string {
  const amount = value ?? 0;
  return new Intl.NumberFormat('en-QA', {
    style: 'currency',
    currency: 'QAR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function esc(value?: string | null): string {
  if (!value) return '—';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Status helpers ────────────────────────────────────────────────────────────
function deliveryBadgeClass(status: string): string {
  switch (status) {
    case 'DELIVERED':
    case 'COLLECTED':
      return 'badge-green';
    case 'OUT_FOR_DELIVERY':
      return 'badge-blue';
    case 'PACKED':
      return 'badge-amber';
    default:
      return 'badge-amber';
  }
}

function warrantyBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'badge-green';
    case 'EXPIRED':
      return 'badge-amber';
    case 'VOID':
      return 'badge-red';
    default:
      return 'badge-blue';
  }
}

function normalizePhoneForWhatsApp(value?: string | null): string {
  if (!value) return '';
  const digits = value.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits.slice(1) : digits;
}

async function buildPdfDocument(title: string, fileName: string, html: string): Promise<GeneratedPdfDocument> {
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return {
    uri,
    html,
    title,
    fileName,
  };
}

async function sharePdfDocument(document: GeneratedPdfDocument): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(document.uri, {
      mimeType: 'application/pdf',
      dialogTitle: document.title,
      UTI: 'com.adobe.pdf',
    });
    return;
  }
  await Print.printAsync({ html: document.html });
}

async function sendPdfByEmail(document: GeneratedPdfDocument, recipientEmail: string | null | undefined, subject: string, body: string): Promise<void> {
  const email = recipientEmail?.trim();
  if (!email) {
    Alert.alert('Email missing', 'This customer record does not include an email address yet.');
    return;
  }

  const canCompose = await MailComposer.isAvailableAsync();
  if (!canCompose) {
    Alert.alert('Email unavailable', 'No email client is configured on this device.');
    return;
  }

  await MailComposer.composeAsync({
    recipients: [email],
    subject,
    body,
    attachments: [document.uri],
  });
}

async function openWhatsAppWithMessage(phone: string | null | undefined, message: string): Promise<void> {
  const normalizedPhone = normalizePhoneForWhatsApp(phone);
  const whatsappUrl = normalizedPhone
    ? `whatsapp://send?phone=${encodeURIComponent(normalizedPhone)}&text=${encodeURIComponent(message)}`
    : `whatsapp://send?text=${encodeURIComponent(message)}`;

  const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
  if (canOpenWhatsApp) {
    await Linking.openURL(whatsappUrl);
    return;
  }

  const webUrl = normalizedPhone
    ? `https://wa.me/${encodeURIComponent(normalizedPhone)}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  await Linking.openURL(webUrl);
}

async function sendPdfByWhatsApp(_document: GeneratedPdfDocument, phone: string | null | undefined, message: string): Promise<void> {
  await openWhatsAppWithMessage(phone, message);
}

function buildInvoiceHtml({ order, items }: InvoiceDocumentPayload): string {
  const lineItemsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 8px; border-bottom:1px solid ${BRAND_BORDER};">${esc(item.productName)}</td>
          <td style="padding:10px 8px; border-bottom:1px solid ${BRAND_BORDER};">${esc(item.productCategory?.replace('_', ' '))}</td>
          <td style="padding:10px 8px; border-bottom:1px solid ${BRAND_BORDER}; text-align:center;">${item.quantity}</td>
          <td style="padding:10px 8px; border-bottom:1px solid ${BRAND_BORDER}; text-align:right;">${fmtQar(item.unitPriceQar)}</td>
          <td style="padding:10px 8px; border-bottom:1px solid ${BRAND_BORDER}; text-align:right;">${fmtQar(item.lineTotalQar)}</td>
        </tr>
      `,
    )
    .join('');

  const body = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px;">
      <div>
        <div class="doc-type-label" style="font-size:20px; font-weight:900; color:${BRAND_PRIMARY}; text-transform:uppercase; letter-spacing:1px;">Sales Invoice</div>
        <div class="doc-number" style="font-size:13px; color:${BRAND_MUTED}; font-weight:700; margin-top:4px;">${esc(order.orderNumber)}</div>
      </div>
      <span class="status-badge badge-blue">${esc(order.fulfillmentStatus.replace(/_/g, ' '))}</span>
    </div>

    <div class="section">
      <div class="section-title">Customer Details</div>
      <div class="grid-3">
        <div class="field"><label>Customer</label><span>${esc(order.customerName)}</span></div>
        <div class="field"><label>Phone</label><span>${esc(order.customerPhone)}</span></div>
        ${order.customerEmail ? `<div class="field"><label>Email</label><span>${esc(order.customerEmail)}</span></div>` : ''}
        <div class="field"><label>Payment</label><span>${esc(order.paymentMethod)}</span></div>
        <div class="field"><label>Delivery</label><span>${esc(order.deliveryMode.replace(/_/g, ' '))}</span></div>
        <div class="field"><label>Issued On</label><span>${fmtDateTime(order.createdAt)}</span></div>
        ${order.companyName ? `<div class="field"><label>Company</label><span>${esc(order.companyName)}</span></div>` : ''}
        ${order.qidReference ? `<div class="field"><label>QID / Ref</label><span>${esc(order.qidReference)}</span></div>` : ''}
      </div>
      ${order.deliveryAddress ? `<div style="margin-top:12px;"><div class="field"><label>Delivery Address</label><span>${esc(order.deliveryAddress)}</span></div></div>` : ''}
    </div>

    <div class="section">
      <div class="section-title">Line Items</div>
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr style="background:${BRAND_SURFACE}; color:${BRAND_MUTED}; text-transform:uppercase; letter-spacing:0.5px;">
            <th style="text-align:left; padding:10px 8px;">Product</th>
            <th style="text-align:left; padding:10px 8px;">Category</th>
            <th style="text-align:center; padding:10px 8px;">Qty</th>
            <th style="text-align:right; padding:10px 8px;">Unit</th>
            <th style="text-align:right; padding:10px 8px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml || `<tr><td colspan="5" style="padding:14px 8px; color:${BRAND_MUTED};">No line items were found for this invoice.</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Financial Summary</div>
      <div class="grid-2">
        <div class="field"><label>Subtotal</label><span>${fmtQar(order.subtotalQar)}</span></div>
        <div class="field"><label>Delivery Fee</label><span>${fmtQar(order.deliveryFeeQar ?? 0)}</span></div>
        <div class="field"><label>Loyalty Discount</label><span>${fmtQar(-(order.loyaltyDiscountQar ?? 0))}</span></div>
        <div class="field"><label>Total Paid</label><span>${fmtQar(order.totalQar)}</span></div>
      </div>
      ${order.note ? `<div style="margin-top:12px;"><div class="note-box">${esc(order.note)}</div></div>` : ''}
    </div>
  `;

  return wrapHtml(body, `Sales Invoice — ${order.orderNumber}`);
}

// ─── Delivery Note HTML ────────────────────────────────────────────────────────
function buildDeliveryNoteHtml(note: DeliveryNote): string {
  const body = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px;">
      <div>
        <div class="doc-type-label" style="font-size:20px; font-weight:900; color:${BRAND_PRIMARY}; text-transform:uppercase; letter-spacing:1px;">Delivery Note</div>
        <div class="doc-number" style="font-size:13px; color:${BRAND_MUTED}; font-weight:700; margin-top:4px;">${esc(note.noteNumber)}</div>
      </div>
      <span class="status-badge ${deliveryBadgeClass(note.status)}">${note.status.replace(/_/g, ' ')}</span>
    </div>

    <div class="section">
      <div class="section-title">Order Reference</div>
      <div class="grid-2">
        <div class="field"><label>Order Number</label><span>${esc(note.orderNumber)}</span></div>
        <div class="field"><label>Delivery Mode</label><span>${note.deliveryMode.replace('_', ' ')}</span></div>
        <div class="field"><label>Issue Date</label><span>${fmtDateTime(note.createdAt)}</span></div>
        ${note.signedAt ? `<div class="field"><label>Signed On</label><span>${fmtDateTime(note.signedAt)}</span></div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Recipient Details</div>
      <div class="grid-3">
        <div class="field"><label>Full Name</label><span>${esc(note.recipientName)}</span></div>
        <div class="field"><label>Phone</label><span>${esc(note.customerPhone)}</span></div>
        ${note.customerEmail ? `<div class="field"><label>Email</label><span>${esc(note.customerEmail)}</span></div>` : ''}
        ${note.companyName ? `<div class="field"><label>Company</label><span>${esc(note.companyName)}</span></div>` : ''}
        ${note.qidReference ? `<div class="field"><label>QID Reference</label><span>${esc(note.qidReference)}</span></div>` : ''}
        ${note.ownerUsername ? `<div class="field"><label>Account</label><span>${esc(note.ownerUsername)}</span></div>` : ''}
      </div>
      ${note.deliveryAddress ? `
        <div style="margin-top:12px;">
          <div class="field"><label>Delivery Address</label><span>${esc(note.deliveryAddress)}</span></div>
        </div>
      ` : ''}
    </div>

    <div class="section">
      <div class="section-title">Delivery Instructions</div>
      <div class="note-box">${esc(note.noteText) || 'No specific delivery instructions recorded.'}</div>
    </div>

    <div class="section">
      <div class="section-title">Acknowledgment &amp; Signature</div>
      <p style="font-size:12px; color:${BRAND_MUTED}; margin-bottom:16px; line-height:1.6;">
        By signing below, the recipient confirms that all items listed in order
        <strong>${esc(note.orderNumber)}</strong> have been received in good condition.
      </p>
      <div class="signature-line">
        <div class="signature-block">
          <span style="font-size:16px; font-weight:800; color:${BRAND_TEXT};">${esc(note.signatureName) || '&nbsp;'}</span>
          <label>Recipient Signature / Name</label>
        </div>
        <div class="signature-block">
          <span style="font-size:14px; font-weight:700; color:${BRAND_TEXT};">${note.signedAt ? fmtDate(note.signedAt) : '&nbsp;'}</span>
          <label>Date</label>
        </div>
        <div class="signature-block">
          <span style="font-size:14px; font-weight:700; color:${BRAND_TEXT};">&nbsp;</span>
          <label>JAMA GO Agent Stamp</label>
        </div>
      </div>
    </div>
  `;

  return wrapHtml(body, `Delivery Note — ${note.noteNumber}`);
}

// ─── Warranty Card HTML ────────────────────────────────────────────────────────
function buildWarrantyCardHtml(card: WarrantyCard): string {
  const body = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px;">
      <div>
        <div class="doc-type-label" style="font-size:20px; font-weight:900; color:${BRAND_PRIMARY}; text-transform:uppercase; letter-spacing:1px;">Warranty Certificate</div>
        <div class="doc-number" style="font-size:13px; color:${BRAND_MUTED}; font-weight:700; margin-top:4px;">${esc(card.cardNumber)}</div>
      </div>
      <span class="status-badge ${warrantyBadgeClass(card.status)}">${card.status}</span>
    </div>

    <div class="section">
      <div class="section-title">Product Information</div>
      <div class="grid-3">
        <div class="field"><label>Product Name</label><span>${esc(card.productName)}</span></div>
        <div class="field"><label>Category</label><span>${esc(card.productCategory?.replace('_', ' ')) || '—'}</span></div>
        <div class="field"><label>Order Reference</label><span>${esc(card.orderId?.slice(0, 12))}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Warranty Period</div>
      <div class="grid-3">
        <div class="field"><label>Duration</label><span>${card.warrantyMonths} months</span></div>
        <div class="field"><label>Start Date</label><span>${fmtDate(card.warrantyStartDate)}</span></div>
        <div class="field"><label>End Date</label><span>${fmtDate(card.warrantyEndDate)}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Coverage Summary</div>
      <div class="coverage-box">${esc(card.coverageSummary)}</div>
    </div>

    <div class="section">
      <div class="section-title">Certificate Holder</div>
      <div class="grid-3">
        <div class="field"><label>Full Name</label><span>${esc(card.customerName)}</span></div>
        <div class="field"><label>Phone</label><span>${esc(card.customerPhone)}</span></div>
        ${card.customerEmail ? `<div class="field"><label>Email</label><span>${esc(card.customerEmail)}</span></div>` : ''}
        ${card.companyName ? `<div class="field"><label>Company</label><span>${esc(card.companyName)}</span></div>` : ''}
        ${card.qidReference ? `<div class="field"><label>QID Reference</label><span>${esc(card.qidReference)}</span></div>` : ''}
        <div class="field"><label>Issued On</label><span>${fmtDate(card.createdAt)}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Terms</div>
      <p style="font-size:11.5px; color:${BRAND_MUTED}; line-height:1.7;">
        This warranty certificate is issued by JAMA GO and covers manufacturing defects under normal operating
        conditions for the duration stated above. Coverage does not extend to physical damage, water ingress,
        unauthorised modifications, or consumable parts. To make a warranty claim, present this certificate along
        with your original order confirmation to any authorised JAMA GO service point.
      </p>
    </div>

    <div style="margin-top:24px; display:flex; align-items:flex-end; justify-content:space-between;">
      <div class="signature-block" style="width:220px; border-bottom:1.5px solid ${BRAND_TEXT}; padding-bottom:6px;">
        <span style="font-size:16px; font-weight:900; color:${BRAND_PRIMARY};">JAMA GO</span>
        <label style="display:block; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.6px; color:${BRAND_MUTED}; margin-top:5px;">Authorised Issuer</label>
      </div>
      <div style="text-align:right; font-size:11px; color:${BRAND_MUTED}; font-weight:700;">
        <div>Card: ${esc(card.cardNumber)}</div>
        <div>Valid until ${fmtDate(card.warrantyEndDate)}</div>
      </div>
    </div>
  `;

  return wrapHtml(body, `Warranty Certificate — ${card.cardNumber}`);
}

// ─── Public API ────────────────────────────────────────────────────────────────
export async function generateInvoicePdf(payload: InvoiceDocumentPayload): Promise<GeneratedPdfDocument> {
  const html = buildInvoiceHtml(payload);
  return buildPdfDocument(`Invoice — ${payload.order.orderNumber}`, `invoice-${payload.order.orderNumber}.pdf`, html);
}

export async function generateDeliveryNotePdf(note: DeliveryNote): Promise<GeneratedPdfDocument> {
  const html = buildDeliveryNoteHtml(note);
  return buildPdfDocument(`Delivery Note — ${note.noteNumber}`, `delivery-note-${note.noteNumber}.pdf`, html);
}

export async function generateWarrantyCardPdf(card: WarrantyCard): Promise<GeneratedPdfDocument> {
  const html = buildWarrantyCardHtml(card);
  return buildPdfDocument(`Warranty Certificate — ${card.cardNumber}`, `warranty-${card.cardNumber}.pdf`, html);
}

export async function printDeliveryNote(note: DeliveryNote): Promise<void> {
  const document = await generateDeliveryNotePdf(note);
  await sharePdfDocument(document);
}

export async function printWarrantyCard(card: WarrantyCard): Promise<void> {
  const document = await generateWarrantyCardPdf(card);
  await sharePdfDocument(document);
}

export async function printInvoice(payload: InvoiceDocumentPayload): Promise<void> {
  const document = await generateInvoicePdf(payload);
  await sharePdfDocument(document);
}

export async function sendInvoiceByEmail(payload: InvoiceDocumentPayload): Promise<void> {
  const document = await generateInvoicePdf(payload);
  await sendPdfByEmail(
    document,
    payload.order.customerEmail,
    `Invoice ${payload.order.orderNumber} from JAMA GO`,
    `Dear ${payload.order.customerName},\n\nPlease find attached your invoice ${payload.order.orderNumber}. Thank you for choosing JAMA GO.\n\nRegards,\nJAMA GO`,
  );
}

export async function sendWarrantyByEmail(card: WarrantyCard): Promise<void> {
  const document = await generateWarrantyCardPdf(card);
  await sendPdfByEmail(
    document,
    card.customerEmail,
    `Warranty Certificate ${card.cardNumber} from JAMA GO`,
    `Dear ${card.customerName},\n\nPlease find attached your warranty certificate ${card.cardNumber} for ${card.productName}.\n\nRegards,\nJAMA GO`,
  );
}

export async function sendInvoiceByWhatsApp(payload: InvoiceDocumentPayload): Promise<void> {
  const document = await generateInvoicePdf(payload);
  await sendPdfByWhatsApp(
    document,
    payload.order.customerPhone,
    `Hello ${payload.order.customerName}, your JAMA GO invoice ${payload.order.orderNumber} is ready. Total paid: ${fmtQar(payload.order.totalQar)}.`,
  );
}

export async function sendWarrantyByWhatsApp(card: WarrantyCard): Promise<void> {
  const document = await generateWarrantyCardPdf(card);
  await sendPdfByWhatsApp(
    document,
    card.customerPhone,
    `Hello ${card.customerName}, your JAMA GO warranty certificate ${card.cardNumber} for ${card.productName} is ready and valid until ${fmtDate(card.warrantyEndDate)}.`,
  );
}
