"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = exports.resetPassword = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUsers = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const apiResponse_1 = require("../utils/apiResponse");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
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
};
const parseId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) ? id : NaN;
};
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const getUsers = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const { search, role, isActive } = req.query;
        const where = {};
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
        return apiResponse_1.ApiResponse.paginated(res, users, total, page, limit);
    }
    catch (error) {
        logger_1.logger.error('getUsers error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch users', 500, error.message);
    }
};
exports.getUsers = getUsers;
const createUser = async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone, role = 'staff', avatar } = req.body;
        if (!email || !password || !firstName || !lastName) {
            return apiResponse_1.ApiResponse.error(res, 'Email, password, first name and last name are required', 400);
        }
        if (!isValidEmail(email)) {
            return apiResponse_1.ApiResponse.error(res, 'Invalid email address', 400);
        }
        if (String(password).length < 6) {
            return apiResponse_1.ApiResponse.error(res, 'Password must be at least 6 characters', 400);
        }
        if (!VALID_ROLES.includes(role)) {
            return apiResponse_1.ApiResponse.error(res, 'Invalid role', 400);
        }
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return apiResponse_1.ApiResponse.error(res, 'A user with this email already exists', 409);
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, BCRYPT_ROUNDS);
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
        return apiResponse_1.ApiResponse.created(res, 'User created successfully', user);
    }
    catch (error) {
        logger_1.logger.error('createUser error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to create user', 500, error.message);
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid user id', 400);
        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'User not found', 404);
        const { firstName, lastName, phone, role, isActive, email, avatar } = req.body;
        if (id === req.user?.id && (role !== undefined && role !== existing.role && role !== 'super_admin')) {
            return apiResponse_1.ApiResponse.error(res, 'You cannot demote your own role', 400);
        }
        if (id === req.user?.id && isActive !== undefined && isActive === false) {
            return apiResponse_1.ApiResponse.error(res, 'You cannot deactivate your own account', 400);
        }
        const data = {};
        if (firstName !== undefined)
            data.firstName = firstName;
        if (lastName !== undefined)
            data.lastName = lastName;
        if (phone !== undefined)
            data.phone = phone;
        if (avatar !== undefined)
            data.avatar = avatar;
        if (role !== undefined) {
            if (!VALID_ROLES.includes(role)) {
                return apiResponse_1.ApiResponse.error(res, 'Invalid role', 400);
            }
            data.role = role;
        }
        if (isActive !== undefined) {
            data.isActive = isActive === true || isActive === 'true';
        }
        if (email !== undefined && email !== existing.email) {
            if (!isValidEmail(email)) {
                return apiResponse_1.ApiResponse.error(res, 'Invalid email address', 400);
            }
            const duplicate = await prisma.user.findUnique({ where: { email } });
            if (duplicate) {
                return apiResponse_1.ApiResponse.error(res, 'A user with this email already exists', 409);
            }
            data.email = email;
        }
        if (Object.keys(data).length === 0) {
            return apiResponse_1.ApiResponse.error(res, 'Nothing to update', 400);
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
        return apiResponse_1.ApiResponse.success(res, 'User updated successfully', user);
    }
    catch (error) {
        logger_1.logger.error('updateUser error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to update user', 500, error.message);
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid user id', 400);
        if (id === req.user?.id) {
            return apiResponse_1.ApiResponse.error(res, 'You cannot delete your own account', 400);
        }
        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'User not found', 404);
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
        return apiResponse_1.ApiResponse.success(res, 'User deactivated successfully', user);
    }
    catch (error) {
        logger_1.logger.error('deleteUser error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to deactivate user', 500, error.message);
    }
};
exports.deleteUser = deleteUser;
const resetPassword = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid user id', 400);
        const { newPassword } = req.body;
        if (!newPassword || String(newPassword).length < 6) {
            return apiResponse_1.ApiResponse.error(res, 'New password must be at least 6 characters', 400);
        }
        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'User not found', 404);
        const hashedPassword = await bcryptjs_1.default.hash(String(newPassword), BCRYPT_ROUNDS);
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
        return apiResponse_1.ApiResponse.success(res, 'Password reset successfully', { id: user.id, email: user.email });
    }
    catch (error) {
        logger_1.logger.error('resetPassword error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to reset password', 500, error.message);
    }
};
exports.resetPassword = resetPassword;
const getAuditLogs = async (req, res) => {
    try {
        const userId = parseId(req.params.id);
        if (isNaN(userId))
            return apiResponse_1.ApiResponse.error(res, 'Invalid user id', 400);
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const where = { userId };
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
        return apiResponse_1.ApiResponse.paginated(res, logs, total, page, limit);
    }
    catch (error) {
        logger_1.logger.error('getAuditLogs error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch audit logs', 500, error.message);
    }
};
exports.getAuditLogs = getAuditLogs;
//# sourceMappingURL=user.controller.js.map