// api/index.js
//
// Vercel serverless entry point. Vercel doesn't run app.listen() — it
// calls this default export as a request handler on every incoming
// request instead. The actual Express app (routes, middleware, etc.)
// is untouched and lives in src/app.js exactly as before; this file
// only adapts it to Vercel's calling convention.
//
// Local dev is unaffected — `npm run dev` still uses src/Server.js with
// app.listen() as before. This file is ONLY used in the Vercel deploy.

import app from '../src/app.js';

export default function handler(req, res) {
  return app(req, res);
}
