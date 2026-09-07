import crypto from "crypto";

const PAYFAST_URL =
  process.env.PAYFAST_MODE === "live"
    ? "https://www.payfast.co.za/eng/process"
    : "https://sandbox.payfast.co.za/eng/process";

const PAYFAST_VALIDATE_URL =
  process.env.PAYFAST_MODE === "live"
    ? "https://www.payfast.co.za/eng/query/validate"
    : "https://sandbox.payfast.co.za/eng/query/validate";

function encodePayfast(value) {
  return encodeURIComponent(String(value).trim()).replace(/%20/g, "+");
}

export function generatePayfastSignature(data) {
  let parameterString = "";

  for (const [key, value] of Object.entries(data)) {
    if (
      key !== "signature" &&
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      parameterString += `${key}=${encodePayfast(value)}&`;
    }
  }

  parameterString = parameterString.slice(0, -1);

  const passphrase = process.env.PAYFAST_PASSPHRASE;

  if (passphrase) {
    parameterString += `&passphrase=${encodePayfast(passphrase)}`;
  }

  return crypto
    .createHash("md5")
    .update(parameterString)
    .digest("hex");
}

export function getPayfastUrl() {
  return PAYFAST_URL;
}

export function getPayfastValidateUrl() {
  return PAYFAST_VALIDATE_URL;
}