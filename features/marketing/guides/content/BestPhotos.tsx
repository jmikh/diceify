import Image from 'next/image'
import Link from 'next/link'
import { DICE_PARAM_BOUNDS, THRESHOLDS, type ColorMode } from '@/core/dice'
import GuidePage, { EditorLink, SectionHeading } from '../GuidePage'
import { BEST_PHOTOS } from '../data'
import { formatCount, gridFor } from '../size'

const S = Object.fromEntries(BEST_PHOTOS.sections.map(s => [s.id, s]))

// The same photo in each colour mode (rendered by scripts/gen-color-mode-examples.ts; also used on /dice-art).
const COLOR_MODE_EXAMPLES: { mode: ColorMode; label: string; alt: string }[] = [
    { mode: 'black', label: 'Black dice only', alt: 'A boy\'s portrait as a 50×50 dice mosaic made with black dice only: dark and murky, the face hard to read' },
    { mode: 'white', label: 'White dice only', alt: 'The same 50×50 portrait made with white dice only: pale and washed out' },
    { mode: 'both', label: 'Black + white dice', alt: 'The same 50×50 portrait made with black and white dice: clear, with strong contrast between face and background' },
]
const colorModeImage = (mode: ColorMode) => `/images/dice-art/kids-50x50-${mode}.webp`

const GRID_EXAMPLES = [30, 60, 100].map(rows => gridFor('1:1', rows))
const { min: MIN_ROWS, max: MAX_ROWS } = DICE_PARAM_BOUNDS.numRows

