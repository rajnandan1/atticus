# Aven

A framework-agnostic voice agent library for voice-controlled UI interactions, powered by OpenAI's Realtime API.

## Features

-   🎙️ Real-time voice conversations with AI
-   🖱️ UI-aware interactions - let users control your app with voice
-   ⚡ Auto-executes UI actions (click, type, scroll, etc.)
-   🌍 Multi-language support (40+ languages)
-   📦 Framework-agnostic - works with React, Vue, Svelte, vanilla JS, etc.
-   🔧 Simple event-based API
-   🎯 DOM compression for efficient context via d2snap

## Installation

```bash
npm install aven
```

## Quick Start

```typescript
import { Aven } from "aven";

// Get a client secret from your backend (which calls OpenAI's API)
const clientSecret = await fetchClientSecret();

const agent = new Aven({
    clientSecret,
    voice: "shimmer", // Optional: alloy, ash, ballad, coral, echo, sage, shimmer, verse
    language: "en", // Optional: supports 40+ languages
    agent: {
        name: "Assistant",
        instructions: "You are a helpful assistant.",
    },
});

// Listen to events
agent.on("connected", () => console.log("Connected!"));
agent.on("message", (msg) => console.log("Message:", msg));
agent.on("error", (err) => console.error("Error:", err));

// Connect and start talking
await agent.connect();

// Disconnect when done
agent.disconnect();
```

## UI-Aware Mode

Enable UI awareness to let users control your interface with voice. Actions are **automatically executed** by default:

```typescript
const agent = new Aven({
    clientSecret,
    agent: {
        name: "UI Assistant",
        instructions: "Help users fill out the form on this page.",
    },
    ui: {
        enabled: true,
        rootElement: document.getElementById("app")!,
        autoUpdate: true, // Auto-refresh DOM context
    },
});

// Actions are auto-executed! Just listen for logging/feedback
agent.on("action", (action) => {
    console.log("Action executed:", action.outputText);
    console.log("Code:", action.outputCode);
});

await agent.connect();

// Now say: "Fill the name field with John Doe"
// The library will automatically execute the action!
```

### Manual Action Execution

If you want to handle actions yourself:

```typescript
const agent = new Aven({
    clientSecret,
    agent: { name: "Assistant", instructions: "..." },
    doNotExecuteActions: true, // Disable auto-execution
    ui: { enabled: true, rootElement: document.body },
});

agent.on("action", async (action) => {
    // Validate or modify action before execution
    if (action.actionType === "click") {
        const result = await agent.executeAction(action);
        console.log("Result:", result);
    }
});
```

## Configuration

```typescript
interface AvenConfig {
    // Required: OpenAI client secret (ephemeral key)
    clientSecret: string;

    // Required: Agent configuration
    agent: {
        name: string;
        instructions: string;
    };

    // Optional: Voice for the agent (default: 'alloy')
    // Options: 'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'
    voice?: AvenVoice;

    // Optional: Language code (default: 'en')
    // Supports: en, es, fr, de, it, pt, ru, ja, ko, zh, hi, ar, and 30+ more
    language?: string;

    // Optional: OpenAI model (default: 'gpt-4o-realtime-preview')
    model?: string;

    // Optional: Auto-greet on connect (default: true)
    autoGreet?: boolean;

    // Optional: Greeting message (default: language-specific greeting)
    greetingMessage?: string;

    // Optional: Debug logging (default: false)
    debug?: boolean;

    // Optional: Disable auto-execution of UI actions (default: false)
    doNotExecuteActions?: boolean;

    // Optional: UI awareness configuration
    ui?: {
        enabled: boolean;
        rootElement: Element;
        autoUpdate?: boolean;
        autoUpdateInterval?: number; // ms, default: 5000
        d2SnapOptions?: {
            maxTokens?: number; // default: 4096
            assignUniqueIDs?: boolean; // default: true
        };
    };
}
```

## Voice Options

| Voice     | Description                 |
| --------- | --------------------------- |
| `alloy`   | Neutral, balanced (default) |
| `ash`     | Soft, gentle                |
| `ballad`  | Warm, expressive            |
| `coral`   | Clear, friendly             |
| `echo`    | Smooth, conversational      |
| `sage`    | Calm, wise                  |
| `shimmer` | Bright, energetic           |
| `verse`   | Articulate, professional    |

## Supported Languages

Aven supports 40+ languages with native greetings. Set the `language` option:

```typescript
const agent = new Aven({
    clientSecret,
    language: "hi", // Hindi - will greet with "नमस्ते!"
    agent: { name: "Assistant", instructions: "..." },
});
```

