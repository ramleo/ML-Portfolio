/**
 * pagedjs ships no types, and the handbook loads its prebuilt bundle as a
 * script rather than importing it — see HandbookActions for why. Only the one
 * class actually called is declared; a blanket `any` would hide a real mistake
 * in the call.
 */
interface PagedPreviewer {
  /** A stylesheet is a URL to fetch, or a { name: cssText } object when the
    CSS is generated in the page — the EDA report's is, because the CSP
    blocks the blob: URL that would otherwise carry it. */
  preview(content: string | Element, stylesheets: (string | Record<string, string>)[], renderTo: Element): Promise<{ total: number }>;
}

interface Window {
  PagedModule?: { Previewer: new () => PagedPreviewer };
}
