import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getFees: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const generateFees: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getOverdue: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getDueSoon: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getOutstanding: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getStudentFees: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getRegularPlayerFees: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=fee.controller.d.ts.map