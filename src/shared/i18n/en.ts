import type { Translation } from './fr'

export const en: Translation = {
  app: {
    tagline: 'All your apps, one window.'
  },
  tray: {
    open: 'Open {{appName}}',
    quit: 'Quit'
  },
  nav: {
    pages: 'Pages',
    home: 'Home',
    apps: 'Apps',
    noApps: 'Apps you add will show up here.',
    settings: 'Settings'
  },
  home: {
    emptyTitle: 'Your grid is coming soon',
    emptyText:
      'This is where you will build your page with widgets: mail, notes, videos, launchers…'
  },
  settings: {
    title: 'Settings',
    sections: {
      general: 'General',
      appearance: 'Appearance',
      notifications: 'Notifications',
      applications: 'Apps',
      about: 'About'
    },
    language: {
      label: 'Language',
      description: 'Interface language.',
      system: 'System language',
      fr: 'Français',
      en: 'English'
    },
    window: {
      title: 'Window',
      startupMode: {
        label: 'Size on launch',
        description: 'How the window opens when the app starts.',
        maximized: 'Maximized',
        last: 'Last size'
      },
      closeToTray: {
        label: 'Keep running in the background when closed',
        description: 'Closing the window hides it in the notification area instead of quitting.'
      }
    },
    theme: {
      label: 'Theme',
      description: '“System” follows the Windows light or dark theme.',
      system: 'System',
      light: 'Light',
      dark: 'Dark'
    },
    accent: {
      label: 'Accent color',
      description: 'Used for active items and buttons.',
      system: 'Windows color',
      custom: 'Custom color',
      preset: 'Color {{color}}'
    },
    comingSoon: {
      title: 'Coming soon',
      notifications:
        'Per-app toggles, custom sounds and Do Not Disturb will come with the notification system.',
      applications:
        'Adding and configuring your apps (websites, launchers, widgets) will live here.'
    },
    about: {
      description: 'A Windows dashboard that brings all your apps together.',
      version: 'Version',
      license: 'License',
      sourceCode: 'Source code on GitHub'
    }
  }
}
