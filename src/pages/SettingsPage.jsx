import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { t } from '../lib/strings.js';
import { settingsApi } from '../api/settings.js';
import { apiError } from '../lib/http.js';
import { useAuth } from '../providers/AuthProvider.jsx';
import { useToast } from '../providers/ToastProvider.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { BrandSection } from '../components/settings/BrandSection.jsx';
import { BusinessSection } from '../components/settings/BusinessSection.jsx';
import { OperationsSection } from '../components/settings/OperationsSection.jsx';
import { AppearanceSection } from '../components/settings/AppearanceSection.jsx';
import { CredentialsSection } from '../components/settings/CredentialsSection.jsx';

function SectionSkeleton() {
  return (
    <div className="card space-y-3 p-5">
      <div className="skeleton h-5 w-40" />
      <div className="skeleton h-3 w-64" />
      <div className="grid gap-3 pt-2 sm:grid-cols-2">
        <div className="skeleton h-10" />
        <div className="skeleton h-10" />
      </div>
    </div>
  );
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();

  const [saving, setSaving] = useState(null);
  const [uploading, setUploading] = useState(false);

  const query = useQuery({
    queryKey: ['settings', 'full'],
    queryFn: settingsApi.get,
  });

  const applySettings = (settings) => {
    queryClient.setQueryData(['settings', 'full'], settings);
    queryClient.invalidateQueries({ queryKey: ['settings', 'public'] });
  };

  const saveSection = async (section, patch) => {
    setSaving(section);
    try {
      const settings = await settingsApi.update(patch);
      applySettings(settings);
      toast.success(t.settings.saved);
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setSaving(null);
    }
  };

  const uploadLogo = async (file) => {
    setUploading(true);
    try {
      const result = await settingsApi.uploadLogo(file);
      applySettings(result.settings);
      toast.success('تم تحديث الشعار');
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    setUploading(true);
    try {
      const settings = await settingsApi.removeLogo();
      applySettings(settings);
      toast.info('تمت استعادة الشعار الافتراضي');
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setUploading(false);
    }
  };

  if (query.isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="space-y-5">
        <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />
        <div className="card flex flex-col items-start gap-3 p-5">
          <p className="text-sm text-danger">{apiError(query.error).message}</p>
          <Button variant="secondary" onClick={() => query.refetch()}>
            <RefreshCw size={15} />
            {t.common.retry}
          </Button>
        </div>
      </div>
    );
  }

  const settings = query.data;

  return (
    <div className="space-y-5">
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />

      <BrandSection
        brand={settings.brand}
        saving={saving === 'brand'}
        onSave={(patch) => saveSection('brand', patch)}
        onUploadLogo={uploadLogo}
        uploading={uploading}
        onRemoveLogo={removeLogo}
      />

      <BusinessSection
        settings={settings}
        saving={saving === 'business'}
        onSave={(patch) => saveSection('business', patch)}
      />

      <OperationsSection
        settings={settings}
        saving={saving === 'operations'}
        onSave={(patch) => saveSection('operations', patch)}
      />

      <AppearanceSection
        ui={settings.ui}
        saving={saving === 'appearance'}
        onSave={(patch) => saveSection('appearance', patch)}
      />

      <CredentialsSection username={user?.username || 'admin'} />
    </div>
  );
}
