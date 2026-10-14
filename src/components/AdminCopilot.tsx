import { Fragment, useState, useRef, useEffect, useCallback, type ReactNode, type CSSProperties } from 'react';
import {
  Sparkles, X, Send, Loader2, MessageSquare, ChevronRight,
  ThumbsDown, ThumbsUp, Check, History, Search, PanelLeftClose, Trash2, Pencil, SquarePen, Check as CheckIcon, Maximize2, Minimize2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRBAC } from '../contexts/RBACContext';
import { toast } from 'sonner';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolsUsed?: string[];
}

interface CopilotResponse {
  response: string;
  conversationId: string;
  toolsUsed: string[];
}

interface ConversationSummary {
  id: string;
  title: string | null;
  updated_at: string;
  messages: Json;
}

type Json = import('../types/database').Json;

const SUGGESTED_QUESTIONS = [
  "How many infringements are currently pending?",
  "Show me all active BPA agreements",
  "What's the total fine amount across all fleets?",
  "Which vehicles are in our registry?",
  "Are any BPA agreements expiring soon?",
];

const DEFAULT_PANEL_SIZE = { width: 440, height: 600 };
const MAX_PANEL_SIZE = { width: 1040, height: 960 };

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: "Hi! I'm the PennyOS Admin Copilot. I can look up infringements, vehicles, BPA agreements, maintenance records, email logs, and audit trails. Ask me anything about your fleet operations — I'm read-only, so I can only look things up, not change them.",
  timestamp: new Date().toISOString(),
};

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const tokens = text.split(tokenPattern);

  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={key} className="font-semibold text-slate-900 dark:text-white">{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={key} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-blue-700 dark:bg-slate-700 dark:text-blue-300">{token.slice(1, -1)}</code>;
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={key}>{token.slice(1, -1)}</em>;
    }
    return token;
  });
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function renderAssistantContent(content: string): ReactNode[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;
  let blockKey = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    if (index + 1 < lines.length && line.includes('|') && isTableDivider(lines[index + 1])) {
      const headers = splitTableRow(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push(
        <div key={`table-${blockKey++}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-700/60">
              <tr>{headers.map((header, headerIndex) => <th key={headerIndex} className="whitespace-nowrap px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{renderInlineMarkdown(header, `header-${headerIndex}`)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="bg-white dark:bg-slate-800/70">
                  {headers.map((_, cellIndex) => <td key={cellIndex} className="px-3 py-2 align-top text-slate-600 dark:text-slate-300">{renderInlineMarkdown(row[cellIndex] || '', `cell-${rowIndex}-${cellIndex}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      const HeadingTag = line.startsWith('# ') ? 'h3' : 'h4';
      blocks.push(<HeadingTag key={`heading-${blockKey++}`} className="mb-2 mt-4 text-sm font-semibold text-slate-900 dark:text-white first:mt-0">{renderInlineMarkdown(heading[1], `heading-${blockKey}`)}</HeadingTag>);
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      const ordered = /^\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        const match = ordered ? current.match(/^\d+[.)]\s+(.+)$/) : current.match(/^[-*]\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(<ListTag key={`list-${blockKey++}`} className={`${ordered ? 'list-decimal' : 'list-disc'} my-2 space-y-1 pl-5 text-slate-700 dark:text-slate-200`}>{items.map((item, itemIndex) => <li key={itemIndex} className="pl-1">{renderInlineMarkdown(item, `item-${itemIndex}`)}</li>)}</ListTag>);
      continue;
    }

    if (/^(---+|___+|\*\*\*+)$/.test(line)) {
      blocks.push(<hr key={`rule-${blockKey++}`} className="my-4 border-slate-200 dark:border-slate-700" />);
      index += 1;
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^#{1,3}\s+/.test(lines[index].trim()) && !/^[-*]\s+/.test(lines[index].trim()) && !/^\d+[.)]\s+/.test(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(<p key={`paragraph-${blockKey++}`} className="my-2 leading-6 text-slate-700 dark:text-slate-200">{paragraph.map((part, partIndex) => <Fragment key={partIndex}>{partIndex > 0 && ' '} {renderInlineMarkdown(part, `paragraph-${partIndex}`)}</Fragment>)}</p>);
  }

  return blocks;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    for (let index = 0; index < current.length; index += 1) previous[index] = current[index];
  }

  return previous[right.length];
}

function matchesSearchQuery(text: string, query: string): boolean {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery || normalizedText.includes(normalizedQuery)) return true;

  const textTokens = normalizedText.match(/[a-z0-9]+/g) || [];
  const queryTokens = normalizedQuery.match(/[a-z0-9]+/g) || [];

  return queryTokens.every((queryToken) => {
    const allowedDistance = queryToken.length >= 8 ? 2 : queryToken.length >= 5 ? 1 : 0;
    return textTokens.some((textToken) =>
      textToken.includes(queryToken) || levenshteinDistance(textToken, queryToken) <= allowedDistance,
    );
  });
}

function messagesToChatMessages(raw: Json): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Array<Record<string, unknown>>).map((m) => ({
    role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: String(m.content || ''),
    timestamp: String(m.timestamp || new Date().toISOString()),
    toolsUsed: Array.isArray(m.toolsUsed) ? (m.toolsUsed as string[]) : undefined,
  }));
}

