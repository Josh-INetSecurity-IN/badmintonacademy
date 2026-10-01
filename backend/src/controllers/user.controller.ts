import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const VALID_ROLES = ['super_admin', 'admin', 'staff'];
const BCRYPT_ROUNDS = 12;

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  isActive: true,
  avatar: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) ? id : NaN;
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { search, role, isActive } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: String(search) } },
        { lastName: { contains: String(search) } },
        { email: { contains: String(search) } },
      ];
    }
    if (role) {
      where.role = String(role);
    }
    if (isActive !== undefined && isActive !== '') {
      where.isActive = String(isActive) === 'true';
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return ApiResponse.paginated(res, users, total, page, limit);
  } catch (error: any) {
    logger.error('getUsers error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch users', 500, error.message);
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone, role = 'staff', avatar } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return ApiResponse.error(res, 'Email, password, first name and last name are required', 400);
    }
    if (!isValidEmail(email)) {
      return ApiResponse.error(res, 'Invalid email address', 400);
    }
    if (String(password).length < 6) {
      return ApiResponse.error(res, 'Password must be at least 6 characters', 400);
    }
    if (!VALID_ROLES.includes(role)) {
      return ApiResponse.error(res, 'Invalid role', 400);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return ApiResponse.error(res, 'A user with this email already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        role,
        avatar: avatar || null,
      },
      select: USER_SELECT,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'create',
        entityType: 'user',
        entityId: user.id,
        newValues: JSON.stringify({ ...user, password: undefined }),
      },
    });

    return ApiResponse.created(res, 'User created successfully', user);
  } catch (error: any) {
    logger.error('createUser error:', error.message);
    return ApiResponse.error(res, 'Failed to create user', 500, error.message);
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid user id', 400);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'User not found', 404);

    const { firstName, lastName, phone, role, isActive, email, avatar } = req.body;

    if (id === req.user?.id && (role !== undefined && role !== existing.role && role !== 'super_admin')) {
      return ApiResponse.error(res, 'You cannot demote your own role', 400);
    }
    if (id === req.user?.id && isActive !== undefined && isActive === false) {
      return ApiResponse.error(res, 'You cannot deactivate your own account', 400);
    }

    const data: any = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (phone !== undefined) data.phone = phone;
    if (avatar !== undefined) data.avatar = avatar;
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return ApiResponse.error(res, 'Invalid role', 400);
      }
      data.role = role;
    }
    if (isActive !== undefined) {
      data.isActive = isActive === true || isActive === 'true';
    }
    if (email !== undefined && email !== existing.email) {
      if (!isValidEmail(email)) {
        return ApiResponse.error(res, 'Invalid email address', 400);
      }
      const duplicate = await prisma.user.findUnique({ where: { email } });
      if (duplicate) {
        return ApiResponse.error(res, 'A user with this email already exists', 409);
      }
      data.email = email;
    }

    if (Object.keys(data).length === 0) {
      return ApiResponse.error(res, 'Nothing to update', 400);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'update',
        entityType: 'user',
        entityId: id,
        oldValues: JSON.stringify({ ...existing, password: undefined }),
        newValues: JSON.stringify({ ...user }),
      },
    });

    return ApiResponse.success(res, 'User updated successfully', user);
  } catch (error: any) {
    logger.error('updateUser error:', error.message);
    return ApiResponse.error(res, 'Failed to update user', 500, error.message);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid user id', 400);

    if (id === req.user?.id) {
      return ApiResponse.error(res, 'You cannot delete your own account', 400);
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'User not found', 404);

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: USER_SELECT,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'delete',
        entityType: 'user',
        entityId: id,
        oldValues: JSON.stringify({ ...existing, password: undefined }),
        newValues: JSON.stringify({ ...user }),
      },
    });

    return ApiResponse.success(res, 'User deactivated successfully', user);
  } catch (error: any) {
    logger.error('deleteUser error:', error.message);
    return ApiResponse.error(res, 'Failed to deactivate user', 500, error.message);
  }
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid user id', 400);

    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      return ApiResponse.error(res, 'New password must be at least 6 characters', 400);
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'User not found', 404);

    const hashedPassword = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);

    const user = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
      select: USER_SELECT,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'update',
        entityType: 'user',
        entityId: id,
        oldValues: JSON.stringify({ passwordReset: true }),
        newValues: JSON.stringify({ passwordChanged: true }),
      },
    });

    return ApiResponse.success(res, 'Password reset successfully', { id: user.id, email: user.email });
  } catch (error: any) {
    logger.error('resetPassword error:', error.message);
    return ApiResponse.error(res, 'Failed to reset password', 500, error.message);
  }
};

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const userId = parseId(req.params.id);
    if (isNaN(userId)) return ApiResponse.error(res, 'Invalid user id', 400);

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const where: any = { userId };
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return ApiResponse.paginated(res, logs, total, page, limit);
  } catch (error: any) {
    logger.error('getAuditLogs error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch audit logs', 500, error.message);
  }
};