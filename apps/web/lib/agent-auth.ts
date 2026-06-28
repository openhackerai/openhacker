import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { agentToken } from "./db/app-schema";
import { db } from "./db";

const TOKEN_PREFIX = "ohag_";

export function createAgentTokenSecret() {
  const secret = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;

  return {
    secret,
    hash: hashAgentToken(secret),
  };
}

export function hashAgentToken(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function authenticateAgentRequest(request: Request) {
  const bearerToken = readBearerToken(request);

  if (!bearerToken) {
    return null;
  }

  const [token] = await db
    .select()
    .from(agentToken)
    .where(
      and(
        eq(agentToken.tokenHash, hashAgentToken(bearerToken)),
        isNull(agentToken.revokedAt),
      ),
    )
    .limit(1);

  if (!token) {
    return null;
  }

  await db
    .update(agentToken)
    .set({ lastUsedAt: new Date() })
    .where(eq(agentToken.id, token.id));

  return token;
}
