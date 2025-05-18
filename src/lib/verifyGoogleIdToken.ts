import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleIdToken(idToken: string) {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid token payload');
    }

    const email = payload.email;
    const name = payload.name;

    if (!email || !name) {
      throw new Error("Missing required user information (email or name)");
    }

    const userInfo = {
      id: payload.sub,
      email: payload.email!,
      name: payload.name!,
      picture: payload.picture,
    };

    return userInfo;
  } catch (err) {
    console.error('Failed to verify Google ID token:', err);
    throw new Error('Unauthorized');
  }
}