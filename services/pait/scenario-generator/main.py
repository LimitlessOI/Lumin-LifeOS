import unreal_engine as ue
import json

class ScenarioGenerator:
    def __init__(self):
        self.engine = ue.get_engine()

    def generate_scenario(self, user_data):
        # Process user data and generate scenario
        scenario = {
            'environment': 'forest',
            'difficulty': 'medium',
            'custom_data': user_data
        }
        # Render scenario using Unreal Engine
        self.engine.render_scenario(scenario)
        return json.dumps(scenario)

if __name__ == "__main__":
    generator = ScenarioGenerator()
    user_data = {"experience_level": "intermediate"}
    print(generator.generate_scenario(user_data))