import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from openai import OpenAI
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import json
import jwt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from analyzer.models import Review  # import Review from your app
FIXED_RESTAURANT_ID = 1


client = OpenAI(api_key=settings.OPENAI_API_KEY)

def transcribe_audio(file_path):
    with open(file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
        return transcript.text
from rest_framework.views import APIView
from rest_framework.response import Response
from analyzer.models import Review
from django.db.models import Avg
from rest_framework import status

class RestaurantReviewListView(APIView):
    def get(self, request, restaurant_id):
        reviews = Review.objects.filter(restaurant_id=restaurant_id)
        data = [
            {
                "text": review.text,
                "sentiment": review.sentiment,
                "rating": review.rating,
                "suggestion": review.suggestion,
                "created_at": review.created_at,
            }
            for review in reviews
        ]
        avg_rating = reviews.aggregate(avg=Avg("rating"))["avg"]
        return Response({
            "reviews": data,
            "average_rating": round(avg_rating or 0, 1),
        }, status=status.HTTP_200_OK)

def analyze_text_review(review_text):
    prompt = f"""
You are an expert in sentiment analysis and customer review evaluation.
Given the following restaurant review, summarize the sentiment, extract key points (e.g., food, service, ambiance), and provide a short suggestion for improvement if necessary.
Rate each aspect from 1 to 5 stars. Translate non-English text to English.

\"\"\"{review_text}\"\"\"

Return *only* valid JSON like this:
{{
  "sentiment": "...",
  "aspects": {{
    "food": "...",
    "service": "...",
    "ambiance": "..."
  }},
  "suggestion": "...",
  "translated_review": "...",
  "total_rating": ...
}}
"""

    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4
    )
    full_response = response.choices[0].message.content.strip()

    # Extract JSON portion (if there's surrounding text)
    try:
        json_start = full_response.index('{')
        json_end = full_response.rindex('}') + 1
        clean_json = full_response[json_start:json_end]
        return clean_json
    except ValueError:
        # JSON block not found
        raise ValueError("JSON not found in AI response.")


class ReviewAnalysisView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request, *args, **kwargs):
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided."}, status=400)

        temp_path = os.path.join("temp", file.name)
        os.makedirs("temp", exist_ok=True)

        with open(temp_path, "wb+") as f:
            for chunk in file.chunks():
                f.write(chunk)

        try:
            if file.name.endswith((".mp3", ".wav", ".m4a")):
                text = transcribe_audio(temp_path)
            else:
                text = file.read().decode("utf-8")

            # Analyze the text
            analysis = analyze_text_review(text)

            # Parse the analysis (assumes it's valid JSON string)
            try:
                parsed = json.loads(analysis)
            except json.JSONDecodeError:
                return Response({"error": "Failed to parse AI analysis JSON."}, status=500)

            # Save the review to DB with extracted fields
            Review.objects.create(
                restaurant_id=1,
                text=parsed.get("translated_review", text),
                rating=parsed.get("total_rating", 0),
                sentiment=parsed.get("sentiment"),
                suggestion=parsed.get("suggestion"),
            )

            return Response({
                "transcription": text,
                "analysis": parsed
            }, status=201)
        finally:
            os.remove(temp_path)

class QRTokenValidateView(APIView):
    def post(self, request):
        # For MVP, ignore token, always return fixed restaurant
        return Response({"valid": True, "restaurant_id": 1})