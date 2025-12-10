```csharp
using UnityEngine;
using WebSocketSharp;

public class NetworkManager : MonoBehaviour
{
    private WebSocket ws;

    void Start()
    {
        ws = new WebSocket("ws://localhost:8080");
        ws.OnMessage += (sender, e) => Debug.Log("Message from server: " + e.Data);
        ws.Connect();
    }

    void OnDestroy()
    {
        if (ws != null)
        {
            ws.Close();
        }
    }
}