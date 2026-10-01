"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBooking = exports.getRevenue = exports.convertToRegular = exports.getDailyBookings = exports.completeBooking = exports.cancelBooking = exports.updateBooking = exports.createBooking = exports.getBooking = exports.getBookings = void 0;
exports.hasOverlap = hasOverlap;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const generateId_1 = require("../utils/generateId");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const parseDecimal = (value) => new client_1.Prisma.Decimal(value ?? 0);
function hasOverlap(start1, end1, start2, end2) {
    const toMinutes = (time) => {
        const [h, m] = time.split(':').map((part) => parseInt(part, 10));
        return (h || 0) * 60 + (m || 0);
    };
    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);
    if (isNaN(s1) || isNaN(e1) || isNaN(s2) || isNaN(e2))
        return false;
    return s1 < e2 && s2 < e1;
}
const getBookings = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || DEFAULT_PAGE);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
        const skip = (page - 1) * limit;
        const { date, courtId, status, search } = req.query;
        const where = {};
        if (date) {
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
                const start = new Date(d);
                start.setHours(0, 0, 0, 0);
                const end = new Date(d);
                end.setHours(23, 59, 59, 999);
                where.visitDate = { gte: start, lte: end };
            }
        }
        if (courtId && !isNaN(parseInt(courtId))) {
            where.courtId = parseInt(courtId);
        }
        if (status)
            where.bookingStatus = status;
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { phone: { contains: search } },
                { bookingNumber: { contains: search } },
            ];
        }
        const [bookings, total] = await Promise.all([
            prisma.guestBooking.findMany({
                where,
                include: { court: { select: { id: true, name: true } } },
                orderBy: { visitDate: 'desc' },
                skip,
                take: limit,
            }),
            prisma.guestBooking.count({ where }),
        ]);
        const data = bookings.map((b) => ({
            ...b,
            amount: Number(b.amount),
        }));
        return apiResponse_1.ApiResponse.paginated(res, data, total, page, limit);
    }
    catch (error) {
        logger_1.logger.error('getBookings error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch bookings', 500);
    }
};
exports.getBookings = getBookings;
const getBooking = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid booking id', 400);
        const booking = await prisma.guestBooking.findUnique({
            where: { id },
            include: { court: true },
        });
        if (!booking)
            return apiResponse_1.ApiResponse.error(res, 'Booking not found', 404);
        return apiResponse_1.ApiResponse.success(res, 'Booking retrieved', {
            ...booking,
            amount: Number(booking.amount),
        });
    }
    catch (error) {
        logger_1.logger.error('getBooking error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch booking', 500);
    }
};
exports.getBooking = getBooking;
const createBooking = async (req, res) => {
    try {
        const body = req.body;
        if (!body.name || !body.name.trim())
            return apiResponse_1.ApiResponse.error(res, 'name is required', 400);
        if (!body.phone)
            return apiResponse_1.ApiResponse.error(res, 'phone is required', 400);
        if (!body.visitDate)
            return apiResponse_1.ApiResponse.error(res, 'visitDate is required', 400);
        if (!body.courtId)
            return apiResponse_1.ApiResponse.error(res, 'courtId is required', 400);
        if (!body.startTime || !body.endTime)
            return apiResponse_1.ApiResponse.error(res, 'startTime and endTime are required', 400);
        const courtId = parseInt(body.courtId);
        const court = await prisma.court.findUnique({ where: { id: courtId } });
        if (!court)
            return apiResponse_1.ApiResponse.error(res, 'Court not found', 404);
        if (court.status === 'maintenance')
            return apiResponse_1.ApiResponse.error(res, 'Court is under maintenance', 400);
        if (court.status === 'inactive')
            return apiResponse_1.ApiResponse.error(res, 'Court is inactive', 400);
        const visitDate = new Date(body.visitDate);
        if (isNaN(visitDate.getTime()))
            return apiResponse_1.ApiResponse.error(res, 'Invalid visitDate', 400);
        const dayStart = new Date(visitDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(visitDate);
        dayEnd.setHours(23, 59, 59, 999);
        const existingBookings = await prisma.guestBooking.findMany({
            where: {
                courtId,
                visitDate: { gte: dayStart, lte: dayEnd },
                bookingStatus: { not: 'cancelled' },
            },
        });
        for (const existing of existingBookings) {
            if (hasOverlap(body.startTime, body.endTime, existing.startTime, existing.endTime)) {
                return apiResponse_1.ApiResponse.error(res, 'Court already booked for this time slot', 400);
            }
        }
        let bookingNumber = (0, generateId_1.generateBookingNumber)();
        let exists = await prisma.guestBooking.findUnique({ where: { bookingNumber } });
        for (let attempt = 0; attempt < 3 && exists; attempt++) {
            bookingNumber = (0, generateId_1.generateBookingNumber)();
            exists = await prisma.guestBooking.findUnique({ where: { bookingNumber } });
        }
        const booking = await prisma.guestBooking.create({
            data: {
                bookingNumber,
                name: body.name.trim(),
                phone: body.phone,
                whatsappNumber: body.whatsappNumber || undefined,
                email: body.email || undefined,
                visitDate,
                courtId,
                startTime: body.startTime,
                endTime: body.endTime,
                numberOfPlayers: body.numberOfPlayers ? parseInt(body.numberOfPlayers) : 1,
                amount: parseDecimal(body.amount),
                paymentMethod: body.paymentMethod || 'cash',
                paymentStatus: body.paymentStatus || 'paid',
                bookingStatus: 'confirmed',
                notes: body.notes || undefined,
            },
            include: { court: { select: { id: true, name: true } } },
        });
        return apiResponse_1.ApiResponse.created(res, 'Booking created successfully', {
            ...booking,
            amount: Number(booking.amount),
        });
    }
    catch (error) {
        logger_1.logger.error('createBooking error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to create booking', 500);
    }
};
exports.createBooking = createBooking;
const updateBooking = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid booking id', 400);
        const existing = await prisma.guestBooking.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Booking not found', 404);
        const body = req.body;
        const data = {};
        if (body.name !== undefined)
            data.name = body.name;
        if (body.phone !== undefined)
            data.phone = body.phone;
        if (body.whatsappNumber !== undefined)
            data.whatsappNumber = body.whatsappNumber;
        if (body.email !== undefined)
            data.email = body.email;
        if (body.visitDate !== undefined)
            data.visitDate = new Date(body.visitDate);
        if (body.courtId !== undefined)
            data.court = { connect: { id: parseInt(body.courtId) } };
        if (body.startTime !== undefined)
            data.startTime = body.startTime;
        if (body.endTime !== undefined)
            data.endTime = body.endTime;
        if (body.numberOfPlayers !== undefined)
            data.numberOfPlayers = parseInt(body.numberOfPlayers);
        if (body.amount !== undefined)
            data.amount = parseDecimal(body.amount);
        if (body.paymentMethod !== undefined)
            data.paymentMethod = body.paymentMethod;
        if (body.paymentStatus !== undefined)
            data.paymentStatus = body.paymentStatus;
        if (body.bookingStatus !== undefined)
            data.bookingStatus = body.bookingStatus;
        if (body.notes !== undefined)
            data.notes = body.notes;
        const booking = await prisma.guestBooking.update({
            where: { id },
            data,
            include: { court: { select: { id: true, name: true } } },
        });
        return apiResponse_1.ApiResponse.success(res, 'Booking updated successfully', {
            ...booking,
            amount: Number(booking.amount),
        });
    }
    catch (error) {
        logger_1.logger.error('updateBooking error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to update booking', 500);
    }
};
exports.updateBooking = updateBooking;
const cancelBooking = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid booking id', 400);
        const existing = await prisma.guestBooking.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Booking not found', 404);
        if (existing.bookingStatus === 'cancelled') {
            return apiResponse_1.ApiResponse.error(res, 'Booking is already cancelled', 400);
        }
        const booking = await prisma.guestBooking.update({
            where: { id },
            data: { bookingStatus: 'cancelled' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Booking cancelled successfully', booking);
    }
    catch (error) {
        logger_1.logger.error('cancelBooking error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to cancel booking', 500);
    }
};
exports.cancelBooking = cancelBooking;
const completeBooking = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid booking id', 400);
        const existing = await prisma.guestBooking.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Booking not found', 404);
        if (existing.bookingStatus !== 'confirmed') {
            return apiResponse_1.ApiResponse.error(res, 'Only confirmed bookings can be completed', 400);
        }
        const booking = await prisma.guestBooking.update({
            where: { id },
            data: { bookingStatus: 'completed' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Booking completed successfully', booking);
    }
    catch (error) {
        logger_1.logger.error('completeBooking error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to complete booking', 500);
    }
};
exports.completeBooking = completeBooking;
const getDailyBookings = async (req, res) => {
    try {
        const dateStr = req.query.date || new Date().toISOString().split('T')[0];
        const date = new Date(dateStr);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        const bookings = await prisma.guestBooking.findMany({
            where: {
                visitDate: { gte: dayStart, lte: dayEnd },
                bookingStatus: { not: 'cancelled' },
            },
            include: { court: { select: { id: true, name: true } } },
            orderBy: { startTime: 'asc' },
        });
        const grouped = {};
        for (const booking of bookings) {
            if (!grouped[booking.courtId])
                grouped[booking.courtId] = [];
            grouped[booking.courtId].push({
                ...booking,
                amount: Number(booking.amount),
            });
        }
        return apiResponse_1.ApiResponse.success(res, 'Daily bookings retrieved', { date: dateStr, groupedByCourt: grouped });
    }
    catch (error) {
        logger_1.logger.error('getDailyBookings error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch daily bookings', 500);
    }
};
exports.getDailyBookings = getDailyBookings;
const convertToRegular = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid booking id', 400);
        const booking = await prisma.guestBooking.findUnique({ where: { id } });
        if (!booking)
            return apiResponse_1.ApiResponse.error(res, 'Booking not found', 404);
        const nameParts = booking.name.trim().split(/\s+/);
        const firstName = nameParts[0] || booking.name;
        const lastName = nameParts.slice(1).join(' ') || '';
        let playerId = (0, generateId_1.generatePlayerId)();
        let exists = await prisma.regularPlayer.findUnique({ where: { playerId } });
        for (let attempt = 0; attempt < 3 && exists; attempt++) {
            playerId = (0, generateId_1.generatePlayerId)();
            exists = await prisma.regularPlayer.findUnique({ where: { playerId } });
        }
        const player = await prisma.regularPlayer.create({
            data: {
                playerId,
                firstName,
                lastName,
                phone: booking.phone,
                whatsappNumber: booking.whatsappNumber || undefined,
                email: booking.email || undefined,
                status: 'active',
                monthlyFee: new client_1.Prisma.Decimal(0),
            },
        });
        return apiResponse_1.ApiResponse.created(res, 'Guest converted to regular player', player);
    }
    catch (error) {
        logger_1.logger.error('convertToRegular error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to convert to regular player', 500);
    }
};
exports.convertToRegular = convertToRegular;
const getRevenue = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where = { category: 'guest_booking' };
        if (startDate || endDate) {
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
        const result = await prisma.payment.aggregate({
            where,
            _sum: { finalAmount: true },
            _count: true,
        });
        return apiResponse_1.ApiResponse.success(res, 'Revenue retrieved', {
            total: Number(result._sum.finalAmount ?? 0),
            count: result._count,
        });
    }
    catch (error) {
        logger_1.logger.error('getRevenue error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch revenue', 500);
    }
};
exports.getRevenue = getRevenue;
const deleteBooking = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid booking id', 400);
        const existing = await prisma.guestBooking.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Booking not found', 404);
        await prisma.guestBooking.update({
            where: { id },
            data: { bookingStatus: 'cancelled', notes: existing.notes ? `${existing.notes}\n[CANCELLED]` : '[CANCELLED]' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Booking deleted (cancelled) successfully');
    }
    catch (error) {
        logger_1.logger.error('deleteBooking error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to delete booking', 500);
    }
};
exports.deleteBooking = deleteBooking;
//# sourceMappingURL=guestBooking.controller.js.map