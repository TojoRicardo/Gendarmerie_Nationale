"""
URLs pour le module de recherche avancée
"""

from django.urls import path
from . import views

app_name = 'search'

urlpatterns = [
    path('', views.search_advanced, name='search-advanced'),
    path('criminel/', views.search_criminel, name='search-criminel'),
    path('enquete/', views.search_enquete, name='search-enquete'),
]

