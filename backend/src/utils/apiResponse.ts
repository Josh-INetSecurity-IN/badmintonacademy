import { Response } from 'express';

export class ApiResponse {
  static success(res: Response, message: string, data?: any, statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data: data || null,
    });
  }

  static created(res: Response, message: string, data?: any) {
    return this.success(res, message, data, 201);
  }

  static error(res: Response, message: string, statusCode: number = 500, errors?: any) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors: errors || null,
    });
  }

  static paginated(res: Response, data: any[], total: number, page: number, limit: number) {
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
