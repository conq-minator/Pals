// P7: the only road to a payment. GLY shows the offer and passes on the user's yes.
// PULSE does the paying. A typed chat message never gets here.

import type { Logger } from "../../shared/logging/index.ts";
import type { PulsePaymentRequest, PurchaseProposal } from "../../shared/types/index.ts";
import type { Card } from "../chat/outbound.ts";
import type { ProposalState, Session } from "../chat/session.ts";
import type { Delegator } from "../delegation/send.ts";
import { ackText } from "../delegation/payloads.ts";
import { proposalCard } from "./cards.ts";

export type ApprovalOutcome = { ok: boolean; text: string };

export class ApprovalService {
  private delegator: Delegator;
  private log: Logger;
  private now: () => number;

  constructor(deps: { delegator: Delegator; log: Logger; now?: () => number }) {
    this.delegator = deps.delegator;
    this.log = deps.log;
    this.now = deps.now ?? Date.now;
  }

  register(session: Session, taskId: string, proposal: PurchaseProposal): void {
    session.proposals.set(proposal.proposalId, { proposal, status: "open", taskId });
  }

  /** Open, unexpired proposals, newest first, as cards. */
  openCards(session: Session): Card[] {
    const out: Card[] = [];
    for (const st of [...session.proposals.values()].reverse()) {
      if (st.status === "open" && !this.expired(st)) out.push(proposalCard(st.proposal));
    }
    return out;
  }

  private expired(st: ProposalState) {
    return this.now() > Date.parse(st.proposal.expiresAt);
  }

  async decide(args: {
    session: Session;
    userId: string;
    proposalId: string;
    decision: "approve" | "reject";
    correlationId: string;
  }): Promise<ApprovalOutcome> {
    const { session, proposalId } = args;
    const st = session.proposals.get(proposalId);
    const log = this.log.child({ correlationId: args.correlationId, proposalId });

    // Checks before anything is sent.
    if (!st) return { ok: false, text: "I can't find that offer any more. Want me to look for a fresh deal?" };
    if (st.proposal.userId !== args.userId || session.userId !== args.userId) {
      log.warn("approval from wrong user blocked");
      return { ok: false, text: "That offer isn't on your account, so I can't approve it." };
    }
    if (st.status === "approved") return { ok: true, text: "Already approved. Your payment is being processed." };
    if (st.status === "rejected") return { ok: false, text: "You already declined this offer." };
    if (st.status === "expired" || this.expired(st)) {
      st.status = "expired";
      return { ok: false, text: "This offer has expired, so prices may have changed. Want me to refresh the deal?" };
    }

    if (args.decision === "reject") {
      st.status = "rejected";
      log.info("proposal rejected");
      return { ok: true, text: "No problem, I've dropped that offer." };
    }

    // Mark approved before awaiting, so a double tap can't send twice.
    st.status = "approved";
    const payload: PulsePaymentRequest = {
      userId: args.userId,
      proposalId,
      amount: st.proposal.finalPrice,
      merchant: st.proposal.item.merchant,
    };
    const res = await this.delegator.delegate({
      session,
      correlationId: args.correlationId,
      action: "payment.execute",
      payload,
      summary: `payment for ${st.proposal.item.title}`,
      idempotencyKey: `pay:${proposalId}`,
    });
    if (!res.ok) {
      st.status = "open"; // let the user try again
      return { ok: false, text: "I couldn't reach the payment service just now. Nothing was charged. Please try Approve again in a moment." };
    }
    log.info("payment requested", { taskId: res.task.taskId });
    return { ok: true, text: ackText("payment.execute", "") };
  }
}
