import { Request, Response } from 'express';
export declare const getStudents: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getStudent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createStudent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateStudent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteStudent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const assignBatch: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const removeFromBatch: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const transferBatch: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const archiveStudent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateProfilePhoto: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getStudentsByBatch: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exportStudents: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=student.controller.d.ts.map