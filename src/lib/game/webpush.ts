import crypto from "node:crypto";

/* Web Push, written against the specs rather than pulled from a package.
 
   The library (`web-push`) drags an HTTP proxy agent chain behind it, and
   neither Turbopack nor webpack would resolve its `net`/`tls` imports from a
   module reachable through a server action. Everything below is standard
   primitives that Node already ships:
 
     RFC 8291  message encryption  (ECDH P-256, HKDF-SHA256, AES-128-GCM)
     RFC 8188  the aes128gcm content coding and its header block
     RFC 8292  VAPID — an ES256 JWT identifying the sender
 
   Nothing here is invented crypto; it is assembly of named pieces in the
   order the RFCs prescribe. A mistake shows up as a push the browser cannot
   decrypt — visible, not silent. */

const b64u = (b: Buffer) => b.toString("base64url");
const fromB64u = (s: string) => Buffer.from(s, "base64url");

function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, len: number): Buffer {
  const prk = crypto.createHmac("sha256", salt).update(ikm).digest();
  /* Single-block expand: every output here is <= 32 bytes. */
  const out = crypto.createHmac("sha256", prk).update(Buffer.concat([info, Buffer.from([1])])).digest();
  return out.subarray(0, len);
}

/* An EC key from the raw values a subscription and a VAPID pair carry. */
function privateKeyFrom(d: Buffer, pub: Buffer) {
  return crypto.createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      d: b64u(d),
      x: b64u(pub.subarray(1, 33)),
      y: b64u(pub.subarray(33, 65)),
    },
    format: "jwk",
  });
}
function publicKeyFrom(pub: Buffer) {
  return crypto.createPublicKey({
    key: { kty: "EC", crv: "P-256", x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
    format: "jwk",
  });
}

/* RFC 8291 §3.4 + RFC 8188 §2.1 */
export function encryptPayload(
  payload: string,
  uaPublicB64: string,
  authSecretB64: string
): Buffer {
  const uaPublic = fromB64u(uaPublicB64);
  const authSecret = fromB64u(authSecretB64);
  if (uaPublic.length !== 65 || uaPublic[0] !== 0x04) throw new Error("bad p256dh");

  const as = crypto.createECDH("prime256v1");
  as.generateKeys();
  const asPublic = as.getPublicKey();
  const shared = as.computeSecret(uaPublic);

  /* The "WebPush info" step binds the key to both parties' public keys. */
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0"),
    uaPublic,
    asPublic,
  ]);
  const ikm = hkdf(authSecret, shared, keyInfo, 32);

  const salt = crypto.randomBytes(16);
  const cek = hkdf(salt, ikm, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdf(salt, ikm, Buffer.from("Content-Encoding: nonce\0"), 12);

  /* 0x02 is the delimiter marking the last (only) record. */
  const plaintext = Buffer.concat([Buffer.from(payload, "utf8"), Buffer.from([0x02])]);
  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const body = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096, 0);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, body]);
}

/* RFC 8292: a short-lived ES256 JWT saying who is sending. */
export function vapidAuth(endpoint: string, publicKeyB64: string, privateKeyB64: string): string {
  const aud = new URL(endpoint).origin;
  const header = b64u(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(
    Buffer.from(
      JSON.stringify({
        aud,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: process.env.VAPID_SUBJECT || "mailto:hello@vedank.app",
      })
    )
  );
  const signingInput = `${header}.${claims}`;
  const key = privateKeyFrom(fromB64u(privateKeyB64), fromB64u(publicKeyB64));
  /* JOSE wants the raw r||s pair, not DER. */
  const sig = crypto.sign("sha256", Buffer.from(signingInput), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  return `vapid t=${signingInput}.${b64u(sig)}, k=${publicKeyB64}`;
}

export type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } };

/* Returns the push service's status so the caller can retire dead endpoints. */
export async function deliver(
  sub: Subscription,
  payload: string,
  vapidPublic: string,
  vapidPrivate: string,
  ttlSeconds = 12 * 60 * 60
): Promise<number> {
  const body = encryptPayload(payload, sub.keys.p256dh, sub.keys.auth);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      TTL: String(ttlSeconds),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "Content-Length": String(body.length),
      Authorization: vapidAuth(sub.endpoint, vapidPublic, vapidPrivate),
    },
    body: new Uint8Array(body),
  });
  return res.status;
}

/* Exported for the tests: proves the key material round-trips. */
export const _internals = { hkdf, privateKeyFrom, publicKeyFrom, b64u, fromB64u };
