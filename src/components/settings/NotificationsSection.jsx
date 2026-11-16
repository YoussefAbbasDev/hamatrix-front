import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Send } from 'lucide-react';
import { notificationsApi } from '../../api/notifications.js';
import {
  currentSubscription,
  disablePush,
  enablePush,
  isPushSupported,
  permissionState,
} from '../../lib/push.js';
import { apiError } from '../../lib/http.js';
import { useToast } from '../../providers/ToastProvider.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge, SectionTitle } from '../ui/Card.jsx';

const supported = isPushSupported();

export function NotificationsSection() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [subscription, setSubscription] = useState(null);
  const [busy, setBusy] = useState(null);
  const [permission, setPermission] = useState(() => permissionState());

  const statusQuery = useQuery({
    queryKey: ['notifications', 'status'],
    queryFn: notificationsApi.status,
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!supported) return undefined;
    let active = true;
    currentSubscription()
      .then((value) => {
        if (active) setSubscription(value);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  const refresh = () => {
    setPermission(permissionState());
    queryClient.invalidateQueries({ queryKey: ['notifications', 'status'] });
  };

  const enable = async () => {
    setBusy('enable');
    try {
      const value = await enablePush();
      setSubscription(value);
      refresh();
      toast.success('تم تفعيل الإشعارات على الجهاز ده');
    } catch (error) {
      toast.error(error?.message || apiError(error).message);
      refresh();
    } finally {
      setBusy(null);
    }
  };

  const disable = async () => {
    setBusy('disable');
    try {
      const removed = await disablePush();
      setSubscription(null);
      refresh();
      toast.info(removed ? 'تم إيقاف الإشعارات على الجهاز ده' : 'مفيش إشعارات مفعّلة على الجهاز ده');
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy('test');
    try {
      const result = await notificationsApi.test();
      if (result?.sent > 0) {
        toast.success('تم إرسال إشعار تجربة — شوف شريط الإشعارات');
      } else {
        toast.error('مفيش اشتراك مسجّل على السيرفر. فعّل الإشعارات الأول.');
      }
      refresh();
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setBusy(null);
    }
  };

  const configured = statusQuery.data?.configured ?? true;
  const subscribers = statusQuery.data?.subscriptions ?? 0;

  let tone = 'neutral';
  let label = 'غير مفعّل';
  if (!supported) {
    tone = 'danger';
    label = 'غير مدعوم';
  } else if (subscription) {
    tone = 'success';
    label = 'مفعّل على الجهاز ده';
  }

  return (
    <section className="card p-5">
      <SectionTitle
        title="إشعارات الموبايل"
        description="تنبيه على الموبايل قبل نهاية وقت الجلسة بـ 10 دقايق، ولما الوقت يخلص، ولما مخزون منتج يوصل حده الأدنى."
        action={<Badge tone={tone}>{label}</Badge>}
      />

      {!supported && (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-danger">
          المتصفح ده مابيدعمش الإشعارات. افتح الموقع من Chrome على أندرويد.
        </p>
      )}

      {supported && !configured && (
        <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-warning">
          السيرفر مش متظبط لإرسال الإشعارات (مفاتيح VAPID). كلّم المسؤول لإضافتها.
        </p>
      )}

      {supported && permission === 'denied' && (
        <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-warning">
          الإشعارات ممنوعة لهذا الموقع من إعدادات المتصفح. افتح إعدادات الموقع في Chrome واسمح
          بالإشعارات، وبعدها اضغط «تفعيل الإشعارات».
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {subscription ? (
          <Button variant="secondary" onClick={disable} loading={busy === 'disable'}>
            <BellOff size={16} />
            إيقاف الإشعارات
          </Button>
        ) : (
          <Button onClick={enable} loading={busy === 'enable'} disabled={!supported || !configured}>
            <Bell size={16} />
            تفعيل الإشعارات
          </Button>
        )}

        <Button
          variant="ghost"
          onClick={test}
          loading={busy === 'test'}
          disabled={!supported || !configured}
        >
          <Send size={15} />
          إرسال إشعار تجربة
        </Button>

        <span className="text-[11.5px] text-muted">
          أجهزة مسجّلة: <span className="font-mono text-ink">{subscribers}</span>
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-line/60 bg-surface2/40 px-3.5 py-3 text-[12px] leading-relaxed text-muted">
        <p className="font-medium text-ink">إزاي تفعّلها على الموبايل</p>
        <ol className="mt-1.5 list-decimal space-y-1 pr-4">
          <li>افتح الموقع من Chrome على أندرويد وسجّل الدخول.</li>
          <li>اضغط «تفعيل الإشعارات» واسمح بالإشعارات لما المتصفح يسأل.</li>
          <li>
            لو الإشعارات مش بتوصل، أضف الموقع للشاشة الرئيسية من قائمة Chrome ← «إضافة إلى الشاشة
            الرئيسية».
          </li>
          <li>اضغط «إرسال إشعار تجربة» للتأكد إن كل حاجة شغالة.</li>
        </ol>
        <p className="mt-2">
          التنبيهات بتوصل والموقع مقفول، بس الموبايل لازم يكون متصل بالإنترنت. الإشعار بيتبعت مرة
          واحدة لكل حدث.
        </p>
      </div>
    </section>
  );
}
