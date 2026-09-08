import { Fragment } from 'react';
import { formatLessonContent, type InlineSpan } from '@/lib/lesson-format';

// The reading pane. A server component with no state and no interactivity —
// it exists to keep the page file readable, not to run in the browser.
//
// Typography is the whole feature here. The measure is capped at 68ch,
// leading is 1.75, and paragraph spacing is generous enough that the eye
// finds the next line without effort. Everything else on the page is
// deliberately quieter than the text.

function Spans({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((s, i) => (
        <Fragment key={i}>
          {s.bold ? <strong className="font-semibold text-ink">{s.text}</strong> : s.text}
        </Fragment>
      ))}
    </>
  );
}

export function LessonBody({
  content,
  emptyLabel,
}: {
  content: string | null;
  emptyLabel: string;
}) {
  const nodes = formatLessonContent(content);

  if (nodes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <article className="max-w-[68ch] text-[17px] leading-[1.75] text-body">
      {nodes.map((node, i) => {
        if (node.kind === 'heading') {
          return (
            <h2
              key={i}
              // Tighter leading than the body and the first heading's top
              // margin collapsed away, so the lesson opens flush with the
              // assignment card beside it rather than a step below it.
              className="mt-10 text-base font-bold uppercase leading-snug tracking-wide text-ink first:mt-0"
            >
              <Spans spans={node.spans} />
            </h2>
          );
        }
        if (node.kind === 'list') {
          return (
            <ul key={i} className="my-5 list-disc space-y-2 pl-6 marker:text-indigo-royal-300">
              {node.items.map((item, j) => (
                <li key={j} className="pl-1">
                  <Spans spans={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="mt-5 first:mt-0">
            <Spans spans={node.spans} />
          </p>
        );
      })}
    </article>
  );
}
