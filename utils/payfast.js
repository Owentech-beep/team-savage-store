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

  const signatureData = { ...data };

  // VERY IMPORTANT:
  // PayFast's received signature must NOT
  // be included in the string we hash.
  delete signatureData.signature;

  const parameterString = Object.keys(signatureData)
    .filter(key =>
      signatureData[key] !== undefined &&
      signatureData[key] !== null &&
      signatureData[key] !== ""
    )
    .map(key => {

      const value =
        String(signatureData[key]).trim();

      return `${key}=${encodeURIComponent(value)
        .replace(/%20/g, "+")}`;

    })
    .join("&");

  const stringToHash = passphrase
    ? `${parameterString}&passphrase=${encodeURIComponent(
        passphrase.trim()
      ).replace(/%20/g, "+")}`
    : parameterString;

  console.log(
    "🔥 ITN string to hash:",
    stringToHash
  );

  const signature =
    crypto
      .createHash("md5")
      .update(stringToHash)
      .digest("hex");

  console.log(
    "🔥 Expected ITN signature:",
    signature
  );

  return signature;
}