/**
 * AI Financial Assistant Module
 * 
 * Provides AI-powered insights and answers about the portfolio.
 * Uses OpenAI API or falls back to rule-based responses.
 */

import type {
  ChatMessage,
  ChatConversation,
  AIQuery,
  AIResponse,
  Holding,
  PortfolioMetrics,
} from "@shared/schema";
import { randomUUID } from "crypto";

// In-memory storage for conversations
const conversations: Map<string, ChatConversation> = new Map();

// OpenAI API key (optional)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ============================================
// CONVERSATION MANAGEMENT
// ============================================

/**
 * Get or create a conversation
 */
export function getConversation(
  conversationId: string | undefined,
  userId: string
): ChatConversation {
  if (conversationId) {
    const existing = conversations.get(conversationId);
    if (existing && existing.userId === userId) {
      return existing;
    }
  }
  
  // Create new conversation
  const now = new Date().toISOString();
  const conversation: ChatConversation = {
    id: randomUUID(),
    userId,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  
  conversations.set(conversation.id, conversation);
  return conversation;
}

/**
 * Get all conversations for a user
 */
export function getUserConversations(userId: string): ChatConversation[] {
  return Array.from(conversations.values())
    .filter(c => c.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Add message to conversation
 */
function addMessage(
  conversation: ChatConversation,
  role: "user" | "assistant" | "system",
  content: string
): ChatMessage {
  const message: ChatMessage = {
    id: randomUUID(),
    role,
    content,
    timestamp: new Date().toISOString(),
  };
  
  conversation.messages.push(message);
  conversation.updatedAt = message.timestamp;
  
  // Update title from first user message
  if (role === "user" && !conversation.title) {
    conversation.title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
  }
  
  conversations.set(conversation.id, conversation);
  return message;
}

/**
 * Delete conversation
 */
export function deleteConversation(conversationId: string, userId: string): boolean {
  const conversation = conversations.get(conversationId);
  if (!conversation || conversation.userId !== userId) return false;
  return conversations.delete(conversationId);
}

// ============================================
// AI RESPONSE GENERATION
// ============================================

/**
 * Build portfolio context for AI
 */
function buildPortfolioContext(
  holdings: Holding[],
  metrics: PortfolioMetrics | null
): string {
  if (holdings.length === 0) {
    return "The user has no holdings in their portfolio.";
  }
  
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
  const totalReturn = totalValue - totalCostBasis;
  const returnPercent = totalCostBasis > 0 ? (totalReturn / totalCostBasis) * 100 : 0;
  
  // Group by sector
  const sectorBreakdown: Record<string, number> = {};
  for (const h of holdings) {
    sectorBreakdown[h.sector] = (sectorBreakdown[h.sector] || 0) + h.currentValue;
  }
  
  // Top holdings
  const topHoldings = [...holdings]
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 5)
    .map(h => `${h.ticker} (${h.name}): $${h.currentValue.toLocaleString()} - ${h.sector}`);
  
  // Gainers and losers
  const gainers = holdings.filter(h => h.currentValue > h.costBasis);
  const losers = holdings.filter(h => h.currentValue < h.costBasis);
  
  return `
Portfolio Summary:
- Total Value: $${totalValue.toLocaleString()}
- Cost Basis: $${totalCostBasis.toLocaleString()}
- Total Return: $${totalReturn.toLocaleString()} (${returnPercent.toFixed(1)}%)
- Number of Holdings: ${holdings.length}
- Positions in Profit: ${gainers.length}
- Positions at Loss: ${losers.length}

Sector Allocation:
${Object.entries(sectorBreakdown)
  .sort((a, b) => b[1] - a[1])
  .map(([sector, value]) => `- ${sector}: $${value.toLocaleString()} (${((value/totalValue)*100).toFixed(1)}%)`)
  .join('\n')}

Top 5 Holdings:
${topHoldings.map((h, i) => `${i + 1}. ${h}`).join('\n')}
`.trim();
}

/**
 * Generate AI response using OpenAI API
 */
async function generateOpenAIResponse(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10), // Last 10 messages for context
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });
    
    if (!response.ok) {
      console.error("OpenAI API error:", response.status);
      return null;
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return null;
  }
}

