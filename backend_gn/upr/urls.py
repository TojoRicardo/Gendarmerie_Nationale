from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UnidentifiedPersonViewSet, ScanUPRView
from .views_cameras import (
    CameraViewSet,
    UPRLogViewSet,
    AlertDetectionView,
    CompareEmbeddingView,
    CameraCaptureViewSet,
    CaptureUSBCameraView,
    health_check_cameras
)

router = DefaultRouter()
router.register(r'upr', UnidentifiedPersonViewSet, basename='upr')
router.register(r'cameras', CameraViewSet, basename='camera')
router.register(r'upr/logs', UPRLogViewSet, basename='uprlog')
router.register(r'upr/captures', CameraCaptureViewSet, basename='camera-capture')

urlpatterns = [
    path('', include(router.urls)),
    # Scan UPR depuis caméra USB (face_recognition)
    path('upr/scan/', ScanUPRView.as_view(), name='upr-scan'),
    # Alertes et détection
    path('upr/alert-detection/', AlertDetectionView.as_view(), name='alert-detection'),
    path('upr/compare-embedding/', CompareEmbeddingView.as_view(), name='compare-embedding'),
    # Capture USB automatique
    path('upr/captures/usb/', CaptureUSBCameraView.as_view(), name='usb-camera-capture'),
    # Health check
    path('health/cameras/', health_check_cameras, name='health-cameras'),
]
