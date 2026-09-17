import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const rawSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";
const VAPID_SUBJECT = rawSubject.startsWith("mailto:") ? rawSubject : `mailto:${rawSubject}`;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";

// ── Helpers: base64url ──────────────────────────────────────────────

function base64urlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── VAPID JWT ───────────────────────────────────────────────────────

async function importVapidPrivateKey(base64url: string): Promise<CryptoKey> {
  const raw = base64urlDecode(base64url);
  // raw is 32 bytes (the "d" parameter of the EC key)
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: base64url,
    x: "", // will be filled from public key
    y: "",
  };

  // Derive x,y from the public key
  const pubRaw = base64urlDecode(VAPID_PUBLIC_KEY);
  // pubRaw is 65 bytes: 0x04 || x (32) || y (32)
  const x = base64urlEncode(pubRaw.slice(1, 33));
  const y = base64urlEncode(pubRaw.slice(33, 65));
  jwk.x = x;
  jwk.y = y;

  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function createVapidAuthHeader(endpoint: string): Promise<{ authorization: string; cryptoKey: string }> {
  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header = base64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = base64urlEncode(new TextEncoder().encode(JSON.stringify({ aud, exp, sub: VAPID_SUBJECT })));

  const signingInput = new TextEncoder().encode(`${header}.${payload}`);
  const key = await importVapidPrivateKey(VAPID_PRIVATE_KEY);
  const sigBuf = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, signingInput);

  // DER to raw r||s (each 32 bytes)
  const sig = new Uint8Array(sigBuf);
  let r: Uint8Array, s: Uint8Array;

  if (sig.length === 64) {
    r = sig.slice(0, 32);
    s = sig.slice(32, 64);
  } else {
    // DER encoded — parse it
    // 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
    let offset = 2; // skip 0x30 <len>
    offset++; // 0x02
    const rLen = sig[offset++];
    const rBytes = sig.slice(offset, offset + rLen);
    offset += rLen;
    offset++; // 0x02
    const sLen = sig[offset++];
    const sBytes = sig.slice(offset, offset + sLen);

    // Pad/trim to 32 bytes
    r = new Uint8Array(32);
    s = new Uint8Array(32);
    r.set(rBytes.length > 32 ? rBytes.slice(rBytes.length - 32) : rBytes, 32 - Math.min(rBytes.length, 32));
    s.set(sBytes.length > 32 ? sBytes.slice(sBytes.length - 32) : sBytes, 32 - Math.min(sBytes.length, 32));
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  const jwt = `${header}.${payload}.${base64urlEncode(rawSig)}`;
  const pubKeyB64 = VAPID_PUBLIC_KEY;

  return {
    authorization: `vapid t=${jwt}, k=${pubKeyB64}`,
    cryptoKey: `p256ecdsa=${pubKeyB64}`,
  };
}

// ── Payload Encryption (RFC 8291 / aes128gcm) ──────────────────────

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const saltData = salt.length ? salt : new Uint8Array(32);
  const saltKey = await crypto.subtle.importKey("raw", saltData.buffer as ArrayBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm.buffer as ArrayBuffer));

  const prkKey = await crypto.subtle.importKey("raw", prk.buffer as ArrayBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
  return okm.slice(0, length);
}

