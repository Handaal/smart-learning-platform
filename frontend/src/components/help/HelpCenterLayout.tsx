import { type ReactNode } from 'react';
import { BookOpenCheck, CheckCircle2, HelpCircle, Lightbulb, ListChecks, Milestone } from 'lucide-react';
import { useI18n } from '@/i18n';
import styles from './HelpCenterLayout.module.css';

export type HelpContentCard = {
  title: string;
  description: string;
};

export type HelpFaqItem = {
  question: string;
  answer: string;
  category?: string;
};

export type HelpSection = {
  id: string;
  title: string;
  summary: string;
  steps?: string[];
  points?: string[];
  cards?: HelpContentCard[];
};

type Props = {
  eyebrow: string;
  title: string;
  lead: string;
  introPoints?: string[];
  heroHighlights?: string[];
  renderHeroExtra?: ReactNode;
  sections: HelpSection[];
  faqTitle: string;
  faqItems: HelpFaqItem[];
  tipsTitle?: string;
  tips?: string[];
  tipsVariant?: 'default' | 'checklist';
  renderSectionExtra?: (section: HelpSection) => ReactNode;
};

const sectionIcons = [BookOpenCheck, ListChecks, Milestone, HelpCircle, Lightbulb, CheckCircle2];

export default function HelpCenterLayout({
  eyebrow,
  title,
  lead,
  introPoints = [],
  heroHighlights = [],
  renderHeroExtra,
  sections,
  faqTitle,
  faqItems,
  tipsTitle,
  tips = [],
  tipsVariant = 'default',
  renderSectionExtra,
}: Props) {
  const { t } = useI18n();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1>{title}</h1>
          <p className={styles.lead}>{lead}</p>

          {introPoints.length ? (
            <ul className={styles.introList}>
              {introPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          ) : null}

          {heroHighlights.length ? (
            <div className={styles.heroHighlights}>
              {heroHighlights.map((highlight) => (
                <span key={highlight} className={styles.heroPill}>
                  {highlight}
                </span>
              ))}
            </div>
          ) : null}

          {renderHeroExtra ? <div className={styles.heroExtra}>{renderHeroExtra}</div> : null}
        </div>

        <aside className={styles.quickNav}>
          <h2>{t('help.layout.quickNavigation')}</h2>
          <div className={styles.quickNavLinks}>
            {sections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`} className={styles.quickNavLink}>
                <span className={styles.quickNavOrder}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.quickNavLabel}>{section.title}</span>
              </a>
            ))}
            <a href="#faq" className={styles.quickNavLink}>
              <span className={styles.quickNavOrder}>FAQ</span>
              <span className={styles.quickNavLabel}>{faqTitle}</span>
            </a>
            {tips.length ? (
              <a href="#tips" className={styles.quickNavLink}>
                <span className={styles.quickNavOrder}>TIP</span>
                <span className={styles.quickNavLabel}>{tipsTitle ?? t('help.layout.tipsTitleFallback')}</span>
              </a>
            ) : null}
          </div>
        </aside>
      </section>

      <div className={styles.sections}>
        {sections.map((section, index) => {
          const Icon = sectionIcons[index % sectionIcons.length];

          return (
            <section key={section.id} id={section.id} className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.iconWrap}>
                  <Icon size={18} />
                </span>
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.summary}</p>
                </div>
              </div>

              {section.steps?.length ? (
                <ol className={styles.stepList}>
                  {section.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : null}

              {section.points?.length ? (
                <ul className={styles.pointList}>
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              ) : null}

              {section.cards?.length ? (
                <div className={styles.cardGrid}>
                  {section.cards.map((card) => (
                    <article key={card.title} className={styles.infoCard}>
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                    </article>
                  ))}
                </div>
              ) : null}

              {renderSectionExtra ? (
                <div className={styles.sectionExtra}>
                  {renderSectionExtra(section)}
                </div>
              ) : null}
            </section>
          );
        })}

        <section id="faq" className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.iconWrap}>
              <HelpCircle size={18} />
            </span>
            <div>
              <h2>{faqTitle}</h2>
              <p>{t('help.layout.faqSummary')}</p>
            </div>
          </div>

          <div className={styles.faqList}>
            {faqItems.map((item) => (
              <details key={item.question} className={styles.faqItem}>
                <summary>
                  <span>{item.question}</span>
                  {item.category ? <span className={styles.faqCategory}>{item.category}</span> : null}
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {tips.length ? (
          <section id="tips" className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.iconWrap}>
                <Lightbulb size={18} />
              </span>
              <div>
                <h2>{tipsTitle ?? t('help.layout.tipsTitleFallback')}</h2>
                <p>{t('help.layout.tipsSummary')}</p>
              </div>
            </div>

            <ul className={tipsVariant === 'checklist' ? styles.tipChecklist : styles.pointList}>
              {tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
