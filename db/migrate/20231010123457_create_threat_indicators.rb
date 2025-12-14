```ruby
class CreateThreatIndicators < ActiveRecord::Migration[6.1]
  def change
    create_table :threat_indicators do |t|
      t.references :threat_model, null: false, foreign_key: true
      t.string :indicator_type
      t.string :value
      t.timestamps
    end
  end
end