"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionHistory = exports.cancelSubscription = exports.resumeSubscription = exports.pauseSubscription = exports.renewSubscription = exports.createSubscription = exports.getRegularSubscriptions = exports.getStudentSubscriptions = exports.getSubscriptionStats = exports.getSubscriptions = void 0;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const serializeSubscription = (subscription) => ({
    ...subscription,
    amount: Number(subscription.amount),
    discount: Number(subscription.discount),
});
const SUBSCRIPTION_INCLUDE = {
    student: {
        select: { id: true, admissionNumber: true, firstName: true, lastName: true, phone: true, status: true },
    },
    regularPlayer: {
        select: { id: true, playerId: true, firstName: true, lastName: true, phone: true, status: true },
    },
};
const addBillingCycle = (date, billingCycle) => {
    const d = new Date(date);
    switch (billingCycle) {
        case 'quarterly':
            d.setMonth(d.getMonth() + 3);
            break;
        case 'yearly':
            d.setFullYear(d.getFullYear() + 1);
            break;
        case 'monthly':
        default:
            d.setMonth(d.getMonth() + 1);
            break;
    }
    return d;
};
const getSubscriptions = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || DEFAULT_PAGE);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
        const skip = (page - 1) * limit;
        const { type, status, search } = req.query;
        const where = {};
        if (type)
            where.type = type;
        if (status)
            where.paymentStatus = status;
        if (search) {
            const s = search;
            where.OR = [
                {
                    student: {
                        is: {
                            OR: [
                                { firstName: { contains: s } },
                                { lastName: { contains: s } },
                                { phone: { contains: s } },
                                { admissionNumber: { contains: s } },
                            ],
                        },
                    },
                },
                {
                    regularPlayer: {
                        is: {
                            OR: [
                                { firstName: { contains: s } },
                                { lastName: { contains: s } },
                                { phone: { contains: s } },
                                { playerId: { contains: s } },
                            ],
                        },
                    },
                },
            ];
        }
        const [subscriptions, total] = await Promise.all([
            prisma.subscription.findMany({
                where,
                include: SUBSCRIPTION_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.subscription.count({ where }),
        ]);
        return apiResponse_1.ApiResponse.paginated(res, subscriptions.map(serializeSubscription), total, page, limit);
    }
    catch (error) {
        logger_1.logger.error('getSubscriptions error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch subscriptions', 500);
    }
};
exports.getSubscriptions = getSubscriptions;
const getSubscriptionStats = async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        weekEnd.setHours(23, 59, 59, 999);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        const products = await prisma.product.findMany({
            where: { status: 'active' },
            select: { stockQuantity: true, lowStockThreshold: true },
        });
        const lowStock = products.filter((p) => p.stockQuantity <= p.lowStockThreshold).length;
        const [activeCount, renewalsDueThisWeek, expired, overdue, revenuePromise, mrrPromise, churned] = await Promise.all([
            prisma.subscription.count({ where: { paymentStatus: 'active' } }),
            prisma.subscription.count({
                where: { paymentStatus: 'active', endDate: { gte: today, lte: weekEnd } },
            }),
            prisma.subscription.count({ where: { paymentStatus: 'active', endDate: { lt: today } } }),
            prisma.feeInvoice.count({ where: { status: 'overdue' } }),
            prisma.payment.aggregate({
                where: {
                    category: { in: ['regular_membership', 'coaching_fee'] },
                    paymentDate: { gte: monthStart, lte: monthEnd },
                    status: { in: ['paid', 'partial'] },
                },
                _sum: { finalAmount: true },
            }),
            prisma.subscription.aggregate({
                where: { paymentStatus: 'active' },
                _sum: { amount: true },
            }),
            prisma.subscription.count({ where: { paymentStatus: 'cancelled' } }),
        ]);
        return apiResponse_1.ApiResponse.success(res, 'Subscription stats retrieved', {
            activeCount,
            renewalsDueThisWeek,
            expired,
            overdue,
            lowStock,
            revenueFromSubscriptions: Number(revenuePromise._sum.finalAmount ?? 0),
            monthlyRecurringRevenue: Number(mrrPromise._sum.amount ?? 0),
            churned,
        });
    }
    catch (error) {
        logger_1.logger.error('getSubscriptionStats error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch subscription stats', 500);
    }
};
exports.getSubscriptionStats = getSubscriptionStats;
const getStudentSubscriptions = async (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        if (isNaN(studentId))
            return apiResponse_1.ApiResponse.error(res, 'Invalid student id', 400);
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, firstName: true, lastName: true, phone: true },
        });
        if (!student)
            return apiResponse_1.ApiResponse.error(res, 'Student not found', 404);
        const subscriptions = await prisma.subscription.findMany({
            where: { studentId },
            include: SUBSCRIPTION_INCLUDE,
            orderBy: { createdAt: 'desc' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Student subscriptions retrieved', {
            student,
            subscriptions: subscriptions.map(serializeSubscription),
        });
    }
    catch (error) {
        logger_1.logger.error('getStudentSubscriptions error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch student subscriptions', 500);
    }
};
exports.getStudentSubscriptions = getStudentSubscriptions;
const getRegularSubscriptions = async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        if (isNaN(playerId))
            return apiResponse_1.ApiResponse.error(res, 'Invalid player id', 400);
        const player = await prisma.regularPlayer.findUnique({
            where: { id: playerId },
            select: { id: true, firstName: true, lastName: true, phone: true },
        });
        if (!player)
            return apiResponse_1.ApiResponse.error(res, 'Regular player not found', 404);
        const subscriptions = await prisma.subscription.findMany({
            where: { regularPlayerId: playerId },
            include: SUBSCRIPTION_INCLUDE,
            orderBy: { createdAt: 'desc' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Regular player subscriptions retrieved', {
            player,
            subscriptions: subscriptions.map(serializeSubscription),
        });
    }
    catch (error) {
        logger_1.logger.error('getRegularSubscriptions error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch regular player subscriptions', 500);
    }
};
exports.getRegularSubscriptions = getRegularSubscriptions;
const createSubscription = async (req, res) => {
    try {
        const body = req.body;
        const studentId = body.studentId ? parseInt(body.studentId, 10) : undefined;
        const regularPlayerId = body.regularPlayerId ? parseInt(body.regularPlayerId, 10) : undefined;
        if (!studentId && !regularPlayerId) {
            return apiResponse_1.ApiResponse.error(res, 'Either studentId or regularPlayerId is required', 400);
        }
        if (studentId && regularPlayerId) {
            return apiResponse_1.ApiResponse.error(res, 'Provide only one of studentId or regularPlayerId', 400);
        }
        if (!body.type || !['coaching', 'regular'].includes(body.type)) {
            return apiResponse_1.ApiResponse.error(res, "Valid type is required ('coaching' or 'regular')", 400);
        }
        if (!body.startDate || !body.endDate) {
            return apiResponse_1.ApiResponse.error(res, 'startDate and endDate are required', 400);
        }
        if (body.amount === undefined || isNaN(parseFloat(body.amount))) {
            return apiResponse_1.ApiResponse.error(res, 'Valid amount is required', 400);
        }
        const startDate = new Date(body.startDate);
        const endDate = new Date(body.endDate);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return apiResponse_1.ApiResponse.error(res, 'Invalid date provided', 400);
        }
        if (endDate <= startDate) {
            return apiResponse_1.ApiResponse.error(res, 'endDate must be after startDate', 400);
        }
        if (studentId) {
            const student = await prisma.student.findUnique({ where: { id: studentId } });
            if (!student)
                return apiResponse_1.ApiResponse.error(res, 'Student not found', 404);
        }
        if (regularPlayerId) {
            const player = await prisma.regularPlayer.findUnique({ where: { id: regularPlayerId } });
            if (!player)
                return apiResponse_1.ApiResponse.error(res, 'Regular player not found', 404);
        }
        const subscription = await prisma.subscription.create({
            data: {
                studentId: studentId ?? undefined,
                regularPlayerId: regularPlayerId ?? undefined,
                type: body.type,
                startDate,
                endDate,
                amount: new client_1.Prisma.Decimal(parseFloat(body.amount)),
                discount: new client_1.Prisma.Decimal(parseFloat(body.discount ?? 0)),
                billingCycle: body.billingCycle || 'monthly',
                paymentStatus: body.paymentStatus || 'active',
                notes: body.notes || undefined,
            },
            include: SUBSCRIPTION_INCLUDE,
        });
        await prisma.auditLog.create({
            data: {
                userId: req.user?.id ?? null,
                action: 'create',
                entityType: 'Subscription',
                entityId: subscription.id,
                newValues: JSON.stringify({
                    studentId: subscription.studentId,
                    regularPlayerId: subscription.regularPlayerId,
                    type: subscription.type,
                    amount: Number(subscription.amount),
                    startDate: subscription.startDate,
                    endDate: subscription.endDate,
                }),
                ipAddress: req.ip,
            },
        });
        return apiResponse_1.ApiResponse.created(res, 'Subscription created successfully', serializeSubscription(subscription));
    }
    catch (error) {
        logger_1.logger.error('createSubscription error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to create subscription', 500);
    }
};
exports.createSubscription = createSubscription;
const renewSubscription = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid subscription id', 400);
        const existing = await prisma.subscription.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Subscription not found', 404);
        const body = req.body || {};
        const newEndDate = body.endDate ? new Date(body.endDate) : addBillingCycle(existing.endDate, existing.billingCycle);
        if (isNaN(newEndDate.getTime())) {
            return apiResponse_1.ApiResponse.error(res, 'Invalid endDate provided', 400);
        }
        if (newEndDate <= existing.endDate) {
            return apiResponse_1.ApiResponse.error(res, 'New endDate must be after the current endDate', 400);
        }
        const subscription = await prisma.subscription.update({
            where: { id },
            data: { endDate: newEndDate, paymentStatus: 'active' },
            include: SUBSCRIPTION_INCLUDE,
        });
        await prisma.auditLog.create({
            data: {
                userId: req.user?.id ?? null,
                action: 'update',
                entityType: 'Subscription',
                entityId: id,
                oldValues: JSON.stringify({ endDate: existing.endDate, paymentStatus: existing.paymentStatus }),
                newValues: JSON.stringify({ endDate: newEndDate, paymentStatus: 'active' }),
                ipAddress: req.ip,
            },
        });
        return apiResponse_1.ApiResponse.success(res, 'Subscription renewed successfully', serializeSubscription(subscription));
    }
    catch (error) {
        logger_1.logger.error('renewSubscription error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to renew subscription', 500);
    }
};
exports.renewSubscription = renewSubscription;
const setSubscriptionStatus = async (req, res, status) => {
    const id = parseInt(req.params.id);
    if (isNaN(id))
        return apiResponse_1.ApiResponse.error(res, 'Invalid subscription id', 400);
    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing)
        return apiResponse_1.ApiResponse.error(res, 'Subscription not found', 404);
    const subscription = await prisma.subscription.update({
        where: { id },
        data: { paymentStatus: status },
        include: SUBSCRIPTION_INCLUDE,
    });
    await prisma.auditLog.create({
        data: {
            userId: req.user?.id ?? null,
            action: 'update',
            entityType: 'Subscription',
            entityId: id,
            oldValues: JSON.stringify({ paymentStatus: existing.paymentStatus }),
            newValues: JSON.stringify({ paymentStatus: status }),
            ipAddress: req.ip,
        },
    });
    const label = status === 'paused' ? 'paused' : status === 'active' ? 'resumed' : 'cancelled';
    return apiResponse_1.ApiResponse.success(res, `Subscription ${label} successfully`, serializeSubscription(subscription));
};
const pauseSubscription = async (req, res) => {
    try {
        return await setSubscriptionStatus(req, res, 'paused');
    }
    catch (error) {
        logger_1.logger.error('pauseSubscription error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to pause subscription', 500);
    }
};
exports.pauseSubscription = pauseSubscription;
const resumeSubscription = async (req, res) => {
    try {
        return await setSubscriptionStatus(req, res, 'active');
    }
    catch (error) {
        logger_1.logger.error('resumeSubscription error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to resume subscription', 500);
    }
};
exports.resumeSubscription = resumeSubscription;
const cancelSubscription = async (req, res) => {
    try {
        return await setSubscriptionStatus(req, res, 'cancelled');
    }
    catch (error) {
        logger_1.logger.error('cancelSubscription error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to cancel subscription', 500);
    }
};
exports.cancelSubscription = cancelSubscription;
const getSubscriptionHistory = async (req, res) => {
    try {
        const studentId = req.query.studentId ? parseInt(req.query.studentId, 10) : undefined;
        const regularPlayerId = req.query.regularPlayerId ? parseInt(req.query.regularPlayerId, 10) : undefined;
        if (!studentId && !regularPlayerId) {
            return apiResponse_1.ApiResponse.error(res, 'Provide studentId or regularPlayerId query parameter', 400);
        }
        const subscriptions = await prisma.subscription.findMany({
            where: {
                ...(studentId ? { studentId } : {}),
                ...(regularPlayerId ? { regularPlayerId } : {}),
            },
            include: SUBSCRIPTION_INCLUDE,
            orderBy: { createdAt: 'desc' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Subscription history retrieved', subscriptions.map(serializeSubscription));
    }
    catch (error) {
        logger_1.logger.error('getSubscriptionHistory error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch subscription history', 500);
    }
};
exports.getSubscriptionHistory = getSubscriptionHistory;
//# sourceMappingURL=subscription.controller.js.map