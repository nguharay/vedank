/* The push encryption is written against RFC 8291/8188/8292 rather than
   taken from a library, so it gets tested rather than trusted. The real
   check is the round trip: encrypt as the server, then decrypt exactly as a
   browser would, using only the subscription's own private key. If the two
   agree, the key schedule, the nonce and the record framing are all right. */
import crypto from "node:crypto";
import { encryptPayload, vapidAuth, _internals } from "../src/lib/game/webpush";

const { b64u, fromB64u } = _internals;
const fails: string[] = [];
const ok = (label: string, cond: boolean) => { if (!cond) fails.push(label); };

/* ---- a browser's subscription ---- */
const ua = crypto.createECDH("prime256v1");
ua.generateKeys();
const p256dh = b64u(ua.getPublicKey());
const authSecret = b64u(crypto.randomBytes(16));

/* ---- encrypt, then undo it the way the browser does ---- */
const message = JSON.stringify({ title: "挑戦状", body: "Beat 320", url: "/" });
const body = encryptPayload(message, p256dh, authSecret);

/* RFC 8188 header: salt(16) | rs(4) | idlen(1) | keyid(idlen) */
const salt = body.subarray(0, 16);
const rs = body.readUInt32BE(16);
const idlen = body[20];
const asPublic = body.subarray(21, 21 + idlen);
const ciphertext = body.subarray(21 + idlen);

ok("salt is 16 bytes", salt.length === 16);
ok("record size is declared", rs === 4096);
ok("the sender's key is an uncompressed P-256 point", idlen === 65 && asPublic[0] === 0x04);
/* bytes, not UTF-16 units: the payload is Japanese */
ok("ciphertext carries the GCM tag", ciphertext.length === Buffer.byteLength(message, "utf8") + 1 + 16);

const shared = ua.computeSecret(asPublic);
const ikm = _internals.hkdf(
  fromB64u(authSecret),
  shared,
  Buffer.concat([Buffer.from("WebPush: info\0"), ua.getPublicKey(), asPublic]),
  32
);
const cek = _internals.hkdf(salt, ikm, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
const nonce = _internals.hkdf(salt, ikm, Buffer.from("Content-Encoding: nonce\0"), 12);

let decrypted = "";
try {
  const d = crypto.createDecipheriv("aes-128-gcm", cek, nonce);
  d.setAuthTag(ciphertext.subarray(ciphertext.length - 16));
  const plain = Buffer.concat([d.update(ciphertext.subarray(0, ciphertext.length - 16)), d.final()]);
  ok("the record ends with the 0x02 delimiter", plain[plain.length - 1] === 0x02);
  decrypted = plain.subarray(0, plain.length - 1).toString("utf8");
} catch (e) {
  fails.push("decryption threw: " + (e as Error).message);
}
ok("the browser recovers exactly what was sent", decrypted === message);

/* Two sends of the same text must differ — a fresh salt and key each time. */
const again = encryptPayload(message, p256dh, authSecret);
ok("each message gets fresh key material", !again.equals(body));

/* ---- VAPID: a verifiable ES256 JWT for the right audience ---- */
const vapid = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const vapidPub = vapid.publicKey.export({ format: "jwk" }) as { x: string; y: string };
const vapidPriv = vapid.privateKey.export({ format: "jwk" }) as { d: string };
const pubRaw = b64u(Buffer.concat([Buffer.from([4]), fromB64u(vapidPub.x), fromB64u(vapidPub.y)]));

const header = vapidAuth("https://fcm.googleapis.com/fcm/send/abc", pubRaw, vapidPriv.d);
const m = header.match(/^vapid t=([^,]+), k=(.+)$/);
ok("the Authorization header is well formed", !!m);
if (m) {
  const [h, c, sig] = m[1].split(".");
  const claims = JSON.parse(Buffer.from(c, "base64url").toString());
  ok("the token names the push service as audience", claims.aud === "https://fcm.googleapis.com");
  ok("the token expires", typeof claims.exp === "number" && claims.exp > Date.now() / 1000);
  ok("the token says who is sending", typeof claims.sub === "string" && claims.sub.length > 0);
  ok("alg is ES256", JSON.parse(Buffer.from(h, "base64url").toString()).alg === "ES256");
  ok(
    "the signature verifies against the advertised key",
    crypto.verify("sha256", Buffer.from(`${h}.${c}`), { key: vapid.publicKey, dsaEncoding: "ieee-p1363" },
      fromB64u(sig))
  );
  ok("the advertised key is the signing key", m[2] === pubRaw);
}

if (fails.length) {
  console.error("web push FAILED:\n  " + fails.join("\n  "));
  process.exit(1);
}
console.log("web push round-trips and VAPID verifies (15 checks)");
