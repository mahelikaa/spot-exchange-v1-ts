import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signToken(userId: string) {
    return await new SignJWT({ userId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(JWT_SECRET);
}

export async function requireAuth(req: any, res: any, next: any) {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "missing token" });
    }
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        (req as any).userId = payload.userId as string;
        next();
    } catch {
        return res.status(401).json({ error: "invalid or expired token" });
    }
}
