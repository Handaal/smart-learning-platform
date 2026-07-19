import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { writeFile } from 'fs/promises';
import path from 'path';
import { prisma } from '../../lib/prisma';
import { uploadsDir, ensureUploadsDir } from '../../lib/uploads';
import type { AffectState } from '@prisma/client';
import { sanitizeQuizForLearner } from '../quiz/quiz.controller';
import {
  deleteEpisodeGraph,
  deleteModuleGraph,
  ensureEpisodeBootstrap,
  getApprovedOutlineTaskContext,
  generateLessonId,
  generateUnitId,
  toStoredLessonType,
  type OutlineLesson,
  type OutlineUnit,
} from '../../services/researchCourseOutline';

function isResearchAdmin(req: Request) {
  return req.user?.role === 'research_admin';
}

function parseObjectives(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|;/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function parsePublishStatus(value: unknown) {
  return value === 'draft' ? 'draft' : 'published';
}

function parseExpectedAffect(value: unknown): AffectState | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const normalized = String(value).trim();
  const allowed: AffectState[] = [
    'confusion',
    'frustration',
    'boredom_disengagement',
    'high_engagement',
    'test_anxiety',
    'neutral',
    'no_face_low_confidence',
  ];

  return allowed.includes(normalized as AffectState) ? (normalized as AffectState) : null;
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

// Optional free-text lesson field: undefined = leave unchanged, '' → null, else trimmed string.
function parseOptionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function parseOutlineUnits(value: unknown): OutlineUnit[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((unit) => {
      const rawUnit = unit as Record<string, unknown>;
      const lessons = Array.isArray(rawUnit.lessons)
        ? rawUnit.lessons
            .map((lesson) => {
              const rawLesson = lesson as Record<string, unknown>;
              const lessonType = asString(rawLesson.lessonType) as OutlineLesson['lessonType'];
              return {
                title: asString(rawLesson.title),
                objective: asString(rawLesson.objective),
                durationMin: Number(rawLesson.durationMin ?? 10) || 10,
                lessonType:
                  lessonType === 'introduction' ||
                  lessonType === 'core_lesson' ||
                  lessonType === 'interactive_activity' ||
                  lessonType === 'case_scenario' ||
                  lessonType === 'assessment_checkpoint' ||
                  lessonType === 'summary_closure'
                    ? lessonType
                    : 'core_lesson',
              } satisfies OutlineLesson;
            })
            .filter((lesson) => lesson.title)
        : [];

      return {
        title: asString(rawUnit.title),
        shortSummary: asString(rawUnit.shortSummary),
        estimatedDurationMin: Number(rawUnit.estimatedDurationMin ?? 0) || lessons.reduce((sum, lesson) => sum + lesson.durationMin, 0),
        lessons,
      } satisfies OutlineUnit;
    })
    .filter((unit) => unit.title && unit.lessons.length > 0);
}

export async function listModules(req: Request, res: Response, next: NextFunction) {
  try {
    const includeDraft = isResearchAdmin(req);
    const modules = await prisma.module.findMany({
      where: includeDraft ? undefined : { status: 'published' },
      orderBy: { sequenceOrder: 'asc' },
      include: {
        episodes: {
          where: includeDraft ? undefined : { status: 'published' },
          orderBy: { sequenceOrder: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            objectives: true,
            sequenceOrder: true,
            expectedDurationMin: true,
            generalObjective: true,
            teacherGuidance: true,
            emotionalTriggerExpected: true,
            lessonType: true,
            status: true,
            baseScaffold: true,
          },
        },
      },
    });
    res.json({ data: modules });
  } catch (e) { next(e); }
}

export async function getModule(req: Request, res: Response, next: NextFunction) {
  try {
    const includeDraft = isResearchAdmin(req);
    const module = await prisma.module.findUnique({
      where: { id: req.params.moduleId },
      include: {
        episodes: {
          where: includeDraft ? undefined : { status: 'published' },
          orderBy: { sequenceOrder: 'asc' },
        },
        reflectionPrompts: true,
      },
    });
    if (!module) return res.status(404).json({ error: 'Module not found' });
    if (!includeDraft && module.status !== 'published') {
      return res.status(404).json({ error: 'Module not found' });
    }
    res.json({ data: module });
  } catch (e) { next(e); }
}

export async function getEpisode(req: Request, res: Response, next: NextFunction) {
  try {
    const includeDraft = isResearchAdmin(req);
    const episode = await prisma.episode.findUnique({
      where: { id: req.params.episodeId },
      include: {
        learningContents: {
          where: includeDraft ? undefined : { status: 'published' },
          orderBy: { sequenceOrder: 'asc' },
        },
        branchingNodes: {
          include: { outcomes: true },
          orderBy: { nodeKey: 'asc' },
        },
        quizzes: {
          orderBy: { sequenceOrder: 'asc' },
          include: {
            questions: {
              orderBy: { sequenceOrder: 'asc' },
              include: {
                choices: {
                  orderBy: { sequenceOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });
    if (!episode) return res.status(404).json({ error: 'Episode not found' });
    if (!includeDraft && episode.status !== 'published') {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const quizzes = (episode.quizzes ?? [])
      .filter((quiz) => (includeDraft ? true : quiz.isPublished))
      .map((quiz) => (includeDraft ? quiz : sanitizeQuizForLearner(quiz)));

    res.json({
      data: {
        ...episode,
        quizzes,
      },
    });
  } catch (e) { next(e); }
}

export async function getBranchingNode(req: Request, res: Response, next: NextFunction) {
  try {
    const node = await prisma.branchingNode.findUnique({
      where:   { id: req.params.nodeId },
      include: { outcomes: true },
    });
    if (!node) return res.status(404).json({ error: 'Node not found' });
    res.json({ data: node });
  } catch (e) { next(e); }
}

export async function recordDecision(req: Request, res: Response, next: NextFunction) {
  try {
    const { nodeId, outcomeId, sessionId, startedAt } = req.body;

    const outcome = await prisma.branchingOutcome.findUnique({ 
      where: { id: outcomeId },
      include: { node: true }
    });
    if (!outcome) return res.status(404).json({ error: 'Outcome not found' });

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Calculate latency
    const startTime = startedAt ? new Date(startedAt).getTime() : Date.now();
    const responseLatencySec = (Date.now() - startTime) / 1000;

    // Log as adaptive event for research tracking (Decision Node)
    await prisma.adaptiveEvent.create({
      data: {
        sessionId,
        learnerId:       session.learnerId,
        episodeId:       outcome.node.episodeId,
        triggerType:     'branching_decision',
        intervention:    'do_nothing' as any,
        affectStatePre:  'no_face_low_confidence' as any, // Canonical v2 value; cast kept until Prisma client is regenerated.
        learnerResponse: outcome.optionLabel,
        responseLatencySec,
        behaviorSnapshot: {
          nodeId,
          outcomeId,
          isOptimal: outcome.isOptimal,
          stakeholderEffects: outcome.stakeholderEffects,
        } as any,
      },
    });

    res.status(201).json({
      data: {
        nodeId, outcomeId, sessionId,
        outcomeText:        outcome.outcomeText,
        stakeholderEffects: outcome.stakeholderEffects,
        nextNodeKey:        outcome.nextNodeKey,
        isOptimal:          outcome.isOptimal,
        latencySec:         responseLatencySec,
      },
    });
  } catch (e) { next(e); }
}


export async function getScenarioProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const progress = await prisma.moduleProgress.findMany({
      where:   { learnerId: req.params.learnerId },
      orderBy: { moduleId: 'asc' },
      include: { module: { select: { title: true, sequenceOrder: true, primaryCompetency: true } } },
    });
    res.json({ data: progress });
  } catch (e) { next(e); }
}

export async function uploadContentFile(req: Request, res: Response, next: NextFunction) {
  try {
    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return res.status(400).json({ error: 'No PDF file was received.' });
    }
    // Basic magic-number check so only real PDFs land on disk.
    if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return res.status(400).json({ error: 'The uploaded file is not a valid PDF.' });
    }

    ensureUploadsDir();
    const fileName = `${randomUUID()}.pdf`;
    await writeFile(path.join(uploadsDir, fileName), buffer);

    res.status(201).json({ data: { url: `/uploads/${fileName}`, fileName } });
  } catch (e) { next(e); }
}

export async function uploadContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { episodeId, contentType, adaptiveTag, scaffoldLevel, isEnrichment, contentData, status } = req.body;

    if (!episodeId || !contentType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const lastContent = await prisma.learningContent.findFirst({
      where: { episodeId },
      orderBy: { sequenceOrder: 'desc' },
      select: { sequenceOrder: true },
    });

    const content = await prisma.learningContent.create({
      data: {
        episodeId,
        contentType,
        adaptiveTag: adaptiveTag === 'baseline' ? null : adaptiveTag,
        scaffoldLevel: parseInt(scaffoldLevel) || 3,
        isEnrichment: !!isEnrichment,
        sequenceOrder: (lastContent?.sequenceOrder ?? 0) + 1,
        contentData: contentData || {},
        status: parsePublishStatus(status ?? 'draft'),
      },
    });

    res.status(201).json({ data: content });
  } catch (e) { next(e); }
}

export async function updateContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { contentType, adaptiveTag, scaffoldLevel, isEnrichment, contentData, sequenceOrder, status } = req.body;

    const content = await prisma.learningContent.update({
      where: { id: req.params.contentId },
      data: {
        contentType,
        adaptiveTag: adaptiveTag === 'baseline' ? null : adaptiveTag,
        scaffoldLevel: scaffoldLevel ? parseInt(scaffoldLevel, 10) : undefined,
        isEnrichment: typeof isEnrichment === 'boolean' ? isEnrichment : undefined,
        sequenceOrder,
        contentData: contentData ?? undefined,
        status: status ? parsePublishStatus(status) : undefined,
      },
    });

    res.json({ data: content });
  } catch (e) { next(e); }
}

export async function deleteContent(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.learningContent.delete({
      where: { id: req.params.contentId },
    });

    res.status(204).end();
  } catch (e) { next(e); }
}

export async function reorderContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { items } = req.body as { items: { id: string; sequenceOrder: number }[] };

    await prisma.$transaction(
      items.map((item) =>
        prisma.learningContent.update({
          where: { id: item.id },
          data: { sequenceOrder: item.sequenceOrder },
        }),
      ),
    );

    res.json({ status: 'ok' });
  } catch (e) { next(e); }
}

