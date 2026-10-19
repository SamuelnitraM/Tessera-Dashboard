import type { Translation } from './fr'

export const en: Translation = {
  app: {
    tagline: 'All your apps, one window.'
  },
  tray: {
    open: 'Open {{appName}}',
    quit: 'Quit'
  },
  dialogs: {
    pickProgram: 'Choose a program',
    programFilter: 'Programs (.exe, .bat, .cmd, .lnk)'
  },
  web: {
    contextMenu: {
      cut: 'Cut',
      copy: 'Copy',
      paste: 'Paste',
      selectAll: 'Select all',
      openLink: 'Open link in browser',
      copyLink: 'Copy link address',
      copyImage: 'Copy image',
      addToDictionary: 'Add to dictionary',
      back: 'Back',
      forward: 'Forward',
      reload: 'Reload',
      inspect: 'Inspect element'
    },
    permission: {
      title: 'Permission requested',
      message: '“{{host}}” is asking for access to {{what}}.',
      detail: 'Your choice will be remembered for this app. You can reset it in Settings → Apps.',
      microphone: 'your microphone',
      camera: 'your camera',
      microphoneAndCamera: 'your microphone and camera',
      geolocation: 'your location',
      allow: 'Allow',
      deny: 'Deny'
    }
  },
  nav: {
    pages: 'Pages',
    home: 'Home',
    newPage: 'New page',
    apps: 'Apps',
    noApps: 'Add Discord, WhatsApp… to open them here.',
    addApp: 'Add an app',
    settings: 'Settings'
  },
  apps: {
    back: 'Back',
    forward: 'Forward',
    reload: 'Reload',
    home: 'App home page',
    openInBrowser: 'Open in browser',
    close: 'Close tab (frees memory)',
    loadError: 'The page could not be loaded ({{error}}).'
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
        'Per-app toggles, custom sounds and Do Not Disturb will come with the notification system.'
    },
    applications: {
      intro:
        'Web apps open in a Tessera tab, each with its own sign-in, kept between launches. Once opened, they stay loaded in the background.',
      name: 'Name',
      url: 'Address',
      namePlaceholder: 'Name (optional)',
      urlPlaceholder: 'Address, e.g. app.example.com',
      invalidUrl: 'Invalid web address (http:// or https://).',
      addTitle: 'Add an app',
      add: 'Add',
      open: 'Open',
      moveUp: 'Move up',
      moveDown: 'Move down',
      resetPermissions: 'Reset permissions (microphone, camera, location)',
      delete: 'Delete',
      cancel: 'Cancel',
      deleteTitle: 'Delete “{{name}}”?',
      deleteMessage:
        'The app will be removed from Tessera, and its sign-in (cookies, saved data) will be erased.'
    },
    extensions: {
      intro:
        'Extensions add widgets to Tessera. A disabled extension disappears from the add list; its widgets already placed stay on hold on your pages.',
      builtIn: 'Built-in',
      invalid: 'Invalid extension',
      author: 'By {{author}}',
      widgets: 'Widgets: {{list}}',
      toggle: 'Enable the {{name}} extension',
      filesPermission: 'File access: {{folder}}',
      processesPermission: 'Can start and stop the programs you choose yourself'
    },
    about: {
      description: 'A Windows dashboard that brings all your apps together.',
      version: 'Version',
      license: 'License',
      sourceCode: 'Source code on GitHub'
    }
  }
}
