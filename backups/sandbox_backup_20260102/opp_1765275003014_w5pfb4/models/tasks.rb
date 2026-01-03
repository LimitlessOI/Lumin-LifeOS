class Task < ApplicationRecord
  enum status: { pending: 0, completed: 1 }
  belongs_to :scenario
  belongs_to :user
  
  # Additional fields for task-specific details and completion timestamps can be added here as needed.
end