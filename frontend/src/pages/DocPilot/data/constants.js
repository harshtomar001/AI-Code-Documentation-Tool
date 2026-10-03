export const REPO = {
  name: 'acme/payments-service',
  branch: 'main',
  mb: 48.6,
  files: 1000,
  batches: 100,
  per: 10,
  zip: 'payments-service.zip',
};

export const PR_BRANCH = 'ai-docs/docstrings-2026-09-25';

/** The seven pipeline steps, in the order the user sees them. */
export const STEP_DEFS = [
  { key: 'upload', title: 'Repository uploaded', idle: 'Waiting' },
  { key: 'server', title: 'Reached the server', idle: 'Waiting' },
  { key: 'scan', title: 'Scanning files', idle: 'Waiting' },
  { key: 'secrets', title: 'Sensitive data found?', idle: 'Waiting' },
  { key: 'secure', title: 'Apply security changes', idle: 'Only runs if secrets are found' },
  { key: 'batch', title: 'Creating batches', idle: 'Waiting' },
  { key: 'gen', title: 'Generating docstrings', idle: 'Waiting' },
];

/** Fake secrets the scanner "finds" when the toggle is on. */
export const FINDINGS = [
  { type: 'AWS access key', file: 'src/core/settings.py', line: 14, repl: '${AWS_ACCESS_KEY_ID}' },
  { type: 'AWS secret key', file: 'src/core/settings.py', line: 15, repl: '${AWS_SECRET_ACCESS_KEY}' },
  { type: 'Payment gateway key', file: 'src/payments/gateway.py', line: 31, repl: '${GATEWAY_SECRET_KEY}' },
  { type: 'Webhook signing secret', file: 'src/payments/gateway.py', line: 44, repl: '${WEBHOOK_SECRET}' },
  { type: 'Database password', file: 'src/db/session.py', line: 9, repl: '${DATABASE_URL}' },
  { type: 'SMTP password', file: 'src/notify/mailer.py', line: 18, repl: '${SMTP_PASSWORD}' },
  { type: 'Private key (PEM)', file: 'config/dev.pem', line: 1, repl: 'file excluded from processing' },
];

export const DIRS = [
  'src/billing', 'src/core', 'src/payments', 'src/api',
  'src/utils', 'src/risk', 'src/notify', 'src/db',
];
