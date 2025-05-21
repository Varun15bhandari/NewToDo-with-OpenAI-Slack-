-- Create database (run this command separately first)
-- CREATE DATABASE todo_db;

-- Connect to the todo_db database and then run the following:

-- Drop the table if it exists
DROP TABLE IF EXISTS todos;

-- Create todos table
CREATE TABLE todos (
  id SERIAL PRIMARY KEY,
  text VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some sample data
INSERT INTO todos (text, completed) VALUES 
  ('Complete project documentation', false),
  ('Buy groceries', false),
  ('Schedule team meeting', true),
  ('Pay utility bills', false),
  ('Research new technologies', false);