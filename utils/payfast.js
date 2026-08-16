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