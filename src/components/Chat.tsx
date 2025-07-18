import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';


// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';


interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// ... (rest of your imports and interfaces)

const Chat: React.FC = () => {
  const { user, token, logout, authenticatedFetch } = useAuth(); // <--- Important: Destructure authenticatedFetch
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, [token]);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    setLoading(true); // Added loading state for initial fetch
    setError('');     // Clear previous errors
    try {
      // Use authenticatedFetch from AuthContext for consistency and error handling
      const response = await authenticatedFetch('/conversations', {
        method: 'GET' // Explicitly state method for clarity, though GET is default
      });
      
      if (response.ok) {
        const data = await response.json();
        // === FIX IS HERE ===
        // Check if data is an array directly, or if it's an object containing a 'conversations' array
        if (Array.isArray(data)) {
          setConversations(data); // Backend returns array directly: [...]
        } else if (data && Array.isArray(data.conversations)) {
          setConversations(data.conversations); // Backend returns object: { conversations: [...] }
        } else {
          // Handle unexpected response format from the backend
          console.error('API response for /conversations was not an array or expected object format:', data);
          setError('Failed to load conversations due to unexpected server response.');
          setConversations([]); // Default to empty array to prevent map errors
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to load conversations.');
      }
    } catch (error: any) { // Type 'any' for error caught by catch block
      console.error('Error fetching conversations:', error);
      setError(error.message || 'Network error fetching conversations.');
    } finally {
      setLoading(false); // End loading regardless of success or failure
    }
  };

  const createNewConversation = async (firstMessage: string) => {
        setLoading(true);
        setError('');
        try {
            const response = await authenticatedFetch('/conversations', {
                method: 'POST',
                
                body: JSON.stringify({ initialMessage: firstMessage }), 
            });

            if (response.ok) {
                const data = await response.json(); 
                setConversations(prev => [data.conversation, ...prev]); 
                setActiveConversation(data.conversation);

                console.log("DEBUG: Backend response data:", data);
                console.log("DEBUG: Conversation object from response:", data.conversation);
                console.log("DEBUG: activeConversation after set:", data.conversation?.id); // Check the ID
            
            
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to create conversation');
            }
        } catch (error: any) {
            setError(error.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

  const sendMessage = async (conversationId: string, messageContent: string) => { 
    setLoading(true); 
    setError('');
    try {
      // Use authenticatedFetch for consistency
      console.log("authenticatedFetch URL for add message:", `/conversations/${conversationId}/message`);
      const response = await authenticatedFetch(`/conversations/${conversationId}/message`, {
        method: 'PUT',
        body: JSON.stringify({ message: messageContent }),
      });

      if (response.ok) {
        const updatedConversation = await response.json();
        console.log("DEBUG: sendMessage - Full updatedConversation object received from backend:", updatedConversation);
        console.log("DEBUG: sendMessage - Messages array in updatedConversation:", updatedConversation.messages);
        console.log("DEBUG: sendMessage - Number of messages in updatedConversation:", updatedConversation.messages?.length);
  
        setActiveConversation(updatedConversation);

        setConversations(prev => 
          prev.map(conv => 
            
            conv.id === conversationId ? updatedConversation : conv // Use 'any' or map _id to id in interface
          )
        );
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to send message');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true); // Global loading for the send action
    setError('');

    try {
      if (activeConversation && activeConversation.id ) 
      { 
        console.log("DEBUG: handleSubmit - activeConversation ID is:", activeConversation.id);
            
        await sendMessage(activeConversation.id, message);
      } else {
        console.log("DEBUG: handleSubmit - No activeConversation ID found, creating new conversation.");
            
        await createNewConversation(message);
      }
      setMessage('');
    } catch (error: any) {
      setError(error.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    // Only fetch if it's not already the active one
    if (activeConversation?.id === conversation.id) return;

    setLoading(true); 
    setError('');
    try {
      // Use authenticatedFetch for consistency
      const response = await authenticatedFetch(`/conversations/${conversation.id}`, { method: 'GET' });
      console.log("DEBUG: selectConversation - Fetching URL:", `/conversations/${conversation.id}`);
      console.log("DEBUG: selectConversation - Response OK:", response.ok);
        

      if (response.ok) {
        const fullConversation = await response.json();

        console.log("DEBUG: selectConversation - Full conversation data received:", fullConversation);
        console.log("DEBUG: selectConversation - Messages array in fullConversation:", fullConversation.messages);
        console.log("DEBUG: selectConversation - Number of messages in fullConversation:", fullConversation.messages?.length);
            
        setActiveConversation(fullConversation);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to load conversation details.');
        setActiveConversation(null); 
      }
    } catch (error: any) {
      console.error('Error fetching conversation:', error);
      setError(error.message || 'Network error fetching conversation details.');
      setActiveConversation(null);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;
    setLoading(true); 
    setError('');
    try {
      
      const response = await authenticatedFetch(`/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        if (activeConversation?.id === conversationId) {
          setActiveConversation(null); 
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete conversation.');
      }
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      setError(error.message || 'Network error deleting conversation.');
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setActiveConversation(null); 
    setMessage('');
    setError(''); 
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Sanguis AI</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.location.href = '/profile'}
                className="text-gray-500 hover:text-gray-700"
                title="Profile"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
          <button
            onClick={startNewChat}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg"
          >
            New Chat
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading && conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Loading conversations...</div>
          ) : error && conversations.length === 0 ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No conversations yet. Start a new chat!
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id} 
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 flex items-center justify-between group ${
                  activeConversation?.id === conversation.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => selectConversation(conversation)}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {conversation.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(conversation.updatedAt).toLocaleDateString()}{' '}
                    {new Date(conversation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); 
                    deleteConversation(conversation.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 ml-2"
                  title="Delete Conversation"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {activeConversation ? activeConversation.title : 'New Chat'}
          </h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeConversation && activeConversation.messages && (
                activeConversation.messages.map((msg) => (
                    <div
                        key={msg.id || `${msg.timestamp}-${msg.role}`}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                msg.role === 'user'
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                    : 'bg-gray-200 text-gray-900'
                            }`}
                        >
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${
                                msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                ))
            )}
          {loading && activeConversation && ( 
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                <div className="animate-pulse">AI is thinking...</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading} // Disable input while loading/sending
            />
            <button
              type="submit"
              disabled={loading || !message.trim()} // Disable button while loading or if message is empty
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
