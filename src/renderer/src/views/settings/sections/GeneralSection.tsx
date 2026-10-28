import { useTranslation } from 'react-i18next'
import { Select } from '../../../components/ui/Select'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { Switch } from '../../../components/ui/Switch'
import { useSettingsStore } from '../../../stores/settings'
import { SettingRow, SettingsCard } from '../SettingRow'

export function GeneralSection(): React.JSX.Element {
  const { t } = useTranslation()
  const settings = useSettingsStore((state) => state.settings)
  const update = useSettingsStore((state) => state.update)

  return (
    <>
      <SettingsCard>
        <SettingRow
          label={t('settings.language.label')}
          description={t('settings.language.description')}
        >
          {({ labelId }) => (
            <Select
              aria-labelledby={labelId}
              value={settings.general.language}
              onChange={(language) => void update({ general: { language } })}
              options={[
                { value: 'system', label: t('settings.language.system') },
                { value: 'fr', label: t('settings.language.fr') },
                { value: 'en', label: t('settings.language.en') }
              ]}
            />
          )}
        </SettingRow>
      </SettingsCard>

      <SettingsCard title={t('settings.window.title')}>
        <SettingRow
          label={t('settings.window.startupMode.label')}
          description={t('settings.window.startupMode.description')}
        >
          {({ labelId }) => (
            <SegmentedControl
              aria-labelledby={labelId}
              value={settings.window.startupMode}
              onChange={(startupMode) => void update({ window: { startupMode } })}
              options={[
                { value: 'maximized', label: t('settings.window.startupMode.maximized') },
                { value: 'last', label: t('settings.window.startupMode.last') }
              ]}
            />
          )}
        </SettingRow>

        <SettingRow
          label={t('settings.window.launchAtStartup.label')}
          description={t('settings.window.launchAtStartup.description')}
        >
          {({ labelId, descriptionId }) => (
            <Switch
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              checked={settings.window.launchAtStartup}
              onChange={(launchAtStartup) => void update({ window: { launchAtStartup } })}
            />
          )}
        </SettingRow>

        <SettingRow
          label={t('settings.window.closeToTray.label')}
          description={t('settings.window.closeToTray.description')}
        >
          {({ labelId, descriptionId }) => (
            <Switch
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              checked={settings.window.closeToTray}
              onChange={(closeToTray) => void update({ window: { closeToTray } })}
            />
          )}
        </SettingRow>

        <SettingRow
          label={t('settings.window.videoWheel.label')}
          description={t('settings.window.videoWheel.description')}
        >
          {({ labelId }) => (
            <SegmentedControl
              aria-labelledby={labelId}
              value={settings.window.videoWheel}
              onChange={(videoWheel) => void update({ window: { videoWheel } })}
              options={[
                { value: 'page', label: t('settings.window.videoWheel.page') },
                { value: 'video', label: t('settings.window.videoWheel.video') }
              ]}
            />
          )}
        </SettingRow>
      </SettingsCard>
    </>
  )
}
