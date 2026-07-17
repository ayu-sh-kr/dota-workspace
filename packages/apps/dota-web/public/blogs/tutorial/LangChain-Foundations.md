# LangChain Foundations: From Model Calls To Useful Agents

Large language models are very capable text generators, but a production application usually needs more than a single prompt and response. It may need to follow a prompt policy, call an API, search company documentation, preserve conversational state, and produce an answer in a dependable shape. [LangChain](https://docs.langchain.com/oss/python/langchain/overview) is an open-source framework that supplies the application-layer pieces for doing that work.

This is the first article in a three-part path. Start here to understand the building blocks around a model, continue with [RAG: Grounding Answers In Your Data](/blogs/content?category=Tutorial&blog=RAG-Grounded-Answers.md) to give an application trustworthy context, and then read [LangGraph: Reliable Stateful AI Workflows](/blogs/content?category=Tutorial&blog=LangGraph-Stateful-Workflows.md) when the flow needs explicit branching, retries, or approval.

> **Note:** LangChain is not a model, a vector database, or a hosting service. You can call an LLM without it. Its value is a set of consistent abstractions and integrations that reduce the plumbing required to build an LLM application.

---

## The Problem LangChain Solves

Calling a model directly is a fine beginning. The difficulty arrives when the application must decide what information the model sees, what actions it is allowed to take, and how the result is observed and tested. Each model provider has slightly different client APIs and message formats, while tools, retrieval systems, and safety policies introduce more moving parts.

LangChain provides a common way to compose those pieces. It focuses on models, messages, tools, agent loops, middleware, and integrations. Its current `create_agent` API produces a ready-made tool-calling loop; under the hood that loop uses a LangGraph runtime. This lets a simple application stay small while still leaving a path to more deliberate orchestration later. [The official overview](https://docs.langchain.com/oss/python/langchain/overview) and [agent documentation](https://docs.langchain.com/oss/python/langchain/agents) are the best references when selecting a provider or extension.

```text
User request
    |
    v
Prompt and message context ---> Model
                                  |
                     may request a tool or return an answer
                                  |
                                  v
                     Tool result / final response
```

The model is still responsible for generating language and selecting a tool when it is given that freedom. Your application remains responsible for authentication, authorization, data boundaries, timeouts, validation, and every side effect.

## The Building Blocks

The components are deliberately modular. A small summarizer may need only a model and a prompt, whereas a support assistant might also need retrieval, tools, memory, and tracing.

| Building block | Job | Example |
| --- | --- | --- |
| Model | Generates or interprets language. | A chat model drafts a response. |
| Messages and prompts | Give the model clear instructions and input. | A system message defines tone and limits. |
| Tools | Let the model request bounded external actions. | Look up an order by its ID. |
| Agent | Repeats model and tool calls until it can finish. | Search, inspect, then answer a question. |
| Middleware | Applies cross-cutting behavior around the loop. | Add guardrails, retries, or dynamic context. |
| Retriever | Finds relevant external knowledge. | Return policy passages for a question. |

The important distinction is between a *tool* and a *retriever*. A tool is an action the model may choose to call, such as checking shipment status. A retriever is a focused search capability that returns relevant documents. A retriever can be exposed as a tool in an agent, but it can also run predictably before every model call in a two-step RAG pipeline.

## Prompts Are Part Of The Application Contract

A prompt is the final set of messages sent to a model. A prompt template is a reusable structure that fills in request-specific values. Treating prompts as application code—not an incidental string—makes them easier to review, test, version, and change without copying instructions across the codebase.

For chat models, role-based messages make intent clearer: a system message establishes durable rules, a user message carries the request, and tool messages return the result of a requested action. Keep instructions specific enough to constrain the task, but leave facts that change frequently to retrieval or tools.

```python
from langchain_core.prompts import ChatPromptTemplate

answer_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a support assistant. Answer plainly. If the supplied "
        "context is insufficient, say that you do not know.",
    ),
    (
        "user",
        "Question: {question}\n\nRelevant context:\n{context}",
    ),
])

messages = answer_prompt.invoke({
    "question": "Can I change my delivery address?",
    "context": "Addresses can be changed before an order is packed.",
})
```

In this example, the template does not fetch the context and does not call a model. It only creates a consistent message structure. That separation matters: the next article will show where `context` comes from and how to evaluate whether it is actually relevant.

> **Note:** Do not put secrets, unrestricted database rows, or untrusted instructions into a prompt just because the model needs context. Prompts are data sent to a third-party model provider and untrusted text can attempt to override instructions. Apply the same data classification and authorization rules used by the rest of the application.

## Tools Turn A Chat Into An Agent

A language model cannot truly check an order, send an email, or query a current system on its own. A tool gives it a declared interface for requesting one of those operations. The runtime executes the function, returns the result as a tool message, and lets the model use that result in its answer.

Here is a deliberately small agent. It uses a local function rather than a live weather service so the example is safe to run and makes the boundary clear.

```python
# pip install -U langchain "langchain[openai]"

from langchain.agents import create_agent


def get_weather(city: str) -> str:
    """Return a demo weather report for a city."""
    return f"Demo report for {city}: clear skies, 22°C."


agent = create_agent(
    model="openai:gpt-5.4",
    tools=[get_weather],
    system_prompt="You are a concise travel assistant.",
)

result = agent.invoke({
    "messages": [{"role": "user", "content": "What is the weather in Pune?"}]
})

print(result["messages"][-1].content)
```

An agent runs a loop rather than a fixed two-step sequence. The model receives the request and the list of tools. If it emits a tool call, the runtime validates and executes that call, appends the tool output to the conversation, and asks the model what to do next. The loop stops when the model produces a final response or a configured limit is reached.

```text
model -> tool call? -- no --> final answer
  |                         ^
 yes                        |
  v                         |
run permitted tool -> result+
```

Tool descriptions, schemas, and permissions are part of the security boundary. A tool that sends money or deletes data should not become safe merely because its description asks the model to be careful. Validate arguments server-side, restrict the tool to the current user’s authorization, make destructive actions explicit, and add idempotency where appropriate.

## Middleware, State, And Observability

Once an agent does useful work, the operational questions become just as important as the prompt: Which tool was chosen? Why was a request rejected? Did a retry change the outcome? LangChain middleware is a way to run code around model calls and tool calls. It can add dynamic system context, filter tools by role, redact sensitive data, impose limits, or stop an unsafe request. See the [middleware overview](https://docs.langchain.com/oss/python/langchain/middleware/overview) for the available hooks and built-in patterns.

Agent state is the short-term working information carried through a run, including message history. This is not automatically the same thing as long-term user memory. Long-term memory needs an explicit store, retention rules, a way to correct stale information, and a retrieval policy. Conflating a whole transcript with memory often creates expensive, noisy prompts.

For production systems, capture traces and evaluate real task outcomes. A trace should answer practical questions: what messages were assembled, which tool was selected, what data came back, how long each step took, and whether the final response met the expected criteria. Logging inputs blindly is unsafe; redact sensitive values and set retention deliberately.

## When To Use LangChain, RAG, Or LangGraph

These names solve adjacent problems, so it helps to choose based on control flow rather than popularity. LangChain is the convenient starting point for a model-plus-tools agent. RAG is a knowledge-grounding pattern that can use LangChain components or plain application code. LangGraph is the lower-level orchestration layer for workflows whose topology needs to be visible and controlled.

| Need | A good starting point | Why |
| --- | --- | --- |
| One prompt, one response | A direct model SDK or LangChain model interface | Minimal moving parts. |
| A standard tool-calling assistant | LangChain agent | Provides a prepared agent loop and integrations. |
| Answers based on private or changing documents | Two-step RAG | Retrieves evidence before generation. |
| Conditional routes, review gates, durable resumes, or custom loops | LangGraph | Makes state and transitions explicit. |

LangChain agents already use LangGraph internally, so adopting LangChain does not lock you out of a graph-based future. Begin with the simplest architecture that can safely meet the requirement. Move to a custom graph when deterministic steps and recoverable state are first-class requirements, not merely because an application has more than one function.

## A Sensible First Project

Build a small internal-policy assistant before attempting a fully autonomous agent. First, create a prompt template that requires an honest “I do not know” response. Next, add a controlled retriever over a small set of approved documents. Then test representative questions, including questions the documents cannot answer. Only after that should you expose the retriever as an optional agent tool or add actions such as ticket creation.

This sequence forces a valuable separation: retrieval supplies facts, the model turns those facts into an understandable answer, and the application decides which actions are permitted. The next article focuses on the retrieval layer in that sequence.

## Summary

LangChain is the application framework around a language model, not the model itself. Prompts provide repeatable instructions, tools expose bounded capabilities, agents coordinate a model-and-tool loop, and middleware provides a place for policy and operational behavior. These pieces are useful even before an application needs a complex workflow.

To make the assistant answer from knowledge that is current and specific to your organization, continue with [RAG: Grounding Answers In Your Data](/blogs/content?category=Tutorial&blog=RAG-Grounded-Answers.md). When that RAG flow needs conditional retrieval, validation, retries, or human approval, [LangGraph: Reliable Stateful AI Workflows](/blogs/content?category=Tutorial&blog=LangGraph-Stateful-Workflows.md) completes the series.
