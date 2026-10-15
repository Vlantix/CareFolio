// Checks the Gmail API settings WITHOUT sending an email.
//
//   npm run check:gmail
//
// Reads GMAIL_USER, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and
// GOOGLE_REFRESH_TOKEN from .env.local, swaps the refresh token for an
// access token (the same first step the app does), and prints only the
// result: ok/failed, the HTTP status, Google's error, and the granted
// scope. It never prints a secret or a token.

const NAMES = ["GMAIL_USER", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"];

const values = Object.fromEntries(NAMES.map((name) => [name, process.env[name]?.trim() ?? ""]));
const missing = NAMES.filter((name) => !values[name]);
if (missing.length > 0) {
  console.error(`FAILED: missing ${missing.join(", ")} in .env.local`);
  process.exit(1);
}

const res = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: values.GOOGLE_CLIENT_ID,
    client_secret: values.GOOGLE_CLIENT_SECRET,
    refresh_token: values.GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  }),
});
const data = await res.json().catch(() => ({}));

if (!res.ok || !data.access_token) {
  console.error("FAILED: Google refused the token request");
  console.error(`  HTTP status:       ${res.status}`);
  console.error(`  error:             ${data.error ?? "(none)"}`);
  console.error(`  error_description: ${data.error_description ?? "(none)"}`);
  const hints = {
    unauthorized_client:
      "The refresh token was made with a DIFFERENT OAuth client than GOOGLE_CLIENT_ID. Make a new refresh token with this client (README).",
    invalid_grant:
      "The refresh token expired or was revoked (Testing-mode apps expire after 7 days). Make a new one (README).",
    invalid_client: "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is wrong.",
  };
  if (hints[data.error]) console.error(`  meaning:           ${hints[data.error]}`);
  process.exit(1);
}

const scope = data.scope ?? "";
console.log("OK: Google gave an access token");
console.log(`  HTTP status: ${res.status}`);
console.log(`  scope:       ${scope || "(not returned)"}`);
if (/gmail\.send|mail\.google\.com/.test(scope)) {
  console.log("  gmail.send:  yes — this token can send email");
} else {
  console.error("  gmail.send:  NO — make a new refresh token with scope https://www.googleapis.com/auth/gmail.send");
  process.exit(1);
}
