import 'dotenv/config';
import 'module-alias/register';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet'; // #83

import { env } from '@/config/env';
import authRouter from '@/routes/auth';
import requestsRouter from '@/routes/requests';
import uploadsRouter from '@/routes/uploads';
import chatsRouter from '@/routes/chats';
import answersRouter from '@/routes/answers';
import referralsRouter from '@/routes/referrals';
import businessesRouter from '@/routes/businesses';
import adminRouter from '@/routes/admin';
import usersRouter from '@/routes/users'; // #63
import volunteersRouter from '@/routes/volunteers';
import ratingsRouter from '@/routes/ratings';
import adminVolunteersRouter from '@/routes/adminVolunteers';
import adminRequestsRouter from '@/routes/adminRequests';
import adminUsersRouter from '@/routes/adminUsers';
import adminStatsRouter from '@/routes/adminStats';
import { globalLimiter, authWriteLimiter } from '@/middleware/rateLimit'; // #82
import { authenticate } from '@/middleware/auth';
import { requireAdmin } from '@/middleware/requireAdmin';

const app = express();

// ── Security middleware ───────────────────────────────────────────────────
app.use(helmet()); // #83 — secure HTTP headers

// CORS allowlist (#83). Origins from env (comma-separated) plus localhost dev.
const allowedOrigins = new Set(
	[
		env.frontendOrigin,
		'http://localhost:3000',
		'http://127.0.0.1:3000',
	].filter(Boolean) as string[],
);

app.use(
	cors({
		origin(origin, cb) {
			if (!origin || allowedOrigins.has(origin)) {
				cb(null, true);
				return;
			}
			cb(new Error(`CORS: origin not allowed: ${origin}`));
		},
		credentials: true,
	}),
);

app.use(express.json({ limit: '10mb' }));

// Rate limiting (#82) — global limiter on all /api routes.
app.use('/api', globalLimiter);

// ── Health ────────────────────────────────────────────────────────────────
app.use('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth',       authWriteLimiter, authRouter);
app.use('/api/chats',      authWriteLimiter, chatsRouter);
app.use('/api/requests',   authWriteLimiter, requestsRouter);
app.use('/api/uploads',    authWriteLimiter, uploadsRouter);
app.use('/api/users',      authWriteLimiter, usersRouter);
app.use('/api/ratings',    authWriteLimiter, ratingsRouter);
app.use('/api/volunteers', authWriteLimiter, volunteersRouter);

// Admin sub-routers (#73 #74 #75 #76 #77) — specific paths before the generic
// adminRouter so they win. Each is gated by authenticate + requireAdmin.
app.use('/api/admin/volunteers', authWriteLimiter, authenticate, requireAdmin, adminVolunteersRouter);
app.use('/api/admin/requests',   authWriteLimiter, authenticate, requireAdmin, adminRequestsRouter);
app.use('/api/admin/users',      authWriteLimiter, authenticate, requireAdmin, adminUsersRouter);
app.use('/api/admin/stats',      authWriteLimiter, authenticate, requireAdmin, adminStatsRouter);
app.use('/api/admin',            authWriteLimiter, adminRouter);

app.use('/api/answers',    answersRouter);
app.use('/api/referrals',  referralsRouter);
app.use('/api/businesses', businessesRouter);
