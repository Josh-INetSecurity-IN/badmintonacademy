import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const parseDecimal = (value: any): Prisma.Decimal => new Prisma.Decimal(value ?? 0);

export function timeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
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

function parseDays(raw: string | string[] | undefined | null): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getDayName(date: Date): string {
  return DAY_NAMES[(date.getDay() + 6) % 7];
}

export const getCourts = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const where: Prisma.CourtWhereInput = {};
    if (status) where.status = status as string;

    const [courts, total] = await Promise.all([
      prisma.court.findMany({
        where,
        include: {
          _count: {
            select: {
              GuestBooking: { where: { bookingStatus: { in: ['confirmed'] } } },
              CoachingBatch: { where: { status: { in: ['active', 'full'] } } },
              RegularBatch: { where: { status: { in: ['active', 'full'] } } },
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.court.count({ where }),
    ]);

    const data = courts.map((court) => ({
      id: court.id,
      name: court.name,
      courtType: court.courtType,
      surfaceType: court.surfaceType,
      location: court.location,
      hourlyRate: Number(court.hourlyRate),
      status: court.status,
      notes: court.notes,
      createdAt: court.createdAt,
      updatedAt: court.updatedAt,
      guestBookingCount: court._count.GuestBooking,
      coachingBatchCount: court._count.CoachingBatch,
      regularBatchCount: court._count.RegularBatch,
    }));

    return ApiResponse.paginated(res, data, total, page, limit);
  } catch (error: any) {
    logger.error('getCourts error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch courts', 500);
  }
};

export const getCourt = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid court id', 400);

    const court = await prisma.court.findUnique({
      where: { id },
      include: { CourtSchedule: true },
    });

    if (!court) return ApiResponse.error(res, 'Court not found', 404);

    return ApiResponse.success(res, 'Court retrieved', {
      ...court,
      hourlyRate: Number(court.hourlyRate),
    });
  } catch (error: any) {
    logger.error('getCourt error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch court', 500);
  }
};

export const createCourt = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.name || !body.name.trim()) {
      return ApiResponse.error(res, 'name is required', 400);
    }

    const court = await prisma.court.create({
      data: {
        name: body.name.trim(),
        courtType: body.courtType || 'indoor',
        surfaceType: body.surfaceType || undefined,
        location: body.location || undefined,
        hourlyRate: parseDecimal(body.hourlyRate),
        status: body.status || 'available',
        notes: body.notes || undefined,
      },
    });

    return ApiResponse.created(res, 'Court created successfully', {
      ...court,
      hourlyRate: Number(court.hourlyRate),
    });
  } catch (error: any) {
    logger.error('createCourt error:', error.message);
    return ApiResponse.error(res, 'Failed to create court', 500);
  }
};

export const updateCourt = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid court id', 400);

    const existing = await prisma.court.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Court not found', 404);

    const body = req.body;
    const data: Prisma.CourtUpdateInput = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.courtType !== undefined) data.courtType = body.courtType;
    if (body.surfaceType !== undefined) data.surfaceType = body.surfaceType;
    if (body.location !== undefined) data.location = body.location;
    if (body.hourlyRate !== undefined) data.hourlyRate = parseDecimal(body.hourlyRate);
    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes;

    const court = await prisma.court.update({ where: { id }, data });
    return ApiResponse.success(res, 'Court updated successfully', {
      ...court,
      hourlyRate: Number(court.hourlyRate),
    });
  } catch (error: any) {
    logger.error('updateCourt error:', error.message);
    return ApiResponse.error(res, 'Failed to update court', 500);
  }
};

export const deleteCourt = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid court id', 400);

    const existing = await prisma.court.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Court not found', 404);

    await prisma.court.update({ where: { id }, data: { status: 'inactive' } });
    return ApiResponse.success(res, 'Court deactivated successfully');
  } catch (error: any) {
    logger.error('deleteCourt error:', error.message);
    return ApiResponse.error(res, 'Failed to delete court', 500);
  }
};

