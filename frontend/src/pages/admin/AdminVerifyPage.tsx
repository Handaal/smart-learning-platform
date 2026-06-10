import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ShieldCheck, AlertTriangle, Lock, Eye, Database, FileText } from 'lucide-react';
import styles from './AdminVerifyPage.module.css';

const VALID_CODES = ['STEP-PHD-2026', 'ADMIN-VERIFY-001']; // Demo codes

export default function AdminVerifyPage() {
  const navigate = useNavigate();
  const verifyAdmin = useAuthStore(s => s.verifyAdmin);
  const isVerified  = useAuthStore(s => s.isVerified);

  const [code, setCode]           = useState('');
  const [consent, setConsent]     = useState(false);
  const [error, setError]         = useState('');
  const [busy, setBusy]           = useState(false);

  // Already verified → redirect
  if (isVerified) {
    navigate('/admin/content');
    return null;
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('Research verification code is required.');
      return;
    }
    if (!consent) {
      setError('You must agree to the data handling policy.');
      return;
    }

    setBusy(true);
    // Simulate API verification delay
    await new Promise(r => setTimeout(r, 800));

    if (VALID_CODES.includes(code.trim().toUpperCase())) {
      verifyAdmin();
      navigate('/admin/content');
    } else {
      setError('Invalid verification code. Contact the principal investigator.');
    }
    setBusy(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.shield}>
          <ShieldCheck size={28} />
        </div>
        <h1 className={styles.title}>Admin Verification</h1>
        <p className={styles.subtitle}>
          Enter your research verification code to access the admin panel.
          All participant data is encrypted and handled per IRB protocol.
        </p>

        <div className={styles.irbBanner}>
          <AlertTriangle size={16} />
          <div>
            <strong>IRB Compliance Notice:</strong> Access to participant data requires 
            active IRB approval (Protocol #STEP-2026-IRB). All exported data will be 
            de-identified and encrypted at rest.
          </div>
        </div>

        <form className={styles.form} onSubmit={handleVerify}>
          <div className={styles.field}>
            <label>Research Verification Code</label>
            <input
              type="password"
              placeholder="STEP-PHD-2026"
              value={code}
              onChange={e => setCode(e.target.value)}
              autoFocus
            />
          </div>

          <label className={styles.consent}>
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
            />
            <span>
              I confirm that I hold valid IRB approval and agree to handle participant 
              data in accordance with the institutional data protection and privacy policy. 
              I understand that all access is logged.
            </span>
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            className={`btn btn-primary btn-lg ${styles.submitBtn}`}
            disabled={busy}
          >
            {busy ? 'Verifying…' : 'Verify & Access Admin Panel'}
          </button>
        </form>

        <div className={styles.features}>
          <div className={styles.feature}><Lock size={14} /> End-to-end encryption</div>
          <div className={styles.feature}><Eye size={14} /> Masked participant IDs</div>
          <div className={styles.feature}><Database size={14} /> Audit-logged access</div>
          <div className={styles.feature}><FileText size={14} /> IRB-compliant exports</div>
        </div>
      </div>
    </div>
  );
}
