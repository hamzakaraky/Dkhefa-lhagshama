/**
 * RegisterPage — Beneficiary / Volunteer tab toggle.
 *
 * Tab "Beneficiary" (default): original single-step sign-up → calls
 *   Firebase createUser + POST /api/auth/register (sets `beneficiary` claim).
 *
 * Tab "Volunteer": two-step flow
 *   Step 1 — email + password (same Firebase sign-up)
 *   Step 2 — volunteer details form → POST /api/volunteers/apply
 *   On success → redirect to /register/volunteer/thanks
 *
 * Issue #69.
 */
import { useState } from 'react'
import { Check, X as XIcon, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { validateRedirect } from '../utils/validateRedirect'
import { apiFetch } from '../lib/apiClient'

// ── Shared input style ────────────────────────────────────────────────────────
const inputStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13.5,
  color: 'var(--ink)',
  fontWeight: 500,
}

// ── Small checkbox component ──────────────────────────────────────────────────
function Checkbox({ checked, onChange, label }) {
  return (
    <label className="consent-row">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

// ── Password rule row (#85 visual checklist) ─────────────────────────────────
function PwCheck({ ok, label }) {
  return (
    <div className={`pw-check${ok ? ' is-ok' : ''}`}>
      {ok ? <Check size={13} strokeWidth={3} /> : <XIcon size={13} strokeWidth={3} />}
      <span>{label}</span>
    </div>
  )
}

// ── Tab toggle ────────────────────────────────────────────────────────────────
function TabToggle({ active, labels, onChange }) {
  return (
    <div className="seg" role="tablist" style={{ marginBottom: 20 }}>
      {['beneficiary', 'volunteer'].map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={active === tab}
          onClick={() => onChange(tab)}
          className={`seg-btn${active === tab ? ' is-active' : ''}`}
        >
          {labels[tab]}
        </button>
      ))}
    </div>
  )
}

// ── BENEFICIARY FORM (original flow) ─────────────────────────────────────────
function BeneficiaryForm({ t }) {
  const { register } = useAuth()
  const { toast } = useApp()
  const router = useRouter()
  const a = t.auth.register

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    // #85 — password policy: min 8 chars + ≥1 digit
    if (password.length < 8) { setError(a.passwordTooShort); return }
    if (!/\d/.test(password)) { setError(a.passwordNoDigit); return }
    if (password !== confirm) { setError(a.passwordMismatch); return }

    setSubmitting(true)
    try {
      await register(email, password)
      // #86 — auth.ts already sent the verification email; surface it as a toast
      toast(a.verifyEmailSent, 'info')
      // #88 — validate the `next` param before pushing
      const safe = validateRedirect(router.query.next, '/')
      router.push(safe)
    } catch (err) {
      const msg = err && err.message ? String(err.message) : ''
      if (msg.includes('email-already-in-use')) setError(a.emailInUse)
      else setError(a.error)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <label style={inputStyle}>
        {a.email}
        <input type="email" autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} className="form-input" />
      </label>
      <div style={inputStyle}>
        <label htmlFor="ben-password">{a.password}</label>
        <input id="ben-password" type="password" autoComplete="new-password" required minLength={6}
          value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" />
        {password.length > 0 && (
          <div className="pw-checks" style={{ marginTop: 8 }}>
            <PwCheck ok={password.length >= 8} label={a.pwRuleLength} />
            <PwCheck ok={/\d/.test(password)} label={a.pwRuleDigit} />
          </div>
        )}
      </div>
      <label style={inputStyle}>
        {a.confirmPassword}
        <input type="password" autoComplete="new-password" required minLength={6}
          value={confirm} onChange={(e) => setConfirm(e.target.value)} className="form-input" />
      </label>
      {error && <div className="form-error"><AlertCircle size={12} /><span>{error}</span></div>}
      <button type="submit" disabled={submitting} className={`btn btn-primary${submitting ? ' is-loading' : ''}`} aria-busy={submitting} style={{ marginTop: 4 }}>
        {submitting ? a.submitting : a.submit}
      </button>
      <div style={{ fontSize: 13.5, textAlign: 'center', color: 'var(--ink-2)', marginTop: 4 }}>
        {a.haveAccount}{' '}
        <Link href="/login" style={{ color: 'var(--ember)', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
          {a.loginLink}
        </Link>
      </div>
    </form>
  )
}

// ── VOLUNTEER FORM — step 1 (account) ────────────────────────────────────────
function VolunteerStep1({ v, a, onNext }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError(a.passwordTooShort); return }
    if (password !== confirm) { setError(a.passwordMismatch); return }
    onNext({ email, password })
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, marginBottom: -4 }}>
        {v.step1Title}
      </div>
      <label style={inputStyle}>
        {a.email}
        <input type="email" autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} className="form-input" />
      </label>
      <label style={inputStyle}>
        {a.password}
        <input type="password" autoComplete="new-password" required minLength={6}
          value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" />
      </label>
      <label style={inputStyle}>
        {a.confirmPassword}
        <input type="password" autoComplete="new-password" required minLength={6}
          value={confirm} onChange={(e) => setConfirm(e.target.value)} className="form-input" />
      </label>
      {error && <div className="form-error"><AlertCircle size={12} /><span>{error}</span></div>}
      <button type="submit" className="btn btn-primary" style={{ marginTop: 4 }}>
        {v.nextStep}
      </button>
      <div style={{ fontSize: 13.5, textAlign: 'center', color: 'var(--ink-2)', marginTop: 4 }}>
        {a.haveAccount}{' '}
        <Link href="/login" style={{ color: 'var(--ember)', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
          {a.loginLink}
        </Link>
      </div>
    </form>
  )
}