/**
 * Generate rule-based response (fallback)
 */
function generateRuleBasedResponse(
  message: string,
  holdings: Holding[],
  _metrics: PortfolioMetrics | null
): { response: string; suggestedActions?: AIResponse["suggestedActions"] } {
  const lowerMessage = message.toLowerCase();
  
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
  const totalReturn = totalValue - totalCostBasis;
  
  // Portfolio value questions
  if (lowerMessage.includes("total") && (lowerMessage.includes("value") || lowerMessage.includes("worth"))) {
    return {
      response: `Your portfolio is currently worth $${totalValue.toLocaleString()}. This represents a ${totalReturn >= 0 ? "gain" : "loss"} of $${Math.abs(totalReturn).toLocaleString()} (${((totalReturn/totalCostBasis)*100).toFixed(1)}%) from your total cost basis of $${totalCostBasis.toLocaleString()}.`,
      suggestedActions: [
        { label: "View Holdings", action: "navigate", params: { path: "/holdings" } },
        { label: "See Analysis", action: "navigate", params: { path: "/analysis" } },
      ],
    };
  }
  
  // Top holdings
  if (lowerMessage.includes("top") && (lowerMessage.includes("holding") || lowerMessage.includes("position") || lowerMessage.includes("stock"))) {
    const top5 = [...holdings]
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 5);
    
    const list = top5.map((h, i) => 
      `${i + 1}. **${h.ticker}** (${h.name}): $${h.currentValue.toLocaleString()} - ${((h.currentValue/totalValue)*100).toFixed(1)}% of portfolio`
    ).join("\n");
    
    return {
      response: `Here are your top 5 holdings by value:\n\n${list}`,
    };
  }
  
  // Losers/underperformers
  if (lowerMessage.includes("loss") || lowerMessage.includes("losing") || lowerMessage.includes("worst") || lowerMessage.includes("underperform")) {
    const losers = holdings
      .filter(h => h.currentValue < h.costBasis)
      .sort((a, b) => (a.currentValue - a.costBasis) - (b.currentValue - b.costBasis))
      .slice(0, 5);
    
    if (losers.length === 0) {
      return { response: "Great news! None of your positions are currently at a loss." };
    }
    
    const list = losers.map((h, i) => {
      const loss = h.currentValue - h.costBasis;
      return `${i + 1}. **${h.ticker}**: -$${Math.abs(loss).toLocaleString()} (${((loss/h.costBasis)*100).toFixed(1)}%)`;
    }).join("\n");
    
    return {
      response: `Your positions with the largest unrealized losses:\n\n${list}\n\nConsider tax-loss harvesting if these align with your tax strategy.`,
      suggestedActions: [
        { label: "Tax Planning", action: "navigate", params: { path: "/planning" } },
      ],
    };
  }
  
  // Winners/gainers
  if (lowerMessage.includes("gain") || lowerMessage.includes("winner") || lowerMessage.includes("best") || lowerMessage.includes("profit")) {
    const winners = holdings
      .filter(h => h.currentValue > h.costBasis)
      .sort((a, b) => (b.currentValue - b.costBasis) - (a.currentValue - a.costBasis))
      .slice(0, 5);
    
    if (winners.length === 0) {
      return { response: "Unfortunately, none of your positions are currently in profit." };
    }
    
    const list = winners.map((h, i) => {
      const gain = h.currentValue - h.costBasis;
      return `${i + 1}. **${h.ticker}**: +$${gain.toLocaleString()} (+${((gain/h.costBasis)*100).toFixed(1)}%)`;
    }).join("\n");
    
    return {
      response: `Your top performing positions:\n\n${list}`,
    };
  }
  
  // Sector allocation
  if (lowerMessage.includes("sector") || lowerMessage.includes("allocation") || lowerMessage.includes("diversif")) {
    const sectorBreakdown: Record<string, number> = {};
    for (const h of holdings) {
      sectorBreakdown[h.sector] = (sectorBreakdown[h.sector] || 0) + h.currentValue;
    }
    
    const sectors = Object.entries(sectorBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([sector, value]) => `- **${sector}**: $${value.toLocaleString()} (${((value/totalValue)*100).toFixed(1)}%)`);
    
    return {
      response: `Your portfolio sector allocation:\n\n${sectors.join("\n")}\n\nDiversification across sectors can help reduce risk.`,
      suggestedActions: [
        { label: "View Analysis", action: "navigate", params: { path: "/analysis" } },
      ],
    };
  }
  
  // Dividend questions
  if (lowerMessage.includes("dividend")) {
    return {
      response: "I can help you track dividends! Check the Dividends page for a complete schedule of upcoming dividend payments based on your holdings.",
      suggestedActions: [
        { label: "View Dividends", action: "navigate", params: { path: "/dividends" } },
      ],
    };
  }
  
  // Risk questions
  if (lowerMessage.includes("risk")) {
    return {
      response: "For risk analysis, check out the Risk Indicators page which shows the Fear & Greed Index, VIX volatility, and your portfolio's risk metrics including beta, Sharpe ratio, and Value at Risk.",
      suggestedActions: [
        { label: "View Risk Indicators", action: "navigate", params: { path: "/risk-indicators" } },
      ],
    };
  }
  
  // Tax questions
  if (lowerMessage.includes("tax")) {
    return {
      response: "For tax planning, including tax-loss harvesting opportunities and Roth conversion analysis, visit the Planning page.",
      suggestedActions: [
        { label: "Tax Planning", action: "navigate", params: { path: "/planning" } },
      ],
    };
  }
  
  // Default response
  return {
    response: `I'm your financial assistant! I can help you with:\n\n• **Portfolio Overview**: "What's my total portfolio value?"\n• **Top Holdings**: "Show me my top holdings"\n• **Performance**: "Which stocks are my best/worst performers?"\n• **Sectors**: "How is my portfolio allocated?"\n• **Dividends**: "When are my next dividends?"\n• **Risk**: "What's my portfolio risk?"\n• **Taxes**: "Help with tax planning"\n\nFeel free to ask me anything about your portfolio!`,
  };
}

