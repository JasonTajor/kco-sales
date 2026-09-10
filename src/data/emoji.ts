/**
 * The animated emoji palette.
 *
 * Every entry points at one Google Noto animated emoji
 * (https://googlefonts.github.io/noto-emoji-animation). The Lottie files are
 * vendored into `public/emoji/<slug>.json` so the app keeps working offline and
 * never depends on a third-party CDN at runtime.
 *
 * `char` is the plain codepoint. It renders as the fallback before the Lottie
 * loads, and stays the accessible text for screen readers.
 *
 * Only emoji that actually exist in the animated set are listed here. The
 * animated set is a subset of Unicode - most object emoji (phone, shield,
 * calendar, folder) have no animation, which is why the palette leans on faces,
 * hands, and symbols instead.
 */
export interface EmojiEntry {
  /** Directory name in the Noto animation set, mirrored in `public/emoji`. */
  slug: string
  /** Plain unicode fallback. */
  char: string
  /** Spoken name, used when the emoji carries meaning rather than decoration. */
  label: string
}

export const EMOJI = {
  // Greeting and people
  greeting: { slug: '1f44b', char: '👋', label: 'Waving hand' },
  speaking: { slug: '1f5e3_fe0f', char: '🗣️', label: 'Speaking head' },
  callMe: { slug: '1f919', char: '🤙', label: 'Call me hand' },
  ear: { slug: '1f442', char: '👂', label: 'Ear' },
  clap: { slug: '1f44f', char: '👏', label: 'Clapping hands' },
  praise: { slug: '1f64c', char: '🙌', label: 'Raised hands' },
  heartHands: { slug: '1faf6', char: '🫶', label: 'Heart hands' },
  handshake: { slug: '1f91d', char: '🤝', label: 'Handshake' },
  salute: { slug: '1fae1', char: '🫡', label: 'Saluting face' },
  muscle: { slug: '1f4aa', char: '💪', label: 'Flexed biceps' },
  fist: { slug: '270a', char: '✊', label: 'Raised fist' },
  pray: { slug: '1f64f', char: '🙏', label: 'Folded hands' },
  footprints: { slug: '1f463', char: '👣', label: 'Footprints' },

  // Faces - the practice personas
  angry: { slug: '1f624', char: '😤', label: 'Face with steam' },
  sleepy: { slug: '1f634', char: '😴', label: 'Sleeping face' },
  confused: { slug: '1f615', char: '😕', label: 'Confused face' },
  laugh: { slug: '1f604', char: '😄', label: 'Grinning face' },
  thinking: { slug: '1f914', char: '🤔', label: 'Thinking face' },
  eyes: { slug: '1f440', char: '👀', label: 'Eyes' },
  zipper: { slug: '1f910', char: '🤐', label: 'Zipper-mouth face' },
  smile: { slug: '1f60a', char: '😊', label: 'Smiling face' },
  cool: { slug: '1f60e', char: '😎', label: 'Smiling face with sunglasses' },
  sweat: { slug: '1f605', char: '😅', label: 'Grinning face with sweat' },
  starstruck: { slug: '1f929', char: '🤩', label: 'Star-struck face' },
  party: { slug: '1f973', char: '🥳', label: 'Partying face' },
  robot: { slug: '1f916', char: '🤖', label: 'Robot' },
  chick: { slug: '1f423', char: '🐣', label: 'Hatching chick' },

  // Progress and reward
  streak: { slug: '1f525', char: '🔥', label: 'Fire' },
  xp: { slug: '2b50', char: '⭐', label: 'Star' },
  star: { slug: '1f31f', char: '🌟', label: 'Glowing star' },
  level: { slug: '1f451', char: '👑', label: 'Crown' },
  trophy: { slug: '1f3c6', char: '🏆', label: 'Trophy' },
  medal: { slug: '1f947', char: '🥇', label: 'First place medal' },
  gem: { slug: '1f48e', char: '💎', label: 'Gem' },
  goal: { slug: '1f3af', char: '🎯', label: 'Direct hit' },
  perfect: { slug: '1f4af', char: '💯', label: 'Hundred points' },
  celebrate: { slug: '1f389', char: '🎉', label: 'Party popper' },
  gift: { slug: '1f381', char: '🎁', label: 'Wrapped gift' },
  balloon: { slug: '1f388', char: '🎈', label: 'Balloon' },
  rocket: { slug: '1f680', char: '🚀', label: 'Rocket' },
  seedling: { slug: '1f331', char: '🌱', label: 'Seedling' },
  clover: { slug: '1f340', char: '🍀', label: 'Four leaf clover' },
  sparkles: { slug: '2728', char: '✨', label: 'Sparkles' },
  wand: { slug: '1fa84', char: '🪄', label: 'Magic wand' },
  boom: { slug: '1f4a5', char: '💥', label: 'Collision' },
  heart: { slug: '2764_fe0f', char: '❤️', label: 'Red heart' },

  // Learning and work
  books: { slug: '1f4da', char: '📚', label: 'Books' },
  grad: { slug: '1f393', char: '🎓', label: 'Graduation cap' },
  brain: { slug: '1f9e0', char: '🧠', label: 'Brain' },
  idea: { slug: '1f4a1', char: '💡', label: 'Light bulb' },
  pencil: { slug: '270f_fe0f', char: '✏️', label: 'Pencil' },
  writing: { slug: '270d_fe0f', char: '✍️', label: 'Writing hand' },
  theater: { slug: '1f3ad', char: '🎭', label: 'Performing arts' },
  clapper: { slug: '1f3ac', char: '🎬', label: 'Clapper board' },
  dice: { slug: '1f3b2', char: '🎲', label: 'Game die' },
  chat: { slug: '1f4ac', char: '💬', label: 'Speech balloon' },
  megaphone: { slug: '1f4e3', char: '📣', label: 'Megaphone' },
  bolt: { slug: '26a1', char: '⚡', label: 'High voltage' },
  finish: { slug: '1f3c1', char: '🏁', label: 'Chequered flag' },
  flag: { slug: '1f6a9', char: '🚩', label: 'Triangular flag' },
  box: { slug: '1f4e6', char: '📦', label: 'Package' },
  money: { slug: '1f4b8', char: '💸', label: 'Money with wings' },
  chart: { slug: '1f4c8', char: '📈', label: 'Chart increasing' },
  bars: { slug: '1f4ca', char: '📊', label: 'Bar chart' },
  home: { slug: '1f3e0', char: '🏠', label: 'House' },
  gear: { slug: '2699_fe0f', char: '⚙️', label: 'Gear' },
  bell: { slug: '1f514', char: '🔔', label: 'Bell' },
  bellhop: { slug: '1f6ce_fe0f', char: '🛎️', label: 'Bellhop bell' },
  clock: { slug: '23f0', char: '⏰', label: 'Alarm clock' },
  hourglass: { slug: '23f3', char: '⏳', label: 'Hourglass' },

  // States
  success: { slug: '2705', char: '✅', label: 'Check mark' },
  warning: { slug: '26a0_fe0f', char: '⚠️', label: 'Warning' },
  locked: { slug: '1f512', char: '🔒', label: 'Locked' },
  notFound: { slug: '1f50e', char: '🔎', label: 'Magnifying glass' },
  empty: { slug: '1f335', char: '🌵', label: 'Cactus' },
} as const satisfies Record<string, EmojiEntry>

export type EmojiName = keyof typeof EMOJI

export const emojiEntry = (name: EmojiName): EmojiEntry => EMOJI[name]

/** Source for a vendored Lottie file. Kept in one place so the path can move. */
export const emojiSrc = (slug: string) => `/emoji/${slug}.json`
