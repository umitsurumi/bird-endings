import {
  BIRD_RESULTS,
  DIMENSIONS,
  FALLBACK_PRIORITY,
  QUESTIONS,
  RANGES,
  REGULAR_BIRD_NAMES,
  WEIGHTS,
  type BirdName,
  type Dimension,
  type DimensionScores,
  type OptionLabel,
  type RegularBirdName,
  type Scores,
} from "./bird-data";

export type AnswerMap = Partial<Record<string, OptionLabel>>;
export type Clarity = "high" | "medium" | "low";
export type ResultKind = "regular" | "pigeon" | "myna" | "kfc";

export type RankedBird = {
  bird: RegularBirdName;
  distance: number;
  uniqueness: number;
  priority: number;
};

export type CalculatedResult = {
  result: BirdName;
  resultKind: ResultKind;
  isEasterEgg: boolean;
  bestRegularResult?: RegularBirdName;
  secondRegularResult?: RegularBirdName;
  bestDistance?: number;
  secondDistance?: number;
  distanceGap?: number;
  clarity?: Clarity;
  rawScores: Scores;
  normalizedScores: DimensionScores;
  answers: AnswerMap;
  submittedAt: string;
  kfcChecked: boolean;
  kfcTriggered: boolean;
};

const KFC_TRIGGER_RATE = 0.05;
const BEIJING_TIME_ZONE = "Asia/Shanghai";
const MYNA_TRIGGER_RUN_LENGTH = 8;

const EMPTY_SCORES: Scores = {
  S: 0,
  M: 0,
  E: 0,
  A: 0,
  O: 0,
  X: 0,
  P: 0,
};

const FALLBACK_INDEX = new Map(
  FALLBACK_PRIORITY.map((bird, index) => [bird, index] as const),
);

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeScore(dim: Dimension, raw: number) {
  const range = RANGES[dim];
  const normalized = Math.round(
    ((raw - range.min) / (range.max - range.min)) * 4 - 2,
  );

  return clamp(normalized, -2, 2);
}

export function normalizeScores(rawScores: Scores): DimensionScores {
  return Object.fromEntries(
    DIMENSIONS.map((dim) => [dim, normalizeScore(dim, rawScores[dim])]),
  ) as DimensionScores;
}

export function weightedDistance(
  left: DimensionScores,
  right: DimensionScores,
) {
  return DIMENSIONS.reduce((distance, dim) => {
    return distance + WEIGHTS[dim] * Math.abs(left[dim] - right[dim]);
  }, 0);
}

export function calculateUniqueness(bird: RegularBirdName) {
  const target = BIRD_RESULTS[bird].profile;

  if (!target) {
    return 0;
  }

  const distances = REGULAR_BIRD_NAMES.filter((name) => name !== bird).map(
    (name) => {
      const profile = BIRD_RESULTS[name].profile;
      return profile ? weightedDistance(target, profile) : 0;
    },
  );

  return distances.reduce((sum, value) => sum + value, 0) / distances.length;
}

export function calculateRawScores(answers: AnswerMap): Scores {
  const scores = { ...EMPTY_SCORES };

  QUESTIONS.forEach((question) => {
    const selected = answers[question.id];
    const option = question.options.find((item) => item.label === selected);

    if (!option) {
      return;
    }

    Object.entries(option.score).forEach(([dimension, value]) => {
      scores[dimension as keyof Scores] += value ?? 0;
    });
  });

  return scores;
}

export function rankBirds(userProfile: DimensionScores): RankedBird[] {
  return REGULAR_BIRD_NAMES.map((bird) => {
    const profile = BIRD_RESULTS[bird].profile;

    return {
      bird,
      distance: profile ? weightedDistance(userProfile, profile) : Infinity,
      uniqueness: calculateUniqueness(bird),
      priority: FALLBACK_INDEX.get(bird) ?? Number.MAX_SAFE_INTEGER,
    };
  }).sort(compareRankedBirds);
}

export function getClarity(bestDistance: number, distanceGap: number): Clarity {
  if (distanceGap >= 1.5 && bestDistance < 6) {
    return "high";
  }

  if (distanceGap > 1 && bestDistance < 6) {
    return "medium";
  }

  return "low";
}

export function isLowClarity(bestDistance: number, distanceGap: number) {
  return distanceGap <= 1 || bestDistance >= 6;
}

export function calculateResult(
  answers: AnswerMap,
  submittedAt = new Date().toISOString(),
  randomValue = Math.random(),
): CalculatedResult {
  const rawScores = calculateRawScores(answers);
  const normalizedScores = normalizeScores(rawScores);
  const kfcTriggered = shouldTriggerKfc(submittedAt, randomValue);
  const mynaTriggered = hasSameOptionRun(answers);

  if (kfcTriggered) {
    return {
      result: "KFC",
      resultKind: "kfc",
      isEasterEgg: true,
      rawScores,
      normalizedScores,
      answers,
      submittedAt,
      kfcChecked: true,
      kfcTriggered: true,
    };
  }

  if (mynaTriggered) {
    return {
      result: "鹩哥",
      resultKind: "myna",
      isEasterEgg: true,
      rawScores,
      normalizedScores,
      answers,
      submittedAt,
      kfcChecked: true,
      kfcTriggered: false,
    };
  }

  const ranked = rankBirds(normalizedScores);
  const best = ranked[0];
  const second = ranked[1];
  const distanceGap = second.distance - best.distance;
  const clarity = getClarity(best.distance, distanceGap);
  const isEasterEgg = rawScores.P === 4;

  return {
    result: isEasterEgg ? "鸽子" : best.bird,
    resultKind: isEasterEgg ? "pigeon" : "regular",
    isEasterEgg,
    bestRegularResult: best.bird,
    secondRegularResult: second.bird,
    bestDistance: best.distance,
    secondDistance: second.distance,
    distanceGap,
    clarity,
    rawScores,
    normalizedScores,
    answers,
    submittedAt,
    kfcChecked: true,
    kfcTriggered: false,
  };
}

export function shouldTriggerKfc(
  submittedAt: string,
  randomValue = Math.random(),
) {
  return isBeijingThursday(submittedAt) && randomValue < KFC_TRIGGER_RATE;
}

export function isBeijingThursday(submittedAt: string) {
  const date = new Date(submittedAt);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: BEIJING_TIME_ZONE,
      weekday: "long",
    }).format(date) === "Thursday"
  );
}

export function allAnswered(answers: AnswerMap) {
  return QUESTIONS.every((question) => Boolean(answers[question.id]));
}

export function hasSameOptionRun(
  answers: AnswerMap,
  runLength = MYNA_TRIGGER_RUN_LENGTH,
) {
  let currentRun = 1;
  let previous: OptionLabel | undefined;

  for (const question of QUESTIONS) {
    const selected = answers[question.id];

    if (!selected) {
      currentRun = 1;
      previous = undefined;
      continue;
    }

    if (selected === previous) {
      currentRun += 1;

      if (currentRun >= runLength) {
        return true;
      }
    } else {
      currentRun = 1;
      previous = selected;
    }
  }

  return false;
}

function compareRankedBirds(left: RankedBird, right: RankedBird) {
  if (Math.abs(left.distance - right.distance) > 0.00001) {
    return left.distance - right.distance;
  }

  if (Math.abs(left.uniqueness - right.uniqueness) > 0.00001) {
    return right.uniqueness - left.uniqueness;
  }

  return left.priority - right.priority;
}
