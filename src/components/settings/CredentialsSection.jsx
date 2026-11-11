import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { t } from '../../lib/strings.js';
import { authApi } from '../../api/auth.js';
import { apiError } from '../../lib/http.js';
import { useAuth } from '../../providers/AuthProvider.jsx';
import { useToast } from '../../providers/ToastProvider.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { SectionTitle } from '../ui/Card.jsx';

export function CredentialsSection({ username }) {
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: '',
    newUsername: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {};

    if (!form.currentPassword) next.currentPassword = 'أدخل كلمة المرور الحالية';

    const wantsUsername = form.newUsername.trim() && form.newUsername.trim() !== username;
    if (wantsUsername && form.newUsername.trim().length < 3) {
      next.newUsername = 'الاسم يجب أن يكون 3 أحرف على الأقل';
    }

    const wantsPassword = Boolean(form.newPassword);
    if (wantsPassword && form.newPassword.length < 6) {
      next.newPassword = t.settings.passwordTooShort;
    }
    if (wantsPassword && form.newPassword !== form.confirmPassword) {
      next.confirmPassword = t.settings.passwordsMismatch;
    }

    if (!wantsUsername && !wantsPassword) {
      next.newUsername = 'أدخل اسم مستخدم جديد أو كلمة مرور جديدة';
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await authApi.changeCredentials({
        currentPassword: form.currentPassword,
        ...(wantsUsername ? { username: form.newUsername.trim() } : {}),
        ...(wantsPassword ? { newPassword: form.newPassword } : {}),
      });

      toast.success(t.settings.credentialsUpdated);
      setForm({ currentPassword: '', newUsername: '', newPassword: '', confirmPassword: '' });
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      const info = apiError(error);
      toast.error(info.message);
      if (info.code === 'INVALID_CREDENTIALS') {
        setErrors({ currentPassword: 'كلمة المرور الحالية غير صحيحة' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card p-5">
      <SectionTitle title={t.settings.credentials} description={t.settings.credentialsHint} />

      <form onSubmit={submit} className="mt-4 space-y-3.5">
        <div className="rounded-lg border border-line/60 bg-surface2/40 px-3.5 py-2.5 text-[11.5px] text-muted">
          اسم المستخدم الحالي: <span className="font-mono text-ink" dir="ltr">@{username}</span>
        </div>

        <Input
          label={t.settings.currentPassword}
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={set('currentPassword')}
          error={errors.currentPassword}
          dir="ltr"
          className="text-left"
        />

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label={t.settings.newUsername}
            value={form.newUsername}
            onChange={set('newUsername')}
            error={errors.newUsername}
            placeholder={username}
            dir="ltr"
            className="text-left"
            hint={t.common.optional}
          />
          <div className="hidden sm:block" />
          <Input
            label={t.settings.newPassword}
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={set('newPassword')}
            error={errors.newPassword}
            dir="ltr"
            className="text-left"
            hint={t.common.optional}
          />
          <Input
            label={t.settings.confirmPassword}
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            error={errors.confirmPassword}
            dir="ltr"
            className="text-left"
          />
        </div>

        <div className="flex justify-end border-t border-line/60 pt-4">
          <Button type="submit" loading={saving}>
            <KeyRound size={16} />
            {t.settings.changeCredentials}
          </Button>
        </div>
      </form>
    </section>
  );
}
