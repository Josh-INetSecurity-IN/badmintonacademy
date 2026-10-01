import { Request, Response } from 'express';
export declare function hasDayOverlap(days1: string[], days2: string[]): boolean;
export declare function hasTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean;
export declare const checkConflicts: (courtId: number, daysOfWeek: string[], startTime: string, endTime: string, excludeBatchId?: number) => Promise<{
    id: number;
    name: string;
    daysOfWeek: string;
    startTime: string;
    endTime: string;
}[]>;
export declare const getBatches: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBatch: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createBatch: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateBatch: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteBatch: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const assignStudents: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const removeStudent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBatchRoster: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBatchCalendar: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=coachingBatch.controller.d.ts.map