// ── CRUD for Modules ──────────────────────────────────────────

export async function createModule(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      id,
      title,
      description,
      objectives,
      primaryCompetency,
      secondaryCompetency,
      estimatedDurationMin,
      sequenceOrder,
      status,
    } = req.body;
    const module = await prisma.module.create({
      data: {
        id,
        title,
        description,
        objectives: parseObjectives(objectives),
        primaryCompetency,
        secondaryCompetency,
        estimatedDurationMin,
        sequenceOrder: sequenceOrder || 0,
        status: parsePublishStatus(status ?? 'draft'),
      },
    });
    res.status(201).json({ data: module });
  } catch (e) { next(e); }
}

export async function updateModule(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      title,
      description,
      objectives,
      primaryCompetency,
      secondaryCompetency,
      estimatedDurationMin,
      sequenceOrder,
      status,
    } = req.body;
    const module = await prisma.module.update({
      where: { id: req.params.moduleId },
      data: {
        title,
        description,
        objectives: objectives !== undefined ? parseObjectives(objectives) : undefined,
        primaryCompetency,
        secondaryCompetency,
        estimatedDurationMin,
        sequenceOrder,
        status: status ? parsePublishStatus(status) : undefined,
      },
    });
    res.json({ data: module });
  } catch (e) { next(e); }
}

