import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, ShieldCheck } from 'lucide-react';
import { settingsApi, type ConsentContent } from '@/services/api';
import { useI18n } from '@/i18n';
import styles from './ConsentSettingsPage.module.css';

export default function ConsentSettingsPage() {
  const { direction } = useI18n();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ConsentContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const consentQuery = useQuery({
    queryKey: ['registration-consent'],
    queryFn: () => settingsApi.getConsent(),
  });

  useEffect(() => {
    if (consentQuery.data?.data && !draft) setDraft(consentQuery.data.data);
  }, [consentQuery.data, draft]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    setSaved(false);
    try {
      await settingsApi.updateConsent(draft);
      await queryClient.invalidateQueries({ queryKey: ['registration-consent'] });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function update(patch: Partial<ConsentContent>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setSaved(false);
  }

  return (
    <div className={styles.page} dir={direction}>
      <header className={styles.hero}>
        <div className={styles.heroIcon}>
          <ShieldCheck size={22} />
        </div>
        <div>
          <h1>نص الموافقة والشروط</h1>
          <p>يتحكم هذا النص في نافذة الموافقة التي تظهر للمتدرب عند إنشاء حساب جديد.</p>
        </div>
      </header>

      {!draft ? (
        <div className={`card ${styles.card}`}>جاري التحميل...</div>
      ) : (
        <section className={`card ${styles.card}`}>
          <label className={styles.field}>
            <span>العنوان</span>
            <input className="input" value={draft.title} onChange={(e) => update({ title: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span>المقدمة</span>
            <textarea className="input" rows={3} value={draft.intro} onChange={(e) => update({ intro: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span>بنود الموافقة (بند في كل سطر)</span>
            <textarea className="input" rows={6} value={draft.body} onChange={(e) => update({ body: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span>رسالة الرفض</span>
            <input className="input" value={draft.declineNote} onChange={(e) => update({ declineNote: e.target.value })} />
          </label>
          <div className={styles.actions}>
            {saved ? <span className={styles.savedNote}>تم الحفظ بنجاح</span> : null}
            <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>
              <Save size={16} />
              {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
