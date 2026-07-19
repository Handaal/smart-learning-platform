import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  FlaskConical,
  Layers3,
  LineChart,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '@/i18n';
import styles from './ResearchAdminHome.module.css';

type WorkspaceArea = {
  title: string;
  description: string;
  href: string;
  icon: 'Layers3' | 'FlaskConical' | string;
};

const ICONS = {
  Layers3,
  FlaskConical,
} as const;

/** Rotating accent identities so the feature tiles read as distinct, organized sections. */
const CARD_ACCENTS = ['teal', 'indigo', 'coral', 'amber'] as const;

type ReportChartType = 'bars' | 'line' | 'matrix' | 'table' | 'timeline' | 'scatter';

const CHART_ICON_MAP: Record<ReportChartType, LucideIcon> = {
  bars:     BarChart3,
  line:     LineChart,
  matrix:   ScanFace,
  table:    Activity,
  timeline: Layers3,
  scatter:  ArrowLeftRight,
};

type ReportCard = {
  title: string;
  href: string;
  chart: ReportChartType;
  shows: string;
  explains: string;
  callouts: string[];
};

const REPORT_CARDS_AR: ReportCard[] = [
  {
    title: 'لوحة النظرة العامة',
    href: '/research-admin/reports#overview',
    chart: 'bars',
    shows: 'المشاركون، والإكمال، وخط الأساس العام للتكيف والجاهزية.',
    explains: 'تُستخدم كبداية للعرض وتثبيت السياق العام.',
    callouts: ['حجم العينة', 'خط الإكمال', 'تغطية التكيف'],
  },
  {
    title: 'تحليلات تقدم المتعلمين',
    href: '/research-admin/reports#progress',
    chart: 'line',
    shows: 'مسار التقدم والإيقاع واستمرارية الجلسات عبر الزمن.',
    explains: 'توضح أين يتسارع أو يتباطأ مسار التعلم.',
    callouts: ['اتجاه التقدم', 'إيقاع الجلسات', 'نقطة التباطؤ'],
  },
  {
    title: 'الاختبار القبلي/البعدي',
    href: '/research-admin/reports#prepost',
    chart: 'bars',
    shows: 'النتائج القبلية/البعدية المتطابقة وفروق الكسب بين المجموعات.',
    explains: 'يعرض أثر التعلم والتحسن بين البداية والنهاية.',
    callouts: ['نتائج قبلية/بعدية', 'فروق الكسب', 'الصفوف المطابقة'],
  },
  {
    title: 'ملخص الاستشعار الانفعالي',
    href: '/research-admin/reports#emotions',
    chart: 'matrix',
    shows: 'الحالات المهيمنة وانتشار الثقة وكثافة الأحداث للمجموعة التجريبية.',
    explains: 'يمهّد لقراءة الخط الزمني الانفعالي قبل التفسير التفصيلي.',
    callouts: ['الحالة المهيمنة', 'انتشار الثقة', 'كثافة الأحداث'],
  },
  {
    title: 'فعالية التدخلات',
    href: '/research-admin/reports#interventions',
    chart: 'table',
    shows: 'سبب التفعيل، ونوع التدخل، واستجابة المتعلم، والتغير بعد التدخل.',
    explains: 'يبين متى كان التدخل مفيدًا وكيف أثّر على المتابعة.',
    callouts: ['مصدر التفعيل', 'استجابة المتعلم', 'تغير النتيجة'],
  },
  {
    title: 'تفاصيل جلسة المشارك',
    href: '/research-admin/reports#participant-detail',
    chart: 'timeline',
    shows: 'تسلسل الجلسة خطوة بخطوة لمشارك واحد مع التدخلات وفترات الرجوع للأداء فقط.',
    explains: 'مفيد لعرض حالة فردية أو تتبع تقني دقيق.',
    callouts: ['تسلسل الأحداث', 'تحولات الحالة', 'أثر التدخل'],
  },
  {
    title: 'مقارنة المجموعات',
    href: '/research-admin/reports#comparison',
    chart: 'line',
    shows: 'الفروق العامة بين المجموعة الضابطة والتجريبية في التقدم والمكسب.',
    explains: 'تدعم المقارنة البحثية الأساسية بين المجموعتين.',
    callouts: ['فجوة المجموعات', 'اتجاه المقارنة', 'فرق الأثر'],
  },
  {
    title: 'الانفعال مقابل الأداء',
    href: '/research-admin/reports#emotion-performance',
    chart: 'scatter',
    shows: 'العلاقة بين الحالة الوجدانية ونتائج الأداء أو الإكمال.',
    explains: 'تساعد في تفسير أثر العبء الوجداني على النتائج.',
    callouts: ['عناقيد الأداء', 'إشارات التعثر', 'أثر التركيز'],
  },
];

