```ruby
require 'rails_helper'

RSpec.describe Project, type: :model do
  it { should belong_to(:user) }
  it { should validate_presence_of(:title) }
  it { should validate_presence_of(:status) }
  it { should validate_inclusion_of(:status).in_array(%w[new in_progress completed]) }
end
```