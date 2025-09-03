import React, { useState, useEffect, useRef } from 'react';
import OpenAIClient from '../utils/openai';
import StorageManager from '../utils/storage';

const SidePanelApp = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [openai, setOpenai] = useState(null);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [storage] = useState(() => new StorageManager());
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    // Initialize OpenAI client and load chat history
    const initializeApp = async () => {
      try {
        // Load chat history first
        const savedHistory = await storage.getChatHistory();

        if (savedHistory.length > 0) {
          setMessages(savedHistory);
        } else {
          // Add welcome message if no history
          const welcomeMessage = {
            role: 'assistant',
            content: `Hello! I\'m Hobbes, your intelligent web automation assistant. I can help you navigate websites, fill forms, and complete tasks automatically.\n\nTry saying:\n• "Go to Amazon and search for wireless headphones"\n• "Go to Ebay and find me shoes"\n• "Fill out this contact form"\n• "Add a blue t-shirt to my cart"`,
            timestamp: Date.now(),
          };
          setMessages([welcomeMessage]);
        }

        // Get API key from background script
        const response = await chrome.runtime.sendMessage({
          type: 'GET_OPENAI_KEY',
        });

        if (response.success && response.apiKey) {
          setOpenai(new OpenAIClient(response.apiKey));
        } else {
          const errorMessage = {
            role: 'system',
            content:
              'Error: OpenAI API key not found. Please check your .env file.',
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        const errorMessage = {
          role: 'system',
          content: 'Error: Failed to initialize AI assistant.',
          timestamp: Date.now(),
        };
        setMessages([errorMessage]);
      }
    };

    initializeApp();

    // Listen for agent updates
    const handleAgentUpdate = message => {
      if (message.type === 'AGENT_UPDATE') {
        const update = message.data;

        // Track agent state
        if (update.type === 'task_started') {
          setIsAgentRunning(true);
        } else if (
          update.type === 'task_completed' ||
          update.type === 'task_failed' ||
          update.type === 'task_aborted'
        ) {
          setIsAgentRunning(false);
          setIsLoading(false);
        }

        // Add agent message to chat
        const agentMessage = {
          role: 'assistant',
          content: formatAgentMessage(update),
          timestamp: update.timestamp || Date.now(),
          agentUpdate: true,
        };

        setMessages(prev => [...prev, agentMessage]);
      }
    };

    chrome.runtime.onMessage.addListener(handleAgentUpdate);

    return () => {
      chrome.runtime.onMessage.removeListener(handleAgentUpdate);
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save messages to storage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      // Debounce the save operation
      const timeoutId = setTimeout(() => {
        storage.saveChatHistory(messages);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [messages, storage]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Check if this looks like a browser automation task
      if (isAutomationTask(currentInput)) {
        // Start AI agent for browser automation
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        setIsAgentRunning(true);

        const response = await chrome.runtime.sendMessage({
          type: 'AGENT_START',
          payload: {
            prompt: currentInput,
            tabId: tab.id,
          },
        });

        if (!response.success) {
          setIsAgentRunning(false);
          throw new Error(response.error);
        }

        // Agent will send updates via AGENT_UPDATE messages
      } else {
        // Regular chat conversation
        const conversationHistory = messages
          .filter(msg => msg.role !== 'system' && !msg.agentUpdate)
          .map(msg => ({
            role: msg.role,
            content: msg.content,
          }));

        conversationHistory.push({
          role: 'user',
          content: userMessage.content,
        });

        const response = await openai.chat(conversationHistory, {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 1000,
        });

        if (response.success) {
          const aiMessage = {
            role: 'assistant',
            content: response.message,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, aiMessage]);
        } else {
          const errorMessage = {
            role: 'system',
            content: `Error: ${response.error}`,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      }
    } catch (error) {
      console.error('Message error:', error);
      const errorMessage = {
        role: 'system',
        content: `Error: ${error.message}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    const welcomeMessage = {
      role: 'assistant',
      content:
        'Hello! I\'m Hobbes, your intelligent web automation assistant. I can help you navigate websites, fill forms, and complete tasks automatically.\n\nTry saying:\n• "Go to Amazon and search for wireless headphones"\n• "Find me a laptop under $1000"\n• "Fill out this contact form"\n• "Add a blue t-shirt to my cart"',
      timestamp: Date.now(),
    };
    setMessages([welcomeMessage]);
    // Clear from storage as well
    await storage.clearChatHistory();
  };

  const abortAgent = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'AGENT_STOP',
      });

      if (response.success) {
        setIsAgentRunning(false);
        setIsLoading(false);

        // No need to add abort message - AI agent already sends one via AGENT_UPDATE
      }
    } catch (error) {
      console.error('Failed to abort agent:', error);
    }
  };

  const isAutomationTask = input => {
    const automationKeywords = [
      'go to',
      'navigate to',
      'visit',
      'open',
      'search for',
      'find',
      'look for',
      'click',
      'click on',
      'press',
      'type',
      'enter',
      'fill',
      'buy',
      'purchase',
      'add to cart',
      'login',
      'sign in',
      'log in',
      'scroll',
      'scroll down',
      'scroll up',
    ];

    const lowerInput = input.toLowerCase();
    return automationKeywords.some(keyword => lowerInput.includes(keyword));
  };

  const formatAgentMessage = update => {
    const emojis = {
      agent_start: '🤖',
      thinking: '🤔',
      action: '⚡',
      observation: '👁️',
      system: 'ℹ️',
    };

    const emoji = emojis[update.type] || '🔧';
    return `${emoji} ${update.message}`;
  };

  const handleKeyPress = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = timestamp => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Group messages to identify completed agent tasks
  const groupMessages = messages => {
    const grouped = [];
    let currentAgentTask = null;
    let agentMessages = [];

    for (const message of messages) {
      if (message.agentUpdate) {
        // Start of a new agent task
        if (message.content.includes('🤖 Starting task:')) {
          // If we have a previous incomplete task, add it as individual messages
          if (currentAgentTask && agentMessages.length > 0) {
            grouped.push(
              ...agentMessages.map(msg => ({ ...msg, grouped: false }))
            );
          }

          // Start new task group
          currentAgentTask = {
            taskName: message.content
              .replace('🤖 Starting task: "', '')
              .replace('"', ''),
            startTime: message.timestamp,
            status: 'running',
          };
          agentMessages = [message];
        }
        // End of agent task (completed, failed, or aborted)
        else if (
          message.content.includes('✅ Task completed') ||
          message.content.includes('❌ Task failed') ||
          message.content.includes('🛑 Task aborted')
        ) {
          agentMessages.push(message);

          if (currentAgentTask) {
            currentAgentTask.status = message.content.includes('✅')
              ? 'completed'
              : message.content.includes('❌')
                ? 'failed'
                : 'aborted';
            currentAgentTask.endTime = message.timestamp;

            // Add as grouped task
            grouped.push({
              type: 'agent_task_group',
              task: currentAgentTask,
              messages: [...agentMessages],
              grouped: true,
            });
          }

          currentAgentTask = null;
          agentMessages = [];
        }
        // Middle of agent task
        else if (currentAgentTask) {
          agentMessages.push(message);
        } else {
          // Orphaned agent message
          grouped.push({ ...message, grouped: false });
        }
      } else {
        // Non-agent message - if we have incomplete task, add individual messages first
        if (currentAgentTask && agentMessages.length > 0) {
          grouped.push(
            ...agentMessages.map(msg => ({ ...msg, grouped: false }))
          );
          currentAgentTask = null;
          agentMessages = [];
        }
        grouped.push({ ...message, grouped: false });
      }
    }

    // Handle any remaining incomplete task
    if (currentAgentTask && agentMessages.length > 0) {
      grouped.push(...agentMessages.map(msg => ({ ...msg, grouped: false })));
    }

    return grouped;
  };

  const toggleTaskExpansion = taskId => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const AgentTaskGroup = ({ taskGroup, isExpanded, onToggle }) => {
    const { task, messages } = taskGroup;
    const statusColors = {
      completed: 'bg-green-500/20 border-green-400/30 text-green-200',
      failed: 'bg-red-500/20 border-red-400/30 text-red-200',
      aborted: 'bg-yellow-500/20 border-yellow-400/30 text-yellow-200',
    };

    const statusIcons = {
      completed: '✅',
      failed: '❌',
      aborted: '🛑',
    };

    const taskId = `${task.taskName}-${task.startTime}`;
    const duration = task.endTime
      ? Math.round((task.endTime - task.startTime) / 1000)
      : 0;

    return (
      <div className="space-y-2">
        {/* Collapsed Summary */}
        <div
          className={`backdrop-blur-xl shadow-lg border rounded-2xl p-4 cursor-pointer hover:bg-white/5 transition-all duration-200 ${statusColors[task.status]}`}
          onClick={() => onToggle(taskId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-lg">{statusIcons[task.status]}</span>
              <div>
                <h3 className="font-medium text-sm">{task.taskName}</h3>
                <p className="text-xs opacity-70">
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)} •{' '}
                  {duration}s • {messages.length} steps
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs opacity-60">
                {formatTime(task.startTime)}
              </span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-2 ml-4 border-l-2 border-white/10 pl-4">
            {messages.map((message, index) => (
              <div key={index} className="flex justify-start">
                <div className="max-w-xs lg:max-w-lg px-3 py-2 rounded-lg backdrop-blur-xl shadow-sm border bg-white/5 border-white/10 text-white text-xs">
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </div>
                  <div className="text-xs mt-1 opacity-50">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: 'url(/background.avif)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="backdrop-blur-xl bg-white/10 border-b border-white/20 px-6 py-5 sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center justify-between max-w-none">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg p-1.5">
                <img
                  src="/favico.png"
                  alt="Hobbes Assistant"
                  className="w-full h-full object-contain rounded-2xl"
                />
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl font-bold text-white">
                    Hobbes Assistant
                  </h1>
                  {isAgentRunning && (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 backdrop-blur-sm rounded-full border border-green-400/30">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-sm shadow-green-400/50"></div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-white/70">
                  Your intelligent web automation assistant
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Abort Button - only show when agent is running */}
              {isAgentRunning && (
                <button
                  onClick={abortAgent}
                  className="flex items-center space-x-1 px-2 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-red-500/20 backdrop-blur-sm rounded-xl transition-all duration-200 border border-red-400/30 hover:border-red-400/50 shadow-lg hover:shadow-red-500/20"
                  title="Stop Agent"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 10h6v4H9z"
                    />
                  </svg>
                </button>
              )}

              {/* Clear Chat Button */}
              <button
                onClick={clearChat}
                className="flex items-center space-x-1 px-2 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm rounded-xl transition-all duration-200 border border-white/20 hover:border-white/30 shadow-lg"
                title="Clear Chat"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 pb-40 space-y-5">
          {groupMessages(messages).map((item, index) => {
            if (item.type === 'agent_task_group') {
              const taskId = `${item.task.taskName}-${item.task.startTime}`;
              return (
                <AgentTaskGroup
                  key={taskId}
                  taskGroup={item}
                  isExpanded={expandedTasks.has(taskId)}
                  onToggle={toggleTaskExpansion}
                />
              );
            } else {
              // Regular message
              const message = item;
              return (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-lg px-5 py-3 rounded-2xl backdrop-blur-xl shadow-lg border ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-500/80 to-blue-500/80 text-white border-purple-400/30 shadow-purple-500/20'
                        : message.role === 'system'
                          ? 'bg-red-500/20 text-red-200 border-red-400/30 shadow-red-500/20'
                          : 'bg-white/10 border-white/20 text-white shadow-white/10'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
                    <div
                      className={`text-xs mt-2 opacity-70 ${
                        message.role === 'user'
                          ? 'text-white'
                          : message.role === 'system'
                            ? 'text-red-300'
                            : 'text-white'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              );
            }
          })}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-5 py-3 rounded-2xl shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Fixed to bottom */}
        <div className="fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-white/10 border-t border-white/20 p-6 z-20">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tell me what to do... (e.g., 'Go to Amazon and search for headphones')"
              className="w-full resize-none bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 pr-14 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-200 shadow-lg text-sm leading-relaxed"
              rows={2}
              disabled={isLoading}
              style={{ minHeight: '50px' }}
            />

            {/* Send Button - centered inside textarea */}
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-purple-500/30 flex items-center justify-center"
              title={isLoading ? 'Sending...' : 'Send message'}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>

            <div className="flex items-center justify-between mt-2 text-xs text-white/50">
              <span>Press Enter to send</span>
              <span>{input.length} characters</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidePanelApp;
