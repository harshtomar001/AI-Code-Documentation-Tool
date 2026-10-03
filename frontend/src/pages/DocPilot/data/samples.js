/*
 * Sample "before/after" code used by the demo.
 * Line markers:  ' ' unchanged line,  '+' added line,  '^' existing line that gains an inline comment.
 */
const RAW = [
  { mod: 'invoice', hunks: [
    ['Docstring and comment for calculate_total()',
`  def calculate_total(items, tax_rate=0.0):
+     """Return the invoice total including tax.
+
+     Args:
+         items: Iterable of line items exposing price and qty.
+         tax_rate: Tax multiplier, e.g. 0.18 for 18 percent.
+
+     Returns:
+         float: Grand total rounded to two decimals.
+     """
^     subtotal = sum(i.price * i.qty for i in items)  # cancelled lines are filtered upstream
      return round(subtotal * (1 + tax_rate), 2)`],
    ['Class docstring for Invoice',
`  class Invoice:
+     """A billable document issued to a customer.
+
+     Invoices are immutable once finalized; call void() to cancel one.
+     """
  
      def __init__(self, customer_id, items):
          self.customer_id = customer_id
^         self.items = list(items)  # copy so callers cannot mutate a finalized invoice`],
    ['Inline comment in apply_discount()',
`  def apply_discount(total, code):
^     rate = DISCOUNTS.get(code, 0)  # unknown codes silently give no discount
      return total * (1 - rate)`]]},
  { mod: 'ledger', hunks: [
    ['Docstring and comments for post_entry()',
`  def post_entry(ledger, account, amount):
+     """Post a double-entry record to the ledger.
+
+     Every debit has a matching credit so the ledger always balances.
+
+     Raises:
+         LedgerError: If the account is frozen or amount is not positive.
+     """
      if amount <= 0:
          raise LedgerError("amount must be positive")
^     ledger.append(Entry(account, -amount))  # debit side
^     ledger.append(Entry(CLEARING, amount))  # credit side`],
    ['Docstring for reconcile()',
`  def reconcile(entries):
+     """Group entries by account and return the unbalanced ones.
+
+     Returns:
+         dict: Mapping of account id to its non-zero balance.
+     """
      balances = defaultdict(int)
      for e in entries:
          balances[e.account] += e.amount
      return {a: b for a, b in balances.items() if b}`]]},
  { mod: 'refund', hunks: [
    ['Docstring and comment for issue_refund()',
`  def issue_refund(payment_id, amount, *, idempotency_key):
+     """Refund a captured payment, fully or partially.
+
+     Args:
+         payment_id: Identifier of the captured payment.
+         amount: Minor units; must not exceed the remaining balance.
+         idempotency_key: Repeat calls with the same key return the first result.
+     """
^     if store.seen(idempotency_key):  # replay-safe: never refund twice
          return store.result(idempotency_key)
      payment = gateway.fetch(payment_id)`],
    ['Docstring for _within_window()',
`  def _within_window(paid_at, days=30):
+     """Return True if paid_at is still inside the refund window."""
      return (now() - paid_at).days <= days`]]},
  { mod: 'webhook', hunks: [
    ['Docstring and comment for verify_signature()',
`  def verify_signature(payload, header, secret):
+     """Validate the HMAC signature sent with a webhook request.
+
+     Returns:
+         bool: True when the signature matches the payload.
+     """
      expected = hmac.new(secret, payload, "sha256").hexdigest()
^     return hmac.compare_digest(expected, header)  # constant time, prevents timing attacks`],
    ['Docstring for handle_event()',
`  def handle_event(event):
+     """Dispatch a verified webhook event to its handler.
+
+     Unknown event types are acknowledged and ignored, not retried.
+     """
      handler = HANDLERS.get(event["type"])
      if handler is None:
          return 200
      return handler(event)`],
    ['Inline comments in HANDLERS',
`  HANDLERS = {
^     "payment.succeeded": on_success,  # marks the invoice as paid
^     "payment.failed": on_failure,  # schedules a retry
  }`]]},
  { mod: 'retry', hunks: [
    ['Docstring and comment for with_backoff()',
`  def with_backoff(fn, retries=5, base=0.5):
+     """Call fn, retrying with exponential backoff and jitter.
+
+     Args:
+         fn: Zero-argument callable to execute.
+         retries: Maximum number of attempts.
+         base: Initial delay in seconds, doubled after each attempt.
+     """
      for attempt in range(retries):
          try:
              return fn()
          except TransientError:
^             delay = base * 2 ** attempt + random.random()  # jitter avoids thundering herd
              time.sleep(delay)`],
    ['Docstring for RetryExhausted',
`  class RetryExhausted(Exception):
+     """Raised when every retry attempt has failed."""
      pass`]]},
  { mod: 'router', hunks: [
    ['Docstring and comment for route_payment()',
`  def route_payment(payment):
+     """Choose the acquirer with the best success rate for a payment.
+
+     Falls back to the default acquirer when no rule matches.
+     """
      for rule in RULES:
^         if rule.matches(payment):  # first matching rule wins
              return rule.acquirer
      return DEFAULT_ACQUIRER`],
    ['Inline comment for RULES',
`  DEFAULT_ACQUIRER = "acq_default"
^ RULES = sorted(load_rules(), key=lambda r: r.priority)  # lower number means higher priority`]]},
  { mod: 'cache', hunks: [
    ['Class docstring for TTLCache',
`  class TTLCache:
+     """In-memory cache whose entries expire after a fixed time to live.
+
+     Not thread-safe; wrap access in a lock when sharing across threads.
+     """
  
      def __init__(self, ttl=60):
          self.ttl = ttl
          self._data = {}`],
    ['Docstring and comment for get()',
`  def get(self, key):
+     """Return the cached value for key, or None if missing or expired."""
      item = self._data.get(key)
^     if item and item.expires > time.time():  # entries expire lazily on read
          return item.value`]]},
  { mod: 'settlement', hunks: [
    ['Docstring and comment for settle_batch()',
`  def settle_batch(batch_id):
+     """Settle all captured payments in a batch with the acquirer.
+
+     Runs inside one transaction; on failure nothing is marked settled.
+
+     Args:
+         batch_id: Identifier of the settlement batch.
+     """
      with db.transaction():
          payments = db.captured(batch_id)
^         total = sum(p.amount for p in payments)  # minor units, avoids float drift
          acquirer.submit(batch_id, total)`],
    ['Docstring for mark_settled()',
`  def mark_settled(payments):
+     """Flag payments as settled and stamp the settlement time."""
      for p in payments:
          p.status = "settled"`]]},
];

function parse(str) {
  return str.split('\n').map((l) => {
    const marker = l.length ? l[0] : ' ';
    const text = l.slice(2);
    if (marker === '+') return { t: 'a', before: null, after: text };
    if (marker === '^') return { t: 'm', before: text.replace(/\s+#.*$/, ''), after: text };
    return { t: 'c', before: text, after: text };
  });
}

export const TEMPLATES = RAW.map((r) => ({
  mod: r.mod,
  hunks: r.hunks.map((h) => ({ title: h[0], rows: parse(h[1]) })),
}));
