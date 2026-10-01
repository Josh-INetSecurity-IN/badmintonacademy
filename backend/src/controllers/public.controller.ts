import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const safeParseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const parseValue = (value: string | null, type: string): any => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (type === 'json') {
    return safeParseJson(value, value);
  }
  if (type === 'number') {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }
  if (type === 'boolean') {
    return value === 'true' || value === '1';
  }
  return value;
};

export const getAcademyInfo = async (req: Request, res: Response) => {
  try {
    const [settings, heroSlides, programs, facilities, testimonials] = await Promise.all([
      prisma.academySetting.findMany(),
      prisma.heroSlide.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.coachingProgram.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.facility.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.testimonial.findMany({ where: { isPublished: true }, orderBy: { createdAt: 'desc' } }),
    ]);

    const flat: Record<string, any> = {};
    for (const s of settings) {
      if (s.group === 'website' || s.group === 'general') {
        flat[s.key] = parseValue(s.value, s.type);
      }
    }

    return ApiResponse.success(res, 'Academy info retrieved', {
      settings: flat,
      heroSlides,
      programs,
      facilities,
      testimonials,
    });
  } catch (error: any) {
    logger.error('getAcademyInfo error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch academy info', 500, error.message);
  }
};

export const getPublicBatches = async (req: Request, res: Response) => {
  try {
    const [coachingBatches, regularBatches] = await Promise.all([
      prisma.coachingBatch.findMany({
        where: { status: 'active' },
        include: {
          coach: { select: { id: true, firstName: true, lastName: true } },
          court: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.regularBatch.findMany({
        where: { status: 'active' },
        include: {
          court: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const coaching = coachingBatches.map((b) => ({
      id: b.id,
      type: 'coaching',
      name: b.name,
      programType: b.programType,
      skillLevel: b.skillLevel,
      ageGroup: b.ageGroup,
      coach: b.coach
        ? { id: b.coach.id, name: `${b.coach.firstName} ${b.coach.lastName}`.trim() }
        : null,
      court: b.court ? { id: b.court.id, name: b.court.name } : null,
      daysOfWeek: safeParseJson<string[]>(b.daysOfWeek, []),
      startTime: b.startTime,
      endTime: b.endTime,
      startDate: b.startDate,
      maxCapacity: b.maxCapacity,
      monthlyFee: Number(b.monthlyFee),
      registrationFee: Number(b.registrationFee),
      description: b.description,
      color: b.color,
    }));

    const regular = regularBatches.map((b) => ({
      id: b.id,
      type: 'regular',
      name: b.name,
      coach: null,
      court: b.court ? { id: b.court.id, name: b.court.name } : null,
      daysOfWeek: safeParseJson<string[]>(b.daysOfWeek, []),
      startTime: b.startTime,
      endTime: b.endTime,
      startDate: b.startDate,
      maxPlayers: b.maxPlayers,
      monthlyPrice: Number(b.monthlyPrice),
      notes: b.notes,
    }));

    return ApiResponse.success(res, 'Public batches retrieved', {
      coaching,
      regular,
      batches: [...coaching, ...regular],
    });
  } catch (error: any) {
    logger.error('getPublicBatches error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch public batches', 500, error.message);
  }
};

export const getPublicTournaments = async (req: Request, res: Response) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      where: { status: { in: ['published', 'registration_open'] } },
      include: { _count: { select: { registrations: true } } },
      orderBy: [{ isFeatured: 'desc' }, { startDate: 'asc' }],
    });

    const data = tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      poster: t.poster,
      description: t.description,
      startDate: t.startDate,
      endDate: t.endDate,
      registrationDeadline: t.registrationDeadline,
      venue: t.venue,
      categories: safeParseJson<string[]>(t.categories, []),
      entryFee: Number(t.entryFee),
      prizeDetails: t.prizeDetails,
      registrationUrl: t.registrationUrl,
      status: t.status,
      isFeatured: t.isFeatured,
      registrationsCount: t._count.registrations,
    }));

    return ApiResponse.success(res, 'Public tournaments retrieved', data);
  } catch (error: any) {
    logger.error('getPublicTournaments error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch public tournaments', 500, error.message);
  }
};

export const getPublicGallery = async (req: Request, res: Response) => {
  try {
    const images = await prisma.galleryImage.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        image: true,
        category: true,
        caption: true,
        sortOrder: true,
      },
    });

    return ApiResponse.success(res, 'Public gallery retrieved', images);
  } catch (error: any) {
    logger.error('getPublicGallery error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch public gallery', 500, error.message);
  }
};

export const submitEnquiry = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, subject, message, source } = req.body;

    if (!name || !name.toString().trim()) {
      return ApiResponse.error(res, 'Name is required', 400);
    }
    if (!phone || !phone.toString().trim()) {
      return ApiResponse.error(res, 'Phone number is required', 400);
    }
    if (!message || !message.toString().trim()) {
      return ApiResponse.error(res, 'Message is required', 400);
    }

    const enquiry = await prisma.contactEnquiry.create({
      data: {
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        subject: subject ? String(subject).trim() : null,
        message: String(message).trim(),
        source: source || 'website',
      },
    });

    return ApiResponse.created(res, 'Enquiry submitted successfully', enquiry);
  } catch (error: any) {
    logger.error('submitEnquiry error:', error.message);
    return ApiResponse.error(res, 'Failed to submit enquiry', 500, error.message);
  }
};