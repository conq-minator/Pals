import { PalsLogger } from '../logging/index.js';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMGenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface LLMResponse {
  content: string;
  model: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ILLMProvider {
  generate(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse>;
}

/**
 * Mock LLM Provider for offline deterministic tests and hermetic local workflows.
 */
export class MockLLMProvider implements ILLMProvider {
  private customHandlers: Map<string, (messages: LLMMessage[]) => string> = new Map();

  public registerHandler(keyword: string, handler: (messages: LLMMessage[]) => string): void {
    this.customHandlers.set(keyword.toLowerCase(), handler);
  }

  async generate(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse> {
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';

    for (const [keyword, handler] of this.customHandlers.entries()) {
      if (lastMessage.includes(keyword)) {
        return {
          content: handler(messages),
          model: options?.model || 'mock-provider',
          tokenUsage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 }
        };
      }
    }

    // Default intent classification mock
    if (lastMessage.includes('laptop') || lastMessage.includes('buy') || lastMessage.includes('price')) {
      return {
        content: JSON.stringify({
          intent: 'INTENT_SHOPPING_RESEARCH',
          category: 'electronics',
          budget: 75000,
          currency: 'INR',
          query: lastMessage
        }),
        model: 'mock-llm',
        tokenUsage: { promptTokens: 40, completionTokens: 40, totalTokens: 80 }
      };
    }

    if (lastMessage.includes('paypal') || lastMessage.includes('fee') || lastMessage.includes('protection') || lastMessage.includes('dispute')) {
      return {
        content: JSON.stringify({
          intent: 'INTENT_PAYPAL_GUIDANCE',
          category: 'BUYER_PROTECTION',
          query: lastMessage
        }),
        model: 'mock-llm',
        tokenUsage: { promptTokens: 30, completionTokens: 40, totalTokens: 70 }
      };
    }

    return {
      content: "Hello! I am GLY, your personal guide and companion. How can I help you today with PayPal or shopping?",
      model: 'mock-llm',
      tokenUsage: { promptTokens: 20, completionTokens: 20, totalTokens: 40 }
    };
  }
}

/**
 * Shared LLM Gateway singleton
 */
export class SharedLLMGateway {
  private static instance: SharedLLMGateway;
  private provider: ILLMProvider;
  private logger = new PalsLogger('SharedLLMGateway');

  private constructor() {
    // Default to Mock provider for local safety; in production, uses Gemini/OpenAI/Claude
    this.provider = new MockLLMProvider();
  }

  public static getInstance(): SharedLLMGateway {
    if (!SharedLLMGateway.instance) {
      SharedLLMGateway.instance = new SharedLLMGateway();
    }
    return SharedLLMGateway.instance;
  }

  public setProvider(provider: ILLMProvider): void {
    this.provider = provider;
    this.logger.info('LLM Provider updated');
  }

  public getProvider(): ILLMProvider {
    return this.provider;
  }

  public async generateText(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<string> {
    const res = await this.provider.generate(messages, options);
    return res.content;
  }
}

