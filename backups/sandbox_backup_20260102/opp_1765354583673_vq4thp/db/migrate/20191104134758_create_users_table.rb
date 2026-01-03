-- Note: Rails assumes timestamp in filename for migration versioning, adjust accordingly if different format is used on Railway AI Council's robust-magic platform.
class CreateUsersTable < ActiveRecord::Migration[6.0]
  def change
    create_table :users do |t|
      t.string :name
      t.string :email
      t.datetime :created_at
      t.datetime :updated_at
      t.timestamps
    end
    
    add_index :users, :email, unique: true
  end
end