function concatUint8(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function encryptPayload(
  clientPublicKeyB64: string,
  authSecretB64: string,
  payloadText: string
): Promise<{ ciphertext: Uint8Array; serverPublicKey: Uint8Array; salt: Uint8Array }> {
  const clientPublicKeyRaw = base64urlDecode(clientPublicKeyB64);
  const authSecret = base64urlDecode(authSecretB64);

  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));

  // Import client public key
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyRaw.buffer as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: clientPublicKey }, serverKeys.privateKey, 256)
  );

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // RFC 8291: IKM via HKDF with auth secret
  // Auth info = "WebPush: info\0" + ua_public (65) + as_public (65)
  const authInfo = concatUint8(
    new TextEncoder().encode("WebPush: info\0"),
    clientPublicKeyRaw,
    serverPublicKeyRaw
  );
  const ikm = await hkdf(authSecret, sharedSecret, authInfo, 32);

  // RFC 8291: CEK info = "Content-Encoding: aes128gcm\0"
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const cek = await hkdf(salt, ikm, cekInfo, 16);

  // RFC 8291: Nonce info = "Content-Encoding: nonce\0"
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad payload (add delimiter 0x02 + zero padding)
  const payloadBytes = new TextEncoder().encode(payloadText);
  const paddedPayload = concatUint8(payloadBytes, new Uint8Array([2]));

  // Encrypt with AES-128-GCM
  const key = await crypto.subtle.importKey("raw", cek.buffer as ArrayBuffer, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce.buffer as ArrayBuffer, tagLength: 128 }, key, paddedPayload.buffer as ArrayBuffer)
  );

  // Build aes128gcm header: salt (16) + rs (4) + idLen (1) + keyId (65) + ciphertext
  const rs = new Uint8Array(4);
  const view = new DataView(rs.buffer);
  view.setUint32(0, 4096);

  const idLen = new Uint8Array([serverPublicKeyRaw.length]);

  const header = concatUint8(salt, rs, idLen, serverPublicKeyRaw);
  const body = concatUint8(header, encrypted);

  return { ciphertext: body, serverPublicKey: serverPublicKeyRaw, salt };
}

// ── Send Push ───────────────────────────────────────────────────────

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string
): Promise<Response> {
  const vapid = await createVapidAuthHeader(endpoint);
  const { ciphertext } = await encryptPayload(p256dh, auth, payload);

  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": vapid.authorization,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "TTL": "86400",
      "Urgency": "high",
    },
    body: ciphertext.buffer as ArrayBuffer,
  });
}

// ── Main Handler ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const order = body.record || body;
    const storeId = order.store_id;

    if (!storeId) {
      return new Response(JSON.stringify({ error: "No store_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch store info for logo image
    const { data: storeData } = await supabase
      .from("stores")
      .select("logo_url, name")
      .eq("id", storeId)
      .single();

    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("store_id", storeId);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(JSON.stringify({ error: "Failed to fetch subscriptions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[push-notify] Nenhuma subscription encontrada para store:", storeId);
      return new Response(JSON.stringify({ message: "No subscriptions found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[push-notify] Encontradas ${subscriptions.length} subscriptions para store: ${storeId}`);

    const customerName = order.customer_name || "Cliente";
    const total = Number(order.total) || 0;
    const formattedTotal = `R$ ${total.toFixed(2).replace(".", ",")}`;
    const deliveryType = order.delivery_type === "pickup" ? "🏪 Retirada" : "🛵 Entrega";
    const itemCount = Array.isArray(order.items) ? order.items.length : 0;
    const itemsText = itemCount > 0 ? `${itemCount} ${itemCount === 1 ? "item" : "itens"}` : "";

    const payload = JSON.stringify({
      title: `🎉 Novo Pedido! — ${customerName}`,
      body: `${formattedTotal} • ${itemsText} • ${deliveryType}`,
      url: "/admin/orders",
      orderId: order.id,
      image: storeData?.logo_url || null,
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        try {
          const res = await sendWebPush(sub.endpoint, sub.keys_p256dh, sub.keys_auth, payload);
          console.log(`[push-notify] Resultado para ${sub.endpoint.slice(0, 60)}...: HTTP ${res.status}`);

          if (res.status === 201 || res.status === 200) {
            return { endpoint: sub.endpoint, status: "sent" };
          }

          if (res.status === 410 || res.status === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
            console.log(`Removed expired subscription: ${sub.endpoint}`);
          }

          return { endpoint: sub.endpoint, status: "failed", error: `HTTP ${res.status}` };
        } catch (err: any) {
          console.error(`[push-notify] Erro ao enviar para ${sub.endpoint.slice(0, 60)}:`, err.message);
          return { endpoint: sub.endpoint, status: "failed", error: err.message };
        }
      })
    );

    return new Response(JSON.stringify({ sent: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Push notify error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
