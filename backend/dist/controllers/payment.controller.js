"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportPayments = exports.getPaymentSummary = exports.updatePayment = exports.cancelPayment = exports.getReceipt = exports.getPayment = exports.createPayment = exports.getPayments = void 0;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const generateId_1 = require("../utils/generateId");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
};
const getMonthRange = (month) => {
    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(y, m, 0);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
};
const serializePayment = (payment) => ({
    ...payment,
    amount: Number(payment.amount),
    discount: Number(payment.discount),
    tax: Number(payment.tax),
    finalAmount: Number(payment.finalAmount),
    ...(payment.feeInvoice
        ? {
            feeInvoice: {
                ...payment.feeInvoice,
                invoiceNumber: payment.feeInvoice.invoiceNumber,
                billingMonth: payment.feeInvoice.billingMonth,
                totalAmount: Number(payment.feeInvoice.totalAmount),
                paidAmount: Number(payment.feeInvoice.paidAmount),
                status: payment.feeInvoice.status,
            },
        }
        : {}),
});
const PAYMENT_INCLUDE = {
    student: {
        select: { id: true, admissionNumber: true, firstName: true, lastName: true, phone: true, status: true },
    },
    regularPlayer: {
        select: { id: true, playerId: true, firstName: true, lastName: true, phone: true, status: true },
    },
    feeInvoice: {
        select: { id: true, invoiceNumber: true, billingMonth: true, totalAmount: true, paidAmount: true, status: true },
    },
};
const recomputeInvoiceStatus = (paidAmount, totalAmount) => {
    if (paidAmount.greaterThanOrEqualTo(totalAmount))
        return 'paid';
    if (paidAmount.isZero())
        return 'pending';
    return 'partial';
};
const getPayments = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || DEFAULT_PAGE);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
        const skip = (page - 1) * limit;
        const { category, status, month, search } = req.query;
        const where = {};
        if (category)
            where.category = category;
        if (status)
            where.status = status;
        if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
            where.paymentDate = getMonthRange(month);
        }
        if (search) {
            const s = search;
            where.OR = [
                { receiptNumber: { contains: s } },
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
        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: PAYMENT_INCLUDE,
                orderBy: { paymentDate: 'desc' },
                skip,
                take: limit,
            }),
            prisma.payment.count({ where }),
        ]);
        return apiResponse_1.ApiResponse.paginated(res, payments.map(serializePayment), total, page, limit);
    }
    catch (error) {
        logger_1.logger.error('getPayments error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch payments', 500);
    }
};
exports.getPayments = getPayments;
const createPayment = async (req, res) => {
    try {
        const body = req.body;
        const studentId = body.studentId ? parseInt(body.studentId, 10) : undefined;
        const regularPlayerId = body.regularPlayerId ? parseInt(body.regularPlayerId, 10) : undefined;
        const feeInvoiceId = body.feeInvoiceId ? parseInt(body.feeInvoiceId, 10) : undefined;
        if (studentId && regularPlayerId) {
            return apiResponse_1.ApiResponse.error(res, 'Provide only one of studentId or regularPlayerId', 400);
        }
        if (!studentId && !regularPlayerId) {
            return apiResponse_1.ApiResponse.error(res, 'Either studentId or regularPlayerId is required', 400);
        }
        if (body.amount === undefined || isNaN(parseFloat(body.amount)) || parseFloat(body.amount) < 0) {
            return apiResponse_1.ApiResponse.error(res, 'Valid amount is required', 400);
        }
        const amount = new client_1.Prisma.Decimal(parseFloat(body.amount));
        const discount = new client_1.Prisma.Decimal(parseFloat(body.discount ?? 0));
        const tax = new client_1.Prisma.Decimal(parseFloat(body.tax ?? 0));
        const finalAmount = amount.sub(discount).add(tax);
        if (finalAmount.lessThanOrEqualTo(0)) {
            return apiResponse_1.ApiResponse.error(res, 'finalAmount must be greater than zero', 400);
        }
        const category = body.category || 'coaching_fee';
        let invoice = null;
        if (feeInvoiceId) {
            invoice = await prisma.feeInvoice.findUnique({ where: { id: feeInvoiceId } });
            if (!invoice)
                return apiResponse_1.ApiResponse.error(res, 'Fee invoice not found', 404);
            if (invoice.status === 'cancelled') {
                return apiResponse_1.ApiResponse.error(res, 'Cannot record payment against a cancelled invoice', 400);
            }
            if (invoice.studentId && invoice.studentId !== studentId) {
                return apiResponse_1.ApiResponse.error(res, 'Invoice does not belong to this student', 400);
            }
            if (invoice.regularPlayerId && invoice.regularPlayerId !== regularPlayerId) {
                return apiResponse_1.ApiResponse.error(res, 'Invoice does not belong to this player', 400);
            }
        }
        else {
            invoice = await prisma.feeInvoice.findFirst({
                where: {
                    ...(studentId ? { studentId } : { regularPlayerId }),
                    billingMonth: getCurrentMonth(),
                    status: { in: ['pending', 'partial', 'overdue'] },
                },
                orderBy: { createdAt: 'asc' },
            });
        }
        const result = await prisma.$transaction(async (tx) => {
            let receiptNumber = (0, generateId_1.generateReceiptNumber)();
            let exists = await tx.payment.findUnique({ where: { receiptNumber } });
            for (let attempt = 0; attempt < 3 && exists; attempt++) {
                receiptNumber = (0, generateId_1.generateReceiptNumber)();
                exists = await tx.payment.findUnique({ where: { receiptNumber } });
            }
            let invoiceUpdate = null;
            if (invoice) {
                const newPaidAmount = new client_1.Prisma.Decimal(invoice.paidAmount).add(finalAmount);
                const newStatus = recomputeInvoiceStatus(newPaidAmount, new client_1.Prisma.Decimal(invoice.totalAmount));
                invoiceUpdate = tx.feeInvoice.update({
                    where: { id: invoice.id },
                    data: { paidAmount: newPaidAmount, status: newStatus },
                });
            }
            const payment = await tx.payment.create({
                data: {
                    receiptNumber,
                    studentId: studentId ?? undefined,
                    regularPlayerId: regularPlayerId ?? undefined,
                    feeInvoiceId: invoice ? invoice.id : undefined,
                    category,
                    description: body.description || undefined,
                    amount,
                    discount,
                    tax,
                    finalAmount,
                    paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
                    dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
                    paymentMethod: body.paymentMethod || 'cash',
                    transactionRef: body.transactionRef || undefined,
                    status: 'paid',
                    collectedBy: req.user?.id ?? null,
                    notes: body.notes || undefined,
                },
                include: PAYMENT_INCLUDE,
            });
            if (invoiceUpdate)
                await invoiceUpdate;
            await tx.auditLog.create({
                data: {
                    userId: req.user?.id ?? null,
                    action: 'create',
                    entityType: 'Payment',
                    entityId: payment.id,
                    newValues: JSON.stringify({
                        receiptNumber: payment.receiptNumber,
                        amount: Number(finalAmount),
                        category,
                        paymentMethod: payment.paymentMethod,
                        invoiceId: invoice?.id ?? null,
                    }),
                    ipAddress: req.ip,
                },
            });
            return payment;
        });
        return apiResponse_1.ApiResponse.created(res, 'Payment recorded successfully', serializePayment(result));
    }
    catch (error) {
        logger_1.logger.error('createPayment error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to create payment', 500);
    }
};
exports.createPayment = createPayment;
const getPayment = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid payment id', 400);
        const payment = await prisma.payment.findUnique({
            where: { id },
            include: PAYMENT_INCLUDE,
        });
        if (!payment)
            return apiResponse_1.ApiResponse.error(res, 'Payment not found', 404);
        return apiResponse_1.ApiResponse.success(res, 'Payment retrieved', serializePayment(payment));
    }
    catch (error) {
        logger_1.logger.error('getPayment error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch payment', 500);
    }
};
exports.getPayment = getPayment;
const getReceipt = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid payment id', 400);
        const payment = await prisma.payment.findUnique({
            where: { id },
            include: {
                student: {
                    select: { id: true, admissionNumber: true, firstName: true, lastName: true, phone: true, email: true, address: true },
                },
                regularPlayer: {
                    select: { id: true, playerId: true, firstName: true, lastName: true, phone: true, email: true, address: true },
                },
                feeInvoice: true,
            },
        });
        if (!payment)
            return apiResponse_1.ApiResponse.error(res, 'Payment not found', 404);
        const settingsRows = await prisma.academySetting.findMany();
        const settings = {};
        for (const s of settingsRows) {
            if (s.key && s.value)
                settings[s.key] = s.value;
        }
        const customer = payment.student
            ? {
                type: 'student',
                id: payment.student.id,
                reference: payment.student.admissionNumber,
                name: `${payment.student.firstName} ${payment.student.lastName}`.trim(),
                phone: payment.student.phone,
                email: payment.student.email,
                address: payment.student.address,
            }
            : payment.regularPlayer
                ? {
                    type: 'regular_player',
                    id: payment.regularPlayer.id,
                    reference: payment.regularPlayer.playerId,
                    name: `${payment.regularPlayer.firstName} ${payment.regularPlayer.lastName}`.trim(),
                    phone: payment.regularPlayer.phone,
                    email: payment.regularPlayer.email,
                    address: payment.regularPlayer.address,
                }
                : null;
        return apiResponse_1.ApiResponse.success(res, 'Receipt retrieved', {
            receiptNumber: payment.receiptNumber,
            amount: Number(payment.amount),
            discount: Number(payment.discount),
            tax: Number(payment.tax),
            finalAmount: Number(payment.finalAmount),
            paymentMethod: payment.paymentMethod,
            transactionRef: payment.transactionRef,
            paymentDate: payment.paymentDate,
            category: payment.category,
            description: payment.description,
            notes: payment.notes,
            invoice: payment.feeInvoice
                ? {
                    id: payment.feeInvoice.id,
                    invoiceNumber: payment.feeInvoice.invoiceNumber,
                    billingMonth: payment.feeInvoice.billingMonth,
                    totalAmount: Number(payment.feeInvoice.totalAmount),
                    paidAmount: Number(payment.feeInvoice.paidAmount),
                    dueDate: payment.feeInvoice.dueDate,
                }
                : null,
            customer,
            settings,
        });
    }
    catch (error) {
        logger_1.logger.error('getReceipt error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch receipt', 500);
    }
};
exports.getReceipt = getReceipt;
const cancelPayment = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid payment id', 400);
        const payment = await prisma.payment.findUnique({
            where: { id },
            include: { feeInvoice: true },
        });
        if (!payment)
            return apiResponse_1.ApiResponse.error(res, 'Payment not found', 404);
        if (payment.status === 'cancelled') {
            return apiResponse_1.ApiResponse.error(res, 'Payment is already cancelled', 400);
        }
        const result = await prisma.$transaction(async (tx) => {
            let invoiceUpdate = null;
            if (payment.feeInvoiceId && payment.feeInvoice) {
                const reversed = new client_1.Prisma.Decimal(payment.feeInvoice.paidAmount).sub(new client_1.Prisma.Decimal(payment.finalAmount));
                const newPaidAmount = reversed.lessThan(0) ? new client_1.Prisma.Decimal(0) : reversed;
                const newStatus = recomputeInvoiceStatus(newPaidAmount, new client_1.Prisma.Decimal(payment.feeInvoice.totalAmount));
                invoiceUpdate = tx.feeInvoice.update({
                    where: { id: payment.feeInvoiceId },
                    data: { paidAmount: newPaidAmount, status: newStatus },
                });
            }
            const updated = await tx.payment.update({
                where: { id },
                data: { status: 'cancelled' },
                include: PAYMENT_INCLUDE,
            });
            if (invoiceUpdate)
                await invoiceUpdate;
            await tx.auditLog.create({
                data: {
                    userId: req.user?.id ?? null,
                    action: 'update',
                    entityType: 'Payment',
                    entityId: id,
                    oldValues: JSON.stringify({ status: payment.status, finalAmount: Number(payment.finalAmount) }),
                    newValues: JSON.stringify({ status: 'cancelled' }),
                    ipAddress: req.ip,
                },
            });
            return updated;
        });
        return apiResponse_1.ApiResponse.success(res, 'Payment cancelled successfully', serializePayment(result));
    }
    catch (error) {
        logger_1.logger.error('cancelPayment error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to cancel payment', 500);
    }
};
exports.cancelPayment = cancelPayment;
const updatePayment = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid payment id', 400);
        const existing = await prisma.payment.findUnique({
            where: { id },
            include: { feeInvoice: true },
        });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Payment not found', 404);
        if (existing.status === 'cancelled') {
            return apiResponse_1.ApiResponse.error(res, 'Cannot update a cancelled payment', 400);
        }
        const body = req.body;
        const data = {};
        const amount = body.amount !== undefined ? new client_1.Prisma.Decimal(parseFloat(body.amount)) : new client_1.Prisma.Decimal(existing.amount);
        const discount = body.discount !== undefined ? new client_1.Prisma.Decimal(parseFloat(body.discount)) : new client_1.Prisma.Decimal(existing.discount);
        const tax = body.tax !== undefined ? new client_1.Prisma.Decimal(parseFloat(body.tax)) : new client_1.Prisma.Decimal(existing.tax);
        const finalAmount = amount.sub(discount).add(tax);
        if (body.category !== undefined)
            data.category = body.category;
        if (body.description !== undefined)
            data.description = body.description;
        if (body.amount !== undefined)
            data.amount = amount;
        if (body.discount !== undefined)
            data.discount = discount;
        if (body.tax !== undefined)
            data.tax = tax;
        data.finalAmount = finalAmount;
        if (body.paymentDate !== undefined)
            data.paymentDate = new Date(body.paymentDate);
        if (body.dueDate !== undefined)
            data.dueDate = body.dueDate === null || body.dueDate === '' ? null : new Date(body.dueDate);
        if (body.paymentMethod !== undefined)
            data.paymentMethod = body.paymentMethod;
        if (body.transactionRef !== undefined)
            data.transactionRef = body.transactionRef;
        if (body.status !== undefined)
            data.status = body.status;
        if (body.notes !== undefined)
            data.notes = body.notes;
        const result = await prisma.$transaction(async (tx) => {
            let invoiceUpdate = null;
            if (existing.feeInvoiceId && existing.feeInvoice) {
                const oldFinal = new client_1.Prisma.Decimal(existing.finalAmount);
                const diff = finalAmount.sub(oldFinal);
                if (!diff.isZero()) {
                    const adjusted = new client_1.Prisma.Decimal(existing.feeInvoice.paidAmount).add(diff);
                    const newPaidAmount = adjusted.lessThan(0) ? new client_1.Prisma.Decimal(0) : adjusted;
                    const newStatus = recomputeInvoiceStatus(newPaidAmount, new client_1.Prisma.Decimal(existing.feeInvoice.totalAmount));
                    invoiceUpdate = tx.feeInvoice.update({
                        where: { id: existing.feeInvoiceId },
                        data: { paidAmount: newPaidAmount, status: newStatus },
                    });
                }
            }
            const updated = await tx.payment.update({
                where: { id },
                data,
                include: PAYMENT_INCLUDE,
            });
            if (invoiceUpdate)
                await invoiceUpdate;
            await tx.auditLog.create({
                data: {
                    userId: req.user?.id ?? null,
                    action: 'update',
                    entityType: 'Payment',
                    entityId: id,
                    oldValues: JSON.stringify({
                        category: existing.category,
                        amount: Number(existing.amount),
                        discount: Number(existing.discount),
                        tax: Number(existing.tax),
                        finalAmount: Number(existing.finalAmount),
                        paymentMethod: existing.paymentMethod,
                        status: existing.status,
                    }),
                    newValues: JSON.stringify({
                        category: updated.category,
                        amount: Number(updated.amount),
                        discount: Number(updated.discount),
                        tax: Number(updated.tax),
                        finalAmount: Number(updated.finalAmount),
                        paymentMethod: updated.paymentMethod,
                        status: updated.status,
                    }),
                    ipAddress: req.ip,
                },
            });
            return updated;
        });
        return apiResponse_1.ApiResponse.success(res, 'Payment updated successfully', serializePayment(result));
    }
    catch (error) {
        logger_1.logger.error('updatePayment error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to update payment', 500);
    }
};
exports.updatePayment = updatePayment;
const getPaymentSummary = async (req, res) => {
    try {
        const { month } = req.query;
        const where = { status: { not: 'cancelled' } };
        if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
            where.paymentDate = getMonthRange(month);
        }
        const [byCategory, payments] = await Promise.all([
            prisma.payment.groupBy({
                by: ['category'],
                where,
                _sum: { finalAmount: true },
                _count: true,
            }),
            prisma.payment.findMany({
                where: { ...where, paymentDate: where.paymentDate || { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1) } },
                select: { paymentDate: true, finalAmount: true, status: true },
                orderBy: { paymentDate: 'desc' },
            }),
        ]);
        const byMonth = {};
        for (const p of payments) {
            if (p.status === 'cancelled')
                continue;
            const key = `${p.paymentDate.getFullYear()}-${(p.paymentDate.getMonth() + 1).toString().padStart(2, '0')}`;
            byMonth[key] = Number((byMonth[key] ?? 0)) + Number(p.finalAmount);
        }
        return apiResponse_1.ApiResponse.success(res, 'Payment summary retrieved', {
            byCategory: byCategory.map((c) => ({
                category: c.category,
                total: Number(c._sum.finalAmount ?? 0),
                count: c._count,
            })),
            byMonth,
        });
    }
    catch (error) {
        logger_1.logger.error('getPaymentSummary error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch payment summary', 500);
    }
};
exports.getPaymentSummary = getPaymentSummary;
const exportPayments = async (req, res) => {
    try {
        const { category, status, month, startDate, endDate } = req.query;
        const where = {};
        if (category)
            where.category = category;
        if (status)
            where.status = status;
        if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
            where.paymentDate = getMonthRange(month);
        }
        if (!where.paymentDate && (startDate || endDate)) {
            where.paymentDate = {};
            if (startDate) {
                const s = new Date(startDate);
                s.setHours(0, 0, 0, 0);
                where.paymentDate.gte = s;
            }
            if (endDate) {
                const e = new Date(endDate);
                e.setHours(23, 59, 59, 999);
                where.paymentDate.lte = e;
            }
        }
        const payments = await prisma.payment.findMany({
            where,
            include: PAYMENT_INCLUDE,
            orderBy: { paymentDate: 'desc' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Payments exported', payments.map(serializePayment));
    }
    catch (error) {
        logger_1.logger.error('exportPayments error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to export payments', 500);
    }
};
exports.exportPayments = exportPayments;
//# sourceMappingURL=payment.controller.js.map