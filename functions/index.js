const admin = require("firebase-admin");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();
const db = admin.firestore();
const corsHandler = cors({ origin: true });

const recaptchaSecret = defineSecret("RECAPTCHA_SECRET");
const smtpHost = defineSecret("SMTP_HOST");
const smtpPort = defineSecret("SMTP_PORT");
const smtpUser = defineSecret("SMTP_USER");
const smtpPass = defineSecret("SMTP_PASS");
const smtpFrom = defineSecret("SMTP_FROM");
const getSecret = () => recaptchaSecret.value();
const getSmtpConfig = () => {
  const host = smtpHost.value();
  const portValue = smtpPort.value();
  const user = smtpUser.value();
  const pass = smtpPass.value();
  const from = smtpFrom.value();
  const port = portValue ? Number(portValue) : 0;
  if (!host || !port || !user || !pass || !from) {
    return null;
  }
  return { host, port, user, pass, from };
};
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

const normalizeField = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const getRecipientEmail = async () => {
  const snapshot = await db.collection("siteConfig").doc("contact").get();
  if (!snapshot.exists) return "";
  const data = snapshot.data() || {};
  return normalizeField(data.recipientEmail);
};

const buildContactText = ({ name, email, phone, message }) => {
  return [
    "New contact form submission:",
    "",
    `Name: ${name || "-"}`,
    `Email: ${email || "-"}`,
    `Phone: ${phone || "-"}`,
    "",
    "Message:",
    message || "-"
  ].join("\n");
};

const sendContactNotification = async ({
  recipientEmail,
  name,
  email,
  phone,
  message
}) => {
  const smtpConfig = getSmtpConfig();
  if (!smtpConfig || !recipientEmail) {
    return { status: "skipped" };
  }

  const subject = name
    ? `New contact form message from ${name}`
    : "New contact form message";
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.port === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass
    }
  });

  const mailOptions = {
    from: `MPMS Website <${smtpConfig.from}>`,
    to: recipientEmail,
    subject,
    text: buildContactText({ name, email, phone, message })
  };

  if (email) {
    mailOptions.replyTo = name ? `${name} <${email}>` : email;
  }

  const info = await transporter.sendMail(mailOptions);
  return { status: "sent", messageId: info.messageId };
};

exports.submitContact = onRequest(
  {
    region: "us-central1",
    secrets: [recaptchaSecret, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom]
  },
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

      const safeName = normalizeField(name);
      const safeEmail = normalizeField(email);
      const safePhone = normalizeField(phone);
      const safeMessage = normalizeField(message);

      await db.collection("contactSubmissions").add({
        name: safeName,
        email: safeEmail,
        phone: safePhone,
        message: safeMessage,
        recaptchaScore:
          typeof verification.score === "number" ? verification.score : null,
        recaptchaErrors: verification["error-codes"] ?? [],
        recaptchaHostname: verification.hostname ?? null,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      try {
        const recipientEmail = await getRecipientEmail();
        await sendContactNotification({
          recipientEmail,
          name: safeName,
          email: safeEmail,
          phone: safePhone,
          message: safeMessage
        });
      } catch (error) {
        console.error("submitContact: email send failed", error);
      }

      return res.status(200).json({ message: "Submission recorded" });
    } catch (error) {
      console.error("submitContact error:", error);
      return res.status(500).json({ error: "Unable to store submission", detail: error.message });
    }
  });
});
