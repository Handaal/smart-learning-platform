/**
 * Prisma seed script - populates reference data for development/testing.
 * Run: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding STEP database...');

  const demoVideoUrl = 'https://www.youtube.com/watch?v=FezgthDnTsI';
  const demoPdfSourceUrl =
    'https://drive.google.com/file/d/1Q8POMJCJlqSAyKSatJAnoRapzlxJ3kbA/view?usp=sharing';
  const demoPdfPreviewUrl = 'https://drive.google.com/file/d/1Q8POMJCJlqSAyKSatJAnoRapzlxJ3kbA/preview';
  const demoImageSourceUrl =
    'https://drive.google.com/file/d/14eKKp9i3vw8E_wWXRYm_73rSeeOpLE8-/view?usp=sharing';
  const demoImageRenderUrl = 'https://drive.google.com/uc?export=view&id=14eKKp9i3vw8E_wWXRYm_73rSeeOpLE8-';
  const courseKey = 'step-adaptive-training';

  await prisma.learningContent.updateMany({ data: { status: 'draft' } });
  await prisma.quiz.updateMany({ data: { isPublished: false } });
  await prisma.episode.updateMany({ data: { status: 'draft' } });
  await prisma.module.updateMany({ data: { status: 'draft' } });
  console.log('  Archived any previously active learner-facing modules, lessons, content, and quizzes.');

  const module = {
    id: 'M1',
    sequenceOrder: 1,
    title: 'Adaptive Learning Demonstration Studio',
    description:
      'A demonstration-ready unit showing how emotion sensing, learner-state interpretation, adaptive branching, and mixed lesson element types work together in one smart training flow.',
    objectives: [
      'Observe how emotion sensing affects the learner path',
      'See support, clarification, re-engagement, and challenge content in context',
      'Experience text, image, document, video, activity, and checkpoint elements inside one coherent lesson sequence',
    ],
    primaryCompetency: 'adaptive learning interpretation',
    secondaryCompetency: 'instructional decision making',
    estimatedDurationMin: 35,
    sessionCount: 3,
    isAssessable: true,
    status: 'published' as const,
  };

  await prisma.module.upsert({
    where: { id: module.id },
    update: module,
    create: module,
  });
  console.log(`  Module ${module.id}: ${module.title}`);

  const episodes = [
    {
      id: 'M1-E1',
      moduleId: 'M1',
      sequenceOrder: 1,
      baseScaffold: 3,
      expectedDurationMin: 10,
      title: 'Introduction to Adaptive Learning Flow',
      emotionalTriggerExpected: 'neutral' as const,
      description:
        'Orientation lesson explaining what the demonstration unit is, how emotion sensing influences the learner path, and what content types appear next.',
      objectives: [
        'Introduce the smart adaptive demonstration environment',
        'Explain how core lesson steps and short support steps work together',
        'Prepare the learner for the mixed-media demonstration lesson',
      ],
      lessonType: 'guided',
      status: 'published' as const,
    },
    {
      id: 'M1-E2',
      moduleId: 'M1',
      sequenceOrder: 2,
      baseScaffold: 3,
      expectedDurationMin: 18,
      title: 'Affective Feedback Loop Overview',
      emotionalTriggerExpected: 'confusion' as const,
      description:
        'Mixed-media demonstration lesson showing the sensing-to-adaptation loop with text, image, document, video, reflection, and an adaptive checkpoint.',
      objectives: [
        'Explain the affective feedback loop clearly',
        'Show how learner state, context, and performance shape adaptive responses',
        'Demonstrate support, clarification, re-engagement, and challenge content in one lesson',
      ],
      lessonType: 'video',
      status: 'published' as const,
    },
    {
      id: 'M1-E3',
      moduleId: 'M1',
      sequenceOrder: 3,
      baseScaffold: 2,
      expectedDurationMin: 12,
      title: 'Adaptive Response Demonstration',
      emotionalTriggerExpected: 'frustration' as const,
      description:
        'Closing lesson that turns the demonstration into a guided interpretation task so the learner can explain what happens after pass, fail, and adaptive support.',
      objectives: [
        'Summarize how the platform guides the learner after a checkpoint',
        'Connect support paths to visible learner needs',
        'Finish the demonstration with a clear explanation of what happens next in each case',
      ],
      lessonType: 'interactive',
      status: 'published' as const,
    },
  ];

  for (const episode of episodes) {
    await prisma.episode.upsert({
      where: { id: episode.id },
      update: episode,
      create: episode,
    });
    console.log(`    Episode ${episode.id}: ${episode.title}`);
  }

  const learningContents = [
    {
      id: 'LC-M1-E1-TEXT-INTRO',
      episodeId: 'M1-E1',
      contentType: 'TEXT' as const,
      adaptiveTag: 'baseline' as const,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 1,
      status: 'published' as const,
      contentData: {
        title: 'Introduction to Adaptive Learning Flow',
        text:
          'This demonstration unit shows how sensing, interpretation, lesson context, and instructional response work together inside one guided training experience.\n\nAs you move through the lessons, you will see core content, media, short activities, a quick checkpoint, and supportive steps that appear only when they can help learning.',
        noteKey: 'learner.demoSupportText.introFocus',
        note:
          'Keep your attention on one step at a time. The lesson will guide you clearly through the content and any short help that appears.',
        journeyPlacementMode: 'baseline',
      },
    },
    {
      id: 'LC-M1-E1-TEXT-OBJECTIVES',
      episodeId: 'M1-E1',
      contentType: 'TEXT' as const,
      adaptiveTag: 'baseline' as const,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 2,
      status: 'published' as const,
      contentData: {
        title: 'What you will experience in this demonstration',
        text:
          'In the next lesson you will review a text explanation, a visual block, a diagram, an embedded document, an embedded video, a short scenario activity, a summary, and a quick checkpoint.\n\nYou may also see a clarification, support step, re-focus reminder, engagement activity, or optional challenge when the lesson detects that one of these would help.',
        noteKey: 'learner.demoSupportText.introGoal',
        note:
          'The goal is to experience how adaptive teaching can stay supportive and clear without interrupting the learning flow.',
        journeyPlacementMode: 'baseline',
      },
    },
    {
      id: 'LC-M1-E1-ACTIVITY-READY',
      episodeId: 'M1-E1',
      contentType: 'ASSESSMENT' as const,
      adaptiveTag: 'baseline' as const,
      scaffoldLevel: 2,
      isEnrichment: false,
      sequenceOrder: 3,
      status: 'published' as const,
      contentData: {
        title: 'Interactive Activity - What will you watch for?',
        question: 'What will you watch for in this demonstration?',
        prompt:
          'Write one short sentence about the kind of help you expect to appear when a learner needs clarification, reassurance, renewed focus, more engagement, or extra challenge.',
        hintKey: 'learner.demoSupportText.readyActivityHint',
        hint:
          'Focus on how the next lesson step changes to support learning, not on technical system terms.',
        journeyPlacementMode: 'baseline',
      },
    },
    {
      id: 'LC-M1-E1-TEXT-CLARIFY',
      episodeId: 'M1-E1',
      contentType: 'TEXT' as const,
      adaptiveTag: 'confusion' as const,
      scaffoldLevel: 4,
      isEnrichment: false,
      sequenceOrder: 2,
      status: 'published' as const,
      contentData: {
        title: 'Clarification step - The demonstration in one idea',
        text:
          'One idea to hold onto: this unit senses how the learning is going and quietly adjusts the next step.\n\nIf anything felt unclear, re-read the introduction with this single idea in mind: content stays the same, but the support around it adapts to you.',
        note:
          'This clarification restates the orientation in the simplest possible framing before you continue.',
        journeyPlacementMode: 'after',
        adaptiveTriggerLabel: 'confusion',
      },
    },
    {
      id: 'LC-M1-E1-TEXT-SUPPORT',
      episodeId: 'M1-E1',
      contentType: 'TEXT' as const,
      adaptiveTag: 'frustration' as const,
      scaffoldLevel: 4,
      isEnrichment: false,
      sequenceOrder: 3,
      status: 'published' as const,
      contentData: {
        title: 'Support step - Take it one screen at a time',
        text:
          'There is no time pressure in this orientation. Break it into three tiny steps: read the introduction, skim the list of what you will see, and write one short sentence in the activity.\n\nEach step alone takes under a minute.',
        note:
          'This support step decomposes the orientation into smaller actions to lower pressure.',
        journeyPlacementMode: 'after',
        adaptiveTriggerLabel: 'frustration',
      },
    },
    {
      id: 'LC-M1-E1-ACTIVITY-REENGAGE',
      episodeId: 'M1-E1',
      contentType: 'ASSESSMENT' as const,
      adaptiveTag: 'boredom_disengagement' as const,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 3,
      status: 'published' as const,
      contentData: {
        title: 'Engagement activity - One-line prediction',
        question: 'Which kind of adaptive help do you expect to see most often?',
        prompt:
          'Pick the type of support you personally expect to encounter most during this demonstration, then continue.',
        options: [
          'A short clarification of an idea',
          'A calmer, simplified support step',
          'A quick re-engagement activity',
          'An optional extra challenge',
        ],
        hint: 'There is no wrong answer - this is a quick prediction to restart active participation.',
        journeyPlacementMode: 'before',
        adaptiveTriggerLabel: 'boredom_disengagement',
      },
    },
    {
      id: 'LC-M1-E1-TEXT-CHALLENGE',
      episodeId: 'M1-E1',
      contentType: 'TEXT' as const,
      adaptiveTag: 'high_engagement' as const,
      scaffoldLevel: 2,
      isEnrichment: true,
      sequenceOrder: 4,
      status: 'published' as const,
      contentData: {
        title: 'Challenge extension - Design your own trigger',
        text:
          'Optional challenge: imagine you are the instructional designer. Describe one situation in a lesson where you would deliberately NOT intervene, even if the learner shows a strong emotion, and explain why staying silent is the better teaching move.',
        note:
          'This enrichment step is offered because you are progressing quickly through the orientation.',
        journeyPlacementMode: 'after',
        adaptiveTriggerLabel: 'high_engagement',
      },
    },
    {
      id: 'LC-M1-E1-TEXT-REASSURE',
      episodeId: 'M1-E1',
      contentType: 'TEXT' as const,
      adaptiveTag: 'test_anxiety' as const,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 3,
      status: 'published' as const,
      contentData: {
        title: 'Reassurance - This activity is not graded',
        text:
          'A quick reminder: the short activity in this lesson is not scored and has no wrong answers. It simply helps you set an expectation before the demonstration begins.\n\nWrite whatever comes to mind first and continue at your own pace.',
        note:
          'Neutral procedural reassurance for the orientation activity - no answer guidance is given.',
        journeyPlacementMode: 'before',
        adaptiveTriggerLabel: 'test_anxiety',
      },
    },
    {
      id: 'LC-M1-E2-TEXT-OBJECTIVES',
      episodeId: 'M1-E2',
      contentType: 'TEXT' as const,
      adaptiveTag: 'baseline' as const,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 1,
      status: 'published' as const,
      contentData: {
        title: 'Lesson objectives',
        text:
          'By the end of this lesson you should be able to: 1. describe how learner state is interpreted in context, 2. identify how adaptive help can appear in a lesson, and 3. explain what happens after feedback and checkpoint review.',
        noteKey: 'learner.demoSupportText.lessonObjectivesNote',
        note:
          'The next steps combine media, activity, summary, and checkpoint feedback into one coherent learning flow.',
        journeyPlacementMode: 'baseline',
      },
    },
    {
      id: 'LC-M1-E2-TEXT-LOOP',
      episodeId: 'M1-E2',
      contentType: 'TEXT' as const,
      adaptiveTag: 'baseline' as const,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 2,
      status: 'published' as const,
      contentData: {
        title: 'Affective Feedback Loop Overview',
        text:
          'In this platform, the learner session is sensed first. Then the current lesson context, recent performance, and the learner\'s place in the task are considered together.\n\nThat combined picture helps the lesson decide what comes next: continue normally, offer a short clarification, slow the pace with support, restore attention, add a quick engagement activity, or unlock an optional challenge.\n\nAfter that response, the learner continues and the next step is interpreted again in the same cycle.',
        noteKey: 'learner.demoSupportText.feedbackLoopNote',
        note:
          'This text introduces the main idea before the lesson shows it again through image, diagram, document, video, activity, and checkpoint examples.',
        journeyPlacementMode: 'baseline',
      },
    },
    {
      id: 'LC-M1-E2-VISUAL-STATE-MAP',
      episodeId: 'M1-E2',
      contentType: 'VISUAL' as const,
      adaptiveTag: 'baseline' as const,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 3,
      status: 'published' as const,
      contentData: {
        title: 'Image block - Visual explanation of learner state',
        url: demoImageRenderUrl,
        resourceUrl: demoImageSourceUrl,
        renderMode: 'image',
        caption:
          'This image demonstrates how a visual element can help the learner connect detected state, lesson context, and the next instructional move.',
        noteKey: 'learner.demoSupportText.visualStateMapNote',
        note:
          'Use this as a visual explanation block inside the adaptive lesson flow.',
        journeyPlacementMode: 'baseline',
      },
    },
    {
      id: 'LC-M1-E2-VISUAL-DIAGRAM',
      episodeId: 'M1-E2',
      contentType: 'VISUAL' as const,
      adaptiveTag: 'baseline' as const,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 4,
      status: 'published' as const,
      contentData: {
        title: 'Diagram block - From learner state to next lesson step',
        url: demoImageRenderUrl,
        resourceUrl: demoImageSourceUrl,
        renderMode: 'image',
        caption:
          'This diagram-style visual highlights a simple sequence: sensed state, interpreted need, selected support, and updated continuation inside the lesson.',
        noteKey: 'learner.demoSupportText.diagramFlowNote',
        note:
          'This block demonstrates a diagram-style explanation inside the learner flow.',
        journeyPlacementMode: 'baseline',
      },
    },
    {
      id: 'LC-M1-E2-DOC-REFERENCE',
      episodeId: 'M1-E2',
      contentType: 'VISUAL' as const,
      adaptiveTag: 'baseline' as const,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 5,
      status: 'published' as const,
      contentData: {
        title: 'Embedded reference document',
        url: demoPdfPreviewUrl,
        resourceUrl: demoPdfSourceUrl,
        renderMode: 'document',
        caption:
          'This embedded PDF demonstrates how a learner can review a reference document without leaving the lesson.',
        noteKey: 'learner.demoSupportText.referenceDocumentNote',
        note:
          'Use this document as an example of extended reading or conceptual support inside the same lesson player.',
        journeyPlacementMode: 'baseline',
      },
    },
    {
      id: 'LC-M1-E2-VIDEO-BRIEF',
      episodeId: 'M1-E2',
      contentType: 'VIDEO' as const,
      adaptiveTag: 'baseline' as const,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 6,
      status: 'published' as const,
      contentData: {
        title: 'Video Brief: Emotion-Aware Learning',
        url: demoVideoUrl,
        transcript:
          'Watch this short video inside the lesson. While watching, notice how media can remain part of the same adaptive journey instead of becoming a separate static resource.',
        pausePromptKey: 'learner.demoSupportText.videoBriefPause',
        pausePrompt:
          'After the video, think about one moment where a short clarification, reassurance, re-focus prompt, or optional challenge would help the learner most.',
        journeyPlacementMode: 'baseline',
      },
    },
    {
      id: 'LC-M1-E2-ACTIVITY-SIMULATION',
      episodeId: 'M1-E2',
      contentType: 'ASSESSMENT' as const,
      adaptiveTag: 'baseline' as const,
      scaffoldLevel: 2,
      isEnrichment: false,
      sequenceOrder: 7,
      status: 'published' as const,
      contentData: {
        title: 'Scenario activity - Choose the next instructional move',
        taskContextKey: 'scope_analysis',
        question: 'A learner hesitates after the video. What would help most first?',
        prompt:
          'Choose the best next move: a quick clarification, a short focus reminder, a faster engagement activity, or an optional deeper challenge.',
        options: [
          'A quick clarification that makes the idea simpler',
          'A short focus reminder before the next step',
          'A faster engagement activity to restore momentum',
          'An optional deeper challenge for extra stretch',
        ],
        hintKey: 'learner.demoSupportText.simulationHint',
        hint:
          'Choose the action that best matches the learner\'s need in the moment, not the most advanced option.',
        journeyPlacementMode: 'baseline',
      },
    },
    {
      id: 'LC-M1-E2-TEXT-SUMMARY',
      episodeId: 'M1-E2',
      contentType: 'TEXT' as const,
      adaptiveTag: 'baseline' as const,
      scaffoldLevel: 2,
      isEnrichment: false,
      sequenceOrder: 8,
      status: 'published' as const,
      contentData: {
        title: 'Summary - What to remember before the checkpoint',
        text:
          'The main idea is simple: the lesson reads the current need in context, then chooses the lightest response that helps the learner continue clearly.\n\nThat response may be no extra help at all, a short clarification, a calmer support step, a quick re-focus prompt, a small engagement activity, or an optional challenge.',
        noteKey: 'learner.demoSupportText.summaryRecapNote',
        note:
          'Use this recap before the checkpoint so the next answer is based on the full lesson sequence you just reviewed.',
        journeyPlacementMode: 'baseline',
      },
    },
    {
      id: 'LC-M1-E2-TEXT-CLARIFY-EXAMPLE',
      episodeId: 'M1-E2',
      contentType: 'TEXT' as const,
      adaptiveTag: 'confusion' as const,
      scaffoldLevel: 4,
      isEnrichment: false,
      sequenceOrder: 5,
      status: 'published' as const,
      contentData: {
        title: 'Clarification step - Simple example',
        text:
          'Simple example: if a learner watches a concept-heavy video and then pauses before answering, the lesson does not assume failure immediately. It can first offer one smaller explanation that reconnects the learner to the main idea.\n\nAfter that, the learner can return to the checkpoint with a clearer understanding of what the question is asking.',
        noteKey: 'learner.demoSupportText.clarifySimpleNote',
        note:
          'This clarification example keeps the lesson moving by reducing ambiguity before the learner continues.',
        journeyPlacementMode: 'instead',
        adaptiveTriggerLabel: 'confusion',
        adaptiveOptionKey: 'simple_example',
        adaptiveOptionLabel: 'مثال مبسط',
      },
    },
    {
      id: 'LC-M1-E2-VISUAL-CLARIFY-IMAGE',
      episodeId: 'M1-E2',
      contentType: 'VISUAL' as const,
      adaptiveTag: 'confusion' as const,
      scaffoldLevel: 4,
      isEnrichment: false,
      sequenceOrder: 5,
      status: 'published' as const,
      contentData: {
        title: 'Clarification step - Image support',
        url: demoImageRenderUrl,
        resourceUrl: demoImageSourceUrl,
        renderMode: 'image',
        caption:
          'This image-based clarification gives the learner a quicker visual route into the same idea before the lesson continues.',
        noteKey: 'learner.demoSupportText.clarifyImageNote',
        note:
          'Use image clarification when the learner needs a lighter visual explanation rather than more text.',
        journeyPlacementMode: 'instead',
        adaptiveTriggerLabel: 'confusion',
        adaptiveOptionKey: 'image',
        adaptiveOptionLabel: 'صورة',
      },
    },
    {
      id: 'LC-M1-E2-VISUAL-CLARIFY-DIAGRAM',
      episodeId: 'M1-E2',
      contentType: 'VISUAL' as const,
      adaptiveTag: 'confusion' as const,
      scaffoldLevel: 4,
      isEnrichment: false,
      sequenceOrder: 5,
      status: 'published' as const,
      contentData: {
        title: 'Clarification step - Diagram support',
        url: demoImageRenderUrl,
        resourceUrl: demoImageSourceUrl,
        renderMode: 'image',
        caption:
          'This diagram-style clarification reduces the idea to a short sequence the learner can inspect quickly before moving on.',
        noteKey: 'learner.demoSupportText.clarifyDiagramNote',
        note:
          'Use diagram clarification when the learner benefits from seeing the order of the idea step by step.',
        journeyPlacementMode: 'instead',
        adaptiveTriggerLabel: 'confusion',
        adaptiveOptionKey: 'diagram',
        adaptiveOptionLabel: 'مخطط',
      },
    },
    {
      id: 'LC-M1-E2-VIDEO-CLARIFY',
      episodeId: 'M1-E2',
      contentType: 'VIDEO' as const,
      adaptiveTag: 'confusion' as const,
      scaffoldLevel: 4,
      isEnrichment: false,
      sequenceOrder: 5,
      status: 'published' as const,
      contentData: {
        title: 'Clarification step - Video support',
        url: demoVideoUrl,
        transcript:
          'This short clarification video gives the learner another way to revisit the same concept before continuing.',
        pausePromptKey: 'learner.demoSupportText.clarifyVideoPause',
        pausePrompt:
          'As you watch, focus on the one idea that links learner state, lesson context, and the next support choice.',
        journeyPlacementMode: 'instead',
        adaptiveTriggerLabel: 'confusion',
        adaptiveOptionKey: 'video',
        adaptiveOptionLabel: 'فيديو',
      },
    },
    {
      id: 'LC-M1-E2-TEXT-SUPPORT-SIMPLE',
      episodeId: 'M1-E2',
      contentType: 'TEXT' as const,
      adaptiveTag: 'frustration' as const,
      scaffoldLevel: 4,
      isEnrichment: false,
      sequenceOrder: 7,
      status: 'published' as const,
      contentData: {
        title: 'Support step - Simplified explanation',
        text:
          'A simplified explanation reduces the pressure of the current task. Focus on just one question: what does the learner need right now to keep moving clearly?\n\nIf the task feels heavy, strip it back to one concept, one action, and one next step.',
        noteKey: 'learner.demoSupportText.supportSimpleNote',
        note:
          'This support step helps the learner continue with a calmer pace when the current task feels too heavy.',
        journeyPlacementMode: 'after',
        adaptiveTriggerLabel: 'frustration',
        adaptiveOptionKey: 'simplified_explanation',
        adaptiveOptionLabel: 'شرح مبسط',
      },
    },
    {
      id: 'LC-M1-E2-TEXT-SUPPORT-WORKED',
      episodeId: 'M1-E2',
      contentType: 'TEXT' as const,
      adaptiveTag: 'frustration' as const,
      scaffoldLevel: 4,
      isEnrichment: false,
      sequenceOrder: 7,
      status: 'published' as const,
      contentData: {
        title: 'Support step - Worked example',
        text:
          'Worked example: a learner answers the checkpoint incorrectly after a dense explanation. The lesson first shows the correct answer, then offers one short modeled explanation of why that answer fits the concept.\n\nThe learner reviews that model, then returns with less pressure and more confidence.',
        noteKey: 'learner.demoSupportText.supportWorkedNote',
        note:
          'Use a worked example when the learner benefits from seeing the reasoning already completed once.',
        journeyPlacementMode: 'after',
        adaptiveTriggerLabel: 'frustration',
        adaptiveOptionKey: 'worked_example',
        adaptiveOptionLabel: 'مثال محلول',
      },
    },
    {
      id: 'LC-M1-E2-TEXT-SUPPORT-BREAKDOWN',
      episodeId: 'M1-E2',
      contentType: 'TEXT' as const,
      adaptiveTag: 'frustration' as const,
      scaffoldLevel: 4,
      isEnrichment: false,
      sequenceOrder: 7,
      status: 'published' as const,
      contentData: {
        title: 'Support step - Task breakdown',
        text:
          'Task breakdown: 1. identify the current learner need, 2. match it with the lightest useful response, and 3. continue with one clear next action.\n\nBreaking the task into three smaller moves helps the learner continue without feeling overwhelmed.',
        noteKey: 'learner.demoSupportText.supportBreakdownNote',
        note:
          'Use task breakdown when the learner needs a smaller sequence instead of one dense instruction.',
        journeyPlacementMode: 'after',
        adaptiveTriggerLabel: 'frustration',
        adaptiveOptionKey: 'task_breakdown',
        adaptiveOptionLabel: 'تقسيم المهمة',
      },
    },
    {
      id: 'LC-M1-E2-VIDEO-SUPPORT',
      episodeId: 'M1-E2',
      contentType: 'VIDEO' as const,
      adaptiveTag: 'frustration' as const,
      scaffoldLevel: 4,
      isEnrichment: false,
      sequenceOrder: 7,
      status: 'published' as const,
      contentData: {
        title: 'Support step - Short video',
        url: demoVideoUrl,
        transcript:
          'This short support video provides a calmer walkthrough of the same idea so the learner can re-enter the lesson with more confidence.',
        pausePromptKey: 'learner.demoSupportText.supportVideoPause',
        pausePrompt:
          'After watching, return to the lesson and focus on one next action only.',
        journeyPlacementMode: 'after',
        adaptiveTriggerLabel: 'frustration',
        adaptiveOptionKey: 'short_support_video',
        adaptiveOptionLabel: 'فيديو قصير',
      },
    },
    {
      id: 'LC-M1-E2-ACTIVITY-BOREDOM-REENGAGE',
      episodeId: 'M1-E2',
      contentType: 'ASSESSMENT' as const,
      adaptiveTag: 'boredom_disengagement' as const,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 7,
      status: 'published' as const,
      contentData: {
        title: 'Engagement activity - Quick momentum reset',
        question: 'Which short action would restore engagement best right now?',
        prompt:
          'Choose the action that brings the learner back into active participation without leaving the lesson: summarize the main idea, skip the task, ignore the content, or leave the page open without responding.',
        options: [
          'Summarize the main idea in one sentence',
          'Skip the task and move ahead',
          'Ignore the content and wait',
          'Leave the page open without responding',
        ],
        hintKey: 'learner.demoSupportText.boredomHint',
        hint:
          'Pick the option that adds purposeful activity and keeps the learner inside the lesson.',
        journeyPlacementMode: 'before',
        adaptiveTriggerLabel: 'boredom_disengagement',
      },
    },
    {
      id: 'LC-M1-E2-TEXT-CHALLENGE',
      episodeId: 'M1-E2',
      contentType: 'TEXT' as const,
      adaptiveTag: 'high_engagement' as const,
      scaffoldLevel: 2,
      isEnrichment: true,
      sequenceOrder: 8,
      status: 'published' as const,
      contentData: {
        title: 'Challenge extension - Predict the next adaptive move',
        text:
          'Optional challenge: a learner is highly focused during the video step, then slows down only when the checkpoint becomes more analytical. What should the lesson do next?\n\nWrite a short answer that keeps the learner stretched when appropriate but brings back support if the task suddenly becomes heavy.',
        noteKey: 'learner.demoSupportText.challengeNote',
        note:
          'This optional challenge demonstrates the enrichment path without interrupting the normal lesson sequence.',
        journeyPlacementMode: 'after',
        adaptiveTriggerLabel: 'high_engagement',
      },
    },
    {
      id: 'LC-M1-E2-TEXT-REASSURE',
      episodeId: 'M1-E2',
      contentType: 'TEXT' as const,
      adaptiveTag: 'test_anxiety' as const,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 9,
      status: 'published' as const,
      contentData: {
        title: 'Reassurance - How the checkpoint works',
        text:
          'Before the checkpoint: it is short, it explains the answer afterwards, and a retry path exists if needed.\n\nRead each option calmly, and remember that the goal of this checkpoint is to confirm the main idea of the lesson - nothing more.',
        note:
          'Neutral procedural reassurance before the adaptive checkpoint - clarifies the procedure without hinting at the answer.',
        journeyPlacementMode: 'before',
        adaptiveTriggerLabel: 'test_anxiety',
      },
    },
    {
      id: 'LC-M1-E3-TEXT-LAB',
      episodeId: 'M1-E3',
      contentType: 'TEXT' as const,
      adaptiveTag: 'baseline' as const,
      scaffoldLevel: 2,
      isEnrichment: false,
      sequenceOrder: 1,
      status: 'published' as const,
      contentData: {
        title: 'Adaptive Response Demonstration',
        text:
          'This final lesson turns the demonstration into a guided interpretation task. The goal is to explain what the learner sees after a successful checkpoint, after a retry, and after a short support step becomes useful.\n\nUse this lesson to connect the learner experience, checkpoint feedback, and the next instructional move into one clear explanation.',
        noteKey: 'learner.demoSupportText.finalLessonNote',
        note:
          'This closing lesson helps the learner describe what happens next without needing to see internal system terminology.',
        journeyPlacementMode: 'baseline',
      },
    },
    {
      id: 'LC-M1-E3-TEXT-ROUTING',
      episodeId: 'M1-E3',
      contentType: 'TEXT' as const,
      adaptiveTag: 'baseline' as const,
      scaffoldLevel: 2,
      isEnrichment: false,
      sequenceOrder: 2,
      status: 'published' as const,
      contentData: {
        title: 'After feedback, what comes next?',
        text:
          'After a checkpoint, the learner should always understand the result, why it is correct or incorrect, and what to do next.\n\nThat next step may be to continue, retry, review a short clarification, or use a brief support step before moving on.',
        noteKey: 'learner.demoSupportText.routingNote',
        note:
          'This explanation keeps the learner focused on the task and the next action rather than the system behind it.',
        journeyPlacementMode: 'baseline',
      },
    },
    {
      id: 'LC-M1-E3-ACTIVITY-SYNTHESIS',
      episodeId: 'M1-E3',
      contentType: 'ASSESSMENT' as const,
      adaptiveTag: 'baseline' as const,
      scaffoldLevel: 2,
      isEnrichment: false,
      sequenceOrder: 3,
      status: 'published' as const,
      contentData: {
        title: 'Interactive activity - Explain the next learner move',
        question: 'After an incorrect checkpoint answer and visible confusion, what should happen next?',
        prompt:
          'Write a short explanation of the most helpful next step. Focus on the learner need, the support that should appear, and how the learner returns to the lesson after it.',
        hintKey: 'learner.demoSupportText.synthesisHint',
        hint:
          'Name the learning purpose of the next step rather than using internal authoring terms.',
        journeyPlacementMode: 'baseline',
      },
    },
    {
      id: 'LC-M1-E3-TEXT-CLARIFY',
      episodeId: 'M1-E3',
      contentType: 'TEXT' as const,
      adaptiveTag: 'confusion' as const,
      scaffoldLevel: 4,
      isEnrichment: false,
      sequenceOrder: 2,
      status: 'published' as const,
      contentData: {
        title: 'Clarification step - The three outcomes in plain words',
        text:
          'Plain-words recap: after any checkpoint there are only three outcomes to explain. 1) Correct: the learner continues forward. 2) Incorrect: the learner sees why, then retries or reviews. 3) Support helps: a short extra step appears, then the learner returns to the same place.\n\nUse these three sentences as the skeleton of your explanation.',
        note:
          'This clarification reduces the interpretation task to a three-outcome template.',
        journeyPlacementMode: 'after',
        adaptiveTriggerLabel: 'confusion',
      },
    },
    {
      id: 'LC-M1-E3-TEXT-SUPPORT',
      episodeId: 'M1-E3',
      contentType: 'TEXT' as const,
      adaptiveTag: 'frustration' as const,
      scaffoldLevel: 4,
      isEnrichment: false,
      sequenceOrder: 3,
      status: 'published' as const,
      contentData: {
        title: 'Support step - Answer one outcome at a time',
        text:
          'If the synthesis task feels heavy, split it: first write only what happens after a correct answer. Pause. Then write what happens after an incorrect answer. Pause. Finally add one line about the support step.\n\nThree short sentences are a complete answer.',
        note:
          'This support step decomposes the synthesis activity into three separate micro-answers.',
        journeyPlacementMode: 'after',
        adaptiveTriggerLabel: 'frustration',
      },
    },
    {
      id: 'LC-M1-E3-ACTIVITY-REENGAGE',
      episodeId: 'M1-E3',
      contentType: 'ASSESSMENT' as const,
      adaptiveTag: 'boredom_disengagement' as const,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 3,
      status: 'published' as const,
      contentData: {
        title: 'Engagement activity - Quick scenario vote',
        question: 'A learner failed the checkpoint twice and looks tense. What is the kindest useful next step?',
        prompt: 'Choose the step you would offer this learner right now, then continue to the synthesis task.',
        options: [
          'Offer a calmer, smaller version of the task',
          'Repeat the same question immediately',
          'End the lesson early',
          'Show the correct answer with no explanation',
        ],
        hint: 'Think about restoring the learner\'s sense of control first.',
        journeyPlacementMode: 'before',
        adaptiveTriggerLabel: 'boredom_disengagement',
      },
    },
    {
      id: 'LC-M1-E3-TEXT-CHALLENGE',
      episodeId: 'M1-E3',
      contentType: 'TEXT' as const,
      adaptiveTag: 'high_engagement' as const,
      scaffoldLevel: 2,
      isEnrichment: true,
      sequenceOrder: 4,
      status: 'published' as const,
      contentData: {
        title: 'Challenge extension - Write the counter-case',
        text:
          'Optional challenge: describe one situation where adaptive support could actually harm learning - for example, interrupting productive struggle - and propose the rule you would add to prevent it.\n\nThis is the kind of trade-off instructional designers debate in real adaptive systems.',
        note:
          'Enrichment path for learners moving confidently through the closing lesson.',
        journeyPlacementMode: 'after',
        adaptiveTriggerLabel: 'high_engagement',
      },
    },
    {
      id: 'LC-M1-E3-TEXT-REASSURE',
      episodeId: 'M1-E3',
      contentType: 'TEXT' as const,
      adaptiveTag: 'test_anxiety' as const,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 3,
      status: 'published' as const,
      contentData: {
        title: 'Reassurance - Your explanation cannot fail',
        text:
          'The synthesis activity is open-ended: any answer that names the learner need, the support offered, and how the learner returns to the lesson is a good answer.\n\nThere is no hidden rubric and no trick. Write it in your own words.',
        note:
          'Neutral reassurance for the open-ended synthesis task - procedural only, no content guidance.',
        journeyPlacementMode: 'before',
        adaptiveTriggerLabel: 'test_anxiety',
      },
    },
  ];
  for (const content of learningContents) {
    await prisma.learningContent.upsert({
      where: { id: content.id },
      // Prisma client regeneration is required after the AdaptiveTag enum migration.
      // Until then, cast the payload so the canonical v2 content map can compile cleanly.
      update: content as any,
      create: content as any,
    });
  }
  console.log('    Demonstration lesson content seeded.');

    const quizzes: Array<{
      id: string;
      title: string;
      description: string;
      scope: 'lesson' | 'pretest' | 'posttest';
      courseKey: string | null;
      moduleId: string | null;
      episodeId: string | null;
      passingScore: number;
      attemptLimit: number;
      showExplanationAfterSubmit: boolean;
      allowRetry: boolean;
      adaptiveOnFail: string | null;
      adaptiveOnPass: string | null;
      isPublished: boolean;
      sequenceOrder: number;
      questions: Array<{
        id: string;
        questionType: 'mcq' | 'true_false';
        questionText: string;
        explanation: string;
        hint: string;
        dimension?: 's1' | 's2' | 's3' | 's4' | 's5' | null;
        weight: number;
        sequenceOrder: number;
        choices: Array<{
          id: string;
          choiceText: string;
          isCorrect: boolean;
          sequenceOrder: number;
        }>;
      }>;
    }> = [
      {
        id: 'Q-M1-E2-1',
        title: 'نقطة تحقق تكيفية سريعة',
        description:
          'نقطة تحقق قصيرة تؤكد الفكرة الأساسية في الدرس التكيفي قبل المتابعة.',
        scope: 'lesson' as const,
        courseKey: null,
        moduleId: 'M1',
        episodeId: 'M1-E2',
        passingScore: 70,
        attemptLimit: 2,
        showExplanationAfterSubmit: true,
        allowRetry: true,
        adaptiveOnFail: 'clarification_support',
        adaptiveOnPass: 'challenge_path',
        isPublished: true,
        sequenceOrder: 1,
        questions: [
          {
            id: 'Q-M1-E2-1-Q1',
            questionType: 'mcq' as const,
            questionText: 'أي تسلسل يطابق حلقة التعلم التكيفي؟',
            explanation:
              'هذا هو التسلسل الصحيح. ترصد المنصة حالة المتعلم، وتقرأها في سياقها، ثم تختار الاستجابة التعليمية التالية.',
            hint: 'اختر التسلسل الذي يجمع بين الرصد، وقراءة السياق، ثم تحديد الاستجابة التالية.',
            weight: 1,
            sequenceOrder: 1,
            choices: [
              {
                id: 'Q-M1-E2-1-Q1-A',
                choiceText: 'رصد الحالة -> قراءة السياق -> اختيار الاستجابة -> المتابعة',
                isCorrect: true,
                sequenceOrder: 1,
              },
              {
                id: 'Q-M1-E2-1-Q1-B',
                choiceText: 'عرض الدرس نفسه -> احتساب درجة -> التوقف',
                isCorrect: false,
                sequenceOrder: 2,
              },
              {
                id: 'Q-M1-E2-1-Q1-C',
                choiceText: 'رصد الانفعال -> تجاهل السياق -> فرض الدعم',
                isCorrect: false,
                sequenceOrder: 3,
              },
              {
                id: 'Q-M1-E2-1-Q1-D',
                choiceText: 'اختيار مسار عشوائي -> إخفاء التغذية الراجعة',
                isCorrect: false,
                sequenceOrder: 4,
              },
            ],
          },
          {
            id: 'Q-M1-E2-1-Q2',
            questionType: 'mcq' as const,
            questionText: 'إذا ظهر الارتباك، فما أول ما ينبغي أن يقدمه الدرس؟',
            explanation:
              'التوضيح القصير هو أفضل استجابة أولى، لأنه يقلل الغموض قبل أن يحاول المتعلم مرة أخرى.',
            hint: 'اختر الخيار الذي يوضح الفكرة أولًا قبل زيادة الضغط على المتعلم.',
            weight: 1,
            sequenceOrder: 2,
            choices: [
              {
                id: 'Q-M1-E2-1-Q2-A',
                choiceText: 'توضيح قصير',
                isCorrect: true,
                sequenceOrder: 1,
              },
              {
                id: 'Q-M1-E2-1-Q2-B',
                choiceText: 'تحدٍ أصعب',
                isCorrect: false,
                sequenceOrder: 2,
              },
              {
                id: 'Q-M1-E2-1-Q2-C',
                choiceText: 'عدم تقديم تغذية راجعة حتى النهاية',
                isCorrect: false,
                sequenceOrder: 3,
              },
              {
                id: 'Q-M1-E2-1-Q2-D',
                choiceText: 'تجاوز الخطوة مباشرة إلى الإكمال',
                isCorrect: false,
                sequenceOrder: 4,
              },
            ],
          },
          {
            id: 'Q-M1-E2-1-Q3',
            questionType: 'true_false' as const,
            questionText: 'صواب أم خطأ: يُستخدم إعادة التفعيل عندما ينخفض الانتباه ويحتاج المتعلم إلى استعادة تركيز سريعة.',
            explanation:
              'هذه العبارة صحيحة. فإعادة التفعيل تساعد المتعلم على العودة إلى المهمة قبل الاستمرار.',
            hint: 'فكّر فيما ينبغي أن يفعله الدرس عندما يبتعد انتباه المتعلم عن المهمة الحالية.',
            weight: 1,
            sequenceOrder: 3,
            choices: [
              { id: 'Q-M1-E2-1-Q3-A', choiceText: 'صحيح', isCorrect: true, sequenceOrder: 1 },
              { id: 'Q-M1-E2-1-Q3-B', choiceText: 'خطأ', isCorrect: false, sequenceOrder: 2 },
            ],
          },
        ],
      },
      {
        id: 'Q-PRE-STEP-01',
        title: 'الاختبار القبلي: قياس الفهم الأولي لإدارة المشروع',
        description:
          'اختبار قبلي قصير يقيس مستوى الفهم المبدئي للمتعلم قبل الدخول إلى الوحدات التدريبية.',
        scope: 'pretest' as const,
        courseKey,
        moduleId: null,
        episodeId: null,
        passingScore: 70,
        attemptLimit: 1,
        showExplanationAfterSubmit: true,
        allowRetry: false,
        adaptiveOnFail: null,
        adaptiveOnPass: null,
        isPublished: true,
        sequenceOrder: 1,
        questions: [
          {
            id: 'Q-PRE-STEP-01-Q1',
            questionType: 'mcq' as const,
            questionText: 'ما الإجراء الذي ينبغي أن يأتي أولًا عند بدء مشروع تصميم تعليمي؟',
            explanation: 'الخطوة الأولى هي تحديد النطاق، حتى تُبنى بقية الخطة على هدف واضح ومحدد.',
            hint: 'اختر الخطوة التي تمنح المشروع اتجاهًا واضحًا قبل البدء في الجدولة أو الإنتاج.',
            dimension: 's1' as const,
            weight: 1,
            sequenceOrder: 1,
            choices: [
              { id: 'Q-PRE-STEP-01-Q1-A', choiceText: 'تحديد نطاق المشروع', isCorrect: true, sequenceOrder: 1 },
              { id: 'Q-PRE-STEP-01-Q1-B', choiceText: 'إطلاق المقرر النهائي مباشرة', isCorrect: false, sequenceOrder: 2 },
              { id: 'Q-PRE-STEP-01-Q1-C', choiceText: 'الانتقال مباشرة إلى التقييم', isCorrect: false, sequenceOrder: 3 },
              { id: 'Q-PRE-STEP-01-Q1-D', choiceText: 'تصدير التحليلات أولًا', isCorrect: false, sequenceOrder: 4 },
            ],
          },
          {
            id: 'Q-PRE-STEP-01-Q2',
            questionType: 'true_false' as const,
            questionText: 'صواب أم خطأ: يجب تخطيط الجدول الزمني للمشروع قبل بدء العمل.',
            explanation: 'هذه العبارة صحيحة، لأن الجدول الزمني ينظم المراحل، والأدوار، والإيقاع الواقعي للتنفيذ.',
            hint: 'فكّر فيما إذا كانت الجدولة تتم قبل بدء التنفيذ أم بعده.',
            dimension: 's2' as const,
            weight: 1,
            sequenceOrder: 2,
            choices: [
              { id: 'Q-PRE-STEP-01-Q2-A', choiceText: 'صحيح', isCorrect: true, sequenceOrder: 1 },
              { id: 'Q-PRE-STEP-01-Q2-B', choiceText: 'خطأ', isCorrect: false, sequenceOrder: 2 },
            ],
          },
          {
            id: 'Q-PRE-STEP-01-Q3',
            questionType: 'mcq' as const,
            questionText: 'أي خيار يدعم التواصل الواضح داخل فريق المشروع بشكل أفضل؟',
            explanation: 'التحديث المشترك للحالة يحافظ على وضوح التوقعات ويقلل الالتباس بين أعضاء الفريق.',
            hint: 'اختر الخيار الذي يُبقي الجميع على اطلاع وتنسيق مستمر.',
            dimension: 's3' as const,
            weight: 1,
            sequenceOrder: 3,
            choices: [
              { id: 'Q-PRE-STEP-01-Q3-A', choiceText: 'استخدام تحديثات حالة مشتركة ومنتظمة', isCorrect: true, sequenceOrder: 1 },
              { id: 'Q-PRE-STEP-01-Q3-B', choiceText: 'إخفاء تغييرات الجدول عن الفريق', isCorrect: false, sequenceOrder: 2 },
              { id: 'Q-PRE-STEP-01-Q3-C', choiceText: 'تجنب توثيق القرارات', isCorrect: false, sequenceOrder: 3 },
              { id: 'Q-PRE-STEP-01-Q3-D', choiceText: 'الانتظار حتى النهاية لذكر المشكلات', isCorrect: false, sequenceOrder: 4 },
            ],
          },
          {
            id: 'Q-PRE-STEP-01-Q4',
            questionType: 'true_false' as const,
            questionText: 'صواب أم خطأ: يساعد تحديد المخاطر مبكرًا على تقليل تعطل المشروع لاحقًا.',
            explanation: 'هذه العبارة صحيحة، لأن التعرف المبكر إلى المخاطر يجعل معالجتها ممكنة قبل أن تتفاقم.',
            hint: 'فكّر فيما إذا كان تخطيط المخاطر إجراءً استباقيًا أم مجرد استجابة متأخرة.',
            dimension: 's4' as const,
            weight: 1,
            sequenceOrder: 4,
            choices: [
              { id: 'Q-PRE-STEP-01-Q4-A', choiceText: 'صحيح', isCorrect: true, sequenceOrder: 1 },
              { id: 'Q-PRE-STEP-01-Q4-B', choiceText: 'خطأ', isCorrect: false, sequenceOrder: 2 },
            ],
          },
          {
            id: 'Q-PRE-STEP-01-Q5',
            questionType: 'mcq' as const,
            questionText: 'عند توفر خيارين للمهمة، ما الذي ينبغي أن يوجّه القرار النهائي في المشروع؟',
            explanation: 'ينبغي أن يتوافق القرار مع هدف المشروع وقيوده واحتياج المتعلم، لا مع التفضيل الشخصي وحده.',
            hint: 'اختر الخيار الذي يعكس اتخاذ قرار واعٍ ومقصود.',
            dimension: 's5' as const,
            weight: 1,
            sequenceOrder: 5,
            choices: [
              { id: 'Q-PRE-STEP-01-Q5-A', choiceText: 'الخيار الذي يحقق الهدف ويلائم القيود', isCorrect: true, sequenceOrder: 1 },
              { id: 'Q-PRE-STEP-01-Q5-B', choiceText: 'الخيار الذي يبدو أسهل دون مراجعة', isCorrect: false, sequenceOrder: 2 },
              { id: 'Q-PRE-STEP-01-Q5-C', choiceText: 'الخيار المختار في اللحظة الأخيرة دون معايير', isCorrect: false, sequenceOrder: 3 },
              { id: 'Q-PRE-STEP-01-Q5-D', choiceText: 'الخيار صاحب الوصف الأطول', isCorrect: false, sequenceOrder: 4 },
            ],
          },
        ],
      },
      {
        id: 'Q-POST-STEP-01',
        title: 'الاختبار البعدي: التحقق من كفاءة إدارة المشروع',
        description:
          'اختبار بعدي قصير يقيس أداء المتعلم بعد استكمال الوحدات التدريبية.',
        scope: 'posttest' as const,
        courseKey,
        moduleId: null,
        episodeId: null,
        passingScore: 70,
        attemptLimit: 1,
        showExplanationAfterSubmit: true,
        allowRetry: false,
        adaptiveOnFail: null,
        adaptiveOnPass: null,
        isPublished: true,
        sequenceOrder: 1,
        questions: [
          {
            id: 'Q-POST-STEP-01-Q1',
            questionType: 'mcq' as const,
            questionText: 'أي عبارة تصف نطاق مشروع محددًا جيدًا؟',
            explanation: 'النطاق الواضح يحدد الهدف والحدود والمخرج المتوقع حتى يبقى العمل مركزًا.',
            hint: 'اختر الإجابة التي توضح الحدود والغرض بشكل دقيق.',
            dimension: 's1' as const,
            weight: 1,
            sequenceOrder: 1,
            choices: [
              { id: 'Q-POST-STEP-01-Q1-A', choiceText: 'يوضح الهدف والحدود والمخرج المتوقع', isCorrect: true, sequenceOrder: 1 },
              { id: 'Q-POST-STEP-01-Q1-B', choiceText: 'يلغي الحاجة إلى التخطيط', isCorrect: false, sequenceOrder: 2 },
              { id: 'Q-POST-STEP-01-Q1-C', choiceText: 'يُكتب فقط بعد التسليم', isCorrect: false, sequenceOrder: 3 },
              { id: 'Q-POST-STEP-01-Q1-D', choiceText: 'يستبدل التواصل مع أصحاب المصلحة', isCorrect: false, sequenceOrder: 4 },
            ],
          },
          {
            id: 'Q-POST-STEP-01-Q2',
            questionType: 'mcq' as const,
            questionText: 'ما السبب الأقوى لترتيب المهام داخل خطة المشروع؟',
            explanation: 'يساعد ترتيب المهام الفريق على فهم الاعتماديات والانتقال عبر العمل بترتيب واقعي.',
            hint: 'اختر الإجابة التي توضح لماذا يهم ترتيب التنفيذ في عمل المشروع.',
            dimension: 's2' as const,
            weight: 1,
            sequenceOrder: 2,
            choices: [
              { id: 'Q-POST-STEP-01-Q2-A', choiceText: 'يوضح الاعتماديات والترتيب الواقعي للعمل', isCorrect: true, sequenceOrder: 1 },
              { id: 'Q-POST-STEP-01-Q2-B', choiceText: 'يجعل المراجعة غير ضرورية', isCorrect: false, sequenceOrder: 2 },
              { id: 'Q-POST-STEP-01-Q2-C', choiceText: 'يستبدل التواصل مع أصحاب المصلحة', isCorrect: false, sequenceOrder: 3 },
              { id: 'Q-POST-STEP-01-Q2-D', choiceText: 'يضمن عدم حدوث أي تغييرات في المشروع', isCorrect: false, sequenceOrder: 4 },
            ],
          },
          {
            id: 'Q-POST-STEP-01-Q3',
            questionType: 'true_false' as const,
            questionText: 'صواب أم خطأ: يشمل التواصل الواضح مشاركة التحديثات والمشكلات والقرارات مع الأشخاص المناسبين في الوقت المناسب.',
            explanation: 'هذه العبارة صحيحة، لأن جودة التواصل تعتمد على الملاءمة والتوقيت والفهم المشترك، لا على التكرار فقط.',
            hint: 'فكّر فيما يجعل تواصل المشروع فعالًا، لا مجرد كثير الحدوث.',
            dimension: 's3' as const,
            weight: 1,
            sequenceOrder: 3,
            choices: [
              { id: 'Q-POST-STEP-01-Q3-A', choiceText: 'صحيح', isCorrect: true, sequenceOrder: 1 },
              { id: 'Q-POST-STEP-01-Q3-B', choiceText: 'خطأ', isCorrect: false, sequenceOrder: 2 },
            ],
          },
          {
            id: 'Q-POST-STEP-01-Q4',
            questionType: 'mcq' as const,
            questionText: 'أي استجابة تُظهر ممارسة جيدة لإدارة المخاطر؟',
            explanation: 'أفضل استجابة هي تحديد الخطر، وتقدير أثره، والاستعداد بإجراء للتخفيف قبل تفاقمه.',
            hint: 'اختر الخيار الذي يتعامل مع الخطر قبل أن يتحول إلى أزمة.',
            dimension: 's4' as const,
            weight: 1,
            sequenceOrder: 4,
            choices: [
              { id: 'Q-POST-STEP-01-Q4-A', choiceText: 'توثيق الخطر والاستعداد بخطوة تخفيف', isCorrect: true, sequenceOrder: 1 },
              { id: 'Q-POST-STEP-01-Q4-B', choiceText: 'تجاهل الخطر حتى يتسبب في فشل', isCorrect: false, sequenceOrder: 2 },
              { id: 'Q-POST-STEP-01-Q4-C', choiceText: 'إزالة جميع المواعيد النهائية فورًا', isCorrect: false, sequenceOrder: 3 },
              { id: 'Q-POST-STEP-01-Q4-D', choiceText: 'تغيير هدف المشروع دون مراجعة', isCorrect: false, sequenceOrder: 4 },
            ],
          },
          {
            id: 'Q-POST-STEP-01-Q5',
            questionType: 'true_false' as const,
            questionText: 'صواب أم خطأ: ينبغي أن تعتمد قرارات المشروع الجيدة على الأدلة والأهداف والقيود، لا على الاندفاع اللحظي.',
            explanation: 'هذه العبارة صحيحة، لأن القرار القوي يربط بين الأدلة المتاحة وهدف المشروع وقيود العمل الواقعية.',
            hint: 'فكّر فيما يجعل القرار موثوقًا داخل بيئة العمل الحقيقية للمشروع.',
            dimension: 's5' as const,
            weight: 1,
            sequenceOrder: 5,
            choices: [
              { id: 'Q-POST-STEP-01-Q5-A', choiceText: 'صحيح', isCorrect: true, sequenceOrder: 1 },
              { id: 'Q-POST-STEP-01-Q5-B', choiceText: 'خطأ', isCorrect: false, sequenceOrder: 2 },
            ],
          },
        ],
      },
    ];

  for (const quiz of quizzes) {
    await prisma.quiz.upsert({
      where: { id: quiz.id },
      update: {
        title: quiz.title,
        description: quiz.description,
        scope: quiz.scope,
        courseKey: quiz.courseKey,
        moduleId: quiz.moduleId,
        episodeId: quiz.episodeId,
        passingScore: quiz.passingScore,
        attemptLimit: quiz.attemptLimit,
        showExplanationAfterSubmit: quiz.showExplanationAfterSubmit,
        allowRetry: quiz.allowRetry,
        adaptiveOnFail: quiz.adaptiveOnFail,
        adaptiveOnPass: quiz.adaptiveOnPass,
        isPublished: quiz.isPublished,
        sequenceOrder: quiz.sequenceOrder,
      },
      create: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        scope: quiz.scope,
        courseKey: quiz.courseKey,
        moduleId: quiz.moduleId,
        episodeId: quiz.episodeId,
        passingScore: quiz.passingScore,
        attemptLimit: quiz.attemptLimit,
        showExplanationAfterSubmit: quiz.showExplanationAfterSubmit,
        allowRetry: quiz.allowRetry,
        adaptiveOnFail: quiz.adaptiveOnFail,
        adaptiveOnPass: quiz.adaptiveOnPass,
        isPublished: quiz.isPublished,
        sequenceOrder: quiz.sequenceOrder,
      },
    });

    for (const question of quiz.questions) {
      await prisma.quizQuestion.upsert({
        where: { id: question.id },
        update: {
          quizId: quiz.id,
          questionType: question.questionType,
          questionText: question.questionText,
          explanation: question.explanation,
          hint: question.hint,
          dimension: question.dimension ?? null,
          weight: question.weight,
          sequenceOrder: question.sequenceOrder,
        },
        create: {
          id: question.id,
          quizId: quiz.id,
          questionType: question.questionType,
          questionText: question.questionText,
          explanation: question.explanation,
          hint: question.hint,
          dimension: question.dimension ?? null,
          weight: question.weight,
          sequenceOrder: question.sequenceOrder,
        },
      });

      for (const choice of question.choices) {
        await prisma.quizChoice.upsert({
          where: { id: choice.id },
          update: {
            questionId: question.id,
            choiceText: choice.choiceText,
            isCorrect: choice.isCorrect,
            sequenceOrder: choice.sequenceOrder,
          },
          create: {
            id: choice.id,
            questionId: question.id,
            choiceText: choice.choiceText,
            isCorrect: choice.isCorrect,
            sequenceOrder: choice.sequenceOrder,
          },
        });
      }
    }
  }
  console.log('    Demonstration checkpoint quiz seeded.');

  const prompts = [
    {
      id: 'RP-M1-DEMO',
      moduleId: 'M1',
      sequenceOrder: 1,
      minWords: 120,
      maxWords: 250,
      promptText:
        'Using the demonstration unit you just completed, explain how the platform decides when to continue baseline instruction and when to introduce support, clarification, re-engagement, or challenge content.',
    },
  ];

  for (const prompt of prompts) {
    await prisma.reflectionPrompt.upsert({
      where: { id: prompt.id },
      update: prompt,
      create: prompt,
    });
    console.log(`  Reflection prompt ${prompt.id}`);
  }

  const cohortSettings = [
    {
      cohort: 'experimental' as const,
      label: 'Experimental group demo',
      emotionTrackingEnabled: true,
    },
    {
      cohort: 'control' as const,
      label: 'Control group demo',
      emotionTrackingEnabled: false,
    },
  ];

  for (const group of cohortSettings) {
    await prisma.cohortSettings.upsert({
      where: { cohort: group.cohort },
      update: {
        label: group.label,
        emotionTrackingEnabled: group.emotionTrackingEnabled,
      },
      create: group,
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    const demoUsers = [
      { participantId: 'EXP00000000000000001', cohort: 'experimental' as const, password: 'research2026', role: 'learner' as const },
      { participantId: 'CTL00000000000000001', cohort: 'control' as const, password: 'research2026', role: 'learner' as const },
      { participantId: 'RADMIN00000000000001', cohort: 'control' as const, password: 'research2026', role: 'research_admin' as const },
    ];

    for (const user of demoUsers) {
      const existing = await prisma.learner.findUnique({ where: { participantId: user.participantId } });
      let learnerId = existing?.id;
      if (!existing) {
        const learner = await prisma.learner.create({
          data: {
            participantId: user.participantId,
            cohort: user.cohort,
            role: user.role as any,
            isActive: true,
          },
        });
        learnerId = learner.id;
        const hash = await bcrypt.hash(user.password, 12);
        await prisma.authCredential.create({
          data: { learnerId: learner.id, passwordHash: hash },
        });
        console.log(`  Demo user: ${user.participantId}`);
      } else if ((existing as any).role !== user.role) {
        await prisma.learner.update({
          where: { id: existing.id },
          data: { role: user.role as any, isActive: true },
        });
      } else if (!existing.isActive) {
        await prisma.learner.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }

      // Consent is now granted at registration; backfill it for demo learners
      // so their journey starts at profile setup rather than being stuck.
      if (learnerId && user.role === 'learner') {
        const hasConsent = await prisma.consentRecord.findFirst({
          where: { learnerId, withdrawalRequestedAt: null },
          select: { id: true },
        });
        if (!hasConsent) {
          await prisma.consentRecord.create({
            data: {
              learnerId,
              consentVersion: '2.0-registration',
              participation: true,
              performanceData: true,
              behavioralTracking: true,
              facialAnalysis: user.cohort === 'experimental',
            },
          });
        }
      }
    }
  }

  console.log('\nSeed complete.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
