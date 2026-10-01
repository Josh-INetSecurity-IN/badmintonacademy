import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getProducts: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getProduct: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createProduct: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateProduct: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const stockIn: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const stockAdjust: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteProduct: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getLowStock: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCategories: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePhoto: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=product.controller.d.ts.map