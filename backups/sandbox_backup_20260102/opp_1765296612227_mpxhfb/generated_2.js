-- file: db/migrate/20190730145613_create_insights_metrics_table.rb
class CreateInsightsMetricsTable < ActiveRecord::Migration[5.2]
  def change
    create_table :insights_metrics do |t|
      t.string :insight_name, null: false
      t.text :prediction
      t.float :confidence, default: 0.95, comment: 'Confidence score of the prediction' # Assuming a confidence scale from 0 to 1
      
      t.timestamps
    end
    
    add_index :insights_metrics, [:inspredt_name, :confidence], unique: true
  end
end