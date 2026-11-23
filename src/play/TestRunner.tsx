import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, CheckCircle2, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { Item, StepMeta } from '@/engine/lesson/schema';
import { SECTION_LABEL } from '@/engine/lesson/schema';
import { answerText, isCorrect, type Presented, type Response } from '@/engine/lesson/testEngine';
import { GemButton } from '@/ui/components';

const TYPE_LABEL: Record<Item['type'], string> = {
  mcq: 'Multiple choice',
  numeric: 'Numeric answer',
  'predict-output': 'Predict the output',
  'order-steps': 'Put in order',
  'spot-the-bug': 'Spot the bug',
  match: 'Match the pairs',
};

type Draft = number | string | number[] | null;

function initialDraft(p: Presented): Draft {
  if (p.item.type === 'order-steps') return [...p.order];
  if (p.item.type === 'match') return p.item.pairs.map(() => -1);
  if (p.item.type === 'numeric') return '';
  return null;
}

/** Converts the on-screen draft into a source-indexed response, or null if incomplete. */
function toResponse(p: Presented, d: Draft): Response | null {
  switch (p.item.type) {
    case 'mcq':
    case 'predict-output':
      return typeof d === 'number' ? p.order[d]! : null;
    case 'spot-the-bug':
      return typeof d === 'number' ? d : null;
    case 'numeric': {
      if (typeof d !== 'string' || d.trim() === '') return null;
      const n = Number(d.trim().replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
    case 'order-steps':
      return d as number[];
    case 'match':
      return (d as number[]).every((v) => v >= 0) ? (d as number[]) : null;
  }
}

function Choices({
  name,
  options,
  value,
  onChange,
  disabled,
  mono,
}: {
  name: string;
  options: string[];
  value: Draft;
  onChange: (i: number) => void;
  disabled: boolean;
  mono?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Answers" className="space-y-2">
      {options.map((o, i) => (
        <label key={i} className={clsx('choice', value === i && 'choice-on', disabled && 'pointer-events-none')}>
          <input
            type="radio"
            name={name}
            checked={value === i}
            onChange={() => onChange(i)}
            disabled={disabled}
            className="sr-only"
          />
          <span className="choice-key">{String.fromCharCode(65 + i)}</span>
          <span className={clsx(mono && 'font-mono')}>{o}</span>
        </label>
      ))}
    </div>
  );
}

function ItemBody({
  p,
  draft,
  setDraft,
  locked,
}: {
  p: Presented;
  draft: Draft;
  setDraft: (d: Draft) => void;
  locked: boolean;
}) {
  const it = p.item;
  switch (it.type) {
    case 'mcq':
      return (
        <Choices
          name={it.id}
          options={p.order.map((k) => it.options[k]!)}
          value={draft}
          onChange={setDraft}
          disabled={locked}
        />
      );
    case 'predict-output':
      return (
        <div className="space-y-3">
          <pre className="code-block" aria-label={`${it.language} code`}>
            <code>{it.code.trimEnd()}</code>
          </pre>
          <Choices
            name={it.id}
            options={p.order.map((k) => it.options[k]!)}
            value={draft}
            onChange={setDraft}
            disabled={locked}
            mono
          />
        </div>
      );
    case 'spot-the-bug':
      return (
        <div role="radiogroup" aria-label="Code lines — choose the wrong one" className="code-block space-y-0.5 !p-2">
          {it.lines.map((line, i) => (
            <label key={i} className={clsx('bug-line', draft === i && 'bug-line-on', locked && 'pointer-events-none')}>
              <input
                type="radio"
                name={it.id}
                checked={draft === i}
                onChange={() => setDraft(i)}
                disabled={locked}
                className="sr-only"
              />
              <span className="w-7 select-none text-right text-white/40">{i + 1}</span>
              <span className="whitespace-pre">{line}</span>
            </label>
          ))}
        </div>
      );
    case 'numeric':
      return (
        <label className="block max-w-[260px] text-[13px] font-bold text-muted">
          YOUR ANSWER
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={draft as string}
            onChange={(e) => setDraft(e.target.value)}
            disabled={locked}
            className="mt-1 block w-full rounded-xl border border-line bg-white px-3 py-2.5 font-mono text-[18px] font-bold text-ink outline-none focus-visible:ring-2 focus-visible:ring-sky-2"
          />
        </label>
      );
    case 'order-steps': {
      const arr = draft as number[];
      const move = (i: number, d: number) => {
        const n = [...arr];
        [n[i], n[i + d]] = [n[i + d]!, n[i]!];
        setDraft(n);
      };
      return (
        <ol className="space-y-2" aria-label="Steps, in your order">
          {arr.map((k, i) => (
            <li key={k} className="choice !cursor-default">
              <span className="choice-key">{i + 1}</span>
              <span className="flex-1">{it.steps[k]}</span>
              <span className="flex gap-1">
                <button
                  type="button"
                  className="order-btn"
                  onClick={() => move(i, -1)}
                  disabled={locked || i === 0}
                  aria-label={`Move "${it.steps[k]}" up`}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  className="order-btn"
                  onClick={() => move(i, 1)}
                  disabled={locked || i === arr.length - 1}
                  aria-label={`Move "${it.steps[k]}" down`}
                >
                  <ArrowDown size={16} />
                </button>
              </span>
            </li>
          ))}
        </ol>
      );
    }
    case 'match': {
      const arr = draft as number[];
      return (
        <div className="space-y-2">
          {it.pairs.map((pair, i) => (
            <label
              key={pair.left}
              className="grid items-center gap-2 rounded-2xl border border-line bg-white/70 p-3 sm:grid-cols-[180px_1fr]"
            >
              <span className="font-bold">{pair.left}</span>
              <select
                value={arr[i]}
                disabled={locked}
                onChange={(e) => setDraft(arr.map((v, j) => (j === i ? Number(e.target.value) : v)))}
                className="rounded-xl border border-line bg-white px-3 py-2 text-[14px] font-medium text-ink"
              >
                <option value={-1}>Choose…</option>
                {p.order.map((k) => (
                  <option key={k} value={k}>
                    {it.pairs[k]!.right}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      );
    }
  }
}

interface Props {
  presented: Presented[];
  steps: StepMeta[];
  /** Where an item's step lives, when items come from several lessons (boss exams). */
  sourceOf?: (p: Presented) => { step: StepMeta; level?: string };
  onFinish: (responses: Response[]) => void;
}

/** One question at a time: answer → check → feedback (with the lesson step it came from) → next. */
export function TestRunner({ presented, steps, sourceOf, onFinish }: Props) {
  const [i, setI] = useState(0);
  const [drafts, setDrafts] = useState<Draft[]>(() => presented.map(initialDraft));
  const [responses, setResponses] = useState<Response[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const p = presented[i]!;
  const checked = responses.length > i;
  const response = toResponse(p, drafts[i]!);
  const right = checked && isCorrect(p.item, responses[i]!);
  const src = sourceOf ? sourceOf(p) : { step: steps.find((s) => s.id === p.item.teaches)! };
  const step = src.step;
  useEffect(() => heading.current?.focus(), [i]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!checked) {
      if (response !== null) setResponses([...responses, response]);
      return;
    }
    if (i < presented.length - 1) setI(i + 1);
    else onFinish(responses);
  };

  return (
    <form onSubmit={submit} className="space-y-5" aria-describedby="test-progress">
      <div className="flex items-center gap-3">
        <div
          id="test-progress"
          className="flex flex-1 gap-1.5"
          role="img"
          aria-label={`Question ${i + 1} of ${presented.length}`}
        >
          {presented.map((q, k) => (
            <span
              key={k}
              className={clsx(
                'h-2 flex-1 rounded-full',
                k < responses.length
                  ? isCorrect(q.item, responses[k]!)
                    ? 'bg-mint-2'
                    : 'bg-rose-2'
                  : k === i
                    ? 'bg-sky-2'
                    : 'bg-[rgb(11_36_71/.1)]',
              )}
            />
          ))}
        </div>
        <span className="font-mono text-[13px] font-bold text-muted">
          {i + 1}/{presented.length}
        </span>
      </div>
      <div>
        <p className="font-display text-[11.5px] font-extrabold tracking-[.16em] text-[#7c3aed]">
          {TYPE_LABEL[p.item.type].toUpperCase()} · {SECTION_LABEL[step.section].toUpperCase()}
        </p>
        <h2 ref={heading} tabIndex={-1} className="mt-1 font-display text-[22px] font-bold leading-snug outline-none">
          {p.item.prompt}
        </h2>
      </div>
      <ItemBody
        p={p}
        draft={drafts[i]!}
        setDraft={(d) => setDrafts(drafts.map((x, k) => (k === i ? d : x)))}
        locked={checked}
      />
      {checked ? (
        <div role="status" className={clsx('feedback', right ? 'feedback-right' : 'feedback-wrong')}>
          <p className="flex items-center gap-2 font-display text-[17px] font-bold">
            {right ? <CheckCircle2 size={20} aria-hidden /> : <XCircle size={20} aria-hidden />}
            {right ? 'Correct' : 'Not quite'}
          </p>
          {!right ? (
            <p className="mt-1 text-[14px] font-semibold">
              Answer: <span className="font-mono">{answerText(p.item)}</span>
            </p>
          ) : null}
          <p className="mt-1.5 text-[14px] font-medium">{p.item.explain}</p>
          <p className="mt-2 text-[12.5px] font-bold opacity-80">
            Taught in: {src.level ? `${src.level} · ` : ''}
            {step.title}
          </p>
        </div>
      ) : null}
      <div className="flex justify-end">
        <GemButton
          type="submit"
          variant={checked ? 'go' : 'sky'}
          disabled={!checked && response === null}
          iconAfter={<ArrowRight size={18} />}
        >
          {!checked ? 'Check' : i < presented.length - 1 ? 'Next question' : 'See results'}
        </GemButton>
      </div>
    </form>
  );
}
