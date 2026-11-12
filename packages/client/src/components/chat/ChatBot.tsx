import { useRef, useState } from 'react';
import axios from 'axios';

import type { Message } from './ChatMessages';
import ChatMessages from './ChatMessages';
import ChatInput, { type ChatFormData } from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { getApiError, type ApiErrorInfo } from '@/lib/apiError';
import popSound from '@/assets/sounds/pop.mp3';
import notificationSound from '@/assets/sounds/notification.mp3';

const popAudio = new Audio(popSound);
popAudio.volume = 0.2;
const notificationAudio = new Audio(notificationSound);
notificationAudio.volume = 0.2;

const SUGGESTIONS = [
   'How much is a child ticket?',
   'What are the opening hours?',
   'Which rides are good for kids?',
];

type ChatResponse = {
   message: string;
};

const ChatBot = () => {
   const conversationId = useRef(crypto.randomUUID());

   const [messages, setMessages] = useState<Message[]>([]);
   const [isBotTyping, setIsBotTyping] = useState(false);
   const [error, setError] = useState<ApiErrorInfo | null>(null);

   const onSubmit = async ({ prompt }: ChatFormData) => {
      try {
         setMessages((prev) => [...prev, { content: prompt, role: 'user' }]);
         setIsBotTyping(true);
         setError(null);
         popAudio.play();
         const { data } = await axios.post<ChatResponse>('/api/chat', {
            prompt,
            conversationId: conversationId.current,
         });
         setMessages((prev) => [
            ...prev,
            { content: data.message, role: 'bot' },
         ]);
         notificationAudio.play();
      } catch (error) {
         //sentry -> package to login the error
         setError(getApiError(error, 'Something wrong, try again!'));
      } finally {
         setIsBotTyping(false);
      }
   };

   return (
      <div className=" flex flex-col h-full">
         <div className=" flex flex-col flex-1 gap-3 mb-4 overflow-y-auto">
            {messages.length === 0 && (
               <div className="m-auto max-w-md text-center">
                  <p className="mb-1 text-lg font-semibold">
                     Hi! I'm the WonderWorld assistant 🎢
                  </p>
                  <p className="mb-4 text-sm text-muted-foreground">
                     Ask me about tickets, rides, opening hours or anything else
                     about the park.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                     {SUGGESTIONS.map((s) => (
                        <button
                           key={s}
                           onClick={() => onSubmit({ prompt: s })}
                           className="cursor-pointer rounded-full border px-3 py-1 text-sm hover:bg-gray-100"
                        >
                           {s}
                        </button>
                     ))}
                  </div>
               </div>
            )}
            <ChatMessages messages={messages} />
            {isBotTyping && <TypingIndicator />}
            {error && (
               <p
                  className={
                     error.isRateLimited ? 'text-amber-600' : 'text-red-500'
                  }
               >
                  {error.message}
               </p>
            )}
         </div>
         <ChatInput onSubmit={onSubmit} />
      </div>
   );
};

export default ChatBot;
