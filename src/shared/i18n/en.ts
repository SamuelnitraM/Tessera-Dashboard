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
  updates: {
    readyTitle: '{{name}} {{version}} is ready',
    readyBody:
      'The update will be installed when you quit Tessera, or right away from Settings → About.'
  },
  dialogs: {
    pickProgram: 'Choose a program',
    pickMedia: 'Open a video or a song',
    mediaFilter: 'Videos and music',
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
    stretchHint:
      'Stretch the window over the other blocks (it returns to its size on your next action, or with a double-click on the block bar)',
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
    arrange: {
      label: 'Tidy up',
      hint: 'Move the blocks as high as possible and fill the gaps, without resizing them'
    },
    autoArrange: {
      label: 'Automatic',
      hint: 'Keep the page always tidied upward, after every move, addition or removal'
    },
    emptyTitle: 'This page is empty',
    emptyText:
      'Add your first blocks (widgets, apps, modules), then move and resize them however you like.',
    compactNotice:
      'Narrow window: you are editing the compact layout, separate from the full-size one.',
    resetCompact: 'Regenerate automatically'
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
    retry: 'Try again',
    moduleNotResponding: 'The module stopped responding (its process may have stopped).',
    moduleNotLoaded: 'The module did not load.'
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
      imap: 'IMAP'
    },
    errors: {
      'not-configured': 'Sign-in unavailable: see Settings → Accounts.',
      auth: 'Sign-in denied or expired: reconnect the account.',
      cancelled: 'Sign-in cancelled.',
      network: 'Server unreachable. Check your internet connection.',
      'not-found': 'Email or account not found.',
      'no-folder': 'Folder not found on the server (Archive or Trash).',
      permission: 'This widget has no access to email.',
      invalid: 'Invalid information.',
      quota: 'Daily limit of the service reached: try again tomorrow.',
      unknown: 'Unexpected error.'
    }
  },
  media: {
    liveTitle: '{{name}} is live',
    backToBlock: 'Back to the block',
    closePlayer: 'Close the player',
    next: 'Next video',
    notConfigured: {
      google: 'Google sign-in unavailable: see Settings → Accounts.',
      twitch: 'Twitch sign-in unavailable: see Settings → Accounts.',
      youtube: 'YouTube account not connected: Settings → Accounts → Sign in with Google.'
    }
  },
  settings: {
    title: 'Settings',
    sections: {
      general: 'General',
      extensions: 'Widgets and modules',
      appearance: 'Appearance',
      notifications: 'Notifications',
      accounts: 'Accounts',
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
      launchAtStartup: {
        label: 'Launch when Windows starts',
        description:
          'Tessera starts with your session, minimized to the notification area (installed version).'
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
    accounts: {
      intro:
        'Connect your accounts: your emails, YouTube subscriptions and Twitch streams show up in your blocks. You sign in on the official Google or Twitch page, in your browser (often already signed in: one click). Tessera never sees your password.',
      googleIntro:
        'One sign-in for Gmail and YouTube: tick the services you want, then pick your Google account.',
      googleServices: 'Services:',
      withGoogle: 'Sign in with Google',
      addGmail: 'Add Gmail',
      addYouTube: 'Add YouTube',
      twitchIntro:
        'Your followed channels that are live, and a notification each time a stream starts. Twitch shows a pre-filled code: just accept.',
      withTwitch: 'Sign in with Twitch',
      reconnectTwitch: 'Reconnect Twitch',
      imapTitle: 'Other email providers',
      imapIntro: 'OVH, Orange, iCloud, Yahoo…: address and password (often an app password).',
      addImap: 'Add an email account…',
      waiting: 'Signing in through your browser…',
      twitchWaiting: 'Accept the sign-in in your browser (the code is already filled in)…',
      cancel: 'Cancel',
      reconnect: 'Reconnect',
      disconnect: 'Disconnect',
      disconnectTitle: 'Disconnect “{{name}}”?',
      disconnectMessage:
        'Tessera forgets this connection. Your data stays with the provider; you can reconnect at any time.',
      unread: '{{count}} unread',
      unavailable:
        'Sign-in unavailable in this version of Tessera: enter your own IDs in “Advanced”.',
      checkTitle: 'Checking',
      mailCheck: {
        label: 'New emails',
        description: 'How often inboxes are checked.'
      },
      liveCheck: {
        label: 'Twitch streams',
        description: 'How often followed channels are checked.'
      },
      every: 'Every {{count}} min',
      notificationsHint: 'Notifications (new emails, streams) are set in Settings → Notifications.',
      advanced: 'Advanced: your own IDs',
      advancedIntro:
        'Optional. Tessera has its own IDs at Google and Twitch; you can use yours instead (leave empty: Tessera’s).',
      guide: 'Create your own IDs',
      googleClientId: 'Google: client ID',
      googleClientSecret: 'Google: client secret',
      twitchClientId: 'Twitch: client ID (“Public” type)',
      secretSaved: 'Saved (encrypted)',
      secretPlaceholder: 'Paste the client secret',
      save: 'Save',
      clearSecret: 'Clear',
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
      mailPermission: 'Can read, sort and send the emails of your accounts',
      mediaPermission:
        'Can read your YouTube subscriptions and playlists and your followed Twitch channels',
      videosPermission: 'Can play the videos and music you pick on your PC',
      integrationsPermission: 'Can read the data of and control: {{list}}',
      networkPermission: 'Can exchange data over the Internet with: {{list}}',
      devBadge: 'Development',
      collectionBadge: 'Collection',
      collectionCount: 'Modules: {{count}}',
      homepage: 'Module website',
      permissionToggle: 'Allow: {{permission}}',
      installButton: 'Install a module…',
      dropHint: 'or drop a .tessera file on this page',
      uninstall: 'Uninstall',
      signed: 'Signed by the publisher · fingerprint {{fingerprint}}',
      unsigned: 'Unsigned',
      reload: 'Reload',
      inspect: 'Inspect',
      install: {
        pickTitle: 'Install a module',
        title: 'Install “{{name}}”?',
        titleCollection: 'Install the “{{name}}” collection?',
        titleDev: 'Load “{{name}}” (development)',
        intro:
          'This module is made by {{author}}, not by Tessera. It runs apart: it can only access what you allow below, and you can change your mind in Settings.',
        introCollection:
          'This collection by {{author}} brings several modules together. Choose which ones to install and what each one can do.',
        noPermissions: 'No permission requested: the module only shows its blocks.',
        signed:
          'Signed package · publisher fingerprint: {{fingerprint}}. Its updates will have to be signed with the same key.',
        unsigned:
          'Unsigned package: nothing guarantees who made it, or that its updates will come from the same author. Only install it if it comes from a source you trust.',
        update: 'Update: v{{from}} → v{{to}}',
        downgrade: 'Older than the installed version (v{{from}})',
        reinstall: 'Already installed (v{{from}})',
        newPermission: 'new',
        select: 'Install “{{name}}”',
        invalid: 'Cannot be installed',
        confirm: 'Install',
        confirmDev: 'Load',
        cancel: 'Cancel',
        nothing: 'No module to install in this package.'
      },
      uninstallDialog: {
        title: 'Uninstall “{{name}}”?',
        message: 'The module and its saved data (internal settings, sign-in) will be deleted.',
        messageDev: 'The module will no longer be loaded. Its development folder stays untouched.',
        removeBlocks: 'Also remove its blocks from your pages ({{count}})',
        trashFiles: 'Move its file folder to the Recycle Bin ({{folder}})',
        confirm: 'Uninstall'
      },
      dev: {
        title: 'Developer mode',
        description:
          'Load a module from a folder to develop it: its blocks reload on every build (npm run dev).',
        load: 'Load a folder…',
        pickTitle: 'Module folder'
      },
      errors: {
        'invalid-package': 'Invalid package: {{detail}}',
        'unsafe-package': 'Package refused, as it could be dangerous: {{detail}}',
        'too-large': 'Package too large (50 MB at most).',
        expired: 'Installation expired: open the package again.',
        'not-found': 'File not found.',
        io: 'Error: {{detail}}'
      }
    },
    about: {
      description: 'A Windows dashboard that brings all your apps together.',
      version: 'Version',
      license: 'License',
      sourceCode: 'Source code on GitHub',
      updates: {
        title: 'Updates',
        unsupported: 'Development version: automatic updates are for the installed version only.',
        idle: 'Tessera is up to date.',
        idleChecked: 'Tessera is up to date (checked at {{time}}).',
        checking: 'Checking for updates…',
        downloading: 'Downloading version {{version}}… {{percent}}%',
        ready: 'Version {{version}} is ready: it will be installed when you quit Tessera.',
        error: 'Could not check for updates: {{message}}',
        check: 'Check for updates',
        install: 'Restart and install'
      }
    }
  }
}
