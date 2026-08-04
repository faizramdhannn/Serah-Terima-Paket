import { Redis } from "@upstash/redis";

// Supports both Vercel KV (KV_REST_API_*) and standalone Upstash Redis
// (UPSTASH_REDIS_REST_*) env var naming — whichever is set is used.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;
