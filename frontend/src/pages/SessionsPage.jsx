import { useEffect, useRef, useState } from 'react';
import { Send, CheckCircle2, Star, Shield, Flag, MessageSquare, Circle } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';
import { api, getSocket } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatTime, formatRelative, cn } from '../lib/utils';

export default function SessionsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const listRef = useRef(null);

  async function loadSessions() {
    setLoading(true);
    try {
      // FIX: was '/sessions', server route is '/sessions/me'
      const { sessions: list } = await api('/sessions/me');
      setSessions(list);
      if (!activeId && list[0]) setActiveId(list[0].id);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    if (!activeId) return;
    (async () => {
      try {
        const { messages: msgs } = await api(`/sessions/${activeId}/messages`);
        setMessages(msgs);
      } catch (err) {
        toast.error(err.message);
      }
    })();

    const socket = getSocket();
    socket.emit('session:join', { sessionId: activeId });
    const onNew = (msg) => {
      if (msg.sessionId === activeId) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    const onErr = (e) => toast.error(e.error);
    socket.on('message:new', onNew);
    socket.on('message:error', onErr);
    return () => {
      socket.off('message:new', onNew);
      socket.off('message:error', onErr);
    };
  }, [activeId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const active = sessions.find((s) => s.id === activeId);
  const otherParticipant = active
    ? active.providerId === user.id ? active.seeker : active.provider
    : null;

  function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || !activeId) return;
    const socket = getSocket();
    socket.emit('message:send', { sessionId: activeId, content: input });
    setInput('');
  }

  async function complete() {
    try {
      await api(`/sessions/${activeId}/complete`, { method: 'POST' });
      toast.success('Session completed. You can now leave a review.');
      await loadSessions();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function submitReview() {
    try {
      // FIX: was '/sessions/${activeId}/review' (non-existent route)
      // Server route is POST /api/reviews with sessionId + revieweeId in body
      await api('/reviews', {
        method: 'POST',
        body: {
          sessionId: activeId,
          revieweeId: otherParticipant?.id,
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment,
        },
      });
      toast.success('Review submitted!');
      setReviewOpen(false);
      setReviewForm({ rating: 5, comment: '' });
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <AppShell showFooter={false}>
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-6">
        <div className="mb-4">
          <h1 className="font-display text-3xl font-bold">Sessions</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Collaborate, chat, complete.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr] min-h-[70vh]">
          {/* Sessions list */}
          <Card className="p-2 overflow-y-auto max-h-[75vh]">
            {loading ? (
              <div className="space-y-2 p-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                <MessageSquare size={22} className="mx-auto mb-2" />
                No sessions yet. Accept a request or apply to one.
              </div>
            ) : (
              sessions.map((s) => {
                const other = s.providerId === user.id ? s.seeker : s.provider;
                const isActive = s.id === activeId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-lg flex items-center gap-3 transition',
                      isActive ? 'bg-indigo-500/15' : 'hover:bg-white/5'
                    )}
                  >
                    <Avatar name={other?.name} src={other?.avatarUrl} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm truncate">{other?.name}</span>
                        <Circle size={6} className={
                          s.status === 'active' ? 'fill-emerald-400 text-emerald-400'
                          : s.status === 'completed' ? 'fill-slate-400 text-slate-400'
                          : 'fill-yellow-400 text-yellow-400'
                        } />
                      </div>
                      <div className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>
                        {formatRelative(s.actualStart || s.createdAt)}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </Card>

          {/* Chat */}
          <Card className="flex flex-col overflow-hidden max-h-[75vh]">
            {active ? (
              <>
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={otherParticipant?.name} src={otherParticipant?.avatarUrl} size={40} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{otherParticipant?.name}</span>
                        <Badge tone={active.status === 'active' ? 'green' : active.status === 'completed' ? 'slate' : 'yellow'}>
                          {active.status}
                        </Badge>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                        ${active.agreedAmount}/hr
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {active.status === 'active' ? (
                      <Button size="sm" variant="secondary" onClick={complete}>
                        <CheckCircle2 size={14} /> Complete
                      </Button>
                    ) : null}
                    {active.status === 'completed' ? (
                      <Button size="sm" onClick={() => setReviewOpen(true)}>
                        <Star size={14} /> Review
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                  <div className="rounded-xl p-3 text-xs flex items-center gap-2"
                    style={{ background: 'rgba(34,211,238,0.08)', color: 'var(--text-muted)', border: '1px solid rgba(34,211,238,0.2)' }}>
                    <Shield size={12} className="text-cyan-400" />
                    Protected session mode: off-platform payment links and external URLs are blocked automatically.
                  </div>

                  {messages.length === 0 ? (
                    <div className="text-center text-sm py-10" style={{ color: 'var(--text-dim)' }}>
                      No messages yet. Say hello!
                    </div>
                  ) : (
                    messages.map((m) => {
                      const mine = m.senderId === user.id;
                      return (
                        <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                          <div
                            className={cn(
                              'sr-bubble',
                              mine ? 'sr-bubble-me' : 'sr-bubble-them',
                              m.isFlagged ? 'ring-1 ring-red-500/50' : ''
                            )}
                          >
                            <div className="whitespace-pre-wrap break-words">{m.content}</div>
                            <div className="text-[10px] opacity-70 mt-1 flex items-center gap-1">
                              {m.isFlagged ? <Flag size={10} className="text-red-400" /> : null}
                              {formatTime(m.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {active.status === 'active' ? (
                  <form onSubmit={sendMessage} className="p-3 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
                    <input
                      className="sr-input flex-1"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type your message…"
                    />
                    <Button type="submit">
                      <Send size={14} /> Send
                    </Button>
                  </form>
                ) : (
                  <div className="p-3 text-center text-xs border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                    This session is {active.status}. Messaging is read-only.
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Select a session to start.
              </div>
            )}
          </Card>
        </div>
      </section>

      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Leave a review">
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                  className="p-1"
                >
                  <Star
                    size={24}
                    className={n <= reviewForm.rating ? 'text-yellow-400' : 'text-slate-500'}
                    fill={n <= reviewForm.rating ? 'currentColor' : 'none'}
                  />
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Comment"
            as="textarea"
            rows={3}
            value={reviewForm.comment}
            onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button onClick={submitReview}>Submit review</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}