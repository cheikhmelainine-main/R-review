from django.urls import path
from .views import ReviewAnalysisView, RestaurantReviewListView

urlpatterns = [
    path("analyze/", ReviewAnalysisView.as_view(), name="analyze-review"),
    path('restaurant/<int:restaurant_id>/reviews/', RestaurantReviewListView.as_view()),

]
