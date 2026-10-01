"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
class ApiResponse {
    static success(res, message, data, statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data: data || null,
        });
    }
    static created(res, message, data) {
        return this.success(res, message, data, 201);
    }
    static error(res, message, statusCode = 500, errors) {
        return res.status(statusCode).json({
            success: false,
            message,
            errors: errors || null,
        });
    }
    static paginated(res, data, total, page, limit) {
        return res.status(200).json({
            success: true,
            message: 'Data retrieved successfully',
            data: {
                items: data,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    }
}
exports.ApiResponse = ApiResponse;
//# sourceMappingURL=apiResponse.js.map