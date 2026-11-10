import { CentralCallsSystem } from '../../calls/index.js';
import { PalCallEnvelope } from '../../shared/types/index.js';

export interface AmbiguityClarification {
  isAmbiguous: boolean;
  question?: string;
  options?: string[];
  context?: string;
}

/**
 * ARBAmbiguityDetector
 * Detects under-specified or ambiguous product queries (e.g. "ram", "pizza", "bandage")
 * and dispatches research.needs_input events with 2-4 concrete options to GLY via calls/.
 */
export class ARBAmbiguityDetector {
  private static callsSystem = CentralCallsSystem.getInstance();

  /**
   * Analyzes user prompt for domain ambiguities.
   */
  public static checkAmbiguity(prompt: string): AmbiguityClarification {
    const clean = prompt.trim().toLowerCase();
    const tokens = clean.split(/\s+/).filter(Boolean);

    // 1. Ambiguous RAM Query
    // Query contains "ram" or "memory" but does not specify DDR4/DDR5 or Laptop vs Desktop
    if ((clean === 'ram' || clean === 'buy ram' || clean === 'ddr ram') ||
        (tokens.includes('ram') && !clean.includes('ddr4') && !clean.includes('ddr5') &&
         !clean.includes('laptop') && !clean.includes('desktop') && !clean.includes('sodimm') &&
         !clean.includes('corsair') && !clean.includes('crucial') && !clean.includes('g.skill'))) {
      return {
        isAmbiguous: true,
        question: 'Which type of RAM do you need for your system?',
        options: [
          'Desktop DDR5 RAM (High performance)',
          'Laptop SO-DIMM RAM (For laptops / mini PCs)',
          'Desktop DDR4 RAM (Older systems)'
        ],
        context: 'memory_form_factor'
      };
    }

    // 2. Ambiguous Pizza Query
    // Bare "pizza" or "order pizza" without topping, size or veg/non-veg preference
    if (clean === 'pizza' || clean === 'order pizza' || clean === 'buy pizza' || clean === 'pizza delivery') {
      return {
        isAmbiguous: true,
        question: 'What kind of pizza are you looking for?',
        options: [
          'Veg Pizza (Margherita / Paneer / Farmhouse)',
          'Non-Veg Pizza (Pepperoni / Chicken BBQ)',
          'Value Deals & Combos'
        ],
        context: 'pizza_dietary'
      };
    }

    // 3. Ambiguous Bandage Query
    // Bare "bandage" without specifying first-aid strips vs sprain crepe bandage
    if (clean === 'bandage' || clean === 'buy bandage' || clean === 'first aid bandage') {
      return {
        isAmbiguous: true,
        question: 'What type of bandage do you need?',
        options: [
          'Adhesive Bandage Strips (for cuts and scrapes)',
          'Crepe Elastic Bandage (for sprains and joint support)'
        ],
        context: 'bandage_type'
      };
    }

    // 4. Ambiguous Mac Mini Query
    if (clean === 'mac mini' || clean === 'buy mac mini' || clean === 'apple mac mini') {
      return {
        isAmbiguous: true,
        question: 'Which Apple Mac mini configuration do you prefer?',
        options: [
          'Mac mini M4 (Latest 2024 redesign, 16GB RAM base)',
          'Mac mini M2 (Budget-friendly previous generation)'
        ],
        context: 'mac_mini_generation'
      };
    }

    return { isAmbiguous: false };
  }

  /**
   * Emits research.needs_input event to GLY via calls/ to prompt the user.
   */
  public static async requestDisambiguation(
    taskId: string,
    correlationId: string,
    clarification: AmbiguityClarification
  ): Promise<void> {
    if (!clarification.isAmbiguous || !clarification.question) return;

    const envelope: PalCallEnvelope<{ taskId: string; question: string; options: string[] }> = {
      callId: `call_disambig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      correlationId: correlationId || taskId,
      caller: 'ARB',
      callee: 'GLY',
      action: 'research.needs_input',
      payload: {
        taskId,
        question: clarification.question,
        options: clarification.options || []
      },
      metadata: {
        timestamp: new Date().toISOString(),
        timeoutMs: 10000
      }
    };

    try {
      await this.callsSystem.dispatch(envelope);
    } catch {
      // Discard offline handler warning
    }
  }
}
