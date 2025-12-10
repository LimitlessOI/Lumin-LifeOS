```elixir
defmodule YourApp.Repo.Migrations.CreateSchema do
  use Ecto.Migration

  def change do
    execute("CREATE EXTENSION IF NOT EXISTS postgis")

    create table(:missions) do
      add :name, :string
      add :description, :text
      add :status, :string
      add :start_date, :utc_datetime
      add :end_date, :utc_datetime
      timestamps()
    end

    create table(:devices) do
      add :uuid, :string, null: false
      add :name, :string
      add :status, :string
      add :last_seen_at, :utc_datetime
      timestamps()
    end

    create table(:logistics_routes) do
      add :mission_id, references(:missions, on_delete: :delete_all), null: false
      add :route, :geometry
      add :status, :string
      timestamps()
    end

    create table(:ai_decisions) do
      add :mission_id, references(:missions, on_delete: :delete_all), null: false
      add :decision, :text
      add :confidence_score, :float
      timestamps()
    end

    create table(:stripe_usage_records) do
      add :device_id, references(:devices, on_delete: :delete_all), null: false
      add :usage_type, :string
      add :amount, :integer
      add :recorded_at, :utc_datetime
      timestamps()
    end
  end
end