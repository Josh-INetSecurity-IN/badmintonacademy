import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getAttendance: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTodayBatchAttendance: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markAttendance: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markBulkAttendance: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getStudentAttendance: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPlayerAttendance: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAttendanceReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAttendanceOverview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=attendance.controller.d.ts.map