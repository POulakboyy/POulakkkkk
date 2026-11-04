import type { canvas as fr } from '../fr/canvas.ts';

export const canvas: typeof fr = {
  title: 'Canvas',
  untitled: 'Untitled canvas',
  new: 'New canvas',
  list: 'All canvases',

  tools: {
    label: 'Tools',
    select: 'Select',
    pan: 'Pan',
    node: 'Node',
    text: 'Text',
    edge: 'Link',
    draw: 'Freehand',
    shape: 'Shape',
    eraser: 'Eraser',
    withKey: '{tool} ({key})',
  },

  node: {
    placeholder: 'Write…',
    add: 'Add node',
    addChild: 'Add child',
    addSibling: 'Add sibling',
    delete: 'Delete node',
    linkTo: 'Link to…',
    openTask: 'Open task',
    openNote: 'Open note',
    convertToTask: 'Turn into task',
    embed: 'Embed content',
    embedPlaceholder: 'Paste a video link, a page or a code block',
    a11y: 'Node “{label}”, {children, plural, =0 {no children} one {# child} other {# children}}',
  },

  edge: {
    label: 'Link',
    delete: 'Delete link',
    conditional: 'Conditional link',
    conditionalHint: 'The target unlocks once the source is done.',
    makeConditional: 'Unlock only when the source is done',
    makePlain: 'Plain link',
    locked: 'Locked · waiting on “{title}”',
    unlocked: '“{title}” is unlocked',
    a11y: 'Link from “{from}” to “{to}”',
  },

  layout: {
    auto: 'Untangle',
    autoHint: 'Rearranges nodes so links cross as little as possible.',
    running: 'Arranging…',
    done: 'Canvas untangled',
    tree: 'Tree',
    radial: 'Radial',
    force: 'Freeform',
  },

  collapse: {
    collapse: 'Collapse branch',
    expand: 'Expand branch',
    collapseAll: 'Collapse all',
    expandAll: 'Expand all',
    hidden: '{count, plural, one {# node hidden} other {# nodes hidden}}',
  },

  timeline: {
    toggle: 'Timeline mode',
    on: 'Timeline mode on · moving a node right pushes its due date',
    off: 'Timeline mode off',
    dueChanged: 'Due date moved to {when}',
    noDate: 'No due date',
  },

  view: {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomLevel: 'Zoom {percent}',
    fit: 'Fit to screen',
    center: 'Center on selection',
    minimap: 'Minimap',
    showMinimap: 'Show minimap',
    hideMinimap: 'Hide minimap',
    minimapA11y: 'Minimap: the framed area is the visible part of the canvas',
  },

  present: {
    start: 'Present',
    stop: 'Exit presentation',
    addWaypoint: 'Add a stop to the path',
    removeWaypoint: 'Remove this stop',
    step: 'Stop {current} of {total}',
    empty: 'Add stops to build a path from node to node.',
  },

  export: {
    title: 'Export canvas',
    format: 'Format',
    svg: 'SVG',
    png: 'PNG (transparent background)',
    pdf: 'PDF',
    markdown: 'Markdown outline',
    opml: 'OPML',
    exporting: 'Exporting…',
    done: 'Export ready',
    failed: 'Export didn’t work. Try again with a smaller area.',
  },

  convert: {
    toOutline: 'View as outline',
    fromList: 'Drop a list to turn it into a tree',
    converted: '{count, plural, one {# node created} other {# nodes created}}',
  },

  templates: {
    title: 'Templates',
    blank: 'Blank canvas',
    mindmap: 'Mind map',
    flow: 'Flowchart',
    org: 'Org chart',
    uml: 'UML',
    bpmn: 'BPMN',
  },

  toast: {
    nodeDeleted: 'Node deleted',
    nodesDeleted: '{count, plural, one {# node deleted} other {# nodes deleted}}',
    linked: 'Nodes linked',
  },

  empty: {
    title: 'A blank canvas',
    body: 'Double-click or double-tap anywhere to place a first idea.',
    action: 'Add node',
    secondary: 'Start from a template',
  },
};
