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
    newPage: 'New page',
    apps: 'Apps',
    noApps: 'Apps you add will show up here.',
    settings: 'Settings'
  },
  pages: {
    defaultName: 'Page {{n}}',
    untitled: 'Untitled page',
    name: 'Page name',
    edit: 'Edit',
    done: 'Done',
    addWidget: 'Add widget',
    delete: 'Delete page',
    confirmDelete: 'Confirm deletion',
    fitMode: {
      label: 'Page display',
      fit: 'Fit',
      scroll: 'Scroll'
    },
    emptyTitle: 'This page is empty',
    emptyText: 'Add your first widgets, then move and resize them however you like.',
    compactNotice:
      'Narrow window: you are editing the compact layout, separate from the full-size one.',
    resetCompact: 'Regenerate automatically',
    pageFull: 'No room left on this page. Free up some space, or switch the page to “Scroll”.'
  },
  common: {
    close: 'Close'
  },
  widgets: {
    picker: {
      title: 'Add a widget',
      empty: 'No widgets available: enable an extension in Settings → Extensions.'
    },
    settings: 'Widget settings',
    remove: 'Remove widget',
    unknown: 'Widget unavailable ({{type}})',
    disabledPlugin: 'Extension disabled: {{name}}',
    error: 'This widget ran into an error.',
    retry: 'Try again'
  },
  settings: {
    title: 'Settings',
    sections: {
      general: 'General',
      extensions: 'Extensions',
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
    extensions: {
      intro:
        'Extensions add widgets to Tessera. A disabled extension disappears from the add list; its widgets already placed stay on hold on your pages.',
      builtIn: 'Built-in',
      invalid: 'Invalid extension',
      author: 'By {{author}}',
      widgets: 'Widgets: {{list}}',
      toggle: 'Enable the {{name}} extension'
    },
    about: {
      description: 'A Windows dashboard that brings all your apps together.',
      version: 'Version',
      license: 'License',
      sourceCode: 'Source code on GitHub'
    }
  }
}
