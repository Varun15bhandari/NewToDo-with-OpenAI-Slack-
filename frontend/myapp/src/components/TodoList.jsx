import React from 'react';
import TodoItem from './TodoItem';

function TodoList({ todos, toggleTodo, deleteTodo, editTodo }) {
  if (!todos.length) {
    return (
      <div className="empty-list">
        <div className="empty-icon">📋</div>
        <h3>No tasks yet</h3>
        <p>Add a new task to get started</p>
      </div>
    );
  }

  return (
    <div className="todo-list">
      <h2>Tasks <span className="task-count">{todos.length}</span></h2>
      <ul>
        {todos.map(todo => (
          <TodoItem 
            key={todo.id} 
            todo={todo} 
            toggleTodo={toggleTodo} 
            deleteTodo={deleteTodo}
            editTodo={editTodo}
          />
        ))}
      </ul>
    </div>
  );
}

export default TodoList;