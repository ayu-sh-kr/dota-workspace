# LangGraph: Reliable Stateful AI Workflows

An agent loop is useful when a model can choose a tool and continue until it has an answer. Some applications need a stronger guarantee about what happens next: validate retrieved evidence, retry a failed operation, wait for a person to approve an action, or resume a long-running job after an interruption. [LangGraph](https://docs.langchain.com/oss/python/langgraph/overview) is a low-level orchestration framework and runtime for expressing those stateful workflows as graphs.

This completes the series. [LangChain Foundations](/blogs/content/Tutorial/LangChain-Foundations.md) introduced the model, prompt, tool, and agent building blocks. [RAG: Grounding AI Answers In Your Data](/blogs/content/Tutorial/RAG-Grounded-Answers.md) supplied a dependable knowledge-retrieval pattern. Here, those pieces become nodes in an explicitly controlled workflow.

> **Note:** LangGraph does not make an LLM deterministic. A model response can still vary. LangGraph makes the *application control flow* explicit: which node runs, what state it receives, what it updates, where it can branch, and where it can pause or resume.

---

## Why A Graph Instead Of A Chain

A linear chain works when every request follows the same sequence: retrieve, prompt, answer. Production tasks often have conditions. A search may produce weak evidence. A downstream API may be temporarily unavailable. A proposed refund may require a manager’s approval. These are not exceptions to hide in a prompt; they are application rules.

LangGraph represents that topology with nodes, edges, and shared state. A node is a function or runnable unit of work. An edge describes the next node. State is the structured data that moves through the graph and is updated as nodes execute. Conditional edges make routing visible; cycles make bounded retries possible. The [Graph API guide](https://docs.langchain.com/oss/python/langgraph/use-graph-api) provides the complete API for sequences, branches, loops, and state updates.

```text
START -> retrieve -> grade evidence -- sufficient --> answer -> END
                      |
                      +-- weak and retry available --> rewrite query --+
                      |
                      +-- weak after limit ----------> abstain -> END
```

This diagram has a useful property: every outcome is intentional. The workflow cannot silently keep rewriting forever, and it has an explicit path for an honest no-answer response.

## State Is The Contract Between Steps

State makes a graph more than a collection of functions. It defines the information available to each node and makes updates visible. A state schema might carry the original question, a rewritten query, retrieved documents, a retry count, a final answer, and a review decision. Keep it small and explicit; state that nobody needs should not travel through every step.

LangGraph accepts several schema styles, including `TypedDict`, dataclasses, and Pydantic models. `TypedDict` is a common lightweight choice. Each node returns only the fields it wants to update; LangGraph applies those updates according to the schema and any reducers you define.

```python
from typing import TypedDict


class SupportState(TypedDict, total=False):
    question: str
    search_query: str
    documents: list[str]
    retries: int
    answer: str
    needs_human_review: bool
```

The schema is also a design review tool. If `documents` could contain material from several tenants, the graph should carry the current tenant or an already-authorized retriever dependency so every retrieval step applies the same boundary. If a node needs to send an email, its input should include a validated request rather than untrusted model prose.

> **Note:** State is not an excuse to keep an unlimited transcript. Put durable records in a database or store, retain only the data each node needs, and decide which fields are safe to checkpoint and trace.

## A Controlled RAG Graph

The following example turns the deterministic RAG flow from the previous article into a small graph. It retrieves documents, judges whether evidence exists, retries once with a clearer query, and either answers or abstains. The retrieval and generation functions are intentionally simple placeholders so the graph behavior is the focus.

```python
# pip install -U langgraph

from typing import Literal, TypedDict
from langgraph.graph import END, START, StateGraph


class RAGState(TypedDict, total=False):
    question: str
    query: str
    documents: list[str]
    retries: int
    answer: str


def retrieve(state: RAGState) -> dict:
    query = state.get("query", state["question"])
    # Replace with an authorized retriever.invoke(query).
    documents = ["Delivery addresses can be changed before packing."]
    return {"query": query, "documents": documents}


def route_after_retrieval(state: RAGState) -> Literal["answer", "rewrite", "abstain"]:
    has_evidence = bool(state.get("documents"))
    if has_evidence:
        return "answer"
    if state.get("retries", 0) < 1:
        return "rewrite"
    return "abstain"


def rewrite(state: RAGState) -> dict:
    return {
        "query": f"Policy information about: {state['question']}",
        "retries": state.get("retries", 0) + 1,
    }


def answer(state: RAGState) -> dict:
    evidence = " ".join(state["documents"])
    return {"answer": f"Based on the policy: {evidence}"}


def abstain(_: RAGState) -> dict:
    return {"answer": "I could not find enough evidence to answer that."}


builder = StateGraph(RAGState)
builder.add_node("retrieve", retrieve)
builder.add_node("rewrite", rewrite)
builder.add_node("answer", answer)
builder.add_node("abstain", abstain)
builder.add_edge(START, "retrieve")
builder.add_conditional_edges("retrieve", route_after_retrieval)
builder.add_edge("rewrite", "retrieve")
builder.add_edge("answer", END)
builder.add_edge("abstain", END)

app = builder.compile()
result = app.invoke({"question": "When may I change my address?", "retries": 0})
print(result["answer"])
```

The conditional router returns a node name, not natural-language advice. This is an important boundary: use ordinary program logic for deterministic policy decisions whenever possible. An LLM can help classify or grade ambiguous content, but a graph should still set bounded retries, fallbacks, and terminal states.

## Nodes Can Contain LangChain Agents

LangGraph and LangChain are complementary. A LangChain `create_agent` can run as one node inside a larger graph. That is useful when the overall workflow needs deterministic routing, but one stage benefits from a normal tool-calling loop. Middleware attached to the agent remains active when it is embedded in the graph. The [LangChain middleware documentation](https://docs.langchain.com/oss/python/langchain/middleware/overview) demonstrates this composition pattern.

```text
START -> classify request -> policy RAG agent -> approval gate -> execute action -> END
             |                    |
             +-- unsupported -----+--> explain limitation -> END
```

For example, a classifier node can route billing questions to a policy-retrieval agent and account-change requests to an approval node. Do not push that routing decision into a giant prompt when it represents a security or business rule. Make it code, configure it, and test it.

## Persistence, Interrupts, And Durable Execution

Long-running work needs a way to survive more than one process call. With a checkpointer and a thread identifier, LangGraph can persist graph state at checkpoints and resume an interrupted run. This supports workflows that wait for a person, retry later, or continue after a transient failure. The precise storage choice and retention period are application decisions: a demo in-memory checkpointer is not durable storage.

Human-in-the-loop is valuable at consequential boundaries. A workflow can interrupt before an email, payment, deletion, or access change, show a reviewer the proposed action and its evidence, then resume with an approval or rejection. The reviewer should see enough context to make a decision, but not more sensitive data than their role permits.

```text
draft action -> validate policy -> interrupt for reviewer
                                      |
                    reject -----------+----------- approve
                       |                              |
                       v                              v
                 explain refusal                  execute once
```

> **Note:** A pause does not replace authorization. The action node must still verify the actor, validate inputs, and protect against duplicate execution when a resumed workflow is retried.

## Designing Reliable Loops

Graphs make loops easy to draw, which means they also make unsafe loops easy to create. Every loop should have a concrete exit condition: a retry counter, deadline, budget, successful validation, or human decision. Record why the loop ran and how it ended. If the model proposes another attempt, code should still enforce the maximum.

Reliability also requires idempotent effects. A node that sends a message or creates a ticket should persist an idempotency key before performing the external action. If a network error happens after the service receives the request but before the graph records success, a resumed run must not create a duplicate. Treat state transitions and external effects as distributed-systems work, not just AI behavior.

| Requirement | Graph design response |
| --- | --- |
| Weak retrieved evidence | Route to a bounded rewrite/retrieve loop or abstain. |
| Sensitive action | Add validation and an interrupt before execution. |
| Transient API failure | Retry with backoff and a terminal fallback. |
| Long-running task | Checkpoint state with an intentional thread identifier. |
| Changing business rules | Put rules in explicit nodes and tests, not only prompts. |

## Observability And Evaluation

A graph is easier to debug because it offers a map, but only if runs are observable. Capture node start and completion, state transitions that are safe to record, edge choices, retry counts, tool calls, costs, and latency. Link an answer to the retrieved source IDs and to the graph version that created it. [LangGraph’s overview](https://docs.langchain.com/oss/python/langgraph/overview) describes tracing and debugging as core production capabilities.

Evaluate paths, not just final prose. A test suite for the RAG graph should cover a successful answer, no documents found, a successful retry, retry exhaustion, an unsafe action requiring review, review rejection, and a failed downstream call. For each case, assert both the final output and the nodes that were or were not allowed to run.

## Choosing The Right Level Of Abstraction

LangGraph is powerful, but it is not mandatory for every LLM feature. A direct model call is appropriate for a single transformation. A LangChain agent is often sufficient for a standard model-and-tools loop. A two-step RAG pipeline is usually clearer when every question must retrieve documents. Reach for LangGraph when the workflow itself is a product requirement: it must branch, loop, resume, expose state, or enforce review.

```text
Simple transformation  -> model call
Tool-using assistant   -> LangChain agent
Grounded document Q&A  -> two-step RAG
Controlled multi-stage -> LangGraph
```

This is an architecture choice, not a maturity ladder. The best design is the smallest one that makes correctness, safety, and operations understandable.

## Summary

LangGraph expresses an AI application as state plus nodes plus edges. That model is especially useful when a workflow has conditional routes, bounded loops, approvals, persistence, or recovery requirements. It works alongside LangChain components and can orchestrate the RAG pipeline from the previous article without giving up application control.

For the prerequisites, revisit [LangChain Foundations](/blogs/content/Tutorial/LangChain-Foundations.md). For the knowledge-grounding layer that powers the example graph, see [RAG: Grounding AI Answers In Your Data](/blogs/content/Tutorial/RAG-Grounded-Answers.md).
