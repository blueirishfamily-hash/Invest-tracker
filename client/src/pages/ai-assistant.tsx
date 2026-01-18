import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import { 
  MessageCircle, Send, Bot, User, Sparkles, 
  Trash2, Plus, ArrowRight, TrendingUp, PieChart, DollarSign
} from "lucide-react";
import { useLocation } from "wouter";
import type { ChatConversation, AIResponse } from "@shared/schema";

// Suggested prompts for new users
const suggestedPrompts = [
  { icon: TrendingUp, text: "What's my total portfolio value?" },
  { icon: PieChart, text: "How is my portfolio allocated?" },
  { icon: DollarSign, text: "Show me my top performing stocks" },
];

export default function AIAssistant() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Current conversation
  const { data: conversation, isLoading } = useQuery<ChatConversation>({
    queryKey: ["/api/ai/conversations", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const res = await fetch(`/api/ai/conversations/${conversationId}`);
      return res.json();
    },
  });
  
  // All conversations
  const { data: conversations } = useQuery<ChatConversation[]>({
    queryKey: ["/api/ai/conversations"],
  });
  
  // Send message mutation
  const sendMutation = useMutation<AIResponse, Error, string>({
    mutationFn: async (userMessage) => {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          includePortfolioContext: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: (data) => {
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
    },
  });
  
  // Delete conversation mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      if (conversationId) {
        setConversationId(undefined);
      }
    },
  });
  
  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages]);
  
  const handleSend = () => {
    if (!message.trim() || sendMutation.isPending) return;
    sendMutation.mutate(message);
    setMessage("");
  };
  
  const handleSuggestedPrompt = (prompt: string) => {
    setMessage(prompt);
    sendMutation.mutate(prompt);
  };
  
  const handleAction = (action: string, params?: Record<string, any>) => {
    if (action === "navigate" && params?.path) {
      navigate(params.path);
    }
  };
  
  const startNewConversation = () => {
    setConversationId(undefined);
  };
  
  const messages = conversation?.messages || [];
  
  return (
    <div className="p-6 h-[calc(100vh-4rem)]">
      <SEO
        title="AI Assistant"
        description="Get AI-powered insights about your portfolio"
      />

      <div className="h-full flex gap-6">
        {/* Conversation List */}
        <Card className="w-64 flex-shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-base">Conversations</span>
              <Button variant="ghost" size="icon" onClick={startNewConversation}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-14rem)]">
              <div className="px-4 space-y-2">
                {conversations?.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                      conversationId === conv.id ? "bg-muted" : ""
                    }`}
                    onClick={() => setConversationId(conv.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium line-clamp-2">
                        {conv.title || "New conversation"}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(conv.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                
                {(!conversations || conversations.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No conversations yet
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Financial Assistant
            </CardTitle>
            <CardDescription>
              Ask questions about your portfolio and get personalized insights
            </CardDescription>
          </CardHeader>
          
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages */}
            <ScrollArea ref={scrollRef} className="flex-1 p-4">
              {messages.length === 0 && !sendMutation.isPending ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">How can I help you today?</h3>
                  <p className="text-muted-foreground text-center mb-6 max-w-md">
                    I can answer questions about your portfolio, provide insights on your holdings, 
                    and help with financial planning.
                  </p>
                  
                  <div className="grid gap-3 max-w-md">
                    {suggestedPrompts.map((prompt, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        className="justify-start h-auto py-3"
                        onClick={() => handleSuggestedPrompt(prompt.text)}
                      >
                        <prompt.icon className="h-4 w-4 mr-3 text-muted-foreground" />
                        <span>{prompt.text}</span>
                        <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div 
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: msg.content
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\n/g, '<br/>')
                          }}
                        />
                      </div>
                      
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {sendMutation.isPending && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Suggested Actions */}
            {sendMutation.data?.suggestedActions && sendMutation.data.suggestedActions.length > 0 && (
              <div className="px-4 py-2 border-t flex gap-2 flex-wrap">
                {sendMutation.data.suggestedActions.map((action, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(action.action, action.params)}
                  >
                    {action.label}
                    <ArrowRight className="h-3 w-3 ml-2" />
                  </Button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask about your portfolio..."
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  disabled={sendMutation.isPending}
                />
                <Button 
                  onClick={handleSend} 
                  disabled={!message.trim() || sendMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                AI responses are for informational purposes only. Always consult a financial advisor.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
