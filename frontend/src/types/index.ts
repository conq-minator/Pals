// Canonical imports from shared platform infrastructure
// NEVER redefine canonical contracts; reuse shared/types
export type {
  UserApprovalToken,
  PurchaseProposal,
  PolicyValidationResult,
  InboundChatMessageRequest,
  TaskLifecycleEvent,
  TaskStatus,
  PulsePaymentResponse,
  PayPalKnowledgeReference
} from '../../../shared/types/index.js';

export type {
  UserFinancialPolicy
} from '../../../shared/policy/index.js';

export {
  DeterministicPolicyEngine
} from '../../../shared/policy/index.js';

// Local UI View and Session state
export interface ChatMessage {
  id: string;
  sender: 'user' | 'gly' | 'system';
  content: string;
  timestamp: string;
  intent?: string;
  references?: Array<{
    documentId: string;
    title: string;
    url: string;
    contentSnippet: string;
    score: number;
    section: string;
  }>;
  proposal?: import('../../../shared/types/index.js').PurchaseProposal;
  paymentResult?: import('../../../shared/types/index.js').PulsePaymentResponse;
}

export interface GlyConnectionState {
  connected: boolean;
  mode: 'live_ws' | 'live_rest' | 'simulated';
  activeTask?: import('../../../shared/types/index.js').TaskLifecycleEvent;
  lastPing?: number;
}
