import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Gamepad2, Lock, ShieldCheck, User } from 'lucide-react';
import { t } from '../lib/strings.js';
import { useAuth } from '../providers/AuthProvider.jsx';
import { useSettings } from '../providers/SettingsProvider.jsx';
import { apiError } from '../lib/http.js';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Logo } from '../components/layout/Logo.jsx';
import { FullPageLoader } from '../components/ui/Switch.jsx';

export function LoginPage() {
  const { login, isAuthenticated, isBooting } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    document.title = `تسجيل الدخول — ${settings.brand?.name || 'HAMATRIX'}`;
  }, [settings.brand?.name]);

  if (isBooting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <FullPageLoader label="جارٍ التحقق من الجلسة…" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={location.state?.from || '/'} replace />;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const nextErrors = {};
    if (!form.username.trim()) nextErrors.username = 'أدخل اسم المستخدم';
    if (!form.password) nextErrors.password = 'أدخل كلمة المرور';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login({ username: form.username.trim(), password: form.password });
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      const info = apiError(err);
      setError(
        info.code === 'ACCOUNT_LOCKED'
          ? t.auth.locked
          : info.code === 'INVALID_CREDENTIALS'
            ? t.auth.invalid
            : info.message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative grid min-h-screen bg-bg lg:grid-cols-[1.05fr_0.95fr]">
      <div className="ambient-bg relative hidden flex-col justify-between overflow-hidden border-l border-line/50 p-10 lg:flex">
        <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-accent/20 blur-[110px]" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-accent2/20 blur-[100px]" />

        <Logo />

        <div className="relative max-w-md">
          <span className="chip mb-5 border-accent/25 text-accent">
            <Gamepad2 size={13} />
            نظام إدارة كافيه الألعاب
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink">
            كل ما يحدث في الكافيه
            <br />
            <span className="gradient-text">في شاشة واحدة.</span>
          </h1>
          <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
            أجهزة، جلسات بعداد حي، مشتريات، مخزون، وفواتير — بواجهة عربية سريعة مصممة لشاشة
            الكاشير.
          </p>

          <ul className="mt-7 space-y-2.5 text-[12.5px] text-muted">
            {[
              'عداد حي للوقت والفلوس لكل جهاز',
              'احتساب بالدقيقة مع دعم الإيقاف المؤقت',
              'مخزون محجوز أثناء الزيارة ويُخصم عند التحصيل',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <ShieldCheck size={15} className="shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] text-muted/60">
          HAMATRIX · نسخة 2.0 · توقيت أفريقيا/القاهرة
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-7 flex flex-col items-start gap-4 lg:hidden">
            <Logo />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-ink">{t.auth.loginTitle}</h2>
            <p className="mt-1 text-[13px] text-muted">{t.auth.loginSubtitle}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Input
              label={t.auth.username}
              icon={User}
              placeholder="admin"
              autoComplete="username"
              autoFocus
              dir="ltr"
              className="text-left"
              value={form.username}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, username: event.target.value }));
                setFieldErrors((prev) => ({ ...prev, username: undefined }));
              }}
              error={fieldErrors.username}
            />

            <Input
              label={t.auth.password}
              icon={Lock}
              type="password"
              placeholder="••••••"
              autoComplete="current-password"
              dir="ltr"
              className="text-left"
              value={form.password}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, password: event.target.value }));
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={fieldErrors.password}
            />

            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-danger">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" loading={submitting} className="w-full">
              {submitting ? t.auth.loggingIn : t.auth.login}
              {!submitting && <ArrowLeft size={17} />}
            </Button>
          </form>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-muted/70">
            الدخول متاح لمدير الكافيه فقط. تُقفل المحاولات الخاطئة مؤقتًا بعد 5 محاولات.
          </p>
        </div>
      </div>
    </div>
  );
}
