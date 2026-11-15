/**
 * Renders a JSON-LD script. Safe use of dangerouslySetInnerHTML: the data is built on the server
 * from our own content files, and "<" is escaped so it can never close the script tag.
 */
export default function JsonLd({ data }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
