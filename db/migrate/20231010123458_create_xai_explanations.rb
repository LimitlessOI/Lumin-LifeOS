```ruby
class CreateXaiExplanations < ActiveRecord::Migration[6.1]
  def change
    create_table :xai_explanations do |t|
      t.references :threat_model, null: false, foreign_key: true
      t.json :explanation_data
      t.timestamps
    end
  end
end