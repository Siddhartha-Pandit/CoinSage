// coinsage/src/lib/auth.ts
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';

const SALT_ROUNDS = 10;

// Hash a plaintext password (used during registration or password changes)
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plain, salt);
} 

// Compare a plaintext password to a bcrypt hash (used during login)
export async function comparePassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
} 

// Sign a JWT that includes exactly { id, email } in its payload
export function signToken(user: { _id: any; email: string }): string {
  const payload = {
    id: user._id.toString(), // Convert Mongo ObjectId to string
    email: user.email,
  };
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '7d',
  });
}

// Extract user ID from a Bearer token string. Throws an exception if invalid.
export function getUserFromToken(token: string): string {
  // 1. Handle the “Bearer ” prefix if present
  const rawToken = token.startsWith('Bearer ')
    ? token.split(' ')[1]
    : token;
  if (!rawToken) {
    // No token provided in header
    throw new Error('No token provided');
  } 

  // 2. Verify the JWT’s signature and decode its payload
  const decoded = jwt.verify(rawToken, process.env.JWT_SECRET!) as JwtPayload;
  if (
    !decoded || 
    typeof decoded !== 'object' || 
    !decoded.id
  ) {
    // The payload did not contain a valid `id`
    throw new Error('Invalid token payload');
  } 

  // 3. Return the user ID (as encoded in the payload)
  return decoded.id as string;
} 