| Code | Language   | Code | Language | Code | Language  |
| ---- | ---------- | ---- | -------- | ---- | --------- |
| `en` | English    | `ja` | Japanese | `pl` | Polish    |
| `hi` | Hindi      | `ko` | Korean   | `nl` | Dutch     |
| `es` | Spanish    | `zh` | Chinese  | `sv` | Swedish   |
| `fr` | French     | `ar` | Arabic   | `da` | Danish    |
| `de` | German     | `bn` | Bengali  | `no` | Norwegian |
| `it` | Italian    | `ta` | Tamil    | `fi` | Finnish   |
| `pt` | Portuguese | `te` | Telugu   | `tr` | Turkish   |
| `ru` | Russian    | `th` | Thai     | `uk` | Ukrainian |

## Events

| Event                     | Payload             | Description                                                   |
| ------------------------- | ------------------- | ------------------------------------------------------------- |
| `connected`               | -                   | Successfully connected                                        |
| `disconnected`            | -                   | Disconnected                                                  |
| `error`                   | `string`            | Error occurred                                                |
| `statusChange`            | `AvenStatus`        | Connection status changed                                     |
| `conversationStateChange` | `ConversationState` | Conversation state changed                                    |
| `message`                 | `Message`           | New message received                                          |
| `historyChange`           | `Message[]`         | Conversation history updated                                  |
| `stateChange`             | `AvenState`         | Any state changed                                             |
| `agentStart`              | -                   | Agent started speaking                                        |
| `agentEnd`                | -                   | Agent stopped speaking                                        |
| `userAudio`               | -                   | User audio detected                                           |
| `action`                  | `UIAction`          | UI action executed (or requested if doNotExecuteActions=true) |

## UI Action Types

When UI mode is enabled, the agent can perform these actions:

| Action     | Description                | Example Code                                          |
| ---------- | -------------------------- | ----------------------------------------------------- |
| `click`    | Click elements             | `document.getElementById('btn').click()`              |
| `type`     | Enter text                 | `document.getElementById('input').value = 'Hello'`    |
| `scroll`   | Scroll page/elements       | `window.scrollTo(0, 500)`                             |
| `focus`    | Focus form elements        | `document.getElementById('field').focus()`            |
| `select`   | Select dropdown options    | `document.getElementById('select').value = 'option1'` |
| `hover`    | Hover over elements        | -                                                     |
| `navigate` | Navigate pages             | `window.location.href = '/page'`                      |
| `read`     | Read information (no code) | -                                                     |

## API

### Methods

-   `connect()` - Connect to the voice agent
-   `disconnect()` - Disconnect from the voice agent
-   `toggle()` - Toggle connection state
-   `interrupt()` - Interrupt the AI while speaking
-   `sendMessage(text)` - Send a text message
-   `updateDOM(element | html)` - Manually update DOM context
-   `refreshDOM()` - Refresh DOM from root element
-   `startAutoUpdate()` - Start auto-updating DOM
-   `stopAutoUpdate()` - Stop auto-updating DOM
-   `executeAction(action)` - Manually execute a UI action
-   `getState()` - Get complete state object
-   `destroy()` - Clean up resources

### Properties

-   `status` - Connection status (`idle` | `connecting` | `connected` | `error`)
-   `conversationState` - Conversation state (`idle` | `ai_speaking` | `user_turn` | `user_speaking`)
-   `error` - Error message (if any)
-   `history` - Conversation history
-   `isConnected` - Is connected
-   `isAiSpeaking` - Is AI speaking
-   `isUserSpeaking` - Is user speaking
-   `language` - Configured language
-   `currentDOM` - Current DOM context
-   `isUIEnabled` - Is UI mode enabled

## Getting a Client Secret

The client secret (ephemeral key) must be obtained from your backend. Here's an example:

### Backend (Node.js/Express)

```typescript
import OpenAI from "openai";

const openai = new OpenAI();

app.post("/api/session", async (req, res) => {
    const response = await fetch(
        "https://api.openai.com/v1/realtime/client_secrets",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                session: {
                    type: "realtime",
                    model: "gpt-4o-realtime-preview",
                },
            }),
        }
    );

    const data = await response.json();
    res.json({ clientSecret: data.client_secret.value });
});
```

### Frontend

```typescript
async function fetchClientSecret() {
  const response = await fetch('/api/session', { method: 'POST' });
  const data = await response.json();
  return data.clientSecret;
}

const clientSecret = await fetchClientSecret();
const agent = new Aven({ clientSecret, ... });
```

## Running the Demo

```bash
# Clone the repo
git clone https://github.com/aspect-labs/aven.git
cd aven

# Install dependencies
npm install

# Start dev server (builds + serves demo)
npm run dev

# Open http://localhost:3000/demo/
```

## License

MIT
