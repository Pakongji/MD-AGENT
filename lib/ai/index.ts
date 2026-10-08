import type { AIProvider } from "@/lib/ai/provider";
import { MockAIProvider } from "@/lib/ai/mock-provider";

let provider: AIProvider | undefined;

export function getAIProvider(): AIProvider {
  if (!provider) {
    // The provider boundary is intentionally stable so a real OpenAIProvider can be added here.
    provider = new MockAIProvider();
  }
  return provider;
}
