/** Content-free identity for ANY interactive click (Plan #2, "any click" mode).
 *
 * The audit captures every click on an interactive element — tagged or not — so a
 * dispute about any button/link can be answered later, not just pre-tagged ones.
 * To do that without a `data-audit` id, it derives a STABLE, CONTENT-FREE
 * descriptor from the element's structure:
 *   - a preferred key: data-audit > data-testid > #id > tag[+type][+role]@css-path
 *   - plus structural fields for display (tag, role, type, aria-label, id, testid,
 *     name, path).
 *
 * It deliberately never reads the element's VISIBLE TEXT, which can contain user
 * content (a row labelled with a person's name). `aria-label` is an author-set
 * attribute, kept for readability; everything else is tag/role/attribute/position.
 */

// What counts as an interactive target. A click is attributed to the nearest such
// ancestor, so clicking an icon inside a button is credited to the button.
const INTERACTIVE =
  'a,button,input,select,textarea,label,summary,' +
  '[role="button"],[role="link"],[role="tab"],[role="menuitem"],[role="menuitemcheckbox"],' +
  '[role="menuitemradio"],[role="checkbox"],[role="radio"],[role="switch"],[role="option"],' +
  '[onclick],[tabindex]';

export interface ClickDescriptor {
  control: string; // the stable preferred key, <=120 chars
  meta: {
    tag: string;
    role?: string;
    type?: string;
    label?: string; // aria-label (author-set), never visible text
    id?: string;
    testid?: string;
    name?: string;
    path: string; // short structural css path
  };
}

/** A short, stable CSS-ish path: up to 5 ancestors by tag + nth-of-type, stopping
 * at the first element with an id. Structural only — no text, no classes. */
function cssPath(start: Element): string {
  const parts: string[] = [];
  let node: Element | null = start;
  let depth = 0;
  while (node && node.nodeType === 1 && depth < 5) {
    let seg = node.tagName.toLowerCase();
    if (node.id) {
      seg += `#${node.id}`;
      parts.unshift(seg);
      return parts.join(">");
    }
    const parent: Element | null = node.parentElement;
    if (parent) {
      const sameTag = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
      if (sameTag.length > 1) seg += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
    }
    parts.unshift(seg);
    node = node.parentElement;
    depth++;
  }
  return parts.join(">");
}

/** Describe the interactive element a click landed on, or null if the click was
 * on something non-interactive (plain text, background) — those are not recorded. */
export function describeClick(target: Element | null): ClickDescriptor | null {
  const el = target?.closest<HTMLElement>(INTERACTIVE);
  if (!el) return null;

  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role") || undefined;
  const type = el.getAttribute("type") || undefined;
  const label = el.getAttribute("aria-label") || undefined;
  const id = el.id || undefined;
  const testid = el.dataset?.testid || undefined;
  const name = el.getAttribute("name") || undefined;
  const audit = el.dataset?.audit || undefined;
  const path = cssPath(el);

  // Preferred stable key, most explicit first.
  let control: string;
  if (audit) control = `audit:${audit}`;
  else if (testid) control = `testid:${testid}`;
  else if (id) control = `#${id}`;
  else control = `${tag}${type ? `[type=${type}]` : ""}${role ? `[role=${role}]` : ""}@${path}`;

  return {
    control: control.slice(0, 120),
    meta: { tag, role, type, label, id, testid, name, path },
  };
}
