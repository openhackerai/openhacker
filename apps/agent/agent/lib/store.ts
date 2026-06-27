import { Redis } from "@upstash/redis";
import type { Finding, Target } from "./types";

export interface Store {
  listTargets(): Promise<Target[]>;
  getTarget(id: string): Promise<Target | null>;
  saveTarget(target: Target): Promise<void>;
  deleteTarget(id: string): Promise<void>;

  getTargetToken(id: string): Promise<string | null>;
  setTargetToken(id: string, token: string | null): Promise<void>;

  listFindings(targetId?: string): Promise<Finding[]>;
  replaceTargetFindings(targetId: string, findings: Finding[]): Promise<void>;
  upsertFinding(finding: Finding): Promise<void>;
}

const K = {
  targets: "oh:targets",
  token: (id: string) => `oh:token:${id}`,
  findings: (id: string) => `oh:findings:${id}`,
};

class RedisStore implements Store {
  constructor(private redis: Redis) {}

  async listTargets(): Promise<Target[]> {
    const all = (await this.redis.hgetall<Record<string, Target>>(K.targets)) ?? {};
    return Object.values(all).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async getTarget(id: string): Promise<Target | null> {
    return (await this.redis.hget<Target>(K.targets, id)) ?? null;
  }
  async saveTarget(target: Target): Promise<void> {
    await this.redis.hset(K.targets, { [target.id]: target });
  }
  async deleteTarget(id: string): Promise<void> {
    await this.redis.hdel(K.targets, id);
    await this.redis.del(K.token(id), K.findings(id));
  }
  async getTargetToken(id: string): Promise<string | null> {
    return (await this.redis.get<string>(K.token(id))) ?? null;
  }
  async setTargetToken(id: string, token: string | null): Promise<void> {
    if (token) await this.redis.set(K.token(id), token);
    else await this.redis.del(K.token(id));
  }
  async listFindings(targetId?: string): Promise<Finding[]> {
    if (targetId) return (await this.redis.get<Finding[]>(K.findings(targetId))) ?? [];
    const targets = await this.listTargets();
    const lists = await Promise.all(targets.map((t) => this.listFindings(t.id)));
    return lists.flat();
  }
  async replaceTargetFindings(targetId: string, findings: Finding[]): Promise<void> {
    await this.redis.set(K.findings(targetId), findings);
  }
  async upsertFinding(finding: Finding): Promise<void> {
    const existing = await this.listFindings(finding.targetId);
    const next = existing.filter((f) => f.id !== finding.id);
    next.push(finding);
    await this.replaceTargetFindings(finding.targetId, next);
  }
}

// Process-local fallback so the app boots and is testable without a KV store.
// Not durable across serverless invocations — configure Redis/KV for production.
const mem = {
  targets: new Map<string, Target>(),
  tokens: new Map<string, string>(),
  findings: new Map<string, Finding[]>(),
};

class MemoryStore implements Store {
  async listTargets(): Promise<Target[]> {
    return [...mem.targets.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async getTarget(id: string): Promise<Target | null> {
    return mem.targets.get(id) ?? null;
  }
  async saveTarget(target: Target): Promise<void> {
    mem.targets.set(target.id, target);
  }
  async deleteTarget(id: string): Promise<void> {
    mem.targets.delete(id);
    mem.tokens.delete(id);
    mem.findings.delete(id);
  }
  async getTargetToken(id: string): Promise<string | null> {
    return mem.tokens.get(id) ?? null;
  }
  async setTargetToken(id: string, token: string | null): Promise<void> {
    if (token) mem.tokens.set(id, token);
    else mem.tokens.delete(id);
  }
  async listFindings(targetId?: string): Promise<Finding[]> {
    if (targetId) return mem.findings.get(targetId) ?? [];
    return [...mem.findings.values()].flat();
  }
  async replaceTargetFindings(targetId: string, findings: Finding[]): Promise<void> {
    mem.findings.set(targetId, findings);
  }
  async upsertFinding(finding: Finding): Promise<void> {
    const existing = mem.findings.get(finding.targetId) ?? [];
    mem.findings.set(finding.targetId, [...existing.filter((f) => f.id !== finding.id), finding]);
  }
}

let store: Store | null = null;

export function getStore(): Store {
  if (store) return store;

  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    store = new RedisStore(new Redis({ url, token }));
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[openhacker] No KV/Redis env configured — using in-memory store. " +
          "Data will NOT persist. Add a Vercel KV / Upstash Redis integration.",
      );
    }
    store = new MemoryStore();
  }
  return store;
}

export function isPersistent(): boolean {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return Boolean(url && token);
}