const REPORT_CARDS_EN: ReportCard[] = [
  {
    title: 'Overview Dashboard',
    href: '/research-admin/reports#overview',
    chart: 'bars',
    shows: 'Participants, completion, and overall adaptive readiness indicators.',
    explains: 'Use this first to establish the research context.',
    callouts: ['Population size', 'Completion baseline', 'Adaptive coverage'],
  },
  {
    title: 'Learner Progress Analytics',
    href: '/research-admin/reports#progress',
    chart: 'line',
    shows: 'Progress trajectory, pacing, and continuity across sessions.',
    explains: 'Highlights where the learning flow accelerates or slows down.',
    callouts: ['Progress trend', 'Session rhythm', 'Slowdown points'],
  },
  {
    title: 'Pre/Post Assessment',
    href: '/research-admin/reports#prepost',
    chart: 'bars',
    shows: 'Matched pre/post outcomes and gain differences by group.',
    explains: 'Shows learning improvement from baseline to endline.',
    callouts: ['Pre/Post rows', 'Gain delta', 'Matched records'],
  },
  {
    title: 'Emotion Sensing Summary',
    href: '/research-admin/reports#emotions',
    chart: 'matrix',
    shows: 'Dominant states, confidence spread, and event density for the experimental group.',
    explains: 'Introduces the affective profile before timeline analysis.',
    callouts: ['Dominant state', 'Confidence spread', 'Event density'],
  },
  {
    title: 'Intervention Effectiveness',
    href: '/research-admin/reports#interventions',
    chart: 'table',
    shows: 'Trigger reason, intervention type, learner action, and post-event change.',
    explains: 'Shows when an intervention helped and what changed after it.',
    callouts: ['Trigger source', 'Learner action', 'Outcome change'],
  },
  {
    title: 'Participant Session Detail',
    href: '/research-admin/reports#participant-detail',
    chart: 'timeline',
    shows: 'Step-by-step session sequence for one learner, including fallback periods.',
    explains: 'Useful for case-based walkthroughs and detailed debugging.',
    callouts: ['Event order', 'State shifts', 'Intervention trace'],
  },
  {
    title: 'Group Comparison',
    href: '/research-admin/reports#comparison',
    chart: 'line',
    shows: 'Overall differences between the control and experimental groups.',
    explains: 'Supports the core between-group comparison in the study.',
    callouts: ['Cohort gap', 'Trend comparison', 'Effect delta'],
  },
  {
    title: 'Emotion vs Performance',
    href: '/research-admin/reports#emotion-performance',
    chart: 'scatter',
    shows: 'Relationship between learner state burden and performance outcomes.',
    explains: 'Helps interpret how affective burden relates to results.',
    callouts: ['Performance clusters', 'Struggle signals', 'Focus effect'],
  },
];

