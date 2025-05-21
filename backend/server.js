const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');
const { WebClient } = require('@slack/web-api'); // For existing C/U/D notifications
const https = require('https'); // Node.js built-in module for HTTPS requests

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const USE_MOCKS = process.env.USE_MOCKS === 'true';
if (USE_MOCKS) {
  console.log('⚠️  APPLICATION IS RUNNING IN MOCK MODE. API responses will be simulated. ⚠️');
}

app.use(cors());
app.use(express.json());

let pool;
const mockTodos = [
  { id: 1, text: 'Mock: Buy groceries', completed: false, created_at: new Date().toISOString() },
  { id: 2, text: 'Mock: Finish project report', completed: true, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 3, text: 'Mock: Call mom', completed: false, created_at: new Date(Date.now() - 172800000).toISOString() },
];
let nextMockId = mockTodos.length + 1;

if (!USE_MOCKS) {
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'todo_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
  });
}

let openai;
if (!USE_MOCKS && process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else if (!USE_MOCKS && !process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not found in .env file. Summary feature will be disabled in non-mock mode.');
}

let slackClient; // For C/U/D notifications via Bot Token
const slackBotToken = process.env.SLACK_BOT_TOKEN;
const slackChannelIdForBot = process.env.SLACK_CHANNEL_ID; // Renamed for clarity

if (!USE_MOCKS && slackBotToken && slackChannelIdForBot) {
  slackClient = new WebClient(slackBotToken);
  console.log('Slack client (Bot Token) initialized for C/U/D notifications.');
} else if (!USE_MOCKS && (!slackBotToken || !slackChannelIdForBot)) {
  console.warn('SLACK_BOT_TOKEN or SLACK_CHANNEL_ID (for bot) not found. C/U/D Slack notifications will be disabled in non-mock mode.');
}

const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL; // For summary notifications

const initializeDatabase = async () => {
  if (USE_MOCKS) {
    console.log('Mock Mode: Skipping database initialization.');
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        text VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

// Helper for existing C/U/D notifications via Bot Token
const sendSlackNotificationViaBot = async (message) => {
  if (USE_MOCKS) {
    console.log(`Mock Slack Notification (Bot): ${message}`);
    return;
  }
  if (!slackClient) {
    console.log('Slack client (Bot Token) not configured. Skipping C/U/D notification.');
    return;
  }
  try {
    await slackClient.chat.postMessage({
      channel: slackChannelIdForBot,
      text: message,
    });
    console.log('Slack notification (Bot) sent successfully.');
  } catch (error) {
    console.error('Error sending Slack notification (Bot):', error);
  }
};

// --- New Helper to post summary to Slack via Incoming Webhook ---
async function postSummaryToSlackWebhook(summaryText) {
  if (USE_MOCKS) {
    console.log(`Mock Slack Webhook: Would post summary: "${summaryText.substring(0, 50)}..."`);
    return;
  }
  if (!slackWebhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not found in .env. Skipping summary post to Slack webhook.');
    return;
  }

  const messageBody = {
    text: "📝 **OpenAI Todo Summary**", // Main text, can be simple
    blocks: [ // Use blocks for better formatting
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": "📝 Todo List Summary",
          "emoji": true
        }
      },
      {
        "type": "divider"
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": summaryText
        }
      }
    ]
  };
  const payload = JSON.stringify(messageBody);

  try {
     const parsedUrl = new URL(slackWebhookUrl);
     const options = {
         hostname: parsedUrl.hostname,
         path: parsedUrl.pathname,
         method: 'POST',
         headers: {
             'Content-Type': 'application/json',
             'Content-Length': Buffer.byteLength(payload),
         },
     };

     await new Promise((resolve, reject) => {
         const req = https.request(options, (res) => {
             let responseBody = '';
             res.on('data', (chunk) => (responseBody += chunk));
             res.on('end', () => {
                 // Slack webhooks usually return 'ok' on success or an error message
                 if (res.statusCode === 200 && responseBody.toLowerCase() === 'ok') {
                     console.log('Summary posted to Slack webhook successfully.');
                     resolve(responseBody);
                 } else {
                     console.error(`Error posting summary to Slack webhook: ${res.statusCode} - ${responseBody}`);
                     reject(new Error(`Slack webhook failed: ${res.statusCode} - ${responseBody}`));
                 }
             });
         });
         req.on('error', (error) => {
             console.error('Error making HTTPS request to Slack webhook:', error);
             reject(error);
         });
         req.write(payload);
         req.end();
     });
  } catch (urlParseError) {
     console.error('Error parsing SLACK_WEBHOOK_URL. Please ensure it is a valid URL:', urlParseError);
  }
}

