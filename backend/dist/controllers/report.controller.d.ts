import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getRevenueReport: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getExpenseReport: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getNetIncome: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getOutstandingReport: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getOperationalReport: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCollectedVsPending: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exportRevenueReport: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exportExpenseReport: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exportOutstandingReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=report.controller.d.ts.map