// ── VOLUNTEER FORM — step 2 (details) ────────────────────────────────────────
function VolunteerStep2({ v, a, accountData, onBack }) {
  const { register } = useAuth()
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [profession, setProfession] = useState('')
  const [selectedAreas, setSelectedAreas] = useState([])
  const [languagesRaw, setLanguagesRaw] = useState('')
  const [availability, setAvailability] = useState('2-4')
  const [motivation, setMotivation] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toggleArea = (area) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (selectedAreas.length === 0) { setError(v.minOneArea); return }
    const langs = languagesRaw.split(',').map((s) => s.trim()).filter(Boolean)
    if (langs.length === 0) { setError(v.minOneLang); return }
    if (!consent) { setError(v.consentRequired); return }

    setSubmitting(true)
    try {
      // Step A: Firebase Auth sign-up + set beneficiary claim (same as beneficiary tab)
      // The admin will later promote to 'volunteer' after reviewing the application.
      await register(accountData.email, accountData.password)

      // Step B: POST volunteer application
      const res = await apiFetch('/api/volunteers/apply', {
        method: 'POST',
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          email: accountData.email,
          city,
          profession,
          areasOfHelp: selectedAreas,
          languages: langs,
          availability,
          motivation,
          consent: true,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? 'apply_failed')
      }

      router.push('/register/volunteer/thanks')
    } catch (err) {
      const msg = err && err.message ? String(err.message) : ''
      if (msg.includes('email-already-in-use')) setError(a.emailInUse)
      else setError(a.error)
      setSubmitting(false)
    }
  }

  const availOptions = [
    { value: '2-4', label: v.avail24 },
    { value: '4-8', label: v.avail48 },
    { value: '8+',  label: v.avail8plus },
  ]

  return (
    <form onSubmit={submit} className="card" style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, marginBottom: -4 }}>
        {v.step2Title}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <label style={inputStyle}>
          {v.firstName}
          <input type="text" required value={firstName}
            onChange={(e) => setFirstName(e.target.value)} className="form-input" />
        </label>
        <label style={inputStyle}>
          {v.lastName}
          <input type="text" required value={lastName}
            onChange={(e) => setLastName(e.target.value)} className="form-input" />
        </label>
      </div>

      <label style={inputStyle}>
        {v.phone}
        <input type="tel" required value={phone}
          onChange={(e) => setPhone(e.target.value)} className="form-input" />
      </label>

      <label style={inputStyle}>
        {v.city}
        <input type="text" required value={city}
          onChange={(e) => setCity(e.target.value)} className="form-input" />
      </label>

      <label style={inputStyle}>
        {v.profession}
        <input type="text" placeholder={v.professionPH} value={profession}
          onChange={(e) => setProfession(e.target.value)} className="form-input" />
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{v.areasOfHelp}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {v.areasList.map((area) => {
            const on = selectedAreas.includes(area)
            return (
              <button
                key={area}
                type="button"
                aria-pressed={on}
                onClick={() => toggleArea(area)}
                className={`opt-pill${on ? ' is-on' : ''}`}
                style={{ borderRadius: 999 }}
              >
                {on && <Check size={13} strokeWidth={3} />}
                {area}
              </button>
            )
          })}
        </div>
      </div>

      <label style={inputStyle}>
        {v.languages}
        <input type="text" placeholder={v.languagesPH} value={languagesRaw}
          onChange={(e) => setLanguagesRaw(e.target.value)} className="form-input" />
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{v.availability}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {availOptions.map((opt) => (
            <label key={opt.value} className={`opt-pill${availability === opt.value ? ' is-on' : ''}`}>
              <input type="radio" name="availability" value={opt.value}
                checked={availability === opt.value}
                onChange={() => setAvailability(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <label style={inputStyle}>
        {v.motivation}
        <textarea rows={3} placeholder={v.motivationPH} value={motivation}
          onChange={(e) => setMotivation(e.target.value)} className="form-input"
          style={{ resize: 'vertical', minHeight: 72 }} />
      </label>

      <Checkbox checked={consent} onChange={setConsent} label={v.consent} />

      {error && <div className="form-error"><AlertCircle size={12} /><span>{error}</span></div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button type="button" onClick={onBack} className="btn btn-outline" style={{ flex: '0 0 auto' }}>
          {v.backStep}
        </button>
        <button type="submit" disabled={submitting} className={`btn btn-primary${submitting ? ' is-loading' : ''}`} aria-busy={submitting} style={{ flex: 1 }}>
          {submitting ? v.submitting : v.submit}
        </button>
      </div>
    </form>
  )
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { t, lang } = useLanguage()
  const v = t.volunteerSignup
  const a = t.auth.register

  const [tab, setTab] = useState('beneficiary') // 'beneficiary' | 'volunteer'
  const [volStep, setVolStep] = useState(1)      // 1 | 2
  const [accountData, setAccountData] = useState(null) // { email, password }

  const tabLabels = {
    beneficiary: v.tabBeneficiary,
    volunteer:   v.tabVolunteer,
  }

  const switchTab = (next) => {
    setTab(next)
    setVolStep(1)
    setAccountData(null)
  }

  return (
    <div className="auth-grid" style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'grid',
      gridTemplateColumns: '1fr',
      background: 'var(--paper)',
    }}>
      <aside style={{
        background: 'var(--sky-2)',
        padding: '64px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px',
      }}>
        <img
          src="/logo.jpg"
          alt={lang === 'he' ? 'דחיפה להגשמה' : 'Push for Fulfillment'}
          width={96}
          height={96}
          style={{ borderRadius: '50%', objectFit: 'cover', boxShadow: 'var(--shadow)' }}
        />
        <div className="section-eyebrow" style={{ textAlign: 'center' }}>
          {lang === 'he' ? 'הצטרפות לקהילה' : 'Join the community'}
        </div>
        <h1 className="section-display" style={{
          fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
          textAlign: 'center',
          maxWidth: '24rem',
          margin: 0,
        }}>
          {a.title}
        </h1>
        {a.subtitle && (
          <p className="section-lede" style={{ textAlign: 'center', margin: '0 auto', maxWidth: '26rem' }}>
            {a.subtitle}
          </p>
        )}
      </aside>

      <main style={{
        padding: '64px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        maxWidth: '480px',
        width: '100%',
        margin: '0 auto',
      }}>
        <TabToggle active={tab} labels={tabLabels} onChange={switchTab} />

        {tab === 'beneficiary' && (
          <BeneficiaryForm t={t} />
        )}

        {tab === 'volunteer' && volStep === 1 && (
          <VolunteerStep1
            v={v}
            a={a}
            onNext={(data) => { setAccountData(data); setVolStep(2) }}
          />
        )}

        {tab === 'volunteer' && volStep === 2 && (
          <VolunteerStep2
            v={v}
            a={a}
            accountData={accountData}
            onBack={() => setVolStep(1)}
          />
        )}
      </main>
    </div>
  )
}
