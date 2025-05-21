import React, { useState } from 'react';

function TodoForm({ addTodo }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      addTodo(text);
      setText('');
    }
  };

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <div className="input-group">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a new task..."
          aria-label="Add a new task"
        />
        <button type="submit" aria-label="Add task">
          <span className="add-icon">+</span>
          <span className="btn-text">Add Task</span>
        </button>
      </div>
    </form>
  );
}

export default TodoForm;