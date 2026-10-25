// Words carrying Arabic diacritics (harakat) are Arabic, not Urdu.
const VOWELLED_WORD = /([؀-ۿ]*[ً-ْ][؀-ۿ]*)/;

/**
 * Renders Urdu or English text that quotes Arabic words, giving each
 * vowelled Arabic word the Arabic font instead of Nastaliq or Latin.
 */
export default function Mixed({ text }: { text: string }) {
  return text.split(VOWELLED_WORD).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} lang="ar" className="arabic text-[1.15em]">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
