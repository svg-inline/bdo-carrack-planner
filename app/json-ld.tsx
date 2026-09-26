/**
 * Dados estruturados para buscadores, como a documentação do Next recomenda: um `<script>`
 * no layout ou na página, com `<` escapado para o conteúdo não fechar a tag.
 */
export default function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }} />;
}
