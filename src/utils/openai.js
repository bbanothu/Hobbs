/**
 * OpenAI API client for ChatGPT integration
 */

class OpenAIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.openai.com/v1';
  }

  async chat(messages, options = {}) {
    try {
      const requestBody = {
        model: options.model || 'gpt-3.5-turbo',
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: false,
      };

      // Add tools if provided
      if (options.tools) {
        requestBody.tools = options.tools;
        if (options.tool_choice) {
          requestBody.tool_choice = options.tool_choice;
        }
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API request failed');
      }

      const data = await response.json();
      const choice = data.choices[0];

      // Handle tool calls
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        const toolCall = choice.message.tool_calls[0];
        return {
          success: true,
          message: choice.message.content || '',
          tool_call: {
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments),
          },
          usage: data.usage,
        };
      }

      // Handle regular message
      return {
        success: true,
        message: choice.message.content,
        usage: data.usage,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async streamChat(messages, onChunk, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model || 'gpt-3.5-turbo',
          messages: messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      throw error;
    }
  }
}

export default OpenAIClient;