export async function deleteModule(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.$transaction(async (tx) => {
      await deleteModuleGraph(tx, req.params.moduleId);
    });
    res.status(204).end();
  } catch (e) { next(e); }
}

// ── CRUD for Episodes (Lessons) ────────────────────────────────

export async function createEpisode(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      id,
      moduleId,
      title,
      description,
      objectives,
      sequenceOrder,
      baseScaffold,
      expectedDurationMin,
      generalObjective,
      teacherGuidance,
      emotionalTriggerExpected,
      lessonType,
      status,
    } = req.body;
    const parsedStatus = parsePublishStatus(status ?? 'draft');
    const parsedObjectives = parseObjectives(objectives);
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { title: true },
    });
    const episode = await prisma.$transaction(async (tx) => {
      const created = await tx.episode.create({
        data: {
          id,
          moduleId,
          title,
          description,
          objectives: parsedObjectives,
          sequenceOrder: sequenceOrder || 0,
          baseScaffold,
          expectedDurationMin,
          generalObjective: parseOptionalText(generalObjective) ?? null,
          teacherGuidance: parseOptionalText(teacherGuidance) ?? null,
          emotionalTriggerExpected: parseExpectedAffect(emotionalTriggerExpected),
          lessonType: typeof lessonType === 'string' && lessonType.trim() ? lessonType.trim() : 'guided',
          status: parsedStatus,
        },
      });

      await ensureEpisodeBootstrap(tx, {
        moduleId,
        unitTitle: module?.title ?? '',
        episodeId: created.id,
        status: parsedStatus,
        lesson: {
          title,
          objective: parsedObjectives[0] ?? description ?? '',
          durationMin: expectedDurationMin ?? 10,
          lessonType:
            created.lessonType === 'interactive'
              ? 'interactive_activity'
              : created.lessonType === 'scenario'
                ? 'case_scenario'
                : created.lessonType === 'assessment'
                  ? 'assessment_checkpoint'
                  : created.lessonType === 'reflection'
                    ? 'summary_closure'
                    : 'core_lesson',
        },
      });

      return created;
    });

    res.status(201).json({ data: episode });
  } catch (e) { next(e); }
}

