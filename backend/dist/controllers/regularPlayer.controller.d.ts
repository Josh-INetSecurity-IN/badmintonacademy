import { Request, Response } from 'express';
export declare const getPlayers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPlayer: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createPlayer: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePlayer: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const assignBatch: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const removeFromBatch: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const pauseMembership: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const resumeMembership: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const renewSubscription: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getExpired: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getUpcomingSessions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exportPlayers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deletePlayer: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePhoto: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=regularPlayer.controller.d.ts.map