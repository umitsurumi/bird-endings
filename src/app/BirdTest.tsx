"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import {
  allAnswered,
  calculateResult,
  type AnswerMap,
  type CalculatedResult,
  type Clarity,
  type ResultKind,
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
const SHARE_IMAGE_NAME = "bird-ending-result.png";

type DraftRecord = {
  currentIndex: number;
  answers: AnswerMap;
  updatedAt: string;
};

type View = "home" | "quiz" | "result";

type StoredResult = Omit<
  CalculatedResult,
  "kfcChecked" | "kfcTriggered" | "resultKind"
> & {
  kfcChecked?: boolean;
  kfcTriggered?: boolean;
  isPreview?: boolean;
  resultKind?: ResultKind;
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

    const shareUrl = getShareUrl();
    const title = "鸟类转生测试";
    const text = getShareText(result, shareUrl);

    try {
      setStatusOverride("正在生成分享图");

      const image = await createResultShareImage(result, shareUrl);
      const file = new File([image], SHARE_IMAGE_NAME, { type: "image/png" });

      if (navigator.share && canShareFiles(file)) {
        await navigator.share({ files: [file], title, text, url: shareUrl });
        setStatusOverride("已打开分享");
        return;
      }

      downloadBlob(image, SHARE_IMAGE_NAME);
      await writeClipboardText(text);
      setStatusOverride("分享图已下载，链接已复制");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatusOverride("分享已取消");
        return;
      }

      setStatusOverride("分享图生成失败");
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
          <p className={styles.kicker}>12 题 / 6 维度 / 18 + 2 结局</p>
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
            <Metric value="2" label="隐藏彩蛋" />
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
  const resultKind = getResultKind(result);
  const isRegular = resultKind === "regular";
  const secondShadow =
    isRegular && result.secondRegularResult
      ? `你身上还藏着「${result.secondRegularResult}」的影子。`
      : null;
  const resultMetrics = isRegular
    ? [
        { label: "清晰度", value: result.clarity ? getClarityLabel(result.clarity) : "-" },
        { label: "彩蛋", value: "否" },
        { label: "最近距离", value: formatDistance(result.bestDistance) },
        { label: "距离差", value: formatDistance(result.distanceGap) },
      ]
    : [
        { label: "类型", value: resultKind === "kfc" ? "KFC" : "鸽子" },
        { label: "彩蛋", value: "是" },
      ];

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
          {resultMetrics.map((metric) => (
            <Metric key={metric.label} value={metric.value} label={metric.label} />
          ))}
        </div>
      </aside>

      <article className={styles.resultCard}>
        <p className={styles.resultTag}>{copy.tag}</p>
        <p className={styles.resultClarity}>
          {getResultIntro(result)}
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

        {isRegular && (
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

function getResultKind(result: StoredResult): ResultKind {
  if (result.resultKind) {
    return result.resultKind;
  }

  return result.isEasterEgg ? "pigeon" : "regular";
}

function getResultIntro(result: StoredResult) {
  const resultKind = getResultKind(result);

  if (resultKind === "kfc") {
    return "你触发了疯狂星期四结局";
  }

  if (resultKind === "pigeon") {
    return "你触发了隐藏结局";
  }

  return getClarityMessage(result);
}

function getShareText(result: StoredResult, shareUrl: string) {
  const resultKind = getResultKind(result);

  if (resultKind === "kfc") {
    return `我触发了隐藏结局：疯狂星期四。你也来测测会转生成哪一种鸟：${shareUrl}`;
  }

  if (resultKind === "pigeon") {
    return `我触发了隐藏结局：鸽子。你也来测测会转生成哪一种鸟：${shareUrl}`;
  }

  return `我的鸟类转生结局是：${result.result}。你也来测测会转生成哪一种鸟：${shareUrl}`;
}

function getClarityMessage(result: Pick<StoredResult, "clarity" | "result">) {
  if (result.clarity === "high") {
    return `你的结果非常明确：你转生成了${result.result}`;
  }

  if (result.clarity === "medium") {
    return `你的结果偏向${result.result}，但也带有一些其他鸟类的影子`;
  }

  return `你的特质跨在几种鸟之间，但最终你转生成了${result.result}`;
}

function formatDistance(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(1)
    : "-";
}

function getShareUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  return url.toString();
}

function canShareFiles(file: File) {
  return (
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  );
}

async function createResultShareImage(result: StoredResult, shareUrl: string) {
  const copy = BIRD_RESULTS[result.result];
  const resultKind = getResultKind(result);
  const isRegular = resultKind === "regular";
  const canvas = document.createElement("canvas");
  const width = 1080;
  const height = 1440;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas is not supported.");
  }

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = "#f7f4ec";
  ctx.fillRect(0, 0, width, height);
  drawPosterTexture(ctx, width, height);

  ctx.fillStyle = "#17211f";
  ctx.fillRect(58, 58, 482, 644);

  if (copy.imageSrc) {
    try {
      const birdImage = await loadCanvasImage(copy.imageSrc);
      drawCoverImage(ctx, birdImage, 72, 72, 454, 616);
    } catch {
      drawPosterBirdFallback(ctx, 72, 72, 454, 616);
    }
  } else {
    drawPosterBirdFallback(ctx, 72, 72, 454, 616);
  }

  ctx.fillStyle = "#194c49";
  ctx.font = "900 34px serif";
  ctx.fillText("bird-ending", 602, 118);

  ctx.fillStyle = "#b73743";
  ctx.font = "900 40px sans-serif";
  ctx.fillText(copy.tag, 602, 188);

  ctx.fillStyle = "#17211f";
  ctx.font = "900 112px sans-serif";
  drawWrappedText(ctx, result.result, 602, 296, 360, 122, 2);

  ctx.fillStyle = "rgba(23, 33, 31, 0.68)";
  ctx.font = "700 34px sans-serif";
  drawWrappedText(
    ctx,
    getResultIntro(result),
    602,
    492,
    340,
    52,
    3,
  );

  const secondShadow =
    isRegular && result.secondRegularResult
      ? `你身上还藏着「${result.secondRegularResult}」的影子。`
      : null;

  drawRoundedRect(ctx, 70, 770, 940, 292, 18, "#ffffff");
  ctx.fillStyle = "rgba(23, 33, 31, 0.78)";
  ctx.font = "700 34px sans-serif";
  drawWrappedText(ctx, copy.text, 112, 840, 856, 58, secondShadow ? 3 : 4);

  if (secondShadow) {
    ctx.fillStyle = "#194c49";
    ctx.font = "900 30px sans-serif";
    drawWrappedText(ctx, secondShadow, 112, 1018, 856, 42, 1);
  }

  const qrDataUrl = await QRCode.toDataURL(shareUrl, {
    color: { dark: "#17211f", light: "#ffffff" },
    errorCorrectionLevel: "M",
    margin: 1,
    width: 230,
  });
  const qrImage = await loadCanvasImage(qrDataUrl);

  drawRoundedRect(ctx, 70, 1122, 940, 236, 18, "#ffffff");
  ctx.drawImage(qrImage, 112, 1160, 164, 164);

  ctx.fillStyle = "#17211f";
  ctx.font = "900 42px sans-serif";
  ctx.fillText("扫码测测你的鸟类转生结局", 320, 1194);

  ctx.fillStyle = "rgba(23, 33, 31, 0.62)";
  ctx.font = "700 28px sans-serif";
  drawWrappedText(ctx, shareUrl, 320, 1242, 600, 40, 2);

  return canvasToBlob(canvas);
}

function drawPosterTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.fillStyle = "rgba(215, 192, 90, 0.22)";
  ctx.fillRect(0, 0, width, 18);
  ctx.fillStyle = "rgba(142, 185, 199, 0.18)";
  ctx.fillRect(0, height - 18, width, 18);
  ctx.fillStyle = "rgba(183, 55, 67, 0.12)";
  ctx.fillRect(width - 26, 0, 26, height);
}

