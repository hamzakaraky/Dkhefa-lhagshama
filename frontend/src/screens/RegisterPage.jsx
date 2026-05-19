import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'

export default function RegisterPage() {
  const { t, lang } = useLanguage()
  const { register } = useAuth()
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
    if (password.length < 6) { setError(a.passwordTooShort); return }
    if (password !== confirm) { setError(a.passwordMismatch); return }

    setSubmitting(true)
    try {
      await register(email, password)
      const next = typeof router.query.next === 'string' ? router.query.next : '/'
      router.push(next)
    } catch (err) {
      const msg = err && err.message ? String(err.message) : ''
      if (msg.includes('email-already-in-use')) setError(a.emailInUse)
      else setError(a.error)
      setSubmitting(false)
    }
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
        <form onSubmit={onSubmit} className="card" style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>
            {a.email}
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>
            {a.password}
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>
            {a.confirmPassword}
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="form-input"
            />
          </label>
          {error && <div style={{ color: 'var(--ember)', fontSize: 13.5 }}>{error}</div>}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ marginTop: 4 }}
          >
            {submitting ? a.submitting : a.submit}
          </button>
          <div style={{ fontSize: 13.5, textAlign: 'center', color: 'var(--ink-2)', marginTop: 4 }}>
            {a.haveAccount}{' '}
            <Link href="/login" style={{ color: 'var(--ember)', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              {a.loginLink}
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
