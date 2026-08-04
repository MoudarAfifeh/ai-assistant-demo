import ReactMarkdown from 'react-markdown';
import React, { useEffect, useRef } from 'react';

export type Message = {
   content: string;
   role: 'user' | 'bot';
};
type Props = {
   messages: Message[];
};
function ChatMessages({ messages }: Props) {
   const lastMessageRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
   }, [messages]);
   const onCopyMessage = (e: React.ClipboardEvent): void => {
      const selection = window.getSelection()?.toString().trim();
      if (selection) {
         e.preventDefault();
         e.clipboardData.setData('text/plain', selection);
      }
   };
   return (
      <div className=" flex flex-col gap-3">
         {messages.map((message, index) => (
            <div
               key={index}
               ref={index === messages.length - 1 ? lastMessageRef : null}
               onCopy={onCopyMessage}
               className={`px-3 py-1 rounded-xl  ${
                  message.role === 'user'
                     ? ' bg-blue-600 text-white self-end'
                     : 'bg-gray-100 text-black self-start'
               }`}
            >
               <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
         ))}
      </div>
   );
}

export default ChatMessages;
