import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getExpenses: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getExpenseCategories: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createExpense: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateExpense: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteExpense: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const uploadReceipt: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getExpenseSummary: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exportExpenses: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=expense.controller.d.ts.map