"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAdmissionNumber = generateAdmissionNumber;
exports.generatePlayerId = generatePlayerId;
exports.generateBookingNumber = generateBookingNumber;
exports.generateReceiptNumber = generateReceiptNumber;
exports.generateInvoiceNumber = generateInvoiceNumber;
exports.formatIndianCurrency = formatIndianCurrency;
exports.normalizePhone = normalizePhone;
exports.generateWhatsAppLink = generateWhatsAppLink;
function generateAdmissionNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ADM-${year}-${random}`;
}
function generatePlayerId() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `REG-${year}-${random}`;
}
function generateBookingNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `GST-${year}-${random}`;
}
function generateReceiptNumber() {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RCP-${year}${month}-${random}`;
}
function generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
}
function formatIndianCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}
function normalizePhone(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }
    if (!cleaned.startsWith('91') && cleaned.length === 12) {
        cleaned = '91' + cleaned.slice(-10);
    }
    return cleaned;
}
function generateWhatsAppLink(phone, message) {
    const normalized = normalizePhone(phone);
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${normalized}?text=${encoded}`;
}
//# sourceMappingURL=generateId.js.map