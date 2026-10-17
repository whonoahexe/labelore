// A PROJECT.md lead's inline markdown, as React text nodes: code spans stay code, emphasis is
// flattened into the sentence. Shared by the dashboard head and the Traceability lede.
import { tokenizeInline, type InlineToken } from '../views/inline-markdown.ts';

function Tokens({ tokens }: { tokens: InlineToken[] }): React.JSX.Element {
  return (
    <>
      {tokens.map((token, index) => {
        const key = `${token.type}-${index}`;
        if (token.type === 'strong' || token.type === 'em') return <Tokens key={key} tokens={token.value} />;
        if (token.type === 'code') return <code key={key}>{token.value}</code>;
        return <span key={key}>{token.value}</span>;
      })}
    </>
  );
}

export function LeadText({ text }: { text: string }): React.JSX.Element {
  return <Tokens tokens={tokenizeInline(text)} />;
}
