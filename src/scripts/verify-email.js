// src/scripts/verify-email.js
//
// Local dev/ops tool for checking the Resend email setup — replaces the
// old emailRoutes.js, which exposed the same capability as an HTTP route
// with no auth. A CLI script can't be accidentally mounted into app.js
// and left open, so there's no attack surface to reason about here.
//
// Usage:
//   node src/scripts/verify-email.js verify
//   node src/scripts/verify-email.js test you@example.com
//
// Deliberately uses process.exitCode instead of process.exit() after any
// network activity. Resend's client keeps an HTTP keep-alive handle open
// after a request completes; process.exit() tears the process down while
// that handle is still mid-close, which crashes with a libuv assertion on
// Windows (UV_HANDLE_CLOSING, src/win/async.c). Setting exitCode and
// letting main() return lets Node drain the event loop and close that
// handle on its own — same end result (correct exit code), no crash.

import { verifyEmailConfig, sendTestEmail } from '../services/emailService.js';

async function main() {
  const [, , command, arg] = process.argv;

  if (command === 'verify') {
    const ok = await verifyEmailConfig();
    console.log(ok ? '✓ Resend config is valid.' : '✗ Resend config check failed.');
    process.exitCode = ok ? 0 : 1;
    return;
  }

  if (command === 'test') {
    if (!arg) {
      console.error('Usage: node src/scripts/verify-email.js test <email>');
      process.exitCode = 1;
      return;
    }
    await sendTestEmail(arg);
    console.log(`✓ Test email sent to ${arg}.`);
    process.exitCode = 0;
    return;
  }

  console.error('Usage:\n  node src/scripts/verify-email.js verify\n  node src/scripts/verify-email.js test <email>');
  process.exitCode = 1;
}

main().catch((err) => {
  console.error('✗ Failed:', err.message);
  process.exitCode = 1;
});
