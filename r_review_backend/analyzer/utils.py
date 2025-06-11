from django.utils import timezone
from datetime import timedelta
import jwt
from yourapp.models import ReviewAccessToken

def create_qr_token(restaurant_id):
    visit_id = uuid.uuid4()
    token = jwt.encode(
        {
            "restaurant_id": restaurant_id,
            "visit_id": str(visit_id),
            "exp": (timezone.now() + timedelta(minutes=60)).timestamp()
        },
        settings.SECRET_KEY,
        algorithm="HS256"
    )

    # Save to DB
    ReviewAccessToken.objects.create(
        token=token,
        restaurant_id=restaurant_id,
        visit_id=visit_id,
        expires_at=timezone.now() + timedelta(minutes=60)
    )

    return token