export async function updateEpisode(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      title,
      description,
      objectives,
      sequenceOrder,
      baseScaffold,
      expectedDurationMin,
      generalObjective,
      teacherGuidance,
      emotionalTriggerExpected,
      lessonType,
      status,
    } = req.body;
    const module = await prisma.episode.findUnique({
      where: { id: req.params.episodeId },
      include: {
        module: {
          select: { id: true, title: true },
        },
      },
    });
    const parsedObjectives = objectives !== undefined ? parseObjectives(objectives) : undefined;
    const parsedStatus = status ? parsePublishStatus(status) : undefined;

    const episode = await prisma.$transaction(async (tx) => {
      const updated = await tx.episode.update({
        where: { id: req.params.episodeId },
        data: {
          title,
          description,
          objectives: parsedObjectives,
          sequenceOrder,
          baseScaffold,
          expectedDurationMin,
          generalObjective: parseOptionalText(generalObjective),
          teacherGuidance: parseOptionalText(teacherGuidance),
          emotionalTriggerExpected: parseExpectedAffect(emotionalTriggerExpected),
          lessonType: lessonType ? String(lessonType).trim() : undefined,
          status: parsedStatus,
        },
      });

      if (module?.module) {
        await ensureEpisodeBootstrap(tx, {
          moduleId: module.module.id,
          unitTitle: module.module.title,
          episodeId: updated.id,
          status: updated.status,
          lesson: {
            title: updated.title,
            objective: updated.objectives[0] ?? updated.description ?? '',
            durationMin: updated.expectedDurationMin ?? 10,
            lessonType:
              updated.lessonType === 'interactive'
                ? 'interactive_activity'
                : updated.lessonType === 'scenario'
                  ? 'case_scenario'
                  : updated.lessonType === 'assessment'
                    ? 'assessment_checkpoint'
                    : updated.lessonType === 'reflection'
                      ? 'summary_closure'
                      : 'core_lesson',
          },
        });
      }

      return updated;
    });
    res.json({ data: episode });
  } catch (e) { next(e); }
}

