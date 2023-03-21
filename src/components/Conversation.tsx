import { FC, useEffect, useState } from 'react';
import type { GlobalConfig, Message } from '@interfaces';
import GlobalContext from '@contexts/global';
import type { I18n } from '@utils';
import {
  defaultModel,
  globalConfigLocalKey,
  localConversationKey,
} from '@configs';
import MessageBox from './MessageBox';
import MessageInput from './MessageInput';
import GlobalConfigs from './GlobalConfigs';
import ClearMessages from './ClearMessages';

const Conversation: FC<{ i18n: I18n }> = ({ i18n }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<GlobalConfig>({
    openAIApiKey: '',
    model: defaultModel,
    save: false,
  });

  useEffect(() => {
    // read from localstorage in the first time
    const localConfigsStr = localStorage.getItem(globalConfigLocalKey);
    if (localConfigsStr) {
      try {
        const localConfigs = JSON.parse(localConfigsStr);
        setConfigs(localConfigs);
        if (localConfigs.save) {
          const localConversation = localStorage.getItem(localConversationKey);
          if (localConversation) {
            setMessages(JSON.parse(localConversation));
          }
        }
      } catch (e) {
        //
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // save current conversation
  useEffect(() => {
    if (configs.save) {
      localStorage.setItem(localConversationKey, JSON.stringify(messages));
    } else {
      localStorage.removeItem(localConversationKey);
    }
  }, [messages, configs.save]);

  const sendChatMessages = async (content: string) => {
    const input: Message[] = messages.concat([
      {
        role: 'user',
        content,
      },
    ]);
    setMessages(input);
    setLoading(true);
    try {
      const res = await fetch('/api/completions', {
        method: 'POST',
        body: JSON.stringify({
          key: configs.openAIApiKey,
          model: configs.model,
          messages: input,
        }),
      });
      const data = await res.json();
      if (res.status < 400) {
        const replay = data.choices[0].message;
        setMessages(input.concat(replay));
      } else {
        setMessages(
          input.concat([
            { role: 'assistant', content: `Error: ${data.msg || 'Unknown'}` },
          ])
        );
      }
    } catch (e) {
      setMessages(input.concat([{ role: 'assistant', content: 'Error' }]));
    }
    setLoading(false);
  };

  return (
    <GlobalContext.Provider value={{ i18n }}>
      <header className="flex items-center justify-between">
        <div className="title">
          <span className="text-gradient">ChatGPT</span>
        </div>
        <GlobalConfigs configs={configs} setConfigs={setConfigs} />
      </header>
      {messages.length === 0 ? (
        <div className="text-gray-400 mb-[20px]">{i18n.default_tips}</div>
      ) : null}
      <MessageBox messages={messages} loading={loading} />
      <footer>
        <MessageInput onSubmit={sendChatMessages} loading={loading} />
        <ClearMessages onClear={() => setMessages([])} />
      </footer>
    </GlobalContext.Provider>
  );
};

export default Conversation;