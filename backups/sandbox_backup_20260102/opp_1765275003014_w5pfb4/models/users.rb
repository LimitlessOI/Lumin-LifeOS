class User < ApplicationRecord
  has_many :scenarios
  has_many :tasks, through: :scenarios
  
  # Additional fields for user preferences and automation scenario libraries can be added here as needed.
end