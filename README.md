# Ragnarök Atlas · LATAM

Biblioteca comunitária em português para consultar informações de Ragnarök Online LATAM: equipamentos de episódio, encantamentos, custos, fontes de obtenção, reformas e receitas. As calculadoras são executadas no navegador; os valores digitados não são enviados nem salvos.

O projeto é independente e não é afiliado, aprovado ou mantido pela Gravity, pela bROWiki ou pelo Divine Pride.

## Conteúdo

- Tabelas pesquisáveis de equipamentos, encantamentos, custos, fontes de obtenção e reformas.
- Calculadoras para fabricação de flechas, criação de toxinas e venenos, runas, poções, farmacologia e culinária.
- Links para as páginas de referência fornecidas para o projeto.
- Dados organizados em TSVs, separados da interface para facilitar atualizações.

Resultados que dependem de aleatoriedade ou de parâmetros incompletos são estimativas. Consulte as observações dos TSVs e as fontes relacionadas antes de usar os resultados como valores definitivos.

## Estrutura

```text
index.html
app.js
styles.css
data/
  facilidades/    # TSVs de receitas e habilidades
  referencia/     # TSVs de equipamentos, encantamentos, fontes e reformas
```

## Abrir localmente

O site carrega os TSVs com `fetch`, então precisa ser aberto por um servidor web local; abrir o `index.html` diretamente como arquivo pode ser bloqueado pelo navegador. Use uma extensão de servidor estático no editor ou qualquer servidor local simples.

## Publicar no GitHub Pages

1. Antes de publicar, confira a seção **Licença e direitos autorais** abaixo e confirme que cada arquivo que será enviado pode ser redistribuído publicamente.
2. Envie os arquivos autorizados à raiz do repositório.
3. Em **Settings → Pages**, selecione **Deploy from a branch**, a branch principal e a pasta **/(root)**.
4. Salve. O site e todos os dados publicados nele ficarão acessíveis pela internet.

GitHub Pages hospeda arquivos estáticos. Não coloque credenciais, dados privados ou conteúdo que não possa ser público no repositório/site.

## Atualizar os dados

Os TSVs podem ser editados ou substituídos em `data/`. Preserve a ordem das colunas esperada pelo site e mantenha, junto de cada arquivo, a fonte, autoria e licença aplicável. Se o formato mudar, atualize também `app.js`.

## Fontes

Conforme informado pelo mantenedor do projeto, os TSVs foram compilados a partir da bROWiki e da API do Divine Pride. As páginas do bROWiki usadas como referência estão listadas na seção **Fontes & referências** do site. A planilha de fontes complementares também contém observações sobre itens que não constam na bROWiki ou cuja tradução ainda não foi confirmada. Ainda não há uma correspondência registrada entre cada linha/coluna e sua fonte específica; mantenha essa limitação visível até completar a rastreabilidade.

Ao reutilizar conteúdo de uma página, dê crédito aos autores/contribuidores indicados, ao título e à URL da página; inclua a licença aplicável e indique alterações, sem sugerir endosso ao projeto.

## Licença e direitos autorais

**Este repositório não concede uma licença única para todo o conteúdo.** Parte dos TSVs, do script de planilha e das informações usadas como referência foi criada por terceiros ou tem origem/licença ainda não confirmada. A presença de um arquivo neste projeto não transfere seus direitos nem significa que ele esteja licenciado para redistribuição.

### bROWiki

A página “bROWiki” disponível no arquivo da própria wiki informa que as contribuições do site são lançadas sob **Creative Commons Attribution 3.0 Unported (CC BY 3.0)**. Essa licença permite compartilhamento e adaptação com atribuição. Ao redistribuir conteúdo coberto por ela, mantenha os créditos e avisos aplicáveis, indique a página de origem e as alterações, e não sugira que os autores ou a bROWiki endossam este projeto. Verifique a licença da página específica antes de incluir trechos, imagens ou outros materiais.

- [Página “bROWiki” no arquivo](https://arquivo.browiki.org/wiki/BROWiki)
- [Texto da licença CC BY 3.0 Unported](https://creativecommons.org/licenses/by/3.0/)

### TSVs e script fornecidos

Os TSVs têm como fontes declaradas a bROWiki e a API do Divine Pride; os direitos de republicação de cada dado ou seleção compilada não foram confirmados. O script `formata_aba_cria_calculadora.gs` também foi fornecido para orientar o desenvolvimento, mas sua autoria e licença não foram confirmadas. **Atribuir a fonte não equivale a obter permissão para redistribuir.** Não aplique MIT, CC BY ou outra licença a esses arquivos sem autorização dos respectivos titulares. Antes de publicá-los, registre a origem, o autor/titular e a licença ou permissão aplicável. Se não for possível confirmar esses direitos, remova os dados correspondentes do repositório e do site publicado.

### Divine Pride e conteúdo do jogo

Os TSVs incluem informações obtidas por meio da API do Divine Pride, conforme informado pelo mantenedor. A documentação descreve a API como destinada a consultas ocasionais para ferramentas e integrações e diz que ela não se destina a criar uma cópia concorrente do banco. Os termos do serviço também restringem copiar e redistribuir conteúdo do serviço. A documentação consultada não estabelece claramente uma licença geral para republicar os campos usados nestes TSVs; confirme a autorização para este uso antes de publicar os dados. Este projeto não inclui imagens baixadas nem uma cópia integral da base do Divine Pride. Nomes, marcas, imagens e demais materiais de Ragnarök Online pertencem aos respectivos titulares.

- [Documentação da API do Divine Pride](https://www.divine-pride.net/tools/api-doc)
- [Termos de uso do Divine](https://divine.inc/terms)

### Licença recomendada para o código original

Depois de confirmar que o código do site está livre de trechos de terceiros, uma opção simples é publicar **somente o código original da interface** (`index.html`, `app.js` e `styles.css`) sob a licença MIT. Deixe explícito no aviso de licença que ela não cobre `data/`, imagens, marcas, conteúdos da bROWiki ou materiais de outros serviços. Até fazer essa separação e confirmar a proveniência dos TSVs, a opção mais segura é **não adicionar uma licença geral ao repositório**.

Considere esta seção uma orientação de organização e atribuição, não um parecer jurídico.
