import React, { useState, useEffect } from 'react';
import './App.css';
import TodoList from './components/TodoList';
import TodoForm from './components/TodoForm';

function App() {
  const [todos, setTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // For OpenAI Summary
  const [summary, setSummary] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);


  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    setIsLoading(true);
    setError(null); // Clear previous errors
    try {
      const response = await fetch('http://localhost:5000/todos');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Failed to fetch todos' }));
        throw new Error(errData.error || 'Failed to fetch todos');
      }
      const data = await response.json();
      setTodos(data);
    } catch (err) {
      setError(`Failed to load todos: ${err.message}. Please try again later.`);
      console.error('Error fetching todos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addTodo = async (todoText) => {
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: todoText, completed: false }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Failed to add todo' }));
        throw new Error(errData.error || 'Failed to add todo');
      }

      const newTodo = await response.json();
      setTodos(prevTodos => [...prevTodos, newTodo].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))); // Maintain sort order
    } catch (err) {
      setError(`Failed to add todo: ${err.message}. Please try again.`);
      console.error('Error adding todo:', err);
    }
  };

  const toggleTodo = async (id) => {
    setError(null);
    try {
      const todoToToggle = todos.find(todo => todo.id === id);
      const updatedTodoPayload = { ...todoToToggle, completed: !todoToToggle.completed };

      const response = await fetch(`http://localhost:5000/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: updatedTodoPayload.completed }), // Only send what's changing
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Failed to update todo' }));
        throw new Error(errData.error || 'Failed to update todo');
      }
      const updatedTodoFromServer = await response.json();
      setTodos(todos.map(todo =>
        todo.id === id ? updatedTodoFromServer : todo
      ));
    } catch (err) {
      setError(`Failed to update todo: ${err.message}. Please try again.`);
      console.error('Error updating todo:', err);
    }
  };

  const deleteTodo = async (id) => {
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/todos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Failed to delete todo' }));
        throw new Error(errData.error || 'Failed to delete todo');
      }

      setTodos(todos.filter(todo => todo.id !== id));
    } catch (err) {
      setError(`Failed to delete todo: ${err.message}. Please try again.`);
      console.error('Error deleting todo:', err);
    }
  };

  const editTodo = async (id, newText) => {
    setError(null);
    try {
      // const todoToEdit = todos.find(todo => todo.id === id); // Not strictly needed as we get the updated from server
      const updatedTodoPayload = { text: newText };

      const response = await fetch(`http://localhost:5000/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTodoPayload), // Only send what's changing
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Failed to update todo text' }));
        throw new Error(errData.error || 'Failed to update todo text');
      }
      const updatedTodoFromServer = await response.json();
      setTodos(todos.map(todo =>
        todo.id === id ? updatedTodoFromServer : todo
      ));
    } catch (err) {
      setError(`Failed to update todo: ${err.message}. Please try again.`);
      console.error('Error updating todo:', err);
    }
  };

  // --- Function to get summary from OpenAI ---
  const getTodosSummary = async () => {
    setIsSummaryLoading(true);
    setSummaryError(null);
    setSummary('');
    try {
      const response = await fetch('http://localhost:5000/todos/summary', {
        method: 'POST', // Changed to POST as per backend
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Failed to fetch summary' }));
        throw new Error(errData.error || 'Failed to fetch summary');
      }
      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setSummaryError(`Failed to get summary: ${err.message}.`);
      console.error('Error fetching summary:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  return (
    <div className="todo-app">
      <div className="app-container">
        <header>
          <h1>Todo List</h1>
          <p className="subtitle">Organize your tasks efficiently</p>
        </header>

        <TodoForm addTodo={addTodo} />

        {error && <div className="error-message">{error}</div>}

        <div className="summary-section">
          <button onClick={getTodosSummary} disabled={isSummaryLoading || isLoading}>
            {isSummaryLoading ? 'Getting Summary...' : 'Get AI Summary'}
          </button>
          {summaryError && <div className="error-message summary-error">{summaryError}</div>}
          {summary && !summaryError && (
            <div className="summary-result">
              <h3>Todo Summary:</h3>
              <p>{summary}</p>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading your todos...</p>
          </div>
        ) : todos.length === 0 && !error ? (
          <p className="no-todos-message">No todos yet! Add some tasks.</p>
        ) : (
          <TodoList
            todos={todos}
            toggleTodo={toggleTodo}
            deleteTodo={deleteTodo}
            editTodo={editTodo}
          />
        )}
      </div>
    </div>
  );
}

export default App;