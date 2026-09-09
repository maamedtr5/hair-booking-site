This directory intentionally has no real content.

This project is a pure API (Express serverless functions under /api),
not a static site — there is no frontend to build here. This placeholder
exists only because vercel.json declares "public" as the outputDirectory
(required to stop Vercel's zero-config build from expecting one), and
git does not track empty directories.

All actual requests are rewritten to /api/index — see vercel.json.
