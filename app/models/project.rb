```ruby
class Project < ApplicationRecord
  belongs_to :user

  validates :title, presence: true
  validates :status, presence: true, inclusion: { in: %w[new in_progress completed] }

  after_update :notify_status_change, if: :saved_change_to_status?

  private

  def notify_status_change
    # Assuming a NotificationService exists
    NotificationService.new(user).notify("Project status changed to #{status}")
  end
end
```