export default function BestPhotos() {
    return (
        <GuidePage
            guide={BEST_PHOTOS}
            lead={
                <>
                    The best photo for dice art has one subject, cropped tight, on a plain background, with real
                    contrast between light and dark. Resolution barely matters. Grid size and dice colour decide the rest.
                </>
            }
            cta={{
                heading: 'Try your photo',
                text: 'Upload it, drag the crop, and watch the dice preview update. If the face reads at 50 rows, it will read on the wall.',
            }}
        >
            <SectionHeading section={S['what-works']} />
            <p>
                A dice portrait has twelve shades and no colour. Every pixel of your photo becomes part of one die,
                so a 50-row piece has 2,500 "pixels" to describe a face. Photos that work are the ones that still make
                sense at that size: a close face, a strong silhouette, a pet against a plain wall. Photos that fail
                have the subject small in the frame, a cluttered background, or soft, even lighting that leaves
                everything mid-grey. The <Link href="/dice-art">dice art guide</Link> explains the twelve-shade scale;
                this page is about choosing and preparing the photo that goes into it.
            </p>

            <SectionHeading section={S['crop-tight']} />
            <p>
                Crop tighter than feels natural. In a normal portrait the face might fill a third of the frame. In
                dice, that third becomes a few hundred dice, and the eyes end up two dice wide. Crop so the head fills
                most of the frame, chin near the bottom edge, a little space above the hair. You can lose the ears.
                Nobody misses the ears.
            </p>
            <p>
                The editor's crop step offers five shapes: square, 3:4 and 2:3 portrait, 4:3 landscape, and 16:9.
                Square and 3:4 suit single faces. Use a wide crop only when the subject is wide too, such as two people
                side by side. The crop shape also sets how many columns you get for a given row count, so{' '}
                <Link href="/dice-art/size-calculator">choose a grid size</Link> with the crop in mind: a 3:4 crop at
                60 rows is 45 columns and {formatCount(gridFor('3:4', 60).dice)} dice.
            </p>

            <SectionHeading section={S['one-subject']} />
            <p>
                One face, one pet, one object. Two faces split the dice between them and each gets half the detail;
                a group of four at 50 rows is four blurs. If you want a couple, go to 80–100 rows or build two pieces.
            </p>
            <p>
                The background matters as much as the subject. A plain wall, a sky, or a dark room becomes a flat field
                of one or two die faces, and the subject stands out against it. Trees, bookshelves and patterned
                fabric become noise in the same shades as hair and skin, and the edge of the face disappears into
                them. If the background is busy, crop it out or pick a different photo. You cannot blur it away with
                the sliders.
            </p>

            <SectionHeading section={S['contrast']} />
            <p>
                Dice cannot show subtle tone. The scale has twelve steps, and the middle ones (a black die with many
                pips, a white die with many pips) look similar from a distance. A photo that lives in that middle
                range comes out flat. A photo with real darks and real lights uses the ends of the scale, where black
                and white dice differ most, and reads from across the room.
            </p>
            <ul>
                <li><strong>Side lighting</strong> from a window puts one half of the face in shadow. That shadow is what shapes the nose and cheek in dice.</li>
                <li><strong>Dark hair on a light background</strong> (or the reverse) draws the outline for you.</li>
                <li><strong>Flat, even light</strong> such as an overcast day or a camera flash straight on gives a face with no shadows, and the dice have nothing to describe.</li>
                <li><strong>Black-and-white film-style photos</strong> with deep shadows are ideal. Convert yours to greyscale first to see what the dice will see.</li>
            </ul>
            <p>
                The contrast slider in the editor can stretch a flat photo, but it stretches the noise too. Start
                with contrast in the photo, then use the slider to fine-tune.
            </p>

            <SectionHeading section={S['resolution']} />
            <p>
                You do not need a sharp photo. The generator does not pick one pixel per die; it averages every pixel
                that falls inside the die's cell into one brightness value, weighting partial pixels at the edges by
                how much of them is inside. A 50-row piece from a 1,000-pixel-wide photo averages 400 pixels into each
                die. A blurry old scan, a screenshot, or a phone photo from ten years ago all have more than enough
                information. What a low-resolution photo cannot survive is the crop: if the face is 60 pixels wide
                in the original, cropping to it leaves about one pixel per die, and the averaging has nothing to
                smooth. So the rule is: resolution does not matter, but the face must have more pixels across than
                your grid has columns.
            </p>

            <SectionHeading section={S['grid-size']} />
            <p>
                Rows set the detail, from {MIN_ROWS} to {MAX_ROWS}. More rows mean more dice, a bigger piece, and a
                longer build, so the question is the fewest rows at which your photo still reads.
            </p>
            <table>
                <thead>
                    <tr>
                        <th scope="col">Rows (square crop)</th>
                        <th scope="col">Dice</th>
                        <th scope="col">What survives</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{GRID_EXAMPLES[0].rows}</td>
                        <td>{formatCount(GRID_EXAMPLES[0].dice)}</td>
                        <td>The shape of a head, hair against background, dark eye sockets. A face you know is recognisable; a stranger's is not.</td>
                    </tr>
                    <tr>
                        <td>{GRID_EXAMPLES[1].rows}</td>
                        <td>{formatCount(GRID_EXAMPLES[1].dice)}</td>
                        <td>Eyes, nose and mouth as distinct features. Expression. Most single portraits live here.</td>
                    </tr>
                    <tr>
                        <td>{GRID_EXAMPLES[2].rows}</td>
                        <td>{formatCount(GRID_EXAMPLES[2].dice)}</td>
                        <td>Fine hair, teeth, glasses frames, two faces. Reads from close up as well as across the room.</td>
                    </tr>
                </tbody>
            </table>
            <p>
                A trick: look at the preview from the far side of the room, or shrink the browser window until the
                preview is the size of a stamp. If you can tell who it is, the grid is big enough. The{' '}
                <Link href="/gallery">dice art examples</Link> in the gallery list the grid each piece used.
            </p>

            <SectionHeading section={S['colour-mode']} />
            <p>
                The editor offers three colour modes. <strong>Both</strong> uses black and white dice for{' '}
                {THRESHOLDS.both.length} shades. <strong>Black only</strong> and <strong>white only</strong> use one
                colour for {THRESHOLDS.black.length} shades each. Here is one photo, one grid, three modes:
            </p>
            <figure className="my-8">
                <div className="grid grid-cols-3 gap-3">
                    {COLOR_MODE_EXAMPLES.map(({ mode, label, alt }) => (
                        <figure key={mode}>
                            <div className="relative aspect-square rounded-lg overflow-hidden">
                                <Image src={colorModeImage(mode)} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 30vw, 230px" />
                            </div>
                            <figcaption>
                                <strong className="text-[var(--text-primary)]">{label}</strong>
                                <br />
                                {THRESHOLDS[mode].length} shades
                            </figcaption>
                        </figure>
                    ))}
                </div>
                <figcaption>A 50×50 grid (2,500 dice) with the same crop and sliders; only the dice colours change.</figcaption>
            </figure>
            <p>
                Black-only pieces are dark and moody: a black die showing six pips is still mostly black, so the
                lightest tone available is a dark grey. Some people like that look for a dramatic portrait. White-only
                comes out pale for the opposite reason. Both together cover the range, and that is what makes a face
                read. Pick "both" unless you want the effect on purpose.
            </p>

            <SectionHeading section={S['tune']} />
            <p>
                Once the crop is right, the tune step has four sliders and a few toggles. Work in this order:
            </p>
            <ul>
                <li><strong>Rows:</strong> the smallest number at which the face still reads.</li>
                <li><strong>Contrast:</strong> push until the darks are solid black dice and the lights are solid white, then back off a notch before the midtones vanish.</li>
                <li><strong>Brightness:</strong> shifts the whole image lighter or darker. Use it to fix a photo that is all dark dice, or to bring a shadow side back.</li>
                <li><strong>Sharpening:</strong> a little makes edges crisper at low row counts; too much speckles flat areas.</li>
                <li><strong>Rotate 6, 3, 2:</strong> turn those faces 90° to change the texture of flat regions. Taste, not accuracy.</li>
            </ul>
            <p>
                Watch the black and white counts under the preview while you tune; they are what you will buy. Then{' '}
                <EditorLink>start building</EditorLink>, or open the <Link href="/">dice art generator</Link> with a
                new photo and compare.
            </p>
        </GuidePage>
    )
}
