import { useState } from 'react';
import { HiChatBubbleLeftRight, HiSparkles } from 'react-icons/hi2';

import ChatBot from './components/chat/ChatBot';
import ProductReviews from './components/reviews/ProductReviews';

const TABS = [
   {
      id: 'chat',
      label: 'AI Chat Assistant',
      icon: HiChatBubbleLeftRight,
      description:
         'A customer-support chatbot for the WonderWorld theme park. It answers only from the park’s own information and remembers the conversation. Powered by OpenAI.',
   },
   {
      id: 'reviews',
      label: 'Review Summarizer',
      icon: HiSparkles,
      description:
         'Product reviews stored in MySQL. One click summarizes them with a local LLM (Ollama), and the summary is saved so it isn’t regenerated every time.',
   },
] as const;

type TabId = (typeof TABS)[number]['id'];

function App() {
   const [tab, setTab] = useState<TabId>('chat');
   const active = TABS.find((t) => t.id === tab)!;

   return (
      <div className="min-h-screen bg-gray-50">
         <header className="border-b bg-white">
            <div className="mx-auto max-w-5xl px-4 py-5">
               <h1 className="text-2xl font-bold">AI Assistant Demo</h1>
               <p className="text-sm text-muted-foreground">
                  Full-stack TypeScript · React · Express · Prisma · MySQL ·
                  OpenAI · Ollama
               </p>
               <nav className="mt-4 flex gap-2">
                  {TABS.map(({ id, label, icon: Icon }) => (
                     <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                           tab === id
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                        }`}
                     >
                        <Icon />
                        {label}
                     </button>
                  ))}
               </nav>
            </div>
         </header>

         <main className="mx-auto max-w-5xl px-4 py-6">
            <p className="mb-4 text-sm text-muted-foreground">
               {active.description}
            </p>
            <div className="rounded-2xl border bg-white p-4 shadow-sm md:p-6">
               {/* keep chat mounted so the conversation survives tab switches */}
               <div className={tab === 'chat' ? 'h-[65vh]' : 'hidden'}>
                  <ChatBot />
               </div>
               {tab === 'reviews' && <ProductReviews />}
            </div>
         </main>
      </div>
   );
}

export default App;
