from django.db import models

# analyzer/models.py
class Review(models.Model):
    restaurant_id = models.IntegerField()
    text = models.TextField()  # original or translated review
    rating = models.IntegerField(null=True, blank=True)
    sentiment = models.CharField(max_length=50, null=True, blank=True)
    suggestion = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