export function AdminCopilot() {
  const { currentUser } = useRBAC();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackByMessage, setFeedbackByMessage] = useState<Record<number, 'helpful' | 'not_helpful'>>({});
  const [feedbackCommentFor, setFeedbackCommentFor] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [panelSize, setPanelSize] = useState(DEFAULT_PANEL_SIZE);
  const closeTimeoutRef = useRef<number | null>(null);
  const filteredConversations = conversations.filter((conversation) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const title = conversation.title || 'Untitled conversation';
    const messageText = Array.isArray(conversation.messages)
      ? conversation.messages
          .map((message) => {
            if (typeof message !== 'object' || message === null || !('content' in message)) return '';
            return String(message.content || '');
          })
          .join(' ')
      : '';

    return matchesSearchQuery(`${title} ${messageText}`, query);
  });
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const togglePanelSize = () => {
    setPanelSize((current) => current.width === DEFAULT_PANEL_SIZE.width && current.height === DEFAULT_PANEL_SIZE.height ? MAX_PANEL_SIZE : DEFAULT_PANEL_SIZE);
  };

  const openCopilot = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsClosing(false);
    setIsOpen(true);
  };

  const closeCopilot = () => {
    setIsClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      closeTimeoutRef.current = null;
    }, 220);
  };

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStartRef.current = { x: event.clientX, y: event.clientY, width: panelSize.width, height: panelSize.height };
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = resizeStartRef.current;
    if (!start) return;
    const width = Math.min(MAX_PANEL_SIZE.width, Math.max(DEFAULT_PANEL_SIZE.width, start.width + start.x - event.clientX));
    const height = Math.min(MAX_PANEL_SIZE.height, Math.max(DEFAULT_PANEL_SIZE.height, start.height + start.y - event.clientY));
    setPanelSize({ width, height });
  };

  const handleResizeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    resizeStartRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [isOpen, messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const loadConversations = useCallback(async () => {
    setLoadingHistory(true);
    const { data, error: fetchError } = await supabase
      .from('copilot_conversations')
      .select('id, title, updated_at, messages')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      toast.error('Could not load conversation history.');
    } else {
      setConversations((data || []) as ConversationSummary[]);
    }
    setLoadingHistory(false);
  }, []);

  useEffect(() => {
    if (showHistory) void loadConversations();
  }, [showHistory, loadConversations]);

  const sendMessage = async (query: string) => {
    if (!query.trim() || loading) return;

    setError(null);
    setShowSuggestions(false);
    const userMessage: ChatMessage = {
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-copilot`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: query.trim(),
          conversationId,
          user: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
            allowedFleets: currentUser.allowedFleets,
          },
          history: messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const data: CopilotResponse = await response.json();

      if (!data.response) {
        throw new Error('Received an empty response from the assistant');
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        toolsUsed: data.toolsUsed,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setConversationId(data.conversationId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const resetConversation = () => {
    setMessages([WELCOME_MESSAGE]);
    setConversationId(null);
    setShowSuggestions(true);
    setError(null);
    setFeedbackByMessage({});
    setFeedbackCommentFor(null);
  };

  const loadConversation = (conv: ConversationSummary) => {
    const chatMessages = messagesToChatMessages(conv.messages);
    if (chatMessages.length === 0) {
      setMessages([WELCOME_MESSAGE]);
    } else {
      setMessages(chatMessages);
    }
    setConversationId(conv.id);
    setShowSuggestions(false);
    setShowHistory(false);
    setError(null);
    setFeedbackByMessage({});
    setFeedbackCommentFor(null);
  };

  const saveTitle = async (id: string) => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from('copilot_conversations')
      .update({ title: trimmed })
      .eq('id', id);

    if (updateError) {
      toast.error('Could not rename the conversation.');
      return;
    }

    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c))
    );
    setEditingId(null);
    toast.success('Conversation renamed.');
  };

  const deleteConversation = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('copilot_conversations')
      .delete()
      .eq('id', id);

    if (deleteError) {
      toast.error('Could not delete the conversation.');
      return;
    }

    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (conversationId === id) {
      resetConversation();
    }
    setConfirmDeleteId(null);
    toast.success('Conversation deleted.');
  };

  const submitFeedback = async (messageIndex: number, rating: 'helpful' | 'not_helpful', comment = '') => {
    const message = messages[messageIndex];
    if (!message || message.role !== 'assistant') return;

    setFeedbackByMessage((current) => ({ ...current, [messageIndex]: rating }));
    const { error: feedbackError } = await supabase.from('copilot_feedback').insert({
      conversation_id: conversationId,
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role,
      user_query: messages[Math.max(0, messageIndex - 1)]?.content || 'Copilot response',
      ai_response: message.content,
      rating,
      comment: comment.trim() || null,
    });

    if (feedbackError) {
      setFeedbackByMessage((current) => {
        const next = { ...current };
        delete next[messageIndex];
        return next;
      });
      setError('Could not save your feedback. Please try again.');
      return;
    }

    setFeedbackCommentFor(null);
    setFeedbackComment('');
  };

  const toolLabel = (toolName: string): string => {
    const labels: Record<string, string> = {
      search_infringements: 'Searched infringements',
      get_infringement_stats: 'Infringement statistics',
      search_vehicles: 'Searched vehicles',
      search_bpa_agreements: 'Searched BPA agreements',
      get_bpa_stats: 'BPA statistics',
      search_email_logs: 'Searched email logs',
      search_audit_logs: 'Searched audit logs',
    };
    return labels[toolName] || toolName;
  };

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={openCopilot}
          className="fixed bottom-6 right-6 z-[9990] flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl"
          aria-label="Open Admin Copilot"
          title="Open Admin Copilot"
        >
          <Sparkles size={20} className="transition-transform hover:rotate-12" />
        </button>
      )}

      {/* Enlarged view backdrop */}
      {isOpen && (panelSize.width > DEFAULT_PANEL_SIZE.width || panelSize.height > DEFAULT_PANEL_SIZE.height) && (
        <div
          aria-hidden="true"
          className={`fixed inset-0 z-[9998] bg-slate-950/10 backdrop-blur-[2px] dark:bg-slate-950/25 ${isClosing ? 'copilot-backdrop-exit' : 'copilot-backdrop-enter'}`}
        />
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className={`fixed bottom-0 right-0 z-[9999] flex h-[100vh] w-full sm:bottom-6 sm:right-6 sm:h-[var(--copilot-height)] sm:max-h-[88vh] sm:w-auto sm:transition-[height] sm:duration-300 sm:ease-in-out ${isClosing ? 'copilot-panel-exit' : 'copilot-panel-enter'}`}
          style={{ '--copilot-height': `${panelSize.height}px` } as CSSProperties}
        >
          {/* Collapsed rail */}
          {!showHistory && (
            <aside className="hidden w-12 flex-col items-center gap-2 rounded-l-2xl border border-r-0 border-slate-200 bg-white py-3 shadow-2xl dark:border-slate-700/60 dark:bg-slate-900 sm:flex">
              <button
                onClick={resetConversation}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                title="New chat"
              >
                <SquarePen size={17} />
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                title="Open chat history"
              >
                <History size={17} />
              </button>
              <button
                onClick={() => { setShowHistory(true); setTimeout(() => searchInputRef.current?.focus(), 120); }}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                title="Search chats"
              >
                <Search size={17} />
              </button>
            </aside>
          )}

          {/* Expanded history card */}
          {showHistory && (
            <aside className="copilot-history-enter absolute inset-y-0 left-0 z-20 flex w-[280px] flex-col border border-r-0 border-slate-200 bg-white shadow-2xl dark:border-slate-700/60 dark:bg-slate-900 sm:static sm:w-[280px] sm:rounded-l-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                  <History size={17} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Your chats</span>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  title="Collapse chat history"
                >
                  <PanelLeftClose size={17} />
                </button>
              </div>
              <div className="space-y-2 border-b border-slate-200 p-3 dark:border-slate-700/60">
                <button
                  onClick={resetConversation}
                  className="flex w-full items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                >
                  <SquarePen size={16} /> New chat
                </button>
                <div className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search chats and messages"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-3">
                <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {searchQuery.trim() ? `${filteredConversations.length} matching ${filteredConversations.length === 1 ? 'chat' : 'chats'}` : 'Recent chats'}
                </p>
                {loadingHistory ? (
                  <div className="flex items-center gap-2 px-2 py-4 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Loading...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="px-2 py-4 text-sm leading-5 text-slate-500 dark:text-slate-400">{searchQuery ? 'No chats match your search.' : 'Your saved chats will appear here.'}</div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isActive = conv.id === conversationId;
                    const isEditing = editingId === conv.id;
                    const isConfirming = confirmDeleteId === conv.id;
                    return (
                      <div key={conv.id} className={`group mb-1 rounded-xl ${isActive ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 p-2">
                            <input ref={editInputRef} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveTitle(conv.id); if (event.key === 'Escape') setEditingId(null); }} className="min-w-0 flex-1 rounded-md border border-blue-400 bg-white px-2 py-1 text-sm text-slate-800 outline-none dark:bg-slate-900 dark:text-slate-100" onClick={(event) => event.stopPropagation()} />
                            <button onClick={() => saveTitle(conv.id)} className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"><CheckIcon size={14} /></button>
                            <button onClick={() => setEditingId(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={14} /></button>
                          </div>
                        ) : isConfirming ? (
                          <div className="p-2"><p className="mb-2 text-xs text-slate-600 dark:text-slate-300">Delete this conversation?</p><div className="flex gap-2"><button onClick={() => deleteConversation(conv.id)} className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">Delete</button><button onClick={() => setConfirmDeleteId(null)} className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Cancel</button></div></div>
                        ) : (
                          <div className="flex items-center gap-2 px-2 py-2.5" onClick={() => loadConversation(conv)}>
                            <MessageSquare size={14} className={`flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                            <button className="min-w-0 flex-1 text-left"><p className={`truncate text-sm ${isActive ? 'font-medium text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>{conv.title || 'Untitled conversation'}</p><p className="text-[11px] text-slate-400 dark:text-slate-500">{formatRelativeTime(conv.updated_at)}</p></button>
                            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"><button onClick={(event) => { event.stopPropagation(); setEditingId(conv.id); setEditTitle(conv.title || ''); }} className="rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10" title="Rename"><Pencil size={13} /></button><button onClick={(event) => { event.stopPropagation(); setConfirmDeleteId(conv.id); }} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" title="Delete"><Trash2 size={13} /></button></div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          )}

          <div
            className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl transition-[width,height] duration-300 ease-in-out dark:border-slate-700/60 dark:bg-slate-900 sm:h-[var(--copilot-height)] sm:w-[var(--copilot-width)] sm:rounded-r-2xl"
            style={{ '--copilot-width': `${panelSize.width}px`, '--copilot-height': `${panelSize.height}px` } as CSSProperties}
          >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-tight">Admin Copilot</h3>
                <p className="text-xs text-blue-100 leading-tight">Read-only operations assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={togglePanelSize}
                className="hidden rounded-lg p-1.5 transition-colors hover:bg-white/15 sm:block"
                title={panelSize.width === DEFAULT_PANEL_SIZE.width ? 'Expand chat' : 'Restore chat size'}
                aria-label={panelSize.width === DEFAULT_PANEL_SIZE.width ? 'Expand chat' : 'Restore chat size'}
              >
                {panelSize.width === DEFAULT_PANEL_SIZE.width ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={closeCopilot}
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50 dark:bg-slate-900">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'assistant' ? '' : 'w-full'}`}>
                  {msg.role === 'assistant' && idx === 0 && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles size={12} className="text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Copilot</span>
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-md'
                    }`}
                  >
                    {msg.role === 'assistant' ? renderAssistantContent(msg.content) : msg.content}
                  </div>
                  {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {msg.toolsUsed.map((tool, ti) => (
                        <span
                          key={ti}
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-500/20"
                        >
                          <ChevronRight size={10} />
                          {toolLabel(tool)}
                        </span>
                      ))}
                    </div>
                  )}
                  {msg.role === 'assistant' && idx > 0 && (
                    <div className="mt-2">
                      {feedbackByMessage[idx] ? (
                        <div className="flex items-center gap-1.5 px-1 text-xs text-slate-400 dark:text-slate-500"><Check size={13} className="text-emerald-500" /> Feedback recorded</div>
                      ) : (
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-xs text-slate-400 dark:text-slate-500">Was this helpful?</span>
                          <button onClick={() => submitFeedback(idx, 'helpful')} className="rounded-md p-1 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10" title="Helpful"><ThumbsUp size={13} /></button>
                          <button onClick={() => setFeedbackCommentFor(idx)} className="rounded-md p-1 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10" title="Needs improvement"><ThumbsDown size={13} /></button>
                        </div>
                      )}
                      {feedbackCommentFor === idx && !feedbackByMessage[idx] && (
                        <div className="mt-2 flex gap-2">
                          <input value={feedbackComment} onChange={(event) => setFeedbackComment(event.target.value)} placeholder="What should be improved?" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                          <button onClick={() => submitFeedback(idx, 'not_helpful', feedbackComment)} className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-700"><Send size={12} /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">Looking up data...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex justify-start">
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm text-red-700 dark:text-red-300 max-w-[85%]">
                  {error}
                </div>
              </div>
            )}

            {/* Suggested questions */}
            {showSuggestions && messages.length <= 1 && !loading && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 px-1">Try asking:</p>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/30 rounded-xl transition-all duration-200 group"
                  >
                    <MessageSquare size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-slate-200 dark:border-slate-700/60 p-3 bg-white dark:bg-slate-900">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about infringements, vehicles, BPAs..."
                rows={1}
                className="flex-1 resize-none text-sm px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 outline-none transition-all max-h-32"
                style={{ minHeight: '42px' }}
                disabled={loading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-colors flex-shrink-0"
                title="Send"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 px-1">
              Read-only · Cannot modify records or send emails
            </p>
            <div
              onPointerDown={handleResizeStart}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
              className="absolute bottom-0 left-0 z-30 hidden h-7 w-7 cursor-nesw-resize items-end justify-start p-1 text-slate-300 transition-colors hover:text-blue-500 sm:flex"
              title="Drag to resize"
            >
              <span className="h-2.5 w-2.5 rounded-bl-md border-b-2 border-l-2 border-current" />
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  );
}
