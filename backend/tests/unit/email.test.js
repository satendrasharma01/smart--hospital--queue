const test = require("node:test");
const assert = require("node:assert/strict");
const { escapeHtml } = require("../../src/services/email.service");

test("escapes user-controlled email template values", () => {
  assert.equal(escapeHtml("<img src=x onerror=alert(1)>"), "&lt;img src=x onerror=alert(1)&gt;");
});
