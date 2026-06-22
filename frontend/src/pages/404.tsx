import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import styles from './404.module.css'

export default function Custom404() {
  const { t, isRTL } = useLanguage()
  // Home points "back" into the app; mirror the arrow for RTL.
  const HomeArrow = isRTL ? ArrowRight : ArrowLeft
  return (
    <main className={`page-enter ${styles.main}`}>
      <div
        role="status"
        aria-live="polite"
        aria-labelledby="notfound-title"
        className={styles.panel}
      >
        <span className={`eyebrow ${styles.eyebrow}`}>
          {t.notFound.eyebrow}
        </span>
        <span aria-hidden="true" className={styles.bigCode}>
          404
        </span>
        <span className={`gold-line center ${styles.divider}`} aria-hidden="true" />
        <h1 id="notfound-title" className={styles.title}>
          {t.notFound.title}
        </h1>
        <p className={`section-lede ${styles.lede}`}>
          {t.notFound.subtitle}
        </p>
        <Link href="/" className="btn btn-primary btn-lg">
          <HomeArrow size={18} strokeWidth={2} aria-hidden="true" />
          {t.notFound.btn}
        </Link>
      </div>
    </main>
  )
}
