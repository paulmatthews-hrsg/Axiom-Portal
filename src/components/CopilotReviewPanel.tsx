import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronDown, ClipboardCheck, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRBAC } from '../contexts/RBACContext';
import { supabase } from '../lib/supabase';

interface FeedbackRecord {
  id: string;
  user_name: string;
  user_role: string;
  user_query: string;
  ai_response: string;
  rating: 'helpful' | 'not_helpful';
  category: string | null;
  comment: string | null;
  status: 'new' | 'investigating' | 'approved' | 'rejected';
  reviewer_notes: string | null;
  approved_guidance: string | null;
  created_at: string;
}

const categories = ['Incorrect data', 'Poor wording', 'Missing information', 'Wrong format', 'Access concern'];

export function CopilotReviewPanel() {
  const { currentUser, hasFullAccess } = useRBAC();
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [guidance, setGuidance] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<Record<string, string>>({});

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('copilot_feedback')
      .select('id, user_name, user_role, user_query, ai_response, rating, category, comment, status, reviewer_notes, approved_guidance, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Could not load Copilot feedback.');
    } else {
      setFeedback((data || []) as FeedbackRecord[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hasFullAccess()) void loadFeedback();
  }, [hasFullAccess, loadFeedback]);

  if (!hasFullAccess()) return null;

  const reviewFeedback = async (item: FeedbackRecord, status: 'approved' | 'rejected') => {
    const approvedText = guidance[item.id]?.trim() || '';
    if (status === 'approved' && !approvedText) {
      toast.error('Add approved guidance before approving this feedback.');
      return;
    }

    setSavingId(item.id);
    const reviewerNotes = notes[item.id]?.trim() || null;
    const { error } = await supabase
      .from('copilot_feedback')
      .update({
        status,
        category: category[item.id] || item.category,
        reviewer_name: currentUser.name,
        reviewer_role: currentUser.role,
        reviewer_notes: reviewerNotes,
        approved_guidance: status === 'approved' ? approvedText : null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (error) {
      toast.error('Could not save the review.');
      setSavingId(null);
      return;
    }

    if (status === 'approved') {
      const { error: guidanceError } = await supabase.from('copilot_guidance').insert({
        title: `Reviewed guidance: ${item.user_query.slice(0, 70)}`,
        instruction: approvedText,
        scope: category[item.id] || item.category || 'general',
        created_by: currentUser.name,
        approved_by: currentUser.name,
      });

      if (guidanceError) {
        toast.error('The review was saved, but approved guidance could not be activated.');
        setSavingId(null);
        return;
      }
    }

    toast.success(status === 'approved' ? 'Feedback approved and guidance activated.' : 'Feedback marked as rejected.');
    setExpandedId(null);
    setSavingId(null);
    await loadFeedback();
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
        <div className="rounded-lg bg-blue-600 p-2 text-white"><ClipboardCheck size={20} /></div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Copilot Feedback Review</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Review staff feedback before it becomes Copilot guidance.</p>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading feedback...</div>
        ) : feedback.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No feedback has been submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {feedback.map((item) => {
              const expanded = expandedId === item.id;
              return (
                <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700">
                  <button onClick={() => setExpandedId(expanded ? null : item.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${item.rating === 'helpful' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.rating === 'helpful' ? 'Helpful' : 'Needs review'}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">{item.user_query}</span>
                    <span className="text-xs capitalize text-slate-500">{item.status}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>

                  {expanded && (
                    <div className="space-y-4 border-t border-slate-200 px-4 py-4 dark:border-slate-700">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/60"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Question</p><p className="text-sm text-slate-700 dark:text-slate-200">{item.user_query}</p></div>
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/60"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Answer</p><p className="max-h-32 overflow-y-auto whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{item.ai_response}</p></div>
                      </div>
                      {item.comment && <p className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">Staff note: {item.comment}</p>}
                      {item.status === 'new' || item.status === 'investigating' ? (
                        <div className="space-y-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <select value={category[item.id] || item.category || ''} onChange={(event) => setCategory((current) => ({ ...current, [item.id]: event.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                              <option value="">Choose a category</option>
                              {categories.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                            <textarea value={notes[item.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} rows={2} placeholder="Reviewer notes (optional)" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" />
                          </div>
                          <textarea value={guidance[item.id] || ''} onChange={(event) => setGuidance((current) => ({ ...current, [item.id]: event.target.value }))} rows={3} placeholder="Approved instruction for future answers. Leave blank if rejecting." className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" />
                          <div className="flex flex-wrap justify-end gap-2">
                            <button disabled={savingId === item.id} onClick={() => reviewFeedback(item, 'rejected')} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"><X size={15} /> Reject</button>
                            <button disabled={savingId === item.id} onClick={() => reviewFeedback(item, 'approved')} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Check size={15} /> Approve guidance</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Reviewed{item.reviewer_notes ? `: ${item.reviewer_notes}` : '.'}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
