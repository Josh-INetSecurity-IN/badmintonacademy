import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getPayments: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createPayment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getReceipt: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const cancelPayment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePayment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPaymentSummary: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exportPayments: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=payment.controller.d.ts.map