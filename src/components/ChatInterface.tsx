import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Send, Upload, X, Loader2, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [combinedChatInput, setCombinedChatInput] = useState("");
  const [combinedChatFiles, setCombinedChatFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoriesSectionRef = useRef<HTMLDivElement>(null);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setCombinedChatFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setCombinedChatFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCentralizedSend = async () => {
    const hasContent = combinedChatInput.trim() || 
                      combinedChatFiles.length > 0 || 
                      selectedCategories.some(categoryId => {
                        const data = categoryData[categoryId];
                        return data && (data.input.trim() || data.files.length > 0);
                      });

    if (!hasContent) {
      toast({
        variant: "destructive",
        title: "No input",
        description: "Please add input or select categories before sending.",
      });
      return;
    }

    // Format display message (original format)
    const displayMessage = formatCombinedInput(combinedChatInput);
    
    const userMessage: CombinedMessage = {
      id: Date.now().toString(),
      text: displayMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Clear inputs after successful send
    const originalCombinedInput = combinedChatInput;
    const originalCombinedFiles = [...combinedChatFiles];
    const originalCategoryData = { ...categoryData };
    
    setCombinedChatInput("");
    setCombinedChatFiles([]);

    try {
      const response = await sendToWebhook(originalCombinedInput, originalCategoryData);
      
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

  const formatCombinedInput = (chatInput?: string) => {
    let result = "";
    
    // Add combined chat input if provided
    if (chatInput?.trim()) {
      result += `${chatInput.trim()}\n`;
    }
    
    // Add combined file names if any
    if (combinedChatFiles.length > 0) {
      result += `${combinedChatFiles.map(f => f.name).join(', ')}\n`;
    }
    
    // Add category inputs
    const categoryInputs = selectedCategories
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
          categoryText += `${data.files.map(f => f.name).join(', ')}\n`;
        }
        
        return categoryText;
      })
      .join('\n');
    
    if (categoryInputs) {
      if (result) result += '\n';
      result += categoryInputs;
    }
    
    return result;
  };

  const sendToWebhook = async (combinedInput: string, categoryInputData: Record<string, CategoryData>) => {
    try {
      const formData = new FormData();
      
      // Add text data
      formData.append('combinedChatInput', combinedInput);
      formData.append('sessionId', `combined_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      
      // Add category inputs (text only)
      const categoryTextData: Record<string, string> = {};
      Object.entries(categoryInputData).forEach(([categoryId, data]) => {
        categoryTextData[categoryId] = data.input;
      });
      formData.append('categoryInputs', JSON.stringify(categoryTextData));
      
      // Add actual files from all categories
      Object.entries(categoryInputData).forEach(([categoryId, data]) => {
        data.files.forEach((file, index) => {
          formData.append(`${categoryId}_file_${index}`, file);
        });
      });
      
      // Add combined chat files
      combinedChatFiles.forEach((file, index) => {
        formData.append(`combined_file_${index}`, file);
      });

      const response = await fetch("http://localhost:5678/webhook-test/aac7bb60-1eea-4268-9394-67f12140c5b6", {
        method: "POST",
        body: formData,
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
          <Collapsible defaultOpen={true}>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Select Prompt Sections</Label>
                <p className="text-xs text-muted-foreground">Choose one or more categories to create separate chat interfaces</p>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            </div>
            
            <CollapsibleContent className="space-y-3 pt-3">
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
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <div className={selectedCategories.length === 0 ? "flex flex-col items-center w-full" : "grid gap-6 lg:grid-cols-2 h-fit"}>
        {/* Category Input Interfaces */}
        {selectedCategories.length > 0 && (
          <div ref={categoriesSectionRef} className="h-[600px] flex flex-col">
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                <div className="grid gap-3">
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
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Combined Chat Window */}
        <Card 
          className={`flex flex-col ${selectedCategories.length === 0 ? 'w-full max-w-4xl h-[600px]' : 'h-[600px]'}`}
        >
          <CardHeader className="shrink-0">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Prompt Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 pr-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                      <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <h3 className="text-sm font-medium text-foreground mb-1">
                        AI Prompt Chat Window
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedCategories.length === 0 
                          ? "Start chatting or select categories to get started"
                          : "Responses from all categories will appear here"
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div key={message.id} className="w-full">
                        <ChatMessage
                          message={message.text}
                          isUser={message.isUser}
                          timestamp={message.timestamp}
                        />
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </ScrollArea>
            
            {/* File Upload Display */}
            {combinedChatFiles.length > 0 && (
              <div className="px-4 py-2 border-t border-border bg-muted/50 shrink-0">
                <div className="flex flex-wrap gap-2">
                  {combinedChatFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-background rounded-md px-2 py-1 text-sm">
                      <span className="text-muted-foreground">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Chat Input with File Upload - Modified to remove individual send */}
            <div className="border-t border-border bg-background shrink-0">
              <div className="flex gap-3 p-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0"
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Input
                  value={combinedChatInput}
                  onChange={(e) => setCombinedChatInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-secondary border-border focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Centralized Send Button */}
      <div className="flex justify-center mt-6">
        <Button
          onClick={handleCentralizedSend}
          disabled={isLoading}
          size="lg"
          className="px-8 py-3 bg-primary hover:bg-primary/90 shadow-lg transition-all duration-200"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              Send All
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChatInterface;