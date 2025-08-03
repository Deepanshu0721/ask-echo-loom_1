import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
}

const ChatMessage = ({ message, isUser, timestamp }: ChatMessageProps) => {
  return (
    <div className={cn(
      "flex w-full mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[80%] rounded-lg px-4 py-3 shadow-sm",
        isUser 
          ? "bg-chat-bubble-user text-chat-bubble-user-foreground ml-12" 
          : "bg-chat-bubble-bot text-chat-bubble-bot-foreground mr-12 border border-border"
      )}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message}
        </p>
        <span className="text-xs opacity-70 mt-2 block">
          {timestamp.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;