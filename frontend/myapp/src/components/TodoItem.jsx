import React, { useState } from 'react';

function TodoItem({ todo, toggleTodo, deleteTodo, editTodo }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editText.trim()) {
      editTodo(todo.id, editText);
      setIsEditing(false);
    }
  };

  return (
    <li className={`todo-item ${todo.completed ? 'completed' : ''}`}>
      {isEditing ? (
        <form className="edit-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            autoFocus
          />
          <div className="edit-actions">
            <button type="submit" className="save-btn">Save</button>
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => {
                setIsEditing(false);
                setEditText(todo.text);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="todo-content">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              <span className="checkmark"></span>
            </label>
            <span className="todo-text">{todo.text}</span>
          </div>
          <div className="todo-actions">
            <button
              className="edit-btn"
              onClick={() => setIsEditing(true)}
              aria-label="Edit task"
            >
              ✏️
            </button>
            <button
              className="delete-btn"
              onClick={() => deleteTodo(todo.id)}
              aria-label="Delete task"
            >
              🗑️
            </button>
          </div>
        </>
      )}
    </li>
  );
}

export default TodoItem;