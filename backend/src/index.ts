/**
 * Local / standalone entrypoint for the Push for Fulfillment backend.
 *
 * The Express app itself lives in `src/app.ts` (no port binding). This file is
 * the dev/standalone runner: it imports the configured app and binds a port.
 * The Cloud Functions deploy uses `src/function.ts` instead, which wraps the
 * same app in an HTTPS function (no listen()).
 */
import { app, ALLOWED_ORIGINS } from '@/app';

const PORT = Number(process.env.PORT ?? 3001);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[backend] CORS allowing origins: ${[...ALLOWED_ORIGINS].join(', ')} (+ localhost)`);
});
