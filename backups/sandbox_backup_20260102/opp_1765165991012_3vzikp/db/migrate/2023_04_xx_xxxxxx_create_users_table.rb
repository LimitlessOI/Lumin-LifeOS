class CreateUsersTable < ActiveRecord::Migration[6.0]
  def change
    create_table :users, id: false do |t|
      t.string :name
      t.string :email, unique: true, null: false

      t.timestamps
    end

    add_index :users, :email, unique: true
  end