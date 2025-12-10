```csharp
// HIATP-Integration.cs
using UnityEngine;
using UnityEngine.Networking;

public class VRUnityClient : MonoBehaviour
{
    private string startSessionUrl = "https://yourapi.com/vr/session/start";

    void Start()
    {
        StartCoroutine(StartSession());
    }

    IEnumerator StartSession()
    {
        UnityWebRequest www = UnityWebRequest.Get(startSessionUrl);
        yield return www.SendWebRequest();

        if (www.result != UnityWebRequest.Result.Success)
        {
            Debug.Log(www.error);
        }
        else
        {
            Debug.Log("Session started successfully: " + www.downloadHandler.text);
        }
    }
}