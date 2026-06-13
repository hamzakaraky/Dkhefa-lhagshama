import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import { db } from '@/lib/firebaseAdmin';

const router = Router();

const querySchema = z.object({
  category: z.string().trim().min(1).max(80).optional(),
  region: z.string().trim().min(1).max(80).optional(),
  audience: z.string().trim().min(1).max(80).optional(),
  orgType: z.enum(['ngo', 'partner']).optional(),
});

router.get('/', async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: 'validation',
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { category, orgType } = parsed.data;

  try {
    let query = db()
      .collection('answers')
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc');

    // `category` is an enum key (not translated), so an equality filter is safe.
    if (category) query = query.where('category', '==', category);

    // `region`/`audience` are bilingual `{ he, en }` objects, so a server-side
    // string equality filter can never match. They are filtered client-side in
    // DirectoryPage against the active-language value instead.

    const snapshot = await query.get();
    const items = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        // Translatable fields pass through as the bilingual `{ he, en }` contract;
        // the UI renders the active language. `category` stays an enum key.
        title: data.title ?? null,
        body: data.body ?? null,
        category: data.category ?? null,
        region: data.region ?? null,
        audience: data.audience ?? null,
        // Optional contact fields (NPO org import). Rendered as tel:/mailto:
        // actions on the directory org card; default null when absent.
        phone: data.phone ?? null,
        email: data.email ?? null,
        sourceName: data.sourceName ?? null,
        sourceUrl: data.sourceUrl ?? null,
        // Org type: 'partner' (שותף) vs 'ngo' (עמותה). Docs created before the
        // field existed have no `orgType` and count as 'ngo'.
        orgType: data.orgType === 'partner' ? 'partner' : 'ngo',
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });

    // `orgType` is filtered IN MEMORY (after the mapper applies the 'ngo'
    // default) rather than with a `.where()`: legacy docs lack the field, so a
    // server-side equality filter would drop them from the 'ngo' result — and
    // skipping the extra `.where()` avoids a new composite index.
    const filtered = orgType ? items.filter((item) => item.orgType === orgType) : items;

    res.json({ items: filtered });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[answers.get] failed:', err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