export const getCourtSchedule = async (req: Request, res: Response) => {
  try {
    const { dayOfWeek, courtId } = req.query;

    const targetDay = dayOfWeek as string | undefined;
    const targetCourtId = courtId && !isNaN(parseInt(courtId as string)) ? parseInt(courtId as string) : undefined;

    const courtWhere: Prisma.CourtWhereInput = { status: { not: 'inactive' } };
    if (targetCourtId) courtWhere.id = targetCourtId;

    const coachingBatches = await prisma.coachingBatch.findMany({
      where: {
        status: { in: ['active', 'full'] },
        ...(targetCourtId ? { courtId: targetCourtId } : {}),
      },
      include: {
        coach: { select: { id: true, firstName: true, lastName: true } },
        court: { select: { id: true, name: true } },
      },
    });

    const regularBatches = await prisma.regularBatch.findMany({
      where: {
        status: { in: ['active', 'full'] },
        ...(targetCourtId ? { courtId: targetCourtId } : {}),
      },
      include: { court: { select: { id: true, name: true } } },
    });

    const guestBookings = await prisma.guestBooking.findMany({
      where: {
        bookingStatus: 'confirmed',
        ...(targetCourtId ? { courtId: targetCourtId } : {}),
      },
      include: { court: { select: { id: true, name: true } } },
    });

    const maintenanceSchedules = await prisma.courtSchedule.findMany({
      where: {
        type: 'maintenance',
        status: 'active',
        ...(targetCourtId ? { courtId: targetCourtId } : {}),
      },
      include: { court: { select: { id: true, name: true } } },
    });

    const scheduleItems: any[] = [];

    for (const batch of coachingBatches) {
      const batchDays = parseDays(batch.daysOfWeek);
      for (const day of batchDays) {
        if (targetDay && day !== targetDay) continue;
        scheduleItems.push({
          type: 'batch',
          dayOfWeek: day,
          startTime: batch.startTime,
          endTime: batch.endTime,
          title: batch.name,
          courtId: batch.courtId,
          court: batch.court,
          refId: batch.id,
          refType: 'CoachingBatch',
          coach: batch.coach,
          color: batch.color,
        });
      }
    }

    for (const batch of regularBatches) {
      const batchDays = parseDays(batch.daysOfWeek);
      for (const day of batchDays) {
        if (targetDay && day !== targetDay) continue;
        scheduleItems.push({
          type: 'regular',
          dayOfWeek: day,
          startTime: batch.startTime,
          endTime: batch.endTime,
          title: batch.name,
          courtId: batch.courtId,
          court: batch.court,
          refId: batch.id,
          refType: 'RegularBatch',
          maxPlayers: batch.maxPlayers,
          monthlyPrice: Number(batch.monthlyPrice),
        });
      }
    }

    for (const booking of guestBookings) {
      const visitDay = getDayName(new Date(booking.visitDate));
      if (targetDay && visitDay !== targetDay) continue;
      scheduleItems.push({
        type: 'guest',
        dayOfWeek: visitDay,
        startTime: booking.startTime,
        endTime: booking.endTime,
        title: `Guest: ${booking.name}`,
        courtId: booking.courtId,
        court: booking.court,
        refId: booking.id,
        refType: 'GuestBooking',
        bookingNumber: booking.bookingNumber,
        numberOfPlayers: booking.numberOfPlayers,
      });
    }

    for (const ms of maintenanceSchedules) {
      if (targetDay && ms.dayOfWeek !== targetDay) continue;
      scheduleItems.push({
        type: 'maintenance',
        dayOfWeek: ms.dayOfWeek,
        startTime: ms.startTime,
        endTime: ms.endTime,
        title: 'Maintenance',
        courtId: ms.courtId,
        court: ms.court,
        refId: ms.id,
        refType: 'CourtSchedule',
        status: ms.status,
      });
    }

    scheduleItems.sort((a, b) => {
      const dayDiff = DAY_NAMES.indexOf(a.dayOfWeek) - DAY_NAMES.indexOf(b.dayOfWeek);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    return ApiResponse.success(res, 'Court schedule retrieved', scheduleItems);
  } catch (error: any) {
    logger.error('getCourtSchedule error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch court schedule', 500);
  }
};

export const getWeeklyTimetable = async (req: Request, res: Response) => {
  try {
    const courts = await prisma.court.findMany({
      where: { status: { not: 'inactive' } },
      orderBy: { name: 'asc' },
    });

    const coachingBatches = await prisma.coachingBatch.findMany({
      where: { status: { in: ['active', 'full'] } },
      include: { coach: { select: { id: true, firstName: true, lastName: true } } },
    });

    const regularBatches = await prisma.regularBatch.findMany({
      where: { status: { in: ['active', 'full'] } },
    });

    const maintenanceSchedules = await prisma.courtSchedule.findMany({
      where: { type: 'maintenance', status: 'active' },
    });

    const timetable = courts.map((court) => {
      const days: Record<string, any[]> = {};
      for (const day of DAY_NAMES) days[day] = [];

      for (const batch of coachingBatches) {
        if (batch.courtId !== court.id) continue;
        const batchDays = parseDays(batch.daysOfWeek);
        for (const day of batchDays) {
          if (!days[day]) continue;
          days[day].push({
            type: 'batch',
            id: batch.id,
            name: batch.name,
            startTime: batch.startTime,
            endTime: batch.endTime,
            color: batch.color,
            coach: batch.coach,
            programType: batch.programType,
            skillLevel: batch.skillLevel,
          });
        }
      }

      for (const batch of regularBatches) {
        if (batch.courtId !== court.id) continue;
        const batchDays = parseDays(batch.daysOfWeek);
        for (const day of batchDays) {
          if (!days[day]) continue;
          days[day].push({
            type: 'regular',
            id: batch.id,
            name: batch.name,
            startTime: batch.startTime,
            endTime: batch.endTime,
            maxPlayers: batch.maxPlayers,
            monthlyPrice: Number(batch.monthlyPrice),
          });
        }
      }

      for (const ms of maintenanceSchedules) {
        if (ms.courtId !== court.id) continue;
        if (days[ms.dayOfWeek]) {
          days[ms.dayOfWeek].push({
            type: 'maintenance',
            id: ms.id,
            startTime: ms.startTime,
            endTime: ms.endTime,
          });
        }
      }

      for (const day of DAY_NAMES) {
        days[day].sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
      }

      return {
        id: court.id,
        name: court.name,
        courtType: court.courtType,
        days,
      };
    });

    return ApiResponse.success(res, 'Weekly timetable retrieved', timetable);
  } catch (error: any) {
    logger.error('getWeeklyTimetable error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch weekly timetable', 500);
  }
};
