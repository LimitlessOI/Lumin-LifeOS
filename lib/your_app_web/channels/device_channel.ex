```elixir
defmodule YourAppWeb.DeviceChannel do
  use Phoenix.Channel

  def join("device:" <> device_id, _params, socket) do
    {:ok, assign(socket, :device_id, device_id)}
  end

  def handle_in("command", %{"command" => command}, socket) do
    device_id = socket.assigns.device_id
    # Implement logic to handle device command
    # For example, logging the command or sending it to the device
    IO.puts("Sending command to device #{device_id}: #{command}")
    
    # Broadcast the command to all interested parties
    broadcast!(socket, "command:execute", %{device_id: device_id, command: command})

    {:reply, :ok, socket}
  end

  def handle_in("status", _params, socket) do
    device_id = socket.assigns.device_id
    # Implement logic to fetch current status of the device
    # For example, querying the database or the device itself
    status = "active" # Placeholder for actual status retrieval
    {:reply, {:ok, status}, socket}
  end
end