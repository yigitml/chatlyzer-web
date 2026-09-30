import { OAuth2Client } from "google-auth-library";
import { ApiError } from "./apiBoundary";
const client = new OAuth2Client();

export async function verifyGoogleIdToken(idToken: string) {
  const audience = (process.env.GOOGLE_ALLOWED_CLIENT_IDS || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "")
    .split(",").map(value => value.trim()).filter(Boolean);
  if (!audience.length) throw new ApiError("Google authentication is not configured", 503);
  try {
    const ticket = await client.verifyIdToken({ idToken, audience });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email || !payload.name || payload.email_verified !== true ||
      !audience.includes(payload.aud) || !["accounts.google.com", "https://accounts.google.com"].includes(payload.iss) ||
      !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) throw new Error("Rejected Google claims");
    return { id: payload.sub, email: payload.email, name: payload.name, picture: payload.picture };
  } catch { throw new ApiError("Unauthorized", 401); }
}
