import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const ROOT_KEYS = ['group', 'type', 'settings'];

function parseValue(value: string | null, type: string): any {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (type === 'json') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  if (type === 'number') {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }
  if (type === 'boolean') {
    return value === 'true' || value === '1';
  }
  return value;
}

const parseSetting = (s: any) => ({
  ...s,
  parsedValue: parseValue(s.value, s.type),
});

function inferType(value: any): string {
  if (value === null || value === undefined) return 'text';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value) || typeof value === 'object') return 'json';
  return 'text';
}

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.academySetting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });

    const grouped: Record<string, Record<string, any>> = {};
    const flat: Record<string, any> = {};

    for (const s of settings) {
      if (!grouped[s.group]) grouped[s.group] = {};
      grouped[s.group][s.key] = parseValue(s.value, s.type);
      flat[s.key] = parseValue(s.value, s.type);
    }

    return ApiResponse.success(res, 'Settings retrieved', {
      grouped,
      flat,
      items: settings.map(parseSetting),
    });
  } catch (error: any) {
    logger.error('getSettings error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch settings', 500, error.message);
  }
};

export const getSettingsGroup = async (req: Request, res: Response) => {
  try {
    const group = String(req.params.group);
    const settings = await prisma.academySetting.findMany({
      where: { group },
      orderBy: { key: 'asc' },
    });

    const map: Record<string, any> = {};
    for (const s of settings) {
      map[s.key] = parseValue(s.value, s.type);
    }

    return ApiResponse.success(res, `Settings group "${group}" retrieved`, {
      group,
      values: map,
    });
  } catch (error: any) {
    logger.error('getSettingsGroup error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch settings group', 500, error.message);
  }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const body: any = req.body || {};
    const group = String(body.group || 'general');
    const forcedType = body.type ? String(body.type) : null;

    let entries: Record<string, any>;
    if (body.settings && typeof body.settings === 'object' && !Array.isArray(body.settings)) {
      entries = { ...body.settings };
    } else {
      entries = { ...body };
      for (const key of ROOT_KEYS) delete entries[key];
    }

    const keys = Object.keys(entries).filter((k) => k.trim().length > 0);
    if (keys.length === 0) {
      return ApiResponse.error(res, 'No settings provided to update', 400);
    }

    const existingRows = await prisma.academySetting.findMany({
      where: { key: { in: keys } },
    });
    const existingMap = new Map(existingRows.map((r) => [r.key, r]));

    const updated: any[] = [];
    for (const key of keys) {
      const rawValue = entries[key];
      const existing = existingMap.get(key);

      let storedValue = '';
      let inferred = 'text';

      if (rawValue !== null && rawValue !== undefined) {
        if (typeof rawValue === 'boolean') {
          storedValue = String(rawValue);
          inferred = 'boolean';
        } else if (typeof rawValue === 'number') {
          storedValue = String(rawValue);
          inferred = 'number';
        } else if (Array.isArray(rawValue) || typeof rawValue === 'object') {
          storedValue = JSON.stringify(rawValue);
          inferred = 'json';
        } else {
          storedValue = String(rawValue);
          inferred = 'text';
        }
      }

      let finalType = forcedType || inferred;
      if (inferred === 'text' && existing && existing.type && existing.type !== 'text') {
        finalType = existing.type;
      }

      const record = await prisma.academySetting.upsert({
        where: { key },
        update: { value: storedValue, group, type: finalType },
        create: { key, value: storedValue, group, type: finalType },
      });

      updated.push(parseSetting(record));
    }

    return ApiResponse.success(
      res,
      `${updated.length} setting(s) updated successfully`,
      { group, items: updated },
      200
    );
  } catch (error: any) {
    logger.error('updateSettings error:', error.message);
    return ApiResponse.error(res, 'Failed to update settings', 500, error.message);
  }
};