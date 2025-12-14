```csharp
using UnityEngine;
using System.Collections;

public class TherapySessionManager : MonoBehaviour
{
    private string aiServiceUrl = "http://example.com/ai-service";

    void Start()
    {
        StartCoroutine(FetchCoachingAdvice());
    }

    IEnumerator FetchCoachingAdvice()
    {
        WWW www = new WWW(aiServiceUrl);
        yield return www;

        if (string.IsNullOrEmpty(www.error))
        {
            Debug.Log("Coaching Advice: " + www.text);
            // Process the coaching advice
        }
        else
        {
            Debug.LogError("Error fetching coaching advice: " + www.error);
        }
    }
}
```