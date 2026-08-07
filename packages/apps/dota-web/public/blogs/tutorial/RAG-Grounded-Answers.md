# RAG: Grounding AI Answers In Your Data

An LLM can write a plausible answer even when it does not have the fact required to answer correctly. Retrieval-Augmented Generation (RAG) addresses that limitation by finding relevant information at request time and giving it to the model as context. The model still generates the wording, but the application gives it evidence from documents, databases, or other approved knowledge sources.

This is the second article in the series. [LangChain Foundations](/blogs/content/Tutorial/LangChain-Foundations.md) introduced prompts, tools, and agents. This article builds the predictable retrieval layer that can feed those components. [LangGraph: Reliable Stateful AI Workflows](/blogs/content/Tutorial/LangGraph-Stateful-Workflows.md) then shows how to add explicit decisions, retries, and review around a more advanced RAG system.

> **Note:** RAG reduces unsupported answers; it does not guarantee truth. Retrieval can return the wrong passage, documents can be stale, and a model can still misread or overstate the supplied context. Quality comes from retrieval, prompt design, evaluation, and safeguards working together.

---

## What RAG Changes

Model training knowledge is static and its context window is finite. An internal handbook, a current product catalogue, or a customer’s account history may be too large, too private, or too recent to have been part of training. RAG retrieves a small, relevant slice at the time of a question instead of trying to place an entire corpus in every prompt.

