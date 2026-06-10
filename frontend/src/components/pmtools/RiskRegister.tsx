import { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import styles from './RiskRegister.module.css';

type Likelihood = 1 | 2 | 3 | 4 | 5;
type Impact = 1 | 2 | 3 | 4 | 5;
type RiskStatus = 'open' | 'mitigated' | 'accepted' | 'closed';

interface RiskRow {
  id: string;
  riskDesc: string;
  category: string;
  likelihood: Likelihood;
  impact: Impact;
  mitigation: string;
  owner: string;
  status: RiskStatus;
}

let riskCounter = 1;
const newRiskId = () => `R${String(riskCounter++).padStart(3, '0')}`;

function riskScore(likelihood: number, impact: number) {
  return likelihood * impact;
}

function scoreColor(score: number) {
  if (score >= 15) return '#F87171';
  if (score >= 8) return '#F59E0B';
  return '#10B981';
}

function buildInitialRisks(t: (key: string, fallback?: string) => string): RiskRow[] {
  return [
    {
      id: newRiskId(),
      riskDesc: t('learner.pmTools.risk.items.smeAvailability', 'SME availability falls below 50% during development phase'),
      category: 'Resource',
      likelihood: 4,
      impact: 4,
      mitigation: t('learner.pmTools.risk.items.smeMitigation', 'Identify backup SME and schedule dedicated review blocks weekly'),
      owner: 'PM',
      status: 'open',
    },
    {
      id: newRiskId(),
      riskDesc: t('learner.pmTools.risk.items.scopeChange', 'Client changes scope after storyboard approval'),
      category: 'Scope',
      likelihood: 3,
      impact: 5,
      mitigation: t('learner.pmTools.risk.items.scopeMitigation', 'Include explicit change-control clause and define rework cost'),
      owner: 'PM',
      status: 'open',
    },
    {
      id: newRiskId(),
      riskDesc: t('learner.pmTools.risk.items.lmsIssue', 'LMS integration issues delay final delivery'),
      category: 'Technical',
      likelihood: 2,
      impact: 4,
      mitigation: t('learner.pmTools.risk.items.lmsMitigation', 'Run LMS compatibility check in week 2 of development'),
      owner: 'Developer',
      status: 'mitigated',
    },
  ];
}

export interface RiskRegisterProps {
  onExport?: (risks: RiskRow[]) => void;
}

export default function RiskRegister({ onExport }: RiskRegisterProps) {
  const { t } = useI18n();
  const [risks, setRisks] = useState<RiskRow[]>(() => buildInitialRisks(t));

  const categoryOptions = useMemo(
    () => [
      t('learner.pmTools.risk.categories.scope', 'Scope'),
      t('learner.pmTools.risk.categories.resource', 'Resource'),
      t('learner.pmTools.risk.categories.technical', 'Technical'),
      t('learner.pmTools.risk.categories.budget', 'Budget'),
      t('learner.pmTools.risk.categories.quality', 'Quality'),
      t('learner.pmTools.risk.categories.compliance', 'Compliance'),
      t('learner.pmTools.risk.categories.stakeholder', 'Stakeholder'),
    ],
    [t],
  );

  const statusOptions: RiskStatus[] = ['open', 'mitigated', 'accepted', 'closed'];

  function update<K extends keyof RiskRow>(id: string, field: K, value: RiskRow[K]) {
    setRisks((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function addRisk() {
    setRisks((current) => [
      ...current,
      {
        id: newRiskId(),
        riskDesc: t('learner.pmTools.risk.defaultRisk', 'New risk'),
        category: categoryOptions[0] ?? 'Scope',
        likelihood: 2,
        impact: 2,
        mitigation: '',
        owner: '',
        status: 'open',
      },
    ]);
  }

  function remove(id: string) {
    setRisks((current) => current.filter((row) => row.id !== id));
  }

  const sortedRows = useMemo(
    () => [...risks].sort((left, right) => riskScore(right.likelihood, right.impact) - riskScore(left.likelihood, left.impact)),
    [risks],
  );

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <AlertTriangle size={16} color="var(--color-amber)" />
          <h3 className={styles.title}>{t('learner.pmTools.tabs.risk', 'Risk Register')}</h3>
          <span className={styles.count}>
            {risks.length} {t('learner.pmTools.risk.risks', 'risks')}
          </span>
        </div>

        <div className={styles.headerRight}>
          <button className="btn btn-secondary btn-sm" onClick={addRisk}>
            <Plus size={13} />
            {t('learner.pmTools.risk.addRisk', 'Add risk')}
          </button>
          {onExport ? (
            <button className="btn btn-secondary btn-sm" onClick={() => onExport(risks)}>
              {t('learner.pmTools.risk.exportCsv', 'Export CSV')}
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('learner.pmTools.risk.columns.id', 'ID')}</th>
              <th>{t('learner.pmTools.risk.columns.riskDescription', 'Risk Description')}</th>
              <th>{t('learner.pmTools.risk.columns.category', 'Category')}</th>
              <th title={t('learner.pmTools.risk.columns.likelihoodHint', 'Likelihood 1-5')}>L</th>
              <th title={t('learner.pmTools.risk.columns.impactHint', 'Impact 1-5')}>I</th>
              <th>{t('learner.pmTools.risk.columns.score', 'Score')}</th>
              <th>{t('learner.pmTools.risk.columns.mitigation', 'Mitigation')}</th>
              <th>{t('learner.pmTools.risk.columns.owner', 'Owner')}</th>
              <th>{t('learner.pmTools.risk.columns.status', 'Status')}</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {sortedRows.map((row) => {
              const score = riskScore(row.likelihood, row.impact);
              return (
                <tr key={row.id}>
                  <td className={styles.idCell}>{row.id}</td>
                  <td>
                    <input className={styles.cellInput} value={row.riskDesc} onChange={(event) => update(row.id, 'riskDesc', event.target.value)} />
                  </td>
                  <td>
                    <select className={styles.cellSelect} value={row.category} onChange={(event) => update(row.id, 'category', event.target.value)}>
                      {categoryOptions.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className={styles.numInput}
                      value={row.likelihood}
                      onChange={(event) => update(row.id, 'likelihood', Number(event.target.value) as Likelihood)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className={styles.numInput}
                      value={row.impact}
                      onChange={(event) => update(row.id, 'impact', Number(event.target.value) as Impact)}
                    />
                  </td>
                  <td>
                    <span className={styles.scoreBadge} style={{ background: `${scoreColor(score)}22`, color: scoreColor(score) }}>
                      {score}
                    </span>
                  </td>
                  <td>
                    <input
                      className={styles.cellInput}
                      value={row.mitigation}
                      onChange={(event) => update(row.id, 'mitigation', event.target.value)}
                      placeholder={t('learner.pmTools.risk.mitigationPlaceholder', 'Mitigation strategy...')}
                    />
                  </td>
                  <td>
                    <input
                      className={styles.cellInput}
                      style={{ width: 80 }}
                      value={row.owner}
                      onChange={(event) => update(row.id, 'owner', event.target.value)}
                      placeholder={t('learner.pmTools.risk.ownerPlaceholder', 'Owner')}
                    />
                  </td>
                  <td>
                    <select
                      className={styles.cellSelect}
                      value={row.status}
                      onChange={(event) => update(row.id, 'status', event.target.value as RiskStatus)}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {t(`learner.pmTools.risk.status.${status}`, status)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className={styles.deleteBtn} onClick={() => remove(row.id)} aria-label={t('learner.pmTools.risk.delete', 'Delete')}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
