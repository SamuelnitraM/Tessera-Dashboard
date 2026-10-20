import { useTranslation } from 'react-i18next'
import { useDeleteApp } from '../hooks/useDeleteApp'
import { useAppDialogsStore } from '../stores/appDialogs'
import { useSettingsStore } from '../stores/settings'
import { ConfirmDialog } from './ui/ConfirmDialog'

/** Confirmation avant de supprimer une application (clic droit dans le menu latéral). */
export function AppDialogs(): React.JSX.Element | null {
  const { t } = useTranslation()
  const appId = useAppDialogsStore((state) => state.deleteAppId)
  const close = useAppDialogsStore((state) => state.close)
  const app = useSettingsStore((state) =>
    state.settings.apps.items.find((item) => item.id === appId)
  )
  const deleteApp = useDeleteApp()
  if (!app) return null
  return (
    <ConfirmDialog
      open
      title={t('settings.applications.deleteTitle', { name: app.name })}
      message={
        app.kind === 'desktop'
          ? t('settings.applications.deleteInstalledMessage')
          : t('settings.applications.deleteMessage')
      }
      onClose={close}
      actions={[
        { label: t('settings.applications.cancel'), onClick: close },
        {
          label: t('settings.applications.delete'),
          variant: 'danger',
          onClick: () => {
            void deleteApp(app)
            close()
          }
        }
      ]}
    />
  )
}
