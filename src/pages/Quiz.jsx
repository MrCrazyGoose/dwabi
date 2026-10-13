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

  if (!quiz) return <p className="text-ash">{error || 'Loading...'}</p>;

  const reviewById = Object.fromEntries((result?.review || []).map((r) => [r.id, r]));
  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="tag bg-ink text-white">Week {Number(quiz.week.split('-W')[1])}</p>
        <h1 className="mt-3 text-5xl">Weekly quiz</h1>
        <p className="mt-2 text-lg">
          Five questions, {POINTS.QUIZ_PER_CORRECT} points each, and {POINTS.QUIZ_PERFECT_BONUS} more if you get all
          five. One try per week. A new set comes out every Monday.
        </p>
      </div>

      {result && (
        <div className="border-2 border-ink bg-bin p-5 text-white">
          <p className="font-display text-sm font-bold uppercase tracking-wider opacity-80">This week</p>
          <p className="mt-1 font-display text-4xl font-extrabold uppercase">
            {result.correct} of {result.total} right, +{result.points}
          </p>
          <p className="mt-1">The answers are below. Come back Monday for the next set.</p>
        </div>
      )}

      <ol className="space-y-4">
        {quiz.questions.map((q, qi) => {
          const review = reviewById[q.id];
          return (
            <li key={q.id} className="panel">
              <p className="flex gap-3 border-b-2 border-ink p-4 text-lg font-semibold">
                <span className="font-display text-2xl font-bold leading-none">{qi + 1}</span>
                {q.question}
              </p>
              <div className="grid gap-2 p-4 sm:grid-cols-2">
                {q.choices.map((c, ci) => {
                  let cls = 'bg-white hover:bg-paper';
                  if (review) {
                    if (ci === review.answer) cls = 'bg-leaf text-white';
                    else if (ci === review.chosen) cls = 'bg-stop text-white';
                    else cls = 'bg-white text-ash';
                  } else if (answers[q.id] === ci) {
                    cls = 'bg-ink text-white';
                  }
                  return (
                    <button
                      key={c}
                      disabled={Boolean(result)}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: ci }))}
                      className={`border-2 border-ink px-3 py-2 text-left ${cls}`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {review && <p className="border-t-2 border-ink px-4 py-3 text-sm">{review.explanation}</p>}
            </li>
          );
        })}
      </ol>

      {error && <p className="text-stop">{error}</p>}
      {!result && (
        <button className="btn-primary" disabled={!allAnswered || submitting} onClick={submit}>
          {submitting ? 'Sending...' : 'Submit answers'}
        </button>
      )}
    </div>
  );
}
