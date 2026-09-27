/**
 * Frame fixtures - the single source of truth shared by the gallery, the
 * favorite/store layer and the upload flow.
 *
 * These are REAL frames copied into `public/frames/` from
 * G:\bookmarker\frames\frame_001.png ... frame_009.png, so every `src` here
 * resolves to a file that actually ships with the build.
 */

export interface Frame {
  /** Stable id, also used as the store / favorite key. */
  id: string
  /** Original filename on disk, e.g. "frame_001.png". */
  filename: string
  /** Public URL path served from public/, e.g. "/frames/frame_001.png". */
  src: string
  /** Human readable caption shown on the card and in the dialog. */
  title: string
  /** Source series. */
  series: string
  /** Episode label, free-form ("EP 04"). */
  episode: string
  /** Speaker / character for the line, used in the dialog. */
  character: string
  /** Timestamp inside the episode, "-" when unknown. */
  timestamp: string
  /** Alt text for the image. */
  alt: string
  /** Search tags, lowercase. */
  tags: string[]
  /** Intrinsic pixel dimensions. */
  width: number
  height: number
  /** Upload epoch millis; null for the bundled fixtures. */
  addedAt: number | null
  /** Where the frame came from. */
  origin: 'fixture' | 'upload'
}

/** Intrinsic size shared by all bundled frames (1600x900 16:9 stills). */
export const FRAME_WIDTH = 1600
export const FRAME_HEIGHT = 900

/** Path of the bundled frames inside public/. */
export const FRAMES_PUBLIC_DIR = '/frames'

/** Build the public src for an uploaded or fixture frame filename. */
export function frameSrc(filename: string): string {
  return `${FRAMES_PUBLIC_DIR}/${filename}`
}

/**
 * The nine bundled fixtures. Titles, series and tags are archive-flavoured
 * rather than generic - no filler copy, no marketing language.
 */
export const fixtureFrames: Frame[] = [
  {
    id: 'frame_001',
    filename: 'frame_001.png',
    src: '/frames/frame_001.png',
    title: 'Rain on the crossing',
    series: 'Kagerou Line',
    episode: 'EP 04',
    character: 'Aoi',
    timestamp: '00:12:41',
    alt: 'Frame of Aoi standing at a rain-soaked level crossing at dusk',
    tags: ['rain', 'city', 'dusk', 'wide'],
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    addedAt: null,
    origin: 'fixture',
  },
  {
    id: 'frame_002',
    filename: 'frame_002.png',
    src: '/frames/frame_002.png',
    title: 'Convenience store glow',
    series: 'Kagerou Line',
    episode: 'EP 04',
    character: 'Ren',
    timestamp: '00:15:03',
    alt: 'Frame of Ren inside a lit convenience store aisle at night',
    tags: ['interior', 'night', 'neon', 'close'],
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    addedAt: null,
    origin: 'fixture',
  },
  {
    id: 'frame_003',
    filename: 'frame_003.png',
    src: '/frames/frame_003.png',
    title: 'Rooftop before the bell',
    series: 'Kagerou Line',
    episode: 'EP 07',
    character: 'Aoi',
    timestamp: '00:06:22',
    alt: 'Frame of Aoi alone on a school rooftop under a pale morning sky',
    tags: ['rooftop', 'morning', 'sky', 'wide'],
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    addedAt: null,
    origin: 'fixture',
  },
  {
    id: 'frame_004',
    filename: 'frame_004.png',
    src: '/frames/frame_004.png',
    title: 'Train window, moving light',
    series: 'Kagerou Line',
    episode: 'EP 07',
    character: 'Ren',
    timestamp: '00:18:55',
    alt: 'Frame of Ren seated by a train window with light streaking past',
    tags: ['train', 'interior', 'motion', 'medium'],
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    addedAt: null,
    origin: 'fixture',
  },
  {
    id: 'frame_005',
    filename: 'frame_005.png',
    src: '/frames/frame_005.png',
    title: 'Stairwell, red lantern',
    series: 'Yomawari Notes',
    episode: 'EP 02',
    character: 'Mika',
    timestamp: '00:09:17',
    alt: 'Frame of Mika climbing a narrow stairwell lit by a red lantern',
    tags: ['interior', 'lantern', 'stairs', 'close'],
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    addedAt: null,
    origin: 'fixture',
  },
  {
    id: 'frame_006',
    filename: 'frame_006.png',
    src: '/frames/frame_006.png',
    title: 'Festival crowd, held still',
    series: 'Yomawari Notes',
    episode: 'EP 05',
    character: 'Mika',
    timestamp: '00:14:48',
    alt: 'Frame of a festival crowd frozen mid-step under paper lanterns',
    tags: ['festival', 'crowd', 'night', 'wide'],
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    addedAt: null,
    origin: 'fixture',
  },
  {
    id: 'frame_007',
    filename: 'frame_007.png',
    src: '/frames/frame_007.png',
    title: 'Kitchen, two cups',
    series: 'Yomawari Notes',
    episode: 'EP 05',
    character: 'Mika',
    timestamp: '00:21:02',
    alt: 'Frame of two cups on a kitchen counter in late afternoon light',
    tags: ['interior', 'kitchen', 'quiet', 'medium'],
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    addedAt: null,
    origin: 'fixture',
  },
  {
    id: 'frame_008',
    filename: 'frame_008.png',
    src: '/frames/frame_008.png',
    title: 'Shoreline, last train',
    series: 'Higan Shore',
    episode: 'EP 11',
    character: 'Souta',
    timestamp: '00:19:36',
    alt: 'Frame of Souta on a dark shoreline as the last train crosses a bridge',
    tags: ['sea', 'night', 'bridge', 'wide'],
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    addedAt: null,
    origin: 'fixture',
  },
  {
    id: 'frame_009',
    filename: 'frame_009.png',
    src: '/frames/frame_009.png',
    title: 'Empty classroom, window seat',
    series: 'Higan Shore',
    episode: 'EP 11',
    character: 'Souta',
    timestamp: '00:23:10',
    alt: 'Frame of an empty classroom with light falling on the window seat',
    tags: ['classroom', 'afternoon', 'empty', 'medium'],
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    addedAt: null,
    origin: 'fixture',
  },
]

/** Frame count of the bundled set, used by tests and the header stats. */
export const FIXTURE_COUNT = fixtureFrames.length

export default fixtureFrames
