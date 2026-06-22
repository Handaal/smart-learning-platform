import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, FlaskConical, Search, ShieldCheck, Trash2, UserCheck, Users } from 'lucide-react';
import { useI18n } from '@/i18n';
import { learnerApi } from '@/services/api';
import { relativeTime } from '@/lib/relativeTime';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import styles from './ResearchAdminUserManagementPage.module.css';

type CohortKey = 'experimental' | 'control';

type GroupRow = {
  cohort: CohortKey;
  label: string;
  emotionTrackingEnabled: boolean;
  learnerCount: number;
};

type LearnerRow = {
  id: string;
  participantId: string;
  cohort: CohortKey;
  groupLabel: string;
  createdAt: string;
  lastActive: string | null;
  isActive: boolean;
  groupEmotionTrackingEnabled: boolean;
  emotionTrackingOverride: boolean | null;
  emotionTrackingEnabled: boolean;
};

type AdminOverview = {
  groups: GroupRow[];
  learners: LearnerRow[];
};

type Copy = {
  eyebrow: string;
  title: string;
  lead: string;
  activeLearners: string;
  pendingApproval: string;
  experimentalGroup: string;
  controlGroup: string;
  emotionTrackerOn: string;
  emotionTrackerOff: string;
  learnersAssigned: (count: number) => string;
  disableGroup: string;
  enableGroup: string;
  learnerAccounts: string;
  learnerAccountsLead: string;
  searchPlaceholder: string;
  allGroups: string;
  experimental: string;
  control: string;
  allStatuses: string;
  statusActive: string;
  statusPending: string;
  loading: string;
  empty: string;
  learner: string;
  group: string;
  account: string;
  emotionTracker: string;
  override: string;
  lastActive: string;
  created: (date: string) => string;
  approve: string;
  deactivate: string;
  enabled: string;
  disabled: string;
  inherit: string;
  forceOn: string;
  forceOff: string;
  forcedOn: string;
  forcedOff: string;
  groupDefault: string;
  never: string;
  unknown: string;
  delete: string;
  confirmDelete: (participantId: string) => string;
  showingCount: (shown: number, total: number) => string;
};

function buildCopy(language: 'ar' | 'en'): Copy {
  if (language === 'ar') {
    return {
      eyebrow: 'إدارة المستخدمين والمجموعات',
      title: 'اعتماد المتعلمين والتحكم في الوصول الانفعالي',
      lead:
        'استخدم هذه الصفحة لتفعيل حسابات الطلاب، وإدارة المجموعتين البحثيتين، وإنشاء استثناءات فردية لتتبع الانفعالات عند الحاجة.',
      activeLearners: 'المتعلمون النشطون',
      pendingApproval: 'بانتظار الاعتماد',
      experimentalGroup: 'المجموعة التجريبية',
      controlGroup: 'المجموعة الضابطة',
      emotionTrackerOn: 'تتبع الانفعالات مفعّل',
      emotionTrackerOff: 'تتبع الانفعالات معطّل',
      learnersAssigned: (count) => `تم إسناد ${count} متعلم`,
      disableGroup: 'تعطيل للمجموعة',
      enableGroup: 'تفعيل للمجموعة',
      learnerAccounts: 'حسابات المتعلمين',
      learnerAccountsLead: 'اعتمد الطلاب، وعدّل الاستثناءات الفردية، أو احذف الحسابات التي لم تعد مطلوبة.',
      searchPlaceholder: 'ابحث بمعرّف المشارك أو اسم المجموعة',
      allGroups: 'كل المجموعات',
      experimental: 'تجريبية',
      control: 'ضابطة',
      allStatuses: 'كل الحالات',
      statusActive: 'نشط',
      statusPending: 'بانتظار الاعتماد',
      loading: 'جاري تحميل إعدادات الوصول...',
      empty: 'لا توجد حسابات مطابقة للمرشح الحالي.',
      learner: 'المتعلم',
      group: 'المجموعة',
      account: 'الحساب',
      emotionTracker: 'تتبع الانفعالات',
      override: 'الاستثناء',
      lastActive: 'آخر نشاط',
      created: (date) => `تم الإنشاء ${date}`,
      approve: 'اعتماد',
      deactivate: 'تعطيل',
      enabled: 'مفعّل',
      disabled: 'معطّل',
      inherit: 'إعداد المجموعة',
      forceOn: 'فرض التفعيل',
      forceOff: 'فرض التعطيل',
      forcedOn: 'مفعّل إجباريًا',
      forcedOff: 'معطّل إجباريًا',
      groupDefault: 'إعداد المجموعة',
      never: 'أبدًا',
      unknown: 'غير معروف',
      delete: 'حذف',
      confirmDelete: (participantId) =>
        `هل تريد حذف المتعلم ${participantId}؟ سيؤدي ذلك إلى إزالة الحساب وسجلات التعلم المرتبطة به.`,
      showingCount: (shown, total) => `عرض ${shown} من ${total}`,
    };
  }

  return {
    eyebrow: 'User & group management',
    title: 'Approve learners and control emotion access',
    lead:
      'Use this page to activate student accounts, manage the two study groups, and override emotion-tracker access per learner when needed.',
    activeLearners: 'Active learners',
    pendingApproval: 'Pending approval',
    experimentalGroup: 'Experimental group',
    controlGroup: 'Control group',
    emotionTrackerOn: 'Emotion tracker on',
    emotionTrackerOff: 'Emotion tracker off',
    learnersAssigned: (count) => `${count} learners assigned`,
    disableGroup: 'Disable for group',
    enableGroup: 'Enable for group',
    learnerAccounts: 'Learner accounts',
    learnerAccountsLead: 'Approve students, adjust individual overrides, or remove accounts that should no longer exist.',
    searchPlaceholder: 'Search by participant ID or group',
    allGroups: 'All groups',
    experimental: 'Experimental',
    control: 'Control',
    allStatuses: 'All statuses',
    statusActive: 'Active',
    statusPending: 'Pending',
    loading: 'Loading access settings...',
    empty: 'No learner accounts match the current filter.',
    learner: 'Learner',
    group: 'Group',
    account: 'Account',
    emotionTracker: 'Emotion tracker',
    override: 'Override',
    lastActive: 'Last active',
    created: (date) => `Created ${date}`,
    approve: 'Approve',
    deactivate: 'Deactivate',
    enabled: 'Enabled',
    disabled: 'Disabled',
    inherit: 'Group default',
    forceOn: 'Force on',
    forceOff: 'Force off',
    forcedOn: 'Forced on',
    forcedOff: 'Forced off',
    groupDefault: 'Group default',
    never: 'Never',
    unknown: 'Unknown',
    delete: 'Delete',
    confirmDelete: (participantId) =>
      `Delete learner ${participantId}? This removes the learner account and related learning records.`,
    showingCount: (shown, total) => `Showing ${shown} of ${total}`,
  };
}