/**
 * Process a user query and generate response
 */
export async function processQuery(
  query: AIQuery,
  userId: string,
  holdings: Holding[],
  metrics: PortfolioMetrics | null
): Promise<AIResponse> {
  const conversation = getConversation(query.conversationId, userId);
  
  // Add user message
  addMessage(conversation, "user", query.message);
  
  let responseText: string;
  let suggestedActions: AIResponse["suggestedActions"];
  
  // Try OpenAI first if API key is available
  if (OPENAI_API_KEY && query.includePortfolioContext) {
    const portfolioContext = buildPortfolioContext(holdings, metrics);
    const systemPrompt = `You are a helpful financial assistant for a wealth tracking app called Sila. 
You have access to the user's portfolio data and can provide personalized insights.

${portfolioContext}

Provide concise, actionable advice. Use markdown formatting for clarity.
If asked about specific features, mention the relevant pages in the app (Dashboard, Holdings, Analysis, Dividends, Planning, Risk Indicators).`;
    
    const messages = conversation.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));
    
    const aiResponse = await generateOpenAIResponse(messages, systemPrompt);
    
    if (aiResponse) {
      responseText = aiResponse;
    } else {
      // Fallback to rule-based
      const ruleResponse = generateRuleBasedResponse(query.message, holdings, metrics);
      responseText = ruleResponse.response;
      suggestedActions = ruleResponse.suggestedActions;
    }
  } else {
    // Use rule-based response
    const ruleResponse = generateRuleBasedResponse(query.message, holdings, metrics);
    responseText = ruleResponse.response;
    suggestedActions = ruleResponse.suggestedActions;
  }
  
  // Add assistant response to conversation
  addMessage(conversation, "assistant", responseText);
  
  return {
    response: responseText,
    conversationId: conversation.id,
    suggestedActions,
  };
}
