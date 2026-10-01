import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getTournaments: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTournament: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createTournament: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateTournament: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteTournament: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const uploadPoster: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const publishTournament: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const registerPlayer: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateRegistration: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exportParticipants: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTournamentRevenue: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=tournament.controller.d.ts.map