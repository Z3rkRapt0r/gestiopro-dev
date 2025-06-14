
import { useMessages } from "@/hooks/useMessages";
import MessageItem from "./MessageItem";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeMessages() {
  const { messages, isLoading, markAsRead } = useMessages();

  const handleToggleRead = async (msg: any) => {
    await markAsRead({ id: msg.id, is_read: !msg.is_read });
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold">Comunicazioni</h2>
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_,i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : messages.length === 0 ? (
        <div className=" text-center py-16 text-gray-500">
          Nessuna comunicazione trovata.
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} onToggleRead={handleToggleRead} />
          ))}
        </div>
      )}
    </div>
  );
}