function formatDate(value: string | null, copy: Copy, language: 'ar' | 'en') {
  if (!value) return copy.never;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return copy.unknown;
  return date.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US');
}

function overrideLabel(value: boolean | null, copy: Copy) {
  if (value === true) return copy.forcedOn;
  if (value === false) return copy.forcedOff;
  return copy.groupDefault;
}

export default function ResearchAdminUserManagementPage() {
  const { language } = useI18n();
  const copy = useMemo(() => buildCopy(language), [language]);
  const [search, setSearch] = useState('');
  const [cohortFilter, setCohortFilter] = useState<'all' | CohortKey>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-access-overview'],
    queryFn: learnerApi.getAdminOverview,
  });

  const overview = (data?.data ?? null) as AdminOverview | null;
  const groups = overview?.groups ?? [];
  const learners = overview?.learners ?? [];

  const filteredLearners = useMemo(() => {
    const query = search.trim().toLowerCase();
    return learners.filter((learner) => {
      if (cohortFilter !== 'all' && learner.cohort !== cohortFilter) return false;
      if (statusFilter === 'active' && !learner.isActive) return false;
      if (statusFilter === 'pending' && learner.isActive) return false;
      if (!query) return true;
      return learner.participantId.toLowerCase().includes(query) || learner.groupLabel.toLowerCase().includes(query);
    });
  }, [cohortFilter, learners, search, statusFilter]);

  const pendingCount = learners.filter((learner) => !learner.isActive).length;
  const activeCount = learners.length - pendingCount;

  async function runAction(key: string, action: () => Promise<unknown>) {
    setBusyKey(key);
    try {
      await action();
      await refetch();
    } finally {
      setBusyKey(null);
    }
  }

  async function handleGroupToggle(group: GroupRow) {
    await runAction(`group:${group.cohort}`, () =>
      learnerApi.updateGroupEmotionTracking(group.cohort, !group.emotionTrackingEnabled),
    );
  }

  async function handleAccountToggle(learner: LearnerRow) {
    await runAction(`account:${learner.id}`, () =>
      learnerApi.updateLearnerAccess(learner.id, { isActive: !learner.isActive }),
    );
  }

  async function handleOverrideChange(learnerId: string, value: string) {
    const nextValue = value === 'inherit' ? null : value === 'enabled';
    await runAction(`override:${learnerId}`, () =>
      learnerApi.updateLearnerAccess(learnerId, { emotionTrackingOverride: nextValue }),
    );
  }

  async function handleDelete(learner: LearnerRow) {
    const confirmed = window.confirm(copy.confirmDelete(learner.participantId));
    if (!confirmed) return;
    await runAction(`delete:${learner.id}`, () => learnerApi.deleteLearner(learner.id));
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className={styles.lead}>{copy.lead}</p>
        </div>
        <div className={styles.heroStats}>
          <StatCard icon={UserCheck} value={activeCount} label={copy.activeLearners} tone="success" />
          <StatCard icon={Clock} value={pendingCount} label={copy.pendingApproval} tone="amber" />
        </div>
      </section>

      <section className={styles.groupGrid}>
        {groups.map((group) => {
          const isExperimental = group.cohort === 'experimental';
          const GroupIcon = isExperimental ? FlaskConical : Users;
          return (
            <article
              key={group.cohort}
              className={`card ${styles.groupCard} ${isExperimental ? styles.groupExperimental : styles.groupControl}`}
            >
              <div className={styles.groupHead}>
                <div className={styles.groupHeadMain}>
                  <span className={styles.groupIcon}>
                    <GroupIcon size={20} />
                  </span>
                  <div>
                    <span className={styles.groupLabel}>
                      {isExperimental ? copy.experimentalGroup : copy.controlGroup}
                    </span>
                    <h2>{group.label}</h2>
                  </div>
                </div>
                <span className={`badge ${group.emotionTrackingEnabled ? 'badge-teal' : 'badge-muted'}`}>
                  {group.emotionTrackingEnabled ? copy.emotionTrackerOn : copy.emotionTrackerOff}
                </span>
              </div>
              <p className={styles.groupMeta}>
                <Users size={14} />
                {copy.learnersAssigned(group.learnerCount)}
              </p>
              <button
                type="button"
                className={`btn btn-secondary ${styles.groupAction}`}
                onClick={() => void handleGroupToggle(group)}
                disabled={busyKey === `group:${group.cohort}`}
              >
                {group.emotionTrackingEnabled ? copy.disableGroup : copy.enableGroup}
              </button>
            </article>
          );
        })}
      </section>

      <section className={`card ${styles.managementCard}`}>
        <div className={styles.managementHead}>
          <div>
            <h2>{copy.learnerAccounts}</h2>
            <p>{copy.learnerAccountsLead}</p>
            {!isLoading && learners.length ? (
              <span className={styles.resultCount}>{copy.showingCount(filteredLearners.length, learners.length)}</span>
            ) : null}
          </div>
          <div className={styles.filters}>
            <div className={styles.search}>
              <Search size={16} className={styles.searchIcon} />
              <input
                className="input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.searchPlaceholder}
              />
            </div>
            <select
              className="input"
              value={cohortFilter}
              onChange={(event) => setCohortFilter(event.target.value as 'all' | CohortKey)}
            >
              <option value="all">{copy.allGroups}</option>
              <option value="experimental">{copy.experimental}</option>
              <option value="control">{copy.control}</option>
            </select>
            <select
              className="input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'pending')}
            >
              <option value="all">{copy.allStatuses}</option>
              <option value="active">{copy.statusActive}</option>
              <option value="pending">{copy.statusPending}</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <EmptyState icon={Users} title={copy.loading} />
        ) : !filteredLearners.length ? (
          <EmptyState icon={Users} title={copy.empty} />
        ) : (
          <div className="table-scroll">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{copy.learner}</th>
                  <th>{copy.group}</th>
                  <th>{copy.account}</th>
                  <th>{copy.emotionTracker}</th>
                  <th>{copy.override}</th>
                  <th>{copy.lastActive}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredLearners.map((learner) => (
                  <tr key={learner.id}>
                    <td>
                      <div className={styles.identityCell}>
                        <span className={styles.avatar} aria-hidden="true">
                          {learner.participantId.slice(0, 2).toUpperCase()}
                        </span>
                        <div className={styles.identityText}>
                          <strong>{learner.participantId}</strong>
                          <span>{copy.created(formatDate(learner.createdAt, copy, language))}</span>
                        </div>
                      </div>
                    </td>
                    <td>{learner.groupLabel}</td>
                    <td>
                      <div className={styles.accountCell}>
                        <StatusBadge
                          status={learner.isActive ? 'active' : 'pending'}
                          label={learner.isActive ? copy.statusActive : copy.statusPending}
                        />
                        <button
                          type="button"
                          className={`btn btn-sm ${learner.isActive ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => void handleAccountToggle(learner)}
                          disabled={busyKey === `account:${learner.id}`}
                        >
                          <ShieldCheck size={14} />
                          {learner.isActive ? copy.deactivate : copy.approve}
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${learner.emotionTrackingEnabled ? 'badge-teal' : 'badge-muted'}`}>
                        {learner.emotionTrackingEnabled ? copy.enabled : copy.disabled}
                      </span>
                    </td>
                    <td>
                      <div className={styles.overrideControl}>
                        <select
                          className="input"
                          value={
                            learner.emotionTrackingOverride === null
                              ? 'inherit'
                              : learner.emotionTrackingOverride
                                ? 'enabled'
                                : 'disabled'
                          }
                          onChange={(event) => {
                            void handleOverrideChange(learner.id, event.target.value);
                          }}
                          disabled={busyKey === `override:${learner.id}`}
                        >
                          <option value="inherit">{copy.inherit}</option>
                          <option value="enabled">{copy.forceOn}</option>
                          <option value="disabled">{copy.forceOff}</option>
                        </select>
                        <span className={styles.overrideHint}>{overrideLabel(learner.emotionTrackingOverride, copy)}</span>
                      </div>
                    </td>
                    <td title={formatDate(learner.lastActive, copy, language)}>
                      {relativeTime(learner.lastActive, language) || copy.never}
                    </td>
                    <td className={styles.actionsCell}>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => void handleDelete(learner)}
                        disabled={busyKey === `delete:${learner.id}`}
                      >
                        <Trash2 size={14} />
                        {copy.delete}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
