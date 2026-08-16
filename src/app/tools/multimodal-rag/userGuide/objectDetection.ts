export const MM_RAG_OBJECT_DETECTION = `
## Locating objects in an image or video frame
Every standalone image and every sampled video frame is also run through a
closed-vocabulary object detector (601 possible object types — everyday
things like Bicycle, Car, Bus, Backpack, Traffic light, Person, and many
more) once, at upload time — not a fresh AI call every time you ask. So a
question like "where is the bicycle?" or "locate the bus" is answered from
that precomputed list, and the answer describes a coarse position: "spans
most of the frame" for something large/close, or a rough zone like
"top-left," "center," or "bottom-right" for something smaller. This is
intentionally coarse — a phrase, not pixel coordinates — since the model is
meant to place things in general terms, not measure them precisely.

- **The detected object list is baked into the same text the AI reads and
  the same text used to grade the answer.** Earlier versions of this
  feature fed detected objects to the AI separately from what backed the
  "Groundedness" score above, which could make a correct, precise answer
  ("the car spans most of the frame") show up as Low groundedness even
  though it was right — the score just couldn't see where that fact came
  from. That's fixed: the object list is now part of the citation's stored
  text itself, so the answer and its groundedness score are always looking
  at the same thing. Images/videos uploaded before this fix need to be
  re-uploaded to pick it up.
- **A visible bounding box only appears on a clicked citation, and only if
  its labels match your last question.** Click a citation card open (not
  the document "▸ summary" pill — that just opens a plain page preview) and
  the panel on the right can draw a colored box directly on the image. But
  it only draws when the wording of the question you most recently asked
  matches one of THAT SPECIFIC citation's own detected labels. Example: if
  you ask "locate the bicycle" and then click a car photo's citation, no
  box appears — "bicycle" doesn't match anything the detector found in that
  car photo. Click the bicycle photo's own citation instead, or re-ask a
  question that names something actually detected in the image you're
  looking at.
  Two easy ways to end up with no box even when you're looking at the
  "right" image: (1) opening the image via the document's "▸ summary" pill
  instead of clicking an actual citation row — the summary view is a plain
  page preview and never triggers box-matching at all, regardless of what
  you last asked; (2) clicking a citation whose OWN labels don't match your
  last question, even if a different citation earlier in the chat would
  have matched. Concrete example: you ask "locate car" (matched fine
  against a car citation), then click a DIFFERENT citation — the bicycle
  photo's card. No box appears, because the matching always re-checks
  against the citation you just clicked, and "car" isn't one of the
  bicycle photo's detected labels ("Bicycle," "Wheel," "Tire," etc). To see
  a box on the bicycle photo, ask something that names one of ITS labels —
  "where is the bicycle" or "locate wheel" — right before or after clicking
  its citation.
- **A "spans most of the frame" box looks like a thin border, not a tight
  box.** When an object fills most of the photo (common for a single
  product shot or a close-up), the drawn box runs almost all the way around
  the image's edges rather than tightly hugging just the object — easy to
  miss at a glance since it looks similar to the image's own border.
- **A few generic terms are matched to their specific detected subclass.**
  The 601-type vocabulary is hierarchical — a photo's person is detected as
  the more specific "Man," "Woman," "Boy," or "Girl," never the generic
  "Person," and similarly a vehicle is detected as "Car," "Truck," "Bus,"
  etc, never generic "Vehicle." Asking "locate the person" or "where's the
  vehicle" still works — those two generic terms are mapped to whichever
  specific subclass was actually detected. This mapping only covers
  person/people and vehicle right now; other generic-vs-specific mismatches
  in the 601 types aren't covered, so if a box doesn't appear, try naming
  the more specific type instead (e.g. "dog" instead of "animal").
- **A "Detect faces" button highlights every face at once, independent of
  any question.** When a citation's image/frame has at least one confidently
  detected "Human face," a "Detect faces" button appears above it — click it
  to box EVERY detected face at once, regardless of what you asked (or
  whether you asked anything). This is separate from the question-matching
  behavior above: that draws one box for whatever the question named; this
  draws all faces, on demand, with no question needed. It appears on the
  page-1 preview immediately after uploading, without needing to click a
  citation first. The button doesn't appear at all when no face was
  confidently detected in that specific image/frame — not every photo with
  a person in it will show one, since detecting a whole person
  ("Man"/"Woman") and confidently isolating just their face are different,
  independent detections.
- **The confidence label always stays fully inside the image.** The small
  colored tag showing the label and confidence percentage sits inside the
  box's top-left corner rather than floating above it — so it's never cut
  off, even when the detected object is right at the top edge of the frame
  (common for a person/subject filling most of a close-up shot).
- **The detected list can look repetitive or overlapping.** Because the
  601-type vocabulary includes both general and specific categories (e.g.
  "Wheel," "Bicycle wheel," and "Tire" are all separate types), a single
  wheel in a photo can genuinely trigger more than one of these labels at
  once — that's the detector correctly recognizing the same object under
  several valid category names, not a bug repeating itself. Ask "locate
  object" (no specific name) to see the full raw list it found, deduplicated
  labels and all.
- **It only recognizes what's in its 601-type vocabulary.** Something
  outside that list (a specific brand of an item, an unusual object) won't
  be found or positioned, even if the AI's plain-text caption still
  describes it in words. If a "where is X" question gets a generic
  caption-only answer with no position, X likely wasn't one of the 601
  recognized types.
- **"Detect signatures" flags handwritten signatures.** When a citation's
  image/frame has at least one confidently detected signature, "Detect
  signatures (N)" appears in the "Choose an action…" dropdown — pick it to
  draw a pink box (with confidence %) around each one. Useful for scanning a
  contract or form photo for where it was actually signed.
- **"Detect plates" finds vehicle license/registration plates, with a
  one-click reader.** When a citation's image/frame has at least one
  confidently detected plate, "Detect plates (N)" appears in the dropdown —
  pick it to draw a blue box around each one. Each box has its own "Read
  plate" button: click it and the SAME corroborated sharpen+OCR flow behind
  "Sharpen region…" (see the citations section below) runs automatically,
  scoped to exactly that box, no manual dragging needed. That corroboration
  matters here specifically — a real incident on a blurred plate photo saw
  the AI invent a different, entirely fake reading on two separate attempts,
  which is exactly the failure mode "Sharpen region…"'s double-read
  agreement check exists to catch rather than silently trust.
- **"Detect weapons" flags knives, guns, and other weapon classes.** When a
  citation's image/frame has at least one confidently detected weapon
  (Weapon, Knife, Handgun, Rifle, or Sword — ordinary kitchen knives are
  deliberately excluded so photos of a kitchen counter don't false-alarm),
  "Detect weapons (N)" appears in the dropdown — pick it to draw a red box
  around each one. This reuses the same 601-class object detector "Detect
  objects" already runs; no separate model or backend endpoint was needed.
- **"Check for tampering" flags possible photo editing.** Where available,
  "Check for tampering (N)" runs three independent statistical checks —
  compression-error analysis (ELA), sensor-noise-texture analysis, and
  (JPEG uploads only) a compression-history check that looks for a region
  whose JPEG quality doesn't match the rest of the photo — and merges them
  into one set of boxes, labeled High/Medium/Low confidence. None of these
  are a trained classifier and none are a certainty — a real edit can still
  be missed, and reflective/metallic surfaces, fine detail like spokes, or
  a glossy sticker can still trip the compression/noise checks. Combining
  three differently-flawed signals catches more real edits (especially on
  a photo that's already been re-saved/re-shared once) without simply
  flagging everything busy as suspicious. Even "High" here means "an
  unusual statistical pattern," not "confirmed edited" — always verify
  visually before trusting a flag. Tampering boxes are click-to-inspect
  only — there's no ✕ shortcut on them the way there is for objects/faces/
  signatures, since checking for tampering is a verification step, not an
  edit workflow.
- **"Possible duplicate" flags a repeat of something already uploaded.**
  If an uploaded image or page closely matches another page already
  uploaded earlier in the same session (a perceptual-hash comparison, not
  just a filename match), "Possible duplicate (N)" appears in the dropdown
  — pick it to see which other source/page it matches and how similar (a
  percentage). Useful for catching an accidental re-upload of the same
  photo, or two documents that share the same embedded image.
- **Detected objects and caption details aren't linked to each other.**
  The detector and the AI caption are two separate passes over the same
  image with no shared memory — so a question like "which side is the
  person in the blue jacket on" won't reliably work even if a "Person" was
  detected and the caption mentions a blue jacket, since nothing connects
  that specific detected box to that specific caption detail. The tool will
  say the information isn't available rather than guess.
`.trim();