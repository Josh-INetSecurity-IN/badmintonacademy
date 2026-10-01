import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getSettings: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSettingsGroup: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateSettings: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=setting.controller.d.ts.map