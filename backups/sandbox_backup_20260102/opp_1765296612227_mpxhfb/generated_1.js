-- file: db/migrate/20190730145612_create_customer_data_table.rb
class CreateCustomerDataTable < ActiveRecord::Migration[5.2]
  def change
    create_table :customer_data do |t|
      t.string :demographics, null: false
      t.jsonb :purchasing_history, default: {}, null: true
      
      t.timestamps
    end
    
    add_index :customer_data, :demographics, unique: true
  end
end