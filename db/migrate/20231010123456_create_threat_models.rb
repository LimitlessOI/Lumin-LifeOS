```ruby
class CreateThreatModels < ActiveRecord::Migration[6.1]
  def change
    create_table :threat_models do |t|
      t.string :name
      t.text :description
      t.timestamps
    end
  end
end