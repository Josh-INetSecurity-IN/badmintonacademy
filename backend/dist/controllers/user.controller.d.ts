import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getUsers: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createUser: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateUser: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteUser: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const resetPassword: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAuditLogs: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=user.controller.d.ts.map