const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { generateSecret, verifyTotp, encryptSecret, decryptSecret } = require("../../src/utils/mfa");

const codeFor = (secret, timestamp = Date.now()) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of secret) bits += alphabet.indexOf(character).toString(2).padStart(5, "0");
  const key = Buffer.alloc(Math.floor(bits.length / 8));
  for (let index = 0; index < key.length; index += 1) key[index] = parseInt(bits.slice(index * 8, index * 8 + 8), 2);
  const counter = Math.floor(timestamp / 1000 / 30);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, "0");
};

test("generates and verifies encrypted TOTP secrets", () => {
  const secret = generateSecret();
  assert.match(secret, /^[A-Z2-7]{32}$/);
  const now = Date.now();
  assert.equal(verifyTotp(secret, codeFor(secret, now)), true);
  assert.equal(verifyTotp(secret, "000000"), false);
  assert.equal(decryptSecret(encryptSecret(secret)), secret);
});
