import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = "7d";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
