```ruby
class CreateFederationParticipants < ActiveRecord::Migration[6.1]
  def change
    create_table :federation_participants do |t|
      t.string :name
      t.string :endpoint
      t.string :public_key
      t.timestamps
    end
  end
end