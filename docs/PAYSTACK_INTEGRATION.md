# MagCharge Sales SaaS — Paystack hosted checkout

## Scope

MagCharge uses Paystack only for customer checkout payments against existing sales. Existing manual cash, bank-transfer and POS payment recording remains unchanged. Paystack does not create or modify product stock, and a sale is marked paid only after the backend verifies the provider transaction.

## Server environment

Set these variables on the MagCharge API service only. Never put secret keys in the frontend, source control, build arguments or browser storage.

| Variable | Purpose |
|---|---|
| `PAYSTACK_ENVIRONMENT` | `test` or `live` for new checkout sessions |
| `PAYSTACK_TEST_SECRET_KEY` | Test secret beginning `sk_test_` |
| `PAYSTACK_LIVE_SECRET_KEY` | Live secret beginning `sk_live_` |
| `PAYSTACK_LIVE_ENABLED` | Must be `true` before Live credentials are usable; leave `false` until Live is explicitly approved |
| `PAYSTACK_SECRET_KEY` | Legacy Test-only fallback during migration; never used for Live |
| `MAGCHARGE_WEB_URL` | Canonical HTTPS web-app URL for the Paystack return destination |

Test and Live use separate API keys and webhook URLs. The resolver rejects mode/key-prefix mismatches. There is no public Paystack key in the browser flow: the API initializes hosted checkout server-to-server and returns only Paystack's HTTPS checkout URL.

## Webhook URLs

Register one webhook URL in each corresponding Paystack dashboard environment:

- Test: `https://YOUR-MAGCHARGE-API-DOMAIN/webhooks/paystack/test`
- Live: `https://YOUR-MAGCHARGE-API-DOMAIN/webhooks/paystack/live`

The legacy `/webhooks/paystack` endpoint is a Test-only alias. The backend validates the raw-body HMAC-SHA512 signature, independently verifies the transaction with Paystack, and matches environment, reference, NGN currency, amount, and pending payment before completion.

## Customer checkout API

### Initialize

`POST /api/payments/paystack/checkout`

Authenticated users with `payments.write` send:

```json
{ "saleId": "sale UUID", "amount": 2500 }
```

The server checks sale ownership (unless the user is an administrator), loads the sale total and previously completed payments, prevents a second pending Paystack checkout for the same sale, creates a pending payment row, and initializes the transaction. The client is redirected only to `https://checkout.paystack.com`.

### Verify return status

Paystack returns to `MAGCHARGE_WEB_URL` with a `paystack_reference` query parameter. When the user opens the Payments page, the client calls:

`GET /api/payments/paystack/status?reference=MAGCHARGE-PAYSTACK-…`

The API verifies the transaction server-to-server before updating payment status. The browser callback alone never marks a sale as paid.

## Database change

The additive migration `services/api/migrations/006_paystack_hosted_checkout.sql` adds provider/environment, checkout URL, verification timestamp, and a Paystack reference uniqueness index. It does not delete or rewrite existing payment records. The migration runner includes the new file.

**Do not run the migration against Render/production until the target database and a backup have been reviewed and the owner approves the schema change.** This branch does not apply migrations or deploy services.

## Current activation state

- Test and Live support are implemented in code.
- The example configuration selects Test mode.
- `PAYSTACK_LIVE_ENABLED=false` by default.
- No API keys have been added to Render by this branch.
- No real payment has been initiated or tested.
