// Sends one test login-code email, using the same code as the app.
//
//   npm run test:email -- you@example.com
//
// Reads the email settings from .env.local. Prints the full result: an
// error here is the same one the live site would hit with these settings.
// (--conditions=react-server in the npm script lets this file load
// src/lib/email.ts, which is marked server-only.)

import { sendCodeEmail } from "../src/lib/email";

async function main() {
  const to = process.argv[2];
  if (!to || !to.includes("@")) {
    console.error("Usage: npm run test:email -- you@example.com");
    process.exit(1);
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  console.log(`Sending test code ${code} to ${to} …`);
  try {
    const result = await sendCodeEmail(to, code);
    console.log("Result:", JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  } catch (e) {
    console.error("Threw:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

main();
