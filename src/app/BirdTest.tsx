"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  allAnswered,
  calculateResult,
  type AnswerMap,
  type CalculatedResult,
  type Clarity,
} from "@/lib/bird-algorithm";
import {
  BIRD_RESULTS,
  DIMENSION_DESCRIPTIONS,
  DIMENSION_LABELS,
  DIMENSIONS,
  QUESTIONS,
  type OptionLabel,
} from "@/lib/bird-data";
import styles from "./page.module.css";

const DRAFT_KEY = "bird-ending:draft:v1";
const RESULT_KEY = "bird-ending:result:v1";

type DraftRecord = {
  currentIndex: number;
  answers: AnswerMap;
  updatedAt: string;
};

type View = "home" | "quiz" | "result";

type StoredResult = CalculatedResult & {
  isPreview?: boolean;
};

type AppState = {
  view: View;
  currentIndex: number;
  answers: AnswerMap;
  result: StoredResult | null;
};

export default function BirdTest() {
  const [state, setState] = useState<AppState>({
    view: "home",
    currentIndex: 0,
    answers: {},
    result: null,
  });
  const [isReady, setIsReady] = useState(false);
  const [statusOverride, setStatusOverride] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedResult = readStorage<StoredResult>(RESULT_KEY);

      if (isStoredResult(storedResult)) {
        setState({
          view: "result",
          currentIndex: 0,
          answers: {},
          result: storedResult,
        });
        setIsReady(true);
        return;
      }

      const draft = readStorage<DraftRecord>(DRAFT_KEY);

      if (isDraftRecord(draft)) {
        setState({
          view: "quiz",
          currentIndex: clampIndex(draft.currentIndex),
          answers: draft.answers,
          result: null,
        });
      }

      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (statusOverride) {
      const timer = window.setTimeout(() => setStatusOverride(null), 1600);
      return () => window.clearTimeout(timer);
    }
  }, [statusOverride]);

  const hasDraft = isReady && Boolean(readStorage<DraftRecord>(DRAFT_KEY));
  const answeredCount = useMemo(
    () => QUESTIONS.filter((question) => state.answers[question.id]).length,
    [state.answers],
  );

  function startNewTest() {
    clearStorage();
    const nextState = {
      view: "quiz" as const,
      currentIndex: 0,
      answers: {},
      result: null,
    };

    writeDraft(nextState.currentIndex, nextState.answers);
    setState(nextState);
  }

  function resumeDraft() {
    const draft = readStorage<DraftRecord>(DRAFT_KEY);

    if (!isDraftRecord(draft)) {
      startNewTest();
      return;
    }

    setState({
      view: "quiz",
      currentIndex: clampIndex(draft.currentIndex),
      answers: draft.answers,
      result: null,
    });
  }

  function selectOption(label: OptionLabel) {
    const question = QUESTIONS[state.currentIndex];
    const answers = { ...state.answers, [question.id]: label };

    writeDraft(state.currentIndex, answers);
    setStatusOverride("草稿已保存");
    setState((current) => ({ ...current, answers }));
  }

  function goBack() {
    const currentIndex = clampIndex(state.currentIndex - 1);

    writeDraft(currentIndex, state.answers);
    setState((current) => ({ ...current, currentIndex }));
  }

  function goNext() {
    const question = QUESTIONS[state.currentIndex];

    if (!state.answers[question.id]) {
      return;
    }

    const currentIndex = clampIndex(state.currentIndex + 1);

    writeDraft(currentIndex, state.answers);
    setState((current) => ({ ...current, currentIndex }));
  }

  function submitResult() {
    if (!allAnswered(state.answers)) {
      setStatusOverride("还有题目未选择");
      return;
    }

    const result = calculateResult(state.answers);
    writeStorage(RESULT_KEY, result);
    removeStorage(DRAFT_KEY);
    setState({
      view: "result",
      currentIndex: 0,
      answers: {},
      result,
    });
  }

  function restart() {
    clearStorage();
    setState({
      view: "home",
      currentIndex: 0,
      answers: {},
      result: null,
    });
  }

  async function shareResult() {
    const result = state.result;

    if (!result) {
      return;
    }

    const text = `我的鸟类转生结局是：${result.result}。你也来测测会转生成哪一种鸟。`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "鸟类转生测试", text });
        setStatusOverride("已打开分享");
        return;
      }

      await navigator.clipboard.writeText(text);
      setStatusOverride("结果已复制");
    } catch {
      setStatusOverride("分享已取消");
    }
  }

  function markImageError(src: string) {
    setImageErrors((current) => {
      const next = new Set(current);
      next.add(src);
      return next;
    });
  }

  return (
    <div className={styles.appFrame}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <div className={styles.brandMark} aria-hidden="true">
              <span />
            </div>
            <div>
              <p className={styles.brandCode}>bird-ending</p>
              <p className={styles.brandName}>鸟类转生测试</p>
            </div>
          </div>
        </div>
      </header>

      {statusOverride && (
        <div className={styles.toast} role="status" aria-live="polite">
          <span aria-hidden="true" />
          {statusOverride}
        </div>
      )}

      <main className={styles.main}>
        {!isReady && <LoadingView />}
        {isReady && state.view === "home" && (
          <HomeView
            hasDraft={hasDraft}
            onResume={resumeDraft}
            onStart={startNewTest}
          />
        )}
        {isReady && state.view === "quiz" && (
          <QuizView
            answeredCount={answeredCount}
            answers={state.answers}
            currentIndex={state.currentIndex}
            onBack={goBack}
            onNext={goNext}
            onSelect={selectOption}
            onSubmit={submitResult}
          />
        )}
        {isReady && state.view === "result" && state.result && (
          <ResultView
            imageErrors={imageErrors}
            onImageError={markImageError}
            onRestart={restart}
            onShare={shareResult}
            result={state.result}
          />
        )}
      </main>
    </div>
  );
}

