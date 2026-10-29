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
    button: 'Update ({{version}})',
    buttonHint: 'Version {{version}} is ready: click to restart Tessera and install it',
    readyBody:
      'The update will be installed when you quit Tessera, or right away with “Update” in the side menu.'
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
    openLinkTitle: 'Open a link',
    openLinkMessage: '“{{module}}” wants to open {{host}} in your browser.',
    openLinkDetail:
      'Full address: {{url}}\n\nA module can pass information in an address: only open sites you expect.',
    openLinkAllow: 'Open',
    openLinkCancel: 'Cancel',
    openLinkRemember: 'Don’t ask again for this site (until Tessera closes)',
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
    fullScreen: 'Full screen',
    exitFullScreen: 'Exit full screen',
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
  videoStage: {
    wheel: 'Wheel',
    page: 'Page',
    video: 'Video'
  },
  errors: {
    common: {
      unknownAction: 'Unknown action.',
      invalidAddress: 'Invalid address.',
      invalidName: 'Invalid name.',
      invalidNumber: 'Invalid number.',
      invalidId: 'Invalid ID.',
      invalidPath: 'Invalid path.',
      fileNotFound: 'File not found.',
      folderNotFound: 'Folder not found.',
      unsupportedFile: 'Unsupported file format.',
      missingPermission: 'The extension “{{plugin}}” doesn’t have the “{{permission}}” permission.',
      programNotFound: '{{program}} not found (PATH).',
      programFailed: '{{program}} failed ({{code}}).',
      encryptionUnavailable: 'Encryption unavailable.'
    },
    files: {
      insideItself: 'A folder can’t be copied or moved into itself.',
      invalidName: 'Invalid file name.',
      exists: 'An item with this name already exists.'
    },
    git: {
      settingsUnreadable: 'GitSpread settings can’t be read: try again in a moment.',
      unknownProject: 'Unknown project: refresh the list.',
      notRepository: 'This folder isn’t a git repository.',
      noGitHubRepository: 'No GitHub repository for this project.',
      emptyCommitMessage: 'Empty commit message.',
      noFileSelected: 'No file selected.',
      invalidBranch: 'Invalid branch name.',
      branchNotFound: 'Branch not found.',
      noActiveBranch: 'No active branch.',
      emptyTitle: 'Empty title.',
      unknownAccount: 'Unknown account.',
      invalidAccount: 'Invalid account.',
      invalidRepository: 'Invalid repository.',
      invalidFolder: 'Invalid folder.',
      folderExists: 'The folder “{{name}}” already exists.'
    },
    devtools: {
      protectedProgram: 'Protected program.',
      notListening: 'This program is no longer listening on any port.',
      windowsProgram: 'Windows program: it can’t be stopped here.',
      invalidContainer: 'Invalid container.',
      keywordMissing: 'Expected text missing',
      siteUp: '{{name}} is back online',
      siteDown: '{{name}} is not responding'
    },
    news: {
      tooLarge: 'Feed too large.',
      noFeed: 'No RSS feed found at this address.',
      unreadable: 'This feed can’t be read.',
      alreadyFollowed: 'You already follow this feed.'
    },
    spotify: {
      invalidClientId: 'Invalid ID (32 characters).',
      invalidPlaylist: 'Invalid playlist.',
      invalidUri: 'Invalid Spotify address.'
    },
    terminal: {
      tooMany: 'Too many terminals open.',
      noShell: 'No shell found.'
    },
    pluginFiles: {
      invalidName: 'File name rejected: “{{name}}”.',
      pathRejected: 'Path rejected.',
      exists: 'A file with this name already exists.',
      textExpected: 'Text content expected.',
      tooLarge: 'File too large (10 MB maximum).',
      noExtension: 'No accepted file extension.'
    },
    processes: {
      notApproved: 'This program wasn’t chosen by the user.',
      programNotFound: 'Program not found: {{path}}',
      unsupportedType: 'Unsupported file type.',
      missingOwner: 'Missing owner.',
      alreadyRunning: 'This program is already running.',
      scriptArguments: 'Arguments rejected for a script (characters & | < > ^ % ").',
      folderNotFound: 'Working folder not found: {{path}}',
      runNotFound: 'Run not found.'
    },
    integrations: {
      notDeclared: 'The extension “{{plugin}}” hasn’t declared the “{{integration}}” integration.',
      devLauncherNotResponding: 'DevLauncher is not responding.',
      mcpError: 'MCP error',
      invalidService: 'Invalid service.',
      invalidProject: 'Invalid project.',
      invalidProfile: 'Invalid profile.',
      unknownProject: 'Project unknown to GitSpread.',
      invalidList: 'Invalid list.',
      noGitHubPage: 'No GitHub page for this project.',
      invalidPort: 'Invalid port.',
      unreadableResponse: 'Unreadable response.',
      invalidJob: 'Invalid job.'
    },
    modules: {
      packageExpected: '.tessera file expected.',
      developerModeOff: 'Developer mode is off.',
      idChanged: 'The manifest ID (“{{id}}”) has changed: “{{expected}}” expected.',
      noManifest: 'No manifest.json in this folder or in its dist subfolder (run the build first).',
      manifestUnreadable: 'manifest.json can’t be read ({{detail}}).',
      entryNotFound: 'Main script not found: “{{entry}}” (entry field).',
      unsignedUpdate:
        'The installed version is signed ({{installed}}): this update isn’t, so it is rejected.',
      otherKey:
        'Signed with a different key ({{fingerprint}}) than the installed version ({{installed}}): update rejected.',
      reservedPrefix: 'The “{{prefix}}” prefix is reserved for Tessera’s extensions.',
      builtIn: '“{{id}}” is already a built-in extension.',
      noWidget: 'The module must provide at least one widget.',
      folderTaken: 'The files folder “{{folder}}” is already used by another extension.',
      missingInPackage: '{{name}} not found in the package.',
      invalidJson: '{{name}} isn’t valid JSON.',
      packageTooLarge: 'The package exceeds 50 MB.',
      noRootManifest: 'Neither manifest.json nor collection.json at the root of the package.',
      wrongId: '{{label}}: ID “{{id}}”, “{{expected}}” expected.',
      duplicate: 'Duplicate module.',
      pathRejected: 'Path rejected: “{{name}}”.',
      expired: 'Installation expired: reopen the package.',
      installFailed: 'Installation failed: {{detail}}',
      notFound: 'Module “{{id}}” not found.'
    },
    package: {
      invalidFileName: 'Invalid file name: “{{name}}”.',
      backslash: 'Backslash not allowed: “{{name}}”.',
      absolutePath: 'Absolute path: “{{name}}”.',
      relativePath: 'Relative path not allowed: “{{name}}”.',
      tooLarge: 'Archive too large.',
      notZip: 'This file isn’t a zip archive.',
      multipart: 'Multi-part archives aren’t supported.',
      zip64: 'ZIP64 isn’t supported.',
      tooManyFiles: 'Too many files in the archive.',
      corrupt: 'Corrupt archive.',
      corruptDirectory: 'Corrupt archive (central directory).',
      notUtf8: 'Non-UTF-8 name: “{{name}}”.',
      encrypted: 'Encrypted archives aren’t supported.',
      symlink: 'Symbolic link not allowed: “{{name}}”.',
      link: 'Link not allowed: “{{name}}”.',
      duplicate: 'Duplicate file: “{{name}}”.',
      tooLargeUncompressed: 'Archive too large once uncompressed.',
      pathConflict: 'Path conflict: “{{name}}”.',
      corruptEntry: 'Corrupt archive (“{{name}}”).',
      truncated: 'Truncated archive (“{{name}}”).',
      unreadableEntry: 'File unreadable or larger than declared: “{{name}}”.',
      compression: 'Unsupported compression method (“{{name}}”).',
      wrongSize: 'Incorrect size: “{{name}}”.',
      altered: 'Altered file (checksum): “{{name}}”.',
      signatureUnreadable: '{{name}} can’t be read.',
      signatureFiles: 'Invalid signature: the file list doesn’t match.',
      signatureModified: 'Invalid signature: “{{name}}” has been modified.',
      signatureInvalid: 'Invalid signature.'
    }
  },
  notifications: {
    proposal: {
      title: 'No “{{name}}” block',
      message:
        'This notification comes from {{name}}, which has no block on any of your pages. Add a {{name}} block to the current page?',
      add: 'Add the block',
      openTab: 'Open in a tab',
      cancel: 'Cancel'
    },
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
    missing: 'Is {{name}} not showing?',
    refresh: 'Show again',
    afterEdit: '{{name}} will show when you leave edit mode.',
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
    screenUp: 'Previous screen',
    screenDown: 'Next screen',
    screenLine: 'Screen {{n}}',
    screenLineCut: 'Screen {{n}}: cut by a block',
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
  headerBar: {
    label: 'Bar widgets',
    add: 'Add a widget to the bar',
    remove: 'Remove “{{name}}” from the bar',
    more: 'More widgets ({{count}})',
    settings: 'Widget settings',
    back: 'Back',
    loading: 'Loading…',
    retry: 'Try again',
    offline: 'No Internet connection?',
    unavailable: 'Unavailable right now.',
    noResults: 'No results.',
    copy: 'Copy',
    copied: 'Copied',
    dragHint: 'Drag to reorder, or onto the page to make it a block',
    names: {
      datetime: 'Clock',
      weather: 'Weather',
      media: 'Now playing',
      sound: 'Sound',
      system: 'System',
      clipboard: 'Clipboard',
      calculator: 'Calculator',
      timer: 'Timer',
      stopwatch: 'Stopwatch',
      focus: 'Focus',
      clocks: 'World clocks',
      agenda: 'Next event',
      converter: 'Converter',
      eyedropper: 'Eyedropper',
      screenshot: 'Screenshot',
      note: 'Quick note'
    },
    calendar: {
      previous: 'Previous month',
      next: 'Next month',
      today: 'Today',
      week: 'Wk',
      weekHint: 'Week number'
    },
    calculator: {
      input: 'Calculation',
      history: 'Recent calculations',
      reuse: 'Reuse this result',
      incomplete: 'Incomplete calculation',
      backspace: 'Delete the last character',
      copy: 'Copy the result',
      copyShort: 'Copy'
    },
    timer: {
      preset: '{{minutes}} min',
      minutes: 'minutes',
      start: 'Start',
      pause: 'Pause',
      resume: 'Resume',
      stop: 'Stop',
      doneTitle: 'Timer finished',
      doneBody: 'Your {{minutes}} min are up.',
      mode: 'Timer mode',
      countdown: 'Countdown'
    },
    note: {
      placeholder: 'An idea, a number, a list… Kept across pages.'
    },
    places: {
      search: 'Search for a city…',
      noResults: 'No city found.'
    },
    weather: {
      choosePlace: 'Choose your city to see the weather.',
      removePlace: 'Remove this city',
      source: 'Forecasts by Open-Meteo, no account needed.',
      error: 'Weather unavailable (Internet connection?).',
      feelsLike: 'Feels like {{value}}°',
      humidity: 'Humidity {{value}}%',
      wind: 'Wind {{value}} km/h',
      today: 'Today',
      updated: 'Open-Meteo · updated at {{time}}',
      kinds: {
        clear: 'Clear sky',
        mainlyClear: 'Mainly clear',
        partlyCloudy: 'Partly cloudy',
        overcast: 'Overcast',
        fog: 'Fog',
        drizzle: 'Drizzle',
        freezingDrizzle: 'Freezing drizzle',
        rain: 'Rain',
        freezingRain: 'Freezing rain',
        snow: 'Snow',
        snowGrains: 'Snow grains',
        showers: 'Showers',
        snowShowers: 'Snow showers',
        thunderstorm: 'Thunderstorm',
        thunderstormHail: 'Thunderstorm with hail'
      }
    },
    media: {
      nothing: 'Nothing playing. Start some music or a video (Spotify, YouTube in a browser…).',
      from: 'In {{app}}',
      previous: 'Previous',
      next: 'Next',
      play: 'Play',
      pause: 'Pause'
    },
    sound: {
      output: 'Output',
      input: 'Microphone',
      muted: 'muted',
      mute: 'Mute',
      unmute: 'Unmute',
      micMute: 'Mute the microphone',
      micUnmute: 'Unmute the microphone',
      noOutput: 'No audio output.',
      noInput: 'No microphone plugged in.',
      outputDevice: 'Audio output',
      inputDevice: 'Microphone in use',
      volume: 'Volume',
      micVolume: 'Microphone volume'
    },
    system: {
      cpu: 'Processor',
      memory: 'Memory',
      disk: 'Disk',
      network: 'Network',
      diskOf: 'Disk {{drive}}',
      free: '{{free}} free of {{total}}',
      showInBar: 'Show in the bar',
      shownInBar: 'Shown in the bar',
      uptime: 'Windows running for {{duration}}',
      top: 'Most demanding programs',
      sortCpu: 'Processor',
      sortMemory: 'Memory',
      processes: '{{count}} processes'
    },
    duration: {
      days: '{{count}}d',
      hours: '{{count}}h',
      minutes: '{{count}} min'
    },
    clipboard: {
      copy: 'Copy',
      image: 'Image {{width}} × {{height}}',
      pin: 'Pin (kept after closing)',
      unpin: 'Unpin',
      remove: 'Remove',
      clear: 'Clear all',
      search: 'Search…',
      pinLimit: 'Can’t pin: 30 items at most, images up to 6 MB.',
      empty: 'Copy some text or an image: it will show up here.',
      pinned: 'Pinned',
      recent: 'Recent',
      privacy:
        'Kept in memory and cleared when Tessera closes (except pinned items). Passwords copied from a password manager are ignored.'
    },
    stopwatch: {
      start: 'Start',
      pause: 'Pause',
      resume: 'Resume',
      reset: 'Reset',
      lap: 'Lap',
      laps: 'Laps',
      lapNumber: 'Lap {{number}}'
    },
    focus: {
      work: 'Focus',
      shortBreak: 'Short break',
      longBreak: 'Long break',
      intro:
        '{{work}}-minute sessions with {{shortBreak}}-minute breaks, and a {{longBreak}}-minute break now and then (Pomodoro technique).',
      start: 'Start',
      pause: 'Pause',
      resume: 'Resume',
      skip: 'Skip',
      stop: 'Stop',
      round: 'Session {{current}} of {{total}}',
      dndOn: 'Do not disturb is on until the break.',
      breakTitle: 'Break time',
      breakBody: '{{minutes}}-minute break. Well done!',
      workTitle: 'Back to work',
      workBody: '{{minutes}}-minute session.',
      settings: {
        work: 'Focus (min)',
        shortBreak: 'Short break (min)',
        longBreak: 'Long break (min)',
        rounds: 'Sessions before the long break',
        doNotDisturb: 'Turn on Do not disturb while focusing'
      }
    },
    clocks: {
      add: 'Add a city',
      empty: 'Add the cities whose time you want to see.',
      sameTime: 'same time',
      offset: '{{value}}h',
      today: 'today',
      tomorrow: 'tomorrow',
      yesterday: 'yesterday',
      remove: 'Remove {{name}}'
    },
    agenda: {
      now: 'Now',
      accountError: '{{email}}: {{error}}',
      intro:
        'Your appointments for the next 7 days (Google Calendar), which you can also add and edit here. Google will ask for access to your calendar.',
      today: 'Today',
      tomorrow: 'Tomorrow',
      refresh: 'Refresh',
      empty: 'Nothing planned in the next 7 days.',
      allDay: 'All day',
      untitled: '(No title)',
      join: 'Join',
      open: 'Open in Google Calendar',
      manage: 'Connected accounts (Settings → Accounts)',
      form: {
        new: 'New event',
        edit: 'Edit event',
        title: 'Title',
        calendar: 'Calendar',
        date: 'Date',
        from: 'From',
        to: 'To',
        start: 'Start',
        end: 'End',
        location: 'Location (optional)',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete'
      }
    },
    converter: {
      category: 'Conversion type',
      value: 'Value to convert',
      from: 'From unit',
      to: 'To unit',
      swap: 'Swap',
      ratesDate: 'European Central Bank rates of {{date}}',
      ratesError: 'Exchange rates unavailable (Internet connection?).',
      categories: {
        length: 'Length',
        mass: 'Mass',
        temperature: 'Temperature',
        volume: 'Volume',
        area: 'Area',
        speed: 'Speed',
        time: 'Duration',
        data: 'Data',
        currency: 'Currencies'
      },
      units: {
        mm: 'millimetres (mm)',
        cm: 'centimetres (cm)',
        m: 'metres (m)',
        km: 'kilometres (km)',
        in: 'inches (in)',
        ft: 'feet (ft)',
        yd: 'yards (yd)',
        mi: 'miles (mi)',
        nmi: 'nautical miles',
        mg: 'milligrams (mg)',
        g: 'grams (g)',
        kg: 'kilograms (kg)',
        t: 'tonnes (t)',
        oz: 'ounces (oz)',
        lb: 'pounds (lb)',
        st: 'stones (st)',
        c: 'degrees Celsius (°C)',
        f: 'degrees Fahrenheit (°F)',
        k: 'kelvins (K)',
        ml: 'millilitres (ml)',
        cl: 'centilitres (cl)',
        l: 'litres (l)',
        m3: 'cubic metres (m³)',
        tsp: 'US teaspoons',
        tbsp: 'US tablespoons',
        floz: 'US fluid ounces (fl oz)',
        cup: 'US cups',
        pt: 'US pints (pt)',
        gal: 'US gallons (gal)',
        galuk: 'imperial gallons',
        cm2: 'square centimetres (cm²)',
        m2: 'square metres (m²)',
        ha: 'hectares (ha)',
        km2: 'square kilometres (km²)',
        ft2: 'square feet (ft²)',
        acre: 'acres',
        mi2: 'square miles (mi²)',
        mps: 'metres per second (m/s)',
        kmh: 'kilometres per hour (km/h)',
        mph: 'miles per hour (mph)',
        kn: 'knots (kn)',
        s: 'seconds',
        min: 'minutes',
        h: 'hours',
        d: 'days',
        wk: 'weeks',
        bit: 'bits',
        B: 'bytes (B)',
        KB: 'kilobytes (KB)',
        MB: 'megabytes (MB)',
        GB: 'gigabytes (GB)',
        TB: 'terabytes (TB)',
        KiB: 'kibibytes (KiB)',
        MiB: 'mebibytes (MiB)',
        GiB: 'gibibytes (GiB)',
        TiB: 'tebibytes (TiB)'
      }
    },
    eyedropper: {
      pick: 'Pick a colour on screen',
      clear: 'Clear colours',
      unsupported: 'The eyedropper couldn’t capture the screen.',
      hint: 'Click: pick the colour · Esc: cancel',
      copy: 'Copy {{value}}',
      recent: 'Recent colours',
      empty: 'No colours yet.'
    },
    screenshot: {
      capture: 'Capture',
      region: 'Region',
      screen: 'Full screen',
      window: 'Window',
      chooseWindow: 'Choose the window',
      failed: 'The capture failed.',
      recent: 'Latest screenshots',
      none: 'No screenshots in the folder.',
      dragHint: 'Click: open · drag into another app',
      show: 'Show in folder',
      openFolder: 'Open the screenshots folder',
      tool: 'Capture tool',
      tools: {
        windows: 'Windows Snipping Tool',
        windowsHint:
          'Region, window, screen or freeform, with annotation. Windows saves the capture in Pictures\\Screenshots.',
        tessera: 'Tessera’s tool',
        tesseraHint:
          'Region, full screen or window (even hidden). Copied and saved in the folder below.'
      },
      folder: 'Screenshots folder',
      defaultFolder: 'Pictures\\Screenshots (default)',
      chooseFolder: 'Choose…',
      resetFolder: 'Default',
      windowsFolderHint:
        'The latest screenshots are read from this folder. The Windows tool saves in Pictures\\Screenshots.',
      filePrefix: 'Screenshot',
      savedTitle: 'Screenshot saved',
      savedBody: 'Copied to the clipboard and saved in the screenshots folder.',
      hint: 'Drag to choose the region · click: full screen · Esc: cancel'
    }
  },
  common: {
    clear: 'Clear',
    close: 'Close'
  },
  blocks: {
    fillScreen: 'Size: full screen',
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
      otherSiteDescription: 'Any address you like',
      search: 'Search for a widget, app or module…',
      noResults: 'No results for “{{query}}”.'
    },
    categories: {
      video: 'Video and music',
      images: 'Images',
      communication: 'Communication',
      productivity: 'Productivity',
      development: 'Development',
      apps: 'Apps',
      info: 'News and info',
      games: 'Games',
      tools: 'Tools',
      other: 'Other'
    },
    settings: 'Block settings',
    settingsOf: 'Block settings: {{name}}',
    remove: 'Remove block',
    removeOf: 'Remove block: {{name}}',
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
      'api-disabled':
        'This API isn’t enabled in Tessera’s Google Cloud project (Google Tasks API, Google Calendar API…): enable it, wait a minute, then try again.',
      scope:
        'Tessera didn’t get this permission: reconnect the account and leave every box ticked.',
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
  accountRequired: {
    title: 'Connect your {{provider}} account',
    reconnectTitle: 'Reconnect your {{provider}} account',
    connect: 'Sign in with {{provider}}',
    reconnect: 'Reconnect with {{provider}}',
    manage: 'Manage accounts',
    accountError: '{{account}}: {{error}}',
    unavailable:
      'Sign-in unavailable in this version of Tessera: enter your own ID in Settings → Accounts → Advanced.',
    intro: {
      gmail:
        'Your Gmail messages arrive in this block. Another email provider (OVH, Orange, iCloud…) can be added in the accounts.',
      youtube: 'Your YouTube subscriptions and playlists show up here.',
      calendar: 'Your upcoming Google Calendar events show up here, and you can create some.',
      tasks: 'Your Google Tasks lists (the ones on your phone) can show up here.',
      twitch:
        'Your followed channels that are live show up here, with a notification for each stream.',
      spotify: 'Your playlists, liked songs and recent plays show up here.'
    }
  },
  settings: {
    title: 'Settings',
    search: {
      placeholder: 'Search settings',
      results: 'Results: {{count}}',
      none: 'No setting matches the search.'
    },
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
      },
      videoWheel: {
        label: 'Mouse wheel on a full-screen video',
        description:
          '“Page”: the video slides up and shows the Tessera page below; “Video”: the wheel goes to the video. Also set by the switch that appears at the top of the screen.',
        page: 'Page',
        video: 'Video'
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
    headerAlign: {
      label: 'Page bar widgets',
      description: 'Where the widgets sit between the page title and its buttons.',
      start: 'Left (after the title)',
      center: 'Centred',
      end: 'Right (before “Edit”)',
      'space-between': 'Spread (touching the edges)',
      'space-around': 'Spread (even spacing)'
    },
    screenButtons: {
      label: 'Screen buttons',
      description:
        'Previous and next screen of a scrolling page (one screen: 12 grid rows, the height of the visible area).',
      toolbar: 'In the page bar',
      'top-center': 'Center, top',
      'bottom-center': 'Center, bottom',
      'middle-left': 'Middle, left',
      'middle-right': 'Middle, right',
      'bottom-left': 'Bottom, left',
      'bottom-right': 'Bottom, right',
      hidden: 'Hidden'
    },
    screenRows: {
      label: 'Full screen size',
      description:
        'Grid rows that fill the visible area of a page: fewer rows, taller blocks. Screen limits and the “full screen” block size follow it.',
      value: '{{count}} rows'
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
        'One sign-in for Gmail, YouTube, Calendar and Tasks: tick the services you want, then pick your Google account.',
      googleServices: 'Services:',
      withGoogle: 'Sign in with Google',
      calendar: 'Calendar',
      tasks: 'Tasks',
      addService: 'Add {{name}}',
      addServices: 'Add the other services',
      twitchIntro:
        'Your followed channels that are live, and a notification each time a stream starts. Twitch shows a pre-filled code: just accept.',
      withTwitch: 'Sign in with Twitch',
      reconnectTwitch: 'Reconnect Twitch',
      spotifyIntro:
        'Your playlists, liked songs and recent plays in the Spotify block (a free account works); playback starts in the Spotify app.',
      withSpotify: 'Sign in with Spotify',
      reconnectSpotify: 'Reconnect Spotify',
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
        'Optional. Tessera has its own IDs at Google, Twitch and Spotify; you can use yours instead (leave empty: Tessera’s).',
      guide: 'Create your own IDs',
      googleClientId: 'Google: client ID',
      googleClientSecret: 'Google: client secret',
      twitchClientId: 'Twitch: client ID (“Public” type)',
      spotifyClientId: 'Spotify: Client ID (32 characters)',
      spotifyHelp:
        'On developer.spotify.com/dashboard, create an app (“Web API”) with the Redirect URI {{uri}}, add your account under “User Management” (Spotify limits a development app to 25 accounts added by hand), then paste its “Client ID”.',
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
      search: 'Search for a widget or module…',
      noResults: 'No widget or module matches “{{query}}”.',
      widgetsTitle: 'Widgets',
      modulesTitle: 'Modules',
      collectionsTitle: 'Collections',
      noModules: 'No module installed. Install a .tessera file with the button above.',
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
      },
      logs: {
        title: 'Log',
        intro:
          'Tessera records its errors and what it does with installed apps. Useful to understand or report a problem: no personal data is written.',
        show: 'Show log',
        openFolder: 'Open folder',
        refresh: 'Refresh',
        copy: 'Copy',
        copied: 'Copied',
        empty: 'Nothing recorded yet.',
        names: {
          tessera: 'Errors',
          applications: 'Installed apps'
        },
        descriptions: {
          tessera: 'Crashes and errors of Tessera, its pages and updates.',
          applications:
            'Apps inserted into their blocks, windows hidden or shown again, keyboard refused.'
        }
      }
    }
  }
}