function drawPosterBirdFallback(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  ctx.fillStyle = "#d7c05a";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "#194c49";
  ctx.beginPath();
  ctx.ellipse(x + width * 0.48, y + height * 0.55, 160, 96, -0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8eb9c7";
  ctx.beginPath();
  ctx.ellipse(x + width * 0.44, y + height * 0.5, 88, 56, -0.58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#b73743";
  ctx.beginPath();
  ctx.moveTo(x + width * 0.78, y + height * 0.46);
  ctx.lineTo(x + width * 0.94, y + height * 0.52);
  ctx.lineTo(x + width * 0.78, y + height * 0.58);
  ctx.closePath();
  ctx.fill();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  const sourceWidth = sourceRatio > targetRatio ? image.height * targetRatio : image.width;
  const sourceHeight = sourceRatio > targetRatio ? image.height : image.width / targetRatio;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const lines: string[] = [];
  let line = "";

  Array.from(text).forEach((char) => {
    const nextLine = `${line}${char}`;

    if (ctx.measureText(nextLine).width > maxWidth && line) {
      lines.push(line);
      line = char;
      return;
    }

    line = nextLine;
  });

  if (line) {
    lines.push(line);
  }

  lines.slice(0, maxLines).forEach((item, index) => {
    const lineText =
      index === maxLines - 1 && lines.length > maxLines
        ? `${item.slice(0, Math.max(0, item.length - 1))}...`
        : item;
    ctx.fillText(lineText, x, y + index * lineHeight);
  });
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not create image blob."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function writeClipboardText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    return;
  }
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
      Object.hasOwn(BIRD_RESULTS, value.result) &&
      typeof value.isEasterEgg === "boolean" &&
      (!value.resultKind ||
        value.resultKind === "regular" ||
        value.resultKind === "pigeon" ||
        value.resultKind === "kfc") &&
      value.rawScores &&
      value.normalizedScores,
  );
}