// Routes

// Get all todos
app.get('/todos', async (req, res) => {
  if (USE_MOCKS) {
    return res.json([...mockTodos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  }
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a new todo
app.post('/todos', async (req, res) => {
  const { text, completed = false } = req.body;
  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Todo text is required' });
  }
  if (USE_MOCKS) {
    const newMockTodo = { id: nextMockId++, text: `Mock: ${text}`, completed, created_at: new Date().toISOString() };
    mockTodos.push(newMockTodo);
    await sendSlackNotificationViaBot(`🎉 Mock New Todo Added: "${newMockTodo.text}"`); // Existing bot notification
    return res.status(201).json(newMockTodo);
  }
  try {
    const result = await pool.query('INSERT INTO todos (text, completed) VALUES ($1, $2) RETURNING *', [text, completed]);
    const newTodo = result.rows[0];
    await sendSlackNotificationViaBot(`🎉 New Todo Added: "${newTodo.text}"`); // Existing bot notification
    res.status(201).json(newTodo);
  } catch (error) {
    console.error('Error adding todo:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a todo
app.put('/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { text, completed } = req.body;
  if (text === undefined && completed === undefined) {
    return res.status(400).json({ error: 'Nothing to update' });
  }
  if (USE_MOCKS) {
    const todoIndex = mockTodos.findIndex(t => t.id === parseInt(id));
    if (todoIndex === -1) return res.status(404).json({ error: 'Mock Todo not found' });
    const oldTodoText = mockTodos[todoIndex].text;
    let notificationParts = [];
    if (text !== undefined) { mockTodos[todoIndex].text = `Mock: ${text}`; if(oldTodoText !== mockTodos[todoIndex].text) notificationParts.push(`text updated to "${mockTodos[todoIndex].text}"`);}
    if (completed !== undefined) { const oc = mockTodos[todoIndex].completed; mockTodos[todoIndex].completed = completed; if(oc !== completed) notificationParts.push(`marked as ${completed ? 'complete' : 'incomplete'}`);}
    if (notificationParts.length > 0) await sendSlackNotificationViaBot(`🔔 Mock Todo Updated: "${oldTodoText}" - ${notificationParts.join(', ')}.`);
    return res.json(mockTodos[todoIndex]);
  }
  try {
    let query, values, oldTodoResult, oldTodoText = '', notificationParts = [];
    oldTodoResult = await pool.query('SELECT text, completed FROM todos WHERE id = $1', [id]);
    if (oldTodoResult.rows.length > 0) oldTodoText = oldTodoResult.rows[0].text;
    if (text !== undefined && completed !== undefined) {
      query = 'UPDATE todos SET text = $1, completed = $2 WHERE id = $3 RETURNING *'; values = [text, completed, id];
      if (oldTodoResult.rows.length > 0) { if(oldTodoResult.rows[0].text !== text) notificationParts.push(`text updated to "${text}"`); if(oldTodoResult.rows[0].completed !== completed) notificationParts.push(`marked as ${completed ? 'complete' : 'incomplete'}`); }
    } else if (text !== undefined) {
      query = 'UPDATE todos SET text = $1 WHERE id = $2 RETURNING *'; values = [text, id];
      if (oldTodoResult.rows.length > 0 && oldTodoResult.rows[0].text !== text) notificationParts.push(`text updated to "${text}"`);
    } else {
      query = 'UPDATE todos SET completed = $1 WHERE id = $2 RETURNING *'; values = [completed, id];
      if (oldTodoResult.rows.length > 0 && oldTodoResult.rows[0].completed !== completed) notificationParts.push(`marked as ${completed ? 'complete' : 'incomplete'}`);
    }
    const result = await pool.query(query, values);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Todo not found' });
    const updatedTodo = result.rows[0];
    if (notificationParts.length > 0) await sendSlackNotificationViaBot(`🔔 Todo Updated: "${oldTodoText}" - ${notificationParts.join(', ')}.`);
    res.json(updatedTodo);
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a todo
app.delete('/todos/:id', async (req, res) => {
  const { id } = req.params;
  if (USE_MOCKS) {
    const todoIndex = mockTodos.findIndex(t => t.id === parseInt(id));
    if (todoIndex === -1) return res.status(404).json({ error: 'Mock Todo not found' });
    const deletedMockTodo = mockTodos.splice(todoIndex, 1)[0];
    await sendSlackNotificationViaBot(`🗑️ Mock Todo Deleted: "${deletedMockTodo.text}"`);
    return res.json({ message: 'Mock Todo deleted successfully', deletedTodo: deletedMockTodo });
  }
  try {
    const result = await pool.query('DELETE FROM todos WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Todo not found' });
    const deletedTodo = result.rows[0];
    await sendSlackNotificationViaBot(`🗑️ Todo Deleted: "${deletedTodo.text}"`);
    res.json({ message: 'Todo deleted successfully', deletedTodo });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Route for Todo Summary
app.post('/todos/summary', async (req, res) => {
  if (USE_MOCKS) {
    const mockSummary = `This is a mock summary of ${mockTodos.length} todos. The most important mock task is probably '${mockTodos[0]?.text || 'something'}'.`;
    // In mock mode, also simulate posting to webhook
    await postSummaryToSlackWebhook(mockSummary);
    return res.json({ summary: mockSummary });
  }

  if (!openai) {
    return res.status(503).json({ error: 'OpenAI service is not available. Please check API key.' });
  }

  try {
    const todoResult = await pool.query('SELECT text, completed FROM todos ORDER BY created_at DESC');
    if (todoResult.rows.length === 0) {
      return res.json({ summary: 'No todos found to summarize.' });
    }
    const todoTexts = todoResult.rows.map(todo => `- ${todo.text} (${todo.completed ? 'Completed' : 'Pending'})`).join('\n');
    const prompt = `Please provide a concise summary of the following todo list. Highlight any urgent tasks or patterns if possible. The todo list is:\n${todoTexts}\n\nSummary:`;
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200, // Increased max_tokens slightly for potentially longer summaries
    });
    const summary = completion.choices[0]?.message?.content?.trim() || 'Could not generate summary.';

    // Post summary to Slack via Incoming Webhook
    await postSummaryToSlackWebhook(summary);

    res.json({ summary });
  } catch (error) {
    console.error('Error generating todo summary or posting to Slack:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to generate summary or post to Slack' });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  if (!USE_MOCKS) {
    await initializeDatabase();
  } else {
    console.log("Mock Mode: Real database will not be initialized or used.");
    if (slackWebhookUrl) console.log(`Mock Mode: Slack Webhook URL for summaries is configured to: ${slackWebhookUrl}`);
    else console.log("Mock Mode: SLACK_WEBHOOK_URL not configured.");
  }
  if (!USE_MOCKS && slackWebhookUrl) {
     console.log(`Slack Webhook URL for summaries is configured: ${slackWebhookUrl}`);
  } else if (!USE_MOCKS && !slackWebhookUrl) {
     console.warn('SLACK_WEBHOOK_URL not found in .env. Summaries will not be posted to Slack.');
  }
});