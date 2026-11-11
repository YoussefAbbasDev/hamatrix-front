import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui/PageHeader.jsx';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md">
        <EmptyState
          icon={Compass}
          title="الصفحة غير موجودة"
          description="الرابط الذي تحاول الوصول إليه غير متاح. عد إلى الرئيسية للمتابعة."
          action={
            <Link to="/" className="btn btn-primary btn-sm">
              العودة للرئيسية
            </Link>
          }
        />
      </div>
    </div>
  );
}
