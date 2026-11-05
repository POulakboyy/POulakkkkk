import type { canvas as fr } from '../fr/canvas.ts';

export const canvas: typeof fr = {
  title: 'Canvas',
  untitled: 'Untitled canvas',
  new: 'New canvas',
  list: 'All canvases',
  titleLabel: 'Canvas title',
  more: 'More actions',

  mode: {
    label: 'View',
    canvas: 'Canvas',
    outline: 'Outline',
  },

  tools: {
    label: 'Tools',
    select: 'Select',
    pan: 'Hand',
    node: 'Node',
    edge: 'Link',
    draw: 'Pen',
    eraser: 'Eraser',
    withKey: '{tool} ({key})',
  },

  ink: {
    label: 'Ink',
    color: 'Color {n}',
    ink: 'Ink black',
    thin: 'Thin stroke',
    medium: 'Medium stroke',
    bold: 'Bold stroke',
  },

  node: {
    empty: 'Empty node',
    placeholder: 'Write…',
    editLabel: 'Node text',
    newIdea: 'New idea',
    add: 'Add a node',
    addChild: 'Add a child',
    addSibling: 'Add a sibling',
    edit: 'Edit text',
    delete: 'Delete',
    color: 'Color',
    noColor: 'No color',
    colorN: 'Color {n}',
    convertToTask: 'Turn into a task',
    markDone: 'Mark as done',
    reopen: 'Reopen task',
    a11y: '{label}, {children, plural, =0 {no children} one {# child} other {# children}}',
    task: 'task',
    done: 'done',
    locked: 'locked',
    selected: '{count, plural, one {# node selected} other {# nodes selected}}',
  },

  edge: {
    label: 'Link',
    delete: 'Delete link',
    conditional: 'Conditional link',
    conditionalHint: 'The target unlocks once the source is done.',
    makeConditional: 'Unlock when the source is done',
    makePlain: 'Plain link',
    locked: 'Locked · waiting for “{title}”',
    unlocked: '{count, plural, one {# step unlocked} other {# steps unlocked}}',
  },

  layout: {
    menu: 'Arrange',
    force: 'Untangle',
    forceHint: 'Nodes push apart and links pull tight until everything settles.',
    running: 'Arranging…',
    stop: 'Stop',
    tree: 'Tree',
    mindmap: 'Mind map',
  },

  collapse: {
    collapse: 'Collapse branch',
    expand: 'Expand branch',
    collapseAll: 'Collapse all',
    expandAll: 'Expand all',
    hidden: '{count, plural, one {# hidden node} other {# hidden nodes}}',
  },

  timeline: {
    toggle: 'Timeline mode',
    on: 'Timeline on · moving a node right pushes its due date',
    off: 'Timeline off',
    dueChanged: 'Due date set to {date}',
    duesChanged: '{count, plural, one {# due date updated} other {# due dates updated}}',
  },

  view: {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomLevel: 'Zoom {percent}',
    fit: 'Fit to screen',
    minimap: 'Minimap',
    roleDescription: 'canvas',
    minimapA11y: 'Minimap: tap a point to move the view there',
    canvasA11y: 'Canvas “{title}”, {count, plural, one {# node} other {# nodes}}',
    keyboardHelp:
      'Arrows: select the node nearest the centre, then move between nodes. Shift + arrows: pan. Tab: add a child. Enter: add a sibling. F2: edit. Delete: remove. + and −: zoom. 0: fit to screen. Escape: clear the selection, then Tab to leave the canvas. The Outline view shows the same canvas as a list.',
    hiddenCount: '{count, plural, one {# collapsed item} other {# collapsed items}}',
  },

  present: {
    start: 'Present',
    stop: 'Exit presentation',
    addWaypoint: 'Add this view to the tour',
    waypointAdded: 'Step {count} added to the tour',
    clear: 'Clear the tour',
    step: 'Step {current} of {total}',
    next: 'Next step',
    previous: 'Previous step',
    empty: 'Frame a view, then add it to the tour to build a presentation.',
    overview: 'Overview',
  },

  export: {
    title: 'Export',
    svg: 'Vector image (SVG)',
    png: 'Transparent PNG image',
    markdown: 'Markdown outline',
    opml: 'OPML',
    done: 'Export ready: {file}',
    failed: 'The export did not complete. Try again with a smaller canvas.',
  },

  import: {
    tasks: 'Turn my tasks into a tree',
    tasksDone:
      '{count, plural, one {# task turned into a tree} other {# tasks turned into a tree}}',
    noTasks: 'No tasks to turn into a tree yet.',
    failed: 'This content could not be read. Drop a Markdown list or an OPML file.',
    pasted: '{count, plural, one {# node created from text} other {# nodes created from text}}',
    dropHint: 'Drop a list or an OPML file to turn it into a tree',
  },

  starter: {
    root: 'My project',
    b1: 'Goals',
    b2: 'Ideas',
    b3: 'Questions',
    b4: 'Next steps',
  },

  outline: {
    label: 'Canvas outline',
    hint: 'The outline shows the canvas as a list. Left and right arrows: collapse or expand.',
    empty: 'The canvas is empty.',
  },

  toast: {
    deleted: '{count, plural, one {# node deleted} other {# nodes deleted}}',
    linked: 'Nodes linked',
    converted: 'Task created',
  },

  empty: {
    title: 'A blank canvas',
    body: 'Double-click anywhere to place a first idea, or start from your tasks.',
    action: 'Start a mind map',
    tasks: 'Start from my tasks',
  },

  dev: {
    stress: 'Load test · 10,000 nodes',
    stats: '{nodes} nodes drawn · {ms} ms',
  },
};
