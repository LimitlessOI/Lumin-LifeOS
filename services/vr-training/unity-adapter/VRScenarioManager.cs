using UnityEngine;
using System.Collections.Generic;

public class VRScenarioManager : MonoBehaviour
{
    private Dictionary<string, VRScenario> scenarios;

    void Start()
    {
        scenarios = new Dictionary<string, VRScenario>();
        LoadScenarios();
    }

    void LoadScenarios()
    {
        // Example: Load scenarios from a predefined list or an external source
        scenarios.Add("FireDrill", new VRScenario("Fire Drill", "fire_drill_scene"));
        scenarios.Add("Earthquake", new VRScenario("Earthquake Drill", "earthquake_scene"));
    }

    public VRScenario GetScenario(string name)
    {
        if (scenarios.ContainsKey(name))
        {
            return scenarios[name];
        }
        return null;
    }
}

public class VRScenario
{
    public string Name { get; private set; }
    public string SceneName { get; private set; }

    public VRScenario(string name, string sceneName)
    {
        Name = name;
        SceneName = sceneName;
    }
}