import Image from "next/image";
import type { GuideArticleContent, GuideCallout, GuideLocale, GuideSection, GuideScreenshot } from "@/content/blog/guide-types";
import type { GuideUi } from "@/content/blog/guide-ui";
import { guideArticleHref, guideSeriesHref, Link } from "@/i18n/navigation";
import styles from "./GuideSeries.module.css";

const CALLOUT_ICONS: Record<GuideCallout["variant"], string> = {
  note: "i",
  warning: "!",
  tip: "✓",
  review: "?",
};

function Screenshot({ image }: { image: GuideScreenshot }) {
  return (
    <figure className={styles.figure}>
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes="(max-width: 900px) 100vw, 720px"
      />
      {image.caption && <figcaption>{image.caption}</figcaption>}
    </figure>
  );
}

function Callout({ callout, ui }: { callout: GuideCallout; ui: GuideUi }) {
  return (
    <aside
      className={`${styles.callout} ${styles[`callout_${callout.variant}`]}`}
      role="note"
      aria-label={ui.calloutLabels[callout.variant]}
    >
      <span className={styles.calloutIcon} aria-hidden="true">{CALLOUT_ICONS[callout.variant]}</span>
      <div className={styles.calloutBody}>
        <strong>{callout.title ?? ui.calloutLabels[callout.variant]}</strong>
        {callout.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </aside>
  );
}

function Section({ section, ui, num }: { section: GuideSection; ui: GuideUi; num: (value: number) => string }) {
  return (
    <section className={styles.section} aria-labelledby={section.id}>
      <h2 id={section.id}>{section.heading}</h2>
      {section.lead && <p className={styles.lead}>{section.lead}</p>}
      {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

      {section.definitions && (
        <dl className={styles.definitions}>
          {section.definitions.map((item) => (
            <div key={item.term}>
              <dt>{item.term}</dt>
              <dd>{item.text}</dd>
            </div>
          ))}
        </dl>
      )}

      {section.bullets && (
        <ul className={styles.bullets}>
          {section.bullets.map((item) => (
            <li key={item.text}>
              {item.label && <strong>{item.label}: </strong>}
              {item.text}
            </li>
          ))}
        </ul>
      )}

      {section.steps && (
        <ol className={styles.steps}>
          {section.steps.map((step, index) => (
            <li className={styles.step} key={step.title}>
              <div className={styles.stepHead}>
                <span className={styles.stepNum} aria-hidden="true">{num(index + 1)}</span>
                <h3>{step.title}</h3>
              </div>
              {step.body && <p>{step.body}</p>}
              {step.points && (
                <ul className={styles.bullets}>
                  {step.points.map((item) => (
                    <li key={item.text}>
                      {item.label && <strong>{item.label}: </strong>}
                      {item.text}
                    </li>
                  ))}
                </ul>
              )}
              {step.image && <Screenshot image={step.image} />}
            </li>
          ))}
        </ol>
      )}

      {section.image && <Screenshot image={section.image} />}

      {section.table && (
        <div className={styles.tableWrap} role="region" aria-label={section.table.caption ?? section.heading} tabIndex={0}>
          <table>
            {section.table.caption && <caption>{section.table.caption}</caption>}
            <thead>
              <tr>{section.table.headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, rowIndex) => (
                <tr key={row.join("|")}>
                  {row.map((cell, cellIndex) => (
                    cellIndex === 0
                      ? <th key={`${rowIndex}-${cellIndex}`} scope="row">{cell}</th>
                      : <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section.callouts?.map((callout) => <Callout key={`${callout.variant}-${callout.body[0]}`} callout={callout} ui={ui} />)}
    </section>
  );
}

export type GuideArticleViewProps = {
  article: GuideArticleContent;
  /** Ordered series articles (slug/title/description only). */
  series: { slug: string; title: string; description: string }[];
  seriesSlug: string;
  seriesTitle: string;
  seriesEyebrow: string;
  index: number;
  locale: GuideLocale;
  ui: GuideUi;
};

/**
 * Native guide article renderer. Server component: the guide content is static
 * data, so no client JS is shipped for reading the article.
 */
export function GuideArticleView({
  article,
  series,
  seriesSlug,
  seriesTitle,
  seriesEyebrow,
  index,
  locale,
  ui,
}: GuideArticleViewProps) {
  const total = series.length;
  const previous = series[index - 1];
  const next = series[index + 1];
  const progress = ((index + 1) / total) * 100;
  const num = (value: number) => value.toLocaleString(locale === "fa" ? "fa-IR" : "en");

  return (
    <div className={styles.shell}>
      <article className={styles.article}>
        <div className={styles.intro}>
          {article.intro?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>

        {article.sections.map((section) => <Section key={section.id} section={section} ui={ui} num={num} />)}

        {!!article.reviewNotes?.length && (
          <Callout callout={{ variant: "review", title: ui.reviewTitle, body: article.reviewNotes }} ui={ui} />
        )}

        {!!article.references?.length && (
          <section className={styles.section} aria-labelledby="guide-references">
            <h2 id="guide-references">{ui.referencesHeading}</h2>
            <ul className={styles.bullets}>
              {article.references.map((reference) => (
                <li key={reference.href}>
                  <a href={reference.href} target="_blank" rel="noreferrer">{reference.label}</a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav className={styles.sequence} aria-label={ui.sequenceAria}>
          {previous ? (
            <Link href={guideArticleHref(seriesSlug, previous.slug)} className={`${styles.sequenceLink} ${styles.sequencePrevious}`}>
              <span>{ui.previous}</span>
              <strong>{previous.title}</strong>
            </Link>
          ) : (
            <Link href={guideSeriesHref(seriesSlug)} className={`${styles.sequenceLink} ${styles.sequencePrevious}`}>
              <span>{ui.backToIndex}</span>
              <strong>{ui.backToIndexTitle}</strong>
            </Link>
          )}
          {next && (
            <Link href={guideArticleHref(seriesSlug, next.slug)} className={`${styles.sequenceLink} ${styles.sequenceNext}`}>
              <span>{ui.next}</span>
              <strong>{next.title}</strong>
            </Link>
          )}
        </nav>
      </article>

      <aside className={styles.sidebar}>
        <nav className={styles.seriesIndex} aria-label={ui.seriesIndexAria(seriesTitle)}>
          <span className={styles.sidebarLabel}>{seriesEyebrow}</span>
          <strong className={styles.sidebarTitle}>{seriesTitle}</strong>
          <div
            className={styles.progress}
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={index + 1}
            aria-label={ui.progressAria(num(index + 1), num(total))}
          >
            <span className={styles.progressBar} style={{ width: `${progress}%` }} />
          </div>
          <p className={styles.progressText}>{ui.guideCounter(num(index + 1), num(total))}</p>
          <ol className={styles.indexList}>
            {series.map((item, itemIndex) => (
              <li key={item.slug} className={itemIndex === index ? styles.indexCurrent : undefined}>
                <Link
                  href={guideArticleHref(seriesSlug, item.slug)}
                  aria-current={itemIndex === index ? "page" : undefined}
                >
                  <span aria-hidden="true">{num(itemIndex + 1)}</span>
                  <strong>{item.title}</strong>
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        {!!article.sections.length && (
          <nav className={styles.toc} aria-label={ui.tocAria}>
            <span className={styles.sidebarLabel}>{ui.inThisGuide}</span>
            <ol>
              {article.sections.map((section) => (
                <li key={section.id}><a href={`#${section.id}`}>{section.heading}</a></li>
              ))}
            </ol>
          </nav>
        )}
      </aside>
    </div>
  );
}
