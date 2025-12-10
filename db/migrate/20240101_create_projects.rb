```ruby
class CreateProjects < ActiveRecord::Migration[6.1]
  def change
    create_table :projects do |t|
      t.string :title, null: false
      t.text :description
      t.string :status, null: false, default: 'new'
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
    add_index :projects, :status
  end
end
```