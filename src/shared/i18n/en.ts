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
    programFilter: 'Programs (.exe, .bat, .cmd, .lnk)',
    importFiles: 'Import files',
    acceptedFiles: 'Accepted files',
    pickApp: 'Choose an app',
    appFilter: 'Apps (.exe, .lnk)',
    notAnApp: 'This shortcut does not lead to a program (.exe).'
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
    noApps: 'Add Discord, WhatsApp, Obsidian… to open them here.',
    addApp: 'Add an app',
    settings: 'Settings',
    collapse: 'Collapse the side menu (Ctrl+B)',
    expand: 'Expand the side menu (Ctrl+B)',
    pageMenu: {
      open: 'Open',
      edit: 'Edit page',
      rename: 'Rename…',
      delete: 'Delete page…'
    },
    appMenu: {
      open: 'Open',
      openIn: 'Open in {{browser}}',
      closeTab: 'Close tab',
      settings: 'App settings'
    },
    renamePage: 'Rename page',
    rename: 'Rename',
    cancel: 'Cancel',
    deletePageTitle: 'Delete “{{name}}”?',
    deletePageMessage: 'The page and all its blocks will be deleted.'
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
  desktopApps: {
    starting: 'Opening {{name}}…',
    closed: '{{name}} is closed.',
    reopen: 'Reopen',
    elsewhere: 'This app is shown somewhere else (another block or tab).',
    showHere: 'Show it here',
    timeout: '{{name}} did not open in time.',
    error: 'Could not open {{name}} ({{error}}).',
    retry: 'Try again',
    closeTab: 'Close the tab (the app gets its normal window back)',
    picker: {
      title: 'Add an installed app',
      intro:
        'Programs from your Start menu. Tessera will show their real window, with your sign-in and their notifications.',
      search: 'Search',
      browse: 'Choose an .exe file…',
      loading: 'Looking for installed programs…',
      none: 'No program found.'
    }
  },
  pages: {
    defaultName: 'Page {{n}}',
    untitled: 'Untitled page',
    name: 'Page name',
    edit: 'Edit',
    done: 'Done',
    addBlock: 'Add block',
    delete: 'Delete page',
    confirmDelete: 'Confirm deletion',
    fitMode: {
      label: 'Page display',
      fit: 'Fit',
      scroll: 'Scroll'
    },
    emptyTitle: 'This page is empty',
    emptyText:
      'Add your first blocks (widgets, apps, modules), then move and resize them however you like.',
    compactNotice:
      'Narrow window: you are editing the compact layout, separate from the full-size one.',
    resetCompact: 'Regenerate automatically',
    pageFull: 'No room left on this page. Free up some space, or switch the page to “Scroll”.'
  },
  common: {
    close: 'Close'
  },
  blocks: {
    picker: {
      title: 'Add a block',
      widgets: 'Widgets',
      apps: 'Apps',
      installedApp: 'Installed app',
      otherProgram: 'Another program from your PC…',
      otherProgramDescription: 'Discord, Obsidian, an .exe…',
      modules: 'Modules',
      noWidgets: 'No widget enabled (Settings → Widgets and modules).',
      noModules: 'No module installed yet.',
      otherSite: 'Other website…',
      otherSiteDescription: 'Any address you like'
    },
    settings: 'Block settings',
    remove: 'Remove block',
    unknown: 'Block unavailable ({{type}})',
    disabledPlugin: 'Disabled: {{name}}',
    error: 'This block ran into an error.',
    retry: 'Try again'
  },
  settings: {
    title: 'Settings',
    sections: {
      general: 'General',
      extensions: 'Widgets and modules',
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
    accentIcon: {
      label: 'Icon in the accent color',
      description:
        'The logo, the taskbar icon and the notification area icon use your accent color.'
    },
    sidebar: {
      label: 'Side menu',
      description: 'When collapsed, it makes room for tabs at the top of the window (Ctrl+B).',
      expanded: 'Expanded',
      collapsed: 'Collapsed'
    },
    comingSoon: {
      title: 'Coming soon',
      notifications:
        'Per-app toggles, custom sounds and Do Not Disturb will come with the notification system.'
    },
    applications: {
      intro:
        'Apps open in a Tessera tab or in a block. A web app (website) has its own sign-in, kept between launches. An installed app (program on your PC) is shown with its real window.',
      installed: 'Installed app',
      addInstalledTitle: 'Add an installed app',
      installedIntro:
        'Discord, Obsidian, your own programs… Their window is shown in Tessera, already signed in, with their notifications. Closing the tab or removing the block gives them their normal window back.',
      fromStartMenu: 'Choose from installed programs…',
      fromFile: 'Choose an .exe file…',
      deleteInstalledMessage:
        'The app will disappear from Tessera and get its normal window back. The program itself is not uninstalled.',
      openWith: 'Open with',
      tessera: 'Tessera (built-in tab)',
      browserHint:
        'In a browser, the app uses your sign-ins, password manager and extensions, but opens in a separate window (no unread badge).',
      name: 'Name',
      url: 'Address',
      namePlaceholder: 'Name (optional)',
      urlPlaceholder: 'Address, e.g. app.example.com',
      invalidUrl: 'Invalid web address (http:// or https://).',
      addTitle: 'Add a web app',
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
        'Widgets come with Tessera; modules are made by others and add their own blocks. When disabled, a widget or module disappears from the add list; its blocks already placed stay on hold on your pages.',
      builtIn: 'Built-in widget',
      module: 'Module',
      invalid: 'Invalid module',
      author: 'By {{author}}',
      widgets: 'Blocks: {{list}}',
      toggle: 'Enable “{{name}}”',
      filesPermission: 'File access: {{folder}}',
      processesPermission: 'Can start and stop the programs you choose yourself',
      webPermission: 'Can show web pages',
      appsPermission: 'Can show the window of your installed apps'
    },
    about: {
      description: 'A Windows dashboard that brings all your apps together.',
      version: 'Version',
      license: 'License',
      sourceCode: 'Source code on GitHub'
    }
  }
}
