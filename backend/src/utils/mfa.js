const crypto = require("crypto");

const key = () =>
  crypto.createHash("sha256").update(process.env.JWT_SECRET || "development-secret").digest();

const encryptSecret = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
};

const decryptSecret = (value) => {
  const [iv, tag, encrypted] = String(value).split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
};

const base32Encode = (buffer) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let result = "";
  for (let index = 0; index < bits.length; index += 5) {
    result += alphabet[parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  }
  return result;
};
const generateSecret = () => base32Encode(crypto.randomBytes(20));

const verifyTotp = (secret, code, window = 1) => {
  if (!/^\d{6}$/.test(String(code))) return false;
  const normalized = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of normalized) {
    const index = alphabet.indexOf(char);
    if (index < 0) return false;
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let offset = -window; offset <= window; offset += 1) {
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter + offset));
    const digest = crypto.createHmac("sha1", bytes).update(buffer).digest();
    const start = digest[digest.length - 1] & 15;
    const value = (digest.readUInt32BE(start) & 0x7fffffff) % 1000000;
    if (crypto.timingSafeEqual(Buffer.from(String(value).padStart(6, "0")), Buffer.from(String(code)))) return true;
  }
  return false;
};

module.exports = { encryptSecret, decryptSecret, generateSecret, verifyTotp };
