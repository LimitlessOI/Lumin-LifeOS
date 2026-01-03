from django.db import models

class Scenario(models.Model):
    id = models.AutoField(primary_key=True)
    description = models.CharField(max_length=255)
    revenue_potential = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.BooleanField(default=False)  # Indicates if scenario is active or not
    
class UserInteraction(models.Model):
    interaction_id = models.AutoField(primary_key=True)
    user_id = models.CharField(max_length=255)
    timestamp = models.DateTimeField()
    scenario_id = models.ForeignKey(Scenario, on_delete=models.CASCADE)
    
class IncomeDrones(models.Model):
    income_drone_id = models.AutoField(primary_key=True)
    created_at = models.DateTimeField()
    roi = models.DecimalField(max_digits=10, decimal_places=2)  # Return on Investment (ROI), not a real-time value for this example as it represents the expected ROI of an income drone scenario.
    
class BlindSpots(models.Model):
    blind_spot_id = models.AutoField(primary_key=True)
    detected_issue = models.TextField()  # Detail about the identified issue, such as user experience issues or technical glitches that need to be addressed in scenarios