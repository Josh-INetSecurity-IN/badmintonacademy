"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.getProfile = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const config_1 = require("../config");
const apiResponse_1 = require("../utils/apiResponse");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return apiResponse_1.ApiResponse.error(res, 'Email and password are required', 400);
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return apiResponse_1.ApiResponse.error(res, 'Invalid email or password', 401);
        }
        if (!user.isActive) {
            return apiResponse_1.ApiResponse.error(res, 'Account is deactivated. Contact administrator.', 403);
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return apiResponse_1.ApiResponse.error(res, 'Invalid email or password', 401);
        }
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, config_1.config.jwtSecret, { expiresIn: config_1.config.jwtExpiresIn });
        return apiResponse_1.ApiResponse.success(res, 'Login successful', {
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                avatar: user.avatar,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Login error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Login failed', 500);
    }
};
exports.login = login;
const getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, avatar: true, createdAt: true },
        });
        return apiResponse_1.ApiResponse.success(res, 'Profile retrieved', user);
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to get profile', 500);
    }
};
exports.getProfile = getProfile;
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user)
            return apiResponse_1.ApiResponse.error(res, 'User not found', 404);
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch)
            return apiResponse_1.ApiResponse.error(res, 'Current password is incorrect', 400);
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });
        return apiResponse_1.ApiResponse.success(res, 'Password changed successfully');
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to change password', 500);
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=auth.controller.js.map