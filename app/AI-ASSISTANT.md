# Floating AI assistant

Implemented locally, 1 November 2026.

- A single floating button is mounted above navigation on all app pages, including login and onboarding. It sits above the tab bar, respects screen insets and hides while typing in other screens.
- Opens a keyboard-aware chat screen with suggested questions, send/loading/retry states, selectable answers and expandable source titles/excerpts.
- Signed-in requests use `POST /api/v1/ai/chat` through the authenticated Spring API. The saved dam ID is included automatically; onboarding users without a dam can ask general questions. Guests see a sign-in prompt.
- The assistant names the selected dam in its header. Answers for a different dam and empty responses are rejected. Technical error payloads are not shown in chat.
- Chat is kept in memory while moving between pages. Closing/reopening preserves it; Clear chat removes it. Account/dam changes remount the assistant and cancel pending requests, keeping sessions separate. No chat is saved to the database or device storage.
- The current backend accepts individual questions rather than conversation history. Each message is answered independently with the selected dam context.
- The UI does not generate local placeholder answers when the service fails. Source references come from the AI response.
- Answer and source-excerpt formatting mirrors the web Markdown renderer: headings, bold/italic/strikethrough, nested lists, block quotes, dividers, code and links. Tables scroll horizontally on narrow screens. Raw HTML is displayed as text; images show their description instead of loading remote content. Only HTTP(S) links can be opened.
- Optional API data appears under an expandable “Dam data” section: recorded readings, reservoir limits, forecasts, sensor thresholds and a native water-level history plot. Missing values stay unavailable. The history plot displays up to 60 latest valid readings, using recording times for horizontal spacing and labelled observed level bounds; no default danger threshold is invented.

## Checks

- TypeScript and lint passed for changed files.
- Four assistant contract tests cover selected dam and cancellation, input validation/general questions, invalid responses and propagated failures. Five formatting checks cover nested structures, tables, code/quotes, HTML and link handling. Run `npm.cmd run test:assistant` for both groups.
- Live authenticated local AI gateway returned a nonempty answer and one source with the requested dam ID. Its temporary QA account was deactivated.
- API runs on host port 8080; AI and its dependencies remain in Docker. Metro runs on port 8082 with USB forwarding. Expo was started in offline mode after its online manifest failed; this affects Expo discovery, not the local API/AI connection.

## Manual testing

1. Open the AI button from Dashboard, Map and Settings; check it clears the tab bar and map controls.
2. Ask about the selected dam. Check the answer, sources, waiting state and keyboard.
3. Close and reopen the assistant; the chat should remain. Clear chat and send another question.
4. Stop the API and send a question; restore it and use Try again.
5. Change dams or sign out; verify the previous chat is cleared and the header context changes.

No new native dependencies or APK rebuild are needed. Final phone interaction testing remains manual.
