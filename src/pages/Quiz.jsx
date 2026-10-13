import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { POINTS } from '../../shared/points.js';

export default function Quiz() {
  const { refresh } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api('/quiz/current')
      .then((q) => {
        setQuiz(q);
        if (q.attempt) setResult(q.attempt);
      })
      .catch((e) => setError(e.message));
  }, []);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const r = await api('/quiz/submit', { method: 'POST', body: { answers } });
      setResult(r);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!quiz) return <p className="text-slate-500">{error || 'Loading quiz…'}</p>;

  const reviewById = Object.fromEntries((result?.review || []).map((r) => [r.id, r]));
  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-eco-700">Week {quiz.week.split('-W')[1]}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Zero-Waste Quiz</h1>
        <p className="mt-1 text-slate-600">
          {quiz.questions.length} questions · {POINTS.QUIZ_PER_CORRECT} points each · +{POINTS.QUIZ_PERFECT_BONUS} for a
          perfect score. One attempt per week — a new quiz unlocks every Monday.
        </p>
      </div>

      {result && (
        <div className="rounded-2xl bg-eco-600 p-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-wide text-eco-100">This week's result</p>
          <p className="mt-1 text-3xl font-extrabold">
            {result.correct}/{result.total} correct · +{result.points} pts
          </p>
          <p className="mt-1 text-eco-100">{result.correct === result.total ? 'Perfect score! 🌟' : 'Review the answers below and come back next week.'}</p>
        </div>
      )}

      <ol className="space-y-4">
        {quiz.questions.map((q, qi) => {
          const review = reviewById[q.id];
          return (
            <li key={q.id} className="card p-5">
              <p className="font-semibold">
                <span className="mr-2 text-slate-400">{qi + 1}.</span>
                {q.question}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.choices.map((c, ci) => {
                  let cls = 'ring-slate-300 bg-white hover:bg-slate-50';
                  if (review) {
                    if (ci === review.answer) cls = 'ring-green-400 bg-green-50 text-green-900';
                    else if (ci === review.chosen) cls = 'ring-red-300 bg-red-50 text-red-900';
                    else cls = 'ring-slate-200 bg-white text-slate-500';
                  } else if (answers[q.id] === ci) {
                    cls = 'ring-eco-500 ring-2 bg-eco-50';
                  }
                  return (
                    <button
                      key={c}
                      disabled={Boolean(result)}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: ci }))}
                      className={`rounded-xl px-3 py-2 text-left text-sm ring-1 transition ${cls}`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {review && (
                <p className={`mt-3 text-sm ${review.correct ? 'text-green-800' : 'text-slate-700'}`}>
                  {review.correct ? '✅ ' : '💡 '}
                  {review.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {!result && (
        <button className="btn-primary w-full sm:w-auto" disabled={!allAnswered || submitting} onClick={submit}>
          {submitting ? 'Submitting…' : 'Submit answers'}
        </button>
      )}
    </div>
  );
}
