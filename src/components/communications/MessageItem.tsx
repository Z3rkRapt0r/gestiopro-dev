
import { MessageRow } from "@/hooks/useMessages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Users, MailOpen, Mail } from "lucide-react";

interface MessageItemProps {
  message: MessageRow;
  onToggleRead: (msg: MessageRow) => void;
}

export default function MessageItem({ message, onToggleRead }: MessageItemProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row gap-2 items-start sm:items-center border rounded-lg p-4 shadow hover:bg-blue-50 transition ${message.is_read ? "bg-white" : "bg-blue-100"}`}
    >
      <div className="flex items-center gap-2 w-7">
        {message.is_global ? <Users className="text-purple-600" /> : <User className="text-green-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold truncate">{message.subject}</span>
          <Badge variant="secondary" className="ml-2">
            {message.is_global ? "A tutti" : "Personale"}
          </Badge>
        </div>
        <div className="text-gray-600 text-sm">{message.body}</div>
        <div className="text-xs text-gray-400 mt-2">{new Date(message.created_at).toLocaleString("it-IT")}</div>
      </div>
      <Button
        variant={message.is_read ? "secondary" : "outline"}
        size="icon"
        className="self-center"
        onClick={() => onToggleRead(message)}
        title={message.is_read ? "Segna come non letto" : "Segna come letto"}
      >
        {message.is_read ? <MailOpen /> : <Mail />}
      </Button>
    </div>
  );
}
