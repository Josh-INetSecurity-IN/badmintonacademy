import { Request, Response } from 'express';
export declare function hasOverlap(start1: string, end1: string, start2: string, end2: string): boolean;
export declare const getBookings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const cancelBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const completeBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getDailyBookings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const convertToRegular: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getRevenue: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=guestBooking.controller.d.ts.map