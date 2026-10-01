"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRegularPlayerFees = exports.getStudentFees = exports.getOutstanding = exports.getDueSoon = exports.getOverdue = exports.generateFees = exports.getFees = void 0;
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
const getDueDate = (month, feeDueDay) => {
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const day = feeDueDay && feeDueDay >= 1 ? Math.min(feeDueDay, daysInMonth) : daysInMonth;
    const date = new Date(y, m - 1, day);
    date.setHours(23, 59, 59, 999);
    return date;
};
const generateUniqueInvoiceNumber = (used) => {
    let num = (0, generateId_1.generateInvoiceNumber)();
    while (used.has(num)) {
        num = (0, generateId_1.generateInvoiceNumber)();
    }
    used.add(num);
    return num;
};
const serializeInvoice = (invoice) => ({
    ...invoice,
    amount: Number(invoice.amount),
    discount: Number(invoice.discount),
    tax: Number(invoice.tax),
    totalAmount: Number(invoice.totalAmount),
    paidAmount: Number(invoice.paidAmount),
});
const INVOICE_INCLUDE = {
    student: {
        select: { id: true, admissionNumber: true, firstName: true, lastName: true, phone: true, status: true },
    },
    regularPlayer: {
        select: { id: true, playerId: true, firstName: true, lastName: true, phone: true, status: true },
    },
};
const getFees = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || DEFAULT_PAGE);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
        const skip = (page - 1) * limit;
        const { status, month, type, search } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (month)
            where.billingMonth = month;
        const typeStr = type;
        if (typeStr === 'coaching')
            where.studentId = { not: null };
        if (typeStr === 'regular')
            where.regularPlayerId = { not: null };
        if (search) {
            const s = search;
            where.OR = [
                { invoiceNumber: { contains: s } },
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
        const [invoices, total] = await Promise.all([
            prisma.feeInvoice.findMany({
                where,
                include: INVOICE_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.feeInvoice.count({ where }),
        ]);
        return apiResponse_1.ApiResponse.paginated(res, invoices.map(serializeInvoice), total, page, limit);
    }
    catch (error) {
        logger_1.logger.error('getFees error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch fee invoices', 500);
    }
};
exports.getFees = getFees;
const generateFees = async (req, res) => {
    try {
        const body = req.body || {};
        let month = body.month || getCurrentMonth();
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
            return apiResponse_1.ApiResponse.error(res, 'Invalid month format. Use YYYY-MM', 400);
        }
        const type = body.type || 'all';
        if (!['all', 'coaching', 'regular'].includes(type)) {
            return apiResponse_1.ApiResponse.error(res, "Invalid type. Use 'all', 'coaching' or 'regular'", 400);
        }
        const studentIds = Array.isArray(body.studentIds)
            ? body.studentIds.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id))
            : undefined;
        let skipped = 0;
        const invoiceData = [];
        const usedInvoiceNumbers = new Set();
        if (type === 'all' || type === 'coaching') {
            const students = await prisma.student.findMany({
                where: {
                    status: 'active',
                    ...(studentIds && studentIds.length ? { id: { in: studentIds } } : {}),
                    batchStudents: { some: { status: 'active' } },
                },
                include: {
                    batchStudents: {
                        where: { status: 'active' },
                        select: { batch: { select: { id: true, monthlyFee: true, status: true } } },
                    },
                },
            });
            const existingInvoices = students.length
                ? await prisma.feeInvoice.findMany({
                    where: { studentId: { in: students.map((s) => s.id) }, billingMonth: month },
                    select: { studentId: true },
                })
                : [];
            const existingStudentIds = new Set(existingInvoices.map((i) => i.studentId));
            for (const student of students) {
                if (existingStudentIds.has(student.id)) {
                    skipped++;
                    continue;
                }
                const amount = new client_1.Prisma.Decimal(student.monthlyFee ?? 0);
                if (amount.lessThanOrEqualTo(0)) {
                    skipped++;
                    continue;
                }
                const discount = new client_1.Prisma.Decimal(student.discount ?? 0);
                const tax = new client_1.Prisma.Decimal(0);
                const totalAmount = amount.sub(discount).add(tax);
                invoiceData.push({
                    invoiceNumber: generateUniqueInvoiceNumber(usedInvoiceNumbers),
                    studentId: student.id,
                    billingMonth: month,
                    amount,
                    discount,
                    tax,
                    totalAmount,
                    paidAmount: new client_1.Prisma.Decimal(0),
                    dueDate: getDueDate(month, student.feeDueDay ?? null),
                    status: 'pending',
                });
            }
        }
        if (type === 'all' || type === 'regular') {
            const players = await prisma.regularPlayer.findMany({
                where: { status: { in: ['active', 'payment_due', 'overdue'] } },
            });
            const existingInvoices = players.length
                ? await prisma.feeInvoice.findMany({
                    where: { regularPlayerId: { in: players.map((p) => p.id) }, billingMonth: month },
                    select: { regularPlayerId: true },
                })
                : [];
            const existingPlayerIds = new Set(existingInvoices.map((i) => i.regularPlayerId));
            for (const player of players) {
                if (existingPlayerIds.has(player.id)) {
                    skipped++;
                    continue;
                }
                const amount = new client_1.Prisma.Decimal(player.monthlyFee ?? 0);
                if (amount.lessThanOrEqualTo(0)) {
                    skipped++;
                    continue;
                }
                const discount = new client_1.Prisma.Decimal(0);
                const tax = new client_1.Prisma.Decimal(0);
                const totalAmount = amount.sub(discount).add(tax);
                invoiceData.push({
                    invoiceNumber: generateUniqueInvoiceNumber(usedInvoiceNumbers),
                    regularPlayerId: player.id,
                    billingMonth: month,
                    amount,
                    discount,
                    tax,
                    totalAmount,
                    paidAmount: new client_1.Prisma.Decimal(0),
                    dueDate: getDueDate(month),
                    status: 'pending',
                });
            }
        }
        let created = 0;
        if (invoiceData.length) {
            const createdInvoices = await prisma.$transaction(invoiceData.map((data) => prisma.feeInvoice.create({ data })));
            created = createdInvoices.length;
            await prisma.auditLog.create({
                data: {
                    userId: req.user?.id ?? null,
                    action: 'create',
                    entityType: 'FeeInvoice',
                    newValues: JSON.stringify({ billingMonth: month, type, created, skipped: invoiceData.length }),
                    ipAddress: req.ip,
                },
            });
        }
        return apiResponse_1.ApiResponse.success(res, 'Fee generation completed', {
            created,
            skipped,
            billingMonth: month,
            total: invoiceData.length,
        });
    }
    catch (error) {
        logger_1.logger.error('generateFees error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to generate fees', 500);
    }
};
exports.generateFees = generateFees;
const getOverdue = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || DEFAULT_PAGE);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
        const skip = (page - 1) * limit;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const where = {
            status: { in: ['pending', 'partial'] },
            dueDate: { lt: today },
        };
        const [invoices, total] = await Promise.all([
            prisma.feeInvoice.findMany({ where, include: INVOICE_INCLUDE, orderBy: { dueDate: 'asc' }, skip, take: limit }),
            prisma.feeInvoice.count({ where }),
        ]);
        return apiResponse_1.ApiResponse.paginated(res, invoices.map(serializeInvoice), total, page, limit);
    }
    catch (error) {
        logger_1.logger.error('getOverdue error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch overdue fees', 500);
    }
};
exports.getOverdue = getOverdue;
const getDueSoon = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || DEFAULT_PAGE);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
        const skip = (page - 1) * limit;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        weekEnd.setHours(23, 59, 59, 999);
        const where = {
            status: { in: ['pending', 'partial'] },
            dueDate: { gte: today, lte: weekEnd },
        };
        const [invoices, total] = await Promise.all([
            prisma.feeInvoice.findMany({ where, include: INVOICE_INCLUDE, orderBy: { dueDate: 'asc' }, skip, take: limit }),
            prisma.feeInvoice.count({ where }),
        ]);
        return apiResponse_1.ApiResponse.paginated(res, invoices.map(serializeInvoice), total, page, limit);
    }
    catch (error) {
        logger_1.logger.error('getDueSoon error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch fees due soon', 500);
    }
};
exports.getDueSoon = getDueSoon;
const getOutstanding = async (req, res) => {
    try {
        const where = {
            status: { in: ['pending', 'partial'] },
            ...(req.query.month ? { billingMonth: req.query.month } : {}),
        };
        const { _sum, _count } = await prisma.feeInvoice.aggregate({
            where,
            _sum: { totalAmount: true, paidAmount: true },
            _count: true,
        });
        const totalAmount = Number(_sum.totalAmount ?? 0);
        const paidAmount = Number(_sum.paidAmount ?? 0);
        return apiResponse_1.ApiResponse.success(res, 'Outstanding amount retrieved', {
            outstanding: Math.max(0, totalAmount - paidAmount),
            totalAmount,
            paidAmount,
            count: _count,
        });
    }
    catch (error) {
        logger_1.logger.error('getOutstanding error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch outstanding amount', 500);
    }
};
exports.getOutstanding = getOutstanding;
const getStudentFees = async (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        if (isNaN(studentId))
            return apiResponse_1.ApiResponse.error(res, 'Invalid student id', 400);
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, firstName: true, lastName: true, phone: true, admissionNumber: true, monthlyFee: true },
        });
        if (!student)
            return apiResponse_1.ApiResponse.error(res, 'Student not found', 404);
        const invoices = await prisma.feeInvoice.findMany({
            where: { studentId },
            include: INVOICE_INCLUDE,
            orderBy: { billingMonth: 'desc' },
        });
        const outstanding = invoices
            .filter((i) => ['pending', 'partial'].includes(i.status))
            .reduce((sum, i) => sum + (Number(i.totalAmount) - Number(i.paidAmount)), 0);
        return apiResponse_1.ApiResponse.success(res, 'Student fees retrieved', {
            student: { ...student, monthlyFee: Number(student.monthlyFee) },
            invoices: invoices.map(serializeInvoice),
            outstanding,
        });
    }
    catch (error) {
        logger_1.logger.error('getStudentFees error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch student fees', 500);
    }
};
exports.getStudentFees = getStudentFees;
const getRegularPlayerFees = async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        if (isNaN(playerId))
            return apiResponse_1.ApiResponse.error(res, 'Invalid player id', 400);
        const player = await prisma.regularPlayer.findUnique({
            where: { id: playerId },
            select: { id: true, firstName: true, lastName: true, phone: true, playerId: true, monthlyFee: true, status: true },
        });
        if (!player)
            return apiResponse_1.ApiResponse.error(res, 'Regular player not found', 404);
        const invoices = await prisma.feeInvoice.findMany({
            where: { regularPlayerId: playerId },
            include: INVOICE_INCLUDE,
            orderBy: { billingMonth: 'desc' },
        });
        const outstanding = invoices
            .filter((i) => ['pending', 'partial'].includes(i.status))
            .reduce((sum, i) => sum + (Number(i.totalAmount) - Number(i.paidAmount)), 0);
        return apiResponse_1.ApiResponse.success(res, 'Regular player fees retrieved', {
            player: { ...player, monthlyFee: Number(player.monthlyFee) },
            invoices: invoices.map(serializeInvoice),
            outstanding,
        });
    }
    catch (error) {
        logger_1.logger.error('getRegularPlayerFees error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch regular player fees', 500);
    }
};
exports.getRegularPlayerFees = getRegularPlayerFees;
//# sourceMappingURL=fee.controller.js.map