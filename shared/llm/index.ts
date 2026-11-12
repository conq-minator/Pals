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
 * Real LLM Provider connecting to Google Gemini or OpenAI compatible APIs.
 */
export interface FetchLLMConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  providerType?: 'gemini' | 'openai';
}

export class FetchLLMProvider implements ILLMProvider {
  private apiKey: string;
  private baseUrl?: string;
  private defaultModel: string;
  private providerType: 'gemini' | 'openai';

  constructor(config?: FetchLLMConfig) {
    this.apiKey = config?.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';
    this.baseUrl = config?.baseUrl || process.env.LLM_BASE_URL;
    this.providerType = config?.providerType || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai');
    this.defaultModel = config?.model || (this.providerType === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini');
  }

  async generate(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse> {
    const model = options?.model || this.defaultModel;

    if (!this.apiKey) {
      throw new Error('LLM API key not configured. Set GEMINI_API_KEY or OPENAI_API_KEY.');
    }

    if (this.providerType === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      // Key goes in a header, not the URL: URLs end up in logs and proxies.
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: options?.temperature ?? 0.2,
            maxOutputTokens: options?.maxTokens ?? 1024,
            responseMimeType: options?.responseFormat === 'json' ? 'application/json' : 'text/plain'
          }
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Gemini API error (${res.status}): ${errorText}`);
      }

      const json = await res.json() as any;
      const content = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return {
        content,
        model,
        tokenUsage: {
          promptTokens: json.usageMetadata?.promptTokenCount || 0,
          completionTokens: json.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: json.usageMetadata?.totalTokenCount || 0
        }
      };
    } else {
      const url = this.baseUrl ? `${this.baseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
      const body: any = {
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 1024
      };
      if (options?.responseFormat === 'json') {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`OpenAI API error (${res.status}): ${errorText}`);
      }

      const json = await res.json() as any;
      const content = json.choices?.[0]?.message?.content || '';
      return {
        content,
        model,
        tokenUsage: {
          promptTokens: json.usage?.prompt_tokens || 0,
          completionTokens: json.usage?.completion_tokens || 0,
          totalTokens: json.usage?.total_tokens || 0
        }
      };
    }
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
    // If environment credentials are present, use real FetchLLMProvider; otherwise default to MockLLMProvider for offline safety
    if (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
      this.provider = new FetchLLMProvider();
    } else {
      this.provider = new MockLLMProvider();
    }
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

