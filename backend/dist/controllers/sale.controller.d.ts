import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getSales: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSale: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createSale: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateSale: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteSale: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSalesSummary: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getProfit: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exportSales: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=sale.controller.d.ts.map