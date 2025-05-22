# This project is a full-stack ToDo application that leverages OpenAI for task summarization and integrates with Slack for notifications. It features a React-based frontend and a Node.js/Express backend with a PostgreSQL database.

# Design and Architecture Decisions
The application follows a client-server architecture, separating the frontend and backend concerns.

# Frontend (React + Vite):
Developed using React, providing a dynamic and responsive user interface for managing ToDo items.
Utilizes Vite for a fast development experience with Hot Module Replacement (HMR).
ESLint is configured for code quality and consistency.
React 19.1.0 and React-DOM 19.1.0 are used for UI components and rendering.

# Backend (Node.js/Express):
Built with Node.js and the Express.js framework to handle API requests.
Connects to a PostgreSQL database for persistent storage of ToDo items.
Incorporates dotenv for managing environment variables, ensuring sensitive information like API keys and database credentials are kept secure.
OpenAI Integration: Uses the openai package (version ^4.100.0) to generate concise summaries of the ToDo list. This functionality is exposed via a dedicated /todos/summary API endpoint.

# Slack Integration:
Employs @slack/web-api (version ^7.9.2) for sending notifications to a Slack channel when ToDo items are created, updated, or deleted. This uses a Slack Bot Token and Channel ID configured via environment variables (SLACK_BOT_TOKEN, SLACK_CHANNEL_ID).
Leverages Slack Incoming Webhooks (SLACK_WEBHOOK_URL) to post AI-generated summaries to a specified Slack channel, offering enhanced visibility and insights into the ToDo list.
# CORS Enabled: cors middleware is used to allow cross-origin requests from the frontend application.
# Mock Mode: Includes a USE_MOCKS environment variable to enable a mock mode for development and testing, allowing the application to run without a live database or external API keys for OpenAI and Slack.

# Setup Instructions
Follow these steps to set up and run the project locally.

* 1. Backend Setup *
 a.Navigate to the backend directory:
   cd backend
 b.Install dependencies:
   npm install
 c. Create a .env file in the backend directory with the following variables. Replace placeholders with your actual credentials:
    PORT=5000
    DB_USER=postgres
    DB_HOST=localhost
    DB_NAME=todo_db
    DB_PASSWORD=password
    DB_PORT=5432
    OPENAI_API_KEY=your_openai_api_key_here
    SLACK_BOT_TOKEN=your_slack_bot_token_here
    SLACK_CHANNEL_ID=your_slack_channel_id_for_bot_notifications
    SLACK_WEBHOOK_URL=your_slack_incoming_webhook_url_for_summaries
    USE_MOCKS=false # Set to true to run in mock mode without real DB/API keys
Note: If USE_MOCKS is set to true, OPENAI_API_KEY, SLACK_BOT_TOKEN, SLACK_CHANNEL_ID, and SLACK_WEBHOOK_URL are not strictly required for the server to start, but the corresponding features will be disabled or mocked.
  d. Initialize the PostgreSQL database (if not running in mock mode): Ensure your PostgreSQL server is running. The server.js will attempt to create the todos table if it 
     doesn't exist upon startup.
  e.Start the backend server:
     npm start
The server will run on http://localhost:5000 (or the PORT you configured)

  * 2. Frontend Setup *
  a. Navigate to the frontend/myapp directory:
    cd frontend/myapp
  b. Install dependencies:
    npm install
  c. Start the development server:
     npm run dev
The frontend application will typically open in your browser at http://localhost:5173 (or another port as indicated by Vite).

# lack and LLM (OpenAI) Setup Guidance
 * Slack Integration *
This application uses two methods for Slack integration:

 1. Bot Token for C/U/D Notifications:

Purpose: Sends notifications to a specified Slack channel whenever a ToDo item is created, updated, or deleted.
Setup:
Create a Slack App in your workspace.
Go to "OAuth & Permissions" and add the necessary bot token scopes (e.g., chat:write, chat:write.public).
Install the app to your workspace.
Copy your "Bot User OAuth Token" and set it as SLACK_BOT_TOKEN in your backend .env file.
Invite your bot to the desired channel.
Find the "Channel ID" of that channel (you can get it from the channel's URL in Slack or by right-clicking the channel name and selecting "Copy Link" or "View Channel Details") and set it as SLACK_CHANNEL_ID in your backend .env file.

 2.Incoming Webhook for Summary Notifications:

Purpose: Posts AI-generated summaries of your ToDo list to a dedicated Slack channel.
Setup:
In your Slack App settings, go to "Incoming Webhooks".
Activate Incoming Webhooks and click "Add New Webhook to Workspace".
Choose the channel where summaries should be posted and authorize.
Copy the generated "Webhook URL" and set it as SLACK_WEBHOOK_URL in your backend .env file.

# OpenAI (LLM) Integration
Purpose: Provides a summarization feature for your ToDo list, powered by OpenAI's language models.
Setup:
Go to the OpenAI website and sign up or log in.
Navigate to your API keys section.
Create a new secret key.
Copy this key and set it as OPENAI_API_KEY in your backend .env file.
The backend uses gpt-3.5-turbo for summarization
       
