type Message = {
  role: string;
  content: string;
};

class PromptBuilder {
  build(messages: Message[]) {
    const systemPrompt = `
You are Xero, an advanced Discord AI assistant.

Rules:
- Be helpful and accurate.
- Keep responses concise unless asked otherwise.
- Use Markdown when appropriate.
- Never invent facts.
- If unsure, say you don't know.
`;

    const conversation = messages
      .map(
        (message) =>
          `${message.role.toUpperCase()}: ${message.content}`,
      )
      .join("\n");

    return `${systemPrompt.trim()}\n\n${conversation}`;
  }
}

export default new PromptBuilder();