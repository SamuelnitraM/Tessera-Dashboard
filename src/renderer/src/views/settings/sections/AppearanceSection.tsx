import { Monitor, Moon, PanelLeft, PanelTop, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { Switch } from '../../../components/ui/Switch'
import { useSettingsStore } from '../../../stores/settings'
import { SettingRow, SettingsCard } from '../SettingRow'
import { AccentPicker } from './AccentPicker'

export function AppearanceSection(): React.JSX.Element {
  const { t } = useTranslation()
  const appearance = useSettingsStore((state) => state.settings.appearance)
  const update = useSettingsStore((state) => state.update)

  return (
    <SettingsCard>
      <SettingRow label={t('settings.theme.label')} description={t('settings.theme.description')}>
        {({ labelId }) => (
          <SegmentedControl
            aria-labelledby={labelId}
            value={appearance.theme}
            onChange={(theme) => void update({ appearance: { theme } })}
            options={[
              { value: 'system', label: t('settings.theme.system'), icon: Monitor },
              { value: 'light', label: t('settings.theme.light'), icon: Sun },
              { value: 'dark', label: t('settings.theme.dark'), icon: Moon }
            ]}
          />
        )}
      </SettingRow>

      <SettingRow
        label={t('settings.accent.label')}
        description={t('settings.accent.description')}
        stacked
      >
        {({ labelId }) => (
          <AccentPicker
            aria-labelledby={labelId}
            value={appearance.accentColor}
            onChange={(accentColor) => void update({ appearance: { accentColor } })}
          />
        )}
      </SettingRow>

      <SettingRow
        label={t('settings.accentIcon.label')}
        description={t('settings.accentIcon.description')}
      >
        {({ labelId, descriptionId }) => (
          <Switch
            aria-labelledby={labelId}
            aria-describedby={descriptionId}
            checked={appearance.accentIcon}
            onChange={(accentIcon) => void update({ appearance: { accentIcon } })}
          />
        )}
      </SettingRow>

      <SettingRow
        label={t('settings.sidebar.label')}
        description={t('settings.sidebar.description')}
      >
        {({ labelId }) => (
          <SegmentedControl
            aria-labelledby={labelId}
            value={appearance.sidebar}
            onChange={(sidebar) => void update({ appearance: { sidebar } })}
            options={[
              { value: 'expanded', label: t('settings.sidebar.expanded'), icon: PanelLeft },
              { value: 'collapsed', label: t('settings.sidebar.collapsed'), icon: PanelTop }
            ]}
          />
        )}
      </SettingRow>
    </SettingsCard>
  )
}
