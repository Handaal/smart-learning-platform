import { prisma } from '../lib/prisma';

const CANONICAL_AFFECT_ENUM = `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'AffectState' AND e.enumlabel = 'Flow'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'AffectState_legacy'
  ) THEN
    ALTER TYPE "AffectState" RENAME TO "AffectState_legacy";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'AffectState'
  ) THEN
    CREATE TYPE "AffectState" AS ENUM (
      'confusion',
      'frustration',
      'boredom_disengagement',
      'high_engagement',
      'test_anxiety',
      'neutral',
      'no_face_low_confidence'
    );
  END IF;
END $$;
`;

const CANONICAL_INTERVENTION_ENUM = `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'InterventionType' AND e.enumlabel = 'hint'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'InterventionType_legacy'
  ) THEN
    ALTER TYPE "InterventionType" RENAME TO "InterventionType_legacy";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'InterventionType'
  ) THEN
    CREATE TYPE "InterventionType" AS ENUM (
      'scaffolded_hint',
      'worked_example',
      'micro_learning_review',
      'task_decomposition',
      'supportive_message',
      'interactive_case_switch',
      'quick_decision_question',
      'advanced_path',
      'neutral_reassurance',
      'operational_safety_protocol',
      'do_nothing'
    );
  END IF;
END $$;
`;

const CANONICAL_ADAPTIVE_TAG_ENUM = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'AdaptiveTag'
  ) THEN
    CREATE TYPE "AdaptiveTag" AS ENUM (
      'baseline',
      'confusion',
      'frustration',
      'boredom_disengagement',
      'high_engagement',
      'test_anxiety',
      'neutral',
      'no_face_low_confidence'
    );
  END IF;
END $$;
`;

const DROP_COMPAT_VIEWS = [
  'DROP VIEW IF EXISTS "emotion_events";',
  'DROP VIEW IF EXISTS "lesson_contents";',
  'DROP VIEW IF EXISTS "lessons";',
  'DROP VIEW IF EXISTS "sessions";',
];

function affectCastSql(tableName: string, columnName: string, nextDefault?: string) {
  return `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tableName}'
      AND column_name = '${columnName}'
      AND udt_name = 'AffectState_legacy'
  ) THEN
    ALTER TABLE "${tableName}"
    ALTER COLUMN "${columnName}" DROP DEFAULT;

    ALTER TABLE "${tableName}"
    ALTER COLUMN "${columnName}" TYPE "AffectState"
    USING (
      CASE "${columnName}"::text
        WHEN 'Flow' THEN 'high_engagement'
        WHEN 'Confusion' THEN 'confusion'
        WHEN 'Frustration' THEN 'frustration'
        WHEN 'Anxiety' THEN 'test_anxiety'
        WHEN 'Boredom' THEN 'boredom_disengagement'
        WHEN 'Neutral' THEN 'neutral'
        WHEN 'Unknown' THEN 'no_face_low_confidence'
        ELSE NULL
      END
    )::"AffectState";

    ${nextDefault ? `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" SET DEFAULT ${nextDefault};` : ''}
  END IF;
END $$;
`;
}

function adaptiveTagCastSql(tableName: string, columnName: string) {
  return `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tableName}'
      AND column_name = '${columnName}'
      AND udt_name = 'AffectState_legacy'
  ) THEN
    ALTER TABLE "${tableName}"
    ALTER COLUMN "${columnName}" TYPE "AdaptiveTag"
    USING (
      CASE "${columnName}"::text
        WHEN 'Flow' THEN 'high_engagement'
        WHEN 'Confusion' THEN 'confusion'
        WHEN 'Frustration' THEN 'frustration'
        WHEN 'Anxiety' THEN 'test_anxiety'
        WHEN 'Boredom' THEN 'boredom_disengagement'
        WHEN 'Neutral' THEN 'baseline'
        WHEN 'Unknown' THEN 'no_face_low_confidence'
        ELSE NULL
      END
    )::"AdaptiveTag";
  END IF;
END $$;
`;
}

const CANONICAL_INTERVENTION_CAST = `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'adaptive_event'
      AND column_name = 'intervention'
      AND udt_name = 'InterventionType_legacy'
  ) THEN
    ALTER TABLE "adaptive_event"
    ALTER COLUMN "intervention" TYPE "InterventionType"
    USING (
      CASE "intervention"::text
        WHEN 'hint' THEN 'scaffolded_hint'
        WHEN 'scaffold_up' THEN 'worked_example'
        WHEN 'scaffold_down' THEN 'task_decomposition'
        WHEN 'challenge' THEN 'advanced_path'
        WHEN 'break_prompt' THEN 'interactive_case_switch'
        WHEN 'affirmation' THEN 'supportive_message'
        WHEN 'pause_and_check' THEN 'neutral_reassurance'
        WHEN 'reframe' THEN 'micro_learning_review'
        WHEN 'none' THEN 'do_nothing'
        ELSE 'do_nothing'
      END
    )::"InterventionType";
  END IF;
