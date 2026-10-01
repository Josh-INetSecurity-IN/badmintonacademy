import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const toBoolean = (value: any): boolean => value === true || value === 'true';

export const getCoaches = async (req: Request, res: Response) => {
  try {
    const { search, includeInactive } = req.query;
    const where: Prisma.CoachWhereInput = {};

    if (includeInactive !== 'true') where.isActive = true;
    if (search) {
      where.OR = [
        { firstName: { contains: search as string } },
        { lastName: { contains: search as string } },
        { phone: { contains: search as string } },
        { email: { contains: search as string } },
      ];
    }

    const coaches = await prisma.coach.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(res, 'Coaches retrieved', coaches);
  } catch (error: any) {
    logger.error('getCoaches error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch coaches', 500);
  }
};

export const createCoach = async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.firstName || !body.lastName) {
      return ApiResponse.error(res, 'firstName and lastName are required', 400);
    }

    const coach = await prisma.coach.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone || undefined,
        email: body.email || undefined,
        specialization: body.specialization || undefined,
        qualification: body.qualification || undefined,
        experience: body.experience || undefined,
        bio: body.bio || undefined,
        avatar: body.avatar || undefined,
        isActive: body.isActive !== undefined ? toBoolean(body.isActive) : true,
      },
    });

    return ApiResponse.created(res, 'Coach created successfully', coach);
  } catch (error: any) {
    logger.error('createCoach error:', error.message);
    return ApiResponse.error(res, 'Failed to create coach', 500);
  }
};

export const updateCoach = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid coach id', 400);

    const existing = await prisma.coach.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Coach not found', 404);

    const body = req.body;
    const data: Prisma.CoachUpdateInput = {};

    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.email !== undefined) data.email = body.email;
    if (body.specialization !== undefined) data.specialization = body.specialization;
    if (body.qualification !== undefined) data.qualification = body.qualification;
    if (body.experience !== undefined) data.experience = body.experience;
    if (body.bio !== undefined) data.bio = body.bio;
    if (body.avatar !== undefined) data.avatar = body.avatar;
    if (body.isActive !== undefined) data.isActive = toBoolean(body.isActive);

    const coach = await prisma.coach.update({ where: { id }, data });
    return ApiResponse.success(res, 'Coach updated successfully', coach);
  } catch (error: any) {
    logger.error('updateCoach error:', error.message);
    return ApiResponse.error(res, 'Failed to update coach', 500);
  }
};

export const deleteCoach = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid coach id', 400);

    const existing = await prisma.coach.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Coach not found', 404);

    const coach = await prisma.coach.update({ where: { id }, data: { isActive: false } });
    return ApiResponse.success(res, 'Coach deactivated successfully', coach);
  } catch (error: any) {
    logger.error('deleteCoach error:', error.message);
    return ApiResponse.error(res, 'Failed to delete coach', 500);
  }
};