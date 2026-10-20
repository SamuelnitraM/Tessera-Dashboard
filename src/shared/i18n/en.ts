import type { Translation } from './fr'

export const en: Translation = {
  app: {
    tagline: 'All your apps, one window.'
  },
  tray: {
    open: 'Open {{appName}}',
    doNotDisturb: 'Do not disturb',
    quit: 'Quit'
  },
  dialogs: {
    pickProgram: 'Choose a program',
    programFilter: 'Programs (.exe, .bat, .cmd, .lnk)',
    importFiles: 'Import files',
    acceptedFiles: 'Accepted files',
    pickApp: 'Choose an app',
    appFilter: 'Apps (.exe, .lnk)',
    notAnApp: 'This shortcut does not lead to a program (.exe).',
    importSound: 'Import a sound',
    soundFilter: 'Sounds (.mp3, .wav, .ogg, .m4a)',
    soundInvalid: 'Unsupported sound format.',
    soundTooBig: 'This sound is too large (3 MB maximum).'
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
      delete: 'Delete the app…',
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
  processes: {
    crashTitle: '{{name}} stopped',
    crashBody: 'The program ended with an error (code {{code}}).'
  },
  notifications: {
    testTitle: 'Test notification',
    testBody: 'Tessera notifications are working.',
    center: {
      title: 'Notifications',
      open: 'Notifications',
      empty: 'No notifications.',
      markAllRead: 'Mark all as read',
      clear: 'Clear all',
      dismiss: 'Remove',
      doNotDisturb: 'Do not disturb',
      scheduled: 'Do not disturb is on (schedule until {{time}}).',
      settings: 'Notification settings'
    },
    sources: {
      tessera: 'Tessera Dashboard',
      web: 'Web pages'
    }
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
    closeTab: 'Close the tab (the app is closed)',
    takeOut: 'Take the window out of Tessera (to the desktop)',
    outside: '{{name}} is open outside Tessera.',
    bringBack: 'Bring back into Tessera',
    panHint: 'Drag to choose the visible part',
    panHintHandle:
      'Drag to choose the visible part (or use the scrollbars, or left + right click on the window)',
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
  mail: {
    oauth: {
      successTitle: 'Signed in',
      successText: 'You can close this tab and go back to Tessera.',
      failedTitle: 'Sign-in failed',
      failedText: 'Sign-in was denied or cancelled. Go back to Tessera to try again.'
    },
    newMessages: '{{count}} new emails',
    providers: {
      gmail: 'Gmail',
      outlook: 'Outlook',
      imap: 'IMAP'
    },
    errors: {
      'not-configured': 'Sign-in ID missing: enter it in Settings → Email.',
      auth: 'Sign-in denied or expired: reconnect the account.',
      cancelled: 'Sign-in cancelled.',
      network: 'Server unreachable. Check your internet connection.',
      'not-found': 'Email or account not found.',
      'no-folder': 'Folder not found on the server (Archive or Trash).',
      permission: 'This widget has no access to email.',
      invalid: 'Invalid information.',
      unknown: 'Unexpected error.'
    }
  },
  settings: {
    title: 'Settings',
    sections: {
      general: 'General',
      extensions: 'Widgets and modules',
      appearance: 'Appearance',
      notifications: 'Notifications',
      applications: 'Apps',
      mail: 'Email',
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
    notifications: {
      banners: {
        label: 'Windows banners',
        description:
          'Shows notifications at the bottom right of the screen, even when Tessera is in the background.'
      },
      sound: {
        label: 'Default sound',
        description: 'Played for every notification, unless an app has its own setting.'
      },
      volume: {
        label: 'Volume',
        description:
          'Of Tessera sounds and imported sounds (the Windows sound follows the system volume).'
      },
      test: 'Send a test notification',
      blocked:
        'Notifications are turned off in Windows: no banner can be shown. The notification center and Tessera sounds still work.',
      openWindowsSettings: 'Open Windows settings',
      dndTitle: 'Do not disturb',
      dnd: {
        label: 'Do not disturb',
        description:
          'Notifications go to the notification center, without banner or sound. High-priority apps still get through.'
      },
      schedule: {
        label: 'Every day',
        description: 'Turns on Do not disturb automatically between these two times.',
        from: 'From',
        to: 'to'
      },
      soundsTitle: 'Imported sounds',
      soundsIntro: 'MP3, WAV, OGG or M4A, 3 MB maximum.',
      importSound: 'Import a sound…',
      play: 'Play',
      deleteSound: 'Delete the sound',
      noSounds: 'No imported sound.',
      sourcesTitle: 'Per app',
      sourcesIntro:
        'Installed apps (Discord, Obsidian…) show their own Windows notifications: set them up in the app itself.',
      enabled: '{{name}} notifications',
      soundFor: '{{name}} sound',
      priorityFor: '{{name}} priority',
      priorityNormal: 'Normal',
      priorityHigh: 'High priority',
      soundDefault: 'Default sound',
      sounds: {
        system: 'Windows sound',
        none: 'None',
        chime: 'Chime',
        pop: 'Pop',
        bell: 'Bell'
      },
      noSources: 'No app can send notifications yet.'
    },
    applications: {
      intro:
        'Apps open in a Tessera tab or in a block. A web app (website) has its own sign-in, kept between launches. An installed app (program on your PC) is shown with its real window.',
      installed: 'Installed app',
      onQuit: {
        label: 'When Tessera quits',
        description: 'What happens to the installed apps shown in Tessera when you quit the app.',
        close: 'Close them',
        restore: 'Give them back to the desktop'
      },
      addInstalledTitle: 'Add an installed app',
      installedIntro:
        'Discord, Obsidian, your own programs… Their window is shown in Tessera, already signed in, with their notifications. When larger than its block, it is cropped: drag the block bar to choose the visible part. Removing the block or closing the tab closes the app.',
      fromStartMenu: 'Choose from installed programs…',
      fromFile: 'Choose an .exe file…',
      deleteInstalledMessage:
        'The app will disappear from Tessera and be closed. The program itself is not uninstalled.',
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
    mail: {
      intro:
        'Your mailboxes in “Email” blocks: Gmail and Outlook through their official sign-in, other providers through IMAP. Sign-in tokens and passwords are encrypted by Windows and only ever sent to your provider.',
      accountsTitle: 'Accounts',
      noAccounts: 'No account yet.',
      addGmail: 'Add Gmail',
      addOutlook: 'Add Outlook',
      addImap: 'Add an IMAP account…',
      needsGoogle: 'Gmail: first enter your Google ID (below).',
      needsMicrosoft: 'Outlook: first enter your Microsoft ID (below).',
      connecting: 'Signing in through your browser…',
      cancel: 'Cancel',
      reconnect: 'Reconnect',
      remove: 'Remove account',
      name: 'Display name',
      unread: '{{count}} unread',
      removeTitle: 'Remove “{{name}}”?',
      removeMessage:
        'The account will disappear from Tessera and its sign-in will be erased. Your emails stay with your provider.',
      notificationsHint: 'Notifications of each account are set in Settings → Notifications.',
      googleTitle: 'Google ID (Gmail)',
      googleIntro:
        'Google asks everyone to create their own sign-in ID: it is free and takes five minutes. Follow the guide, then paste the client ID and client secret here.',
      microsoftTitle: 'Microsoft ID (Outlook)',
      microsoftIntro:
        'Create a free application in Microsoft Entra by following the guide, then paste its application (client) ID here.',
      clientId: 'Client ID',
      clientSecret: 'Client secret',
      applicationId: 'Application (client) ID',
      secretSaved: 'Saved (encrypted)',
      secretPlaceholder: 'Paste the client secret',
      save: 'Save',
      clearSecret: 'Clear',
      guide: 'Open the guide',
      checkTitle: 'Checking',
      checkMinutes: {
        label: 'New emails',
        description: 'How often inboxes are checked.',
        option: 'Every {{count}} min'
      },
      imap: {
        title: 'Add an IMAP account',
        reconnectTitle: 'Reconnect “{{name}}”',
        provider: 'Provider',
        custom: 'Other (manual settings)',
        address: 'Email address',
        name: 'Display name (optional)',
        username: 'Username (often the address)',
        password: 'Password',
        passwordHint:
          'Gmail, Yahoo, iCloud… require an “app password”, created in the account’s security settings.',
        incoming: 'Incoming (IMAP)',
        outgoing: 'Outgoing (SMTP)',
        host: 'Server',
        port: 'Port',
        secure: 'SSL/TLS',
        checking: 'Checking the servers…',
        add: 'Check and add'
      }
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
      appsPermission: 'Can show the window of your installed apps',
      notificationsPermission: 'Can send you notifications',
      mailPermission: 'Can read, sort and send the emails of your accounts'
    },
    about: {
      description: 'A Windows dashboard that brings all your apps together.',
      version: 'Version',
      license: 'License',
      sourceCode: 'Source code on GitHub'
    }
  }
}