END $$;
`;

const DROP_LEGACY_TYPES = `
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AffectState_legacy')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND udt_name = 'AffectState_legacy'
     ) THEN
    DROP TYPE "AffectState_legacy";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterventionType_legacy')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND udt_name = 'InterventionType_legacy'
     ) THEN
    DROP TYPE "InterventionType_legacy";
  END IF;
END $$;
`;

const RECREATE_COMPAT_VIEWS = [
  `CREATE VIEW "emotion_events" AS
SELECT
  emotion_event.id,
  emotion_event."time",
  emotion_event.session_id,
  emotion_event.learner_id,
  emotion_event.episode_id,
  emotion_event.au1,
  emotion_event.au4,
  emotion_event.au6,
  emotion_event.au12,
  emotion_event.au20,
  emotion_event.au23,
  emotion_event.au_confidence,
  emotion_event.classified_state,
  emotion_event.classification_confidence,
  emotion_event.is_below_threshold,
  emotion_event.content_id
FROM emotion_event;`,

  `CREATE VIEW "lesson_contents" AS
SELECT
  learning_content.id,
  learning_content.episode_id,
  learning_content.content_type,
  learning_content.adaptive_tag,
  learning_content.content_data,
  learning_content.scaffold_level,
  learning_content.is_enrichment,
  learning_content.sequence_order
FROM learning_content;`,

  `CREATE VIEW "lessons" AS
SELECT
  episode.id,
  episode.module_id,
  episode.title,
  episode.description,
  episode.sequence_order,
  episode.base_scaffold,
  episode.expected_duration_min,
  episode.emotional_trigger_expected,
  episode.is_adaptive
FROM episode;`,

  `CREATE VIEW "sessions" AS
SELECT
  session.id,
  session.learner_id,
  session.module_id,
  session.episode_id,
  session.started_at,
  session.ended_at,
  session.duration_min,
  session.completion_pct,
  session.scaffold_level,
  session.initial_affect,
  session.final_affect,
  session.is_complete,
  session.device_info,
  session.researcher_notes
FROM session;`,
];

async function run() {
  const affectColumns: Array<{ tableName: string; columnName: string; nextDefault?: string }> = [
    { tableName: 'adaptive_event', columnName: 'affect_state_pre' },
    { tableName: 'adaptive_event', columnName: 'affect_state_post' },
    { tableName: 'behavior_window', columnName: 'derived_affect_signal' },
    { tableName: 'emotion_event', columnName: 'classified_state', nextDefault: `'no_face_low_confidence'::"AffectState"` },
    { tableName: 'emotion_events', columnName: 'classified_state' },
    { tableName: 'episode', columnName: 'emotional_trigger_expected' },
    { tableName: 'lessons', columnName: 'emotional_trigger_expected' },
    { tableName: 'session', columnName: 'initial_affect', nextDefault: `'neutral'::"AffectState"` },
    { tableName: 'session', columnName: 'final_affect' },
    { tableName: 'sessions', columnName: 'initial_affect' },
    { tableName: 'sessions', columnName: 'final_affect' },
  ];

  const adaptiveTagColumns = [
    ['learning_content', 'adaptive_tag'],
    ['lesson_contents', 'adaptive_tag'],
  ] as const;

  await prisma.$executeRawUnsafe(CANONICAL_AFFECT_ENUM);
  await prisma.$executeRawUnsafe(CANONICAL_INTERVENTION_ENUM);
  await prisma.$executeRawUnsafe(CANONICAL_ADAPTIVE_TAG_ENUM);
  for (const statement of DROP_COMPAT_VIEWS) {
    await prisma.$executeRawUnsafe(statement);
  }

  for (const column of affectColumns) {
    await prisma.$executeRawUnsafe(
      affectCastSql(column.tableName, column.columnName, column.nextDefault),
    );
  }

  for (const [tableName, columnName] of adaptiveTagColumns) {
    await prisma.$executeRawUnsafe(adaptiveTagCastSql(tableName, columnName));
  }

  await prisma.$executeRawUnsafe(CANONICAL_INTERVENTION_CAST);
  await prisma.$executeRawUnsafe(DROP_LEGACY_TYPES);
  for (const statement of RECREATE_COMPAT_VIEWS) {
    await prisma.$executeRawUnsafe(statement);
  }

  const summary = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('adaptive_event', 'behavior_window', 'emotion_event', 'emotion_events', 'episode', 'learning_content', 'lesson_contents', 'lessons', 'session', 'sessions')
      AND column_name IN ('affect_state_pre', 'affect_state_post', 'derived_affect_signal', 'classified_state', 'emotional_trigger_expected', 'adaptive_tag', 'initial_affect', 'final_affect', 'intervention')
    ORDER BY table_name, column_name
  `);

  console.log('[syncCanonicalEnums] database enum columns are now aligned');
  console.log(JSON.stringify(summary, null, 2));
}

run()
  .catch((error) => {
    console.error('[syncCanonicalEnums] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
