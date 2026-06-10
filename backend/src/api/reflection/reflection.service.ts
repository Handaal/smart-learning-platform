import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

// ── Lightweight NLP helpers (pure JS — no external API call) ──────────────────
// Full BERT/VADER pipeline runs in the Python AI service (ai-services/);
// this module provides synchronous fallback scoring for immediate feedback.

const POSITIVE_WORDS = new Set([
  'understood','clear','confident','improved','realised','recognised','achieved',
  'progress','successful','effective','helpful','useful','better','learned',
]);
const NEGATIVE_WORDS = new Set([
  'confused','frustrated','difficult','struggled','overwhelmed','uncertain',
  'unclear','worried','anxious','lost','failed','unsure','challenging',
]);
const SELF_REG_MARKERS = [
  /next time I (will|would|plan to)/i,
  /I (should|could) have/i,
  /in future/i,
  /I (learned|realised|noticed)/i,
  /to improve/i,
  /I will (try|apply|use|approach)/i,
];
const COMPETENCY_PATTERNS: Record<string, RegExp[]> = {
  'scope management':          [/scope/i, /requirement/i, /brief/i],
  'stakeholder communication': [/stakeholder/i, /communication/i, /email/i, /SME/i],
  'planning':                  [/plan/i, /schedule/i, /timeline/i, /WBS/i, /milestone/i],
  'risk management':           [/risk/i, /mitigation/i, /contingency/i, /quality/i],
  'decision making':           [/decision/i, /choice/i, /option/i, /trade.?off/i],
};

function analyseText(text: string) {
  const words   = text.toLowerCase().split(/\W+/);
  const posCount = words.filter(w => POSITIVE_WORDS.has(w)).length;
  const negCount = words.filter(w => NEGATIVE_WORDS.has(w)).length;
  const total    = Math.max(words.length, 1);

  const valence  = Math.max(-1, Math.min(1, (posCount - negCount) / Math.sqrt(total)));
  const arousal  = Math.min(1, (posCount + negCount) / Math.sqrt(total));

  const selfRegMarkers = SELF_REG_MARKERS
    .filter(r => r.test(text))
    .map(r => r.source.slice(0, 40));

  const competencyConcepts = Object.entries(COMPETENCY_PATTERNS)
    .filter(([, patterns]) => patterns.some(p => p.test(text)))
    .map(([label]) => label);

  // Reflection depth heuristic
  const wordCount = words.length;
  const depth =
    wordCount >= 200 && selfRegMarkers.length >= 2 && competencyConcepts.length >= 2
      ? 'critical'
      : wordCount >= 120 && (selfRegMarkers.length >= 1 || competencyConcepts.length >= 1)
      ? 'analytical'
      : 'surface';

  // Composite reflection score 0–100
  const score = Math.round(
    Math.min(wordCount / 3, 33)                  +  // length (max 33)
    selfRegMarkers.length * 8                    +  // self-regulation (max ~24)
    competencyConcepts.length * 6                +  // concepts (max ~18)
    (depth === 'critical' ? 15 : depth === 'analytical' ? 8 : 0) + // depth
    Math.max(0, valence * 10),                      // positive framing
  );

  return { valence, arousal, depth, selfRegMarkers, competencyConcepts, score: Math.min(score, 100) };
}

// ── Service functions ─────────────────────────────────────────────────────────

interface SubmitInput {
  sessionId:    string;
  promptId:     string;
  responseText: string;
}

