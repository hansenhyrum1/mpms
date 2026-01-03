const admin = require("firebase-admin");
const cors = require("cors");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();
const db = admin.firestore();
const corsHandler = cors({ origin: true });

const recaptchaSecret = defineSecret("RECAPTCHA_SECRET");
const getSecret = () => recaptchaSecret.value();
const getRemoteIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "";
};

const verifyRecaptcha = async (token, remoteIp) => {
  const secret = getSecret();
  if (!secret) {
    throw new Error("Missing reCAPTCHA secret config");
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) {
    body.append("remoteip", remoteIp);
  }

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`reCAPTCHA verify failed with status ${response.status}`);
  }

  return response.json();
};

exports.submitContact = onRequest(
  { region: "us-central1", secrets: [recaptchaSecret] },
  (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!getSecret()) {
      console.error("submitContact: missing secret config");
      return res.status(500).json({ error: "reCAPTCHA secret not configured" });
    }

    const { name, email, phone, message, recaptchaToken } = req.body || {};
    if (!recaptchaToken) {
      return res.status(400).json({ error: "Missing recaptcha token" });
    }

    try {
      const verification = await verifyRecaptcha(recaptchaToken, getRemoteIp(req));
      if (!verification.success) {
        console.error("submitContact: invalid token", verification["error-codes"]);
        return res.status(400).json({ error: "reCAPTCHA verification failed" });
      }

      await db.collection("contactSubmissions").add({
        name: name ?? "",
        email: email ?? "",
        phone: phone ?? "",
        message: message ?? "",
        recaptchaScore:
          typeof verification.score === "number" ? verification.score : null,
        recaptchaErrors: verification["error-codes"] ?? [],
        recaptchaHostname: verification.hostname ?? null,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return res.status(200).json({ message: "Submission recorded" });
    } catch (error) {
      console.error("submitContact error:", error);
      return res.status(500).json({ error: "Unable to store submission", detail: error.message });
    }
  });
});
