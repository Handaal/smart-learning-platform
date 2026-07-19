import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

const CONSENT_KEY = 'registration_consent';

export type ConsentContent = {
  title: string;
  intro: string;
  body: string;
  declineNote: string;
};

// Shown when the admin has not customised the consent text yet.
export const DEFAULT_CONSENT: ConsentContent = {
  title: 'الموافقة على المشاركة في الدراسة',
  intro:
    'قبل إنشاء الحساب، يرجى الاطلاع على شروط المشاركة والموافقة عليها. مشاركتك طوعية ويمكنك الانسحاب في أي وقت.',
  body:
    'تُستخدم بياناتك لأغراض البحث العلمي فقط.\nقد تُستخدم كاميرا الويب لتحليل تعبيرات الوجه أثناء الجلسات التدريبية.\nتُعالَج جميع البيانات بسرية وبشكل مجهول الهوية.',
  declineNote: 'لا يمكن إكمال التسجيل دون الموافقة على شروط المشاركة.',
};

function asString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function normalizeConsent(value: unknown): ConsentContent {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    title: asString(raw.title, DEFAULT_CONSENT.title),
    intro: asString(raw.intro, DEFAULT_CONSENT.intro),
    body: asString(raw.body, DEFAULT_CONSENT.body),
    declineNote: asString(raw.declineNote, DEFAULT_CONSENT.declineNote),
  };
}

export async function getConsent(_req: Request, res: Response, next: NextFunction) {
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key: CONSENT_KEY } });
    res.json({ data: row ? normalizeConsent(row.value) : DEFAULT_CONSENT });
  } catch (e) { next(e); }
}

export async function updateConsent(req: Request, res: Response, next: NextFunction) {
  try {
    const content = normalizeConsent(req.body);
    const row = await prisma.platformSetting.upsert({
      where: { key: CONSENT_KEY },
      create: { key: CONSENT_KEY, value: content },
      update: { value: content },
    });
    res.json({ data: normalizeConsent(row.value) });
  } catch (e) { next(e); }
}
