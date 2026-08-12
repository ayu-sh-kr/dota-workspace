# Meet `dota-alert` Through An Interactive Lab

The best way to understand an alert is to use one. Try each example below and see how it opens, waits for a choice, and gives a result back to the page.

<alert-playground></alert-playground>

Start with the message, then try the prompt and the delete example. You can use a mouse or your keyboard. The examples are small, but they show the main ways an alert can help.

## What To Notice

The page uses one shared alert window. When another alert is already open, the next one waits its turn. This keeps the experience calm and gives each choice the right focus.

The last example lets the page bring its own buttons. The alert still handles opening, closing, and waiting, while the page decides what those buttons should do.

```ts
const result = await Alert.ask({
  title: "Publish this example?",
  confirm: "Publish",
});
```

Try a few examples in a row. Notice how each one returns a different answer without changing the page around it.
