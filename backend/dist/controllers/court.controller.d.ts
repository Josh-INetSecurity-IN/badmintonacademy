import { Request, Response } from 'express';
export declare function timeOverlap(start1: string, end1: string, start2: string, end2: string): boolean;
export declare const getCourts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCourt: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createCourt: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateCourt: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteCourt: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCourtSchedule: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getWeeklyTimetable: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=court.controller.d.ts.map