"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const apiResponse_1 = require("../utils/apiResponse");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return apiResponse_1.ApiResponse.error(res, 'Access denied. No token provided.', 401);
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true, firstName: true, lastName: true, isActive: true },
        });
        if (!user || !user.isActive) {
            return apiResponse_1.ApiResponse.error(res, 'Invalid or deactivated account.', 401);
        }
        req.user = user;
        next();
    }
    catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return apiResponse_1.ApiResponse.error(res, 'Invalid token.', 401);
        }
        if (error.name === 'TokenExpiredError') {
            return apiResponse_1.ApiResponse.error(res, 'Token expired.', 401);
        }
        return apiResponse_1.ApiResponse.error(res, 'Authentication failed.', 500);
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return apiResponse_1.ApiResponse.error(res, 'Access denied.', 401);
        }
        if (!roles.includes(req.user.role)) {
            return apiResponse_1.ApiResponse.error(res, 'Insufficient permissions.', 403);
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.js.map