function LoadingView() {
  return (
    <section className={styles.loadingPanel} aria-live="polite">
      读取本地进度中
    </section>
  );
}

function HomeView({
  hasDraft,
  onResume,
  onStart,
}: {
  hasDraft: boolean;
  onResume: () => void;
  onStart: () => void;
}) {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>12 题 / 6 维度 / 18 + 1 结局</p>
          <h1>你会转生成哪一种鸟？</h1>
          <p>
            在稳定、远方、表达、边界、秩序和意义之间，找出你的鸟类结局。
          </p>
          <div className={styles.actionRow}>
            <button className={styles.primaryButton} onClick={onStart} type="button">
              <span aria-hidden="true">▶</span>
              开始测试
            </button>
            {hasDraft && (
              <button
                className={styles.secondaryButton}
                onClick={onResume}
                type="button"
              >
                <span aria-hidden="true">↗</span>
                继续上次
              </button>
            )}
          </div>
        </div>

        <div className={styles.specimenPanel} aria-label="测试概览">
          <BirdMark />
          <div className={styles.metricsGrid}>
            <Metric value="18" label="常规结局" />
            <Metric value="1" label="隐藏彩蛋" />
            <Metric value="6" label="隐藏维度" />
          </div>
        </div>
      </section>
    </>
  );
}

function QuizView({
  answeredCount,
  answers,
  currentIndex,
  onBack,
  onNext,
  onSelect,
  onSubmit,
}: {
  answeredCount: number;
  answers: AnswerMap;
  currentIndex: number;
  onBack: () => void;
  onNext: () => void;
  onSelect: (label: OptionLabel) => void;
  onSubmit: () => void;
}) {
  const question = QUESTIONS[currentIndex];
  const selected = answers[question.id];
  const isLast = currentIndex === QUESTIONS.length - 1;
  const canContinue = Boolean(selected);
  const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;

  return (
    <section className={styles.quizShell}>
      <div className={styles.quizTopline}>
        <p>
          {question.id} / Q{QUESTIONS.length}
        </p>
        <p>已选 {answeredCount}/{QUESTIONS.length}</p>
      </div>
      <div className={styles.progressTrack} aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <section className={styles.questionPanel}>
        <div className={styles.questionHeader}>
          <span aria-hidden="true">{currentIndex + 1}</span>
          <h1>{question.prompt}</h1>
        </div>

        <fieldset className={styles.options} aria-label={question.prompt}>
          <legend className={styles.srOnly}>{question.prompt}</legend>
          {question.options.map((option) => {
            const inputId = `${question.id}-${option.label}`;

            return (
              <label className={styles.optionCard} htmlFor={inputId} key={option.label}>
                <input
                  checked={selected === option.label}
                  id={inputId}
                  name={question.id}
                  onChange={() => onSelect(option.label)}
                  type="radio"
                  value={option.label}
                />
                <span aria-hidden="true">{option.label}</span>
                <strong>{option.text}</strong>
              </label>
            );
          })}
        </fieldset>
      </section>

      <nav className={styles.quizNav} aria-label="答题导航">
        <button
          className={styles.secondaryButton}
          disabled={currentIndex === 0}
          onClick={onBack}
          type="button"
        >
          <span aria-hidden="true">←</span>
          上一题
        </button>
        <button
          className={styles.primaryButton}
          disabled={!canContinue}
          onClick={isLast ? onSubmit : onNext}
          type="button"
        >
          {isLast ? "查看结果" : "下一题"}
          <span aria-hidden="true">{isLast ? "↗" : "→"}</span>
        </button>
      </nav>
    </section>
  );
}

