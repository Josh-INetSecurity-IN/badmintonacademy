"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCharts = exports.getSummary = void 0;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
function getMonthKey(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${y}-${m}`;
}
function getMonthLabel(date) {
    return getMonthKey(date);
}
function last12Months() {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(getMonthLabel(d));
    }
    return months;
}
function last6Months() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(getMonthLabel(d));
    }
    return months;
}
function parseRange(range, from, to) {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    let start;
    if (from && to) {
        start = new Date(from);
        start.setHours(0, 0, 0, 0);
        const toD = new Date(to);
        toD.setHours(23, 59, 59, 999);
        return { start, end: toD };
    }
    switch (range) {
        case 'lastMonth': {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            return { start, end: lastEnd };
        }
        case 'last3Months':
            start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            break;
        case 'thisYear':
            start = new Date(now.getFullYear(), 0, 1);
            break;
        case 'thisMonth':
        default:
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
    }
    start.setHours(0, 0, 0, 0);
    return { start, end };
}
const getSummary = async (req, res) => {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const todayDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
        const [totalStudents, activeRegularPlayers, todayGuestBookings, monthlyRevenueResult, pendingFeesResult, overduePaymentsCount, monthExpensesResult, upcomingTournaments, todayBatches, newEnquiries, recentPayments, dueSoonCount, notifications,] = await Promise.all([
            prisma.student.count({ where: { status: 'active' } }),
            prisma.regularPlayer.count({ where: { status: 'active' } }),
            prisma.guestBooking.count({
                where: {
                    visitDate: { gte: todayStart, lte: todayEnd },
                    bookingStatus: { in: ['confirmed'] },
                },
            }),
            prisma.payment.aggregate({
                where: { paymentDate: { gte: monthStart, lte: monthEnd }, status: { in: ['paid', 'partial'] } },
                _sum: { finalAmount: true },
            }),
            prisma.feeInvoice.aggregate({
                where: { status: { in: ['pending', 'partial'] } },
                _sum: { totalAmount: true, paidAmount: true },
            }),
            prisma.feeInvoice.count({ where: { status: 'overdue' } }),
            prisma.expense.aggregate({
                where: { date: { gte: monthStart, lte: monthEnd } },
                _sum: { amount: true },
            }),
            prisma.tournament.count({
                where: { status: { in: ['published', 'registration_open'] }, startDate: { gte: now } },
            }),
            prisma.coachingBatch.count({
                where: { status: { in: ['active', 'full'] }, daysOfWeek: { contains: todayDayName } },
            }),
            prisma.contactEnquiry.count({
                where: {
                    createdAt: { gte: monthStart, lte: monthEnd },
                },
            }),
            prisma.payment.findMany({
                orderBy: { paymentDate: 'desc' },
                take: 5,
                include: {
                    student: { select: { id: true, firstName: true, lastName: true } },
                    regularPlayer: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            prisma.feeInvoice.count({
                where: { status: { in: ['pending', 'partial', 'overdue'] } },
            }),
            prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
        ]);
        const monthlyRevenue = Number(monthlyRevenueResult._sum.finalAmount ?? 0);
        const pendingFees = Number(pendingFeesResult._sum.totalAmount ?? 0) - Number(pendingFeesResult._sum.paidAmount ?? 0);
        const monthExpenses = Number(monthExpensesResult._sum.amount ?? 0);
        const netIncome = monthlyRevenue - monthExpenses;
        const todayExpectedPlayers = totalStudents + activeRegularPlayers + todayGuestBookings;
        const formattedPayments = recentPayments.map((p) => ({
            id: p.id,
            receiptNumber: p.receiptNumber,
            category: p.category,
            amount: Number(p.finalAmount),
            paymentMethod: p.paymentMethod,
            paymentDate: p.paymentDate,
            student: p.student,
            regularPlayer: p.regularPlayer,
        }));
        return apiResponse_1.ApiResponse.success(res, 'Dashboard summary retrieved', {
            totalStudents,
            activeRegularPlayers,
            todayExpectedPlayers,
            monthlyRevenue,
            pendingFees,
            overduePayments: overduePaymentsCount,
            monthExpenses,
            netIncome,
            upcomingTournaments,
            todayBatches,
            newEnquiries,
            recentPayments: formattedPayments,
            dueSoon: dueSoonCount,
            notifications,
        });
    }
    catch (error) {
        logger_1.logger.error('getSummary error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch dashboard summary', 500);
    }
};
exports.getSummary = getSummary;
const getCharts = async (req, res) => {
    try {
        const { range, from, to } = req.query;
        const { start, end } = parseRange(range, from, to);
        const months12 = last12Months();
        const months6 = last6Months();
        const [payments, expenses, studentsByBatch, subscriptionCounts, feeInvoiceCounts, admissionsByMonth, attendanceRecords, paymentsInRange,] = await Promise.all([
            prisma.payment.findMany({
                where: { paymentDate: { gte: new Date(months12[0] + '-01'), lte: end }, status: { in: ['paid', 'partial'] } },
                select: { finalAmount: true, paymentDate: true, category: true, paymentMethod: true },
            }),
            prisma.expense.findMany({
                where: { date: { gte: new Date(months12[0] + '-01'), lte: end } },
                select: { amount: true, date: true },
            }),
            prisma.coachingBatch.findMany({
                where: { status: { in: ['active', 'full'] } },
                select: {
                    name: true,
                    _count: { select: { students: { where: { status: 'active' } } } },
                },
            }),
            prisma.subscription.groupBy({
                by: ['paymentStatus'],
                _count: true,
            }),
            prisma.feeInvoice.groupBy({
                by: ['status'],
                _count: true,
            }),
            prisma.student.findMany({
                where: { createdAt: { gte: new Date(months6[0] + '-01'), lte: end } },
                select: { createdAt: true },
            }),
            prisma.attendance.findMany({
                where: { date: { gte: start, lte: end } },
                select: { date: true, status: true, regularPlayerId: true },
            }),
            prisma.payment.findMany({
                where: {
                    paymentDate: { gte: start, lte: end },
                    status: { in: ['paid', 'partial'] },
                },
                select: { finalAmount: true, category: true, paymentMethod: true },
            }),
        ]);
        const monthlyRevenueMap = {};
        for (const m of months12)
            monthlyRevenueMap[m] = 0;
        for (const p of payments) {
            const key = getMonthLabel(new Date(p.paymentDate));
            if (monthlyRevenueMap[key] !== undefined) {
                monthlyRevenueMap[key] += Number(p.finalAmount);
            }
        }
        const monthlyRevenue = months12.map((m) => ({ month: m, value: Math.round(monthlyRevenueMap[m] * 100) / 100 }));
        const monthlyExpensesMap = {};
        for (const m of months12)
            monthlyExpensesMap[m] = 0;
        for (const e of expenses) {
            const key = getMonthLabel(new Date(e.date));
            if (monthlyExpensesMap[key] !== undefined) {
                monthlyExpensesMap[key] += Number(e.amount);
            }
        }
        const monthlyExpenses = months12.map((m) => ({ month: m, value: Math.round(monthlyExpensesMap[m] * 100) / 100 }));
        const netIncome = months12.map((m, i) => ({
            month: m,
            value: Math.round((monthlyRevenue[i].value - monthlyExpenses[i].value) * 100) / 100,
        }));
        const studentsByBatchData = studentsByBatch.map((b) => ({
            batch: b.name,
            count: b._count.students,
        }));
        const subscriptionStatus = { active: 0, expired: 0, paused: 0, cancelled: 0 };
        for (const s of subscriptionCounts) {
            if (s.paymentStatus in subscriptionStatus) {
                subscriptionStatus[s.paymentStatus] = s._count;
            }
        }
        const feeCollectionStatus = { paid: 0, pending: 0, partial: 0, overdue: 0 };
        for (const f of feeInvoiceCounts) {
            if (f.status in feeCollectionStatus) {
                feeCollectionStatus[f.status] = f._count;
            }
        }
        const admissionsByMonthMap = {};
        for (const m of months6)
            admissionsByMonthMap[m] = 0;
        for (const s of admissionsByMonth) {
            const key = getMonthLabel(new Date(s.createdAt));
            if (admissionsByMonthMap[key] !== undefined) {
                admissionsByMonthMap[key]++;
            }
        }
        const admissionsByMonthData = months6.map((m) => ({ month: m, value: admissionsByMonthMap[m] }));
        const attendanceByMonth = {};
        for (const m of months12)
            attendanceByMonth[m] = { total: 0, present: 0 };
        for (const a of attendanceRecords) {
            const key = getMonthLabel(new Date(a.date));
            if (attendanceByMonth[key] !== undefined) {
                attendanceByMonth[key].total++;
                if (a.status === 'present' || a.status === 'late') {
                    attendanceByMonth[key].present++;
                }
            }
        }
        const regularAttendanceTrend = months12.map((m) => {
            const { total, present } = attendanceByMonth[m];
            return { month: m, value: total > 0 ? Math.round((present / total) * 100) : 0 };
        });
        const revenueByCategory = {
            coaching_fee: 0,
            regular_membership: 0,
            guest_booking: 0,
            product_sale: 0,
            tournament: 0,
            other: 0,
        };
        for (const p of paymentsInRange) {
            const cat = p.category in revenueByCategory ? p.category : 'other';
            revenueByCategory[cat] += Number(p.finalAmount);
        }
        for (const key of Object.keys(revenueByCategory)) {
            revenueByCategory[key] = Math.round(revenueByCategory[key] * 100) / 100;
        }
        const paymentMethods = {
            cash: 0,
            upi: 0,
            bank_transfer: 0,
            card: 0,
            other: 0,
        };
        for (const p of paymentsInRange) {
            const method = p.paymentMethod in paymentMethods ? p.paymentMethod : 'other';
            paymentMethods[method] += Number(p.finalAmount);
        }
        for (const key of Object.keys(paymentMethods)) {
            paymentMethods[key] = Math.round(paymentMethods[key] * 100) / 100;
        }
        return apiResponse_1.ApiResponse.success(res, 'Charts data retrieved', {
            monthlyRevenue,
            monthlyExpenses,
            netIncome,
            studentsByBatch: studentsByBatchData,
            subscriptionStatus,
            feeCollectionStatus,
            admissionsByMonth: admissionsByMonthData,
            regularAttendanceTrend,
            revenueByCategory,
            paymentMethods,
        });
    }
    catch (error) {
        logger_1.logger.error('getCharts error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch charts data', 500);
    }
};
exports.getCharts = getCharts;
//# sourceMappingURL=dashboard.controller.js.map