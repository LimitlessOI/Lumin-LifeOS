```ruby
    class CreateWebinarsSchema < ActiveRecord::Migration[6.0]
      def change
        create_table :webinars, id: :serial do |t|
          t.timestamps null: false, default: -> { 'NOW' }
          
          # Attendee fields...
          # Sessions and feedback tables with foreign keys to webinars table for efficient queries...
        end
        
        add_index :webinars, [:event_date, :start_time], unique: true
      end