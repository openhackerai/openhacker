import { defineAgent } from "eve";

export default defineAgent({
  // Routes through the Vercel AI Gateway. On Vercel this authenticates with the
  // injected VERCEL_OIDC_TOKEN automatically; locally it uses AI_GATEWAY_API_KEY.
  model: "anthropic/claude-haiku-4.5",
  reasoning: "medium",
});