function ReportMiniChart({ type }: { type: ReportChartType }) {
  if (type === 'bars') {
    return (
      <div className={styles.reportBars} aria-hidden>
        <span style={{ height: '58%' }} />
        <span style={{ height: '42%' }} />
        <span style={{ height: '76%' }} />
        <span style={{ height: '49%' }} />
        <span style={{ height: '28%' }} />
      </div>
    );
  }

  if (type === 'line') {
    return (
      <svg viewBox="0 0 200 80" className={styles.reportSvg} aria-hidden>
        <polyline points="0,60 30,46 66,54 98,30 132,38 164,24 200,16" className={styles.reportLine} />
        <polyline points="0,66 30,58 66,50 98,46 132,40 164,34 200,28" className={styles.reportLineSoft} />
      </svg>
    );
  }

  if (type === 'matrix') {
    return (
      <div className={styles.reportMatrix} aria-hidden>
        {[0.2, 0.55, 0.38, 0.72, 0.4, 0.66, 0.3, 0.5, 0.78, 0.44, 0.6, 0.26].map((value, index) => (
          <span key={index} style={{ opacity: value }} />
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={styles.reportTable} aria-hidden>
        {[0, 1, 2, 3].map((row) => (
          <div key={row}>
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'timeline') {
    return (
      <div className={styles.reportTimeline} aria-hidden>
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <svg viewBox="0 0 200 86" className={styles.reportSvg} aria-hidden>
      <circle cx="22" cy="60" r="5" className={styles.reportDotSoft} />
      <circle cx="52" cy="48" r="6" className={styles.reportDot} />
      <circle cx="82" cy="54" r="5" className={styles.reportDot} />
      <circle cx="112" cy="34" r="5" className={styles.reportDotSoft} />
      <circle cx="142" cy="28" r="6" className={styles.reportDot} />
      <circle cx="172" cy="16" r="7" className={styles.reportDot} />
    </svg>
  );
}

export default function ResearchAdminHome() {
  const { t, tm, isRtl } = useI18n();
  const workspaceAreas = tm<WorkspaceArea[]>('research.home.areas', []);
  const summaryItems = tm<string[]>('research.home.summaryItems', []);
  const reportCards = isRtl ? REPORT_CARDS_AR : REPORT_CARDS_EN;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{t('research.home.eyebrow')}</p>
          <h1>{t('research.home.title')}</h1>
          <p className={styles.lead}>{t('research.home.lead')}</p>
        </div>
        <div className={styles.heroBadge}>
          <ShieldCheck size={18} />
          <span>{t('research.home.badge')}</span>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={`${styles.card} card`} data-accent={CARD_ACCENTS[0]}>
          <div className={styles.iconWrap}>
            <Users size={18} />
          </div>
          <h2>{t('research.home.userManagementCardTitle')}</h2>
          <p>{t('research.home.userManagementCardDescription')}</p>
          <Link to="/research-admin/access" className={styles.link}>
            {t('research.home.openManagementPanel')}
            <ArrowRight size={14} style={isRtl ? { transform: 'rotate(180deg)' } : undefined} />
          </Link>
        </article>

        {workspaceAreas.map((area, index) => {
          const Icon = ICONS[area.icon as keyof typeof ICONS] ?? Layers3;
          const accent = CARD_ACCENTS[(index + 1) % CARD_ACCENTS.length];
          return (
            <article key={area.href} className={`${styles.card} card`} data-accent={accent}>
              <div className={styles.iconWrap}>
                <Icon size={18} />
              </div>
              <h2>{area.title}</h2>
              <p>{area.description}</p>
              <Link to={area.href} className={styles.link}>
                {t('research.home.openWorkspace')}
                <ArrowRight size={14} style={isRtl ? { transform: 'rotate(180deg)' } : undefined} />
              </Link>
            </article>
          );
        })}
      </section>

      <section className={`${styles.reportShowcase} card`}>
        <div className={styles.reportShowcaseHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{t('research.home.reportCatalogEyebrow')}</p>
            <h2>{t('research.home.reportCatalogTitle')}</h2>
            <p className={styles.reportShowcaseLead}>{t('research.home.reportCatalogLead')}</p>
          </div>
          <Link to="/research-admin/reports#overview" className={styles.sectionCta}>
            {t('research.home.openReportsPage')}
            <ArrowRight size={14} style={isRtl ? { transform: 'rotate(180deg)' } : undefined} />
          </Link>
        </div>

        <div className={styles.reportGrid}>
          {reportCards.map((report, index) => {
            const Icon = CHART_ICON_MAP[report.chart] ?? ArrowLeftRight;
            const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];

            return (
              <article key={report.title} className={styles.reportCard} data-accent={accent}>
                <header className={styles.reportCardHead}>
                  <div className={styles.reportIconWrap}>
                    <Icon size={16} />
                  </div>
                  <h3>{report.title}</h3>
                </header>
                <div className={styles.reportPreviewBox}>
                  <ReportMiniChart type={report.chart} />
                </div>
                <div className={styles.reportCopy}>
                  <p>{report.shows}</p>
                </div>
                <ul className={styles.reportCallouts}>
                  {report.callouts.map((callout) => (
                    <li key={callout}>{callout}</li>
                  ))}
                </ul>
                <Link to={report.href} className={styles.link}>
                  {t('research.home.openThisReport')}
                  <ArrowRight size={14} style={isRtl ? { transform: 'rotate(180deg)' } : undefined} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className={`${styles.summary} card`}>
        <div className={styles.summaryHeader}>
          <Sparkles size={16} />
          <h3>{t('research.home.summaryTitle')}</h3>
        </div>
        <div className={styles.summaryList}>
          {summaryItems.map((item, index) => (
            <div key={item}>
              {index === 0 ? <BookOpenCheck size={16} /> : index === 1 ? <Layers3 size={16} /> : <FlaskConical size={16} />}
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