async function resolvePromptForSubmission(input: SubmitInput) {
  const directPrompt = await prisma.reflectionPrompt.findUnique({ where: { id: input.promptId } });
  if (directPrompt) return directPrompt;

  const session = await prisma.session.findUnique({
    where: { id: input.sessionId },
    select: {
      moduleId: true,
      episodeId: true,
    },
  });

  if (!session?.moduleId) {
    throw new AppError(404, 'تعذر العثور على جلسة التأمل الحالية.', 'SESSION_NOT_FOUND');
  }

  const moduleRecord = await prisma.module.findUnique({
    where: { id: session.moduleId },
    select: { title: true },
  });

  const modulePrompt = await prisma.reflectionPrompt.findFirst({
    where: { moduleId: session.moduleId },
    orderBy: { sequenceOrder: 'asc' },
  });
  if (modulePrompt) return modulePrompt;

  // Research-safe fallback:
  // when the course outline is replaced, older hard-coded reflection prompt ids
  // may disappear. We create one module-level prompt lazily so the learner path
  // never breaks while keeping prompt ownership tied to the approved module.
  return prisma.reflectionPrompt.create({
    data: {
      id: `RP-${session.moduleId}`,
      moduleId: session.moduleId,
      episodeId: session.episodeId ?? null,
      sequenceOrder: 1,
      minWords: 120,
      maxWords: 250,
      promptText: moduleRecord?.title
        ? `تأمل في أهم فكرة أو قرار تعلمته في وحدة "${moduleRecord.title}"، واشرح كيف ستطبقه في مشروعك التعليمي القادم.`
        : 'تأمل في أهم فكرة أو قرار تعلمته في هذه الوحدة، واشرح كيف ستطبقه في مشروعك التعليمي القادم.',
    },
  });
}

export async function submit(learnerId: string, input: SubmitInput) {
  const prompt = await resolvePromptForSubmission(input);

  const words   = input.responseText.split(/\s+/).filter(Boolean);
  const wc      = words.length;

  if (wc < (prompt.minWords ?? 50))
    throw new AppError(422, `الاستجابة قصيرة جدًا. الحد الأدنى هو ${prompt.minWords} كلمة.`, 'TOO_SHORT');

  const nlp = analyseText(input.responseText);

  // Auto-generate structured feedback
  const feedbackPoints: string[] = [];
  if (nlp.selfRegMarkers.length === 0)
    feedbackPoints.push('أضف خطوة توضح ما الذي ستفعله بشكل مختلف في المرة القادمة.');
  if (nlp.competencyConcepts.length === 0)
    feedbackPoints.push('حاول ربط تأملك بمهارة محددة من مهارات إدارة المشروع.');
  if (nlp.depth === 'surface')
    feedbackPoints.push('بداية التأمل جيدة، لكن من المفيد التعمق أكثر في تفسير السبب.');
  if (nlp.valence < -0.3)
    feedbackPoints.push('التأمل في التحديات مهم، ويمكنك أيضًا الإشارة إلى ما نجحت فيه أثناء الموقف.');

  return prisma.reflectionEntry.create({
    data: {
      sessionId:          input.sessionId,
      learnerId,
      promptId:           prompt.id,
      responseText:       input.responseText,
      wordCount:          wc,
      sentimentValence:   nlp.valence,
      sentimentArousal:   nlp.arousal,
      reflectionDepth:    nlp.depth as any,
      selfRegMarkers:     nlp.selfRegMarkers,
      competencyConcepts: nlp.competencyConcepts,
      reflectionScore:    nlp.score,
      autoFeedback:       { points: feedbackPoints },
      analysisModelVersion: 'rule-v0.1',
    },
  });
}

export async function getBySession(sessionId: string) {
  return prisma.reflectionEntry.findMany({
    where:   { sessionId },
    orderBy: { submittedAt: 'asc' },
    select: {
      id: true, promptId: true, submittedAt: true, wordCount: true,
      reflectionDepth: true, reflectionScore: true, autoFeedback: true,
      sentimentValence: true, competencyConcepts: true,
    },
  });
}

export async function getByLearner(learnerId: string) {
  return prisma.reflectionEntry.findMany({
    where:   { learnerId },
    orderBy: { submittedAt: 'desc' },
    include: { session: { select: { moduleId: true, episodeId: true } } },
  });
}

export async function listAll(opts: { page: number; limit: number }) {
  const skip = (opts.page - 1) * opts.limit;
  const [entries, total] = await Promise.all([
    prisma.reflectionEntry.findMany({
      skip, take: opts.limit,
      orderBy: { submittedAt: 'desc' },
      include: {
        learner:  { select: { participantId: true, cohort: true } },
        session:  { select: { moduleId: true } },
      },
    }),
    prisma.reflectionEntry.count(),
  ]);
  return { data: entries, total, page: opts.page, limit: opts.limit };
}
