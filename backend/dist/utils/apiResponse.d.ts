import { Response } from 'express';
export declare class ApiResponse {
    static success(res: Response, message: string, data?: any, statusCode?: number): Response<any, Record<string, any>>;
    static created(res: Response, message: string, data?: any): Response<any, Record<string, any>>;
    static error(res: Response, message: string, statusCode?: number, errors?: any): Response<any, Record<string, any>>;
    static paginated(res: Response, data: any[], total: number, page: number, limit: number): Response<any, Record<string, any>>;
}
//# sourceMappingURL=apiResponse.d.ts.map