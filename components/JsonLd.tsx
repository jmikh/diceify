// Structured data as a plain <script> in the static HTML. next/script would only put it in the RSC payload and
// inject it client-side, which crawlers that don't run JS (Bing, AI crawlers) never see.
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // `<` escaped so a string value can never close the script tag
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