function ResultView({
  imageErrors,
  onImageError,
  onRestart,
  onShare,
  result,
}: {
  imageErrors: ReadonlySet<string>;
  onImageError: (src: string) => void;
  onRestart: () => void;
  onShare: () => void;
  result: StoredResult;
}) {
  const copy = BIRD_RESULTS[result.result];
  const clarityLabel = result.isEasterEgg ? "彩蛋" : getClarityLabel(result.clarity);
  const secondShadow = result.isEasterEgg
    ? null
    : `你身上还藏着「${result.secondRegularResult}」的影子。`;

  return (
    <section className={styles.resultShell}>
      <aside className={styles.resultMedia}>
        <BirdImage
          alt={`${result.result} 结局示意图`}
          className={styles.resultImage}
          imageErrors={imageErrors}
          onImageError={onImageError}
          priority
          src={copy.imageSrc}
        />
        <div className={styles.resultMetrics}>
          <Metric value={clarityLabel} label="清晰度" />
          <Metric value={result.isEasterEgg ? "是" : "否"} label="彩蛋" />
          <Metric value={formatDistance(result.bestDistance)} label="最近距离" />
          <Metric value={formatDistance(result.distanceGap)} label="距离差" />
        </div>
      </aside>

      <article className={styles.resultCard}>
        <p className={styles.resultTag}>{copy.tag}</p>
        <p className={styles.resultClarity}>
          {result.isEasterEgg ? "你触发了隐藏结局" : getClarityMessage(result)}
        </p>
        <h1>{result.result}</h1>
        <p className={styles.resultText}>{copy.text}</p>
        {secondShadow && <p className={styles.shadowNote}>{secondShadow}</p>}

        <div className={styles.actionRow}>
          <button className={styles.primaryButton} onClick={onShare} type="button">
            <span aria-hidden="true">↗</span>
            分享结果
          </button>
          <button className={styles.secondaryButton} onClick={onRestart} type="button">
            <span aria-hidden="true">↺</span>
            重新开始
          </button>
        </div>

        {!result.isEasterEgg && (
          <details className={styles.profilePanel}>
            <summary>维度画像</summary>
            <div className={styles.dimensionGrid}>
              {DIMENSIONS.map((dimension) => (
                <DimensionBar
                  key={dimension}
                  label={DIMENSION_LABELS[dimension]}
                  normalized={result.normalizedScores[dimension]}
                  raw={result.rawScores[dimension]}
                  summary={DIMENSION_DESCRIPTIONS[dimension]}
                />
              ))}
            </div>
          </details>
        )}
      </article>
    </section>
  );
}

function BirdImage({
  alt,
  className,
  imageErrors,
  onImageError,
  priority = false,
  src,
}: {
  alt: string;
  className: string;
  imageErrors: ReadonlySet<string>;
  onImageError: (src: string) => void;
  priority?: boolean;
  src?: string;
}) {
  if (!src || imageErrors.has(src)) {
    return (
      <div className={`${styles.imageFallback} ${className}`} role="img" aria-label={alt}>
        <BirdMark />
      </div>
    );
  }

  return (
    <div className={className}>
      <Image
        alt={alt}
        fill
        onError={() => onImageError(src)}
        priority={priority}
        sizes="(max-width: 760px) 100vw, (max-width: 1100px) 45vw, 360px"
        src={src}
      />
    </div>
  );
}

function BirdMark() {
  return (
    <div className={styles.birdMark} aria-hidden="true">
      <span className={styles.tail} />
      <span className={styles.wing} />
      <span className={styles.eye} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metric}>
      <p>{value}</p>
      <span>{label}</span>
    </div>
  );
}

function DimensionBar({
  label,
  normalized,
  raw,
  summary,
}: {
  label: string;
  normalized: number;
  raw: number;
  summary: string;
}) {
  const percent = ((normalized + 2) / 4) * 100;

  return (
    <div className={styles.dimensionBar}>
      <div>
        <strong>{label}</strong>
        <span>
          raw {raw} / norm {normalized}
        </span>
      </div>
      <div className={styles.dimensionTrack} aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      <p>{summary}</p>
    </div>
  );
}

function getClarityLabel(clarity: Clarity) {
  if (clarity === "high") {
    return "高";
  }

  if (clarity === "medium") {
    return "中";
  }

  return "低";
}

function getClarityMessage(result: CalculatedResult) {
  if (result.clarity === "high") {
    return `你的结果非常明确：你转生成了${result.result}`;
  }

  if (result.clarity === "medium") {
    return `你的结果偏向${result.result}，但也带有一些其他鸟类的影子`;
  }

  return `你的特质跨在几种鸟之间，但最终你转生成了${result.result}`;
}

function formatDistance(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "-";
}

function writeDraft(currentIndex: number, answers: AnswerMap) {
  writeStorage<DraftRecord>(DRAFT_KEY, {
    currentIndex,
    answers,
    updatedAt: new Date().toISOString(),
  });
}

function readStorage<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
}

function clearStorage() {
  removeStorage(DRAFT_KEY);
  removeStorage(RESULT_KEY);
}

function clampIndex(index: number) {
  return Math.max(0, Math.min(QUESTIONS.length - 1, index));
}

function isDraftRecord(value: DraftRecord | null): value is DraftRecord {
  return Boolean(
    value &&
      Number.isInteger(value.currentIndex) &&
      value.answers &&
      typeof value.answers === "object",
  );
}

function isStoredResult(value: StoredResult | null): value is StoredResult {
  return Boolean(
    value &&
      typeof value.result === "string" &&
      typeof value.isEasterEgg === "boolean" &&
      value.rawScores &&
      value.normalizedScores,
  );
}
