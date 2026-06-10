import { prisma } from '../lib/prisma';
import type { CompetencyScores } from '../types';

interface ScoreInput {
  s1: number; s2: number; s3: number; s4: number; s5: number;
}

/**
 * CompetencyTracker — records competency scores from multiple sources
 * and provides longitudinal trajectory data.
 */
export class CompetencyTracker {

  /** Record from a completed assessment (scenario-based, 0–4 per cluster) */
  async recordFromAssessment(
    learnerId:    string,
    assessmentId: string,
    scores:       ScoreInput,
  ): Promise<void> {
    // Normalise 0–4 rubric to 0–1
    const c: CompetencyScores = {
      c1: scores.s1 / 4,
      c2: scores.s2 / 4,
      c3: scores.s3 / 4,
      c4: scores.s4 / 4,
      c5: scores.s5 / 4,
    };

    await prisma.competencyRecord.create({
      data: {
        learnerId,
        source:       'assessment',
        assessmentId,
        c1: c.c1, c2: c.c2, c3: c.c3, c4: c.c4, c5: c.c5,
      },
    });
  }

  /** Record from a simulated artifact (WBS, scope doc, risk register) */
  async recordFromArtifact(
    learnerId: string,
    moduleId:  string,
    scores:    CompetencyScores,
  ): Promise<void> {
    await prisma.competencyRecord.create({
      data: { learnerId, source: 'artifact', moduleId, ...scores },
    });
  }

  /** Record from scenario decision quality (branching outcomes) */
  async recordFromSimulation(
    learnerId:       string,
    moduleId:        string,
    competencyDelta: CompetencyScores,
  ): Promise<void> {
    // Get latest record and increment
    const latest = await this.getLatest(learnerId);
    const merged: CompetencyScores = {
      c1: this._clamp((latest?.c1 ?? 0.5) + (competencyDelta.c1 ?? 0)),
      c2: this._clamp((latest?.c2 ?? 0.5) + (competencyDelta.c2 ?? 0)),
      c3: this._clamp((latest?.c3 ?? 0.5) + (competencyDelta.c3 ?? 0)),
      c4: this._clamp((latest?.c4 ?? 0.5) + (competencyDelta.c4 ?? 0)),
      c5: this._clamp((latest?.c5 ?? 0.5) + (competencyDelta.c5 ?? 0)),
    };

    await prisma.competencyRecord.create({
      data: { learnerId, source: 'simulation', moduleId, ...merged },
    });
  }

  /** Get the most recent competency record for a learner */
  async getLatest(learnerId: string) {
    return prisma.competencyRecord.findFirst({
      where:   { learnerId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  /** Get full competency trajectory for longitudinal analysis */
  async getTrajectory(learnerId: string) {
    return prisma.competencyRecord.findMany({
      where:   { learnerId },
      orderBy: { recordedAt: 'asc' },
      select: {
        recordedAt: true, source: true, moduleId: true,
        c1: true, c2: true, c3: true, c4: true, c5: true, composite: true,
      },
    });
  }

  private _clamp(v: number): number {
    return Math.max(0, Math.min(1, v));
  }
}
