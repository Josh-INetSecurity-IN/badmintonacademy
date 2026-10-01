import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
interface CreateNotificationData {
    userId?: number | null;
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: number;
}
export declare const createNotification: (data: CreateNotificationData) => Promise<any>;
export declare const getNotifications: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markRead: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markAllRead: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getUnreadCount: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getDashboardNotifications: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getReminderTemplate: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export {};
//# sourceMappingURL=notification.controller.d.ts.map