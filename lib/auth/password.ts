import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

function deriveKey(password: string, salt: Buffer, length: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, length, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt, 64);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash?: string | null) {
  const [saltHex, keyHex] = passwordHash?.split(":") ?? [];
  const validFormat = Boolean(saltHex && /^[\da-f]{32}$/i.test(saltHex) && keyHex && /^[\da-f]{128}$/i.test(keyHex));
  const salt = validFormat ? Buffer.from(saltHex!, "hex") : Buffer.alloc(16);
  const expectedKey = validFormat ? Buffer.from(keyHex!, "hex") : Buffer.alloc(64);
  const derivedKey = await deriveKey(password, salt, 64);
  return validFormat && timingSafeEqual(expectedKey, derivedKey);
}