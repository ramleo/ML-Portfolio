import { NextRequest, NextResponse } from 'next/server';

const ARXIV_URL =
  'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CV+OR+cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=9';

function parseArxiv(xml: string) {
  const entries = xml.split('<entry>').slice(1);
  return entries
    .map((e) => {
      const title = e.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, ' ').trim() ?? '';
      const summary = (e.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim() ?? '').slice(0, 240);
      const url = e.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() ?? '';
      const published = e.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.slice(0, 10) ?? '';
      const authors = [...e.matchAll(/<name>([\s\S]*?)<\/name>/g)]
        .slice(0, 3)
        .map((m) => m[1])
        .join(', ');
      return { title, summary, url, published, authors, source: 'arXiv' };
    })
    .filter((e) => e.title);
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') ?? 'papers';

  try {
    if (type === 'papers') {
      const res = await fetch(ARXIV_URL, { next: { revalidate: 3600 } });
      const xml = await res.text();
      return NextResponse.json({ items: parseArxiv(xml) });
    }

    const key = process.env.NEWSAPI_KEY;
    if (!key) {
      return NextResponse.json({ items: [], noKey: true });
    }

    const newsUrl = `https://newsapi.org/v2/everything?q=%22artificial+intelligence%22+OR+%22machine+learning%22+OR+%22LLM%22&language=en&sortBy=publishedAt&pageSize=9&apiKey=${key}`;
    const res = await fetch(newsUrl, { next: { revalidate: 3600 } });
    const data = await res.json();

    const items = (data.articles ?? [])
      .filter((a: Record<string, unknown>) => a.title && a.title !== '[Removed]')
      .map((a: Record<string, string & { name: string }>) => ({
        title: a.title,
        summary: a.description ?? '',
        url: a.url,
        published: (a.publishedAt as string)?.slice(0, 10) ?? '',
        authors: a.author ?? (a.source as unknown as { name: string })?.name ?? '',
        source: (a.source as unknown as { name: string })?.name ?? 'News',
        image: a.urlToImage,
      }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [], error: true });
  }
}
