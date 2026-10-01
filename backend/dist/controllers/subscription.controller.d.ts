import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getSubscriptions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSubscriptionStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getStudentSubscriptions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getRegularSubscriptions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createSubscription: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const renewSubscription: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const pauseSubscription: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const resumeSubscription: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const cancelSubscription: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSubscriptionHistory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=subscription.controller.d.ts.map