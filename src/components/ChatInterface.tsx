import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Send } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CategoryChatInterface, { CategoryData } from "./CategoryChatInterface";
import ChatMessage from "./ChatMessage";
import { useToast } from "@/hooks/use-toast";

interface CombinedMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const categories = [
  { id: "role", label: "Role" },
  { id: "context", label: "Context" },
  { id: "business-overview", label: "Business / Product Overview" },
  { id: "tools-available", label: "Tools Available" },
  { id: "input-variables", label: "Input Variables" },
  { id: "instructions", label: "Instructions" },
  { id: "objective", label: "Objective" },
  { id: "examples", label: "Examples" },
  { id: "output-format", label: "Output Format" },
  { id: "rules-final-instructions", label: "Rules / Final Instructions" },
];

const ChatInterface = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryData, setCategoryData] = useState<Record<string, CategoryData>>({});
  const [messages, setMessages] = useState<CombinedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const removeCategory = (categoryId: string) => {
    setSelectedCategories(prev => prev.filter(id => id !== categoryId));
    setCategoryData(prev => {
      const newData = { ...prev };
      delete newData[categoryId];
      return newData;
    });
  };

  const handleCategoryDataChange = (categoryId: string, data: CategoryData) => {
    setCategoryData(prev => ({
      ...prev,
      [categoryId]: data
    }));
  };

  const formatCombinedInput = () => {
    return selectedCategories
      .filter(categoryId => {
        const data = categoryData[categoryId];
        return data && (data.input.trim() || data.files.length > 0);
      })
      .map(categoryId => {
        const category = categories.find(c => c.id === categoryId);
        const data = categoryData[categoryId];
        let categoryText = `${category?.label}:\n`;
        
        if (data.input.trim()) {
          categoryText += `${data.input}\n`;
        }
        
        if (data.files.length > 0) {
          categoryText += data.files.map(f => f.name).join(', ') + '\n';
        }
        
        return categoryText;
      })
      .join('\n');
  };

  const sendToWebhook = async (message: string) => {
    try {
      const allFiles = Object.values(categoryData).flatMap(data => 
        data.files.map(f => ({ name: f.name, type: f.type, size: f.size }))
      );

      const response = await fetch("http://localhost:5678/webhook-test/aac7bb60-1eea-4268-9394-67f12140c5b6", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message, 
          sessionId: `combined_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          categoryData,
          uploadedFiles: allFiles
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0 && data[0].output) {
        return data[0].output;
      } else if (data && data.output) {
        return data.output;
      }
      return "Response received successfully";
    } catch (error) {
      console.error("Webhook error:", error);
      throw new Error("Failed to get response from webhook");
    }
  };

  const handleSendCombined = async () => {
    const combinedInput = formatCombinedInput();
    
    if (!combinedInput.trim()) {
      toast({
        variant: "destructive",
        title: "No input",
        description: "Please add input to at least one category before sending.",
      });
      return;
    }

    const userMessage: CombinedMessage = {
      id: Date.now().toString(),
      text: combinedInput,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendToWebhook(combinedInput);
      
      const botMessage: CombinedMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
      
      toast({
        title: "Message sent",
        description: "Response received successfully",
      });
    } catch (error) {
      const errorMessage: CombinedMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I couldn't process your request. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please check your connection.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary">
                <MessageSquare className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">AI Meta Prompting</CardTitle>
                <p className="text-sm text-muted-foreground">Multi-Category RAG Agent</p>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Select Categories to Chat With</Label>
              <p className="text-xs text-muted-foreground mb-3">Choose one or more categories to create separate chat interfaces</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={category.id}
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <Label
                    htmlFor={category.id}
                    className="text-sm cursor-pointer leading-tight"
                  >
                    {category.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Input Interfaces */}
        <div className="space-y-6">
          {selectedCategories.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Select Categories to Get Started
                  </h3>
                  <p className="text-muted-foreground">
                    Choose one or more prompt categories above to create input forms
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-1">
                {selectedCategories.map((categoryId) => {
                  const category = categories.find(c => c.id === categoryId);
                  return (
                    <div key={categoryId} className="h-auto">
                      <CategoryChatInterface
                        category={categoryId}
                        categoryLabel={category?.label || categoryId}
                        onRemove={() => removeCategory(categoryId)}
                        onDataChange={handleCategoryDataChange}
                      />
                    </div>
                  );
                })}
              </div>
              
              {/* Send Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleSendCombined}
                  disabled={isLoading}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isLoading ? "Sending..." : "Send All Categories"}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Combined Chat Window */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Combined Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <h3 className="text-sm font-medium text-foreground mb-1">
                      Combined Chat Window
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Responses from all categories will appear here
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message.text}
                      isUser={message.isUser}
                      timestamp={message.timestamp}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatInterface;