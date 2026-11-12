import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { getPaystackCredential, validPaystackReference } from "./paystack-config.js";

const names = [
  "PAYSTACK_ENVIRONMENT",
  "PAYSTACK_TEST_SECRET_KEY",
  "PAYSTACK_LIVE_SECRET_KEY",
  "PAYSTACK_SECRET_KEY",
  "PAYSTACK_LIVE_ENABLED",
];
const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));

afterEach(() => {
  for (const name of names) {
    if (original[name] === undefined) delete process.env[name];
    else process.env[name] = original[name];
  }
});

test("test mode prefers the Test-specific key and supports legacy Test fallback", () => {
  process.env.PAYSTACK_ENVIRONMENT = "test";
  process.env.PAYSTACK_TEST_SECRET_KEY = "sk_test_specific";
  process.env.PAYSTACK_SECRET_KEY = "sk_test_legacy";
  assert.deepEqual(getPaystackCredential(), { environment: "test", secretKey: "sk_test_specific" });
  delete process.env.PAYSTACK_TEST_SECRET_KEY;
  assert.deepEqual(getPaystackCredential(), { environment: "test", secretKey: "sk_test_legacy" });
});

test("Live requires its independent secret and an explicit enable flag", () => {
  process.env.PAYSTACK_ENVIRONMENT = "live";
  process.env.PAYSTACK_SECRET_KEY = "sk_live_legacy";
  process.env.PAYSTACK_LIVE_SECRET_KEY = "sk_live_dedicated";
  assert.equal(getPaystackCredential(), null);
  process.env.PAYSTACK_LIVE_ENABLED = "true";
  assert.deepEqual(getPaystackCredential(), { environment: "live", secretKey: "sk_live_dedicated" });
});

test("mode and key-prefix mismatches fail closed", () => {
  process.env.PAYSTACK_ENVIRONMENT = "test";
  process.env.PAYSTACK_TEST_SECRET_KEY = "sk_live_wrong";
  assert.equal(getPaystackCredential(), null);
  process.env.PAYSTACK_ENVIRONMENT = "invalid";
  assert.equal(getPaystackCredential(), null);
});

test("webhook reference mode is explicit", () => {
  assert.equal(validPaystackReference("MAGCHARGE-PAYSTACK-TEST-0123456789ABCDEF0123456789ABCDEF", "test"), true);
  assert.equal(validPaystackReference("MAGCHARGE-PAYSTACK-LIVE-0123456789ABCDEF0123456789ABCDEF", "test"), false);
  assert.equal(validPaystackReference("not-a-reference", "live"), false);
});
