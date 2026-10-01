"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportOutstandingReport = exports.exportExpenseReport = exports.exportRevenueReport = exports.getCollectedVsPending = exports.getOperationalReport = exports.getOutstandingReport = exports.getNetIncome = exports.getExpenseReport = exports.getRevenueReport = void 0;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const logger_1 = require("../utils/logger");
const csv_1 = require("../utils/csv");
const prisma = new client_1.PrismaClient();
const REVENUE_CATEGORIES = [
    'coaching_fee',
    'regular_membership',
    'guest_booking',
    'product_sale',
    'tournament',
    'other',
];
const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'card', 'other'];
const pad = (n) => n.toString().padStart(2, '0');
const round2 = (n) => Math.round(n * 100) / 100;
const parseDateOnly = (input) => {
    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(input).trim());
    if (match) {
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    return new Date(input);
};
function getDateRange(from, to) {
    const now = new Date();
    if (from && to) {
        try {
            const start = parseDateOnly(String(from));
            start.setHours(0, 0, 0, 0);
            const end = parseDateOnly(String(to));
            end.setHours(23, 59, 59, 999);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                return { start, end };
            }
        }
        catch {
            // fall through to defaults
        }
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
}
function buildPaymentWhere(from, to, category) {
    const { start, end } = getDateRange(from, to);
    const where = {
        paymentDate: { gte: start, lte: end },
        status: { in: ['paid', 'partial'] },
    };
    if (category) {
        where.category = String(category);
    }
    return { where, start, end };
}
function buildExpenseWhere(from, to, category) {
    const { start, end } = getDateRange(from, to);
    const where = {
        date: { gte: start, lte: end },
    };
    if (category) {
        where.category = String(category);
    }
    return { where, start, end };
}
const formatDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const getRevenueReport = async (req, res) => {
    try {
        const { from, to, category } = req.query;
        const { where, start, end } = buildPaymentWhere(from, to, category);
        const payments = await prisma.payment.findMany({
            where,
            select: { finalAmount: true, category: true, paymentMethod: true, paymentDate: true },
        });
        const total = payments.reduce((sum, p) => sum + Number(p.finalAmount), 0);
        const byCategory = {};
        for (const c of REVENUE_CATEGORIES)
            byCategory[c] = 0;
        const byMethod = {};
        for (const m of PAYMENT_METHODS)
            byMethod[m] = 0;
        const byMonthMap = {};
        const dailyMap = {};
        for (const p of payments) {
            const cat = byCategory[p.category] !== undefined ? p.category : 'other';
            byCategory[cat] += Number(p.finalAmount);
            const method = byMethod[p.paymentMethod] !== undefined ? p.paymentMethod : 'other';
            byMethod[method] += Number(p.finalAmount);
            const monthKey = `${p.paymentDate.getFullYear()}-${pad(p.paymentDate.getMonth() + 1)}`;
            if (!byMonthMap[monthKey])
                byMonthMap[monthKey] = { value: 0, count: 0 };
            byMonthMap[monthKey].value += Number(p.finalAmount);
            byMonthMap[monthKey].count += 1;
            const dayKey = formatDateStr(p.paymentDate);
            dailyMap[dayKey] = (dailyMap[dayKey] || 0) + Number(p.finalAmount);
        }
        const byMonth = Object.entries(byMonthMap)
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([month, v]) => ({ month, value: round2(v.value), count: v.count }));
        const daily = Object.entries(dailyMap)
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([date, value]) => ({ date, value: round2(value) }));
        for (const key of Object.keys(byCategory))
            byCategory[key] = round2(byCategory[key]);
        for (const key of Object.keys(byMethod))
            byMethod[key] = round2(byMethod[key]);
        return apiResponse_1.ApiResponse.success(res, 'Revenue report retrieved', {
            total: round2(total),
            count: payments.length,
            from: start,
            to: end,
            byCategory,
            byMonth,
            byPaymentMethod: byMethod,
            daily,
        });
    }
    catch (error) {
        logger_1.logger.error('getRevenueReport error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch revenue report', 500, error.message);
    }
};
exports.getRevenueReport = getRevenueReport;
const getExpenseReport = async (req, res) => {
    try {
        const { from, to, category } = req.query;
        const { where, start, end } = buildExpenseWhere(from, to, category);
        const expenses = await prisma.expense.findMany({
            where,
            select: { amount: true, category: true, date: true },
        });
        const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const byCategory = {};
        const byMonthMap = {};
        for (const e of expenses) {
            byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
            const monthKey = `${e.date.getFullYear()}-${pad(e.date.getMonth() + 1)}`;
            byMonthMap[monthKey] = (byMonthMap[monthKey] || 0) + Number(e.amount);
        }
        const byMonth = Object.entries(byMonthMap)
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([month, value]) => ({ month, value: round2(value) }));
        for (const key of Object.keys(byCategory))
            byCategory[key] = round2(byCategory[key]);
        return apiResponse_1.ApiResponse.success(res, 'Expense report retrieved', {
            total: round2(total),
            count: expenses.length,
            from: start,
            to: end,
            byCategory,
            byMonth,
        });
    }
    catch (error) {
        logger_1.logger.error('getExpenseReport error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch expense report', 500, error.message);
    }
};
exports.getExpenseReport = getExpenseReport;
const getNetIncome = async (req, res) => {
    try {
        const { from, to } = req.query;
        const { start, end } = getDateRange(from, to);
        const [revenueAgg, expenseAgg] = await Promise.all([
            prisma.payment.aggregate({
                where: { paymentDate: { gte: start, lte: end }, status: { in: ['paid', 'partial'] } },
                _sum: { finalAmount: true },
            }),
            prisma.expense.aggregate({
                where: { date: { gte: start, lte: end } },
                _sum: { amount: true },
            }),
        ]);
        const revenue = Number(revenueAgg._sum.finalAmount ?? 0);
        const expenses = Number(expenseAgg._sum.amount ?? 0);
        const netIncome = round2(revenue - expenses);
        return apiResponse_1.ApiResponse.success(res, 'Net income retrieved', {
            revenue: round2(revenue),
            expenses: round2(expenses),
            netIncome,
            from: start,
            to: end,
        });
    }
    catch (error) {
        logger_1.logger.error('getNetIncome error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch net income', 500, error.message);
    }
};
exports.getNetIncome = getNetIncome;
const getOutstandingReport = async (req, res) => {
    try {
        const invoices = await prisma.feeInvoice.findMany({
            where: { status: { in: ['pending', 'partial', 'overdue'] } },
            select: {
                id: true,
                invoiceNumber: true,
                studentId: true,
                regularPlayerId: true,
                status: true,
                totalAmount: true,
                paidAmount: true,
                dueDate: true,
                billingMonth: true,
            },
            orderBy: { dueDate: 'asc' },
        });
        const byStatus = {
            pending: { count: 0, amount: 0 },
            partial: { count: 0, amount: 0 },
            overdue: { count: 0, amount: 0 },
        };
        let totalOutstanding = 0;
        for (const inv of invoices) {
            const outstanding = Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount));
            totalOutstanding += outstanding;
            if (byStatus[inv.status]) {
                byStatus[inv.status].count += 1;
                byStatus[inv.status].amount += outstanding;
            }
        }
        return apiResponse_1.ApiResponse.success(res, 'Outstanding report retrieved', {
            totalOutstanding: round2(totalOutstanding),
            count: invoices.length,
            byStatus: {
                pending: {
                    count: byStatus.pending.count,
                    amount: round2(byStatus.pending.amount),
                },
                partial: {
                    count: byStatus.partial.count,
                    amount: round2(byStatus.partial.amount),
                },
                overdue: {
                    count: byStatus.overdue.count,
                    amount: round2(byStatus.overdue.amount),
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('getOutstandingReport error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch outstanding report', 500, error.message);
    }
};
exports.getOutstandingReport = getOutstandingReport;
const getOperationalReport = async (req, res) => {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const [totalStudents, retainedPlayers, totalRegularPlayers, coachingBatches, guestBookingsThisMonth, totalCourts, schedules, attendanceRecords, newAdmissions, renewals, expiredSubscriptions, lowStockProducts,] = await Promise.all([
            prisma.student.count({ where: { status: 'active' } }),
            prisma.regularPlayer.count({ where: { status: { in: ['active', 'payment_due', 'overdue'] } } }),
            prisma.regularPlayer.count(),
            prisma.coachingBatch.findMany({
                where: { status: { in: ['active', 'full'] } },
                select: {
                    name: true,
                    _count: { select: { students: { where: { status: 'active' } } } },
                },
            }),
            prisma.guestBooking.count({
                where: {
                    visitDate: { gte: monthStart, lte: monthEnd },
                    bookingStatus: { in: ['confirmed', 'completed'] },
                },
            }),
            prisma.court.count({ where: { status: { in: ['available', 'maintenance'] } } }),
            prisma.courtSchedule.findMany({ where: { status: 'active' }, select: { type: true } }),
            prisma.attendance.findMany({
                where: { date: { gte: monthStart, lte: monthEnd } },
                select: { status: true },
            }),
            prisma.student.count({ where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
            prisma.subscription.count({ where: { startDate: { gte: monthStart, lte: monthEnd } } }),
            prisma.subscription.count({
                where: {
                    OR: [
                        { paymentStatus: 'expired' },
                        { paymentStatus: 'active', endDate: { lt: now } },
                    ],
                },
            }),
            prisma.product.findMany({
                where: { status: 'active' },
                select: { name: true, stockQuantity: true, lowStockThreshold: true },
            }),
        ]);
        const studentsByBatch = coachingBatches.map((b) => ({
            batch: b.name,
            count: b._count.students,
        }));
        const activeRegularPlayers = retainedPlayers;
        const bookedSlots = schedules.filter((s) => s.type !== 'maintenance').length;
        const totalSlots = schedules.length;
        const courtUtilization = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;
        let attendances = attendanceRecords.filter((a) => a.status !== 'holiday' && a.status !== 'cancelled');
        const presentCount = attendances.filter((a) => a.status === 'present' || a.status === 'late').length;
        const attendanceOverall = attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 0;
        const playerRetention = totalRegularPlayers > 0 ? Math.round((activeRegularPlayers / totalRegularPlayers) * 100) : 0;
        const lowStock = lowStockProducts
            .filter((p) => p.stockQuantity <= p.lowStockThreshold)
            .map((p) => ({ name: p.name, stockQuantity: p.stockQuantity }));
        return apiResponse_1.ApiResponse.success(res, 'Operational report retrieved', {
            totalStudents,
            studentsByBatch,
            activeRegularPlayers,
            guestBookingsThisMonth,
            totalCourts,
            courtUtilization,
            attendanceOverall,
            newAdmissionsThisMonth: newAdmissions,
            subscriptionRenewalsThisMonth: renewals,
            expiredMemberships: expiredSubscriptions,
            playerRetention,
            lowStockProducts: lowStock,
            reportMonth: `${now.getFullYear()}-${pad(now.getMonth() + 1)}`,
        });
    }
    catch (error) {
        logger_1.logger.error('getOperationalReport error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch operational report', 500, error.message);
    }
};
exports.getOperationalReport = getOperationalReport;
const getCollectedVsPending = async (req, res) => {
    try {
        const { from, to } = req.query;
        const { start, end } = getDateRange(from, to);
        const collectedAgg = await prisma.payment.aggregate({
            where: { paymentDate: { gte: start, lte: end }, status: { in: ['paid', 'partial'] } },
            _sum: { finalAmount: true },
        });
        const invoices = await prisma.feeInvoice.findMany({
            where: { status: { in: ['pending', 'partial', 'overdue'] } },
            select: { status: true, totalAmount: true, paidAmount: true, dueDate: true },
        });
        let pending = 0;
        let overdue = 0;
        for (const inv of invoices) {
            const outstanding = Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount));
            if (inv.status === 'overdue') {
                overdue += outstanding;
            }
            else if (inv.dueDate >= start && inv.dueDate <= end) {
                pending += outstanding;
            }
        }
        const collected = Number(collectedAgg._sum.finalAmount ?? 0);
        return apiResponse_1.ApiResponse.success(res, 'Collected vs pending retrieved', {
            collected: round2(collected),
            pending: round2(pending),
            overdue: round2(overdue),
            from: start,
            to: end,
        });
    }
    catch (error) {
        logger_1.logger.error('getCollectedVsPending error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch collected vs pending', 500, error.message);
    }
};
exports.getCollectedVsPending = getCollectedVsPending;
const exportRevenueReport = async (req, res) => {
    try {
        const { from, to, category } = req.query;
        const { where } = buildPaymentWhere(from, to, category);
        const payments = await prisma.payment.findMany({
            where,
            orderBy: { paymentDate: 'desc' },
            include: {
                student: { select: { firstName: true, lastName: true } },
                regularPlayer: { select: { firstName: true, lastName: true } },
            },
        });
        const headers = [
            'Receipt No',
            'Date',
            'Category',
            'Member',
            'Amount',
            'Discount',
            'Tax',
            'Final Amount',
            'Payment Method',
            'Status',
        ];
        const rows = payments.map((p) => [
            p.receiptNumber,
            formatDateStr(p.paymentDate),
            p.category,
            p.student
                ? `${p.student.firstName} ${p.student.lastName}`.trim()
                : p.regularPlayer
                    ? `${p.regularPlayer.firstName} ${p.regularPlayer.lastName}`.trim()
                    : '',
            Number(p.amount),
            Number(p.discount),
            Number(p.tax),
            Number(p.finalAmount),
            p.paymentMethod,
            p.status,
        ]);
        const csv = (0, csv_1.toCSV)(headers, rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=revenue-report.csv');
        return res.send(csv);
    }
    catch (error) {
        logger_1.logger.error('exportRevenueReport error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to export revenue report', 500, error.message);
    }
};
exports.exportRevenueReport = exportRevenueReport;
const exportExpenseReport = async (req, res) => {
    try {
        const { from, to, category } = req.query;
        const { where } = buildExpenseWhere(from, to, category);
        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { date: 'desc' },
        });
        const headers = [
            'Category',
            'Description',
            'Amount',
            'Date',
            'Payment Method',
            'Vendor',
            'Notes',
        ];
        const rows = expenses.map((e) => [
            e.category,
            e.description,
            Number(e.amount),
            formatDateStr(e.date),
            e.paymentMethod,
            e.vendor || '',
            e.notes || '',
        ]);
        const csv = (0, csv_1.toCSV)(headers, rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=expense-report.csv');
        return res.send(csv);
    }
    catch (error) {
        logger_1.logger.error('exportExpenseReport error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to export expense report', 500, error.message);
    }
};
exports.exportExpenseReport = exportExpenseReport;
const exportOutstandingReport = async (req, res) => {
    try {
        const invoices = await prisma.feeInvoice.findMany({
            where: { status: { in: ['pending', 'partial', 'overdue'] } },
            orderBy: { dueDate: 'asc' },
            include: {
                student: { select: { firstName: true, lastName: true } },
                regularPlayer: { select: { firstName: true, lastName: true } },
            },
        });
        const headers = [
            'Invoice No',
            'Member',
            'Billing Month',
            'Total Amount',
            'Paid Amount',
            'Outstanding',
            'Status',
            'Due Date',
        ];
        const rows = invoices.map((inv) => [
            inv.invoiceNumber,
            inv.student
                ? `${inv.student.firstName} ${inv.student.lastName}`.trim()
                : inv.regularPlayer
                    ? `${inv.regularPlayer.firstName} ${inv.regularPlayer.lastName}`.trim()
                    : '',
            inv.billingMonth,
            Number(inv.totalAmount),
            Number(inv.paidAmount),
            Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount)),
            inv.status,
            formatDateStr(inv.dueDate),
        ]);
        const csv = (0, csv_1.toCSV)(headers, rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=outstanding-report.csv');
        return res.send(csv);
    }
    catch (error) {
        logger_1.logger.error('exportOutstandingReport error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to export outstanding report', 500, error.message);
    }
};
exports.exportOutstandingReport = exportOutstandingReport;
//# sourceMappingURL=report.controller.js.map