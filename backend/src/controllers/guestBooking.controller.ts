import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { ApiResponse } from '../utils/apiResponse';
import { generateBookingNumber, generatePlayerId } from '../utils/generateId';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const parseDecimal = (value: any): Prisma.Decimal => new Prisma.Decimal(value ?? 0);

export function hasOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const toMinutes = (time: string): number => {
    const [h, m] = time.split(':').map((part) => parseInt(part, 10));
    return (h || 0) * 60 + (m || 0);
  };
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);
  if (isNaN(s1) || isNaN(e1) || isNaN(s2) || isNaN(e2)) return false;
  return s1 < e2 && s2 < e1;
}

export const getBookings = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit as string) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;
    const { date, courtId, status, search } = req.query;

    const where: Prisma.GuestBookingWhereInput = {};

    if (date) {
      const d = new Date(date as string);
      if (!isNaN(d.getTime())) {
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        where.visitDate = { gte: start, lte: end };
      }
    }
    if (courtId && !isNaN(parseInt(courtId as string))) {
      where.courtId = parseInt(courtId as string);
    }
    if (status) where.bookingStatus = status as string;
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { phone: { contains: search as string } },
        { bookingNumber: { contains: search as string } },
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

    return ApiResponse.paginated(res, data, total, page, limit);
  } catch (error: any) {
    logger.error('getBookings error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch bookings', 500);
  }
};

export const getBooking = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid booking id', 400);

    const booking = await prisma.guestBooking.findUnique({
      where: { id },
      include: { court: true },
    });

    if (!booking) return ApiResponse.error(res, 'Booking not found', 404);

    return ApiResponse.success(res, 'Booking retrieved', {
      ...booking,
      amount: Number(booking.amount),
    });
  } catch (error: any) {
    logger.error('getBooking error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch booking', 500);
  }
};

export const createBooking = async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.name || !body.name.trim()) return ApiResponse.error(res, 'name is required', 400);
    if (!body.phone) return ApiResponse.error(res, 'phone is required', 400);
    if (!body.visitDate) return ApiResponse.error(res, 'visitDate is required', 400);
    if (!body.courtId) return ApiResponse.error(res, 'courtId is required', 400);
    if (!body.startTime || !body.endTime) return ApiResponse.error(res, 'startTime and endTime are required', 400);

    const courtId = parseInt(body.courtId);
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) return ApiResponse.error(res, 'Court not found', 404);
    if (court.status === 'maintenance') return ApiResponse.error(res, 'Court is under maintenance', 400);
    if (court.status === 'inactive') return ApiResponse.error(res, 'Court is inactive', 400);

    const visitDate = new Date(body.visitDate);
    if (isNaN(visitDate.getTime())) return ApiResponse.error(res, 'Invalid visitDate', 400);
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
        return ApiResponse.error(res, 'Court already booked for this time slot', 400);
      }
    }

    let bookingNumber = generateBookingNumber();
    let exists = await prisma.guestBooking.findUnique({ where: { bookingNumber } });
    for (let attempt = 0; attempt < 3 && exists; attempt++) {
      bookingNumber = generateBookingNumber();
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

    return ApiResponse.created(res, 'Booking created successfully', {
      ...booking,
      amount: Number(booking.amount),
    });
  } catch (error: any) {
    logger.error('createBooking error:', error.message);
    return ApiResponse.error(res, 'Failed to create booking', 500);
  }
};

export const updateBooking = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid booking id', 400);

    const existing = await prisma.guestBooking.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Booking not found', 404);

    const body = req.body;
    const data: Prisma.GuestBookingUpdateInput = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.whatsappNumber !== undefined) data.whatsappNumber = body.whatsappNumber;
    if (body.email !== undefined) data.email = body.email;
    if (body.visitDate !== undefined) data.visitDate = new Date(body.visitDate);
    if (body.courtId !== undefined) data.court = { connect: { id: parseInt(body.courtId) } };
    if (body.startTime !== undefined) data.startTime = body.startTime;
    if (body.endTime !== undefined) data.endTime = body.endTime;
    if (body.numberOfPlayers !== undefined) data.numberOfPlayers = parseInt(body.numberOfPlayers);
    if (body.amount !== undefined) data.amount = parseDecimal(body.amount);
    if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;
    if (body.paymentStatus !== undefined) data.paymentStatus = body.paymentStatus;
    if (body.bookingStatus !== undefined) data.bookingStatus = body.bookingStatus;
    if (body.notes !== undefined) data.notes = body.notes;

    const booking = await prisma.guestBooking.update({
      where: { id },
      data,
      include: { court: { select: { id: true, name: true } } },
    });

    return ApiResponse.success(res, 'Booking updated successfully', {
      ...booking,
      amount: Number(booking.amount),
    });
  } catch (error: any) {
    logger.error('updateBooking error:', error.message);
    return ApiResponse.error(res, 'Failed to update booking', 500);
  }
};

