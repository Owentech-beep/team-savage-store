import crypto from "crypto";

export function generatePayfastSignature(data) {

  const passphrase =
    process.env.PAYFAST_PASSPHRASE || "";

  const parameterString = Object.keys(data)
    .filter(key =>
      data[key] !== undefined &&
      data[key] !== null &&
      data[key] !== ""
    )
    .map(key => {

      const value = String(data[key])
        .trim();

      return `${key}=${encodeURIComponent(value)
        .replace(/%20/g, "+")}`;

    })
    .join("&");


  const stringToHash = passphrase
    ? `${parameterString}&passphrase=${encodeURIComponent(
        passphrase
      ).replace(/%20/g, "+")}`
    : parameterString;


  console.log(
    "🔥 PayFast string to hash:",
    stringToHash
  );


  const signature =
    crypto
      .createHash("md5")
      .update(stringToHash)
      .digest("hex");


  console.log(
    "🔥 PayFast signature:",
    signature
  );


  return signature;

}

export function generatePayfastITNSignature(data) {

  const passphrase =
    process.env.PAYFAST_PASSPHRASE || "";

  const parameterString = Object.entries(data)
    .filter(([key, value]) =>
      key !== "signature" &&
      value !== undefined &&
      value !== null &&
      value !== ""
    )
    .map(([key, value]) => {

      return `${key}=${encodeURIComponent(
        String(value).trim()
      ).replace(/%20/g, "+")}`;

    })
    .join("&");

  const stringToHash = passphrase
    ? `${parameterString}&passphrase=${encodeURIComponent(
        passphrase.trim()
      ).replace(/%20/g, "+")}`
    : parameterString;

  const signature = crypto
    .createHash("md5")
    .update(stringToHash)
    .digest("hex");

  return signature;
}