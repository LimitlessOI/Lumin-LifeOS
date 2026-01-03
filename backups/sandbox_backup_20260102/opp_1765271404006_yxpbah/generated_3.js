from rest_framework import viewsets
from .models import Scenario, UserInteraction, IncomeDrones, BlindSpots
from .serializers import ScenarioSerializer, UserInteractionSerializer, IncomeDrovenSerializer  # Assume we have serializers defined for each model.

class ScenariosViewSet(viewsets.ModelViewSet):
    queryset = Scenario.objects.all()
    serializer_class = ScenarioSerializer
    
# Similar view sets would be created for UserInteraction and IncomeDrones...