export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid booking id', 400);

    const existing = await prisma.guestBooking.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Booking not found', 404);

    if (existing.bookingStatus === 'cancelled') {
      return ApiResponse.error(res, 'Booking is already cancelled', 400);
    }

    const booking = await prisma.guestBooking.update({
      where: { id },
      data: { bookingStatus: 'cancelled' },
    });

    return ApiResponse.success(res, 'Booking cancelled successfully', booking);
  } catch (error: any) {
    logger.error('cancelBooking error:', error.message);
    return ApiResponse.error(res, 'Failed to cancel booking', 500);
  }
};

export const completeBooking = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid booking id', 400);

    const existing = await prisma.guestBooking.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Booking not found', 404);

    if (existing.bookingStatus !== 'confirmed') {
      return ApiResponse.error(res, 'Only confirmed bookings can be completed', 400);
    }

    const booking = await prisma.guestBooking.update({
      where: { id },
      data: { bookingStatus: 'completed' },
    });

    return ApiResponse.success(res, 'Booking completed successfully', booking);
  } catch (error: any) {
    logger.error('completeBooking error:', error.message);
    return ApiResponse.error(res, 'Failed to complete booking', 500);
  }
};

export const getDailyBookings = async (req: Request, res: Response) => {
  try {
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
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

    const grouped: Record<number, any[]> = {};
    for (const booking of bookings) {
      if (!grouped[booking.courtId]) grouped[booking.courtId] = [];
      grouped[booking.courtId].push({
        ...booking,
        amount: Number(booking.amount),
      });
    }

    return ApiResponse.success(res, 'Daily bookings retrieved', { date: dateStr, groupedByCourt: grouped });
  } catch (error: any) {
    logger.error('getDailyBookings error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch daily bookings', 500);
  }
};

export const convertToRegular = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid booking id', 400);

    const booking = await prisma.guestBooking.findUnique({ where: { id } });
    if (!booking) return ApiResponse.error(res, 'Booking not found', 404);

    const nameParts = booking.name.trim().split(/\s+/);
    const firstName = nameParts[0] || booking.name;
    const lastName = nameParts.slice(1).join(' ') || '';

    let playerId = generatePlayerId();
    let exists = await prisma.regularPlayer.findUnique({ where: { playerId } });
    for (let attempt = 0; attempt < 3 && exists; attempt++) {
      playerId = generatePlayerId();
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
        monthlyFee: new Prisma.Decimal(0),
      },
    });

    return ApiResponse.created(res, 'Guest converted to regular player', player);
  } catch (error: any) {
    logger.error('convertToRegular error:', error.message);
    return ApiResponse.error(res, 'Failed to convert to regular player', 500);
  }
};

export const getRevenue = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: Prisma.PaymentWhereInput = { category: 'guest_booking' };

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        const s = new Date(startDate as string);
        s.setHours(0, 0, 0, 0);
        where.paymentDate.gte = s;
      }
      if (endDate) {
        const e = new Date(endDate as string);
        e.setHours(23, 59, 59, 999);
        where.paymentDate.lte = e;
      }
    }

    const result = await prisma.payment.aggregate({
      where,
      _sum: { finalAmount: true },
      _count: true,
    });

    return ApiResponse.success(res, 'Revenue retrieved', {
      total: Number(result._sum.finalAmount ?? 0),
      count: result._count,
    });
  } catch (error: any) {
    logger.error('getRevenue error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch revenue', 500);
  }
};

export const deleteBooking = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid booking id', 400);

    const existing = await prisma.guestBooking.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Booking not found', 404);

    await prisma.guestBooking.update({
      where: { id },
      data: { bookingStatus: 'cancelled', notes: existing.notes ? `${existing.notes}\n[CANCELLED]` : '[CANCELLED]' },
    });

    return ApiResponse.success(res, 'Booking deleted (cancelled) successfully');
  } catch (error: any) {
    logger.error('deleteBooking error:', error.message);
    return ApiResponse.error(res, 'Failed to delete booking', 500);
  }
};
