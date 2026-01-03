-- file: db/migrate/20190730145614_create_revenue_streams_table.rb
class CreateRevenueStreamsTable < ActiveRecord::Migration[5.2]
  def change
    create_table :revenue_streams do |t|
      t.string :source, null: false
      t.decimal :amount, precision: 10, scale: 2, default: '0', null: false
      
      t.timestamps
    end
    
    add_index :revenue_streams, [:amount], unique: true
  end
end