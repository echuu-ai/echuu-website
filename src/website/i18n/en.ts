import type { Dict } from './zh';

/** Working draft. Not native-reviewed yet — see docs/OPEN_ITEMS.md. */
export const en: Dict = {
  localeName: 'English',
  htmlLang: 'en',

  nav: {
    brand: 'Echuu',
    home: 'Home',
    demo: 'Watch the demo',
    how: 'How it works',
    gallery: 'Characters',
    creators: 'Creator partnerships',
    apply: 'Join the beta',
    menu: 'Menu',
    close: 'Close',
    openMenu: 'Open menu',
    language: 'Language',
    skipToContent: 'Skip to main content',
  },

  hero: {
    tagline: 'To recreate life out of live',
    taglineLineBreak: 'To recreate life / out of live',
    category: 'An AI VTuber platform for your Original Character',
    lede: 'Define your character, choose a topic, and let them tell stories and interact with viewers.',
    ctaPrimary: 'Join the beta waitlist',
    ctaPrimaryEmail: 'Apply for the beta by email',
    ctaSecondary: 'Watch the demo',
    status: 'In closed beta. Features are still evolving.',
    skyAlt: '',
  },

  video: {
    title: 'Hear them say a few words first.',
    body: 'A recording of a character on stream.',
    play: 'Play the demo',
    statusBeta: 'Beta demo',
    statusLocal: 'Local prototype demo',
    unavailable: 'If the player will not load, you can open the original video directly.',
    openExternal: 'Open on YouTube',
    posterAlt: 'Intro video cover frame',
  },

  steps: {
    title: 'From setup to live, in three steps.',
    items: [
      { no: '01', title: 'Pick a look', body: 'Use a sample character, or upload a VRM model you have the rights to use.' },
      { no: '02', title: 'Write the persona', body: 'Tell us their personality, their history, and how they speak.' },
      { no: '03', title: 'Set a topic', body: 'Write what you want to talk about this time, preview it, and start.' },
    ],
    guideLink: 'Read the setup guide',
    vrmNote: 'VRM is a file format for 3D character models.',
    stepTab: 'Step {n}',
  },

  features: {
    title: 'A persona is more than a character sheet.',
    items: [
      { title: 'Speak in character', body: 'Personality and history shape how they talk.' },
      { title: 'Turn a topic into a story', body: 'Start from one topic and give the character something to tell.' },
      { title: 'Let viewers take part', body: 'Comments and gifts can shape what happens next.' },
    ],
    researchTag: 'Prototype demo',
  },

  modes: {
    title: 'Chat today. What about next time?',
    items: [
      { name: 'Chat & stories', status: 'beta', body: 'Talk through the persona, tell stories, answer viewers.' },
      { name: 'Video reactions', status: 'dev', body: 'Watch a video together and hear what they think.' },
      { name: 'Singing streams', status: 'dev', body: 'Let the character arrive in song.' },
    ],
    statusBeta: 'Beta demo',
    statusDev: 'In development',
    footnote: 'More modes are in development. Release timing is not set.',
    toApply: 'Go to beta contact',
  },

  gallery: {
    title: 'See the characters on stage.',
    demoOnly: 'The material below is product demo footage.',
    labels: { character: 'Character', creator: 'Creator', type: 'Performance', status: 'Material status' },
    open: 'View demo and credits',
    more: 'More demos and credits',
    modalClose: 'Close',
    credits: 'Credits and source',
    aiNote: 'Where AI is involved',
    noDownload: 'No model downloads are offered on this page.',
  },

  creators: {
    title: 'Every character starts with its creator.',
    manifesto: 'We will always support human artists and the people who build IP.',
    body: 'Illustrators, rigging artists, and 3D modellers are welcome to bring characters to the stage with us.',
    cta: 'Talk about working together',
    secondary: 'Read the creator and IP notes',
    intentsTitle: 'Three kinds of collaboration',
    intents: [
      { title: 'Show your work', body: 'Feature your work on the site or in a demo, with credit attached to the piece.' },
      { title: 'Character and model work', body: 'Discuss a specific piece of illustration, rigging, or 3D modelling.' },
      { title: 'Joint demo', body: 'Build a demo together, and agree on what goes public before it does.' },
    ],
    disclaimer: 'These are collaboration intents. There is no commission marketplace, order system, revenue-share policy, or official certification yet.',
  },

  trust: {
    title: 'What the AI does, and who owns the character.',
    items: [
      { title: 'AI takes part in the performance', body: 'Dialogue, voice, and other performance content may be AI generated.' },
      { title: 'Rights do not transfer', body: 'You keep your existing rights to your Original Character and assets. Third-party assets follow their own licences.' },
      { title: 'Showcasing needs separate consent', body: 'Applying for the beta or uploading a character is not consent to be featured on this site.' },
    ],
    links: { ai: 'AI content disclosure', ip: 'Character and asset rights', privacy: 'Privacy policy' },
  },

  journal: {
    title: 'What we are working on.',
    catAll: 'All',
    catProduct: 'Product notes',
    catResearch: 'Research notes',
    emptyResearch: 'Research notes are being put together.',
    shortNote: 'Short note',
    readAll: 'Read all notes',
    source: 'Source',
  },

  apply: {
    title: 'The next one on stage is your Original Character.',
    body: 'Want to try it? Tell us how to reach you.',
    cta: 'Join the beta waitlist',
    ctaEmail: 'Apply for the beta by email',
    altContact: 'You can also just write to us.',
    copyEmail: 'Copy the email address',
    copied: 'Copied',
    emailSubject: 'Echuu closed beta application',
    emailBody: 'Hi Echuu team,\n\nI would like to apply for the closed beta.\n\nContact email:\nCharacter summary (optional):\nPortfolio link (optional):\n\nThank you!',
    mailNote: 'The button opens your mail app with the subject filled in. You can edit it before sending.',
  },

  community: {
    feedbackTitle: 'Something in the way?',
    feedbackBody: 'Report a problem, or tell us what you want.',
    feedbackCta: 'Write a suggestion',
    doodleTitle: 'Take a break here.',
    doodleBody: 'Leave a small doodle for your Original Character.',
    doodleCta: 'Draw something',
  },

  footer: {
    product: 'Product',
    productLinks: { demo: 'Watch the demo', guide: 'Setup guide' },
    creators: 'Creators',
    creatorLinks: { partner: 'Creator partnerships', rights: 'Character and asset rights' },
    community: 'Community',
    communityLinks: { feedback: 'Feedback', doodle: 'Doodle corner', journal: 'Journal' },
    legal: 'Legal',
    legalLinks: { terms: 'Terms of service', privacy: 'Privacy policy', ai: 'AI content disclosure' },
    social: 'Social',
    contact: 'Contact',
    rights: 'Echuu. Character rights belong to their creators.',
    draftNotice: 'Legal documents are review drafts. Operator and data-processing details still require confirmation.',
  },

  feedbackPage: {
    title: 'Feedback',
    lede: 'Report a problem, or tell us what you want.',
    category: 'Category',
    categories: { bug: 'Problem', idea: 'Feature request', other: 'Other' },
    message: 'Message',
    messagePlaceholder: 'What happened? What did you expect instead?',
    contact: 'Contact (optional)',
    contactPlaceholder: 'Email or social handle, so we can reply',
    submit: 'Send with your mail app',
    copy: 'Copy this feedback',
    copied: 'Copied',
    counter: '{n} / {max} characters',
    tooLong: 'This is over the length limit. Please shorten it before sending.',
    required: 'Please write your message first.',
    noBackendNotice: 'There is no inbox service connected yet. Nothing is submitted automatically — send it by email or copy it yourself.',
    privacyNotice: 'Please do not include passwords or payment details. Anonymous submission is not implemented; email carries your sender address.',
  },

  doodlePage: {
    title: 'Doodle corner',
    lede: 'Leave a small doodle for your Original Character.',
    start: 'Start drawing',
    color: 'Colour',
    size: 'Brush size',
    undo: 'Undo',
    clear: 'Clear',
    export: 'Export PNG',
    saveLocal: 'Save in this browser',
    restored: 'Loaded your last saved doodle.',
    saved: 'Saved in this browser.',
    unsaved: 'You have unsaved changes.',
    localOnly: 'Saved in this browser only. Nothing is published.',
    noPublicWall: 'The public wall has no storage or moderation connected yet, so submissions are not open.',
    canvasLabel: 'Doodle canvas',
    textAlternative: 'Not in the mood to draw? Write to us instead.',
  },

  galleryPage: {
    title: 'Characters',
    lede: 'Demo material and credits.',
    backHome: 'Back to home',
  },

  creatorsPage: {
    title: 'Creator partnerships',
    lede: 'Notes and contact details for illustrators, rigging artists, and 3D modellers.',
    howTitle: 'How to reach us',
    howBody: 'Email us your portfolio link and what you would like to work on, and we will reply. The template already has those fields.',
    emailSubject: 'Echuu creator partnership',
    emailBody: 'Hi Echuu team,\n\nI would like to talk about working together.\n\nMy role (illustrator / rigging artist / 3D modeller / other):\nPortfolio link:\nWhat I have in mind (show my work / character and model work / joint demo):\n\nThank you!',
  },

  journalPage: {
    title: 'Notes',
    lede: 'Product notes and research notes.',
  },

  blogPage: {
    title: 'Journal',
    lede: 'Product thinking, character performance design and AI VTuber craft.',
    readMore: 'Read more',
    backToList: 'Back to all posts',
    note: 'Chinese is the source text; the Japanese, English and Korean versions are working drafts, not yet reviewed by native speakers.',
  },

  teamPage: {
    title: 'Team',
    lede: 'A small team bringing original characters on stage.',
    coreTitle: 'Core team',
    advisorTitle: 'Technical advisor',
    aboutTitle: 'About Echuu',
    facts: [
      ['Name', 'Echuu / エチュウゥ / 爱啾'],
      ['Developer', 'Echuu (Anngel LLC, Nevada, USA), founded and led by Cory Yihua Li'],
      ['Founded', '2025'],
      ['Based in', 'Shanghai, China / Nevada, USA'],
      ['Platforms', 'Web and desktop, with output to Twitch, YouTube and Bilibili'],
      ['Press contact', 'cory@anngel.live'],
    ],
    thanks: 'Built on Qwen (Alibaba Cloud), LiveKit, VRoid, three-vrm and the open VRM ecosystem. Special thanks to the 215 creators on the waitlist, who let us meet their characters before anyone else.',
    source: 'Kept in sync with the Notion press kit (last updated 2026-08-28).',
    github: 'GitHub',
    website: 'Website',
  },

  legal: {
    draftBadge: 'Contains draft and placeholder items',
    sourceLang: 'Source language: Simplified Chinese',
    noTranslation: 'This document currently exists in Chinese only. There is no approved English translation yet.',
    openOriginal: 'Open the original',
  },

  meta: {
    home: {
      title: 'Echuu — An AI VTuber platform for your Original Character',
      description: 'Define your character, choose a topic, and let them tell stories and interact with viewers. Echuu is in closed beta.',
    },
    gallery: { title: 'Characters — Echuu', description: 'Demo material and creator credits from Echuu.' },
    creators: { title: 'Creator partnerships — Echuu', description: 'Notes for illustrators, rigging artists, and 3D modellers.' },
    journal: { title: 'Notes — Echuu', description: 'Product notes and research notes from Echuu.' },
    blog: { title: 'Journal — Echuu', description: 'Product thinking, character performance design and AI VTuber craft from Echuu.' },
    team: { title: 'Team — Echuu', description: 'The Echuu team and technical advisor bringing original characters on stage.' },
    feedback: { title: 'Feedback — Echuu', description: 'Report a problem, or tell us what you want.' },
    doodle: { title: 'Doodle corner — Echuu', description: 'Leave a small doodle for your Original Character.' },
  },

  common: {
    notFound: 'We could not find that page.',
    backHome: 'Back to home',
    externalLink: '(external link)',
    loading: 'Loading',
    pendingMaterial: 'Material pending',
    materialNote: 'A real product screen goes here, once the material is obtained and its rights are checked.',
  },
};