export async function deleteEpisode(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.$transaction(async (tx) => {
      await deleteEpisodeGraph(tx, req.params.episodeId);
    });
    res.status(204).end();
  } catch (e) { next(e); }
}

export async function applyResearchOutline(req: Request, res: Response, next: NextFunction) {
  try {
    const units = parseOutlineUnits(req.body.units);
    const publicationStatus = parsePublishStatus(req.body.publicationStatus ?? 'published');

    if (!units.length) {
      return res.status(400).json({ error: 'The proposed outline is empty.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingModules = await tx.module.findMany({
        orderBy: { sequenceOrder: 'asc' },
        select: { id: true },
      });

      for (const module of existingModules) {
        await deleteModuleGraph(tx, module.id);
      }

      const createdModules: Array<{ id: string; title: string; lessonCount: number }> = [];

      for (const [unitIndex, unit] of units.entries()) {
        const moduleId = generateUnitId(unitIndex + 1);
        await tx.module.create({
          data: {
            id: moduleId,
            title: unit.title,
            description: unit.shortSummary,
            objectives: [],
            estimatedDurationMin: unit.estimatedDurationMin,
            sessionCount: Math.max(unit.lessons.length, 1),
            sequenceOrder: unitIndex + 1,
            isAssessable: true,
            status: publicationStatus,
          },
        });

        for (const [lessonIndex, lesson] of unit.lessons.entries()) {
          const episodeId = generateLessonId(moduleId, lessonIndex + 1);
          const lessonWithContext: OutlineLesson = {
            ...lesson,
            taskContextKey: getApprovedOutlineTaskContext(unitIndex + 1, lessonIndex + 1) ?? lesson.taskContextKey,
          };
          await tx.episode.create({
            data: {
              id: episodeId,
              moduleId,
              title: lessonWithContext.title,
              description: lessonWithContext.objective,
              objectives: lessonWithContext.objective ? [lessonWithContext.objective] : [],
              sequenceOrder: lessonIndex + 1,
              baseScaffold: lessonWithContext.lessonType === 'assessment_checkpoint' ? 2 : 3,
              expectedDurationMin: lessonWithContext.durationMin,
              lessonType: toStoredLessonType(lessonWithContext.lessonType),
              status: publicationStatus,
            },
          });

          await ensureEpisodeBootstrap(tx, {
            moduleId,
            unitTitle: unit.title,
            episodeId,
            lesson: lessonWithContext,
            status: publicationStatus,
          });
        }

        createdModules.push({
          id: moduleId,
          title: unit.title,
          lessonCount: unit.lessons.length,
        });
      }

      return createdModules;
    });

    res.status(201).json({
      data: {
        modules: result,
        status: publicationStatus,
      },
    });
  } catch (e) { next(e); }
}

// ── Bulk Reordering ───────────────────────────────────────────

export async function reorderHierarchy(req: Request, res: Response, next: NextFunction) {
  try {
    const { items } = req.body as { items: { type: 'module' | 'episode', id: string, sequenceOrder: number }[] };
    
    // Batch updates using Prisma transactions
    const updates = items.map(item => {
      if (item.type === 'module') {
        return prisma.module.update({
          where: { id: item.id },
          data: { sequenceOrder: item.sequenceOrder },
        });
      } else {
        return prisma.episode.update({
          where: { id: item.id },
          data: { sequenceOrder: item.sequenceOrder },
        });
      }
    });

    await prisma.$transaction(updates);
    res.json({ status: 'ok' });
  } catch (e) { next(e); }
}
