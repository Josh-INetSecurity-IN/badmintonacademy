"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReminderTemplate = exports.getDashboardNotifications = exports.getUnreadCount = exports.markAllRead = exports.markRead = exports.getNotifications = exports.createNotification = void 0;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const generateId_1 = require("../utils/generateId");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
const DEFAULT_LIMIT = 50;
const createNotification = async (data) => {
    return prisma.notification.create({
        data: {
            userId: data.userId ?? null,
            type: data.type,
            title: data.title,
            message: data.message,
            entityType: data.entityType ?? null,
            entityId: data.entityId ?? null,
        },
    });
};
exports.createNotification = createNotification;
const getNotifications = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || DEFAULT_LIMIT));
        const skip = (page - 1) * limit;
        const { isRead } = req.query;
        const where = {
            OR: [{ userId: req.user?.id ?? -1 }, { userId: null }],
        };
        if (isRead !== undefined) {
            where.isRead = isRead === 'true';
        }
        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            prisma.notification.count({ where }),
            prisma.notification.count({ where: { ...where, isRead: false } }),
        ]);
        return apiResponse_1.ApiResponse.paginated(res, notifications, total, page, limit);
    }
    catch (error) {
        logger_1.logger.error('getNotifications error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch notifications', 500);
    }
};
exports.getNotifications = getNotifications;
const markRead = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid notification id', 400);
        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification)
            return apiResponse_1.ApiResponse.error(res, 'Notification not found', 404);
        const isOwner = notification.userId === null || notification.userId === req.user?.id;
        if (!isOwner && req.user?.role !== 'super_admin') {
            return apiResponse_1.ApiResponse.error(res, 'Insufficient permissions.', 403);
        }
        const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
        return apiResponse_1.ApiResponse.success(res, 'Notification marked as read', updated);
    }
    catch (error) {
        logger_1.logger.error('markRead error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to mark notification read', 500);
    }
};
exports.markRead = markRead;
const markAllRead = async (req, res) => {
    try {
        let updateMany;
        if (req.user?.role === 'super_admin') {
            updateMany = { where: { isRead: false }, data: { isRead: true } };
        }
        else {
            updateMany = { where: { userId: req.user?.id ?? -1, isRead: false }, data: { isRead: true } };
        }
        const result = await prisma.notification.updateMany(updateMany);
        return apiResponse_1.ApiResponse.success(res, 'All notifications marked as read', { updated: result.count });
    }
    catch (error) {
        logger_1.logger.error('markAllRead error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to mark all notifications read', 500);
    }
};
exports.markAllRead = markAllRead;
const getUnreadCount = async (req, res) => {
    try {
        const count = await prisma.notification.count({
            where: {
                OR: [{ userId: req.user?.id ?? -1 }, { userId: null }],
                isRead: false,
            },
        });
        return apiResponse_1.ApiResponse.success(res, 'Unread count retrieved', { count });
    }
    catch (error) {
        logger_1.logger.error('getUnreadCount error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch unread count', 500);
    }
};
exports.getUnreadCount = getUnreadCount;
const getDashboardNotifications = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        weekEnd.setHours(23, 59, 59, 999);
        const products = await prisma.product.findMany({
            where: { status: 'active' },
            select: { stockQuantity: true, lowStockThreshold: true },
        });
        const lowStockProducts = products.filter((p) => p.stockQuantity <= p.lowStockThreshold).length;
        const [overdueFees, dueSoonFees, expiredSubscriptions, newEnquiries, recent] = await Promise.all([
            prisma.feeInvoice.count({ where: { status: 'overdue' } }),
            prisma.feeInvoice.count({
                where: { status: { in: ['pending', 'partial'] }, dueDate: { gte: today, lte: weekEnd } },
            }),
            prisma.subscription.count({ where: { paymentStatus: 'active', endDate: { lt: today } } }),
            prisma.contactEnquiry.count({ where: { status: 'new' } }),
            prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
        ]);
        return apiResponse_1.ApiResponse.success(res, 'Dashboard notifications retrieved', {
            summary: {
                overdueFees,
                dueSoonFees,
                expiredSubscriptions,
                lowStockProducts,
                newEnquiries,
            },
            notifications: recent,
        });
    }
    catch (error) {
        logger_1.logger.error('getDashboardNotifications error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch dashboard notifications', 500);
    }
};
exports.getDashboardNotifications = getDashboardNotifications;
const getReminderTemplate = async (req, res) => {
    try {
        const invoiceId = parseInt(req.body.invoiceId ?? req.query.invoiceId, 10);
        if (isNaN(invoiceId))
            return apiResponse_1.ApiResponse.error(res, 'Valid invoiceId is required', 400);
        const invoice = await prisma.feeInvoice.findUnique({
            where: { id: invoiceId },
            include: {
                student: { select: { id: true, firstName: true, lastName: true, phone: true, parentPhone: true } },
                regularPlayer: {
                    select: { id: true, firstName: true, lastName: true, phone: true, whatsappNumber: true },
                },
            },
        });
        if (!invoice)
            return apiResponse_1.ApiResponse.error(res, 'Fee invoice not found', 404);
        const settingsRows = await prisma.academySetting.findMany();
        const settings = {};
        for (const s of settingsRows) {
            if (s.key && s.value)
                settings[s.key] = s.value;
        }
        const academyName = settings['academy_name'] || settings['academyName'] || 'Badminton Academy';
        const name = invoice.student
            ? `${invoice.student.firstName} ${invoice.student.lastName}`.trim()
            : invoice.regularPlayer
                ? `${invoice.regularPlayer.firstName} ${invoice.regularPlayer.lastName}`.trim()
                : 'Member';
        const phone = invoice.student?.phone ||
            invoice.student?.parentPhone ||
            invoice.regularPlayer?.whatsappNumber ||
            invoice.regularPlayer?.phone ||
            '';
        const amount = (0, generateId_1.formatIndianCurrency)(Number(invoice.totalAmount));
        let billingMonth = invoice.billingMonth;
        try {
            const [y, m] = invoice.billingMonth.split('-').map(Number);
            billingMonth = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
        }
        catch {
            // keep raw month string
        }
        const dueDate = invoice.dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const message = `Hello ${name}, this is a reminder from ${academyName}. ` +
            `Your fee of ${amount} for the month of ${billingMonth} is due on ${dueDate}. ` +
            `Kindly complete the payment to keep your membership active. Thank you.`;
        const whatsappLink = phone ? (0, generateId_1.generateWhatsAppLink)(phone, message) : null;
        return apiResponse_1.ApiResponse.success(res, 'Reminder template generated', {
            message,
            whatsappLink,
            phone: phone ? (0, generateId_1.normalizePhone)(phone) : null,
            invoice: {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                billingMonth: invoice.billingMonth,
                totalAmount: Number(invoice.totalAmount),
                dueDate: invoice.dueDate,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('getReminderTemplate error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to generate reminder template', 500);
    }
};
exports.getReminderTemplate = getReminderTemplate;
//# sourceMappingURL=notification.controller.js.map