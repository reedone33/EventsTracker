/**
 * English — the base language.
 *
 * Every other language is checked against this file: a test fails if any of
 * them is missing a key, so a translation can never silently fall back to
 * English without someone noticing.
 *
 * Placeholders look like {name} and are filled in at display time.
 * Keys ending _one and _other are the singular and plural forms; the code picks
 * between them using the count and the language's own plural rules.
 */

export const en = {
  // --- App shell ---
  'app.title': 'Events Tracker',
  'tab.things': 'Things',
  'tab.analytics': 'Analytics',
  'tab.map': 'Map',
  'toolbar.search': 'Search things',
  'toolbar.sortBy': 'Sort by',
  'toolbar.data': 'Data',
  'toolbar.edit': 'Edit',
  'toolbar.reorder': 'Reorder',
  'toolbar.menu': 'Menu',
  'menu.view': 'View',
  'menu.actions': 'Actions',
  'toolbar.language': 'Language',
  'appearance.label': 'Appearance',
  'appearance.system': 'System',
  'appearance.light': 'Light',
  'appearance.dark': 'Dark',
  'toolbar.screen': 'Screen',
  'data.aria': 'Import and export data',
  'action.done': 'Done',
  'action.cancel': 'Cancel',
  'action.save': 'Save',
  'action.delete': 'Delete',
  'action.edit': 'Edit',
  'action.all': 'All',
  'action.none': 'None',
  'action.dismiss': 'Dismiss',
  'action.undo': 'Undo',
  'loading': 'Loading…',

  // --- Sorting ---
  'sort.dateCreated': 'Date Created',
  'sort.ascending': 'A–Z',
  'sort.descending': 'Z–A',
  'sort.manual': 'Manual',

  // --- Location ---
  'location.tag': 'Tag location',
  'location.tagging': 'Tagging location',
  'location.locating': 'Locating…',
  'location.hint': 'Record where you are when you log something',
  'location.denied': 'Location permission was refused. Logs will be saved without a location.',
  'location.unavailable': 'Location is unavailable right now. Logs will be saved without one.',
  'location.unsupported': 'This browser cannot provide location.',

  // --- Grid ---
  'grid.editModeHint': 'Edit mode: tapping a tile no longer logs an event.',
  'grid.reorderHint': 'Drag the tiles into the order you want. On a phone, press and hold a tile first.',
  'grid.reorderNeedsManual': 'Edit mode: tapping a tile no longer logs an event. To rearrange the tiles, switch the sort to Manual.',
  'grid.reorderSearchHint': 'Clear the search box to rearrange the tiles.',
  'grid.empty': 'Nothing tracked yet. Press + to create your first thing, or use Data to import from the iPhone app.',
  'tile.never': 'Never tracked',
  'tile.last': 'Last: {time}',
  'tile.logAria': 'Log {name}. {count} logs so far.',
  'tile.openAria': 'Open {name} history',
  'tile.editAria': 'Edit {name}',
  'tile.deleteAria': 'Delete {name}',
  'tile.addAria': 'Add a new thing',
  'tile.history': 'History',
  'toast.logged': 'Logged {name}',

  // --- Thing add/edit ---
  'thing.new': 'New Thing',
  'thing.edit': 'Edit Thing',
  'thing.name': 'Name',
  'thing.namePlaceholder': 'Thing name',
  'thing.color': 'Color',
  'thing.deleteTitle': 'Delete “{name}”?',
  'thing.deleteMessage_one': 'This also deletes its {count} log entry. This cannot be undone.',
  'thing.deleteMessage_other': 'This also deletes its {count} log entries. This cannot be undone.',

  // --- Storage problems ---
  'blocked.title': 'Saved data could not be read',
  'blocked.reassurance': 'Nothing has been changed or deleted. Saving is switched off until you choose one of the options below.',
  'blocked.showRaw': 'Show the raw saved text (so you can copy it somewhere safe)',
  'blocked.discard': 'Discard it and start with an empty list',
  'storage.readBlocked': 'This browser is blocking local storage, so saved data cannot be read. Check your privacy settings.',
  'storage.damaged': 'The saved data could not be read — the file appears to be damaged.',
  'storage.saveFailed': 'Could not save. The browser storage may be full or blocked.',

  // --- Data panel ---
  'data.title': 'Data',
  'data.backupTitle': 'Back up',
  'data.backupText': 'A complete copy, colors included, for restoring this app exactly as it is. Do this before importing. For a file to open in Excel, use the CSV export below instead.',
  'data.backupButton': 'Download backup ({things} things, {logs} logs)',
  'data.importTitle': 'Import from the iPhone app',
  'data.importText1': 'Choose either the CSV the iPhone app exports, or its internal things.json file if you have it. Dates are converted automatically in both cases.',
  'data.importText2': 'A CSV carries every log with its time, location and note, but not the colors you chose — those get assigned automatically and can be changed afterwards.',
  'data.importUnreadable': 'That file could not be read. Check you picked the right file.',
  'data.importSummary': '{filename} ({format}) contains {things} things and {logs} logs.',
  'data.importReplaceWarning': 'Importing replaces the {count} thing(s) currently in this browser. This cannot be undone.',
  'data.importConfirm': 'Replace and import',

  // --- CSV export ---
  'export.title': 'Export to CSV',
  'export.text': 'Same format the iPhone app exports, so it opens in Excel and can be imported back here.',
  'export.include': 'Include:',
  'export.from': 'From',
  'export.to': 'To',
  'export.empty': 'Nothing to export in this range',
  'export.button_one': 'Export {count} entry to CSV',
  'export.button_other': 'Export {count} entries to CSV',

  // --- Analytics ---
  'chart.frequency': 'Frequency',
  'chart.timeOfDay': 'Time of Day',
  'chart.titleFrequency': 'Tracking Frequency',
  'chart.noData': 'No data to display for this chart.',
  'chart.show': 'Show:',
  'chart.groupBy': 'Group by',
  'chart.detail': 'Detail',
  'chart.type': 'Chart type',
  'chart.showingCount': 'Showing {shown} of {total} things. Add more above, or press All — though past about eight lines a chart gets hard to read.',
  'chart.nothingSelected': 'Nothing selected. Choose at least one thing above.',
  'chart.noThings': 'Nothing to chart yet. Add something on the Things tab, or import your existing data.',
  'chart.logsInSlot': 'Logs in this slot',
  'granularity.day': 'Daily',
  'granularity.month': 'Monthly',
  'granularity.year': 'Yearly',
  'timescale.hourly': 'Hourly',
  'timescale.byMinute': 'By Minute',

  // --- Thing detail ---
  'detail.rename': 'Rename',
  'detail.exportCsv': 'Export',
  'detail.addEntry': 'Add entry',
  'detail.history': 'History',
  'detail.noEntries': 'No entries yet. Press “Add entry” to record one.',
  'detail.entries_one': '{count} entry',
  'detail.entries_other': '{count} entries',
  'detail.range': '{start} to {end}',
  'detail.aria': '{name} history',

  // --- Log entries ---
  'log.addTitle': 'Add Entry — {name}',
  'log.editTitle': 'Edit Entry — {name}',
  'log.when': 'When',
  'log.note': 'Note (optional)',
  'log.notePlaceholder': 'Anything worth remembering about this one',
  'log.locationRecorded': 'Recorded at {latitude}, {longitude}. Location is captured when logging and isn’t edited here.',
  'log.dateError': 'That date and time could not be read. Check the format.',
  'log.unreadableDate': 'Unreadable date',
  'log.deleteTitle': 'Delete this entry?',
  'log.deleteMessage': '{when} will be removed. This cannot be undone.',

  // --- Map ---
  'map.nothingToMap': 'Nothing to map yet.',
  'map.noLocations': 'No locations to show. Entries only appear on the map if they were recorded with a location — turn on Tag location in the toolbar, and new entries will be placed here.',
  'map.summary': '{places} places, {entries} entries. Entries of the same thing within 300 feet share a pin.',
  'map.entriesHere_one': '{count} entry here',
  'map.entriesHere_other': '{count} entries here',

  // --- Import warnings, raised by the import code and shown in the interface ---
  'warn.fileEmpty': 'That file was empty.',
  'warn.headersOnly': 'That file had column headings but no rows of data.',
  'warn.notAList': 'The file did not contain a list of things, so nothing was imported.',
  'warn.noThingsFound': 'No things were found in that file. Check you picked the CSV exported from the iPhone app.',
  'warn.skippedRows_one': '{count} row was skipped because it had no name or no readable date.',
  'warn.skippedRows_other': '{count} rows were skipped because they had no name or no readable date.',
  'warn.skippedThings_one': '{count} item was skipped because it had no name.',
  'warn.skippedThings_other': '{count} items were skipped because they had no name.',
  'warn.skippedLogs_one': '{count} log entry was skipped because it had no readable date.',
  'warn.skippedLogs_other': '{count} log entries were skipped because they had no readable date.',
  'warn.duplicateNames': 'These names are used more than once, which will be confusing in charts: {names}.',
  'warn.colorsAssigned': 'Colors were assigned automatically — the CSV does not record them. Change any of them from the Things tab.',
  'warn.tooManyColors': 'There are {count} things but only {limit} guaranteed-distinct colors, so some will look similar. Worth adjusting the ones you chart together.',
}

/** The shape every language must satisfy. */
export type TranslationKey = keyof typeof en
export type Translations = Record<TranslationKey, string>