The name describes the sequence: retrieve evidence, augment the request with that evidence, and generate an answer. The [LangChain retrieval guide](https://docs.langchain.com/oss/python/langchain/retrieval) calls out these same two constraints—finite context and static knowledge—and explains both two-step and agentic retrieval architectures.

```text
                         indexing, done ahead of time
Documents -> clean -> split into chunks -> embed -> vector store

                         answering, done for each question
Question -> retrieve relevant chunks -> prompt with evidence -> model -> answer + citations
```

The two lanes matter. Indexing turns source material into a searchable knowledge base. Answering searches that index and gives the selected material to a model. Updating a policy generally means re-indexing its changed content; it does not require retraining the model.

## The Indexing Pipeline

Retrieval quality begins before a user asks anything. Documents have to be collected from trusted sources, converted into usable text, split in a way that preserves meaning, and tagged with metadata that helps later filtering and citations.

### Clean And Preserve Source Meaning

Extracting text from a PDF, web page, wiki, or database record often produces navigation clutter, headers, duplicate text, or broken tables. Remove irrelevant boilerplate, retain meaningful headings, and preserve a stable source identifier such as a document URL, version, section, and access scope. That metadata is needed later to enforce permissions and show a reader where an answer came from.

### Chunk At Meaningful Boundaries

Embeddings represent chunks, not an entire 200-page handbook. A chunk that is too large can contain several unrelated topics and become a weak search match; a chunk that is too small can omit the condition that changes the meaning. A useful first strategy is to split at headings and paragraphs, then use a modest overlap so a sentence at a boundary does not lose its context.

```text
Bad chunk boundary:
"Refunds are allowed within 30 days. Exceptions apply to"
"final-sale items and digital downloads."

Better chunk:
"Refunds are allowed within 30 days. Exceptions apply to final-sale
items and digital downloads."
```

Measure chunking against real questions instead of assuming a universal token count. A troubleshooting guide may need procedure-sized chunks, while a policy document often benefits from one section plus its heading. Keep the original text alongside the embedding so the prompt receives human-readable evidence, not a vector.

### Embed And Store

An embedding model maps text into a vector: a list of numbers that places semantically related text near each other. The same embedding model encodes document chunks and later encodes a query. A vector store finds nearby chunk vectors using a similarity measure, often with an approximate nearest-neighbor index for speed at scale.

Semantic search is useful because it can match intent rather than only exact words. A query about “changing where my package goes” may retrieve a section titled “Delivery address changes.” It is not magical understanding, though: ambiguous terms, domain-specific vocabulary, and identifiers may need metadata filters or keyword search too.

| Component | Responsibility | Practical concern |
| --- | --- | --- |
| Loader | Reads a source into documents. | Track source version and permissions. |
| Splitter | Creates searchable chunks. | Avoid separating a rule from its exception. |
| Embedding model | Maps text and queries to vectors. | Use a compatible model for both sides. |
| Vector store | Stores vectors and performs similarity search. | Filter before retrieval for access control. |
| Retriever | Selects and returns relevant documents. | Tune `k`, thresholds, and ranking. |

> **Note:** Never rely on post-filtering alone to protect tenant or user data. Apply authorization and tenant metadata as part of retrieval so a document a user cannot read is never placed in the model context.

## Retrieval, Augmentation, And Generation

At answer time, the application first turns the question into an embedding and searches for the best candidate chunks. It can filter candidates by tenant, language, document status, or product version. It may then rerank the candidates with a more precise but slower model before sending the strongest evidence to the LLM.

The augmentation step formats this evidence into a clear prompt. It tells the model what it may use, asks it to cite source identifiers, and defines what to do when the evidence is insufficient. A strict instruction is valuable, but it cannot repair irrelevant retrieval—evaluate the retrieved passages separately from the final answer.

```text
System: Answer only from the supplied sources. If they do not answer the
question, say that the answer is not available in the knowledge base.

Sources:
[policy-42, Delivery changes]
Addresses can be changed before an order is packed.

Question: Can I change the delivery address after dispatch?

Answer: Include a source identifier for every factual claim.
```

The desired response here is not a confident policy invented from general knowledge. It should explain that the supplied source covers changes before packing and does not establish what happens after dispatch. That abstention is a product feature.

## A Minimal Two-Step RAG Flow

Two-step RAG always retrieves before generating. It has a predictable cost and latency profile—one retrieval operation and normally one model call—and is often the right first choice for Q&A over a known corpus. The code below uses current LangChain packages and keeps retrieval as an explicit application step.

```python
# pip install -U langchain langchain-openai langchain-chroma langchain-text-splitters

from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_chroma import Chroma

documents = [
    Document(
        page_content=(
            "A delivery address can be changed before the order is packed. "
            "Final-sale items cannot be refunded."
        ),
        metadata={"source": "delivery-policy", "section": "Changes"},
    )
]

vector_store = Chroma.from_documents(
    documents=documents,
    embedding=OpenAIEmbeddings(model="text-embedding-3-small"),
)
retriever = vector_store.as_retriever(search_kwargs={"k": 3})

prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer only from the supplied context. Cite source IDs."),
    ("user", "Context:\n{context}\n\nQuestion: {question}"),
])

question = "When can I change my delivery address?"
matches = retriever.invoke(question)
context = "\n\n".join(
    f"[{doc.metadata['source']}] {doc.page_content}" for doc in matches
)

model = ChatOpenAI(model="gpt-5.4", temperature=0)
answer = model.invoke(prompt.invoke({"context": context, "question": question}))
print(answer.content)
```

The example builds an index in memory for clarity. A real service normally creates and updates the index in a separate ingestion job, stores it durably, and retrieves only the documents permitted for the current request. The [LangChain RAG documentation](https://docs.langchain.com/oss/python/langchain/retrieval) covers the same two-step pattern and links to a fuller tutorial.

## Beyond Basic Similarity Search

When basic RAG misses useful passages, improve the evidence pipeline before adding agent autonomy. Hybrid retrieval combines vector similarity with keyword search, which is particularly helpful for invoice numbers, product names, and exact error codes. Metadata filters eliminate irrelevant versions or tenants. Reranking scores a small candidate set more carefully. Query rewriting can convert a vague question into a better search query, but must be logged and evaluated because it can change the user’s intent.

It also helps to distinguish a retrieval miss from a generation miss. If the right passage never appears in the retrieved candidates, adjust source quality, chunking, filters, queries, and ranking. If the right passage appears but the answer ignores it, improve the prompt, context formatting, model, or answer validation. These are different defects and require different fixes.

| Pattern | Flow | Best fit |
| --- | --- | --- |
| Two-step RAG | Retrieve, then generate every time. | Stable Q&A with predictable latency. |
| Agentic RAG | An agent decides whether and when to retrieve. | Mixed tasks where retrieval is optional. |
| Hybrid RAG | Combine semantic and lexical retrieval. | Corpora with names, codes, and natural language. |
| Graph-based RAG workflow | Route, retrieve, grade, retry, and review explicitly. | High-stakes or multi-stage workflows. |

Agentic RAG is not inherently more accurate. It gives the model discretion about retrieval, which can be valuable for flexible tasks but adds another decision to test. Start with two-step RAG when retrieval is always required; choose a graph when you need visible rules around those decisions.

## Evaluate The Whole System

Do not evaluate a RAG assistant with only a few impressive demos. Create a test set of representative questions, expected source passages, unanswerable questions, adversarial instructions inside documents, and permission-boundary cases. Review at least three layers: retrieval relevance, groundedness of the answer, and task usefulness for the reader.

Useful operational signals include retrieval hit rate, source freshness, no-answer rate, citation coverage, latency, cost, and feedback tied back to the exact retrieved chunks. A rising no-answer rate may mean the corpus is incomplete; a falling one is not automatically good if the system is instead making unsupported guesses.

> **Note:** Citations should point to stable source identifiers a user can inspect, not merely “the context above.” They make answers easier to verify and turn bad responses into actionable retrieval bugs.

## Where This Leads Next

RAG gives an LLM evidence, but a production flow may need more control. Imagine a support assistant that first classifies a question, retrieves policy text, checks whether the retrieved passages answer it, rewrites a weak query once, and pauses before any account-changing action. This is no longer a single fixed chain; it is a stateful workflow with branches and a bounded loop.

That is the problem [LangGraph: Reliable Stateful AI Workflows](/blogs/content/Tutorial/LangGraph-Stateful-Workflows.md) is designed to make explicit. It can use the same retriever and prompt from this article while making the decisions, state updates, and recovery behavior inspectable.

## Summary

RAG retrieves relevant, authorized evidence at request time and adds it to a model prompt. Its quality depends on careful ingestion, meaningful chunks, correct access filtering, retrieval and ranking, grounded prompting, and evaluation—not on the vector database alone. A deterministic two-step RAG pipeline is an excellent baseline for knowledge-grounded Q&A.

Return to [LangChain Foundations](/blogs/content/Tutorial/LangChain-Foundations.md) for the surrounding agent components, or continue to [LangGraph: Reliable Stateful AI Workflows](/blogs/content/Tutorial/LangGraph-Stateful-Workflows.md) to orchestrate a more adaptive RAG process safely.
