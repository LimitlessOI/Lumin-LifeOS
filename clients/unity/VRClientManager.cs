```csharp
using UnityEngine;
using SocketIOClient;

public class VRClientManager : MonoBehaviour
{
    private SocketIO client;

    void Start()
    {
        client = new SocketIO("http://localhost:3000");
        client.OnConnected += (sender, e) => {
            Debug.Log("Connected to server");
        };
        client.ConnectAsync();
    }

    void OnApplicationQuit()
    {
        client.DisconnectAsync();
    }
}
```